import { PageWrapper } from "@/components/layout/PageWrapper"
import { CampaignList } from "@/components/campaigns/CampaignList"

export default function SMSCampaignsPage() {
  return (
    <PageWrapper>
      <CampaignList type="SMS" />
    </PageWrapper>
  )
}
