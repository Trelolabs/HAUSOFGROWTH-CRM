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

  let sentCount = 0
  let failedCount = 0
  const now = new Date()
  let batchError: string | null = null

  // ponytail: Resend's batch API silently drops attachments, so attachment
  // campaigns fall back to per-recipient sends instead of one batch call.
  if (attachments?.length) {
    await Promise.all(
      recipients.map(async (r, i) => {
        try {
          const result = await resendClient.emails.send(batchPayload[i])
          if (result.error) throw new Error(result.error.message)
          sentCount++
          await prisma.campaignRecipient.update({
            where: { id: r.recipientId },
            data: { status: RecipientStatus.SENT, sentAt: now },
          })
        } catch (err) {
          failedCount++
          await prisma.campaignRecipient.update({
            where: { id: r.recipientId },
            data: {
              status: RecipientStatus.FAILED,
              errorMessage: err instanceof Error ? err.message : 'Send failed',
            },
          })
        }
      })
    )
  } else {
    try {
      // batchResult.data is CreateBatchSuccessResponse | null
      // CreateBatchSuccessResponse.data is the actual array of { id: string }
      const batchResult = await resendClient.batch.send(batchPayload)

      if (batchResult.error) {
        throw new Error(batchResult.error.message)
      }

      const confirmedIds = batchResult.data?.data ?? []

      await Promise.all(
        recipients.map(async (r, i) => {
          if (confirmedIds[i]?.id) {
            sentCount++
            await prisma.campaignRecipient.update({
              where: { id: r.recipientId },
              data: { status: RecipientStatus.SENT, sentAt: now },
            })
          } else {
            failedCount++
            await prisma.campaignRecipient.update({
              where: { id: r.recipientId },
              data: { status: RecipientStatus.FAILED, errorMessage: 'Not confirmed by Resend' },
            })
          }
        })
      )
    } catch (err) {
      batchError = err instanceof Error ? err.message : 'Batch send failed'
      failedCount = recipients.length

      await Promise.all(
        recipients.map((r) =>
          prisma.campaignRecipient.update({
            where: { id: r.recipientId },
            data: { status: RecipientStatus.FAILED, errorMessage: batchError! },
          })
        )
      )
    }
  }

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
