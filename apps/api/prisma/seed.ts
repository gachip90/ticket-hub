import { PrismaClient, TicketTypeStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '../../.env' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  const [adminPasswordHash, userPasswordHash] = await Promise.all([
    bcrypt.hash('Admin@123456', 12),
    bcrypt.hash('User@123456', 12),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@miniticketbox.local' },
    update: {
      name: 'Mini TicketBox Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@miniticketbox.local',
      name: 'Mini TicketBox Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@miniticketbox.local' },
    update: {
      name: 'Demo User',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
    create: {
      email: 'user@miniticketbox.local',
      name: 'Demo User',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
  });

  const event = await prisma.event.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {
      name: 'Mini TicketBox Live Concert',
      description: 'Demo concert for the Mini TicketBox ticket booking system.',
      venue: 'Mini TicketBox Arena',
      startAt: new Date('2026-08-15T20:00:00.000Z'),
      salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
      salesCloseAt: new Date('2026-08-15T19:30:00.000Z'),
    },
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Mini TicketBox Live Concert',
      description: 'Demo concert for the Mini TicketBox ticket booking system.',
      venue: 'Mini TicketBox Arena',
      startAt: new Date('2026-08-15T20:00:00.000Z'),
      salesOpenAt: new Date('2026-07-01T00:00:00.000Z'),
      salesCloseAt: new Date('2026-08-15T19:30:00.000Z'),
    },
  });

  const ticketTypes = [
    { name: 'VIP', price: 2_000_000, quantity: 50 },
    { name: 'Standard', price: 1_000_000, quantity: 300 },
    { name: 'Economy', price: 500_000, quantity: 150 },
  ];

  for (const ticketType of ticketTypes) {
    await prisma.ticketType.upsert({
      where: {
        eventId_name: {
          eventId: event.id,
          name: ticketType.name,
        },
      },
      update: {
        price: ticketType.price,
        totalQuantity: ticketType.quantity,
        availableQuantity: ticketType.quantity,
        heldQuantity: 0,
        soldQuantity: 0,
        status: TicketTypeStatus.ACTIVE,
      },
      create: {
        eventId: event.id,
        name: ticketType.name,
        price: ticketType.price,
        totalQuantity: ticketType.quantity,
        availableQuantity: ticketType.quantity,
        heldQuantity: 0,
        soldQuantity: 0,
        status: TicketTypeStatus.ACTIVE,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
