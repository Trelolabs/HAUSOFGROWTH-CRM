import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { successResponse } from '../utils/ApiResponse'

const attachmentSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.enum(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'File must be under 10MB'),
  content: z.string().min(1),
})

const emailTemplateBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  bodyType: z.enum(['HTML', 'TEXT']).default('HTML'),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  previewText: z.string().optional(),
  attachments: z.array(attachmentSchema).max(5, 'Max 5 attachments').optional(),
})

const emailTemplateSchema = emailTemplateBaseSchema.refine(
  (d) => (d.bodyType === 'HTML' ? !!d.htmlContent?.trim() : !!d.textContent?.trim()),
  (d) => ({
    message: d.bodyType === 'HTML' ? 'HTML content is required' : 'Text content is required',
    path: d.bodyType === 'HTML' ? ['htmlContent'] : ['textContent'],
  })
)

const smsTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required').max(1600, 'SMS content too long'),
})

// ── Email Templates ──────────────────────────────────────────────────────────

export const getEmailTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(successResponse(templates))
})

export const createEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const body = emailTemplateSchema.parse(req.body)
  const template = await prisma.emailTemplate.create({ data: body })
  res.status(201).json(successResponse(template))
})

export const updateEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const body = emailTemplateBaseSchema.partial().parse(req.body)

  const exists = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('Email template not found')

  const template = await prisma.emailTemplate.update({ where: { id }, data: body })
  res.json(successResponse(template))
})

export const deleteEmailTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const exists = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('Email template not found')

  await prisma.emailTemplate.delete({ where: { id } })
  res.json(successResponse({ id }))
})

// ── SMS Templates ─────────────────────────────────────────────────────────────

export const getSMSTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await prisma.sMSTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(successResponse(templates))
})

export const createSMSTemplate = asyncHandler(async (req: Request, res: Response) => {
  const body = smsTemplateSchema.parse(req.body)
  const template = await prisma.sMSTemplate.create({ data: body })
  res.status(201).json(successResponse(template))
})

export const updateSMSTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const body = smsTemplateSchema.partial().parse(req.body)

  const exists = await prisma.sMSTemplate.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('SMS template not found')

  const template = await prisma.sMSTemplate.update({ where: { id }, data: body })
  res.json(successResponse(template))
})

export const deleteSMSTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const exists = await prisma.sMSTemplate.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('SMS template not found')

  await prisma.sMSTemplate.delete({ where: { id } })
  res.json(successResponse({ id }))
})
