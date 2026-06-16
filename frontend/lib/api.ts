import type {
  Lead,
  Campaign,
  CampaignRecipient,
  EmailTemplate,
  SMSTemplate,
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  CampaignChartData,
  ChartDataPoint,
  ParseFileResult,
  ValidateEmailsResult,
  ValidatePhonesResult,
  CampaignProgress,
  CreateLeadPayload,
  UpdateLeadPayload,
  CreateEmailTemplatePayload,
  UpdateEmailTemplatePayload,
  CreateSMSTemplatePayload,
  UpdateSMSTemplatePayload,
  CreateCampaignPayload,
  LeadQueryParams,
  CampaignQueryParams,
  RecipientQueryParams,
} from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? "Something went wrong")
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return ""
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: LeadQueryParams) =>
    request<PaginatedResponse<Lead>>(`/api/leads${toQuery(params as Record<string, unknown>)}`),

  get: (id: string) =>
    request<ApiResponse<Lead>>(`/api/leads/${id}`),

  create: (payload: CreateLeadPayload) =>
    request<ApiResponse<Lead>>("/api/leads", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: UpdateLeadPayload) =>
    request<ApiResponse<Lead>>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  remove: (id: string) =>
    request<ApiResponse<null>>(`/api/leads/${id}`, { method: "DELETE" }),
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaignsApi = {
  list: (params?: CampaignQueryParams) =>
    request<PaginatedResponse<Campaign>>(`/api/campaigns${toQuery(params as Record<string, unknown>)}`),

  get: (id: string) =>
    request<ApiResponse<Campaign>>(`/api/campaigns/${id}`),

  create: (payload: CreateCampaignPayload) =>
    request<ApiResponse<Campaign>>("/api/campaigns", { method: "POST", body: JSON.stringify(payload) }),

  send: (id: string, body?: { sessionId: string; templateId: string }) =>
    request<ApiResponse<{ queued: boolean }>>(`/api/campaigns/${id}/send`, { method: "POST", body: JSON.stringify(body) }),

  progress: (id: string) =>
    request<ApiResponse<CampaignProgress>>(`/api/campaigns/${id}/progress`),

  recipients: (id: string, params?: RecipientQueryParams) =>
    request<PaginatedResponse<CampaignRecipient>>(`/api/campaigns/${id}/recipients${toQuery(params as Record<string, unknown>)}`),

  exportFailedUrl: (id: string) =>
    `${BASE_URL}/api/campaigns/${id}/export-failed`,

  parseFile: (file: File, type: "email" | "sms") => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    return fetch(`${BASE_URL}/api/campaigns/parse-file`, { method: "POST", body: fd })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message ?? "Something went wrong")
        }
        return res.json() as Promise<ApiResponse<ParseFileResult>>
      })
  },

  validateEmails: (sessionId: string) =>
    request<ApiResponse<ValidateEmailsResult>>("/api/campaigns/validate-emails", { method: "POST", body: JSON.stringify({ sessionId }) }),

  validatePhones: (sessionId: string) =>
    request<ApiResponse<ValidatePhonesResult>>("/api/campaigns/validate-phones", { method: "POST", body: JSON.stringify({ sessionId }) }),
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplatesApi = {
  list: () =>
    request<ApiResponse<EmailTemplate[]>>("/api/templates/email"),

  create: (payload: CreateEmailTemplatePayload) =>
    request<ApiResponse<EmailTemplate>>("/api/templates/email", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: UpdateEmailTemplatePayload) =>
    request<ApiResponse<EmailTemplate>>(`/api/templates/email/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  remove: (id: string) =>
    request<ApiResponse<null>>(`/api/templates/email/${id}`, { method: "DELETE" }),
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

export const smsTemplatesApi = {
  list: () =>
    request<ApiResponse<SMSTemplate[]>>("/api/templates/sms"),

  create: (payload: CreateSMSTemplatePayload) =>
    request<ApiResponse<SMSTemplate>>("/api/templates/sms", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: UpdateSMSTemplatePayload) =>
    request<ApiResponse<SMSTemplate>>(`/api/templates/sms/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  remove: (id: string) =>
    request<ApiResponse<null>>(`/api/templates/sms/${id}`, { method: "DELETE" }),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () =>
    request<ApiResponse<DashboardStats>>("/api/dashboard/stats"),

  campaignChart: (days?: number) =>
    request<ApiResponse<CampaignChartData[]>>(`/api/dashboard/campaign-chart${toQuery(days ? { days } : undefined)}`),

  leadsChart: () =>
    request<ApiResponse<ChartDataPoint[]>>("/api/dashboard/leads-chart"),
}
