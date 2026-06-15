"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { Plus } from "lucide-react"
import { campaignsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { campaignStatusVariant, titleCase } from "@/lib/status"
import { formatRelative } from "@/lib/format"
import type { Campaign, CampaignStatus, CampaignType } from "@/types"

interface Props {
  type: CampaignType
}

export function CampaignList({ type }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<CampaignStatus | "ALL">("ALL")
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })

  const fetchCampaigns = useCallback(
    async (pg: number, s: CampaignStatus | "ALL") => {
      setLoading(true)
      try {
        const res = await campaignsApi.list({
          type,
          page: pg,
          limit: 20,
          status: s === "ALL" ? undefined : s,
        })
        setCampaigns(res.data)
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages })
      } catch {
        toast.error("Failed to load campaigns")
      } finally {
        setLoading(false)
      }
    },
    [type]
  )

  useEffect(() => {
    fetchCampaigns(page, status)
  }, [page, status, fetchCampaigns])

  const typePath = type.toLowerCase()

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as CampaignStatus | "ALL")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(
              [
                "DRAFT",
                "VALIDATING",
                "QUEUED",
                "SENDING",
                "COMPLETED",
                "FAILED",
                "PAUSED",
              ] as CampaignStatus[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {titleCase(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Link href={`/campaigns/${typePath}/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New {type === "EMAIL" ? "Email" : "SMS"} Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No campaigns yet.{" "}
            <Link href={`/campaigns/${typePath}/new`} className="text-primary hover:underline">
              Create one.
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Sent / Total</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const pct =
                  c.totalCount > 0
                    ? Math.round((c.sentCount / c.totalCount) * 100)
                    : 0
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/campaigns/${typePath}/${c.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={campaignStatusVariant(c.status)} className="text-xs">
                        {titleCase(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-32">
                      {c.totalCount > 0 ? (
                        <div className="space-y-1">
                          <Progress value={pct} className="h-1.5" />
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {c.sentCount} / {c.totalCount}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {c.failedCount > 0 ? (
                        <span className="text-destructive">{c.failedCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelative(c.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {meta.total} campaigns · page {page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
