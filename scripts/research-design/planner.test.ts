/**
 * Unit tests for the offline experiment planner.
 *   npx tsx scripts/research-design/planner.test.ts
 * No database, no network, no Cashify.
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { buildPlan, serializePlan, expandAnswers, estimate, Plan } from './plan';
import { BuildInputs, buildModelIndex, legacyPriceKey, priceBand, seriesAndGeneration, loadRealInputs } from './catalog';
import { selectSample, DEFAULT_SAMPLING } from './sampling';
import { fractionalRuns, CANDIDATE_PAIRS, PlannedExperiment } from './design';
import { FACTORS, FACTOR_BY_ID } from './factors';
import {
  blockValidity, classifyInteraction, fitDeductionForm, errorSummary, factorialEffects, deduction, Observation,
} from './analysis';

let passed = 0;
const failures: string[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (err: any) { failures.push(name); console.log(`  FAIL  ${name}\n        ${err?.message ?? err}`); }
}

// ---------------------------------------------------------------------------
// Synthetic catalog: several brands, bands, variants, a named family, an
// unpriced model, an S Pen device.

function fixture(): BuildInputs {
  const rows: BuildInputs['rows'] = [];
  const prices: Record<string, number> = {};
  const priceMeta: BuildInputs['priceMeta'] = {};
  const addRow = (brand: string, model: string, storage: string, price: number | null) => {
    rows.push({ id: `${model}-${storage}`, brand, model, storage, ram: '8GB' });
    if (price != null) {
      prices[legacyPriceKey(model, storage)] = price;
      priceMeta[legacyPriceKey(model, storage)] = { status: 'fresh', lastVerifiedAt: '2026-09-20T00:00:00Z' };
    }
  };
  for (let g = 8; g <= 16; g++) {
    addRow('Apple', `Apple iPhone ${g}`, '128GB', 3000 * (g - 6));
    addRow('Apple', `Apple iPhone ${g}`, '256GB', 3000 * (g - 6) * 1.3);
    addRow('Apple', `Apple iPhone ${g} Pro`, '256GB', 4200 * (g - 6));
  }
  for (let g = 20; g <= 26; g++) {
    addRow('Samsung', `Samsung Galaxy S${g}`, '128GB', 2500 * (g - 18));
    addRow('Samsung', `Samsung Galaxy S${g} Ultra`, '256GB', 4000 * (g - 18));
    addRow('Samsung', `Samsung Galaxy A${g + 30}`, '128GB', 700 * (g - 18));
  }
  for (let g = 5; g <= 14; g++) addRow('Xiaomi', `Xiaomi Redmi Note ${g}`, '64GB', 900 + 300 * g);
  for (let g = 1; g <= 9; g++) addRow('Vivo', `Vivo Y${g}0`, '64GB', 800 + 200 * g);
  addRow('Nokia', 'Nokia 2.2', '32GB', null); // unpriced
  return { rows, prices, priceMeta };
}

const vecEq = (a: Record<string, string | null>, b: Record<string, string | null>, except: string[] = []) =>
  FACTORS.every((f) => except.includes(f.id) || a[f.id] === b[f.id]);

function checkInvariants(plan: Plan) {
  const dev = new Map(plan.devices.map((d) => [d.deviceKey, d]));
  const byId = new Map(plan.experiments.map((e) => [e.experimentId, e]));
  assert.equal(byId.size, plan.experiments.length, 'experiment ids are unique');

  for (const e of plan.experiments) {
    const d = dev.get(e.deviceKey)!;
    // Complete vector; null iff NOT_ASKED.
    for (const f of FACTORS) {
      assert.ok(f.id in e.answers, `${e.experimentId} missing ${f.id}`);
      const notAsked = d.questionStates[f.id].status === 'NOT_ASKED';
      assert.equal(e.answers[f.id] === null, notAsked, `${e.experimentId}: ${f.id} null iff NOT_ASKED`);
    }
    // NOT_ASKED never varied.
    for (const c of e.changes) {
      if (c.factorId.startsWith('checkbox:')) continue;
      assert.notEqual(d.questionStates[c.factorId].status, 'NOT_ASKED', `${e.experimentId} varies NOT_ASKED ${c.factorId}`);
      assert.equal(e.answers[c.factorId], c.to);
      assert.equal(d.baselineAnswers[c.factorId], c.from);
    }
    // Answers equal the device baseline except in the declared changes.
    assert.ok(vecEq(e.answers, d.baselineAnswers, e.changes.map((c) => c.factorId)), `${e.experimentId} has undeclared changes`);
    // UNKNOWN changed factors require runtime confirmation.
    for (const c of e.changes) {
      if (d.questionStates[c.factorId]?.status === 'UNKNOWN') assert.ok(e.requiresRuntimeConfirmation.includes(c.factorId));
    }
    if (e.kinds.includes('OFAT') && !e.kinds.includes('REPLICATE')) {
      assert.equal(e.changes.length, 1, `${e.experimentId} OFAT changes exactly one factor`);
    }
    // References live in the same block.
    for (const r of e.referenceExperimentIds) {
      assert.equal(byId.get(r)?.blockId, e.blockId, `${e.experimentId} references ${r} outside its block`);
    }
    if (e.kinds.includes('PAIR')) {
      assert.equal(e.changes.length, 2);
      const singles = e.referenceExperimentIds.map((r) => byId.get(r)!);
      assert.equal(singles.length, 2);
      for (const s of singles) assert.equal(s.changes.length, 1);
      assert.deepEqual(singles.map((s) => s.changes[0].factorId).sort(), e.changes.map((c) => c.factorId).sort());
    }
    if (e.changes.some((c) => (c.factorId === 'warranty' || c.factorId === 'validBill') && c.to === 'no') && d.questionStates.mobileAge.status !== 'NOT_ASKED') {
      assert.equal(e.isolation, 'CONDITIONAL_CONFOUNDED', `${e.experimentId} must flag the age-page confound`);
    }
    if (e.changes.some((c) => FACTOR_BY_ID[c.factorId]?.siblings)) {
      assert.notEqual(e.isolation, 'CLEAN', `${e.experimentId} sub-page change must not be CLEAN`);
    }
  }
  // Blocks are bracketed by identical baselines.
  for (const b of plan.blocks) {
    const xs = b.experimentIds.map((id) => byId.get(id)!);
    const open = xs[0], close = xs[xs.length - 1];
    assert.deepEqual(open.kinds, ['BASELINE_OPEN']);
    assert.ok(close.kinds.includes('BASELINE_CLOSE'));
    assert.equal(open.changes.length, 0);
    assert.equal(close.changes.length, 0);
    assert.ok(xs.length <= plan.config.design.maxBlockSize, `${b.blockId} exceeds block size`);
    for (const x of xs.slice(1)) assert.equal(x.baselineExperimentId, open.experimentId);
    xs.forEach((x, i) => assert.equal(x.order, i));
  }
  // Validation is held out and blind.
  const train = new Set(plan.devices.filter((d) => d.role !== 'VALIDATION').map((d) => d.modelKey));
  for (const d of plan.devices.filter((d) => d.role === 'VALIDATION')) assert.ok(!train.has(d.modelKey), `${d.modelKey} is in both sets`);
  for (const e of plan.experiments.filter((e) => e.role === 'VALIDATION')) {
    assert.ok(e.kinds.every((k) => ['BASELINE_OPEN', 'BASELINE_CLOSE', 'VALIDATION_PROFILE'].includes(k)), `${e.experimentId} validation kinds`);
    if (e.kinds.includes('VALIDATION_PROFILE')) assert.equal(e.blind, true);
  }
}

(async () => {
  console.log('\nresearch-design planner tests\n');

  await test('price bands and series parsing', () => {
    assert.equal(priceBand(4999), 'B1_lt5k');
    assert.equal(priceBand(5000), 'B2_5k_10k');
    assert.equal(priceBand(40000), 'B5_ge40k');
    assert.equal(priceBand(null), 'B0_unpriced');
    assert.deepEqual(seriesAndGeneration('Apple', 'Apple iPhone 13 Pro'), { series: 'apple:iphone', generation: 13 });
    assert.deepEqual(seriesAndGeneration('Samsung', 'Samsung Galaxy S23 Ultra 5G'), { series: 'samsung:galaxy s', generation: 23 });
  });

  await test('plan is deterministic (byte-identical JSON for the same inputs and seed)', () => {
    const a = JSON.stringify(serializePlan(buildPlan(fixture())));
    const b = JSON.stringify(serializePlan(buildPlan(fixture())));
    assert.equal(a, b);
  });

  await test('fixture plan satisfies every structural invariant', () => {
    checkInvariants(buildPlan(fixture()));
  });

  await test('sampling: every Fhoneify family trained; unpriced model only via coverage; validation disjoint', () => {
    const idx = buildModelIndex(fixture());
    const r = selectSample(idx.models, DEFAULT_SAMPLING);
    const train = r.selections.filter((s) => s.role !== 'VALIDATION');
    const fams = new Set(idx.models.map((m) => m.fhoneifyFamily));
    for (const f of fams) assert.ok(train.some((s) => s.model.fhoneifyFamily === f), `family ${f} uncovered`);
    assert.ok(r.ineligible.some((x) => x.modelKey === 'nokia|nokia 2.2'));
    const nokia = r.selections.find((s) => s.model.modelKey === 'nokia|nokia 2.2');
    if (nokia) assert.ok(nokia.reasons.every((x) => x.startsWith('coverage:')), 'unpriced model enters only via coverage');
    assert.ok(r.selections.some((s) => s.role === 'ANCHOR'));
    for (const c of r.cells) {
      const base = c.models <= 3 ? 1 : c.models < 15 ? 2 : 3;
      assert.ok(c.allocated === base || c.allocated === base + 1, `cell allocation ${JSON.stringify(c)}`);
    }
  });

  await test('questionnaire snapshot: NOT_ASKED warranty is never varied, ASKED is not runtime-gated', () => {
    const inputs = fixture();
    const q: Record<string, any> = {};
    for (const r of inputs.rows) q[`${r.brand}|${r.model}`.toLowerCase()] = r.brand === 'Apple'
      ? { warrantyMode: 'ASKED', billMode: 'ASKED' } : { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED' };
    const plan = buildPlan({ ...inputs, questionnaire: q });
    checkInvariants(plan);
    const dev = new Map(plan.devices.map((d) => [d.deviceKey, d]));
    for (const e of plan.experiments) {
      const d = dev.get(e.deviceKey)!;
      if (d.brand !== 'Apple') {
        assert.equal(e.answers.warranty, null);
        assert.ok(!e.changes.some((c) => c.factorId === 'warranty' || c.factorId === 'validBill'));
      } else if (e.changes.some((c) => c.factorId === 'warranty')) {
        assert.ok(!e.requiresRuntimeConfirmation.includes('warranty'));
      }
    }
  });

  await test('S Pen is NOT_ASKED (null, never varied) except on S Pen devices', () => {
    const plan = buildPlan(fixture());
    for (const d of plan.devices) {
      const hasPen = d.strata.exceptionTags.includes('s_pen');
      assert.equal(d.questionStates.sPen.status, hasPen ? 'UNKNOWN' : 'NOT_ASKED', d.deviceKey);
    }
    assert.ok(plan.devices.some((d) => d.strata.exceptionTags.includes('s_pen')), 'fixture has an S Pen device');
  });

  await test('age is always runtime-discovered, never trusted from first-page metadata', () => {
    const plan = buildPlan(fixture());
    for (const d of plan.devices) assert.equal(d.questionStates.mobileAge.status, 'UNKNOWN');
  });

  await test('anchors get every candidate pair that is askable', () => {
    const plan = buildPlan(fixture());
    const anchors = plan.devices.filter((d) => d.role === 'ANCHOR' && d.variantRole === 'REPRESENTATIVE');
    assert.ok(anchors.length > 0);
    for (const a of anchors) {
      const pairs = plan.experiments.filter((e) => e.deviceKey === a.deviceKey && e.kinds.includes('PAIR'));
      assert.equal(new Set(pairs.flatMap((e) => e.purposes.filter((p) => p.startsWith('pair ')).map((p) => p.slice(5, 8)))).size, CANDIDATE_PAIRS.length);
    }
  });

  await test('serialized answer vectors round-trip to the full answer objects', () => {
    const plan = buildPlan(fixture());
    const s = serializePlan(plan);
    s.experiments.forEach((e, i) => assert.deepEqual(expandAnswers(s.answerOrder, e.answerVector), plan.experiments[i].answers));
  });

  await test('2^(5-1) fraction is resolution V: 5 main + 10 two-factor columns mutually orthogonal', () => {
    const runs = fractionalRuns();
    assert.equal(runs.length, 16);
    assert.equal(new Set(runs.map((r) => r.join())).size, 16);
    const cols: number[][] = [];
    for (let i = 0; i < 5; i++) cols.push(runs.map((r) => r[i]));
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) cols.push(runs.map((r) => r[i] * r[j]));
    for (const c of cols) assert.equal(c.reduce((a, b) => a + b, 0), 0, 'balanced');
    for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
      assert.equal(cols[i].reduce((a, v, t) => a + v * cols[j][t], 0), 0, `columns ${i},${j} aliased`);
    }
  });

  await test('factorialEffects recovers a known main effect and interaction', () => {
    const runs = fractionalRuns();
    // price = 20000 - 3000*[A] - 1000*[B] + 500*[A][B]   ([x] = 1 when high)
    const y = runs.map((r) => {
      const A = r[0] === 1 ? 1 : 0, B = r[1] === 1 ? 1 : 0;
      return 20000 - 3000 * A - 1000 * B + 500 * A * B;
    });
    const fx = factorialEffects(runs, y, ['A', 'B', 'C', 'D', 'E']);
    assert.equal(fx.A, -2750);  // -3000 + 500/2
    assert.equal(fx.B, -750);
    assert.equal(fx.AxB, 250);  // 500/2 in +/-1 coding
    assert.equal(fx.C, 0);
    assert.equal(fx.CxD, 0);
  });

  await test('interaction classifier separates additive / multiplicative / overlap / floor / super / sub', () => {
    const B = 40000;
    assert.equal(classifyInteraction(B, 8000, 6000, 14000).cls, 'ADDITIVE');
    assert.equal(classifyInteraction(B, 8000, 6000, 8000 + 6000 - (8000 * 6000) / B).cls, 'MULTIPLICATIVE');
    assert.equal(classifyInteraction(B, 8000, 6000, 8000).cls, 'OVERLAP_MAX');
    assert.equal(classifyInteraction(B, 8000, 6000, 18000).cls, 'SUPER_ADDITIVE');
    assert.equal(classifyInteraction(B, 8000, 6000, 10000).cls, 'SUB_ADDITIVE');
    assert.equal(classifyInteraction(B, 30000, 20000, 38000, 20, 2000).cls, 'FLOOR');
    // Small deductions on a cheap phone cannot separate add vs mult.
    assert.equal(classifyInteraction(3000, 150, 100, 250).cls, 'ADDITIVE_OR_MULTIPLICATIVE');
    assert.equal(classifyInteraction(B, 5, 5, 10).cls, 'NO_EFFECT_SINGLES');
    assert.equal(classifyInteraction(B, 5000, 0, 5000).cls, 'INDETERMINATE');
    assert.ok(Math.abs(classifyInteraction(B, 8000, 6000, 14000).discrimination - 1200) < 1e-6);
  });

  await test('deduction form: constant rupees vs proportional vs affine', () => {
    const bs = [5000, 12000, 25000, 60000];
    assert.equal(fitDeductionForm(bs.map((b) => ({ baseline: b, deduction: 1500 }))).form, 'CONSTANT_RUPEES');
    assert.equal(fitDeductionForm(bs.map((b) => ({ baseline: b, deduction: 0.3 * b }))).form, 'PROPORTIONAL');
    assert.equal(fitDeductionForm(bs.map((b) => ({ baseline: b, deduction: 2000 + 0.2 * b }))).form, 'AFFINE');
    assert.equal(fitDeductionForm([{ baseline: 1, deduction: 1 }]).form, 'INSUFFICIENT');
    assert.deepEqual(deduction(20000, 15000), { abs: 5000, pct: 0.25 });
  });

  await test('block validity rejects drift, Get Upto change, fingerprint change and missing brackets', () => {
    const o = (id: string, price: number | null, extra: Partial<Observation> = {}): Observation => ({
      experimentId: id, blockId: 'b', finalPrice: price, status: 'COMPLETED', collectedAt: '2026-10-01T10:00:00Z',
      getUptoAtCollection: 20000, questionnaireFingerprint: 'fp1', ...extra,
    });
    assert.deepEqual(blockValidity(o('open', 20100), o('close', 20100), [o('x', 15000)]), { valid: true, baseline: 20100 });
    assert.equal(blockValidity(o('open', 20100), o('close', 20100), [o('x', 15000)]).valid, true);
    assert.equal(blockValidity(o('open', 20100), o('close', 20400), []).valid, false);
    assert.equal(blockValidity(o('open', 20100), o('close', 20100), [o('x', 1, { getUptoAtCollection: 21000 })]).valid, false);
    assert.equal(blockValidity(o('open', 20100), o('close', 20100), [o('x', 1, { questionnaireFingerprint: 'fp2' })]).valid, false);
    assert.equal(blockValidity(o('open', 20100), undefined, []).valid, false);
    assert.equal(blockValidity(o('open', 20100), o('close', 20100, { collectedAt: '2026-10-01T18:00:01Z' }), []).valid, false);
  });

  await test('validation error summary', () => {
    const s = errorSummary([{ predicted: 110, actual: 100 }, { predicted: 90, actual: 100 }, { predicted: 100, actual: 100 }]);
    assert.equal(s.n, 3);
    assert.ok(Math.abs(s.maeRs - 20 / 3) < 1e-9);
    assert.equal(s.biasRs, 0);
    assert.equal(s.maxAbsRs, 10);
    assert.ok(Math.abs(s.mape - 0.2 / 3) < 1e-9);
  });

  await test('estimate arithmetic', () => {
    const fake = Array.from({ length: 100 }, (_, i) => ({ role: 'CORE', phase: 2, kinds: ['OFAT'] } as unknown as PlannedExperiment));
    const est = estimate(fake, 50);
    assert.equal(est.totalQuotationRequests, 100);
    assert.equal(est.comparisonWithOriginal.originalRequests, 150);
    const typical = est.runtime.find((r) => r.secondsPerQuote === 32)!;
    assert.equal(typical.totalHours, Number(((100 * 32) / 3600).toFixed(1)));
    assert.equal(typical.quotesPerBatch, Math.floor((5 * 3600) / 32));
  });

  await test('planner modules never import I/O-capable or collector code', () => {
    const dir = __dirname;
    const forbidden = [/@prisma\/client/, /playwright/, /child_process/, /pricing-research\//, /researchPricing/, /pricingCalculator/, /\bfetch\(/, /https?:\/\//];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      const imports = src.split('\n').filter((l) => /^\s*import |await import\(|require\(/.test(l)).join('\n');
      for (const re of forbidden) assert.ok(!re.test(imports), `${f} imports ${re}`);
      assert.ok(!/\bfetch\(/.test(src), `${f} calls fetch`);
    }
  });

  await test('real catalog plan satisfies every invariant and is deterministic', async () => {
    const inputs = await loadRealInputs();
    const plan = buildPlan(inputs);
    checkInvariants(plan);
    const again = buildPlan(inputs);
    assert.equal(JSON.stringify(serializePlan(plan)), JSON.stringify(serializePlan(again)));
    const fams = new Set(buildModelIndex(inputs).models.map((m) => m.fhoneifyFamily));
    const trained = new Set(plan.devices.filter((d) => d.role !== 'VALIDATION').map((d) => d.strata.fhoneifyFamily));
    for (const f of fams) assert.ok(trained.has(f), `family ${f} has no training model`);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
})();
