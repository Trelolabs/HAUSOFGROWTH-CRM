/**
 * One-off reconciliation for the "bounced in Resend but FAILED in the CRM" bug.
 *
 * Two things to repair from the era before the webhook fix:
 *
 *  1. Rows stuck at FAILED because a transient `email.delivery_delayed` event
 *     flipped them there, after which the later `email.bounced` (or delivery)
 *     event could not correct them. These are identifiable by their
 *     errorMessage `Resend event: email.delivery_delayed`.
 *
 *  2. Campaign aggregate counters (sentCount / failedCount / bouncedCount) that
 *     drifted out of sync with the per-recipient rows while (1) was happening.
 *
 * The script ALWAYS recomputes campaign counters from the recipient rows (the
 * source of truth) — that is safe and idempotent. Reclassifying the stuck rows
 * is opt-in because we cannot know per-row from the DB alone whether a delayed
 * mail ultimately delivered or bounced.
 *
 * Usage (from backend/):
 *   npx ts-node src/scripts/reconcile-resend-statuses.ts                 # dry run, report only
 *   npx ts-node src/scripts/reconcile-resend-statuses.ts --apply         # fix counters only
 *   npx ts-node src/scripts/reconcile-resend-statuses.ts --apply --reclassify=BOUNCED
 *   npx ts-node src/scripts/reconcile-resend-statuses.ts --apply --reclassify=SENT
 */
import { prisma } from '../config/db'
import { RecipientStatus } from '../types/prisma'

const DELAY_MARK = 'Resend event: email.delivery_delayed'

function parseArgs() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const reclassifyArg = args.find((a) => a.startsWith('--reclassify='))
  const reclassify = reclassifyArg?.split('=')[1] as
    | 'BOUNCED'
    | 'SENT'
    | undefined
  if (reclassify && reclassify !== 'BOUNCED' && reclassify !== 'SENT') {
    throw new Error('--reclassify must be BOUNCED or SENT')
  }
  return { apply, reclassify }
}

async function main() {
  const { apply, reclassify } = parseArgs()
  console.log(
    `[reconcile] mode=${apply ? 'APPLY' : 'DRY-RUN'} reclassify=${reclassify ?? 'none'}`
  )

  // ── Step 1: report the rows stuck by the delay bug ────────────────────────
  const stuck = await prisma.campaignRecipient.findMany({
    where: { status: RecipientStatus.FAILED, errorMessage: DELAY_MARK },
    select: { id: true, campaignId: true, email: true },
  })
  console.log(`[reconcile] delay-stuck FAILED rows found: ${stuck.length}`)

  if (stuck.length && reclassify) {
    const ids = stuck.map((r) => r.id)
    if (apply) {
      await prisma.campaignRecipient.updateMany({
        where: { id: { in: ids } },
        data: {
          status: RecipientStatus[reclassify],
          errorMessage:
            reclassify === 'SENT' ? null : `Reconciled from delayed → ${reclassify}`,
        },
      })
      console.log(`[reconcile] reclassified ${ids.length} rows → ${reclassify}`)
    } else {
      console.log(
        `[reconcile] would reclassify ${ids.length} rows → ${reclassify} (dry run)`
      )
    }
  } else if (stuck.length) {
    console.log(
      '[reconcile] pass --reclassify=BOUNCED or --reclassify=SENT to move these rows'
    )
  }

  // ── Step 2: recompute every campaign's counters from its recipient rows ────
  const grouped = await prisma.campaignRecipient.groupBy({
    by: ['campaignId', 'status'],
    _count: { _all: true },
  })

  const totals = new Map<
    string,
    { sentCount: number; failedCount: number; bouncedCount: number }
  >()
  for (const g of grouped) {
    const t =
      totals.get(g.campaignId) ??
      { sentCount: 0, failedCount: 0, bouncedCount: 0 }
    if (g.status === RecipientStatus.SENT) t.sentCount = g._count._all
    else if (g.status === RecipientStatus.FAILED) t.failedCount = g._count._all
    else if (g.status === RecipientStatus.BOUNCED) t.bouncedCount = g._count._all
    totals.set(g.campaignId, t)
  }

  let drifted = 0
  for (const [campaignId, t] of totals) {
    const current = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sentCount: true, failedCount: true, bouncedCount: true },
    })
    if (!current) continue
    const changed =
      current.sentCount !== t.sentCount ||
      current.failedCount !== t.failedCount ||
      current.bouncedCount !== t.bouncedCount
    if (!changed) continue
    drifted += 1
    console.log(
      `[reconcile] campaign ${campaignId}: ` +
        `sent ${current.sentCount}->${t.sentCount}, ` +
        `failed ${current.failedCount}->${t.failedCount}, ` +
        `bounced ${current.bouncedCount}->${t.bouncedCount}`
    )
    if (apply) {
      await prisma.campaign.update({ where: { id: campaignId }, data: t })
    }
  }
  console.log(
    `[reconcile] campaigns with drifted counters: ${drifted}` +
      (apply ? ' (fixed)' : ' (dry run)')
  )
  console.log('[reconcile] done')
}

main()
  .catch((err) => {
    console.error('[reconcile] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
