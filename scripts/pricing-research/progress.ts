/**
 * Read-only progress report for the Cashify pricing-research campaign.
 * Never claims, collects, or writes anything - safe to run at any time,
 * including from a GitHub Actions step that only wants to print a summary.
 *
 *   npm run research:progress -- --brand Samsung --expected 450
 */
import 'dotenv/config';
import { getResearchStore } from '../../lib/researchPricing/getResearchStore';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const brand = arg('brand');
  const model = arg('model');
  const expected = arg('expected') ? Number(arg('expected')) : undefined;
  const avgSecondsPerExperiment = arg('avg-seconds') ? Number(arg('avg-seconds')) : 25;

  const store = getResearchStore();
  const progress = await store.getProgress({ brandFilter: brand, modelFilter: model });
  const remaining = progress.pending + progress.inProgress;
  const estimatedSecondsRemaining = remaining * avgSecondsPerExperiment;

  const report = {
    filter: { brand: brand ?? 'ALL', model: model ?? 'ALL' },
    ...progress,
    remaining,
    expectedTotal: expected,
    estimatedMinutesRemaining: Math.round(estimatedSecondsRemaining / 60),
  };

  console.log('=== CASHIFY RESEARCH CAMPAIGN PROGRESS ===');
  console.log(JSON.stringify(report, null, 2));

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const fs = await import('fs');
    const lines = [
      '## Cashify pricing research progress',
      `Filter: brand=${report.filter.brand}, model=${report.filter.model}`,
      '',
      '| status | count |',
      '|---|---|',
      `| total | ${progress.total} |`,
      `| pending | ${progress.pending} |`,
      `| in progress | ${progress.inProgress} |`,
      `| completed | ${progress.completed} |`,
      `| unsupported | ${progress.unsupported} |`,
      `| auth required | ${progress.authRequired} |`,
      `| failed | ${progress.failed} |`,
      '',
      `Remaining: ${remaining} (~${report.estimatedMinutesRemaining} min at ${avgSecondsPerExperiment}s/experiment)`,
    ];
    fs.appendFileSync(summaryPath, lines.join('\n') + '\n');
  }

  await store.disconnect();
}

main()
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(), 1500).unref();
  });
