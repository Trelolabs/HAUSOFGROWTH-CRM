import { PageWrapper } from "@/components/layout/PageWrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <PageWrapper>
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Application configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings are managed via environment variables. See <code>.env.local.example</code>{" "}
              for available options.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
