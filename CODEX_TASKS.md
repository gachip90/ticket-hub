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
- [ ] Seed 4 concert.
- [ ] Seed VIP 50, Standard 300, Economy 150 for main concert.

## Phase 2 - Auth & RBAC

- [x] Implement register API.
- [x] Implement login API.
- [x] Implement me API.
- [x] Add bcrypt password hashing.
- [x] Add JWT strategy.
- [x] Add AuthGuard.
- [x] Add RolesGuard.
- [x] Protect admin endpoints.
- [x] Add frontend login/register pages.

## Phase 3 - Reservation core

- [x] Initialize Redis inventory from database seed.
- [x] Implement Redis Lua script for atomic hold.
- [x] Implement `POST /api/reservations/hold`.
- [x] Implement reservation expiresAt = now + 5 minutes.
- [x] Implement max tickets per user/event, suggested max 10.
- [x] Implement release reservation API.
- [x] Implement expired reservation background job.
- [x] Implement inventory API.
- [x] Add reservation unit tests.
- [x] Add anti-overselling concurrency test.

## Phase 4 - Sandbox payment

- [x] Implement create sandbox payment API.
- [x] Implement confirm success API.
- [x] Implement fail API.
- [x] Implement timeout/expired handling.
- [x] Implement idempotency check.
- [x] Implement order creation after payment success.
- [x] Update inventory held/sold after payment success.
- [x] Release inventory after payment failed.
- [x] Add payment unit tests.

## Phase 5 - Frontend booking UX

- [x] Event page shows ticket types and realtime inventory.
- [x] Booking page allows type + quantity selection.
- [x] Disable buttons while request is pending.
- [x] Show loading/error/success states.
- [x] Checkout page shows 5-minute countdown from server expiresAt.
- [x] Add sandbox payment success/fail/timeout buttons.
- [x] Handle expired reservation.
- [x] Add polling fallback if realtime disconnects.

## Phase 6 - Realtime

- [x] Implement WebSocket or SSE from backend.
- [x] Publish inventory updates after hold/release/payment.
- [x] Subscribe in event page.
- [ ] Subscribe in admin dashboard.
- [x] Add reconnect or fallback behavior.

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
