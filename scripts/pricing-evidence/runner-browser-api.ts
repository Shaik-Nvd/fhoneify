/** Local QA only: real controller/service, injected read-only private reference
 * fixtures, unreachable database, no auth or lead endpoints. */
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { deviceKey } from '../../lib/referencePricing/types';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { modelKey } from '../../lib/pricing/cashifyRunnerModel/model';
import { runnerStorageIdentity } from '../../lib/pricing/cashifyRunnerModel/identity';

Object.assign(process.env, { DATABASE_URL: 'postgresql://offline:offline@127.0.0.1:1/none', DIRECT_URL: 'postgresql://offline:offline@127.0.0.1:1/none',
  NODE_ENV: 'test', JWT_SECRET: 'runner-browser-local-only-jwt-secret-32', QUOTE_SIGNING_SECRET: 'runner-browser-local-only-quote-secret-32', LOG_LEVEL: 'silent' });
(async () => {
  const refs = new Map<string, any>();
  for (const dir of ['nothing-2026-11-08', 'oneplus-2026-11-09','samsung-2026-11-12','google-2026-11-11']) {
    if(!fs.existsSync(`data/pricing-evidence/${dir}/measurements.jsonl`))continue;
    const rows = fs.readFileSync(`data/pricing-evidence/${dir}/measurements.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    for (const row of rows.filter(r => r.status==='quoted'&&r.primary!==false)) {
      const device=SEED_DEVICES.find(d=>d.brand===row.brand&&modelKey(d.model)===modelKey(row.model)&&runnerStorageIdentity(d.storage,d.ram)===runnerStorageIdentity(row.storage));
      if(!device)continue;
      refs.set(deviceKey(device),{brand:device.brand,model:device.model,storage:device.storage,deviceKey:deviceKey(device),currentPrice:row.reference,
        source:'cashify',status:'fresh',matchConfidence:'exact',lastVerifiedAt:new Date().toISOString()});
    }
  }
  const { getReferencePriceRepository, getQuestionnaireProfileStore } = await import('../../lib/referencePricing/getStore');
  getReferencePriceRepository().get = async key => refs.get(key) ?? null;
  getQuestionnaireProfileStore().get = async () => null;
  const { priceQuote } = await import('../../server/modules/quote/controller');
  const app = express(); app.use(cors()); app.use(express.json());
  app.post('/api/quote/price', priceQuote);
  const port=Number(process.env.RUNNER_QA_PORT??5310);
  app.listen(port, '127.0.0.1', () => console.log(`Read-only runner browser QA controller ready on ${port}`));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
