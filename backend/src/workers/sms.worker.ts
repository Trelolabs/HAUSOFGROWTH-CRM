import { smsQueue } from '../queues/sms.queue'
import { twilioClient } from '../config/twilio'
import { prisma } from '../config/db'
import { env } from '../config/env'
import { CampaignStatus, RecipientStatus } from '../types/prisma'

interface SmsRecipient {
  recipientId: string
  name: string
  phone: string
  content: string
}

interface SmsJobData {
  campaignId: string
  recipients: SmsRecipient[]
}

smsQueue.process(5, async (job) => {
  const { campaignId, recipients } = job.data as SmsJobData

  // Twilio has no batch API — send concurrently, collect results
  const results = await Promise.allSettled(
    recipients.map((r) =>
      twilioClient.messages.create({
        to: r.phone,
        from: env.TWILIO_PHONE_NUMBER,
        body: r.content.replace(/\{\{name\}\}/gi, r.name),
      })
    )
  )

  let sentCount = 0
  let failedCount = 0
  const now = new Date()

  await Promise.all(
    results.map(async (result, i) => {
      const r = recipients[i]!
      if (result.status === 'fulfilled') {
        sentCount++
        await prisma.campaignRecipient.update({
          where: { id: r.recipientId },
          data: { status: RecipientStatus.SENT, sentAt: now },
        })
      } else {
        failedCount++
        const reason =
          result.reason instanceof Error ? result.reason.message : 'Twilio send failed'
        await prisma.campaignRecipient.update({
          where: { id: r.recipientId },
          data: { status: RecipientStatus.FAILED, errorMessage: reason },
        })
      }
    })
  )

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sentCount },
      failedCount: { increment: failedCount },
    },
  })

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

  return { sentCount, failedCount }
})

smsQueue.on('failed', (job, err) => {
  console.error(`[smsQueue] Job ${job.id} failed after all retries:`, err.message)
})
