"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HogLogo } from "@/components/brand/HogLogo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError("Invalid username or password")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Radial glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(350 73% 30% / 0.25) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <HogLogo className="h-16 w-16" textClassName="text-base" />
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Haus of Growth
            </h1>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              CRM Portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[hsl(0_23%_18%)] bg-[hsl(0_17%_12%)] px-8 py-8 shadow-2xl">
          <h2 className="mb-6 font-display text-lg font-semibold text-foreground">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Haus of Growth Marketing
        </p>
      </div>
    </div>
  )
}
