"use client"

import Link from "next/link"
import Image from "next/image"
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-[hsl(var(--sidebar))]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[hsl(var(--sidebar-border))] px-5">
        <Image
          src="/assets/images/app_logo.png"
          alt="HOG Agency"
          width={32}
          height={32}
          className="flex-shrink-0"
          priority
        />
        <span className="text-sm font-semibold tracking-tight text-foreground">HOG Agency CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
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
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[hsl(var(--sidebar-accent))] text-foreground"
                  : "text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-[hsl(var(--sidebar-accent))] text-foreground"
              : "text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-destructive" />
          Logout
        </button>
      </div>
    </aside>
  )
}
