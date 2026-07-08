import type { LeadStatus, CampaignStatus, RecipientStatus, LeadSource } from "@/types"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"

export function leadStatusVariant(s: LeadStatus): BadgeVariant {
  const m: Record<LeadStatus, BadgeVariant> = {
    NEW: "info",
    CONTACTED: "warning",
    QUALIFIED: "secondary",
    CONVERTED: "success",
    LOST: "destructive",
  }
  return m[s]
}

export function campaignStatusVariant(s: CampaignStatus): BadgeVariant {
  const m: Record<CampaignStatus, BadgeVariant> = {
    DRAFT: "secondary",
    VALIDATING: "warning",
    QUEUED: "info",
    SENDING: "info",
    COMPLETED: "success",
    FAILED: "destructive",
    PAUSED: "warning",
  }
  return m[s]
}

export function recipientStatusVariant(s: RecipientStatus): BadgeVariant {
  const m: Record<RecipientStatus, BadgeVariant> = {
    PENDING: "secondary",
    SENT: "success",
    FAILED: "destructive",
    BOUNCED: "warning",
    SKIPPED: "outline",
  }
  return m[s]
}

export function leadSourceVariant(s: LeadSource): BadgeVariant {
  const m: Record<LeadSource, BadgeVariant> = {
    LANDING_PAGE: "info",
    MANUAL: "secondary",
    IMPORT: "outline",
  }
  return m[s]
}

export function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")
}

// Safety net for the Recipients "Error" column: never surface a raw internal
// ORM / connection error (e.g. "Invalid `prisma.campaignRecipient.update()`
// invocation: Timed out fetching a new connection from the pool") to the user.
// Show a clean, human-readable reason instead.
export function displayRecipientError(msg?: string | null): string {
  if (!msg) return "—"
  if (/prisma\.|invocation|connection pool|timed out|ECONN|socket/i.test(msg)) {
    return "Temporary sending error"
  }
  return msg
}
