/**
 * Rules learned from the final team intake (2026-10-30). Code-level regressions: they read only the committed calibration and
 * synthetic profiles, never the private quote corpus, so they run on any checkout.
 *
 *   npx tsx scripts/test/pricing.final-iphone-rules.test.ts
 */
import assert from 'node:assert/strict';
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import calibration from '../../lib/pricing/appleCashifyModel/calibration.json';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { nearestCodeSource, releaseYear } from '../pricing-evidence/fitCalibration';
import type { ModelProfile } from '../../lib/pricing/appleCashifyModel/model';

let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n     ${(e as Error).message}`); }
}
const clean = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['box'], box: true, warranty: true, validBill: true, mobileAge: 'below3' } as any;
const price = (model: string, gb: number, reference: number, d: any) => {
  const q = appleEvidenceQuote(model, `${gb}GB`, reference, d);
  assert.ok(q, `${model} ${gb}GB must be priced by the calibrated rules`);
  assert.equal(q!.source, 'model', 'served quotes come from the rules, never a recorded price');
  return q!.outcome.price;
};
const deduction = (model: string, gb: number, reference: number, d: any) => price(model, gb, reference, clean) - price(model, gb, reference, { ...clean, ...d });
const profile = (modelKey: string, codes: ModelProfile['codes']): ModelProfile => ({ modelKey, codes } as unknown as ModelProfile);

(async () => {
  await test('an unmeasured code comes from the nearest sibling by value and launch year; fixed repairs stay rupees, fractions stay fractions', () => {
    const typical = new Map([['iPhone 17 Pro', 100000], ['iPhone 16 Pro', 90000], ['iPhone 16 Pro Max', 100000], ['iPhone 12', 100000]]);
    const profiles = [
      profile('iPhone 16 Pro', { F02: { kind: 'fixed', value: 8000, support: 'measured', n: 3 }, F05: { kind: 'pct', value: 0.3, support: 'measured', n: 3 } }),
      // same reference but launched five years earlier: the year term must keep it from winning over a same-generation sibling
      profile('iPhone 12', { F02: { kind: 'fixed', value: 2500, support: 'measured', n: 3 } }),
      profile('iPhone 16 Pro Max', { F02: { kind: 'fixed', value: 9000, support: 'inferred', n: 0 } }),
      profile('iPhone 17 Pro', {}),
    ];
    const cam = nearestCodeSource(profiles, typical, 'iPhone 17 Pro', 'F02')!;
    assert.equal(cam.support, 'inferred');
    assert.equal(cam.kind, 'fixed');
    assert.match(cam.basis!, /iPhone 16 Pro$/, 'an inferred sibling value is never a source; the nearer same-generation model wins');
    assert.ok(Math.abs(cam.value - 8000 * (100000 / 90000) ** 0.25) < 1e-6, `fixed repair scaled gently with value, got ${cam.value}`);
    const wifi = nearestCodeSource(profiles, typical, 'iPhone 17 Pro', 'F05')!;
    assert.equal(wifi.kind, 'pct');
    assert.equal(wifi.value, 0.3, 'a proportional deduction carries the same fraction of the current reference');
    assert.equal(nearestCodeSource(profiles, typical, 'iPhone 17 Pro', 'F13'), null, 'no measured source: no invented value');
    assert.equal(releaseYear('iPhone 17 Pro'), 2025);
    assert.equal(releaseYear('iPhone XR'), 2018);
  });

  await test('every inferred calibration value names where it came from; measured values carry no borrowed basis', () => {
    for (const [model, p] of Object.entries((calibration as any).models) as [string, ModelProfile][]) {
      for (const [code, c] of Object.entries(p.codes ?? {})) {
        if (c.support === 'measured') assert.ok(!c.basis || !/sibling|template/.test(c.basis), `${model} ${code} is measured but says ${c.basis}`);
      }
    }
  });

  await test('iPhone 11 Pro / Pro Max major discoloration is solved from the observed D05+D06 combination (largest-wins), not a borrowed prior', () => {
    const both = { screenLines: 'Display faded along edges', screenDiscoloration: 'Major Discoloration' };
    for (const [model, gb, reference, observed] of [['iPhone 11 Pro', 64, 15000, 5500], ['iPhone 11 Pro', 256, 17000, 5500], ['iPhone 11 Pro', 512, 17240, 5500],
      ['iPhone 11 Pro Max', 64, 16950, 6600], ['iPhone 11 Pro Max', 256, 18740, 6600], ['iPhone 11 Pro Max', 512, 19220, 6600]] as const) {
      assert.ok(Math.abs(deduction(model, gb, reference, both) - observed) <= 10, `${model} ${gb}GB D05+D06 deduction ${deduction(model, gb, reference, both)} vs observed ${observed}`);
    }
  });

  await test('final-intake repairs are fixed rupees and connectivity faults a fraction of the reference: a reference change moves only the latter', () => {
    // 12 Mini front camera: INR 1,250 at all three supplied capacities -> fixed
    assert.ok(Math.abs(deduction('iPhone 12 Mini', 128, 16010, { hardware: ['front_camera'] }) - deduction('iPhone 12 Mini', 128, 17610, { hardware: ['front_camera'] })) <= 10);
    // 13 Pro Wi-Fi: about 39% of the reference at every capacity -> proportional
    const w1 = deduction('iPhone 13 Pro', 256, 34800, { hardware: ['wifi'] });
    const w2 = deduction('iPhone 13 Pro', 256, 38280, { hardware: ['wifi'] });
    assert.ok(Math.abs(w1 / 34800 - 0.39) < 0.01, `13 Pro Wi-Fi ${w1}`);
    assert.ok(Math.abs(w2 / w1 - 1.1) < 0.01, `Wi-Fi deduction must scale with the reference: ${w1} -> ${w2}`);
    // an older model with no age question: the flawless quote (box and charger present) equals the current reference, whatever it is
    const complete = { ...clean, charger: true, accessories: ['box', 'charger'] };
    for (const reference of [2720, 3000, 2400]) assert.equal(price('iPhone 6S', 128, reference, complete), reference);
  });

  await test('served offer on a final-intake model = max(round(C + min(R x tier, 2000)), 100) with the bonus from R before deductions', () => {
    for (const [model, gb, reference] of [['iPhone 6', 16, 1550], ['iPhone XS Max', 512, 13290], ['iPhone 13 Pro', 1024, 36870], ['iPhone 15 Pro', 1024, 70080]] as const) {
      const c = price(model, gb, reference, { ...clean, hardware: ['back_camera'] });
      const tier = reference <= 20000 ? 0.08 : reference <= 50000 ? 0.06 : 0.04;
      assert.equal(applyCompetitorUplift(reference, c), Math.max(Math.round(c + Math.min(reference * tier, 2000)), 100));
    }
  });

  if (failed) { console.error(`${failed} failed`); process.exitCode = 1; } else console.log('Final iPhone rules: all passed');
})();
