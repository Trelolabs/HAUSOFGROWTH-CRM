-- Recipients that were wrongly marked FAILED by an internal DB/connection-pool
-- timeout during status persistence. Resend had already accepted (sent) these
-- emails — only the follow-up write to the database failed and the raw ORM
-- error leaked into `errorMessage` (e.g. "Invalid `prisma.campaignRecipient
-- .update()` invocation: Timed out fetching a new connection from the pool").
--
-- Restore them to SENT and clear the internal error text so the UI shows the
-- correct outcome. Genuine provider failures (invalid address, complaint,
-- bounce, etc.) are left untouched.
UPDATE "CampaignRecipient"
SET "status"       = 'SENT',
    "errorMessage" = NULL,
    "sentAt"       = COALESCE("sentAt", "createdAt")
WHERE "status" = 'FAILED'
  AND (
       "errorMessage" ILIKE '%invocation%'
    OR "errorMessage" ILIKE '%connection pool%'
    OR "errorMessage" ILIKE '%prisma.%'
    OR "errorMessage" ILIKE '%Timed out%'
  );

-- Reconcile the campaign aggregate counters with the corrected per-recipient
-- statuses (recipient rows are the source of truth).
UPDATE "Campaign" c SET
  "sentCount"    = sub.sent,
  "failedCount"  = sub.failed,
  "bouncedCount" = sub.bounced
FROM (
  SELECT "campaignId",
    COUNT(*) FILTER (WHERE status = 'SENT')    AS sent,
    COUNT(*) FILTER (WHERE status = 'FAILED')  AS failed,
    COUNT(*) FILTER (WHERE status = 'BOUNCED') AS bounced
  FROM "CampaignRecipient"
  GROUP BY "campaignId"
) sub
WHERE c.id = sub."campaignId";
