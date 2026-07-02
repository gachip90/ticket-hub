import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents() {
    return this.fetchEvents();
  }

  async searchEvents(keyword: string) {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return this.fetchEvents();
    }

    return this.fetchEvents({
      name: { contains: normalizedKeyword, mode: 'insensitive' },
    });
  }

  async getEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return this.toEventDetail(event);
  }

  private async fetchEvents(where?: Prisma.EventWhereInput) {
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        ticketTypes: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' },
        },
      },
    });

    return events.map((event) => this.toEventSummary(event));
  }

  private toEventSummary(event: EventWithTicketTypes) {
    const totals = this.getInventoryTotals(event.ticketTypes);

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      venue: event.venue,
      startAt: event.startAt.toISOString(),
      salesOpenAt: event.salesOpenAt.toISOString(),
      salesCloseAt: event.salesCloseAt.toISOString(),
      imageUrl: this.resolveEventImage(event.id),
      genreLabel: this.resolveGenreLabel(event.id),
      lowestPrice: event.ticketTypes[0]?.price ?? 0,
      availableTickets: totals.available,
      totalTickets: totals.total,
      ticketTypeCount: event.ticketTypes.length,
    };
  }

  private toEventDetail(event: EventWithTicketTypes) {
    const summary = this.toEventSummary(event);

    return {
      ...summary,
      ticketTypes: event.ticketTypes.map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        totalQuantity: ticketType.totalQuantity,
        availableQuantity: ticketType.availableQuantity,
        heldQuantity: ticketType.heldQuantity,
        soldQuantity: ticketType.soldQuantity,
      })),
    };
  }

  private getInventoryTotals(ticketTypes: EventWithTicketTypes['ticketTypes']) {
    return ticketTypes.reduce(
      (accumulator, ticketType) => ({
        total: accumulator.total + ticketType.totalQuantity,
        available: accumulator.available + ticketType.availableQuantity,
      }),
      { total: 0, available: 0 },
    );
  }

  private resolveGenreLabel(eventId: string) {
    const labels: Record<string, string> = {
      '11111111-1111-4111-8111-111111111111': 'Đại nhạc hội',
      '22222222-2222-4222-8222-222222222222': 'Lễ hội âm nhạc',
      '33333333-3333-4333-8333-333333333333': 'Acoustic',
      '44444444-4444-4444-8444-444444444444': 'Trình diễn đặc biệt',
    };

    return labels[eventId] ?? 'Sự kiện âm nhạc';
  }

  private resolveEventImage(eventId: string) {
    const images: Record<string, string> = {
      '11111111-1111-4111-8111-111111111111':
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
      '22222222-2222-4222-8222-222222222222':
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
      '33333333-3333-4333-8333-333333333333':
        'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1200&q=80',
      '44444444-4444-4444-8444-444444444444':
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    };

    return (
      images[eventId] ??
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80'
    );
  }
}

type EventWithTicketTypes = Prisma.EventGetPayload<{
  include: {
    ticketTypes: true;
  };
}>;
