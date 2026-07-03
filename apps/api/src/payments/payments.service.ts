import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AuthUser } from '../auth/auth.types';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../reservations/inventory.service';
import {
  ConfirmSandboxPaymentDto,
  SandboxPaymentReservationDto,
} from './payment.validation';

type PaymentReservationRecord = Prisma.ReservationGetPayload<{
  include: {
    event: true;
    user: true;
    items: {
      include: {
        ticketType: true;
      };
    };
    payment: true;
    order: true;
  };
}>;

type PaymentTransactionClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly emailService: EmailService,
  ) {}

  async createSandboxPayment(
    user: AuthUser,
    dto: SandboxPaymentReservationDto,
  ) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockAndLoadReservation(
        transaction,
        dto.reservationId,
      );

      this.ensureReservationAccess(reservation, user);

      if (reservation.status === ReservationStatus.PAID) {
        return {
          payment: this.serializePayment(reservation.payment),
        };
      }

      if (reservation.status !== ReservationStatus.HELD) {
        throw new ConflictException('Reservation is no longer payable.');
      }

      if (this.isExpired(reservation)) {
        await this.expireReservation(transaction, reservation);
        return {
          payment: reservation.payment
            ? this.serializePayment({
                ...reservation.payment,
                status: PaymentStatus.TIMEOUT,
              })
            : null,
          inventoryEventId: reservation.eventId,
        };
      }

      const amount = this.calculateReservationAmount(reservation);
      const payment =
        reservation.payment ??
        (await transaction.payment.create({
          data: {
            reservationId: reservation.id,
            amount,
            provider: PaymentProvider.SANDBOX,
            status: PaymentStatus.PENDING,
          },
        }));

      return {
        payment: this.serializePayment(payment),
      };
    });

    if (result.inventoryEventId) {
      await this.inventoryService.syncEventInventory(result.inventoryEventId);
      throw new ConflictException('Reservation has expired.');
    }

    return result;
  }

  async confirmSandboxPayment(user: AuthUser, dto: ConfirmSandboxPaymentDto) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockAndLoadReservation(
        transaction,
        dto.reservationId,
      );

      this.ensureReservationAccess(reservation, user);

      if (reservation.status === ReservationStatus.PAID) {
        return {
          payment: this.serializePayment(reservation.payment),
          reservation: this.serializeReservation(reservation),
          order: this.serializeOrder(reservation.order),
          alreadyProcessed: true,
        };
      }

      if (reservation.status !== ReservationStatus.HELD) {
        throw new ConflictException('Reservation is no longer payable.');
      }

      if (this.isExpired(reservation)) {
        const expiredReservation = await this.expireReservation(
          transaction,
          reservation,
        );

        return {
          payment: this.serializePayment(expiredReservation.payment),
          reservation: this.serializeReservation(expiredReservation),
          order: null,
          alreadyProcessed: false,
          inventoryEventId: reservation.eventId,
        };
      }

      const amount = this.calculateReservationAmount(reservation);
      const payment = reservation.payment
        ? await transaction.payment.update({
            where: { id: reservation.payment.id },
            data: {
              amount,
              provider: PaymentProvider.SANDBOX,
              providerTransactionId:
                reservation.payment.providerTransactionId ??
                `sandbox-${randomUUID()}`,
              status: PaymentStatus.SUCCESS,
              idempotencyKey:
                reservation.payment.idempotencyKey ?? dto.idempotencyKey,
              paidAt: reservation.payment.paidAt ?? new Date(),
            },
          })
        : await transaction.payment.create({
            data: {
              reservationId: reservation.id,
              amount,
              provider: PaymentProvider.SANDBOX,
              providerTransactionId: `sandbox-${randomUUID()}`,
              status: PaymentStatus.SUCCESS,
              idempotencyKey: dto.idempotencyKey,
              paidAt: new Date(),
            },
          });

      await transaction.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.PAID,
        },
      });

      for (const item of reservation.items) {
        await transaction.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            heldQuantity: { decrement: item.quantity },
            soldQuantity: { increment: item.quantity },
          },
        });
      }

      const order =
        reservation.order ??
        (await transaction.order.create({
          data: {
            code: this.generateOrderCode(),
            userId: reservation.userId,
            eventId: reservation.eventId,
            reservationId: reservation.id,
            totalAmount: amount,
          },
        }));

      const updatedReservation =
        await transaction.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
          include: {
            event: true,
            user: true,
            items: {
              include: {
                ticketType: true,
              },
            },
            payment: true,
            order: true,
          },
        });

      return {
        payment: this.serializePayment(payment),
        reservation: this.serializeReservation(updatedReservation),
        order: this.serializeOrder(order),
        alreadyProcessed: false,
        inventoryEventId: reservation.eventId,
      };
    });

    if (result.inventoryEventId) {
      await this.inventoryService.syncEventInventory(result.inventoryEventId);
    }

    if (result.reservation.status === ReservationStatus.EXPIRED) {
      throw new ConflictException('Reservation has expired.');
    }

    const { order, payment } = result;

    if (!result.alreadyProcessed && order && payment) {
      await this.sendConfirmationEmail({
        payment,
        reservation: result.reservation,
        order,
      }).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown email error';
        this.logger.warn(
          `Payment confirmed for reservation ${result.reservation.id}, but confirmation email failed: ${message}`,
        );
      });
    }

    return result;
  }

  async failSandboxPayment(user: AuthUser, dto: SandboxPaymentReservationDto) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockAndLoadReservation(
        transaction,
        dto.reservationId,
      );

      this.ensureReservationAccess(reservation, user);

      if (reservation.status === ReservationStatus.PAID) {
        throw new ConflictException('Paid reservations cannot be failed.');
      }

      if (reservation.status !== ReservationStatus.HELD) {
        return {
          payment: this.serializePayment(reservation.payment),
          reservation: this.serializeReservation(reservation),
        };
      }

      if (this.isExpired(reservation)) {
        const expiredReservation = await this.expireReservation(
          transaction,
          reservation,
        );

        return {
          payment: this.serializePayment(expiredReservation.payment),
          reservation: this.serializeReservation(expiredReservation),
          inventoryEventId: reservation.eventId,
        };
      }

      const amount = this.calculateReservationAmount(reservation);
      const payment = reservation.payment
        ? await transaction.payment.update({
            where: { id: reservation.payment.id },
            data: {
              amount,
              provider: PaymentProvider.SANDBOX,
              status: PaymentStatus.FAILED,
              paidAt: null,
            },
          })
        : await transaction.payment.create({
            data: {
              reservationId: reservation.id,
              amount,
              provider: PaymentProvider.SANDBOX,
              status: PaymentStatus.FAILED,
            },
          });

      await transaction.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.CANCELLED,
        },
      });

      for (const item of reservation.items) {
        await transaction.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            availableQuantity: { increment: item.quantity },
            heldQuantity: { decrement: item.quantity },
          },
        });
      }

      return {
        payment: this.serializePayment(payment),
        reservation: {
          id: reservation.id,
          status: ReservationStatus.CANCELLED,
          expiresAt: reservation.holdExpiresAt.toISOString(),
        },
        inventoryEventId: reservation.eventId,
      };
    });

    if (result.inventoryEventId) {
      await this.inventoryService.syncEventInventory(result.inventoryEventId);
    }

    if (result.reservation.status === ReservationStatus.EXPIRED) {
      throw new ConflictException('Reservation has expired.');
    }

    return result;
  }

  private async lockAndLoadReservation(
    transaction: PaymentTransactionClient,
    reservationId: string,
  ) {
    await transaction.$queryRaw`
      SELECT id
      FROM reservations
      WHERE id = ${reservationId}::uuid
      FOR UPDATE
    `;

    const reservation = await transaction.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: true,
        user: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        payment: true,
        order: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    if (reservation.payment) {
      await transaction.$queryRaw`
        SELECT id
        FROM payments
        WHERE reservation_id = ${reservationId}::uuid
        FOR UPDATE
      `;
    }

    return reservation;
  }

  private async expireReservation(
    transaction: PaymentTransactionClient,
    reservation: PaymentReservationRecord,
  ) {
    const payment = reservation.payment
      ? await transaction.payment.update({
          where: { id: reservation.payment.id },
          data: {
            status: PaymentStatus.TIMEOUT,
            paidAt: null,
          },
        })
      : await transaction.payment.create({
          data: {
            reservationId: reservation.id,
            amount: this.calculateReservationAmount(reservation),
            provider: PaymentProvider.SANDBOX,
            status: PaymentStatus.TIMEOUT,
          },
        });

    await transaction.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.EXPIRED,
      },
    });

    for (const item of reservation.items) {
      await transaction.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          availableQuantity: { increment: item.quantity },
          heldQuantity: { decrement: item.quantity },
        },
      });
    }

    return {
      ...reservation,
      status: ReservationStatus.EXPIRED,
      payment,
    };
  }

  private ensureReservationAccess(
    reservation: Pick<PaymentReservationRecord, 'userId'>,
    user: AuthUser,
  ) {
    if (reservation.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to access this reservation.',
      );
    }
  }

  private isExpired(
    reservation: Pick<PaymentReservationRecord, 'holdExpiresAt'>,
  ) {
    return reservation.holdExpiresAt <= new Date();
  }

  private calculateReservationAmount(
    reservation: Pick<PaymentReservationRecord, 'items'>,
  ) {
    return reservation.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0,
    );
  }

  private serializePayment(payment: PaymentReservationRecord['payment']) {
    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      reservationId: payment.reservationId,
      status: payment.status,
      provider: payment.provider,
      amount: payment.amount,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
    };
  }

  private serializeReservation(
    reservation: Pick<
      PaymentReservationRecord,
      'id' | 'status' | 'holdExpiresAt'
    >,
  ) {
    return {
      id: reservation.id,
      status: reservation.status,
      expiresAt: reservation.holdExpiresAt.toISOString(),
    };
  }

  private serializeOrder(order: PaymentReservationRecord['order']) {
    if (!order) {
      return null;
    }

    return {
      id: order.id,
      code: order.code,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private generateOrderCode() {
    return `ORD-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  private async sendConfirmationEmail(result: {
    payment: NonNullable<ReturnType<PaymentsService['serializePayment']>>;
    reservation: ReturnType<PaymentsService['serializeReservation']>;
    order: NonNullable<ReturnType<PaymentsService['serializeOrder']>>;
  }) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({
      where: { id: result.reservation.id },
      include: {
        event: true,
        user: true,
        items: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    await this.emailService.sendPaymentConfirmationEmail({
      concertName: reservation.event.name,
      orderCode: result.order.code,
      userEmail: reservation.user.email,
      recipientEmail:
        reservation.recipientEmail?.trim() || reservation.user.email,
      recipientName: reservation.recipientName?.trim() || reservation.user.name,
      paymentStatus: result.payment.status,
      totalAmount: result.order.totalAmount,
      createdAt: result.order.createdAt,
      items: reservation.items.map((item) => ({
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
      })),
    });
  }
}
