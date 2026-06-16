"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Plus, Pencil, Trash2, Eye } from "lucide-react"
import { emailTemplatesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import type { EmailTemplate, CreateEmailTemplatePayload, EmailBodyType } from "@/types"

const EMPTY: CreateEmailTemplatePayload = {
  name: "",
  subject: "",
  bodyType: "HTML",
  htmlContent: "",
  textContent: "",
  previewText: "",
}

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [previewing, setPreviewing] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState<CreateEmailTemplatePayload>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await emailTemplatesApi.list()
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

  function openEdit(t: EmailTemplate) {
    setEditing(t)
    setForm({
      name: t.name,
      subject: t.subject,
      bodyType: t.bodyType,
      htmlContent: t.htmlContent ?? "",
      textContent: t.textContent ?? "",
      previewText: t.previewText ?? "",
    })
    setEditorOpen(true)
  }

  function openPreview(t: EmailTemplate) {
    setPreviewing(t)
    setPreviewOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const bodyMissing = form.bodyType === "HTML" ? !form.htmlContent?.trim() : !form.textContent?.trim()
    if (!form.name.trim() || !form.subject.trim() || bodyMissing) {
      toast.error(`Name, subject and ${form.bodyType === "HTML" ? "HTML" : "text"} content are required`)
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await emailTemplatesApi.update(editing.id, form)
        toast.success("Template updated")
      } else {
        await emailTemplatesApi.create(form)
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
      await emailTemplatesApi.remove(id)
      toast.success("Deleted")
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
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
          <p className="text-muted-foreground text-sm">No email templates yet.</p>
          <Button className="mt-4" onClick={openCreate}>Create your first template</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="group relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base truncate">{t.name}</CardTitle>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${t.bodyType === "TEXT" ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-400"}`}>
                    {t.bodyType}
                  </span>
                </div>
                <CardDescription className="truncate">{t.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {t.previewText || (t.bodyType === "TEXT" ? t.textContent : "No preview text")}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">{formatDate(t.updatedAt)}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openPreview(t)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Email Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Template Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Welcome Email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Subject Line *</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Welcome to {{company}}!"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Preview Text</Label>
                <Input
                  value={form.previewText ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, previewText: e.target.value }))}
                  placeholder="Short preview shown in inbox…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body Type *</Label>
                <div className="flex rounded-md border overflow-hidden w-fit">
                  {(["HTML", "TEXT"] as EmailBodyType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, bodyType: type }))}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        form.bodyType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {type === "HTML" ? "HTML Template" : "Plain Text Template"}
                    </button>
                  ))}
                </div>
              </div>
              {form.bodyType === "HTML" ? (
                <div className="space-y-1.5">
                  <Label>HTML Content *</Label>
                  <Textarea
                    value={form.htmlContent ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                    placeholder="<html>…</html>"
                    className="font-mono text-xs"
                    rows={14}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Plain Text Content *</Label>
                  <Textarea
                    value={form.textContent ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, textContent: e.target.value }))}
                    placeholder="Hi {{name}}, thanks for reaching out…"
                    rows={14}
                  />
                </div>
              )}
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

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={(v) => !v && setPreviewOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-md border bg-white p-4">
            {previewing?.bodyType === "TEXT" ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 p-2 min-h-[200px]">
                {previewing.textContent ?? "No content"}
              </pre>
            ) : (
              <iframe
                srcDoc={previewing?.htmlContent ?? ""}
                title="Email preview"
                className="h-[500px] w-full border-0"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
