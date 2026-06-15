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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
