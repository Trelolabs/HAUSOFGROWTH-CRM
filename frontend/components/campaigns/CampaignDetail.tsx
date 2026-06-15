"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { ArrowLeft, Download, Send, RefreshCw } from "lucide-react"
import { campaignsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { campaignStatusVariant, recipientStatusVariant, titleCase } from "@/lib/status"
import { formatDate, formatDateTime } from "@/lib/format"
import type { Campaign, CampaignRecipient, RecipientStatus } from "@/types"

const ACTIVE = new Set(["SENDING", "QUEUED", "VALIDATING"])
const POLL_MS = 2_000

const TABS: { label: string; value: RecipientStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Sent", value: "SENT" },
  { label: "Failed", value: "FAILED" },
  { label: "Bounced", value: "BOUNCED" },
  { label: "Skipped", value: "SKIPPED" },
]

interface Props {
  campaignId: string
}

export function CampaignDetail({ campaignId }: Props) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<RecipientStatus | "ALL">("ALL")
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [sending, setSending] = useState(false)
  const pollRef = useRef<NodeJS.Timeout>()

  const fetchCampaign = useCallback(async () => {
    try {
      const r = await campaignsApi.get(campaignId)
      setCampaign(r.data)
      return r.data
    } catch {
      toast.error("Failed to load campaign")
      return null
    }
  }, [campaignId])

  const fetchRecipients = useCallback(
    async (tab: RecipientStatus | "ALL", pg: number) => {
      setRecLoading(true)
      try {
        const r = await campaignsApi.recipients(campaignId, {
          page: pg,
          limit: 20,
          status: tab === "ALL" ? undefined : tab,
        })
        console.log(r.data);
        setRecipients(r.data)
        setMeta({ total: r.meta.total, totalPages: r.meta.totalPages })
      } catch {
        toast.error("Failed to load recipients")
      } finally {
        setRecLoading(false)
      }
    },
    [campaignId]
  )

  useEffect(() => {
    fetchCampaign()
      .then((c) => {
        if (c && ACTIVE.has(c.status)) {
          const poll = async () => {
            const updated = await fetchCampaign()
            if (updated && ACTIVE.has(updated.status)) {
              pollRef.current = setTimeout(poll, POLL_MS)
            }
          }
          pollRef.current = setTimeout(poll, POLL_MS)
        }
      })
      .finally(() => setLoading(false))
    return () => clearTimeout(pollRef.current)
  }, [fetchCampaign])

  useEffect(() => {
    fetchRecipients(activeTab, page)
  }, [activeTab, page, fetchRecipients])

  async function handleSend() {
    if (!campaign) return
    setSending(true)
    try {
      await campaignsApi.send(campaign.id)
      toast.success("Campaign queued for sending")
      fetchCampaign()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!campaign) return <p className="text-muted-foreground">Campaign not found.</p>

  const pct = campaign.totalCount > 0
    ? Math.round((campaign.sentCount / campaign.totalCount) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{campaign.name}</h2>
            <Badge variant="outline">{campaign.type}</Badge>
            <Badge variant={campaignStatusVariant(campaign.status)}>
              {titleCase(campaign.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(campaign.createdAt)}
            {campaign.completedAt && ` · Completed ${formatDate(campaign.completedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(campaignsApi.exportFailedUrl(campaignId), "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Failed
            </Button>
          )}
          {campaign.status === "DRAFT" && (
            <Button size="sm" onClick={handleSend} disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : "Send Campaign"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => fetchCampaign()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: campaign.totalCount },
          { label: "Sent", value: campaign.sentCount, green: true },
          { label: "Failed", value: campaign.failedCount, red: true },
        ].map(({ label, value, green, red }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${green ? "text-emerald-400" : red && value > 0 ? "text-destructive" : ""}`}>
                {value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {campaign.totalCount > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Recipients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as RecipientStatus | "ALL")
              setPage(1)
            }}
          >
            <div className="border-b px-4">
              <TabsList className="h-auto bg-transparent p-0 gap-1">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          {recLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recipients.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No recipients in this category.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>{campaign.type === "EMAIL" ? "Email" : "Phone"}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {campaign.type === "EMAIL" ? r.email : r.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipientStatusVariant(r.status)} className="text-xs">
                        {titleCase(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                      {r.errorMessage ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.sentAt ? formatDateTime(r.sentAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {meta.total} recipients · page {page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
