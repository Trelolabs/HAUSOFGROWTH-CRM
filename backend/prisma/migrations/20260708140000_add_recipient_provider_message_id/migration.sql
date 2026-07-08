-- Store Resend's email_id per recipient so provider webhooks (bounced /
-- delivered / complained) can be matched to the exact row instead of guessing
-- by email address, which is ambiguous across campaigns and re-sends.
ALTER TABLE "CampaignRecipient" ADD COLUMN "providerMessageId" TEXT;

-- Unique because a Resend email_id maps to exactly one recipient send.
-- NULLs are allowed for historical rows and non-email (SMS) recipients.
CREATE UNIQUE INDEX "CampaignRecipient_providerMessageId_key"
  ON "CampaignRecipient"("providerMessageId");
