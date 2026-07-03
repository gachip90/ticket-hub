import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Prisma,
  ReservationStatus,
  TicketTypeStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  HOLD_DURATION_MINUTES,
  MAX_TICKETS_PER_USER_PER_EVENT,
} from './reservation.constants';
import { HoldReservationDto } from './reservation.validation';
import { InventoryService } from './inventory.service';

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    event: true;
    items: {
      include: {
        ticketType: true;
      };
    };
  };
}>;

type ReservationTransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  private releaseExpiredInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.releaseExpiredInterval = setInterval(() => {
      void this.releaseExpiredReservations();
    }, 30_000);

    this.releaseExpiredInterval.unref?.();
  }

  onModuleDestroy() {
    if (this.releaseExpiredInterval) {
      clearInterval(this.releaseExpiredInterval);
    }
  }

  async holdReservation(user: AuthUser, dto: HoldReservationDto) {
    await this.releaseExpiredReservations();
    this.ensureRequestedQuantityWithinLimit(dto.quantity);

    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id: dto.ticketTypeId,
        eventId: dto.eventId,
        status: TicketTypeStatus.ACTIVE,
      },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found for this event.');
    }

    const now = new Date();

    if (
      ticketType.event.salesOpenAt > now ||
      ticketType.event.salesCloseAt < now
    ) {
      throw new ConflictException(
        'Ticket sales are not available at this time.',
      );
    }

    await this.inventoryService.ensureEventInventory(dto.eventId);
    await this.inventoryService.holdTicketType(dto.ticketTypeId, dto.quantity);

    try {
      const expiresAt = new Date(
        now.getTime() + HOLD_DURATION_MINUTES * 60_000,
      );
      const reservation = await this.prisma.$transaction(
        async (transaction) => {
          await this.lockUserEventHoldWindow(transaction, user.id, dto.eventId);
          await this.validateHoldLimit(
            transaction,
            user.id,
            dto.eventId,
            dto.quantity,
          );

          const updatedTicketType = await transaction.ticketType.updateMany({
            where: {
              id: dto.ticketTypeId,
              eventId: dto.eventId,
              availableQuantity: { gte: dto.quantity },
            },
            data: {
              availableQuantity: { decrement: dto.quantity },
              heldQuantity: { increment: dto.quantity },
            },
          });

          if (updatedTicketType.count !== 1) {
            throw new ConflictException('INSUFFICIENT_TICKETS');
          }

          return transaction.reservation.create({
            data: {
              userId: user.id,
              eventId: dto.eventId,
              status: ReservationStatus.HELD,
              recipientName: dto.recipientName,
              recipientEmail: dto.recipientEmail,
              recipientPhone: dto.recipientPhone,
              holdExpiresAt: expiresAt,
              items: {
                create: {
                  ticketTypeId: dto.ticketTypeId,
                  quantity: dto.quantity,
                  unitPrice: ticketType.price,
                },
              },
            },
            include: {
              event: true,
              items: {
                include: {
                  ticketType: true,
                },
              },
            },
          });
        },
      );

      await this.inventoryService.syncEventInventory(dto.eventId);
      return this.toReservationResponse(reservation);
    } catch (error) {
      await this.inventoryService.releaseHeldTicketType(
        dto.ticketTypeId,
        dto.quantity,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Unable to create reservation.');
    }
  }

  async getReservationById(reservationId: string, user: AuthUser) {
    await this.releaseExpiredReservations();

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    this.ensureReservationAccess(reservation, user);
    return this.toReservationResponse(reservation);
  }

  async releaseReservation(reservationId: string, user: AuthUser) {
    return this.transitionReservation(
      reservationId,
      ReservationStatus.CANCELLED,
      user,
    );
  }

  async releaseExpiredReservations() {
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.HELD,
        holdExpiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 25,
      orderBy: { holdExpiresAt: 'asc' },
    });

    for (const reservation of expiredReservations) {
      await this.transitionReservation(
        reservation.id,
        ReservationStatus.EXPIRED,
      );
    }
  }

  private async transitionReservation(
    reservationId: string,
    requestedStatus: ReservationStatus,
    user?: AuthUser,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    if (user) {
      this.ensureReservationAccess(reservation, user);
    }

    if (reservation.status === ReservationStatus.PAID) {
      throw new ConflictException('Paid reservations cannot be released.');
    }

    const nextStatus: ReservationStatus =
      reservation.holdExpiresAt <= new Date()
        ? ReservationStatus.EXPIRED
        : requestedStatus;

    if (reservation.status !== ReservationStatus.HELD) {
      return this.toReservationResponse(reservation);
    }

    const updatedReservation = await this.prisma.$transaction(
      async (transaction) => {
        const updateResult = await transaction.reservation.updateMany({
          where: {
            id: reservationId,
            status: ReservationStatus.HELD,
          },
          data: {
            status: nextStatus,
          },
        });

        if (updateResult.count !== 1) {
          return transaction.reservation.findUniqueOrThrow({
            where: { id: reservationId },
            include: {
              event: true,
              items: {
                include: {
                  ticketType: true,
                },
              },
            },
          });
        }

        for (const item of reservation.items) {
          await transaction.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              availableQuantity: { increment: item.quantity },
              heldQuantity: { decrement: item.quantity },
            },
          });
        }

        return transaction.reservation.findUniqueOrThrow({
          where: { id: reservationId },
          include: {
            event: true,
            items: {
              include: {
                ticketType: true,
              },
            },
          },
        });
      },
    );

    await this.inventoryService.syncEventInventory(updatedReservation.eventId);
    return this.toReservationResponse(updatedReservation);
  }

  private async validateHoldLimit(
    transaction: ReservationTransactionClient,
    userId: string,
    eventId: string,
    requestedQuantity: number,
  ) {
    const aggregate = await transaction.reservationItem.aggregate({
      where: {
        reservation: {
          userId,
          eventId,
          status: ReservationStatus.HELD,
          holdExpiresAt: { gt: new Date() },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const currentHeld = aggregate._sum.quantity ?? 0;

    if (currentHeld + requestedQuantity > MAX_TICKETS_PER_USER_PER_EVENT) {
      throw new ConflictException(
        `You can hold at most ${MAX_TICKETS_PER_USER_PER_EVENT} tickets per event.`,
      );
    }
  }

  private ensureRequestedQuantityWithinLimit(requestedQuantity: number) {
    if (requestedQuantity > MAX_TICKETS_PER_USER_PER_EVENT) {
      throw new ConflictException(
        `You can hold at most ${MAX_TICKETS_PER_USER_PER_EVENT} tickets per event.`,
      );
    }
  }

  private async lockUserEventHoldWindow(
    transaction: ReservationTransactionClient,
    userId: string,
    eventId: string,
  ) {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${eventId}))
    `;
  }

  private ensureReservationAccess(
    reservation: Pick<ReservationWithRelations, 'userId'>,
    user: AuthUser,
  ) {
    if (reservation.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to access this reservation.',
      );
    }
  }

  private toReservationResponse(reservation: ReservationWithRelations) {
    const totalQuantity = reservation.items.reduce(
      (accumulator, item) => accumulator + item.quantity,
      0,
    );
    const totalAmount = reservation.items.reduce(
      (accumulator, item) => accumulator + item.quantity * item.unitPrice,
      0,
    );

    return {
      id: reservation.id,
      eventId: reservation.eventId,
      userId: reservation.userId,
      status: reservation.status,
      recipientName: reservation.recipientName,
      recipientEmail: reservation.recipientEmail,
      recipientPhone: reservation.recipientPhone,
      expiresAt: reservation.holdExpiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      event: {
        id: reservation.event.id,
        name: reservation.event.name,
        venue: reservation.event.venue,
        startAt: reservation.event.startAt.toISOString(),
      },
      totalQuantity,
      totalAmount,
      isExpired:
        reservation.status === ReservationStatus.HELD &&
        reservation.holdExpiresAt <= new Date(),
      items: reservation.items.map((item) => ({
        id: item.id,
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
      })),
    };
  }
}
