"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Upload, CheckCircle2, FileText, ClipboardList, Send } from "lucide-react"
import { campaignsApi, emailTemplatesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { campaignStatusVariant } from "@/lib/status"
import type { EmailTemplate, ParseFileResult, ValidateEmailsResult, CampaignProgress } from "@/types"

type Step = "upload" | "validate" | "template" | "review" | "progress"

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "validate", label: "Validate", icon: CheckCircle2 },
  { id: "template", label: "Template", icon: FileText },
  { id: "review", label: "Review", icon: ClipboardList },
  { id: "progress", label: "Send", icon: Send },
]

const POLL_MS = 2_000
const DONE_STATUSES = new Set(["COMPLETED", "FAILED", "PAUSED"])

export function EmailCampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")

  // Step 1 state
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParseFileResult | null>(null)

  // Step 2 state
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState<ValidateEmailsResult | null>(null)

  // Step 3 state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  // Step 4 state
  const [campaignName, setCampaignName] = useState("")

  // Step 5 state
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const pollRef = useRef<NodeJS.Timeout>()

  // Parse file (step 1)
  async function handleUpload() {
    if (!file) return
    setParsing(true)
    try {
      const r = await campaignsApi.parseFile(file, "email")
      setParsed(r.data)
      toast.success(`Parsed ${r.data.total} rows`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parse failed")
    } finally {
      setParsing(false)
    }
  }

  // Validate emails (step 2 — auto-run when entering step)
  async function runValidation(sessionId: string) {
    setValidating(true)
    try {
      const r = await campaignsApi.validateEmails(sessionId)
      setValidated(r.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation failed")
    } finally {
      setValidating(false)
    }
  }

  // Load templates (step 3 — auto-run when entering step)
  async function loadTemplates() {
    setTemplatesLoading(true)
    try {
      const r = await emailTemplatesApi.list()
      setTemplates(r.data)
    } catch {
      toast.error("Failed to load templates")
    } finally {
      setTemplatesLoading(false)
    }
  }

  // Create + send campaign (step 5 — auto-run when entering step)
  async function createAndSend() {
    if (!parsed || !selectedTemplate || !campaignName.trim()) return
    try {
      const c = await campaignsApi.create({
        name: campaignName,
        type: "EMAIL",
        templateId: selectedTemplate.id,
        sessionId: parsed.sessionId,
      })
      const id = c.data.id
      setCampaignId(id)
      await campaignsApi.send(id, { sessionId: parsed.sessionId, templateId: selectedTemplate.id })

      // Start polling
      const poll = async () => {
        try {
          const r = await campaignsApi.progress(id)
          setProgress(r.data)
          if (!DONE_STATUSES.has(r.data.status)) {
            pollRef.current = setTimeout(poll, POLL_MS)
          }
        } catch {
          pollRef.current = setTimeout(poll, POLL_MS)
        }
      }
      poll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send campaign")
    }
  }

  function goTo(next: Step) {
    setStep(next)
    if (next === "validate" && parsed) runValidation(parsed.sessionId)
    if (next === "template") loadTemplates()
    if (next === "progress") createAndSend()
  }

  useEffect(() => () => { clearTimeout(pollRef.current) }, [])

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < stepIndex
          const active = i === stepIndex
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${active ? "font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Recipient File</CardTitle>
            <CardDescription>
              CSV or Excel with at minimum columns: <code className="text-primary">name</code> and{" "}
              <code className="text-primary">email</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null) }}
              />
            </div>
            {file && !parsed && (
              <Button onClick={handleUpload} disabled={parsing}>
                {parsing ? "Parsing…" : "Parse File"}
              </Button>
            )}
            {parsed && (
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-medium">
                  <span className="text-primary">{parsed.total}</span> rows found
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left text-muted-foreground font-medium">Name</th>
                        <th className="pb-2 text-left text-muted-foreground font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.preview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 pr-4">{row.name}</td>
                          <td className="py-1.5 text-muted-foreground">{row.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.total > 5 && (
                    <p className="mt-2 text-xs text-muted-foreground">+{parsed.total - 5} more…</p>
                  )}
                </div>
                <Button onClick={() => goTo("validate")}>Next: Validate Emails</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "validate" && (
        <Card>
          <CardHeader>
            <CardTitle>Validate Emails</CardTitle>
            <CardDescription>Checking validity of all email addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validating || !validated ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <p className="text-sm text-muted-foreground">Validating {parsed?.total} emails…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Valid", count: validated.counts.valid, color: "text-emerald-400" },
                    { label: "Risky", count: validated.counts.risky, color: "text-yellow-400" },
                    { label: "Invalid", count: validated.counts.invalid, color: "text-destructive" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="rounded-md border p-4 text-center">
                      <div className={`text-2xl font-bold ${color}`}>{count}</div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {validated.counts.invalid > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {validated.counts.invalid} invalid addresses will be skipped automatically.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                  <Button
                    disabled={validated.counts.valid + validated.counts.risky === 0}
                    onClick={() => goTo("template")}
                  >
                    Next: Select Template ({validated.counts.valid + validated.counts.risky} recipients)
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === "template" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Email Template</CardTitle>
            <CardDescription>Choose the template to send to your recipients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templatesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates found.{" "}
                <a href="/templates/email" className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  Create one first.
                </a>
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      selectedTemplate?.id === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{t.subject}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("validate")}>Back</Button>
              <Button disabled={!selectedTemplate} onClick={() => goTo("review")}>
                Next: Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review Campaign</CardTitle>
            <CardDescription>Name your campaign and confirm before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Q1 Outreach — January 2025"
              />
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Recipients</dt>
                <dd className="font-medium">
                  {(validated?.counts.valid ?? 0) + (validated?.counts.risky ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Template</dt>
                <dd className="font-medium">{selectedTemplate?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="font-medium">{selectedTemplate?.subject}</dd>
              </div>
            </dl>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("template")}>Back</Button>
              <Button
                disabled={!campaignName.trim()}
                onClick={() => goTo("progress")}
              >
                <Send className="mr-2 h-4 w-4" />
                Create & Send Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Sending Campaign</CardTitle>
            <CardDescription>{campaignName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!progress ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <p className="text-sm text-muted-foreground">Creating campaign…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={campaignStatusVariant(progress.status)}>
                    {progress.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {progress.sentCount} / {progress.totalCount} sent
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress value={progress.percentage} className="h-3" />
                  <p className="text-right text-sm text-muted-foreground">{progress.percentage}%</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-bold">{progress.totalCount}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-bold text-emerald-400">{progress.sentCount}</div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-bold text-destructive">{progress.failedCount}</div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                {DONE_STATUSES.has(progress.status) && campaignId && (
                  <Button onClick={() => router.push(`/campaigns/email/${campaignId}`)}>
                    View Campaign Details
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
