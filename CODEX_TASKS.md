# CODEX_TASKS.md - Mini TicketBox Implementation Checklist

Use this checklist as the execution order for Codex.

## Phase 0 - Bootstrap

- [ ] Create monorepo root.
- [ ] Create `apps/web` with Next.js + TypeScript.
- [ ] Create `apps/api` with NestJS + TypeScript.
- [ ] Create `packages/shared`.
- [ ] Create `infra/scripts`.
- [ ] Add Docker Compose for web, api, postgres, redis, mailpit.
- [ ] Add `.env.example`.
- [ ] Add README draft.
- [ ] Add AGENTS.md.

## Phase 1 - Database & seed

- [ ] Choose ORM, preferably Prisma unless there is a strong reason to use TypeORM.
- [ ] Create users table/model.
- [ ] Create events table/model.
- [ ] Create ticket_types table/model.
- [ ] Create reservations table/model.
- [ ] Create reservation_items table/model.
- [ ] Create payments table/model.
- [ ] Create orders table/model.
- [ ] Seed admin account.
- [ ] Seed demo user account.
- [ ] Seed one concert.
- [ ] Seed VIP 50, Standard 300, Economy 150.

## Phase 2 - Auth & RBAC

- [ ] Implement register API.
- [ ] Implement login API.
- [ ] Implement me API.
- [ ] Add bcrypt password hashing.
- [ ] Add JWT strategy.
- [ ] Add AuthGuard.
- [ ] Add RolesGuard.
- [ ] Protect admin endpoints.
- [ ] Add frontend login/register pages.

## Phase 3 - Reservation core

- [ ] Initialize Redis inventory from database seed.
- [ ] Implement Redis Lua script for atomic hold.
- [ ] Implement `POST /api/reservations/hold`.
- [ ] Implement reservation expiresAt = now + 5 minutes.
- [ ] Implement max tickets per user/event, suggested max 4.
- [ ] Implement release reservation API.
- [ ] Implement expired reservation background job.
- [ ] Implement inventory API.
- [ ] Add reservation unit tests.
- [ ] Add anti-overselling concurrency test.

## Phase 4 - Sandbox payment

- [ ] Implement create sandbox payment API.
- [ ] Implement confirm success API.
- [ ] Implement fail API.
- [ ] Implement timeout/expired handling.
- [ ] Implement idempotency check.
- [ ] Implement order creation after payment success.
- [ ] Update inventory held/sold after payment success.
- [ ] Release inventory after payment failed.
- [ ] Add payment unit tests.

## Phase 5 - Frontend booking UX

- [ ] Event page shows ticket types and realtime inventory.
- [ ] Booking page allows type + quantity selection.
- [ ] Disable buttons while request is pending.
- [ ] Show loading/error/success states.
- [ ] Checkout page shows 5-minute countdown from server expiresAt.
- [ ] Add sandbox payment success/fail/timeout buttons.
- [ ] Handle expired reservation.
- [ ] Add polling fallback if realtime disconnects.

## Phase 6 - Realtime

- [ ] Implement WebSocket or SSE from backend.
- [ ] Publish inventory updates after hold/release/payment.
- [ ] Subscribe in event page.
- [ ] Subscribe in admin dashboard.
- [ ] Add reconnect or fallback behavior.

## Phase 7 - Admin dashboard

- [ ] Implement stats API.
- [ ] Implement held reservations API.
- [ ] Implement orders API.
- [ ] Create protected admin dashboard page.
- [ ] Show revenue, sold, held, available.
- [ ] Show inventory by ticket type.
- [ ] Show held reservations list.
- [ ] Show recent orders/payments.

## Phase 8 - Email local

- [ ] Add Mailpit/MailHog Docker service.
- [ ] Add Nodemailer email provider.
- [ ] Add confirmation email template.
- [ ] Send email after payment success.
- [ ] Verify email appears at `http://localhost:8025`.
- [ ] Add email mock/unit test if practical.

## Phase 9 - Final polish

- [ ] Run tests.
- [ ] Run lint.
- [ ] Run build.
- [ ] Verify Docker setup from clean state.
- [ ] Update README final.
- [ ] Explain anti-overselling strategy in README.
- [ ] Explain sandbox payment and local email in README.
- [ ] Add screenshots if time allows.
- [ ] Confirm no `.env` or secrets committed.
- [ ] Confirm GitHub repo ready for submission.
