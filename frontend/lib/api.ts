import axios from "axios"
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

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? "Something went wrong"
    return Promise.reject(new Error(message))
  }
)

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: LeadQueryParams) =>
    http.get<PaginatedResponse<Lead>>("/api/leads", { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<ApiResponse<Lead>>(`/api/leads/${id}`).then((r) => r.data),

  create: (payload: CreateLeadPayload) =>
    http.post<ApiResponse<Lead>>("/api/leads", payload).then((r) => r.data),

  update: (id: string, payload: UpdateLeadPayload) =>
    http.patch<ApiResponse<Lead>>(`/api/leads/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    http.delete<ApiResponse<null>>(`/api/leads/${id}`).then((r) => r.data),
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaignsApi = {
  list: (params?: CampaignQueryParams) =>
    http.get<PaginatedResponse<Campaign>>("/api/campaigns", { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<ApiResponse<Campaign>>(`/api/campaigns/${id}`).then((r) => r.data),

  create: (payload: CreateCampaignPayload) =>
    http.post<ApiResponse<Campaign>>("/api/campaigns", payload).then((r) => r.data),

  send: (id: string, body?: { sessionId: string; templateId: string }) =>
    http.post<ApiResponse<{ queued: boolean }>>(`/api/campaigns/${id}/send`, body).then((r) => r.data),

  progress: (id: string) =>
    http.get<ApiResponse<CampaignProgress>>(`/api/campaigns/${id}/progress`).then((r) => r.data),

  recipients: (id: string, params?: RecipientQueryParams) =>
    http
      .get<PaginatedResponse<CampaignRecipient>>(`/api/campaigns/${id}/recipients`, { params })
      .then((r) => r.data),

  exportFailedUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/campaigns/${id}/export-failed`,

  parseFile: (file: File, type: "email" | "sms") => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    return http
      .post<ApiResponse<ParseFileResult>>("/api/campaigns/parse-file", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },

  validateEmails: (sessionId: string) =>
    http
      .post<ApiResponse<ValidateEmailsResult>>("/api/campaigns/validate-emails", { sessionId })
      .then((r) => r.data),

  validatePhones: (sessionId: string) =>
    http
      .post<ApiResponse<ValidatePhonesResult>>("/api/campaigns/validate-phones", { sessionId })
      .then((r) => r.data),
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplatesApi = {
  list: () =>
    http.get<ApiResponse<EmailTemplate[]>>("/api/templates/email").then((r) => r.data),

  create: (payload: CreateEmailTemplatePayload) =>
    http.post<ApiResponse<EmailTemplate>>("/api/templates/email", payload).then((r) => r.data),

  update: (id: string, payload: UpdateEmailTemplatePayload) =>
    http
      .put<ApiResponse<EmailTemplate>>(`/api/templates/email/${id}`, payload)
      .then((r) => r.data),

  remove: (id: string) =>
    http.delete<ApiResponse<null>>(`/api/templates/email/${id}`).then((r) => r.data),
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

export const smsTemplatesApi = {
  list: () =>
    http.get<ApiResponse<SMSTemplate[]>>("/api/templates/sms").then((r) => r.data),

  create: (payload: CreateSMSTemplatePayload) =>
    http.post<ApiResponse<SMSTemplate>>("/api/templates/sms", payload).then((r) => r.data),

  update: (id: string, payload: UpdateSMSTemplatePayload) =>
    http
      .put<ApiResponse<SMSTemplate>>(`/api/templates/sms/${id}`, payload)
      .then((r) => r.data),

  remove: (id: string) =>
    http.delete<ApiResponse<null>>(`/api/templates/sms/${id}`).then((r) => r.data),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () =>
    http.get<ApiResponse<DashboardStats>>("/api/dashboard/stats").then((r) => r.data),

  campaignChart: (days?: number) =>
    http
      .get<ApiResponse<CampaignChartData[]>>("/api/dashboard/campaign-chart", {
        params: days ? { days } : undefined,
      })
      .then((r) => r.data),

  leadsChart: () =>
    http.get<ApiResponse<ChartDataPoint[]>>("/api/dashboard/leads-chart").then((r) => r.data),
}

export default http
