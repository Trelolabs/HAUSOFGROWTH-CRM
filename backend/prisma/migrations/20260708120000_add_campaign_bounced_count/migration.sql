-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "bouncedCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: reconcile aggregate counters with the per-recipient statuses
-- (source of truth). Previously bounces stayed inside sentCount and there was
-- no bouncedCount, so historical campaigns drifted. This recomputes all three.
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
