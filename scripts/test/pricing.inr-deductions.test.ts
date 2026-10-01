/**
 * Fixed-₹ condition model (lib/pricing/inrDeductions.ts) and its wiring into
 * the Xiaomi / Redmi / POCO engine.
 *
 * Run: npm run test:pricing:inr-deductions   (no database needed)
 */
import assert from 'node:assert/strict';
import { applyCompetitorUplift, calculateXiaomiPrice, type DiagnosticsType } from '../../lib/pricingCalculator';
import { inrConditionValue, resolveInrGroup, type InrDeductionConfig, type InrGroupTable } from '../../lib/pricing/inrDeductions';
import { tableFromPercentRules, xiaomiInrDeductions } from '../../lib/pricing/inrDeductionTables';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { COMBO_0, COMBO_1, COMBO_2 } from '../pricing/benchmark-combos';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

const GROUP: InrGroupTable = {
  label: 'test',
  screenReplacement: 9000,
  screen: {
    localDisplay: 4000, cracked: 8000, chipped: 3000, scratchesHeavy: 2500, scratchesLight: 1200,
    spotsHeavy: 5000, spotsLight: 2000, lines: 6000, fadedEdges: 3500, discolorationMajor: 5500, discolorationMinor: 1500,
  },
  body: { scratchesHeavy: 900, scratchesLight: 300, dentsMajor: 1400, dentsMinor: 500, panelMissing: 2500, panelCracked: 2000, bent: 3000, looseScreen: 1800 },
  functional: { charging: 1700, back_camera: 4000 },
  functionalDefault: 1000,
  box: 380,
};

const CONFIG: InrDeductionConfig = {
  version: 'test',
  enabled: true,
  groups: { cheap: { ...GROUP, label: 'cheap', screenReplacement: 3000 }, test: GROUP },
  modelGroups: { 'xiaomi pinned': 'cheap' },
  tierGroups: [{ maxReference: 10000, group: 'cheap' }, { maxReference: null, group: 'test' }],
  warrantyRetention: { 'xiaomi measured': 0.62 },
  roundTo: 10,
};

const CLEAN: DiagnosticsType = { ...COMBO_0 };
const value = (d: DiagnosticsType, reference = 50000, ageRetention = 1, model = 'Xiaomi Test') =>
  inrConditionValue({ config: CONFIG, model, reference, ageRetention, diagnostics: d, deadPhonePrice: 1200 });

test('clean phone: R x retention + box, rounded to ₹10', () => {
  assert.equal(value(CLEAN, 50000, 0.7).value, 35380);
  assert.equal(value(CLEAN, 50003, 0.7).value, Math.round((50003 * 0.7 + 380) / 10) * 10);
});

test('deductions are rupees, not a share of the price', () => {
  const cheap = value(COMBO_2, 20000).value;
  const dear = value(COMBO_2, 80000).value;
  assert.equal(value(CLEAN, 20000).value - cheap, value(CLEAN, 80000).value - dear);
});

test('display defects take the worst one; a local display adds to it', () => {
  const lines = { ...CLEAN, screenLines: 'Visible line(s) on display' };
  const all = { ...lines, screenSpots: 'Large/ heavy visible spots on screen', screenDiscoloration: 'Major Discoloration' };
  assert.equal(value(lines).screen, 6000);
  assert.equal(value(all).screen, 6000);
  assert.equal(value({ ...CLEAN, originalScreen: false }).screen, 4000);
  // 4000 + 6000 = 10000 is capped at the 9000 screen replacement.
  assert.equal(value({ ...all, originalScreen: false }).screen, 9000);
});

test('screen scratches and display defects are alternatives (worst of)', () => {
  const both = { ...CLEAN, screenCondition: 'More than 2 scratches on screen', screenSpots: '1-2 minor spots on screen' };
  assert.equal(value(both).screen, 2500);
});

test('touch failure and cracked glass charge the full replacement once', () => {
  assert.equal(value({ ...COMBO_1, touch: false }).screen, 9000);
  assert.equal(value({ ...CLEAN, screenCondition: 'Screen cracked/ glass broken' }).screen, 9000);
  assert.equal(value({ ...CLEAN, screenCondition: 'Chipped/cracked outside display area' }).screen, 3000);
});

test('functional faults add; unknown faults use the default', () => {
  assert.equal(value({ ...CLEAN, hardware: ['charging', 'back_camera'] }).functional, 5700);
  assert.equal(value({ ...CLEAN, hardware: ['charging', 'charging'] }).functional, 1700);
  assert.equal(value({ ...CLEAN, hardware: ['wifi'] }).functional, 1000);
});

test('body: cosmetic adds, structural is worst of', () => {
  const d = { ...CLEAN, bodyScratches: 'More than 2 scratches', bodyDents: '1-2 minor dents', bodyPanel: 'Back panel cracked', bodyBent: 'Bent/ curved panel' };
  assert.equal(value(d).body, 900 + 500 + 3000);
});

test('never below the dead-phone price', () => {
  const wrecked = { ...COMBO_1, touch: false, hardware: ['charging', 'back_camera', 'wifi'] };
  assert.equal(value(wrecked, 12000, 0.6).value, 1200);
});

test('group: explicit model membership, then Get Upto tier', () => {
  assert.equal(resolveInrGroup(CONFIG, 'Xiaomi Pinned', 90000), 'cheap');
  assert.equal(resolveInrGroup(CONFIG, 'Xiaomi Other', 9000), 'cheap');
  assert.equal(resolveInrGroup(CONFIG, 'Xiaomi Other', 10001), 'test');
});

test('more damage never pays more (every pair of single answers)', () => {
  const singles: Partial<DiagnosticsType>[] = [
    { originalScreen: false }, { touch: false }, { screenCondition: 'More than 2 scratches on screen' },
    { screenCondition: '1-2 scratches on screen' }, { screenCondition: 'Screen cracked/ glass broken' },
    { screenSpots: 'Large/ heavy visible spots on screen' }, { screenLines: 'Visible line(s) on display' },
    { screenDiscoloration: 'Minor Discoloration' }, { bodyScratches: 'More than 2 scratches' },
    { bodyBent: 'Bent/ curved panel' }, { hardware: ['charging'] }, { hardware: ['back_camera'] },
  ];
  for (const a of singles) {
    const one = value({ ...CLEAN, ...a }).value;
    assert.ok(one <= value(CLEAN).value, `${JSON.stringify(a)} pays more than clean`);
    for (const b of singles) {
      // Two answers to one single-choice question replace, not add.
      if (Object.keys(b).some((k) => k !== 'hardware' && k in a)) continue;
      const merged = { ...CLEAN, ...a, ...b, hardware: [...(a.hardware || []), ...(b.hardware || [])] };
      assert.ok(value(merged).value <= one, `${JSON.stringify(a)} + ${JSON.stringify(b)} pays more than ${JSON.stringify(a)} alone`);
    }
  }
});

test('Xiaomi engine: measured warranty retention replaces the age table out of warranty only', () => {
  const measured = calculateXiaomiPrice('Xiaomi Measured', 40000, COMBO_0, undefined, CONFIG);
  assert.equal(measured.cashifyConditionEquivalent, Math.round((40000 * 0.62 + 380) / 10) * 10);
  const unmeasured = calculateXiaomiPrice('Xiaomi Other', 40000, COMBO_0, undefined, CONFIG);
  assert.equal(unmeasured.cashifyConditionEquivalent, Math.round((40000 * 0.75 + 380) / 10) * 10);
  const inWarranty = calculateXiaomiPrice('Xiaomi Measured', 40000, PERFECT_CONDITION_DIAGNOSTICS, undefined, CONFIG);
  assert.equal(inWarranty.cashifyConditionEquivalent, 40380);
});

test('Xiaomi engine: the existing uplift and the dead-phone rule are unchanged', () => {
  const r = calculateXiaomiPrice('Xiaomi Other', 40000, COMBO_2, undefined, CONFIG);
  assert.equal(r.fhoneifyPrice, applyCompetitorUplift(40000, r.cashifyConditionEquivalent));
  assert.equal(calculateXiaomiPrice('Xiaomi Other', 40000, { ...COMBO_2, calls: false }, undefined, CONFIG).cashifyConditionEquivalent, 1200);
  assert.equal(calculateXiaomiPrice('Xiaomi Other', 4000, { ...COMBO_2, calls: false }, undefined, CONFIG).cashifyConditionEquivalent, 200);
});

test('disabled config leaves the percentage model byte for byte', () => {
  const off = { ...CONFIG, enabled: false };
  for (const d of [COMBO_0, COMBO_1, COMBO_2, PERFECT_CONDITION_DIAGNOSTICS]) {
    assert.deepEqual(calculateXiaomiPrice('Xiaomi Measured', 37100, d, undefined, off), calculateXiaomiPrice('Xiaomi Measured', 37100, d, undefined, { ...xiaomiInrDeductions(), enabled: false }));
  }
});

test('shipped tables: every group is complete, positive, and capped sensibly', () => {
  const shipped = xiaomiInrDeductions();
  for (const tier of shipped.tierGroups) assert.ok(shipped.groups[tier.group], `tier group ${tier.group} missing`);
  for (const group of Object.values(shipped.modelGroups)) assert.ok(shipped.groups[group], `model group ${group} missing`);
  for (const [name, t] of Object.entries(shipped.groups)) {
    const all = [t.screenReplacement, ...Object.values(t.screen), ...Object.values(t.body), ...Object.values(t.functional), t.functionalDefault];
    assert.ok(all.every((v) => Number.isFinite(v) && v >= 0), `${name}: non-finite or negative value`);
    for (const [k, v] of Object.entries(t.screen)) if (k !== 'cracked') assert.ok(v <= t.screenReplacement, `${name}: screen.${k} exceeds the replacement cap`);
  }
  for (const r of Object.values(shipped.warrantyRetention)) assert.ok(r > 0 && r <= 1, `warranty retention ${r} outside (0, 1]`);
});

test('percent-rule tables keep the old relative weights', () => {
  const t = tableFromPercentRules('x', 10000);
  assert.equal(t.screen.lines, 3000);
  assert.equal(t.screen.localDisplay, 1900);
  assert.equal(t.functional.charging, 1000);
});

test('enabled shipped tables never break the engine guardrails on catalog Xiaomi devices', () => {
  const on = { ...xiaomiInrDeductions(), enabled: true };
  const xiaomi = (SEED_DEVICES as { brand: string; model: string; basePrice?: number }[]).filter((d) => d.brand === 'Xiaomi' && d.basePrice);
  for (const d of xiaomi) {
    for (const diag of [COMBO_0, COMBO_1, COMBO_2, PERFECT_CONDITION_DIAGNOSTICS]) {
      const r = calculateXiaomiPrice(d.model, d.basePrice!, diag, undefined, on);
      assert.ok(Number.isInteger(r.cashifyConditionEquivalent) && r.cashifyConditionEquivalent % 10 === 0, `${d.model}: not a ₹10 multiple`);
      assert.ok(r.fhoneifyPrice >= r.cashifyConditionEquivalent, `${d.model}: uplift below equivalent`);
      assert.ok(r.cashifyConditionEquivalent <= d.basePrice! + 380 + 10, `${d.model}: above reference + box`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
