# AGENTS.md - Mini TicketBox

## Project

Mini TicketBox - Hệ thống đặt vé Concert.

This project is a fullstack concert ticket booking mini project. The main evaluation focus is concurrency handling, anti-overselling, high-load UX, clean code, validation, global error handling, and unit tests.

## Final decisions

- Tech stack: Next.js + NestJS + PostgreSQL + Redis + Docker.
- Architecture: monorepo.
- Frontend app: `apps/web`.
- Backend app: `apps/api`.
- Shared package: `packages/shared`.
- Infra scripts: `infra/scripts`.
- Auth is required for ticket purchase.
- Admin login is required for dashboard access.
- Ticket types: VIP, Standard, Economy.
- Total tickets: 500.
- Payment: sandbox payment only, no real payment gateway.
- Email: local SMTP testing through Mailpit/MailHog only, no production email sending.

## Required ticket inventory

Seed exactly one concert with these ticket types:

| Ticket type |         Price | Quantity |
| ----------- | ------------: | -------: |
| VIP         | 2,000,000 VND |       50 |
| Standard    | 1,000,000 VND |      300 |
| Economy     |   500,000 VND |      150 |
| Total       |             - |      500 |

## Core invariants

Always preserve these invariants:

```txt
available + held + sold = total_quantity
sold <= total_quantity
sold for VIP <= 50
sold for Standard <= 300
sold for Economy <= 150
total sold across all types <= 500
```

Never implement booking with a naive `if available > 0 then update` flow without atomic operation, lock, or transaction.

## Concurrency requirements

The hold flow must be concurrency-safe. Prefer Redis Lua script for atomic hold inventory:

1. Check available quantity for `eventId + ticketTypeId`.
2. If available is insufficient, reject with `INSUFFICIENT_TICKETS`.
3. Atomically decrement available and increment held.
4. Create reservation with 5-minute expiration.
5. Publish inventory update.

Payment success must use PostgreSQL transaction and row-level protection or equivalent logic:

1. Lock reservation/payment state.
2. Confirm the reservation is `HELD` and not expired.
3. Ensure idempotency so double-click/double-request does not create multiple orders.
4. Mark reservation `PAID`.
5. Move quantity from held to sold.
6. Create order.
7. Send confirmation email through local SMTP.
8. Publish inventory update.

Expired reservations must be released idempotently.

## Reservation rules

- A user must be logged in before holding tickets.
- Reservation hold duration: 5 minutes.
- The backend returns `expiresAt` from server time.
- Frontend countdown must be based on backend `expiresAt`.
- Other users cannot reserve held tickets.
- Expired held tickets must be released back to inventory.
- Suggested limit: max 10 tickets per user per event.

Reservation statuses:

```txt
HELD
PAID
EXPIRED
CANCELLED
```

Payment statuses:

```txt
PENDING
SUCCESS
FAILED
TIMEOUT
```

## Sandbox payment

Do not integrate real payment gateways such as Stripe, VNPay, MoMo, PayPal, or live banking APIs.

Implement a local sandbox payment flow:

- Create sandbox payment for a reservation.
- Confirm success.
- Confirm failure.
- Simulate timeout or expired reservation behavior.

Payment success must only work if:

- reservation exists,
- reservation belongs to the current user unless admin flow,
- reservation status is `HELD`,
- `expiresAt` is still in the future,
- idempotency check passes.

Payment failed should release the reservation immediately unless the implementation explicitly chooses to keep it until expiration and documents the reason. Prefer immediate release for this mini project.

## Email

Use local email testing only.

Recommended Docker service:

```yaml
mailpit:
  image: axllent/mailpit
  ports:
    - "8025:8025"
    - "1025:1025"
```

Backend email should use Nodemailer through SMTP host `mailpit` and port `1025`.

After payment success, send confirmation email containing:

- concert name,
- order code,
- user email,
- ticket type,
- quantity,
- total amount,
- payment status,
- created time,
- note that this is a sandbox confirmation email.

Reviewer should be able to open `http://localhost:8025` and see the email.

## API requirements

Implement these API endpoints or equivalent with clear README documentation:

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

## Frontend requirements

Pages/routes should include:

```txt
/                         Event page
/login                    User/admin login
/register                 User registration
/events/[id]/book         Ticket selection
/checkout/[reservationId]  Countdown + sandbox payment
/me/orders                User order history
/admin/dashboard          Admin dashboard
```

Frontend must handle:

- loading states,
- disabled buttons while request is pending,
- spam click prevention,
- countdown synced with backend `expiresAt`,
- expired reservation state,
- payment success/failure/timeout messages,
- realtime inventory update via WebSocket/SSE or polling fallback.

## Admin dashboard

Admin dashboard requires role `ADMIN`.

Show:

- total sold tickets,
- total held tickets,
- total available tickets,
- total revenue,
- inventory by ticket type,
- held reservations list,
- recent orders/payments.

## Code quality rules

Backend:

- Use DTO validation at API boundary.
- Use global exception filter.
- Use consistent response format.
- Keep controllers thin; business logic belongs in services.
- Separate provider integrations: payment provider, email provider.
- Do not hard-code secrets.
- Do not commit `.env`.

Frontend:

- Use TypeScript strictly.
- Keep API client logic separate from page components.
- Reuse shared status enums/types from `packages/shared` when practical.
- Keep UI simple, clear, and reliable.

Testing:

- Add unit tests for reservation hold/release.
- Add concurrency/overselling test.
- Add payment success/failure/idempotency tests.
- Add auth/admin guard tests if practical.
- Add email service test/mock if practical.

## Suggested implementation order

1. Bootstrap monorepo and Docker.
2. Database schema and seed data.
3. Auth and role guard.
4. Reservation hold/release core logic.
5. Payment sandbox and idempotency.
6. Realtime inventory.
7. Frontend booking flow.
8. Admin dashboard.
9. Email confirmation.
10. README, tests, and final polish.

## README requirements

README must include:

- Candidate full name.
- GitHub username.
- Project overview.
- Tech stack.
- Architecture diagram or text explanation.
- Docker setup instructions.
- Local URLs.
- Demo accounts.
- API list.
- How to run tests.
- Anti-overselling explanation.
- Hold/release explanation.
- Sandbox payment explanation.
- Mailpit/MailHog email testing explanation.

## Out of scope

Do not implement:

- real payment gateway,
- live money transaction,
- real production email sending,
- OAuth login,
- forgot password,
- email verification,
- seat map,
- QR ticket generation,
- multi-event CMS,
- advanced waiting room/queue system.
