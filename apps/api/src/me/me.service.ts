import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

type UserOrderRecord = Prisma.OrderGetPayload<{
  include: {
    event: true;
    reservation: {
      include: {
        items: {
          include: {
            ticketType: true;
          };
        };
        payment: true;
      };
    };
  };
}>;

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders(user: AuthUser) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId: user.id,
      },
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        event: true,
        reservation: {
          include: {
            items: {
              include: {
                ticketType: true,
              },
            },
            payment: true,
          },
        },
      },
    });

    return orders.map((order) => this.serializeOrder(order));
  }

  private serializeOrder(order: UserOrderRecord) {
    return {
      id: order.id,
      code: order.code,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
      event: {
        id: order.event.id,
        name: order.event.name,
        venue: order.event.venue,
        startAt: order.event.startAt.toISOString(),
      },
      reservation: {
        id: order.reservation.id,
        status: order.reservation.status,
        expiresAt: order.reservation.holdExpiresAt.toISOString(),
        recipientName: order.reservation.recipientName,
        recipientEmail: order.reservation.recipientEmail,
        recipientPhone: order.reservation.recipientPhone,
        items: order.reservation.items.map((item) => ({
          id: item.id,
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.ticketType.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        })),
      },
      payment: order.reservation.payment
        ? {
            id: order.reservation.payment.id,
            status: order.reservation.payment.status,
            provider: order.reservation.payment.provider,
            amount: order.reservation.payment.amount,
            paidAt: order.reservation.payment.paidAt?.toISOString() ?? null,
            createdAt: order.reservation.payment.createdAt.toISOString(),
          }
        : null,
    };
  }
}
