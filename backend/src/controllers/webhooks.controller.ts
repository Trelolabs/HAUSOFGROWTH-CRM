import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { RecipientStatus } from '../types/prisma'
import { env } from '../config/env'
import { verifySvixSignature } from '../utils/svix'

const inboundLeadSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  whatsappNumber: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  interestedIn: z.array(z.string()).default([]),
  message: z.string().optional(),
})

export const inboundLead = asyncHandler(async (req: Request, res: Response) => {
  // Always return 200 immediately — never timeout the landing page
  res.status(200).json({ success: true })

  try {
    const body = inboundLeadSchema.parse(req.body)
    await prisma.lead.create({
      data: {
        ...body,
        source: 'LANDING_PAGE',
        status: 'NEW',
      },
    })
  } catch (err) {
    // Log but swallow — webhook must never throw back to caller
    console.error('[webhook/lead] Failed to save lead:', err)
  }
})

// Maps a terminal RecipientStatus to the Campaign aggregate counter it belongs
// to. PENDING / SKIPPED are not tracked by any of the three counters.
const STATUS_COUNTER: Partial<Record<RecipientStatus, 'sentCount' | 'failedCount' | 'bouncedCount'>> = {
  [RecipientStatus.SENT]: 'sentCount',
  [RecipientStatus.FAILED]: 'failedCount',
  [RecipientStatus.BOUNCED]: 'bouncedCount',
}

// Each Resend event we care about resolves to a target status plus the set of
// source statuses it is allowed to overwrite. This is what makes the handler
// tolerant of out-of-order / retried webhooks:
//
//  - `email.bounced` is authoritative and self-heals rows that an earlier,
//    non-terminal event (e.g. a delivery delay) had wrongly moved to FAILED.
//  - `email.delivered` corrects a row that was wrongly marked FAILED after a
//    transient delay, flipping it back to SENT.
//  - `email.complained` only applies to a delivered (SENT) row.
//  - `email.delivery_delayed` is TRANSIENT and intentionally absent here — it
//    must never change a recipient's terminal status (this was the original
//    bug: delayed mails were flipped to FAILED and could never recover to the
//    BOUNCED/SENT state Resend ultimately reported).
const EVENT_RULES: Record<
  string,
  { target: RecipientStatus; from: RecipientStatus[] }
> = {
  'email.bounced': {
    target: RecipientStatus.BOUNCED,
    from: [RecipientStatus.SENT, RecipientStatus.FAILED],
  },
  'email.delivered': {
    target: RecipientStatus.SENT,
    from: [RecipientStatus.FAILED],
  },
  'email.complained': {
    target: RecipientStatus.FAILED,
    from: [RecipientStatus.SENT],
  },
}

export const resendWebhook = asyncHandler(async (req: Request, res: Response) => {
  // When a signing secret is configured, reject anything we can't verify
  // BEFORE acknowledging — an unauthenticated caller must not be able to
  // reclassify recipients. If no secret is set we stay backwards-compatible.
  if (env.RESEND_WEBHOOK_SECRET) {
    const ok = verifySvixSignature({
      secret: env.RESEND_WEBHOOK_SECRET,
      rawBody: (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '',
      headers: {
        id: req.headers['svix-id'],
        timestamp: req.headers['svix-timestamp'],
        signature: req.headers['svix-signature'],
      },
    })
    if (!ok) {
      res.status(401).json({ success: false, message: 'Invalid signature' })
      return
    }
  }

  res.status(200).json({ success: true })

  try {
    const { type, data } = req.body as {
      type: string
      data?: { email_id?: string; to?: string[] }
    }

    // Transient / unhandled events (e.g. email.delivery_delayed, email.sent,
    // email.opened) must not touch recipient status or counters.
    const rule = EVENT_RULES[type]
    if (!rule) return

    const emailId = data?.email_id
    const email = data?.to?.[0]
    if (!emailId && !email) return

    // Only rows not already at the target status can move — this keeps the
    // handler idempotent for duplicate deliveries. We read the CURRENT status
    // of each so counters can be adjusted from wherever the row actually is:
    // this is what lets a late `email.bounced` correct a row that a delay event
    // had already pushed into FAILED.
    const statusFilter = { in: rule.from.filter((s) => s !== rule.target) }

    // Prefer matching by Resend's email_id — it points to the exact recipient
    // row, avoiding the ambiguity of the same address across campaigns/re-sends.
    let affected = emailId
      ? await prisma.campaignRecipient.findMany({
          where: { providerMessageId: emailId, status: statusFilter },
          select: { id: true, campaignId: true, status: true },
        })
      : []

    // Fallback for legacy rows sent before providerMessageId was captured.
    // Scoped to rows WITHOUT an id so we never mis-hit a row that should have
    // been matched by email_id above.
    if (affected.length === 0 && email) {
      affected = await prisma.campaignRecipient.findMany({
        where: { email, providerMessageId: null, status: statusFilter },
        select: { id: true, campaignId: true, status: true },
      })
    }
    if (affected.length === 0) return

    // Per campaign, tally how many rows leave each source bucket so we can
    // decrement the right counters and increment the target one.
    type Delta = { sent: number; failed: number; bounced: number }
    const perCampaign = new Map<string, Delta>()
    const bump = (id: string): Delta => {
      let d = perCampaign.get(id)
      if (!d) {
        d = { sent: 0, failed: 0, bounced: 0 }
        perCampaign.set(id, d)
      }
      return d
    }

    for (const r of affected) {
      const d = bump(r.campaignId)
      const counter = STATUS_COUNTER[r.status]
      if (counter === 'sentCount') d.sent += 1
      else if (counter === 'failedCount') d.failed += 1
      else if (counter === 'bouncedCount') d.bounced += 1
    }

    const ids = affected.map((r) => r.id)
    const targetCounter = STATUS_COUNTER[rule.target]

    await prisma.$transaction([
      prisma.campaignRecipient.updateMany({
        where: { id: { in: ids } },
        data: {
          status: rule.target,
          errorMessage:
            rule.target === RecipientStatus.SENT ? null : `Resend event: ${type}`,
        },
      }),
      ...[...perCampaign.entries()].map(([campaignId, d]) => {
        const moved = d.sent + d.failed + d.bounced
        return prisma.campaign.update({
          where: { id: campaignId },
          data: {
            // Remove each row from its former bucket…
            ...(d.sent ? { sentCount: { decrement: d.sent } } : {}),
            ...(d.failed ? { failedCount: { decrement: d.failed } } : {}),
            ...(d.bounced ? { bouncedCount: { decrement: d.bounced } } : {}),
            // …and add the whole batch into the target bucket.
            ...(targetCounter === 'sentCount' ? { sentCount: { increment: moved } } : {}),
            ...(targetCounter === 'failedCount' ? { failedCount: { increment: moved } } : {}),
            ...(targetCounter === 'bouncedCount' ? { bouncedCount: { increment: moved } } : {}),
          },
        })
      }),
    ])
  } catch (err) {
    console.error('[webhook/resend]', err)
  }
})

export const twilioWebhook = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true })

  try {
    const { To, MessageStatus, ErrorMessage } = req.body as {
      To?: string
      MessageStatus?: string
      ErrorMessage?: string
    }

    if (!To || !MessageStatus) return

    const delivered = ['delivered', 'sent'].includes(MessageStatus)
    const failed = ['failed', 'undelivered'].includes(MessageStatus)

    if (!delivered && !failed) return

    await prisma.campaignRecipient.updateMany({
      where: { phone: To, status: RecipientStatus.PENDING },
      data: {
        status: delivered ? RecipientStatus.SENT : RecipientStatus.FAILED,
        ...(delivered && { sentAt: new Date() }),
        ...(ErrorMessage && { errorMessage: ErrorMessage }),
      },
    })
  } catch (err) {
    console.error('[webhook/twilio]', err)
  }
})
