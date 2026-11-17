import assert from 'node:assert/strict';
import { priceDevice } from '../../lib/pricing/engine';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { SEED_DEVICES } from '../../lib/seed_devices';

/**
 * Measured age rules mix fixed and percentage forms (Samsung F34/M14/M15: fixed 3-6 and 6-11 months,
 * percentage above 11). On a low reference the older bracket could pay more. The runner model must keep
 * every older bracket at or below a younger one, for every measured phone and reference.
 */
const ages = ['below3', '3to6', '6to11', 'above11'] as const;
const profile = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'ASKED' } as const;
let checked = 0;
for (const d of SEED_DEVICES as any[]) {
  const scope = runnerScope(d.model, d.storage);
  if (!scope?.hasAge) continue;
  for (const R of [2500, 3000, 4000, 8000, 30000]) {
    const prices = ages.map(mobileAge => {
      try {
        return priceDevice(d.brand, d.model, R, { ...clean, warranty: true, validBill: true, mobileAge } as any, profile as any, d.storage).cashifyConditionEquivalent;
      } catch { return null; }
    });
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] == null || prices[i - 1] == null) continue;
      assert.ok(prices[i]! <= prices[i - 1]!, `${d.model} ${d.storage} R=${R}: ${ages[i]} pays more than ${ages[i - 1]} (${prices.join('/')})`);
    }
    checked++;
  }
}
assert.ok(checked > 20, `checked ${checked} aged runner cases`);
console.log(`PASS older age never pays more on ${checked} measured phone/reference cases`);
