/**
 * "Is the weekly refresh healthy?" - answered from the command line.
 *
 * Deliberately small (Phase 13 says implement only what is needed to know
 * whether the weekly refresh is healthy, not a dashboard). The same numbers
 * are available over the admin API at GET /api/admin/reference-pricing/status.
 *
 *   npm run reference-prices:status
 */
import 'dotenv/config';
import path from 'path';
import { getReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { classifyFreshness, FRESHNESS_POLICY } from '../../lib/referencePricing/freshnessPolicy';
import { loadRefreshCatalog } from '../../lib/referencePricing/catalog';
import { readRecentRuns } from '../../lib/referencePricing/refreshHealth';

function ago(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const days = ms / 86400000;
  if (days < 1) return `${Math.round(ms / 3600000)}h ago`;
  return `${days.toFixed(1)}d ago`;
}

async function main() {
  const repo = getReferencePriceRepository();
  const records = await repo.listAll();
  const catalog = loadRefreshCatalog();

  const byStatus: Record<string, number> = {
    fresh: 0,
    approaching_stale: 0,
    stale: 0,
    missing: 0,
    refresh_failed: 0,
  };
  let newestVerified: string | null = null;
  let oldestVerified: string | null = null;

  for (const r of records) {
    const status = classifyFreshness({
      lastVerifiedAt: r.lastVerifiedAt,
      consecutiveFailures: r.consecutiveFailures,
    });
    byStatus[status]++;
    if (r.lastVerifiedAt) {
      if (!newestVerified || r.lastVerifiedAt > newestVerified) newestVerified = r.lastVerifiedAt;
      if (!oldestVerified || r.lastVerifiedAt < oldestVerified) oldestVerified = r.lastVerifiedAt;
    }
  }

  console.log('');
  console.log('=== REFERENCE PRICE HEALTH ===');
  console.log(`Catalog devices:        ${catalog.entries.length}`);
  console.log(`Stored records:         ${records.length}`);
  console.log(`  fresh:                ${byStatus.fresh}`);
  console.log(`  approaching stale:    ${byStatus.approaching_stale}`);
  console.log(`  stale:                ${byStatus.stale}`);
  console.log(`  refresh_failed:       ${byStatus.refresh_failed}`);
  console.log(`  missing:              ${byStatus.missing}`);
  console.log(`Newest verified price:  ${ago(newestVerified)}`);
  console.log(`Oldest verified price:  ${ago(oldestVerified)}`);
  console.log(
    `Freshness policy:       warn at ${FRESHNESS_POLICY.warningAgeDays}d, stale at ${FRESHNESS_POLICY.maxAgeDays}d`
  );

  const runs = await readRecentRuns({
    limit: 5,
    filePath: path.join(process.cwd(), 'server', 'data', 'reference-prices', 'refresh-runs.json'),
  });

  console.log('');
  console.log('=== RECENT REFRESH RUNS ===');
  if (runs.length === 0) {
    console.log('No refresh run has been recorded yet.');
  } else {
    for (const run of runs) {
      console.log(
        `${run.startedAt}  ${String(run.status).padEnd(8)}  ${run.source}/${run.trigger}  ` +
          `updated=${run.updatedCount} unchanged=${run.unchangedCount} rejected=${run.rejectedCount} ` +
          `failed=${run.failedCount} missing=${run.missingCount}` +
          (run.error ? `  error=${run.error}` : '')
      );
    }
    const lastSuccess = runs.find((r) => r.status === 'SUCCESS' || r.status === 'PARTIAL');
    console.log('');
    console.log(`Last attempted refresh:  ${ago(runs[0].startedAt)} (${runs[0].status})`);
    console.log(`Last successful refresh: ${lastSuccess ? ago(lastSuccess.startedAt) : 'never'}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
