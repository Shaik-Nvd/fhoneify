/** READ-ONLY: quotes every catalog phone priced by the generic rules through the production service
 * configuration (stored references and questionnaire profiles read from the database). */
import { config } from 'dotenv';
config({ path: process.argv[2], quiet: true } as any);
(async () => {
  const { createPricingService } = await import('../../lib/pricing/pricingService');
  const { getQuestionnaireProfileStore, getReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
  const { SEED_DEVICES } = await import('../../lib/seed_devices');
  const { runnerScope } = await import('../../lib/pricing/cashifyRunnerModel');
  const service = createPricingService({ repository: getReferencePriceRepository(), questionnaireStore: getQuestionnaireProfileStore(), pricingMode: 'hybrid',
    signingSecret: 'audit-only-local-signing-secret-32-chars', tokenTtlSeconds: 900, strictReferenceMode: false, referenceLookupTimeoutMs: 20000, logger: { info() {}, warn() {}, error() {} } } as any);
  const devices = (SEED_DEVICES as any[]).filter(d => d.brand && d.brand !== 'Apple' && !runnerScope(d.model));
  const cases: Record<string, object> = { perfect: {}, wifi: { hardware: ['wifi'] }, cracked: { screenCondition: 'Screen cracked/ glass broken', defects: ['screen_scratch'] }, noBox: { accessories: ['charger'] }, age6to11: { mobileAge: '6to11' } };
  const codes: Record<string, number> = {}; let ok = 0, perfectAtGetUpto = 0, n = 0; const odd: string[] = [];
  for (const d of devices) for (const [name, edit] of Object.entries(cases)) {
    const q: any = await service.quote({ brand: d.brand, model: d.model, storage: d.storage, diagnostics: { calls: true, touch: true, originalScreen: true, defects: [], hardware: [], accessories: ['box', 'charger'], warranty: true, validBill: true, mobileAge: 'below3', ...edit } });
    n++;
    if (!q.ok) { codes[q.code] = (codes[q.code] ?? 0) + 1; continue; }
    ok++;
    if (name === 'perfect') { if (q.fhoneifyPrice === q.startingPrice) perfectAtGetUpto++; else odd.push(`${d.model} ${d.storage} perfect ${q.fhoneifyPrice} vs Get Upto ${q.startingPrice}`); }
  }
  console.log(JSON.stringify({ devices: devices.length, quotes: n, ok, refusals: codes, perfectEqualsGetUpto: perfectAtGetUpto }));
  console.log(odd.slice(0, 10).join('\n'));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
