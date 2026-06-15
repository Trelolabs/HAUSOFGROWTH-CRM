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
  background: "hsl(222.2 47.4% 7.2%)",
  border: "1px solid hsl(217.2 32.6% 17.5%)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "hsl(210 40% 98%)",
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
        <CardTitle className="text-sm font-medium text-muted-foreground">
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
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(215 20.2% 65.1%)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(215 20.2% 65.1%)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="email"
                name="Email"
                stroke="#3b82f6"
                fill="url(#gEmail)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sms"
                name="SMS"
                stroke="#10b981"
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
