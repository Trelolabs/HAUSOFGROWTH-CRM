"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Upload, CheckCircle2, FileText, ClipboardList, Send } from "lucide-react"
import { campaignsApi, smsTemplatesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { campaignStatusVariant } from "@/lib/status"
import type { SMSTemplate, ParseFileResult, ValidatePhonesResult, CampaignProgress } from "@/types"

type Step = "upload" | "validate" | "template" | "review" | "progress"

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "validate", label: "Validate" },
  { id: "template", label: "Template" },
  { id: "review", label: "Review" },
  { id: "progress", label: "Send" },
]

const POLL_MS = 2_000
const DONE_STATUSES = new Set(["COMPLETED", "FAILED", "PAUSED"])

export function SMSCampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParseFileResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState<ValidatePhonesResult | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)

  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null)

  const [campaignName, setCampaignName] = useState("")
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout>()

  async function handleUpload() {
    if (!file) return
    setParsing(true)
    setParseError(null)
    try {
      const r = await campaignsApi.parseFile(file, "sms")
      if (r.data.total === 0) {
        const msg = "No valid rows found. Make sure your file has the required columns: name and phone."
        setParseError(msg)
        toast.error(msg)
      } else {
        setParsed(r.data)
        toast.success(`Parsed ${r.data.total} rows`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed"
      setParseError(msg)
      toast.error(msg)
    } finally {
      setParsing(false)
    }
  }

  async function runValidation(sessionId: string) {
    setValidating(true)
    setValidateError(null)
    try {
      const r = await campaignsApi.validatePhones(sessionId)
      setValidated(r.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation failed"
      setValidateError(msg)
      toast.error(msg)
    } finally {
      setValidating(false)
    }
  }

  async function loadTemplates() {
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const r = await smsTemplatesApi.list()
      setTemplates(r.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load templates"
      setTemplatesError(msg)
      toast.error(msg)
    } finally {
      setTemplatesLoading(false)
    }
  }

  async function createAndSend() {
    if (!parsed || !selectedTemplate || !campaignName.trim()) return
    setSendError(null)
    try {
      const c = await campaignsApi.create({
        name: campaignName,
        type: "SMS",
        templateId: selectedTemplate.id,
        sessionId: parsed.sessionId,
      })
      const id = c.data.id
      setCampaignId(id)
      await campaignsApi.send(id, { sessionId: parsed.sessionId, templateId: selectedTemplate.id })

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
      const msg = err instanceof Error ? err.message : "Failed to send campaign"
      setSendError(msg)
      toast.error(msg)
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

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Recipient File</CardTitle>
            <CardDescription>
              CSV or Excel with columns: <code className="text-primary">name</code> and{" "}
              <code className="text-primary">phone</code> (E.164 format, e.g. +15550001234)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setParseError(null) }}
              />
            </div>
            {parseError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {parseError}
              </div>
            )}
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
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left text-muted-foreground font-medium">Name</th>
                      <th className="pb-2 text-left text-muted-foreground font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-4">{row.name}</td>
                        <td className="py-1.5 text-muted-foreground">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.total > 5 && (
                  <p className="text-xs text-muted-foreground">+{parsed.total - 5} more…</p>
                )}
                <Button onClick={() => goTo("validate")}>Next: Validate Phones</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "validate" && (
        <Card>
          <CardHeader>
            <CardTitle>Validate Phone Numbers</CardTitle>
            <CardDescription>Checking format of all phone numbers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validating ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <p className="text-sm text-muted-foreground">Validating {parsed?.total} numbers…</p>
              </div>
            ) : validateError ? (
              <>
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {validateError}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                  <Button onClick={() => parsed && runValidation(parsed.sessionId)}>Retry</Button>
                </div>
              </>
            ) : validated ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Valid", count: validated.counts.valid, color: "text-emerald-400" },
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
                    {validated.counts.invalid} invalid numbers will be skipped.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                  <Button disabled={validated.counts.valid === 0} onClick={() => goTo("template")}>
                    Next: Select Template ({validated.counts.valid} recipients)
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {step === "template" && (
        <Card>
          <CardHeader>
            <CardTitle>Select SMS Template</CardTitle>
            <CardDescription>Choose the message template to send</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templatesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : templatesError ? (
              <div className="space-y-3">
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {templatesError}
                </div>
                <Button variant="outline" onClick={loadTemplates}>Retry</Button>
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates found.{" "}
                <a href="/templates/sms" className="text-primary hover:underline" target="_blank" rel="noreferrer">
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
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.content.length} chars</p>
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
                placeholder="Q1 SMS Blast — January 2025"
              />
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Recipients</dt>
                <dd className="font-medium">{validated?.counts.valid ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Template</dt>
                <dd className="font-medium">{selectedTemplate?.name}</dd>
              </div>
            </dl>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("template")}>Back</Button>
              <Button disabled={!campaignName.trim()} onClick={() => goTo("progress")}>
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
            {sendError ? (
              <>
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {sendError}
                </div>
                <Button variant="outline" onClick={() => setStep("review")}>Back to Review</Button>
              </>
            ) : !progress ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <p className="text-sm text-muted-foreground">Creating campaign…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={campaignStatusVariant(progress.status)}>{progress.status}</Badge>
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
                  <Button onClick={() => router.push(`/campaigns/sms/${campaignId}`)}>
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
