import fs from 'node:fs';
import { FINAL_MEASUREMENTS_FILE } from '../pricing-evidence/import-final-data';
/**
 * Offline production-route reconciliation of every complete supplied iPhone quote (earlier collection + 2026-10-28 import), through the
 * quote service configured as in production. Served iPhone quotes come from the calibrated rules, so this is IN-SAMPLE reconciliation of the
 * fitted rules (held-out figures: scripts/pricing-evidence/validate-new-data.ts). No database connections.
 *
 * Asserted: the approved arithmetic round(C + min(R x tier(R), 2000)) on every priced quote; how many quotes are priced; how close the
 * Cashify-equivalent is to the recorded base price. The residuals above INR 300 are listed, never hidden.
 */
import assert from 'node:assert/strict';
import { replayService } from '../pricing-evidence/replay-service';
import { hasUnknownInput, loadMeasurements } from '../pricing-evidence/evidenceLib';

(async () => {
  const all = loadMeasurements().filter(m => !hasUnknownInput(m) && m.outcome === 'NUMERIC_QUOTE' && m.base != null);
  // Preserve the original fixed-cohort gate, including its absolute 80-row
  // limit. The final intake receives the same rate/MAE gates independently;
  // its absolute residual budget scales by cohort size, never by fit results.
  const ms = all.filter(m => !m.family.startsWith('final_'));
  const finalMs = all.filter(m => m.family.startsWith('final_'));
  assert.equal(ms.length + finalMs.length, all.length, 'every complete observation belongs to a tested cohort');
  const rows = await replayService(ms);
  const priced = rows.filter(r => r.ok);
  const abs = priced.map(r => Math.abs(r.error!));
  const share = (f: (x: number) => boolean) => abs.filter(f).length / abs.length;
  const large = priced.filter(r => Math.abs(r.error!) > 300).map(r => `${r.m.model_key} ${r.m.storage_gb} ${r.m.observed_date} ${r.m.deviations.join(' ')} ${r.error! > 0 ? '+' : ''}${r.error}`);
  const summary = { cases: rows.length, priced: priced.length, inspection: rows.length - priced.length, within20: share(x => x <= 20), within100: share(x => x <= 100),
    mae: abs.reduce((a, b) => a + b, 0) / abs.length, above300: large.length };
  console.log(JSON.stringify(summary));
  console.log(large.join('\n'));
  assert.ok(rows.length > 6800, `cases ${rows.length}`);
  assert.deepEqual(priced.filter(r => r.price !== r.expectedPrice).map(r => `${r.m.model_key} ${r.price} vs ${r.expectedPrice}`), [], 'approved reference-bonus arithmetic');
  // Only Cashify's own contradictory outcomes go to inspection: calls failure with other faults, ten or more simultaneous faults.
  assert.ok(rows.filter(r => !r.ok).every(r => r.code === 'MANUAL_INSPECTION_REQUIRED' && (r.m.deviations.includes('Q01') || r.m.deviations.filter(d => d.startsWith('F')).length >= 10)),
    'nothing else is sent to inspection');
  assert.ok(summary.within20 >= 0.95 && summary.within100 >= 0.975 && summary.mae <= 30, JSON.stringify(summary));
  assert.ok(large.length <= 80, `${large.length} residuals above INR 300`);
  if (!fs.existsSync(FINAL_MEASUREMENTS_FILE)) {
    console.log('SKIP private final-intake cohort: owner-supplied quote corpus is not published; original cohort passed');
    return;
  }
  const finalRows = await replayService(finalMs);
  const finalPriced = finalRows.filter(r => r.ok);
  const finalAbs = finalPriced.map(r => Math.abs(r.error!));
  const finalShare = (limit: number) => finalAbs.filter(x => x <= limit).length / finalAbs.length;
  const finalSummary = { cases: finalRows.length, priced: finalPriced.length, inspection: finalRows.length - finalPriced.length,
    within20: finalShare(20), within100: finalShare(100), mae: finalAbs.reduce((a, b) => a + b, 0) / finalAbs.length,
    above300: finalAbs.filter(x => x > 300).length, allowedAbove300: Math.floor(80 * finalMs.length / ms.length) };
  console.log('final cohort', JSON.stringify(finalSummary));
  assert.ok(finalMs.length > 3500, 'the final intake must be included');
  assert.equal(finalSummary.inspection, 0, 'all payable final intake conditions remain priced');
  assert.ok(finalPriced.every(r => r.price === r.expectedPrice), 'final intake uses the same approved reference bonus');
  assert.ok(finalSummary.within20 >= .95 && finalSummary.within100 >= .975 && finalSummary.mae <= 30, JSON.stringify(finalSummary));
  assert.ok(finalSummary.above300 <= finalSummary.allowedAbove300, JSON.stringify(finalSummary));
  console.log('service reconciliation passed: original and final cohorts');
})().catch(e => { console.error(e); process.exitCode = 1; });
