// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeadSource = "LANDING_PAGE" | "MANUAL" | "IMPORT"
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST"
export type CampaignType = "EMAIL" | "SMS"
export type CampaignStatus =
  | "DRAFT"
  | "VALIDATING"
  | "QUEUED"
  | "SENDING"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED"
export type RecipientStatus = "PENDING" | "SENT" | "FAILED" | "BOUNCED" | "SKIPPED"
export type EmailBodyType = "HTML" | "TEXT"

// ─── Models ───────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  fullName: string
  email?: string | null
  whatsappNumber?: string | null
  businessName?: string | null
  website?: string | null
  interestedIn: string[]
  message?: string | null
  source: LeadSource
  status: LeadStatus
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  templateId?: string | null
  totalCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  completedAt?: string | null
}

export interface CampaignRecipient {
  id: string
  campaignId: string
  leadId?: string | null
  name: string
  email?: string | null
  phone?: string | null
  status: RecipientStatus
  errorMessage?: string | null
  sentAt?: string | null
  createdAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyType: EmailBodyType
  htmlContent?: string | null
  textContent?: string | null
  previewText?: string | null
  createdAt: string
  updatedAt: string
}

export interface SMSTemplate {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  totalCampaigns: number
  activeCampaigns: number
  emailsSent: number
  smsSent: number
  conversionRate: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface CampaignChartData {
  date: string
  email: number
  sms: number
}

// ─── File parse / validate ────────────────────────────────────────────────────

export interface ParseFileResult {
  sessionId: string
  total: number
  preview: Array<{ name: string; email?: string; phone?: string }>
}

export interface ValidateEmailsResult {
  valid: string[]
  invalid: string[]
  risky: string[]
  counts: { valid: number; invalid: number; risky: number }
}

export interface ValidatePhonesResult {
  valid: string[]
  invalid: string[]
  counts: { valid: number; invalid: number }
}

// ─── Campaign progress ────────────────────────────────────────────────────────

export interface CampaignProgress {
  id: string
  status: CampaignStatus
  totalCount: number
  sentCount: number
  failedCount: number
  percentage: number
}

// ─── Form payloads ────────────────────────────────────────────────────────────

export interface CreateLeadPayload {
  fullName: string
  email?: string
  whatsappNumber?: string
  businessName?: string
  website?: string
  interestedIn?: string[]
  message?: string
  source?: LeadSource
  status?: LeadStatus
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {}

export interface CreateEmailTemplatePayload {
  name: string
  subject: string
  bodyType: EmailBodyType
  htmlContent?: string
  textContent?: string
  previewText?: string
}

export interface UpdateEmailTemplatePayload extends Partial<CreateEmailTemplatePayload> {}

export interface CreateSMSTemplatePayload {
  name: string
  content: string
}

export interface UpdateSMSTemplatePayload extends Partial<CreateSMSTemplatePayload> {}

export interface CreateCampaignPayload {
  name: string
  type: CampaignType
  templateId?: string
  sessionId: string
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface LeadQueryParams {
  page?: number
  limit?: number
  status?: LeadStatus
  source?: LeadSource
  search?: string
}

export interface CampaignQueryParams {
  page?: number
  limit?: number
  type?: CampaignType
  status?: CampaignStatus
}

export interface RecipientQueryParams {
  page?: number
  limit?: number
  status?: RecipientStatus
}
