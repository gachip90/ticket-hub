import {
  Injectable,
  Logger,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import {
  INVENTORY_UPDATES_CHANNEL,
  INVENTORY_UPDATES_HEARTBEAT_EVENT,
} from './reservation.constants';

type InventoryUpdatePayload = {
  eventId: string;
  totals: {
    totalQuantity: number;
    availableQuantity: number;
    heldQuantity: number;
    soldQuantity: number;
  };
  ticketTypes: Array<{
    eventId: string;
    ticketTypeId: string;
    name: string;
    price: number;
    totalQuantity: number;
    availableQuantity: number;
    heldQuantity: number;
    soldQuantity: number;
  }>;
};

@Injectable()
export class InventoryUpdatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryUpdatesService.name);
  private readonly updates$ = new Subject<InventoryUpdatePayload>();
  private unsubscribe?: () => Promise<void>;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit() {
    this.unsubscribe = await this.redis.subscribe(
      INVENTORY_UPDATES_CHANNEL,
      (message) => {
        try {
          const payload = JSON.parse(message) as InventoryUpdatePayload;
          this.updates$.next(payload);
        } catch (error) {
          this.logger.warn(
            `Unable to parse inventory update payload: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      },
    );
  }

  async onModuleDestroy() {
    this.updates$.complete();

    if (this.unsubscribe) {
      await this.unsubscribe();
    }
  }

  streamEventInventory(eventId: string): Observable<MessageEvent> {
    return this.toSseStream(
      this.updates$.pipe(filter((payload) => payload.eventId === eventId)),
    );
  }

  streamAllInventory(): Observable<MessageEvent> {
    return this.toSseStream(this.updates$);
  }

  private toSseStream(source$: Observable<InventoryUpdatePayload>) {
    const heartbeat$ = interval(15_000).pipe(
      map(
        () =>
          ({
            type: INVENTORY_UPDATES_HEARTBEAT_EVENT,
            data: { ok: true, timestamp: new Date().toISOString() },
          }) satisfies MessageEvent,
      ),
    );

    const updates$ = source$.pipe(
      map(
        (payload) =>
          ({
            type: 'inventory-update',
            data: payload,
          }) satisfies MessageEvent,
      ),
    );

    return merge(updates$, heartbeat$);
  }
}
