# Alena CRM

A marketing agency CRM for managing leads and running bulk email/SMS campaigns.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Queue | Bull (Redis-backed job queue) |
| Session store | Redis (file parse sessions, 1-hour TTL) |
| Email delivery | Resend |
| SMS delivery | Twilio |
| Deployment | Frontend → Vercel · Backend → Fly.io |

## Project Structure

```
crm/
├── frontend/          # Next.js app
│   ├── app/           # Pages (App Router)
│   │   ├── campaigns/ # Email & SMS campaign pages
│   │   ├── leads/     # Lead management pages
│   │   ├── templates/ # Email & SMS template pages
│   │   ├── dashboard/ # Dashboard page
│   │   └── settings/  # Settings page
│   ├── components/    # Reusable UI components
│   └── lib/           # API client, utilities
│
└── backend/           # Express.js API
    ├── src/
    │   ├── routes/    # API route definitions
    │   ├── controllers/
    │   ├── services/  # Business logic (file parser, validators, mailer, SMS)
    │   ├── workers/   # Bull queue workers (email, SMS)
    │   ├── queues/    # Queue definitions
    │   ├── middleware/ # Auth, error handler, file upload
    │   └── config/    # Redis, Prisma client setup
    └── prisma/
        └── schema.prisma
```

## Features

- **Lead Management** — create, view, and filter leads captured from landing pages or manual entry
- **Bulk Email Campaigns** — upload a CSV/Excel file, validate addresses, pick a template, send at scale
- **Bulk SMS Campaigns** — same wizard flow using phone numbers (E.164 format)
- **Email Templates** — HTML or plain-text templates with subject and preview text
- **SMS Templates** — short message templates with character count
- **Campaign Progress** — real-time progress polling with sent/failed counts
- **Failed Recipient Export** — download a CSV of failed recipients with error messages
- **Dashboard** — overview stats for leads and campaigns

## Prerequisites

- Node.js ≥ 18
- PostgreSQL
- Redis
- A [Resend](https://resend.com) API key (email)
- A [Twilio](https://twilio.com) account (SMS)
- _(Optional)_ An [AbstractAPI](https://www.abstractapi.com/email-validation-api) key for email deliverability checks

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd crm

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** — create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/crm
REDIS_URL=redis://localhost:6379

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=you@yourdomain.com

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15550001234

ABSTRACT_API_KEY=        # optional — email deliverability validation
FRONTEND_URL=http://localhost:3000
PORT=4000
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Set up the database

```bash
cd backend
npm run db:migrate      # run migrations
npm run db:generate     # generate Prisma client
```

### 4. Start the dev servers

```bash
# Backend (runs on :4000)
cd backend && npm run dev

# Frontend (runs on :3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Campaign File Format

Uploaded CSV or Excel files must include at minimum these columns (case-insensitive):

**Email campaigns:**

| Column | Accepted names |
|---|---|
| Name | `name`, `full name`, `fullname`, `contact name` |
| Email | `email`, `email address`, `e-mail` |

**SMS campaigns:**

| Column | Accepted names |
|---|---|
| Name | `name`, `full name`, `fullname`, `contact name` |
| Phone | `phone`, `phone number`, `mobile`, `whatsapp` |

Phone numbers should be in E.164 format (e.g. `+15550001234`). US numbers without a country code are accepted.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard stats |
| GET/POST | `/api/leads` | List / create leads |
| GET/PATCH/DELETE | `/api/leads/:id` | Lead detail |
| POST | `/api/campaigns/parse-file` | Upload & parse recipient file |
| POST | `/api/campaigns/validate-emails` | Validate parsed emails |
| POST | `/api/campaigns/validate-phones` | Validate parsed phones |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/:id/send` | Enqueue campaign send |
| GET | `/api/campaigns/:id/progress` | Poll send progress |
| GET | `/api/campaigns/:id/recipients` | List recipients |
| GET | `/api/campaigns/:id/export-failed` | Download failed recipients CSV |
| GET/POST | `/api/templates/email` | List / create email templates |
| GET/PUT/DELETE | `/api/templates/email/:id` | Email template detail |
| GET/POST | `/api/templates/sms` | List / create SMS templates |
| GET/PUT/DELETE | `/api/templates/sms/:id` | SMS template detail |

## Deployment

### Backend (Fly.io)

```bash
cd backend
fly deploy
```

Set secrets on Fly:

```bash
fly secrets set DATABASE_URL="..." REDIS_URL="..." RESEND_API_KEY="..." \
  TWILIO_ACCOUNT_SID="..." TWILIO_AUTH_TOKEN="..." TWILIO_FROM_NUMBER="..."
```

### Frontend (Vercel)

Connect the `frontend/` directory to a Vercel project and set:

```
NEXT_PUBLIC_API_URL=https://<your-fly-backend>.fly.dev
```

## Data Models

- **Lead** — contact captured from landing page or added manually
- **Campaign** — a bulk send job (EMAIL or SMS) linked to a template
- **CampaignRecipient** — individual send record with status and error message
- **EmailTemplate** — HTML/text email with subject line
- **SMSTemplate** — SMS message body
