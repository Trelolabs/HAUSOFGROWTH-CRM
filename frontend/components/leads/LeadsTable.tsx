"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Plus, Search } from "lucide-react"
import toast from "react-hot-toast"
import { leadsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { LeadDrawer } from "./LeadDrawer"
import { LeadCreateModal } from "./LeadCreateModal"
import { leadStatusVariant, leadSourceVariant, titleCase } from "@/lib/status"
import { formatRelative } from "@/lib/format"
import type { Lead, LeadStatus, LeadSource } from "@/types"

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL")
  const [source, setSource] = useState<LeadSource | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const searchTimer = useRef<NodeJS.Timeout>()

  const fetchLeads = useCallback(
    async (pg: number, q: string, s: LeadStatus | "ALL", src: LeadSource | "ALL") => {
      setLoading(true)
      try {
        const res = await leadsApi.list({
          page: pg,
          limit: 20,
          status: s === "ALL" ? undefined : s,
          source: src === "ALL" ? undefined : src,
          search: q || undefined,
        })
        setLeads(res.data)
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages })
      } catch {
        toast.error("Failed to load leads")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchLeads(page, search, status, source)
  }, [page, status, source, fetchLeads])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchLeads(1, search, status, source)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  function openDrawer(id: string) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  function handleRefresh() {
    fetchLeads(page, search, status, source)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, business…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as LeadStatus | "ALL"); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => { setSource(v as LeadSource | "ALL"); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {(["LANDING_PAGE", "MANUAL", "IMPORT"] as LeadSource[]).map((s) => (
              <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No leads found.{" "}
            <button
              onClick={() => setCreateOpen(true)}
              className="text-primary hover:underline"
            >
              Add the first one.
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer hover:bg-primary/[0.06]"
                  onClick={() => openDrawer(l.id)}
                >
                  <TableCell className="font-medium">{l.fullName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.email && <div>{l.email}</div>}
                    {l.whatsappNumber && <div>{l.whatsappNumber}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.businessName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={leadStatusVariant(l.status)} className="text-xs">
                      {titleCase(l.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leadSourceVariant(l.source)} className="text-xs">
                      {titleCase(l.source)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatRelative(l.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {meta.total} leads · page {page} of {meta.totalPages}
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

      <LeadDrawer
        leadId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleRefresh}
      />
      <LeadCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleRefresh}
      />
    </div>
  )
}
