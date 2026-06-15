import { Request, Response } from 'express'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { successResponse } from '../utils/ApiResponse'
import { CampaignStatus, CampaignType } from '../types/prisma'

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    totalLeads,
    leadsThisMonth,
    leadsLastMonth,
    emailCampaigns,
    smsCampaigns,
    activeCampaigns,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.lead.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    prisma.campaign.findMany({
      where: { type: CampaignType.EMAIL },
      select: { sentCount: true, failedCount: true, totalCount: true },
    }),
    prisma.campaign.findMany({
      where: { type: CampaignType.SMS },
      select: { sentCount: true, failedCount: true, totalCount: true },
    }),
    prisma.campaign.count({
      where: { status: { in: [CampaignStatus.SENDING, CampaignStatus.QUEUED] } },
    }),
  ])

  const leadsGrowth =
    leadsLastMonth === 0
      ? 100
      : Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)

  const emailsSent = emailCampaigns.reduce((s, c) => s + c.sentCount, 0)
  const emailTotal = emailCampaigns.reduce((s, c) => s + c.totalCount, 0)
  const emailDeliveryRate =
    emailTotal === 0 ? 0 : Math.round((emailsSent / emailTotal) * 100)

  const smsSent = smsCampaigns.reduce((s, c) => s + c.sentCount, 0)
  const smsTotal = smsCampaigns.reduce((s, c) => s + c.totalCount, 0)
  const smsDeliveryRate = smsTotal === 0 ? 0 : Math.round((smsSent / smsTotal) * 100)

  res.json(
    successResponse({
      totalLeads,
      leadsThisMonth,
      leadsGrowth,
      emailsSent,
      emailDeliveryRate,
      smsSent,
      smsDeliveryRate,
      activeCampaigns,
    })
  )
})

export const getCampaignChart = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(7, parseInt(String(req.query['days'] ?? '30'))))
  const since = new Date()
  since.setDate(since.getDate() - days)

  const campaigns = await prisma.campaign.findMany({
    where: {
      createdAt: { gte: since },
      status: CampaignStatus.COMPLETED,
    },
    select: { type: true, sentCount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Group by date string + type
  const grouped: Record<string, { date: string; email: number; sms: number }> = {}

  for (const c of campaigns) {
    const date = c.createdAt.toISOString().split('T')[0]!
    if (!grouped[date]) grouped[date] = { date, email: 0, sms: 0 }
    if (c.type === CampaignType.EMAIL) grouped[date]!.email += c.sentCount
    else grouped[date]!.sms += c.sentCount
  }

  res.json(successResponse(Object.values(grouped)))
})

export const getLeadsChart = asyncHandler(async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    select: { interestedIn: true },
  })

  const counts: Record<string, number> = {}
  for (const lead of leads) {
    for (const tag of lead.interestedIn) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }

  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  res.json(successResponse(data))
})
