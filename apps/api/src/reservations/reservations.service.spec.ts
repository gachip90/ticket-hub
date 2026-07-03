import { ConflictException } from '@nestjs/common';
import { ReservationStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { ReservationsService } from './reservations.service';

type ReservationFixture = ReturnType<typeof createHeldReservation>;
type HoldTransactionClient = {
  $executeRaw: () => Promise<unknown>;
  reservationItem: {
    aggregate: jest.Mock;
  };
  ticketType: {
    updateMany: () => Promise<{ count: number }>;
  };
  reservation: {
    create: (args: { data: { userId: string } }) => Promise<ReservationFixture>;
  };
};
type ReleaseTransactionClient = {
  reservation: {
    updateMany: () => Promise<{ count: number }>;
    findUniqueOrThrow: () => Promise<ReservationFixture>;
  };
  ticketType: {
    update: () => Promise<void>;
  };
};

function createUser(id: string): AuthUser {
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    role: UserRole.USER,
  };
}

function createHeldReservation(status = ReservationStatus.HELD) {
  return {
    id: 'reservation-1',
    userId: 'user-1',
    eventId: 'event-1',
    status,
    holdExpiresAt: new Date('2026-07-02T10:05:00.000Z'),
    recipientName: 'Tien Dat Dinh',
    recipientEmail: 'gachip9090@gmail.com',
    recipientPhone: '0901234567',
    createdAt: new Date('2026-07-02T10:00:00.000Z'),
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    event: {
      id: 'event-1',
      name: 'Mini TicketBox Concert',
      venue: 'Ho Chi Minh City',
      startAt: new Date('2026-08-01T12:00:00.000Z'),
    },
    items: [
      {
        id: 'item-1',
        ticketTypeId: 'ticket-1',
        quantity: 2,
        unitPrice: 2_000_000,
        ticketType: {
          id: 'ticket-1',
          name: 'VIP',
        },
      },
    ],
  };
}

describe('ReservationsService', () => {
  let prisma: {
    ticketType: { findFirst: jest.Mock };
    reservation: { findUnique: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventoryService: {
    ensureEventInventory: jest.Mock;
    holdTicketType: jest.Mock;
    releaseHeldTicketType: jest.Mock;
    syncEventInventory: jest.Mock;
  };
  let service: ReservationsService;

  beforeEach(() => {
    prisma = {
      ticketType: {
        findFirst: jest.fn(),
      },
      reservation: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };

    inventoryService = {
      ensureEventInventory: jest.fn().mockResolvedValue(undefined),
      holdTicketType: jest.fn().mockResolvedValue(undefined),
      releaseHeldTicketType: jest.fn().mockResolvedValue(undefined),
      syncEventInventory: jest.fn().mockResolvedValue(undefined),
    };

    service = new ReservationsService(
      prisma as unknown as PrismaService,
      inventoryService as unknown as InventoryService,
    );
    jest
      .spyOn(service, 'releaseExpiredReservations')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a held reservation and syncs inventory', async () => {
    const user = createUser('user-1');
    const heldReservation = createHeldReservation();

    prisma.ticketType.findFirst.mockResolvedValue({
      id: 'ticket-1',
      price: 2_000_000,
      event: {
        salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
        salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    prisma.$transaction.mockImplementation(
      (
        callback: (
          transaction: HoldTransactionClient,
        ) => Promise<ReservationFixture>,
      ) =>
        callback({
          $executeRaw: () => Promise.resolve(undefined),
          reservationItem: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
          },
          ticketType: {
            updateMany: () => Promise.resolve({ count: 1 }),
          },
          reservation: {
            create: () => Promise.resolve(heldReservation),
          },
        }),
    );

    const result = await service.holdReservation(user, {
      eventId: 'event-1',
      ticketTypeId: 'ticket-1',
      quantity: 2,
      recipientName: 'Tien Dat Dinh',
      recipientEmail: 'gachip9090@gmail.com',
      recipientPhone: '0901234567',
    });

    expect(inventoryService.holdTicketType).toHaveBeenCalledWith('ticket-1', 2);
    expect(inventoryService.syncEventInventory).toHaveBeenCalledWith('event-1');
    expect(result).toMatchObject({
      id: 'reservation-1',
      status: ReservationStatus.HELD,
      totalQuantity: 2,
      totalAmount: 4_000_000,
      recipientEmail: 'gachip9090@gmail.com',
    });
  });

  it('rolls inventory back when database write fails during hold', async () => {
    const user = createUser('user-1');

    prisma.ticketType.findFirst.mockResolvedValue({
      id: 'ticket-1',
      price: 2_000_000,
      event: {
        salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
        salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    prisma.$transaction.mockRejectedValue(new Error('db failed'));

    await expect(
      service.holdReservation(user, {
        eventId: 'event-1',
        ticketTypeId: 'ticket-1',
        quantity: 2,
        recipientName: 'Tien Dat Dinh',
        recipientEmail: 'gachip9090@gmail.com',
        recipientPhone: '0901234567',
      }),
    ).rejects.toThrow('Unable to create reservation.');

    expect(inventoryService.releaseHeldTicketType).toHaveBeenCalledWith(
      'ticket-1',
      2,
    );
  });

  it('releases a held reservation idempotently', async () => {
    const reservation = createHeldReservation();
    const cancelledReservation = {
      ...reservation,
      status: ReservationStatus.CANCELLED,
    };

    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.$transaction.mockImplementation(
      (
        callback: (
          transaction: ReleaseTransactionClient,
        ) => Promise<ReservationFixture>,
      ) =>
        callback({
          reservation: {
            updateMany: () => Promise.resolve({ count: 1 }),
            findUniqueOrThrow: () => Promise.resolve(cancelledReservation),
          },
          ticketType: {
            update: () => Promise.resolve(),
          },
        }),
    );

    const result = await service.releaseReservation(
      'reservation-1',
      createUser('user-1'),
    );

    expect(result.status).toBe(ReservationStatus.CANCELLED);
    expect(inventoryService.syncEventInventory).toHaveBeenCalledWith('event-1');
  });

  it('enforces the per-user hold limit', async () => {
    prisma.ticketType.findFirst.mockResolvedValue({
      id: 'ticket-1',
      price: 2_000_000,
      event: {
        salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
        salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    prisma.$transaction.mockImplementation(
      (
        callback: (
          transaction: HoldTransactionClient,
        ) => Promise<ReservationFixture>,
      ) =>
        callback({
          $executeRaw: () => Promise.resolve(undefined),
          reservationItem: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 9 } }),
          },
          ticketType: {
            updateMany: () => Promise.resolve({ count: 1 }),
          },
          reservation: {
            create: () => Promise.resolve(createHeldReservation()),
          },
        }),
    );

    await expect(
      service.holdReservation(createUser('user-1'), {
        eventId: 'event-1',
        ticketTypeId: 'ticket-1',
        quantity: 2,
        recipientName: 'Tien Dat Dinh',
        recipientEmail: 'gachip9090@gmail.com',
        recipientPhone: '0901234567',
      }),
    ).rejects.toThrow('You can hold at most 10 tickets per event.');

    expect(inventoryService.releaseHeldTicketType).toHaveBeenCalledWith(
      'ticket-1',
      2,
    );
  });

  it('prevents overselling under concurrent hold attempts', async () => {
    let available = 5;

    prisma.ticketType.findFirst.mockResolvedValue({
      id: 'ticket-1',
      price: 1_000_000,
      event: {
        salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
        salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    inventoryService.holdTicketType.mockImplementation(() => {
      if (available <= 0) {
        throw new ConflictException('INSUFFICIENT_TICKETS');
      }

      available -= 1;
    });
    const baseReservation = createHeldReservation();

    prisma.$transaction.mockImplementation(
      (
        callback: (
          transaction: HoldTransactionClient,
        ) => Promise<ReservationFixture>,
      ) =>
        callback({
          $executeRaw: () => Promise.resolve(undefined),
          reservationItem: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
          },
          ticketType: {
            updateMany: () => Promise.resolve({ count: 1 }),
          },
          reservation: {
            create: ({ data }: { data: { userId: string } }) =>
              Promise.resolve({
                ...baseReservation,
                id: `reservation-${data.userId}`,
                userId: data.userId,
                items: [
                  {
                    ...baseReservation.items[0],
                    quantity: 1,
                    unitPrice: 1_000_000,
                  },
                ],
              }),
          },
        }),
    );

    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        service.holdReservation(createUser(`user-${index}`), {
          eventId: 'event-1',
          ticketTypeId: 'ticket-1',
          quantity: 1,
          recipientName: `User ${index}`,
          recipientEmail: `user-${index}@example.com`,
          recipientPhone: '0901234567',
        }),
      ),
    );

    const fulfilled = attempts.filter(
      (attempt): attempt is PromiseFulfilledResult<unknown> =>
        attempt.status === 'fulfilled',
    );
    const rejected = attempts.filter(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(5);
    expect(
      rejected.every((attempt) => attempt.reason instanceof ConflictException),
    ).toBe(true);
  });

  it('rejects an immediate request above the configured hold limit', async () => {
    await expect(
      service.holdReservation(createUser('user-1'), {
        eventId: 'event-1',
        ticketTypeId: 'ticket-1',
        quantity: 11,
        recipientName: 'Tien Dat Dinh',
        recipientEmail: 'gachip9090@gmail.com',
        recipientPhone: '0901234567',
      }),
    ).rejects.toThrow('You can hold at most 10 tickets per event.');

    expect(prisma.ticketType.findFirst).not.toHaveBeenCalled();
    expect(inventoryService.holdTicketType).not.toHaveBeenCalled();
  });
});
