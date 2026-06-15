import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { successResponse, paginationMeta } from '../utils/ApiResponse'
import { LeadSource, LeadStatus } from '../types/prisma'

const createLeadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
  whatsappNumber: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  interestedIn: z.array(z.string()).default([]),
  message: z.string().optional(),
  source: z.nativeEnum(LeadSource).default(LeadSource.MANUAL),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
})

const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsappNumber: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  interestedIn: z.array(z.string()).optional(),
  message: z.string().optional(),
})

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1')))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'))))
  const skip = (page - 1) * limit
  const status = req.query['status'] as LeadStatus | undefined
  const source = req.query['source'] as LeadSource | undefined
  const search = req.query['search'] as string | undefined

  const where = {
    ...(status && { status }),
    ...(source && { source }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { businessName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [total, data] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json(successResponse(data, paginationMeta(total, page, limit)))
})

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const body = createLeadSchema.parse(req.body)
  const lead = await prisma.lead.create({ data: body })
  res.status(201).json(successResponse(lead))
})

export const getLeadById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      recipients: {
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!lead) throw ApiError.notFound('Lead not found')

  res.json(successResponse(lead))
})

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const body = updateLeadSchema.parse(req.body)

  const exists = await prisma.lead.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('Lead not found')

  const lead = await prisma.lead.update({ where: { id }, data: body })
  res.json(successResponse(lead))
})

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  const exists = await prisma.lead.findUnique({ where: { id } })
  if (!exists) throw ApiError.notFound('Lead not found')

  await prisma.lead.delete({ where: { id } })
  res.json(successResponse({ id }))
})
