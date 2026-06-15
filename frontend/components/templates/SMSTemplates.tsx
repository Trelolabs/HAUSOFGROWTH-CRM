"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { smsTemplatesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import type { SMSTemplate, CreateSMSTemplatePayload } from "@/types"

const SMS_LIMIT = 160
const EMPTY: CreateSMSTemplatePayload = { name: "", content: "" }

export function SMSTemplates() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<SMSTemplate | null>(null)
  const [form, setForm] = useState<CreateSMSTemplatePayload>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await smsTemplatesApi.list()
      setTemplates(r.data)
    } catch {
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setEditorOpen(true)
  }

  function openEdit(t: SMSTemplate) {
    setEditing(t)
    setForm({ name: t.name, content: t.content })
    setEditorOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("Name and content are required")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await smsTemplatesApi.update(editing.id, form)
        toast.success("Template updated")
      } else {
        await smsTemplatesApi.create(form)
        toast.success("Template created")
      }
      setEditorOpen(false)
      setLoading(true)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return
    try {
      await smsTemplatesApi.remove(id)
      toast.success("Deleted")
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const charCount = form.content.length
  const charOver = charCount > SMS_LIMIT
  const segments = Math.ceil(charCount / SMS_LIMIT) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No SMS templates yet.</p>
          <Button className="mt-4" onClick={openCreate}>Create your first template</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-base truncate">{t.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3">{t.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.content.length} chars · {formatDate(t.updatedAt)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor modal */}
      <Dialog open={editorOpen} onOpenChange={(v) => !v && setEditorOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit SMS Template" : "New SMS Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Template Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Promo Blast"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Message Content *</Label>
                  <span className={`text-xs ${charOver ? "text-destructive" : "text-muted-foreground"}`}>
                    {charCount}/{SMS_LIMIT} · {segments} segment{segments !== 1 ? "s" : ""}
                  </span>
                </div>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Hi {{name}}, we have an offer for you…"
                  rows={6}
                  className={charOver ? "border-destructive" : ""}
                />
                {charOver && (
                  <p className="text-xs text-destructive">
                    Message exceeds {SMS_LIMIT} chars — will be sent as {segments} segments.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
