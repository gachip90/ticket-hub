import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { TicketTypeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { INVENTORY_UPDATES_CHANNEL } from './reservation.constants';

type InventorySnapshot = {
  eventId: string;
  ticketTypeId: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
};

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.syncAllActiveInventory();
  }

  async syncAllActiveInventory() {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { status: TicketTypeStatus.ACTIVE },
      orderBy: [{ eventId: 'asc' }, { price: 'asc' }],
    });

    const eventIds = new Set(
      ticketTypes.map((ticketType) => ticketType.eventId),
    );

    await Promise.all(
      Array.from(eventIds).map((eventId) => this.syncEventInventory(eventId)),
    );
  }

  async ensureEventInventory(eventId: string) {
    const ticketTypeIds = await this.redis.getSetMembers(
      this.eventInventoryKey(eventId),
    );

    if (!ticketTypeIds.length) {
      await this.syncEventInventory(eventId);
    }
  }

  async getEventInventory(eventId: string) {
    await this.ensureEventInventory(eventId);

    const ticketTypeIds = await this.redis.getSetMembers(
      this.eventInventoryKey(eventId),
    );

    if (!ticketTypeIds.length) {
      throw new NotFoundException('Event not found.');
    }

    const snapshots = await Promise.all(
      ticketTypeIds.map((ticketTypeId) =>
        this.redis.getHash(this.ticketTypeInventoryKey(ticketTypeId)),
      ),
    );

    const inventory = snapshots
      .map((snapshot) => this.toInventorySnapshot(snapshot))
      .filter((snapshot): snapshot is InventorySnapshot => snapshot !== null)
      .sort((left, right) => left.price - right.price);

    if (!inventory.length) {
      throw new NotFoundException('Event not found.');
    }

    return {
      eventId,
      totals: inventory.reduce(
        (accumulator, item) => ({
          totalQuantity: accumulator.totalQuantity + item.totalQuantity,
          availableQuantity:
            accumulator.availableQuantity + item.availableQuantity,
          heldQuantity: accumulator.heldQuantity + item.heldQuantity,
          soldQuantity: accumulator.soldQuantity + item.soldQuantity,
        }),
        {
          totalQuantity: 0,
          availableQuantity: 0,
          heldQuantity: 0,
          soldQuantity: 0,
        },
      ),
      ticketTypes: inventory,
    };
  }

  async holdTicketType(ticketTypeId: string, quantity: number) {
    try {
      await this.redis.runHoldScript(
        this.ticketTypeInventoryKey(ticketTypeId),
        quantity,
      );
    } catch (error) {
      if (this.isRedisReplyError(error, 'INSUFFICIENT_TICKETS')) {
        throw new ConflictException('INSUFFICIENT_TICKETS');
      }

      throw new InternalServerErrorException('Unable to hold inventory.');
    }
  }

  async releaseHeldTicketType(ticketTypeId: string, quantity: number) {
    try {
      await this.redis.runReleaseScript(
        this.ticketTypeInventoryKey(ticketTypeId),
        quantity,
      );
    } catch (error) {
      if (this.isRedisReplyError(error, 'INSUFFICIENT_HELD_TICKETS')) {
        return;
      }

      throw new InternalServerErrorException('Unable to release inventory.');
    }
  }

  async syncEventInventory(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          where: { status: TicketTypeStatus.ACTIVE },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    const setKey = this.eventInventoryKey(eventId);
    await this.redis.deleteKey(setKey);

    for (const ticketType of event.ticketTypes) {
      await this.redis.setHash(this.ticketTypeInventoryKey(ticketType.id), {
        eventId,
        ticketTypeId: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        totalQuantity: ticketType.totalQuantity,
        availableQuantity: ticketType.availableQuantity,
        heldQuantity: ticketType.heldQuantity,
        soldQuantity: ticketType.soldQuantity,
      });
    }

    await this.redis.addToSet(
      setKey,
      event.ticketTypes.map((ticketType) => ticketType.id),
    );

    await this.publishInventoryUpdate(eventId);
  }

  async publishInventoryUpdate(eventId: string) {
    const inventory = await this.getEventInventory(eventId);
    await this.redis.publish(
      INVENTORY_UPDATES_CHANNEL,
      JSON.stringify(inventory),
    );
  }

  private ticketTypeInventoryKey(ticketTypeId: string) {
    return `inventory:ticket-type:${ticketTypeId}`;
  }

  private eventInventoryKey(eventId: string) {
    return `inventory:event:${eventId}:ticket-types`;
  }

  private toInventorySnapshot(snapshot: Record<string, string>) {
    if (!snapshot.ticketTypeId) {
      return null;
    }

    return {
      eventId: snapshot.eventId,
      ticketTypeId: snapshot.ticketTypeId,
      name: snapshot.name,
      price: Number(snapshot.price),
      totalQuantity: Number(snapshot.totalQuantity),
      availableQuantity: Number(snapshot.availableQuantity),
      heldQuantity: Number(snapshot.heldQuantity),
      soldQuantity: Number(snapshot.soldQuantity),
    };
  }

  private isRedisReplyError(error: unknown, code: string) {
    return error instanceof Error && error.message.includes(code);
  }
}
