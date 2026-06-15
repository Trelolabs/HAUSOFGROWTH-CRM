import { PageWrapper } from "@/components/layout/PageWrapper"
import { CampaignList } from "@/components/campaigns/CampaignList"

export default function EmailCampaignsPage() {
  return (
    <PageWrapper>
      <CampaignList type="EMAIL" />
    </PageWrapper>
  )
}
