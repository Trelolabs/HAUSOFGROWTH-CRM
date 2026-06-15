# CRM Build Plan — Marketing Agency

## Overview
Full-stack marketing agency CRM built from scratch.
- **Backend**: Express.js + TypeScript + Prisma + PostgreSQL + Bull + Redis
- **Frontend**: Next.js 14 App Router + TypeScript + shadcn/ui (dark theme)
- **Email**: Resend SDK (batch via Bull workers)
- **SMS**: Twilio SDK (via Bull workers)

---

## Progress Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## PHASE 1 — Backend Foundation
> Goal: Runnable Express server with Prisma connected

- [x] **Step 1** — `backend/package.json` + `backend/tsconfig.json`
- [x] **Step 2** — `backend/prisma/schema.prisma` (full schema, all models + enums)
- [x] **Step 3** — `backend/src/config/` (env.ts, db.ts, redis.ts, resend.ts, twilio.ts)
- [x] **Step 4** — `backend/src/utils/` (ApiError.ts, ApiResponse.ts, asyncHandler.ts)
- [x] **Step 5** — `backend/src/middleware/` (error.middleware.ts, upload.middleware.ts, validate.middleware.ts)
- [x] **Step 6** — `backend/src/app.ts` + `backend/src/server.ts` + `.env.example`

**Phase 1 verification:**
```bash
cd crm/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
# → Server running on port 4000
curl http://localhost:4000/api/health
# → {"success":true,"data":"OK"}
```

---

## PHASE 2 — Backend Core
> Goal: All CRUD routes for Leads, Dashboard, Templates + Webhook intake

- [ ] **Step 7**  — `backend/src/routes/index.ts` (root router)
- [ ] **Step 8**  — Leads controller + routes (full CRUD + pagination + search)
- [ ] **Step 9**  — Webhooks controller (inbound lead from landing page, Resend, Twilio)
- [ ] **Step 10** — Dashboard controller + routes (stats, campaign chart, leads chart)
- [ ] **Step 11** — Templates controller + routes (email + sms CRUD)

**Phase 2 verification:**
```bash
# POST a lead from landing page
curl -X POST http://localhost:4000/api/webhooks/lead \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@co.com","whatsappNumber":"+15550001234","businessName":"Acme","interestedIn":["Paid Ads"]}'
# → 200

# List leads
curl http://localhost:4000/api/leads
# → { success: true, data: [...], meta: {...} }

# Dashboard stats
curl http://localhost:4000/api/dashboard/stats
```

---

## PHASE 3 — Campaign Backend
> Goal: File parsing, validation, Bull queues, email/SMS sending, campaign routes

- [ ] **Step 12** — `fileParser.service.ts` (streaming CSV/Excel → Redis session)
- [ ] **Step 13** — `emailValidator.service.ts` (Abstract API, batches of 20)
- [ ] **Step 14** — `phoneValidator.service.ts` (libphonenumber-js, synchronous)
- [ ] **Step 15** — `email.queue.ts` + `sms.queue.ts` (Bull queue setup)
- [ ] **Step 16** — `email.worker.ts` (Resend batch.send, 5 concurrent, 100/job)
- [ ] **Step 17** — `sms.worker.ts` (Twilio messages.create, Promise.allSettled)
- [ ] **Step 18** — Campaigns controller + routes (all endpoints incl. parse-file, validate, send)
- [ ] **Step 19** — Resend + Twilio webhook handlers (bounce/delivery callbacks)

**Phase 3 verification:**
```bash
# Upload a CSV
curl -X POST http://localhost:4000/api/campaigns/parse-file \
  -F "file=@test.csv" -F "type=email"
# → { sessionId, total, preview }

# Validate emails
curl -X POST http://localhost:4000/api/campaigns/validate-emails \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<id>"}'
# → { valid:[], invalid:[], risky:[], counts:{} }
```

---

## PHASE 4 — Frontend Foundation
> Goal: Next.js app running with dark theme, sidebar, API client, types

- [ ] **Step 20** — `frontend/package.json` + `frontend/tailwind.config.ts` + `frontend/tsconfig.json`
- [ ] **Step 21** — shadcn/ui setup (`components.json`, global CSS, base components)
- [ ] **Step 22** — `app/layout.tsx` + `Sidebar.tsx` + `Header.tsx` + `PageWrapper.tsx`
- [ ] **Step 23** — `lib/api.ts` (axios instance → Express, interceptors)
- [ ] **Step 24** — `types/index.ts` (all TS interfaces + enums)

---

## PHASE 5 — Frontend Pages
> Goal: All pages wired to real API data

- [ ] **Step 25** — Dashboard page (stats cards, line chart, donut chart, recent campaigns table)
- [ ] **Step 26** — Leads page (table + filters + LeadDrawer + LeadCreateModal)
- [ ] **Step 27** — Email Templates page (grid + editor modal + preview modal)
- [ ] **Step 28** — SMS Templates page (grid + editor modal + char counter)
- [ ] **Step 29** — Email Campaign wizard (5 steps: upload → validate → template → review → progress)
- [ ] **Step 30** — SMS Campaign wizard (same 5 steps, phone validation)
- [ ] **Step 31** — Campaign list pages (email + sms)
- [ ] **Step 32** — Campaign detail page (recipients tabs, export failed, stats)

---

## PHASE 6 — Polish & Connect
> Goal: Production-ready UX, all flows tested end to end

- [ ] **Step 33** — Loading skeletons on all pages
- [ ] **Step 34** — Empty states on all tables/grids
- [ ] **Step 35** — Toast notifications (react-hot-toast, success + error)
- [ ] **Step 36** — Error boundaries (React ErrorBoundary in root layout)
- [ ] **Step 37** — Final API wiring audit (all frontend → backend connections)
- [ ] **Step 38** — End-to-end smoke test (full lead → campaign → send flow)

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Queue concurrency | 5 workers × 100 recipients/job | Balances throughput vs rate limits |
| File sessions | Redis, 1hr TTL | File deleted after parse; session bridges parse → validate step |
| Progress polling | 2s interval, 2 DB fields only | Fast, no joins, no N+1 |
| Webhook response | Always HTTP 200 | Landing page must never time out |
| Prisma client | Global singleton | Prevents connection pool exhaustion on hot reload |
| CSV/Excel parsing | papaparse stream / xlsx stream | Never buffer full file in memory |

---

## Key Routes Reference

### Backend (port 4000)
```
GET    /api/health
GET    /api/leads                          ?page,limit,status,source,search
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id
GET    /api/campaigns                      ?page,limit,type,status
POST   /api/campaigns
GET    /api/campaigns/:id
GET    /api/campaigns/:id/progress
POST   /api/campaigns/:id/send             → 202
GET    /api/campaigns/:id/recipients       ?page,limit,status
GET    /api/campaigns/:id/export-failed    → CSV stream
POST   /api/campaigns/parse-file           multipart
POST   /api/campaigns/validate-emails
POST   /api/campaigns/validate-phones
GET    /api/templates/email
POST   /api/templates/email
PUT    /api/templates/email/:id
DELETE /api/templates/email/:id
GET    /api/templates/sms
POST   /api/templates/sms
PUT    /api/templates/sms/:id
DELETE /api/templates/sms/:id
GET    /api/dashboard/stats
GET    /api/dashboard/campaign-chart       ?days
GET    /api/dashboard/leads-chart
POST   /api/webhooks/lead
POST   /api/webhooks/resend
POST   /api/webhooks/twilio
```

### Frontend (port 3000)
```
/                     → redirect to /dashboard
/dashboard
/leads
/leads/:id
/campaigns/email
/campaigns/email/new
/campaigns/email/:id
/campaigns/sms
/campaigns/sms/new
/campaigns/sms/:id
/templates/email
/templates/sms
/settings
```

---

## Env Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/crm
REDIS_HOST=localhost
REDIS_PORT=6379
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
ABSTRACT_API_KEY=xxxx
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
