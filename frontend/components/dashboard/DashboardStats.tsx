"use client"

import { useEffect, useState } from "react"
import { Users, TrendingUp, Mail, MessageSquare, Send, Activity } from "lucide-react"
import { dashboardApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPercent } from "@/lib/format"
import type { DashboardStats } from "@/types"

const CARDS = [
  { key: "totalLeads" as const, label: "Total Leads", icon: Users },
  { key: "newLeadsToday" as const, label: "New Today", icon: TrendingUp },
  { key: "activeCampaigns" as const, label: "Active Campaigns", icon: Activity },
  { key: "emailsSent" as const, label: "Emails Sent", icon: Mail },
  { key: "smsSent" as const, label: "SMS Sent", icon: MessageSquare },
  { key: "conversionRate" as const, label: "Conversion Rate", icon: Send, isPercent: true },
]

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .stats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CARDS.map(({ key, label, icon: Icon, isPercent }) => {
        const raw = stats?.[key] ?? 0
        const value = isPercent ? formatPercent(raw) : formatNumber(raw)
        return (
          <Card key={key} className="border-t-2 border-t-primary border-x-white/[0.07] border-b-white/[0.07]">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-3xl font-bold tracking-tight text-foreground">{value}</div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
