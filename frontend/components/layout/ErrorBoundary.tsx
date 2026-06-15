"use client"

import React from "react"
import { Button } from "@/components/ui/button"

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
