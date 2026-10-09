import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/xiaomi-note-additive-2026-10-01.json';
import { calculateXiaomiNoteEvidenceCandidate, XIAOMI_NOTE_COMPONENT_COSTS, XIAOMI_NOTE_IDENTITY } from '../../lib/pricing/xiaomiNoteEvidenceCandidate';
import { calculateXiaomiApplicationCandidate } from '../../lib/pricing/xiaomiApplicationCandidate';
import { calculateXiaomiPrice, applyCompetitorUplift, type DiagnosticsType } from '../../lib/pricingCalculator';
import { xiaomiInrDeductions } from '../../lib/pricing/inrDeductionTables';
import { inrConditionValue } from '../../lib/pricing/inrDeductions';
const q = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as const;
const shippedQuoteBefore = calculateXiaomiPrice(XIAOMI_NOTE_IDENTITY.model, 29250, fixture.cases.find(r => r.id === 'N-SIX')!.diagnostics as DiagnosticsType, q).cashifyConditionEquivalent;
const now = new Date('2026-10-01T18:00:00Z');
const clean = fixture.cases.find(r => r.id === 'N-OPEN')!;
const input: Parameters<typeof calculateXiaomiNoteEvidenceCandidate>[0] = { ...XIAOMI_NOTE_IDENTITY, diagnostics: clean.diagnostics as DiagnosticsType,
  questionnaire: q, eSimNotAsked: true, baseline: { kind: 'get_upto' as const, reference: 29250 } };
let checks = 0;
const evaluate = (override: Partial<typeof input> = {}) => calculateXiaomiNoteEvidenceCandidate({ ...input, ...override });
const value = (r: ReturnType<typeof evaluate>) => { assert(r.supported); return r.quote.cashifyConditionEquivalent; };
// Costs are reconstructed from DEVELOPMENT singles, never combination targets.
for (const r of fixture.cases.filter(r => r.role === 'development')) {
  const hardware = r.diagnostics.hardware;
  assert.equal(hardware.length, 1);
  assert.equal(XIAOMI_NOTE_COMPONENT_COSTS[hardware[0]], clean.cashify - r.cashify);
  checks++;
}
for (const r of fixture.cases.filter(r => r.model === XIAOMI_NOTE_IDENTITY.model)) {
  const d = r.diagnostics as DiagnosticsType;
  assert.equal(value(evaluate({ diagnostics: d })), r.cashify); checks++;
  assert.equal(value(evaluate({ diagnostics: d, baseline: { kind: 'measured_clean_control', reference: 29250, cleanSellingPrice: clean.cashify } })), r.cashify); checks++;
  if (r.role === 'holdout') {
    assert.equal(value(evaluate({ diagnostics: d })), r.additiveFrozenPrediction);
    assert(fixture.jointRegisteredAt < r.collectedAt); checks++;
  }
}
const six = fixture.cases.find(r => r.id === 'N-SIX')!.diagnostics as DiagnosticsType;
assert.equal(value(evaluate({ diagnostics: six })), 560); checks++;
const result = evaluate({ diagnostics: six }); assert(result.supported);
assert.equal(result.quote.fhoneifyPrice, applyCompetitorUplift(29250, 560)); checks++;
assert.equal(value(evaluate({ diagnostics: { ...six, hardware: [...six.hardware!, 'wifi'] } })), 560); checks++;
const refused: Partial<typeof input>[] = [
  { model: 'Xiaomi 15' }, { storage: '8 GB/256 GB' }, { eSimNotAsked: false },
  { questionnaire: { ...q, ageMode: 'UNKNOWN' } },
  ...[{ warranty: true }, { validBill: false }, { mobileAge: 'below3' }, { eSim: 'Single eSIM' },
    { calls: false }, { touch: false }, { originalScreen: false }, { accessories: ['box', 'charger'] },
    { box: false }, { charger: true }, { screenCondition: 'Screen cracked/ glass broken' },
    { bodyDents: 'Major dent(s) or more than 2' }, { hardware: ['battery_service'] },
    { hardware: ['wifi', 'fingerprint'] }].map(d => ({ diagnostics: { ...input.diagnostics, ...d } })),
  { baseline: { kind: 'get_upto', reference: NaN } },
  { baseline: { kind: 'get_upto', reference: 1000 }, diagnostics: six },
];
for (const r of refused) { const v = evaluate(r); assert(!v.supported); assert(!('quote' in v)); checks++; }
// Only the 12 observed profiles are supported, not all 64 fault subsets.
const faults = Object.keys(XIAOMI_NOTE_COMPONENT_COSTS); let supported = 0;
for (let mask = 0; mask < 64; mask++) {
  const r = evaluate({ diagnostics: { ...input.diagnostics, hardware: faults.filter((_, i) => mask & (1 << i)) } });
  if (r.supported) supported++;
}
assert.equal(supported, 12); checks++;
const gate = { ...XIAOMI_NOTE_IDENTITY, diagnostics: six, questionnaire: { ...q, source: 'profile' as const }, eSimMode: 'NOT_ASKED' as const, now,
  reference: { cashifyGetUptoReference: 29250, source: 'reference_repository' as const, referenceStatus: 'fresh' as const,
    referenceSource: 'cashify', referenceLastVerifiedAt: '2026-10-01T17:30:00Z' } };
assert.equal(value(calculateXiaomiApplicationCandidate(gate)), 560); checks++;
for (const overrides of [
  { reference: null }, { reference: { ...gate.reference, cashifyGetUptoReference: 28500 } },
  { reference: { ...gate.reference, referenceLastVerifiedAt: '2026-08-01T00:00:00Z' } },
  { reference: { ...gate.reference, referenceLastVerifiedAt: 'invalid' } },
  { reference: { ...gate.reference, referenceLastVerifiedAt: '2026-10-02T00:00:00Z' } },
  { reference: { ...gate.reference, source: 'materialized_snapshot' as const } },
  { reference: { ...gate.reference, referenceSource: 'legacy_migration' } },
  { now: new Date('2026-11-01T18:00:00Z'), reference: { ...gate.reference, referenceLastVerifiedAt: '2026-11-01T17:30:00Z' } },
  { questionnaire: { ...gate.questionnaire, source: 'fallback' as const } },
]) { assert(!calculateXiaomiApplicationCandidate({ ...gate, ...overrides }).supported); checks++; }
// No mutation of shipped tables or legacy quote behavior.
const active = xiaomiInrDeductions(); const group = 'redmi-note-15-pro-plus';
assert.equal(active.groups[group].functionalCap, 6610); checks++;
assert.equal(calculateXiaomiPrice(input.model, 29250, six, q).cashifyConditionEquivalent, shippedQuoteBefore); checks++;
assert.equal(active.enabled, false); checks++;
const allFaults = { ...six, hardware: Object.keys(active.groups[group].functional) };
assert.equal(inrConditionValue({ config: active, group, reference: 29250, ageRetention: .74, diagnostics: allFaults, deadPhonePrice: 1200 }).functional, 6610); checks++;
assert.equal(fixture.priorNoteObservations.filter(r => r.status === 'FAILED').length, 4); checks++;
assert(fixture.priorNoteObservations.filter(r => r.status === 'FAILED').every(r => r.cashify === null)); checks++;
console.log(`PASS Note evidence candidate: ${checks} assertions; four frozen holdouts reproduced; legacy engine unchanged`);
