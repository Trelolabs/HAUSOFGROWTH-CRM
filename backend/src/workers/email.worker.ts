import { emailQueue } from '../queues/email.queue'
import { resendClient } from '../config/resend'
import { prisma } from '../config/db'
import { env } from '../config/env'
import { CampaignStatus, RecipientStatus } from '@prisma/client'

interface EmailRecipient {
  recipientId: string
  name: string
  email: string
  subject: string
  htmlContent: string
}

interface EmailJobData {
  campaignId: string
  recipients: EmailRecipient[]
}

emailQueue.process(5, async (job) => {
  const { campaignId, recipients } = job.data as EmailJobData

  const batchPayload = recipients.map((r) => ({
    from: `Haus of Growth <${env.RESEND_FROM_EMAIL}>`,
    to: [r.email],
    subject: r.subject,
    html: r.htmlContent.replace(/\{\{name\}\}/gi, r.name),
  }))

  let sentCount = 0
  let failedCount = 0
  const now = new Date()
  let batchError: string | null = null

  try {
    const batchResult = await resendClient.batch.send(batchPayload)
    const sentEmails = new Set((batchResult.data ?? []).map((_, i) => i))

    await Promise.all(
      recipients.map(async (r, i) => {
        if (sentEmails.has(i)) {
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
