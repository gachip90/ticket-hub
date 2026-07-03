/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  ReservationStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../reservations/inventory.service';
import { PaymentsService } from './payments.service';

type ReservationFixture = ReturnType<typeof createReservationFixture>;
type PaymentFixture = NonNullable<ReservationFixture['payment']>;
type OrderFixture = NonNullable<ReservationFixture['order']>;

type PaymentTransactionClient = {
  $queryRaw: () => Promise<unknown>;
  reservation: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  payment: {
    create: jest.Mock;
    update: jest.Mock;
  };
  ticketType: {
    update: jest.Mock;
  };
  order: {
    create: jest.Mock;
  };
};

function createUser(id: string, role = UserRole.USER): AuthUser {
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    role,
  };
}

function createReservationFixture(
  overrides: Partial<ReservationFixture> = {},
): {
  id: string;
  userId: string;
  eventId: string;
  status: ReservationStatus;
  holdExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  event: {
    id: string;
    name: string;
    venue: string;
    startAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
  items: Array<{
    id: string;
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
    ticketType: {
      id: string;
      name: string;
    };
  }>;
  payment: {
    id: string;
    reservationId: string;
    amount: number;
    status: PaymentStatus;
    provider: PaymentProvider;
    providerTransactionId: string | null;
    idempotencyKey: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  order: {
    id: string;
    code: string;
    totalAmount: number;
    createdAt: Date;
  } | null;
} {
  return {
    id: 'reservation-1',
    userId: 'user-1',
    eventId: 'event-1',
    status: ReservationStatus.HELD,
    holdExpiresAt: new Date('2099-07-02T10:05:00.000Z'),
    createdAt: new Date('2099-07-02T10:00:00.000Z'),
    updatedAt: new Date('2099-07-02T10:00:00.000Z'),
    event: {
      id: 'event-1',
      name: 'Mini TicketBox Concert',
      venue: 'Ho Chi Minh City',
      startAt: new Date('2099-08-01T12:00:00.000Z'),
    },
    user: {
      id: 'user-1',
      email: 'user-1@example.com',
      name: 'User user-1',
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
    payment: null,
    order: null,
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let prisma: {
    $transaction: jest.Mock;
    reservation: {
      findUniqueOrThrow: jest.Mock;
    };
  };
  let inventoryService: {
    syncEventInventory: jest.Mock;
  };
  let emailService: {
    sendPaymentConfirmationEmail: jest.Mock;
  };
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      reservation: {
        findUniqueOrThrow: jest.fn(),
      },
    };

    inventoryService = {
      syncEventInventory: jest.fn().mockResolvedValue(undefined),
    };

    emailService = {
      sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new PaymentsService(
      prisma as unknown as PrismaService,
      inventoryService as unknown as InventoryService,
      emailService as unknown as EmailService,
    );
  });

  it('creates a pending sandbox payment for a held reservation', async () => {
    const reservation = createReservationFixture();
    const payment = createPaymentFixture();

    prisma.$transaction.mockImplementation(
      async (
        callback: (transaction: PaymentTransactionClient) => Promise<unknown>,
      ) =>
        callback(
          createTransactionClient({
            reservation,
            paymentCreateResult: payment,
          }),
        ),
    );

    const result = await service.createSandboxPayment(createUser('user-1'), {
      reservationId: 'reservation-1',
    });

    expect(result.payment).toMatchObject({
      reservationId: 'reservation-1',
      status: PaymentStatus.PENDING,
      amount: 4_000_000,
    });
  });

  it('confirms payment successfully and creates an order once', async () => {
    const payment = createPaymentFixture();
    const order = createOrderFixture();
    const paidReservation = createReservationFixture({
      status: ReservationStatus.PAID,
      payment: {
        ...payment,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: 'idem-1',
        paidAt: new Date('2026-07-02T10:01:00.000Z'),
      },
      order,
    });

    const transaction = createTransactionClient({
      reservation: createReservationFixture(),
      paymentUpdateResult: paidReservation.payment as PaymentFixture,
      orderCreateResult: order,
      reservationFindUniqueOrThrowResult: paidReservation,
    });

    prisma.$transaction.mockImplementation(
      async (
        callback: (
          innerTransaction: PaymentTransactionClient,
        ) => Promise<unknown>,
      ) => callback(transaction),
    );
    prisma.reservation.findUniqueOrThrow.mockResolvedValue(paidReservation);

    const result = await service.confirmSandboxPayment(createUser('user-1'), {
      reservationId: 'reservation-1',
      idempotencyKey: 'idem-1',
    });

    expect(transaction.reservation.update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: {
        status: ReservationStatus.PAID,
      },
    });
    expect(transaction.order.create).toHaveBeenCalled();
    expect(inventoryService.syncEventInventory).toHaveBeenCalledWith('event-1');
    expect(emailService.sendPaymentConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        concertName: 'Mini TicketBox Concert',
        orderCode: order.code,
        userEmail: 'user-1@example.com',
        recipientEmail: 'user-1@example.com',
      }),
    );
    expect(result.alreadyProcessed).toBe(false);
    expect(result.order?.code).toBe(order.code);
    expect(result.reservation.status).toBe(ReservationStatus.PAID);
  });

  it('returns the existing order when confirm is retried after success', async () => {
    const paidReservation = createReservationFixture({
      status: ReservationStatus.PAID,
      payment: {
        ...createPaymentFixture(),
        status: PaymentStatus.SUCCESS,
        idempotencyKey: 'idem-1',
        paidAt: new Date('2026-07-02T10:01:00.000Z'),
      },
      order: createOrderFixture(),
    });

    prisma.$transaction.mockImplementation(
      async (
        callback: (transaction: PaymentTransactionClient) => Promise<unknown>,
      ) => callback(createTransactionClient({ reservation: paidReservation })),
    );

    const result = await service.confirmSandboxPayment(createUser('user-1'), {
      reservationId: 'reservation-1',
      idempotencyKey: 'idem-2',
    });

    expect(result.alreadyProcessed).toBe(true);
    expect(result.order?.code).toBe('ORD-000001');
    expect(inventoryService.syncEventInventory).not.toHaveBeenCalled();
    expect(emailService.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });

  it('fails a held reservation and releases its inventory', async () => {
    const payment = createPaymentFixture({
      status: PaymentStatus.FAILED,
    });

    const transaction = createTransactionClient({
      reservation: createReservationFixture(),
      paymentCreateResult: payment,
    });

    prisma.$transaction.mockImplementation(
      async (
        callback: (
          innerTransaction: PaymentTransactionClient,
        ) => Promise<unknown>,
      ) => callback(transaction),
    );

    const result = await service.failSandboxPayment(createUser('user-1'), {
      reservationId: 'reservation-1',
    });

    expect(transaction.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: {
        availableQuantity: { increment: 2 },
        heldQuantity: { decrement: 2 },
      },
    });
    expect(inventoryService.syncEventInventory).toHaveBeenCalledWith('event-1');
    expect(result.payment?.status).toBe(PaymentStatus.FAILED);
    expect(result.reservation.status).toBe(ReservationStatus.CANCELLED);
  });

  it('rejects payment access from another user', async () => {
    prisma.$transaction.mockImplementation(
      async (
        callback: (transaction: PaymentTransactionClient) => Promise<unknown>,
      ) =>
        callback(
          createTransactionClient({
            reservation: createReservationFixture(),
          }),
        ),
    );

    await expect(
      service.createSandboxPayment(createUser('user-2'), {
        reservationId: 'reservation-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects payment confirmation for expired reservations after releasing inventory', async () => {
    const expiredReservation = createReservationFixture({
      holdExpiresAt: new Date('2026-07-02T09:55:00.000Z'),
    });
    const timeoutPayment = createPaymentFixture({
      status: PaymentStatus.TIMEOUT,
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-07-02T10:10:00.000Z'));

    prisma.$transaction.mockImplementation(
      async (
        callback: (transaction: PaymentTransactionClient) => Promise<unknown>,
      ) =>
        callback(
          createTransactionClient({
            reservation: expiredReservation,
            paymentCreateResult: timeoutPayment,
          }),
        ),
    );

    await expect(
      service.confirmSandboxPayment(createUser('user-1'), {
        reservationId: 'reservation-1',
        idempotencyKey: 'idem-timeout',
      }),
    ).rejects.toThrow(new ConflictException('Reservation has expired.'));

    expect(inventoryService.syncEventInventory).toHaveBeenCalledWith('event-1');

    jest.useRealTimers();
  });
});

function createPaymentFixture(
  overrides: Partial<PaymentFixture> = {},
): PaymentFixture {
  return {
    id: 'payment-1',
    reservationId: 'reservation-1',
    amount: 4_000_000,
    status: PaymentStatus.PENDING,
    provider: PaymentProvider.SANDBOX,
    providerTransactionId: null,
    idempotencyKey: null,
    paidAt: null,
    createdAt: new Date('2026-07-02T10:00:30.000Z'),
    updatedAt: new Date('2099-07-02T10:00:30.000Z'),
    ...overrides,
  };
}

function createOrderFixture(
  overrides: Partial<OrderFixture> = {},
): OrderFixture {
  return {
    id: 'order-1',
    code: 'ORD-000001',
    totalAmount: 4_000_000,
    createdAt: new Date('2099-07-02T10:01:00.000Z'),
    ...overrides,
  };
}

function createTransactionClient({
  reservation,
  paymentCreateResult,
  paymentUpdateResult,
  orderCreateResult,
  reservationFindUniqueOrThrowResult,
}: {
  reservation: ReservationFixture;
  paymentCreateResult?: PaymentFixture;
  paymentUpdateResult?: PaymentFixture;
  orderCreateResult?: OrderFixture;
  reservationFindUniqueOrThrowResult?: ReservationFixture;
}): PaymentTransactionClient {
  return {
    $queryRaw: jest.fn().mockResolvedValue(undefined),
    reservation: {
      findUnique: jest.fn().mockResolvedValue(reservation),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue(reservationFindUniqueOrThrowResult ?? reservation),
      update: jest.fn().mockResolvedValue(undefined),
    },
    payment: {
      create: jest
        .fn()
        .mockResolvedValue(paymentCreateResult ?? createPaymentFixture()),
      update: jest
        .fn()
        .mockResolvedValue(paymentUpdateResult ?? createPaymentFixture()),
    },
    ticketType: {
      update: jest.fn().mockResolvedValue(undefined),
    },
    order: {
      create: jest
        .fn()
        .mockResolvedValue(orderCreateResult ?? createOrderFixture()),
    },
  };
}
