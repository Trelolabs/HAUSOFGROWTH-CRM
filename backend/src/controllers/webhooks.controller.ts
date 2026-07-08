import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { RecipientStatus } from '../types/prisma'

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

export const resendWebhook = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true })

  try {
    const { type, data } = req.body as {
      type: string
      data?: { email_id?: string; to?: string[] }
    }

    if (!data?.email_id) return

    const statusMap: Record<string, RecipientStatus> = {
      'email.bounced': RecipientStatus.BOUNCED,
      'email.complained': RecipientStatus.FAILED,
      'email.delivery_delayed': RecipientStatus.FAILED,
    }

    const newStatus = statusMap[type]
    if (!newStatus) return

    const email = data.to?.[0]
    if (!email) return

    // Only transition rows that are still SENT — this also makes the webhook
    // idempotent (a duplicate event finds nothing left to move, so counters
    // are never double-adjusted).
    const affected = await prisma.campaignRecipient.findMany({
      where: { email, status: RecipientStatus.SENT },
      select: { id: true, campaignId: true },
    })
    if (affected.length === 0) return

    // How many recipients transitioned per campaign, so we can keep the
    // campaign's aggregate counters in sync with the per-recipient statuses.
    const perCampaign = new Map<string, number>()
    for (const r of affected) {
      perCampaign.set(r.campaignId, (perCampaign.get(r.campaignId) ?? 0) + 1)
    }

    const ids = affected.map((r) => r.id)

    await prisma.$transaction([
      prisma.campaignRecipient.updateMany({
        where: { id: { in: ids } },
        data: { status: newStatus, errorMessage: `Resend event: ${type}` },
      }),
      // A bounced/complained recipient was previously counted as SENT, so move
      // it out of sentCount and into the matching bucket.
      ...[...perCampaign.entries()].map(([campaignId, count]) =>
        prisma.campaign.update({
          where: { id: campaignId },
          data:
            newStatus === RecipientStatus.BOUNCED
              ? { sentCount: { decrement: count }, bouncedCount: { increment: count } }
              : { sentCount: { decrement: count }, failedCount: { increment: count } },
        })
      ),
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
