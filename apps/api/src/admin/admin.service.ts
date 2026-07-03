import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TicketTypeInventoryRecord = Prisma.TicketTypeGetPayload<{
  include: {
    event: true;
  };
}>;

type HeldReservationRecord = Prisma.ReservationGetPayload<{
  include: {
    user: true;
    event: true;
    items: {
      include: {
        ticketType: true;
      };
    };
  };
}>;

type AdminOrderRecord = Prisma.OrderGetPayload<{
  include: {
    user: true;
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
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [inventoryRecords, revenueAggregate, recentOrders] =
      await Promise.all([
        this.prisma.ticketType.findMany({
          include: {
            event: true,
          },
          orderBy: [{ event: { startAt: 'asc' } }, { price: 'desc' }],
        }),
        this.prisma.order.aggregate({
          _sum: {
            totalAmount: true,
          },
        }),
        this.prisma.order.findMany({
          take: 8,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: true,
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
        }),
      ]);

    const totals = inventoryRecords.reduce(
      (aggregate, item) => ({
        totalSoldTickets: aggregate.totalSoldTickets + item.soldQuantity,
        totalHeldTickets: aggregate.totalHeldTickets + item.heldQuantity,
        totalAvailableTickets:
          aggregate.totalAvailableTickets + item.availableQuantity,
        totalInventoryTickets:
          aggregate.totalInventoryTickets + item.totalQuantity,
      }),
      {
        totalSoldTickets: 0,
        totalHeldTickets: 0,
        totalAvailableTickets: 0,
        totalInventoryTickets: 0,
      },
    );

    return {
      ...totals,
      totalRevenue: revenueAggregate._sum.totalAmount ?? 0,
      inventory: inventoryRecords.map((record) =>
        this.serializeInventoryRecord(record),
      ),
      recentOrders: recentOrders.map((order) => this.serializeOrder(order)),
    };
  }

  async getHeldReservations() {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.HELD,
      },
      orderBy: {
        holdExpiresAt: 'asc',
      },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    return reservations.map((reservation) =>
      this.serializeHeldReservation(reservation),
    );
  }

  async getOrders() {
    const orders = await this.prisma.order.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
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

  private serializeInventoryRecord(record: TicketTypeInventoryRecord) {
    return {
      eventId: record.eventId,
      eventName: record.event.name,
      ticketTypeId: record.id,
      ticketTypeName: record.name,
      price: record.price,
      totalQuantity: record.totalQuantity,
      availableQuantity: record.availableQuantity,
      heldQuantity: record.heldQuantity,
      soldQuantity: record.soldQuantity,
      startAt: record.event.startAt.toISOString(),
      venue: record.event.venue,
    };
  }

  private serializeHeldReservation(reservation: HeldReservationRecord) {
    const totalQuantity = reservation.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalAmount = reservation.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return {
      id: reservation.id,
      status: reservation.status,
      expiresAt: reservation.holdExpiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      user: {
        id: reservation.user.id,
        name: reservation.user.name,
        email: reservation.user.email,
      },
      event: {
        id: reservation.event.id,
        name: reservation.event.name,
        venue: reservation.event.venue,
        startAt: reservation.event.startAt.toISOString(),
      },
      totalQuantity,
      totalAmount,
      isExpired: reservation.holdExpiresAt <= new Date(),
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

  private serializeOrder(order: AdminOrderRecord) {
    return {
      id: order.id,
      code: order.code,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      },
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
