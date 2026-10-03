/**
 * Claude-owned diagnostic (database-free): does removing the legacy box bonus
 * fix or worsen clean-baseline error, by exact variant and route regime?
 * Uses only clean, box(+charger)-present verified observations from the
 * committed observation fixture; excluded/uncertain rows are skipped.
 *   npx tsx scripts/pricing/claude-accessory-ablation.ts
 */
import fs from 'fs';
import f from './fixtures/release-candidate-observations-2026-10-02.json';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';
import { conditionClass } from '../../lib/pricing/releaseCandidate';
import { withoutBoxBonus, hasBox } from '../../lib/pricing/accessoryBasis';

const rows: any[] = [];
for (const o of (f as any).observations) {
  if (o.excluded || o.evaluationRole === 'EXCLUDED' || o.status === 'EXCLUDED') continue;
  if (conditionClass(o.diagnostics) !== 'clean' || !hasBox(o.diagnostics)) continue;
  const sem: any = { warrantyMode: o.route.warranty, billMode: o.route.validBill, ageMode: o.route.mobileAge };
  const withBonus = calculateFhoneifyPrice(o.brand, o.model, o.getUpto, o.diagnostics, sem).cashifyConditionEquivalent;
  const noBonus = calculateFhoneifyPrice(o.brand, o.model, o.getUpto, withoutBoxBonus(o.diagnostics), sem).cashifyConditionEquivalent;
  const regime = `${o.route.warranty}/${o.route.validBill}/${o.route.mobileAge} charger:${o.route.charger}`;
  rows.push({ id: o.id, variant: `${o.brand} ${o.model} ${o.storage}`, regime, getUpto: o.getUpto, observed: o.observed,
    observedMinusGetUpto: o.observed - o.getUpto, errWithBonus: withBonus - o.observed, errWithoutBonus: noBonus - o.observed });
}
const groups: Record<string, any[]> = {};
for (const r of rows) (groups[`${r.regime} | ${r.variant}`] ??= []).push(r);
const summary = Object.entries(groups).map(([k, a]) => ({ key: k, n: a.length, observedMinusGetUpto: [...new Set(a.map((r) => r.observedMinusGetUpto))],
  errWithBonus: [...new Set(a.map((r) => r.errWithBonus))], errWithoutBonus: [...new Set(a.map((r) => r.errWithoutBonus))],
  verdict: a.every((r) => Math.abs(r.errWithoutBonus) < Math.abs(r.errWithBonus)) ? 'REMOVAL_HELPS' : a.every((r) => Math.abs(r.errWithoutBonus) > Math.abs(r.errWithBonus)) ? 'REMOVAL_HURTS (bonus compensates a low baseline)' : 'MIXED' }));
fs.writeFileSync('scripts/pricing/fixtures/claude-accessory-ablation-2026-10-03.json', JSON.stringify({ source: 'release-candidate-observations-2026-10-02.json', rows, summary }, null, 2) + '\n');
for (const s of summary.sort((a, b) => a.key.localeCompare(b.key))) console.log(`${s.key} | n=${s.n} | obs-GU ${s.observedMinusGetUpto} | err+bonus ${s.errWithBonus} | err-bonus ${s.errWithoutBonus} | ${s.verdict}`);
