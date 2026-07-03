import {
  PaymentProvider,
  PaymentStatus,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let prisma: {
    ticketType: { findMany: jest.Mock };
    order: { aggregate: jest.Mock; findMany: jest.Mock };
    reservation: { findMany: jest.Mock };
  };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      ticketType: {
        findMany: jest.fn(),
      },
      order: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      reservation: {
        findMany: jest.fn(),
      },
    };

    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('aggregates inventory, revenue, and recent orders for dashboard stats', async () => {
    prisma.ticketType.findMany.mockResolvedValue([
      createTicketTypeRecord({
        id: 'vip',
        name: 'VIP',
        price: 2_000_000,
        totalQuantity: 50,
        availableQuantity: 30,
        heldQuantity: 5,
        soldQuantity: 15,
      }),
      createTicketTypeRecord({
        id: 'standard',
        name: 'Standard',
        price: 1_000_000,
        totalQuantity: 300,
        availableQuantity: 250,
        heldQuantity: 10,
        soldQuantity: 40,
      }),
    ]);
    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        totalAmount: 70_000_000,
      },
    });
    prisma.order.findMany.mockResolvedValue([createOrderRecord()]);

    const result = await service.getStats();

    expect(result).toMatchObject({
      totalSoldTickets: 55,
      totalHeldTickets: 15,
      totalAvailableTickets: 280,
      totalInventoryTickets: 350,
      totalRevenue: 70_000_000,
    });
    expect(result.inventory).toHaveLength(2);
    expect(result.recentOrders[0]).toMatchObject({
      code: 'ORD-000001',
      totalAmount: 4_000_000,
      payment: {
        status: PaymentStatus.SUCCESS,
      },
    });
  });

  it('returns held reservations with computed totals and expiration flags', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:10:00.000Z'));
    prisma.reservation.findMany.mockResolvedValue([
      createHeldReservationRecord(),
      createHeldReservationRecord({
        id: 'reservation-expired',
        holdExpiresAt: new Date('2026-07-03T10:00:00.000Z'),
      }),
    ]);

    const result = await service.getHeldReservations();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'reservation-1',
      totalQuantity: 2,
      totalAmount: 4_000_000,
      isExpired: false,
    });
    expect(result[1]).toMatchObject({
      id: 'reservation-expired',
      isExpired: true,
    });

    jest.useRealTimers();
  });

  it('returns recent orders with reservation and payment details', async () => {
    prisma.order.findMany.mockResolvedValue([
      createOrderRecord(),
      createOrderRecord({
        id: 'order-2',
        code: 'ORD-000002',
        reservation: {
          ...createOrderRecord().reservation,
          payment: null,
        },
      }),
    ]);

    const result = await service.getOrders();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      code: 'ORD-000001',
      reservation: {
        status: ReservationStatus.PAID,
      },
      payment: {
        provider: PaymentProvider.SANDBOX,
      },
    });
    expect(result[1].payment).toBeNull();
  });
});

function createTicketTypeRecord(
  overrides: Partial<ReturnType<typeof createTicketTypeRecordBase>> = {},
) {
  return {
    ...createTicketTypeRecordBase(),
    ...overrides,
  };
}

function createTicketTypeRecordBase() {
  return {
    id: 'ticket-1',
    eventId: 'event-1',
    name: 'VIP',
    price: 2_000_000,
    totalQuantity: 50,
    availableQuantity: 30,
    heldQuantity: 5,
    soldQuantity: 15,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-03T09:00:00.000Z'),
    updatedAt: new Date('2026-07-03T09:00:00.000Z'),
    event: {
      id: 'event-1',
      name: 'Mini TicketBox Concert',
      venue: 'Ho Chi Minh City',
      startAt: new Date('2026-08-01T12:00:00.000Z'),
      salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
      salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  };
}

function createHeldReservationRecord(
  overrides: Partial<ReturnType<typeof createHeldReservationRecordBase>> = {},
) {
  return {
    ...createHeldReservationRecordBase(),
    ...overrides,
  };
}

function createHeldReservationRecordBase() {
  return {
    id: 'reservation-1',
    userId: 'user-1',
    eventId: 'event-1',
    status: ReservationStatus.HELD,
    holdExpiresAt: new Date('2026-07-03T10:15:00.000Z'),
    recipientName: 'Test User',
    recipientEmail: 'user@example.com',
    recipientPhone: '0901234567',
    createdAt: new Date('2026-07-03T10:00:00.000Z'),
    updatedAt: new Date('2026-07-03T10:00:00.000Z'),
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'USER',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    event: {
      id: 'event-1',
      name: 'Mini TicketBox Concert',
      venue: 'Ho Chi Minh City',
      startAt: new Date('2026-08-01T12:00:00.000Z'),
      salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
      salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    items: [
      {
        id: 'item-1',
        reservationId: 'reservation-1',
        ticketTypeId: 'ticket-1',
        quantity: 2,
        unitPrice: 2_000_000,
        createdAt: new Date('2026-07-03T10:00:00.000Z'),
        updatedAt: new Date('2026-07-03T10:00:00.000Z'),
        ticketType: {
          ...createTicketTypeRecordBase(),
        },
      },
    ],
  };
}

function createOrderRecord(
  overrides: Partial<ReturnType<typeof createOrderRecordBase>> = {},
) {
  return {
    ...createOrderRecordBase(),
    ...overrides,
  };
}

function createOrderRecordBase() {
  return {
    id: 'order-1',
    code: 'ORD-000001',
    userId: 'user-1',
    eventId: 'event-1',
    reservationId: 'reservation-1',
    totalAmount: 4_000_000,
    createdAt: new Date('2026-07-03T10:05:00.000Z'),
    updatedAt: new Date('2026-07-03T10:05:00.000Z'),
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'USER',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    event: {
      id: 'event-1',
      name: 'Mini TicketBox Concert',
      venue: 'Ho Chi Minh City',
      startAt: new Date('2026-08-01T12:00:00.000Z'),
      salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
      salesCloseAt: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    reservation: {
      ...createHeldReservationRecordBase(),
      status: ReservationStatus.PAID,
      payment: {
        id: 'payment-1',
        reservationId: 'reservation-1',
        amount: 4_000_000,
        status: PaymentStatus.SUCCESS,
        provider: PaymentProvider.SANDBOX,
        providerTransactionId: 'sandbox-tx-1',
        idempotencyKey: 'idem-1',
        paidAt: new Date('2026-07-03T10:04:30.000Z'),
        createdAt: new Date('2026-07-03T10:02:00.000Z'),
        updatedAt: new Date('2026-07-03T10:04:30.000Z'),
      },
    },
  };
}
