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
      name: 'Quản trị viên Vé Concert',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@miniticketbox.local',
      name: 'Quản trị viên Vé Concert',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@miniticketbox.local' },
    update: {
      name: 'Người dùng Demo',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
    create: {
      email: 'user@miniticketbox.local',
      name: 'Người dùng Demo',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
  });

  const events = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Đêm Nhạc Sắc Màu Thành Phố',
      description: 'Đại nhạc hội nổi bật với đầy đủ hạng vé VIP, Standard và Economy.',
      venue: 'Nhà thi đấu Thủ Thiêm, TP. Hồ Chí Minh',
      startAt: '2026-08-15T20:00:00.000Z',
      salesOpenAt: '2026-07-01T00:00:00.000Z',
      salesCloseAt: '2026-08-15T19:30:00.000Z',
      ticketTypes: [
        { name: 'VIP', price: 2_000_000, quantity: 50 },
        { name: 'Standard', price: 1_000_000, quantity: 300 },
        { name: 'Economy', price: 500_000, quantity: 150 },
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Lễ Hội Âm Thanh Hoàng Hôn',
      description: 'Đêm nhạc ngoài trời với hai hạng vé dành cho khán giả yêu không khí lễ hội.',
      venue: 'Sân khấu Bến Bạch Đằng, TP. Hồ Chí Minh',
      startAt: '2026-09-05T18:30:00.000Z',
      salesOpenAt: '2026-07-10T00:00:00.000Z',
      salesCloseAt: '2026-09-05T17:45:00.000Z',
      ticketTypes: [
        { name: 'VIP', price: 1_800_000, quantity: 60 },
        { name: 'Standard', price: 950_000, quantity: 240 },
      ],
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Đêm Acoustic Dưới Ánh Trăng',
      description: 'Đêm acoustic gần gũi với khu vực đứng cao cấp và khu vực tiêu chuẩn.',
      venue: 'Nhà hát Ánh Đèn, Đà Nẵng',
      startAt: '2026-09-20T19:00:00.000Z',
      salesOpenAt: '2026-07-12T00:00:00.000Z',
      salesCloseAt: '2026-09-20T18:15:00.000Z',
      ticketTypes: [
        { name: 'VIP', price: 1_500_000, quantity: 40 },
        { name: 'Standard', price: 780_000, quantity: 180 },
      ],
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Đại Tiệc Ánh Sáng Cuối Năm',
      description: 'Sự kiện trình diễn sôi động với khu VIP giới hạn và khu Standard quy mô lớn.',
      venue: 'Cung thể thao Tây Hồ, Hà Nội',
      startAt: '2026-10-10T21:00:00.000Z',
      salesOpenAt: '2026-07-15T00:00:00.000Z',
      salesCloseAt: '2026-10-10T20:15:00.000Z',
      ticketTypes: [
        { name: 'VIP', price: 2_200_000, quantity: 80 },
        { name: 'Standard', price: 1_150_000, quantity: 320 },
      ],
    },
  ];

  for (const eventData of events) {
    const event = await prisma.event.upsert({
      where: { id: eventData.id },
      update: {
        name: eventData.name,
        description: eventData.description,
        venue: eventData.venue,
        startAt: new Date(eventData.startAt),
        salesOpenAt: new Date(eventData.salesOpenAt),
        salesCloseAt: new Date(eventData.salesCloseAt),
      },
      create: {
        id: eventData.id,
        name: eventData.name,
        description: eventData.description,
        venue: eventData.venue,
        startAt: new Date(eventData.startAt),
        salesOpenAt: new Date(eventData.salesOpenAt),
        salesCloseAt: new Date(eventData.salesCloseAt),
      },
    });

    for (const ticketType of eventData.ticketTypes) {
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
