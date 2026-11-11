/** Local QA only: real controller/service, injected read-only private reference
 * fixtures, unreachable database, no auth or lead endpoints. */
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { deviceKey } from '../../lib/referencePricing/types';

Object.assign(process.env, { DATABASE_URL: 'postgresql://offline:offline@127.0.0.1:1/none', DIRECT_URL: 'postgresql://offline:offline@127.0.0.1:1/none',
  NODE_ENV: 'test', JWT_SECRET: 'runner-browser-local-only-jwt-secret-32', QUOTE_SIGNING_SECRET: 'runner-browser-local-only-quote-secret-32', LOG_LEVEL: 'silent' });
(async () => {
  const refs = new Map<string, any>();
  for (const dir of ['nothing-2026-11-08', 'oneplus-2026-11-09']) {
    const rows = fs.readFileSync(`data/pricing-evidence/${dir}/measurements.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    for (const row of rows.filter(r => r.caseId === 'baseline')) refs.set(deviceKey(row), { brand: row.brand, model: row.model, storage: row.storage,
      deviceKey: deviceKey(row), currentPrice: row.reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: new Date().toISOString() });
  }
  const { getReferencePriceRepository, getQuestionnaireProfileStore } = await import('../../lib/referencePricing/getStore');
  getReferencePriceRepository().get = async key => refs.get(key) ?? null;
  getQuestionnaireProfileStore().get = async () => null;
  const { priceQuote } = await import('../../server/modules/quote/controller');
  const app = express(); app.use(cors()); app.use(express.json());
  app.post('/api/quote/price', priceQuote);
  app.listen(5310, '127.0.0.1', () => console.log('Read-only runner browser QA controller ready on 5310'));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
