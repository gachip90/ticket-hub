# Mini TicketBox - Hệ thống đặt vé Concert

> Fullstack mini project mô phỏng hệ thống đặt vé concert giới hạn 500 vé, có xử lý concurrency, giữ vé 5 phút, thanh toán sandbox, email xác nhận local và admin dashboard.

## Candidate

- Họ tên: `<Điền họ tên của bạn>`
- GitHub username: `<Điền GitHub username>`

## Tech stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Cache/Concurrency: Redis
- Realtime: WebSocket hoặc Server-Sent Events
- Email local: Mailpit/MailHog + Nodemailer
- Container: Docker Compose
- Test: Jest

## Main features

- User register/login để mua vé.
- Admin login để xem dashboard.
- 3 loại vé: VIP, Standard, Economy.
- Tổng 500 vé.
- Giữ vé trong 5 phút khi user chọn vé.
- Vé đang giữ không thể bị user khác chọn.
- Vé tự release nếu hết 5 phút chưa thanh toán.
- Sandbox payment: success/fail/timeout.
- Email xác nhận sau payment success qua Mailpit/MailHog.
- Realtime inventory update.
- Admin dashboard: sold, held, available, revenue, held reservations, orders.
- Unit test cho logic chống overselling và payment.

## Ticket inventory seed

| Ticket type | Price | Quantity |
| --- | ---: | ---: |
| VIP | 2,000,000 VND | 50 |
| Standard | 1,000,000 VND | 300 |
| Economy | 500,000 VND | 150 |
| Total | - | 500 |

## Local setup

```bash
cp .env.example .env
corepack pnpm install
docker compose up -d
corepack pnpm dev
```

Local URLs:

```txt
Frontend: http://localhost:3000
Backend API: http://localhost:3001
Mailpit/MailHog: http://localhost:8025
```

## Demo accounts

```txt
Admin:
  email: admin@miniticketbox.local
  password: Admin@123456

User:
  email: user@miniticketbox.local
  password: User@123456
```

## Common commands

```bash
# Start infrastructure services
docker compose up -d

# Run web and API in development mode
corepack pnpm dev

# Run tests
corepack pnpm test

# Run lint
corepack pnpm lint

# Run build
corepack pnpm build
```

## Core booking flow

```txt
User login
→ Select ticket type + quantity
→ Backend creates HELD reservation for 5 minutes
→ Available inventory decreases, held inventory increases
→ User sees countdown
→ User confirms sandbox payment
→ Reservation becomes PAID
→ Held decreases, sold increases
→ Order is created
→ Confirmation email is sent to local mailbox
```

## Anti-overselling strategy

The system must never sell more than the inventory limit.

Recommended implementation:

- Use Redis Lua script for atomic hold operation.
- Use PostgreSQL transaction/row lock for payment confirmation.
- Use idempotency key for hold/payment requests.
- Keep invariant:

```txt
available + held + sold = total_quantity
sold <= total_quantity
```

The important part is that the system must not implement a naive check-then-update flow such as:

```txt
if available > 0:
  update available = available - quantity
```

without an atomic operation, lock, or transaction.

## Sandbox payment

This project intentionally does not use a real payment gateway.

The sandbox payment flow supports:

- Success
- Failed
- Timeout/expired

This is enough to demonstrate the system design without requiring real merchant credentials, real money transaction, public callback URLs, refunds, chargebacks or production payment risks.

## Email testing

This project intentionally does not send real production emails.

After successful sandbox payment, the backend sends a confirmation email to local SMTP. Open:

```txt
http://localhost:8025
```

You should see the confirmation email containing order code, ticket information, total amount and payment status.

## API summary

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/events/:id
GET  /api/events/:id/inventory
POST /api/reservations/hold
GET  /api/reservations/:id
POST /api/reservations/:id/release
POST /api/payments/sandbox/create
POST /api/payments/sandbox/confirm
POST /api/payments/sandbox/fail
GET  /api/me/orders
GET  /api/admin/stats
GET  /api/admin/reservations/held
GET  /api/admin/orders
```

## Admin dashboard

Admin dashboard shows:

- Total revenue
- Sold tickets
- Held tickets
- Available tickets
- Inventory by ticket type
- Held reservations
- Recent orders/payments

## Project structure

```txt
mini-ticketbox/
  apps/
    web/
    api/
  packages/
    shared/
  infra/
    scripts/
  docker-compose.yml
  .env.example
  AGENTS.md
  README.md
```

## Notes

- Payment and email are local sandbox implementations.
- The code is structured with provider interfaces so real payment/email providers can be added later.
- The mini project focuses on concurrency, reliability and clear UX rather than production payment operations.
