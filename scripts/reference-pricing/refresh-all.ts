/**
 * The single entrypoint for "refresh reference prices from every legally
 * available source" (Step 5 - "automatic refresh"). Runs, in order:
 *
 *   1. migrate-legacy-snapshots  - re-syncs from lib/cashify_prices.json
 *   2. import-brand-snapshots    - re-syncs from every per-brand snapshot
 *                                  file already in the repo
 *   3. export-cashify-prices     - regenerates the verification/metadata
 *                                  export from the resulting store
 *
 * This is genuinely re-runnable and automatable: dropping a new or updated
 * snapshot file into a brand folder (however it was legally obtained) and
 * re-running this script picks it up, safely (never regresses a newer
 * verified price to an older one - see the ordering fix in ingestion.ts),
 * without needing to decide the live-scraping legal question.
 *
 * Suitable for a cron entry / Render scheduled job / manual `npm run
 * reference-prices:refresh-all` whenever new source data is obtained. Not
 * currently wired to an actual scheduler, since there is no live source to
 * schedule against yet - see PRICING_REFERENCE_DATA_ARCHITECTURE.md.
 *
 * Run: npx tsx scripts/reference-pricing/refresh-all.ts
 */
import { execSync } from 'child_process';
import path from 'path';

const scripts = [
  'migrate-legacy-snapshots.ts',
  'import-brand-snapshots.ts',
  'export-cashify-prices.ts',
];

for (const script of scripts) {
  const fullPath = path.join(__dirname, script);
  console.log(`\n=== Running ${script} ===`);
  // execSync (shell: true under the hood) rather than execFileSync('npx', ...)
  // - on Windows, npx resolves to npx.cmd, which execFileSync cannot invoke
  // directly without a shell.
  execSync(`npx tsx "${fullPath}"`, { stdio: 'inherit', cwd: process.cwd() });
}

console.log('\n=== refresh-all complete ===');
