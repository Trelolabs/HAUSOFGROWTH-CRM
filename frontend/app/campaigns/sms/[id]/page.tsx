import { PageWrapper } from "@/components/layout/PageWrapper"
import { CampaignDetail } from "@/components/campaigns/CampaignDetail"

interface Props {
  params: { id: string }
}

export default function SMSCampaignDetailPage({ params }: Props) {
  return (
    <PageWrapper>
      <CampaignDetail campaignId={params.id} />
    </PageWrapper>
  )
}
