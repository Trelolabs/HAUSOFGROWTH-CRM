"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { leadsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CreateLeadPayload, LeadSource, LeadStatus } from "@/types"

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

const INITIAL: CreateLeadPayload = {
  fullName: "",
  email: "",
  whatsappNumber: "",
  businessName: "",
  website: "",
  interestedIn: [],
  message: "",
  source: "MANUAL",
  status: "NEW",
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function LeadCreateModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateLeadPayload>(INITIAL)
  const [saving, setSaving] = useState(false)

  function set(key: keyof CreateLeadPayload, value: unknown) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim()) return toast.error("Full name is required")
    setSaving(true)
    try {
      await leadsApi.create(form)
      toast.success("Lead created")
      setForm(INITIAL)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Business Name</Label>
                <Input
                  value={form.businessName ?? ""}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="Acme Inc"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@co.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp Number</Label>
                <Input
                  value={form.whatsappNumber ?? ""}
                  onChange={(e) => set("whatsappNumber", e.target.value)}
                  placeholder="+15550001234"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={form.website ?? ""}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://acme.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v as LeadSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="LANDING_PAGE">Landing Page</SelectItem>
                    <SelectItem value="IMPORT">Import</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as LeadStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as LeadStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
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
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={form.message ?? ""}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Any notes or message from the lead..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
