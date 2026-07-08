# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Alena CRM — a marketing agency CRM for managing leads and running bulk email/SMS campaigns. It is a two-part monorepo (no root package manager): a Next.js `frontend/` and an Express.js `backend/`, each with its own `package.json` and `.env`.

## Commands

All commands run from within `backend/` or `frontend/` (there is no root package.json).

### Backend (`cd backend`)
```bash
npm run dev          # ts-node-dev dev server on :4000 (auto-restart)
npm run build        # prisma generate + tsc → dist/
npm start            # run compiled dist/server.js
npm run db:migrate   # prisma migrate dev (create + apply migration locally)
npm run db:generate  # regenerate Prisma client
npm run db:studio    # Prisma Studio GUI
npm run db:reset     # drop + re-migrate (destructive)

# Run the one-off status reconciliation script:
npx ts-node src/scripts/reconcile-resend-statuses.ts            # dry run
npx ts-node src/scripts/reconcile-resend-statuses.ts --apply    # fix drifted campaign counters
```

### Frontend (`cd frontend`)
```bash
npm run dev    # Next.js dev server on :3000
npm run build  # production build
npm run lint   # next lint (eslint)
```

There is **no test suite** in this repo.

## Architecture

### Request → Send pipeline (the core flow)
Bulk campaigns move through a multi-step wizard backed by these backend stages:

1. **Parse** (`POST /api/campaigns/parse-file`) — `upload.middleware.ts` (multer) writes the CSV/Excel to `/tmp/crm-uploads`, then `fileParser.service.ts` streams it (papaparse / xlsx), normalizes headers (case-insensitive; see `NAME_HEADERS`/`EMAIL_HEADERS`/`PHONE_HEADERS`), and stores parsed rows in a **Redis session with 1-hour TTL**. The uploaded file is deleted after parse; the `sessionId` is the only bridge between steps.
2. **Validate** (`validate-emails` / `validate-phones`) — `emailValidator.service.ts` (AbstractAPI, treats all valid if no key) / `phoneValidator.service.ts` (libphonenumber-js, synchronous).
3. **Create + Send** (`POST /api/campaigns`, `POST /api/campaigns/:id/send`) — reads the Redis session, persists `CampaignRecipient` rows, and enqueues Bull jobs (batched ~100 recipients/job).
4. **Workers** (`workers/email.worker.ts`, `workers/sms.worker.ts`) — registered via side-effectful imports in `server.ts`. Email uses Resend `batch.send` (5 concurrent); SMS uses Twilio with `Promise.allSettled`.
5. **Progress** (`GET /api/campaigns/:id/progress`) — frontend polls every ~2s; reads only counter fields on `Campaign` (no joins).

### Worker correctness invariants (do not break these)
`email.worker.ts` encodes hard-won fixes — read its comments before editing:
- **Outcomes are resolved purely from the Resend response first, then persisted once.** Persistence/DB errors must never reclassify an email Resend already accepted as failed.
- **DB writes are grouped** (`updateMany` per distinct outcome, plus a single `unnest()` raw update to backfill per-row `providerMessageId`). This is deliberate to avoid exhausting the pooled DB connection (`connection_limit=3`), which previously timed out and falsely flipped SENT→FAILED.
- **Attachments bypass batch send**: Resend's batch API silently drops attachments, so attachment campaigns fall back to per-recipient `emails.send`.
- `toRecipientError()` scrubs internal ORM/pool errors into "Temporary sending error" so infra failures aren't shown to users.
- Template personalization: `{{name}}` is replaced (case-insensitive) at send time.

### Provider webhooks (`routes/webhooks.routes.ts`)
- `POST /api/webhooks/lead` — inbound lead from landing page; **always returns HTTP 200** so the landing page never times out.
- `POST /api/webhooks/resend` / `/twilio` — delivery/bounce callbacks. Recipients are matched via `CampaignRecipient.providerMessageId` (Resend `email_id`), NOT by email address (ambiguous across re-sends). Resend webhooks are Svix-signed; `app.ts` preserves the raw request body (`req.rawBody`) so signatures can be verified over untouched bytes. `RESEND_WEBHOOK_SECRET` enables verification when set.

### Backend conventions
- Layering: `routes/ → controllers/ → services/`. Controllers wrap handlers in `asyncHandler`; errors use `ApiError` and are formatted by `error.middleware.ts`. Responses use `ApiResponse` (shape: `{ success, data, meta? }`).
- `config/env.ts` validates all env vars with Zod at startup and **exits the process** on failure. `FRONTEND_URL` is comma-split into an allowed-origins array for CORS.
- Prisma client is a **global singleton** (`config/db.ts`) to avoid connection-pool exhaustion on hot reload. Enums are re-exported from `types/prisma.ts`.
- Redis (`config/redis.ts`) serves both Bull queues and file-parse sessions; uses `REDIS_URL` if set, else host/port.

### Frontend conventions
- Next.js 14 App Router under `app/`; routes mirror `PLAN.md` (e.g. `/campaigns/email/new`, `/campaigns/sms/:id`). `@/*` path alias maps to the frontend root.
- **All backend calls go through `lib/api.ts`** — a thin `fetch` wrapper grouped by resource (`leadsApi`, `campaignsApi`, `emailTemplatesApi`, etc.). Base URL is `NEXT_PUBLIC_API_URL`. Add new endpoints here rather than calling `fetch` directly in components.
- UI is shadcn/ui + Tailwind (dark theme), Radix primitives, `react-hot-toast` for notifications, `recharts` for dashboard charts.
- Auth is a simple hardcoded credential gate in `lib/auth.ts` (single shared login, cookie-based) — there is no per-user model in the database.

### Data model (`backend/prisma/schema.prisma`)
`Lead`, `Campaign`, `CampaignRecipient` (per-send record with status + `providerMessageId`), `EmailTemplate`, `SMSTemplate`. Key enums: `CampaignStatus` (DRAFT→VALIDATING→QUEUED→SENDING→COMPLETED/FAILED/PAUSED), `RecipientStatus` (PENDING/SENT/FAILED/BOUNCED/SKIPPED). `Campaign` holds denormalized `sentCount`/`failedCount`/`bouncedCount` counters (source of truth for progress); recipient rows are the source of truth for reconciliation.

## Deployment
- **Backend → Fly.io** (`cd backend && fly deploy`). `fly.toml` runs `prisma migrate deploy` as a release command (with a retry for advisory-lock contention). Set secrets via `fly secrets set`.
- **Frontend → Vercel** (deploy the `frontend/` directory; set `NEXT_PUBLIC_API_URL`).

## Env vars
Backend requires (validated by Zod, see `config/env.ts`): `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `ABSTRACT_API_KEY`; optional: `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`), `RESEND_WEBHOOK_SECRET`, `FRONTEND_URL`, `PORT`. Frontend: `NEXT_PUBLIC_API_URL`.
