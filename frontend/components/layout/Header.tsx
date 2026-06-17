"use client"

import { usePathname } from "next/navigation"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/campaigns/email": "Email Campaigns",
  "/campaigns/sms": "SMS Campaigns",
  "/templates/email": "Email Templates",
  "/templates/sms": "SMS Templates",
  "/settings": "Settings",
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/campaigns/email/")) return "Email Campaign"
  if (pathname.startsWith("/campaigns/sms/")) return "SMS Campaign"
  if (pathname.startsWith("/leads/")) return "Lead Detail"
  return "CRM"
}

export function Header() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </header>
  )
}
