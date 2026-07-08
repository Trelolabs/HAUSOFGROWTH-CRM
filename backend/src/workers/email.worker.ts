import { emailQueue } from '../queues/email.queue'
import { resendClient } from '../config/resend'
import { prisma } from '../config/db'
import { env } from '../config/env'
import { CampaignStatus, RecipientStatus } from '../types/prisma'

interface EmailRecipient {
  recipientId: string
  name: string
  email: string
  subject: string
  bodyType: 'HTML' | 'TEXT'
  htmlContent?: string
  textContent?: string
}

interface EmailAttachment {
  filename: string
  content: string
}

interface EmailJobData {
  campaignId: string
  recipients: EmailRecipient[]
  attachments?: EmailAttachment[]
}

// Turn any thrown value into a short, human-readable reason for the UI.
// Internal ORM / connection-pool errors must never be shown to end users —
// they are infrastructure problems, not a reason the email itself failed.
function toRecipientError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Send failed')
  if (/prisma\.|invocation|connection pool|timed out|ECONN|socket/i.test(raw)) {
    return 'Temporary sending error'
  }
  return raw.length > 300 ? `${raw.slice(0, 300)}…` : raw
}

interface SentRecipient {
  recipientId: string
  // Resend's email_id, stored so webhooks can be matched to this exact row.
  providerMessageId: string | null
}

// Persist per-recipient outcomes using grouped updateMany calls instead of one
// query per recipient. A batch of 100 becomes a handful of statements, so it
// never exhausts the pooled DB connection (connection_limit=3) — which is what
// previously timed out and falsely flipped SENT emails to FAILED.
async function persistOutcomes(
  sent: SentRecipient[],
  failed: { id: string; reason: string }[],
  sentAt: Date
): Promise<void> {
  if (sent.length) {
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: sent.map((s) => s.recipientId) } },
      data: { status: RecipientStatus.SENT, sentAt },
    })

    // Backfill the per-row Resend id in a SINGLE statement via unnest() so we
    // stay pool-safe (updateMany can't set a different value per row).
    const withId = sent.filter((s) => s.providerMessageId)
    if (withId.length) {
      const ids = withId.map((s) => s.recipientId)
      const mids = withId.map((s) => s.providerMessageId!)
      await prisma.$executeRaw`
        UPDATE "CampaignRecipient" AS c
        SET "providerMessageId" = d.mid
        FROM (
          SELECT unnest(${ids}::text[]) AS id, unnest(${mids}::text[]) AS mid
        ) AS d
        WHERE c.id = d.id
      `
    }
  }

  // Group failures by reason → one updateMany per distinct reason.
  const byReason = new Map<string, string[]>()
  for (const f of failed) {
    const ids = byReason.get(f.reason) ?? []
    ids.push(f.id)
    byReason.set(f.reason, ids)
  }
  for (const [reason, ids] of byReason) {
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: ids } },
      data: { status: RecipientStatus.FAILED, errorMessage: reason },
    })
  }
}

emailQueue.process(5, async (job) => {
  const { campaignId, recipients, attachments } = job.data as EmailJobData

  const batchPayload = recipients.map((r) => ({
    from: `Haus of Growth <${env.RESEND_FROM_EMAIL}>`,
    to: [r.email],
    subject: r.subject,
    ...(r.bodyType === 'HTML'
      ? { html: r.htmlContent!.replace(/\{\{name\}\}/gi, r.name) }
      : { text: r.textContent!.replace(/\{\{name\}\}/gi, r.name) }),
    ...(attachments?.length ? { attachments } : {}),
  }))

  const now = new Date()
  let batchError: string | null = null

  // Resolve the outcome of every recipient PURELY from the provider response
  // first, then persist once. Persistence errors must never be able to
  // reclassify an email that Resend already accepted as "failed".
  const sent: SentRecipient[] = []
  const failed: { id: string; reason: string }[] = []

  // ponytail: Resend's batch API silently drops attachments, so attachment
  // campaigns fall back to per-recipient sends instead of one batch call.
  if (attachments?.length) {
    await Promise.all(
      recipients.map(async (r, i) => {
        try {
          const result = await resendClient.emails.send(batchPayload[i])
          if (result.error) throw new Error(result.error.message)
          sent.push({ recipientId: r.recipientId, providerMessageId: result.data?.id ?? null })
        } catch (err) {
          failed.push({ id: r.recipientId, reason: toRecipientError(err) })
        }
      })
    )
  } else {
    try {
      // batchResult.data is CreateBatchSuccessResponse | null
      // CreateBatchSuccessResponse.data is the actual array of { id: string }
      const batchResult = await resendClient.batch.send(batchPayload)
      if (batchResult.error) throw new Error(batchResult.error.message)

      const confirmedIds = batchResult.data?.data ?? []
      recipients.forEach((r, i) => {
        const messageId = confirmedIds[i]?.id
        if (messageId) sent.push({ recipientId: r.recipientId, providerMessageId: messageId })
        else failed.push({ id: r.recipientId, reason: 'Not confirmed by Resend' })
      })
    } catch (err) {
      // The whole batch was rejected by Resend — a genuine send failure.
      batchError = toRecipientError(err)
      for (const r of recipients) failed.push({ id: r.recipientId, reason: batchError })
    }
  }

  const sentCount = sent.length
  const failedCount = failed.length

  // Persist outcomes with pool-safe grouped writes. If this throws (e.g. a
  // transient pool timeout), we log and rethrow so Bull retries the job —
  // recipients keep their prior status instead of being falsely failed.
  await persistOutcomes(sent, failed, now)

  // Atomically increment campaign counters
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sentCount },
      failedCount: { increment: failedCount },
    },
  })

  // Mark campaign complete if all recipients are processed
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { sentCount: true, failedCount: true, totalCount: true },
  })

  if (campaign && campaign.sentCount + campaign.failedCount >= campaign.totalCount) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
    })
  }

  return { sentCount, failedCount, batchError }
})

emailQueue.on('failed', (job, err) => {
  console.error(`[emailQueue] Job ${job.id} failed after all retries:`, err.message)
})
