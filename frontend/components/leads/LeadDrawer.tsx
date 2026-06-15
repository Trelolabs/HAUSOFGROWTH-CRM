"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { leadsApi } from "@/lib/api"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { leadStatusVariant, titleCase } from "@/lib/status"
import { formatDate } from "@/lib/format"
import type { Lead, LeadStatus, UpdateLeadPayload } from "@/types"

const INTERESTS = [
  "Paid Ads",
  "SEO",
  "Social Media Management",
  "Email Marketing",
  "Web Design",
  "Content Marketing",
  "Video Production",
  "Branding",
]

interface Props {
  leadId: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function LeadDrawer({ leadId, open, onClose, onUpdated }: Props) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateLeadPayload>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!leadId || !open) return
    setLoading(true)
    setEditing(false)
    leadsApi
      .get(leadId)
      .then((r) => {
        setLead(r.data)
        setForm({
          fullName: r.data.fullName,
          email: r.data.email ?? "",
          whatsappNumber: r.data.whatsappNumber ?? "",
          businessName: r.data.businessName ?? "",
          website: r.data.website ?? "",
          interestedIn: r.data.interestedIn,
          message: r.data.message ?? "",
          status: r.data.status,
        })
      })
      .catch(() => toast.error("Failed to load lead"))
      .finally(() => setLoading(false))
  }, [leadId, open])

  function set(key: keyof UpdateLeadPayload, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleInterest(item: string) {
    setForm((f) => ({
      ...f,
      interestedIn: f.interestedIn?.includes(item)
        ? f.interestedIn.filter((i) => i !== item)
        : [...(f.interestedIn ?? []), item],
    }))
  }

  async function handleSave() {
    if (!leadId) return
    setSaving(true)
    try {
      await leadsApi.update(leadId, form)
      toast.success("Lead updated")
      onUpdated()
      setEditing(false)
      const r = await leadsApi.get(leadId)
      setLead(r.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!leadId || !confirm("Delete this lead? This cannot be undone.")) return
    try {
      await leadsApi.remove(leadId)
      toast.success("Lead deleted")
      onUpdated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{loading ? "Loading…" : lead?.fullName ?? "Lead"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !lead ? (
          <p className="mt-6 text-sm text-muted-foreground">Lead not found.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Status badge + actions */}
            <div className="flex items-center justify-between">
              <Badge variant={leadStatusVariant(lead.status)} className="text-xs">
                {titleCase(lead.status)}
              </Badge>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {editing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsappNumber ?? ""} onChange={(e) => set("whatsappNumber", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Business</Label>
                    <Input value={form.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v as LeadStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as LeadStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interested In</Label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          form.interestedIn?.includes(item)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea value={form.message ?? ""} onChange={(e) => set("message", e.target.value)} rows={3} />
                </div>
              </div>
            ) : (
              <dl className="space-y-4 text-sm">
                {[
                  { label: "Email", value: lead.email },
                  { label: "WhatsApp", value: lead.whatsappNumber },
                  { label: "Business", value: lead.businessName },
                  { label: "Website", value: lead.website },
                  { label: "Source", value: titleCase(lead.source) },
                  {
                    label: "Interested In",
                    value: lead.interestedIn.length > 0 ? lead.interestedIn.join(", ") : null,
                  },
                  { label: "Message", value: lead.message },
                  { label: "Created", value: formatDate(lead.createdAt) },
                  { label: "Updated", value: formatDate(lead.updatedAt) },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 font-medium">{value}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
