/**
 * Learns which questions Cashify's public questionnaire asks per MODEL
 * (warranty / GST bill / age) and stores them in CashifyQuestionnaireProfile.
 * Separate from the weekly price refresh so that one stays fast: known,
 * recent (<30 days), OK profiles are reused; only new, UNKNOWN/failed, stale
 * or parser-changed models are fetched.
 *
 * Never logs in, never submits answers, never requests a quote.
 *
 *   npm run reference-prices:refresh-questionnaire -- --limit 20 --dry-run
 *   npm run reference-prices:refresh-questionnaire -- --models "Apple|Apple iPhone 13;Samsung|Samsung Galaxy S24 5G"
 *
 * Flags: --limit N (models to learn), --brand B, --models "Brand|Model;...",
 * --dry-run (no writes), --force (ignore freshness), --variants-per-model N
 * (default 2), --concurrency N (default 2), --json <file> (write the report).
 */
import 'dotenv/config';
import fs from 'fs';
import { loadRefreshCatalog, buildCashifyLinkIndex } from '../../lib/referencePricing/catalog';
import { createCashifyUrlResolver, loadCashifyUrlDictionary } from '../../lib/referencePricing/sources/cashifyUrlResolver';
import { getQuestionnaireProfileStore, disconnectReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { runQuestionnaireRefresh } from '../../lib/referencePricing/questionnaire/refreshJob';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { readCashifyQuestionnairePage } from '../../server/modules/quote/cashifyQuestionnaireSnapshot';
import { closeCashifyBrowser } from '../../server/modules/quote/cashifyScraper';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const catalog = loadRefreshCatalog();
  let devices = catalog.entries.map((e) => e.device);
  const brand = arg('brand');
  if (brand) devices = devices.filter((d) => d.brand.toLowerCase() === brand.toLowerCase());
  const models = arg('models');
  if (models) {
    const wanted = new Set(models.split(';').map((m) => m.trim()).filter(Boolean).map((m) => {
      const [b, ...rest] = m.split('|');
      return questionnaireModelKey({ brand: b, model: rest.join('|') });
    }));
    devices = devices.filter((d) => wanted.has(questionnaireModelKey(d)));
  }

  const dryRun = flag('dry-run');
  const store = dryRun ? new InMemoryQuestionnaireProfileStore() : getQuestionnaireProfileStore();
  const resolver = createCashifyUrlResolver({ curatedLinks: buildCashifyLinkIndex(catalog.entries), dictionary: loadCashifyUrlDictionary() });

  const started = Date.now();
  const report = await runQuestionnaireRefresh({
    devices,
    store,
    resolveUrl: (d) => resolver(d).url,
    fetchPageText: (device, url) => readCashifyQuestionnairePage(url, device.storage),
    limit: arg('limit') ? Number(arg('limit')) : undefined,
    force: flag('force'),
    dryRun,
    variantsPerModel: arg('variants-per-model') ? Number(arg('variants-per-model')) : 2,
    concurrency: arg('concurrency') ? Number(arg('concurrency')) : 2,
    log: (line) => console.log(line),
  });

  console.log('\n=== FHONEIFY CASHIFY QUESTIONNAIRE PROFILE REFRESH ===');
  console.log(JSON.stringify({
    dryRun, catalogModels: report.models, reused: report.reused, refreshed: report.refreshed,
    byReason: report.byReason, outcome: report.outcome, asks: report.asks, historyRowsAdded: report.changed,
    minutes: Number(((Date.now() - started) / 60000).toFixed(1)),
  }, null, 2));
  const out = arg('json');
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const failed = (report.outcome.FETCH_FAILED ?? 0) + (report.outcome.PARSE_FAILED ?? 0);
  process.exitCode = report.refreshed > 0 && failed === report.refreshed ? 1 : 0;
}

main()
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeCashifyBrowser();
    await disconnectReferencePriceRepository();
    // Playwright/pino handles can keep the event loop alive after the work is
    // done; the exit code is already set, so leave once everything is closed.
    setTimeout(() => process.exit(), 2000).unref();
  });
