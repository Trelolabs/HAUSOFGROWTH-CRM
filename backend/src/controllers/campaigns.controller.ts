import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { successResponse, paginationMeta } from '../utils/ApiResponse'
import { emailQueue } from '../queues/email.queue'
import { smsQueue } from '../queues/sms.queue'
import { parseFile, getSession } from '../services/fileParser.service'
import { validateEmails } from '../services/emailValidator.service'
import { validatePhones } from '../services/phoneValidator.service'
import { Prisma, CampaignStatus, CampaignType, RecipientStatus } from '../types/prisma'

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  type: z.nativeEnum(CampaignType),
})

const sendCampaignSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  templateId: z.string().min(1, 'Template ID is required'),
})

const JOB_BATCH_SIZE = 100

// ── List / Get ────────────────────────────────────────────────────────────────

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1')))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'))))
  const skip = (page - 1) * limit
  const type = req.query['type'] as CampaignType | undefined
  const status = req.query['status'] as CampaignStatus | undefined

  const where = {
    ...(type && { type }),
    ...(status && { status }),
  }

  const [total, data] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json(successResponse(data, paginationMeta(total, page, limit)))
})

export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw ApiError.notFound('Campaign not found')

  res.json(successResponse(campaign))
})

export const getCampaignProgress = asyncHandler(async (req: Request, res: Response) => {
  // Fast read — only 4 scalar fields, no joins
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { sentCount: true, failedCount: true, totalCount: true, status: true },
  })

  if (!campaign) throw ApiError.notFound('Campaign not found')

  const processed = campaign.sentCount + campaign.failedCount
  const percentage = campaign.totalCount === 0
    ? 0
    : Math.round((processed / campaign.totalCount) * 100)

  res.json(successResponse({ ...campaign, percentage }))
})

export const getCampaignRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1')))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'))))
  const skip = (page - 1) * limit
  const status = req.query['status'] as RecipientStatus | undefined

  const where = { campaignId: id, ...(status && { status }) }

  const [total, data] = await Promise.all([
    prisma.campaignRecipient.count({ where }),
    prisma.campaignRecipient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json(successResponse(data, paginationMeta(total, page, limit)))
})

// ── Create ────────────────────────────────────────────────────────────────────

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const body = createCampaignSchema.parse(req.body)
  const campaign = await prisma.campaign.create({ data: body })
  res.status(201).json(successResponse(campaign))
})

// ── Send ──────────────────────────────────────────────────────────────────────

export const sendCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const { sessionId, templateId } = sendCampaignSchema.parse(req.body)

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw ApiError.notFound('Campaign not found')
  if (campaign.status !== CampaignStatus.DRAFT) {
    throw ApiError.badRequest(`Campaign must be DRAFT to send, currently: ${campaign.status}`)
  }

  // Fetch the template and resolve content
  let subject = ''
  let bodyType: 'HTML' | 'TEXT' = 'HTML'
  let htmlContent: string | null = null
  let textContent: string | null = null
  let smsContent = ''
  let attachments: { filename: string; content: string }[] | undefined

  if (campaign.type === CampaignType.EMAIL) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
    if (!template) throw ApiError.notFound('Email template not found')
    subject = template.subject
    bodyType = template.bodyType as 'HTML' | 'TEXT'
    htmlContent = template.htmlContent ?? null
    textContent = template.textContent ?? null
    const rawAttachments = template.attachments as { filename: string; content: string }[] | null
    attachments = rawAttachments?.length
      ? rawAttachments.map((a) => ({ filename: a.filename, content: a.content }))
      : undefined
  } else {
    const template = await prisma.sMSTemplate.findUnique({ where: { id: templateId } })
    if (!template) throw ApiError.notFound('SMS template not found')
    smsContent = template.content
  }

  // Read validated recipients from Redis session
  const rows = await getSession(sessionId)
  if (!rows || rows.length === 0) {
    throw ApiError.badRequest('Session not found, expired, or contains no valid recipients')
  }

  // Persist recipients + update campaign in one transaction
  const recipientRecords = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.campaign.update({
      where: { id },
      data: {
        templateId,
        totalCount: rows.length,
        status: CampaignStatus.SENDING,
      },
    })

    return tx.campaignRecipient.createManyAndReturn({
      data: rows.map((r) => ({
        campaignId: id,
        name: r.name,
        email: r.email ?? null,
        phone: r.phone ?? null,
        status: RecipientStatus.PENDING,
      })),
    })
  })

  // Enqueue in batches of 100 (never Promise.all bulk — always queue)
  for (let i = 0; i < recipientRecords.length; i += JOB_BATCH_SIZE) {
    const batch = recipientRecords.slice(i, i + JOB_BATCH_SIZE)

    if (campaign.type === CampaignType.EMAIL) {
      await emailQueue.add({
        campaignId: id,
        recipients: batch.map((r) => ({
          recipientId: r.id,
          name: r.name,
          email: r.email!,
          subject,
          bodyType,
          htmlContent: htmlContent ?? undefined,
          textContent: textContent ?? undefined,
        })),
        attachments,
      })
    } else {
      await smsQueue.add({
        campaignId: id,
        recipients: batch.map((r) => ({
          recipientId: r.id,
          name: r.name,
          phone: r.phone!,
          content: smsContent,
        })),
      })
    }
  }

  // Return 202 immediately — queue handles the rest
  res.status(202).json(
    successResponse({
      campaignId: id,
      status: CampaignStatus.SENDING,
      totalRecipients: rows.length,
      jobsEnqueued: Math.ceil(rows.length / JOB_BATCH_SIZE),
    })
  )
})

// ── Export failed as CSV stream ────────────────────────────────────────────────

export const exportFailedRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { type: true, name: true },
  })
  if (!campaign) throw ApiError.notFound('Campaign not found')

  const safeName = campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="failed-${safeName}.csv"`)

  const isEmail = campaign.type === CampaignType.EMAIL
  res.write(isEmail ? 'Name,Email,Error\n' : 'Name,Phone,Error\n')

  const PAGE = 500
  let skip = 0

  while (true) {
    const batch = await prisma.campaignRecipient.findMany({
      where: {
        campaignId: id,
        status: { in: [RecipientStatus.FAILED, RecipientStatus.BOUNCED] },
      },
      select: { name: true, email: true, phone: true, errorMessage: true },
      skip,
      take: PAGE,
      orderBy: { createdAt: 'asc' },
    })

    if (batch.length === 0) break

    for (const r of batch) {
      const contact = isEmail ? (r.email ?? '') : (r.phone ?? '')
      const err = (r.errorMessage ?? '').replace(/"/g, '""')
      res.write(`"${r.name}","${contact}","${err}"\n`)
    }

    if (batch.length < PAGE) break
    skip += PAGE
  }

  res.end()
})

// ── File parsing + validation ─────────────────────────────────────────────────

export const parseUploadedFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded')

  const type = req.body.type as string
  console.log('type', type)
  console.log('req.file', req.file)
  if (type !== 'email' && type !== 'sms') {
    throw ApiError.badRequest('Query param "type" must be "email" or "sms"')
  }

  const result = await parseFile(req.file.path, type)
  res.json(successResponse(result))
})

export const validateEmailsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body)
  const result = await validateEmails(sessionId)
  res.json(successResponse(result))
})

export const validatePhonesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body)
  const result = await validatePhones(sessionId)
  res.json(successResponse(result))
})
