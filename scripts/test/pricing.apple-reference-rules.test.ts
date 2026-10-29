/**
 * Reference-driven iPhone rules fitted from the audited Cashify data (2026-10-28). No database, network or browser.
 *
 *   npx tsx scripts/test/pricing.apple-reference-rules.test.ts
 *
 * Every check goes through the rules alone (the recorded-quote index is never consulted unless a test opts in), so a cached final price
 * can never hide a wrong deduction.
 */
import assert from 'node:assert/strict';
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import { SCOPE } from '../../lib/pricing/appleCashifyModel/scope';
import { createPricingService } from '../../lib/pricing/pricingService';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { InspectionRequiredError } from '../../lib/pricing/inspectionRequired';
import { hasUnknownInput, loadMeasurements, toDiagnostics } from '../pricing-evidence/evidenceLib';

let passed = 0, failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve().then(fn).then(() => { console.log(`  PASS  ${name}`); passed++; }, (e: any) => { console.log(`  FAIL  ${name}: ${String(e?.message ?? e).slice(0, 600)}`); failed++; });
}
const clean = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['box'], box: true, warranty: true, validBill: true, mobileAge: 'below3' } as any;
const price = (model: string, gb: number, R: number, d: any) => {
  const q = appleEvidenceQuote(model, `${gb}GB`, R, d);
  assert.ok(q, `${model} ${gb}GB is priced by the rules`);
  assert.equal(q.source, 'model', 'served quotes come from the rules, never from a recorded final price');
  return q.outcome.price;
};
const deductionOf = (model: string, gb: number, R: number, hardware: string[]) => price(model, gb, R, clean) - price(model, gb, R, { ...clean, hardware });

async function run() {
  console.log('\nReference-driven iPhone rules\n');

  await test('confirmed single-fault deductions (handoff table) are reproduced at every supplied capacity', () => {
    // [model, capacity, flawless base (reference), front camera, back camera, battery service, battery 80-85%]
    const table: [string, number, number, number, number, number, number][] = [
      ['iPhone 12', 64, 16490, 1000, 2000, 1800, 540], ['iPhone 12', 256, 18630, 1000, 2000, 1800, 540],
      ['iPhone 13', 128, 24260, 1000, 3000, 3000, 900], ['iPhone 13', 512, 25450, 1000, 3000, 3000, 900],
      ['iPhone 15 Pro Max', 256, 71040, 2000, 4600, 4000, 1200], ['iPhone 15 Pro Max', 1024, 78240, 2000, 4600, 4000, 1200],
      ['iPhone 16', 128, 52800, 3000, 6000, 4000, 1200], ['iPhone 16', 512, 55680, 3000, 6000, 4000, 1200],
      ['iPhone 16 Pro', 256, 76670, 3500, 6200, 4200, 1260], ['iPhone 16 Pro', 1024, 79360, 3500, 6200, 4200, 1260],
      ['iPhone 18 Pro', 256, 122000, 3500, 6500, 4200, 1260], ['iPhone 18 Pro', 2048, 160000, 3500, 6500, 4200, 1260],
    ];
    for (const [model, gb, R, front, back, service, health] of table) {
      for (const [hw, want] of [['front_camera', front], ['back_camera', back], ['battery_service', service], ['battery_health', health]] as const) {
        const got = deductionOf(model, gb, R, [hw]);
        assert.ok(Math.abs(got - want) <= 10, `${model} ${gb}GB ${hw}: ${got} vs Cashify ${want}`);
      }
    }
  });

  await test('iPhone 16 Wi-Fi follows the value (16,500 / 17,100 / 17,400), not one fixed amount', () => {
    for (const [gb, R, want] of [[128, 52800, 16500], [256, 54720, 17100], [512, 55680, 17400]] as const) {
      const got = deductionOf('iPhone 16', gb, R, ['wifi']);
      assert.ok(Math.abs(got - want) <= 60, `${gb}GB wifi ${got} vs ${want}`);
    }
  });

  await test('camera front/back ratios are the model\'s own, not one global weight', () => {
    const r12 = deductionOf('iPhone 12', 128, 17420, ['back_camera']) / deductionOf('iPhone 12', 128, 17420, ['front_camera']);
    const r15 = deductionOf('iPhone 15 Pro Max', 256, 71040, ['back_camera']) / deductionOf('iPhone 15 Pro Max', 256, 71040, ['front_camera']);
    assert.ok(Math.abs(r12 - 2) < 0.02 && Math.abs(r15 - 2.3) < 0.02, `ratios ${r12} ${r15}`);
  });

  await test('the quote follows the current reference: up and down with fixed answers, fixed costs stay fixed, a value-relative cost scales', () => {
    const d = { ...clean, hardware: ['back_camera', 'wifi'] };
    const base = price('iPhone 16', 128, 52800, d);
    const up = price('iPhone 16', 128, 56000, d);
    const down = price('iPhone 16', 128, 48000, d);
    assert.ok(up > base && down < base, `${down} < ${base} < ${up}`);
    assert.equal(deductionOf('iPhone 16', 128, 56000, ['back_camera']), 6000);
    assert.equal(deductionOf('iPhone 16', 128, 48000, ['back_camera']), 6000);
    assert.ok(deductionOf('iPhone 16', 128, 56000, ['wifi']) > deductionOf('iPhone 16', 128, 48000, ['wifi']));
    // a previously recorded condition moves with the reference too (no cached final price)
    const m = loadMeasurements().find(x => x.model_key === 'iPhone 13' && x.deviations.join() === 'F08,F17')!;
    const at = price(m.model_key, m.storage_gb, m.variant_get_upto, toDiagnostics(m, 'none'));
    const later = price(m.model_key, m.storage_gb, m.variant_get_upto + 2000, toDiagnostics(m, 'none'));
    assert.ok(Math.abs(at - m.base!) <= 30, `recorded ${m.base} vs rules ${at}`);
    assert.ok(later > at, 'the recorded condition updates when the reference rises');
  });

  await test('flawless quote = reference; the iPhone 11 / 7 / 8 families deduct a missing original charger, not a fixed offset', () => {
    assert.equal(price('iPhone 16', 128, 52800, clean), 52800);
    assert.equal(price('iPhone 11', 64, 12490, clean), 12090);
    assert.equal(price('iPhone 8', 64, 5450, clean), 5300);
    assert.equal(price('iPhone 12', 64, 16490, clean), 16490);
    // live Cashify 2026-10-28, iPhone 11 Pro Max 256 GB, speaker + 1-2 dents, box: charger yes 17,660, no 17,260
    const withCharger = { ...clean, accessories: ['box', 'charger'], charger: true };
    assert.equal(price('iPhone 11', 64, 12490, withCharger), 12490);
    assert.equal(price('iPhone 8', 64, 5450, withCharger), 5450);
    const faults = { hardware: ['speaker'], bodyDents: '1-2 minor dents' };
    assert.equal(price('iPhone 11 Pro Max', 256, 18740, { ...withCharger, ...faults }) - price('iPhone 11 Pro Max', 256, 18740, { ...clean, ...faults }), 400);
  });

  await test('age is applied once however many answers force the aged state', () => {
    const d = { ...clean, warranty: false, validBill: false, mobileAge: 'above11', screenCondition: 'Screen cracked/ glass broken', bodyPanel: 'Cracked/ broken side or back panel' };
    const q = appleEvidenceQuote('iPhone 16', '128GB', 52800, d)!;
    assert.equal(q.outcome.breakdown.filter(b => b.rule === 'age').length, 1);
    const aged = appleEvidenceQuote('iPhone 16', '128GB', 52800, { ...clean, warranty: false })!;
    const both = appleEvidenceQuote('iPhone 16', '128GB', 52800, { ...clean, warranty: false, validBill: false, mobileAge: 'above11' })!;
    assert.equal(aged.outcome.price, both.outcome.price, 'warranty No and bill No are one aged state');
  });

  await test('live Cashify quotes of 2026-10-28 (random check and isolating follow-ups) are reproduced', () => {
    const withCharger = { ...clean, accessories: ['box', 'charger'], charger: true };
    // [model, GB, flawless reference that day, answers, Cashify base price]
    const live: [string, number, number, any, number][] = [
      ['iPhone 16 Plus', 256, 55680, { ...clean, accessories: [], box: false, bodyScratches: '1-2 scratches' }, 51540],
      ['iPhone 11 Pro Max', 256, 18740, { ...clean, hardware: ['speaker'], bodyDents: '1-2 minor dents' }, 17260],
      ['iPhone 11 Pro Max', 256, 18740, { ...withCharger, hardware: ['speaker'], bodyDents: '1-2 minor dents' }, 17660],
      ['iPhone 11 Pro Max', 256, 18740, { ...withCharger, bodyDents: '1-2 minor dents' }, 18060],
      ['iPhone 14 Pro', 512, 46500, { ...clean, hardware: ['face'], bodyDents: '1-2 minor dents' }, 33300],
      ['iPhone 14 Pro', 512, 46500, { ...clean, hardware: ['face'] }, 34500],
      ['iPhone 8', 256, 6150, { ...clean, accessories: [], box: false, hardware: ['speaker', 'front_camera'], screenCondition: '1-2 scratches on screen', bodyScratches: '1-2 scratches' }, 4590],
      ['iPhone 8', 256, 6150, { ...withCharger, hardware: ['speaker'] }, 5950],
      ['iPhone 8', 256, 6150, { ...withCharger, screenCondition: '1-2 scratches on screen' }, 5740],
      ['iPhone 8', 256, 6150, { ...withCharger, bodyScratches: '1-2 scratches' }, 6150],
    ];
    for (const [model, gb, R, d, cashify] of live) {
      const got = price(model, gb, R, d);
      assert.ok(Math.abs(got - cashify) <= 20, `${model} ${gb}GB ${JSON.stringify(d.hardware)} ${d.bodyScratches ?? ''} ${d.bodyDents ?? ''}: rules ${got} vs Cashify ${cashify}`);
    }
  });

  await test('one repair group is charged once: screen answers share the largest screen deduction', () => {
    const cracked = price('iPhone 13 Pro Max', 256, 35890, { ...clean, screenCondition: 'Screen cracked/ glass broken' });
    const crackedSpots = price('iPhone 13 Pro Max', 256, 35890, { ...clean, screenCondition: 'Screen cracked/ glass broken', screenSpots: '1-2 minor spots on screen' });
    const spots = price('iPhone 13 Pro Max', 256, 35890, { ...clean, screenSpots: '1-2 minor spots on screen' });
    assert.equal(crackedSpots, Math.min(cracked, spots), 'cracked glass + spots = the larger of the two');
  });

  await test('missing components: box everywhere, charger only where the model\'s form asks it', () => {
    assert.ok(price('iPhone 16', 128, 52800, { ...clean, accessories: [], box: false }) < price('iPhone 16', 128, 52800, clean));
    const xrBoth = price('iPhone XR', 64, 9800, { ...clean, accessories: ['box', 'charger'], charger: true });
    const xrNoCharger = price('iPhone XR', 64, 9800, { ...clean, accessories: ['box'], charger: false });
    assert.ok(Math.abs(xrBoth - xrNoCharger - 300) <= 10, `XR charger ${xrBoth - xrNoCharger}`);
    assert.equal(price('iPhone 16', 128, 52800, { ...clean, accessories: ['box'], charger: false }), price('iPhone 16', 128, 52800, { ...clean, accessories: ['box', 'charger'] }));
  });

  await test('every catalog iPhone variant gets an instant quote for clean and single-fault answers (no model sent to inspection for being hard)', () => {
    const apple = (SEED_DEVICES as any[]).filter(d => d.brand === 'Apple');
    let n = 0;
    for (const d of apple) {
      for (const answers of [clean, { ...clean, hardware: ['back_camera'] }, { ...clean, screenCondition: '1-2 scratches on screen' }, { ...clean, bodyDents: '1-2 minor dents' }]) {
        const q = appleEvidenceQuote(d.model, d.storage, 20000, answers);
        assert.ok(q && q.outcome.price > 0, `${d.model} ${d.storage}`);
        n++;
      }
    }
    assert.ok(n >= 4 * 140, `checked ${n}`);
  });

  await test('iPhone 12 Mini (no quotes of its own) is priced from the iPhone 12 and labelled inferred, never measured', () => {
    assert.equal(SCOPE.models['iPhone 12 Mini']?.fallbackFrom, 'iPhone 12');
    const q = appleEvidenceQuote('Apple iPhone 12 Mini', '64GB', 14150, { ...clean, hardware: ['back_camera'] })!;
    assert.equal(q.outcome.confidence, 'inferred');
    assert.equal(q.outcome.price, 12150);
  });

  await test('unrecorded combinations and capacities are priced by the same rules (no lookup)', () => {
    const a = price('iPhone 13 Pro', 1024, 36870, { ...clean, hardware: ['front_camera', 'speaker', 'battery_health'], bodyScratches: '1-2 scratches' });
    assert.ok(a > 0 && a < 36870);
    const b = price('iPhone 16 Plus', 512, 56640, { ...clean, hardware: ['wifi', 'charging'], accessories: [], box: false });
    assert.ok(b > 0 && b < 56640);
  });

  await test('contradictory or declined conditions still go to inspection', () => {
    assert.throws(() => appleEvidenceQuote('iPhone 16', '128GB', 52800, { ...clean, calls: false, hardware: ['wifi'] }), InspectionRequiredError);
  });

  await test('controlled single-fault quotes of the audited data are reproduced by the rules (in-sample, within INR 60)', () => {
    let n = 0; const bad: string[] = [];
    for (const m of loadMeasurements()) {
      if (hasUnknownInput(m) || m.outcome !== 'NUMERIC_QUOTE' || m.deviations.length !== 1 || !/^F/.test(m.deviations[0])) continue;
      const q = appleEvidenceQuote(m.model_key, `${m.storage_gb}GB`, m.variant_get_upto, toDiagnostics(m, 'none'));
      n++;
      if (!q || Math.abs(q.outcome.price - m.base!) > 60) bad.push(`${m.model_key} ${m.storage_gb} ${m.deviations} ${m.base} vs ${q?.outcome.price}`);
    }
    assert.ok(n > 1200, `checked ${n}`);
    assert.deepEqual(bad, []);
  });

  await test('final offer = round(C + min(R x tier(R), 2000)) on the served path, across all three tiers', async () => {
    let reference = 0; const at = new Date('2026-10-28T12:00:00Z');
    const svc = createPricingService({ repository: { async get(key: string) { return { deviceKey: key, currentPrice: reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: at }; } } as any,
      signingSecret: 'offline-reference-rules-test-secret-only', tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100, now: () => at,
      snapshot: {}, pricingMode: 'hybrid', logger: { info() {}, warn() {}, error() {} } });
    for (const [model, storage, R] of [['Apple iPhone 8', '64GB', 5450], ['Apple iPhone 13', '128GB', 30000], ['Apple iPhone 16', '128GB', 52800], ['Apple iPhone 16', '128GB', 30000]] as const) {
      reference = R;
      const q = await svc.quote({ brand: 'Apple', model, storage, diagnostics: { ...clean, hardware: ['back_camera'] } });
      assert.ok(q.ok, `${model} priced`);
      if (!q.ok) continue;
      const C = q.internal.cashifyConditionEquivalent;
      assert.equal(q.fhoneifyPrice, Math.max(100, Math.round(C + Math.min(R * (R <= 20000 ? 0.08 : R <= 50000 ? 0.06 : 0.04), 2000))), `${model} at ${R}`);
      assert.equal(C, price(model.replace('Apple ', ''), Number(storage.replace('GB', '')), R, { ...clean, hardware: ['back_camera'] }));
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
run();
