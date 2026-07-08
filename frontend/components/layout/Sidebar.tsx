"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Mail,
  MessageSquare,
  FileText,
  MessageCircle,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HogLogo } from "@/components/brand/HogLogo"

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Email Campaigns", href: "/campaigns/email", icon: Mail },
  { label: "SMS Campaigns", href: "/campaigns/sms", icon: MessageSquare },
  { label: "Email Templates", href: "/templates/email", icon: FileText },
  { label: "SMS Templates", href: "/templates/sms", icon: MessageCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-5">
        <HogLogo className="shrink-0 transition-transform duration-300 hover:scale-105" />
        <div className="flex flex-col">
          <span className="font-display text-sm font-semibold tracking-tight text-foreground">Haus of Growth</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[hsl(var(--sidebar-primary))]">CRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {nav.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[hsl(var(--sidebar-primary))]/10 text-foreground"
                  : "text-[#a89f96] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[hsl(var(--sidebar-primary))]" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-[hsl(var(--sidebar-primary))]" : "text-[#7a726b] group-hover:text-foreground"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
            pathname === "/settings"
              ? "bg-[hsl(var(--sidebar-primary))]/10 text-foreground"
              : "text-[#a89f96] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
          )}
        >
          {pathname === "/settings" && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[hsl(var(--sidebar-primary))]" />
          )}
          <Settings className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            pathname === "/settings" ? "text-[hsl(var(--sidebar-primary))]" : "text-[#7a726b] group-hover:text-foreground"
          )} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 text-[#a89f96] hover:bg-[hsl(var(--sidebar-primary))]/10 hover:text-[hsl(var(--sidebar-primary))]"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#7a726b] group-hover:text-[hsl(var(--sidebar-primary))] transition-colors" />
          Logout
        </button>
      </div>
    </aside>
  )
}
