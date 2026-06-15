import { PageWrapper } from "@/components/layout/PageWrapper"
import { DashboardStats } from "@/components/dashboard/DashboardStats"
import { CampaignChart } from "@/components/dashboard/CampaignChart"
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns"

export default function DashboardPage() {
  return (
    <PageWrapper>
      <DashboardStats />
      <div className="grid gap-6 lg:grid-cols-2">
        <CampaignChart />
        <RecentCampaigns />
      </div>
    </PageWrapper>
  )
}
