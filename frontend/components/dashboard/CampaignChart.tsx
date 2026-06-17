"use client"

import { useEffect, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { dashboardApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CampaignChartData } from "@/types"

const TOOLTIP_STYLE = {
  background: "hsl(0 17% 12%)",
  border: "1px solid hsl(0 23% 18%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(33 39% 95%)",
}

export function CampaignChart() {
  const [data, setData] = useState<CampaignChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .campaignChart(30)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Campaign Activity — last 30 days
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c41e3a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c41e3a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 23% 18%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#a89f96" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a89f96" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="email"
                name="Email"
                stroke="#c41e3a"
                fill="url(#gEmail)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sms"
                name="SMS"
                stroke="#f59e0b"
                fill="url(#gSms)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
