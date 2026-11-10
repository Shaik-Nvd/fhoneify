import { referenceBonus } from '../../lib/pricing/referenceBonus';
/**
 * Every supplied iPhone quote (earlier collection + 2026-10-28 import) through the PRODUCTION quote service as configured in
 * config/pricing-release.json, at the reference recorded with the quote. In-sample reconciliation of the served path, not a held-out
 * validation. Checks, per quote: the Cashify-equivalent against the recorded base price, and the final offer against the approved
 * arithmetic round(C + min(R x tier(R), 1000)) (INR 100 floor). No database or network.
 *
 *   npx tsx scripts/pricing-evidence/replay-service.ts [--out=<jsonl>]
 */
import fs from 'node:fs';
import { createPricingService } from '../../lib/pricing/pricingService';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';
import { existingExactFinalQuoteIndex } from '../pricing/exact-final-quote-evidence';
import { deviceKey } from '../../lib/referencePricing/types';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { storageGbOf } from '../../lib/pricing/appleCashifyModel/scope';
import { hasUnknownInput, loadMeasurements, stats, toDiagnostics, type Measurement } from './evidenceLib';
import { groupOf } from './replay-new-data';

export interface ServiceRow { m: Measurement; ok: boolean; code?: string; equivalent?: number; price?: number; expectedPrice?: number; error?: number }

export async function replayService(ms: Measurement[], at = new Date('2026-10-28T12:00:00Z')): Promise<ServiceRow[]> {
  let reference = 0;
  const repo: any = { async get(key: string) { const d = (SEED_DEVICES as any[]).find(x => deviceKey(x) === key); return { ...d, deviceKey: key, currentPrice: reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: at }; } };
  const cfg = resolvePricingReleaseConfig();
  // the questions Cashify showed for THIS quote (a model's reports differ: the iPhone 14 reports of 17 Oct recorded a warranty answer, later ones none)
  let shown: { warrantyMode: string; billMode: string; ageMode: string } | null = null;
  const svc = createPricingService({
    repository: repo, signingSecret: 'release-offline-only-secret-at-least-32-chars', now: () => at, tokenTtlSeconds: 900, strictReferenceMode: true,
    referenceLookupTimeoutMs: 100, snapshot: {}, questionnaireStore: { async get() { return shown; } } as any,
    pricingMode: cfg.mode, releaseRouteEvidence: loadReleaseRouteEvidence(cfg.routeEvidenceFile ?? undefined),
    exactFinalQuoteIndex: cfg.exactFinalQuoteCache ? existingExactFinalQuoteIndex() : undefined, exactFinalQuoteOfferPolicy: cfg.exactFinalQuoteOfferPolicy,
    logger: { info() {}, warn() {}, error() {} },
  });
  const out: ServiceRow[] = [];
  for (const m of ms) {
    const d = (SEED_DEVICES as any[]).find(x => x.brand === 'Apple' && x.model === `Apple ${m.model_key}` && storageGbOf(x.storage) === m.storage_gb);
    if (!d) continue;
    reference = m.variant_get_upto;
    const mode = (v: string) => (v === 'not_asked' || v === 'not_shown' ? 'NOT_ASKED' : 'ASKED');
    shown = { warrantyMode: mode(m.inputs.warranty.value), billMode: mode(m.inputs.bill.value), ageMode: mode(String(m.inputs.age.value)) };
    const q = await svc.quote({ brand: d.brand, model: d.model, storage: d.storage, diagnostics: toDiagnostics(m, 'none') });
    if (!q.ok) { out.push({ m, ok: false, code: q.code }); continue; }
    const equivalent = q.internal.cashifyConditionEquivalent + (q.internal.payoutCeiling.equivalentBasis === 'selling' ? 20 : 0);
    const expectedPrice = Math.max(100, Math.round(q.internal.cashifyConditionEquivalent + referenceBonus(reference)));
    out.push({ m, ok: true, equivalent, price: q.fhoneifyPrice, expectedPrice, error: m.base == null ? undefined : equivalent - m.base });
  }
  return out;
}

if (require.main === module) {
  (async () => {
    const ms = loadMeasurements().filter(m => !hasUnknownInput(m) && m.outcome === 'NUMERIC_QUOTE' && m.base != null);
    const rows = await replayService(ms);
    const priced = rows.filter(r => r.ok);
    const abs = priced.map(r => Math.abs(r.error!));
    const s = stats(abs);
    const arithmetic = priced.filter(r => r.price !== r.expectedPrice);
    const summary = (rs: ServiceRow[]) => {
      const p = rs.filter(r => r.ok); const a = p.map(r => Math.abs(r.error!)); const st = stats(a);
      return `n=${rs.length} priced=${p.length} inspection=${rs.length - p.length} MAE=${Math.round(st.mean)} med=${st.median} p90=${st.p90} max=${st.max} <=20:${(100 * a.filter(x => x <= 20).length / Math.max(1, a.length)).toFixed(1)}% <=100:${(100 * a.filter(x => x <= 100).length / Math.max(1, a.length)).toFixed(1)}%`;
    };
    console.log(`service replay: ${summary(rows)}; bonus arithmetic mismatches ${arithmetic.length}`);
    const by = new Map<string, ServiceRow[]>();
    for (const r of rows) { const k = r.m.model_key; (by.get(k) ?? by.set(k, []).get(k)!).push(r); }
    for (const [k, rs] of [...by].sort()) console.log(`  ${k.padEnd(26)} ${summary(rs)}`);
    const g = new Map<string, ServiceRow[]>();
    for (const r of rows) { const k = groupOf(r.m); (g.get(k) ?? g.set(k, []).get(k)!).push(r); }
    for (const [k, rs] of [...g].sort()) console.log(`  [${k}]`.padEnd(28) + ' ' + summary(rs));
    void s;
    const outArg = process.argv.find(a => a.startsWith('--out='))?.split('=')[1];
    if (outArg) fs.writeFileSync(outArg, rows.map(r => JSON.stringify({ id: r.m.measurement_id, source: `${r.m.archive}::${r.m.member}::${r.m.case_id}`, model: r.m.model_key, storage: r.m.storage_gb, date: r.m.observed_date, deviations: r.m.deviations, reference: r.m.variant_get_upto, observed: r.m.base, ok: r.ok, code: r.code ?? null, equivalent: r.equivalent ?? null, error: r.error ?? null, price: r.price ?? null })).join('\n') + '\n');
    if (arithmetic.length) process.exitCode = 1;
  })();
}
