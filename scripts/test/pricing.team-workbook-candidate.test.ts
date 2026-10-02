import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/team-workbook-development-2026-10-02.json';
import cases from '../pricing/fixtures/team-workbook-development-cases-2026-10-02.json';
import { calculateTeamWorkbookCandidate, estimateWorkbookGlassLoss, workbookComponents, workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { applyCompetitorUplift, calculateFhoneifyPrice, type DiagnosticsType } from '../../lib/pricingCalculator';

const route = { semantics: { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'ASKED' },
  boxMode: 'ASKED', chargerMode: 'ASKED', sPenMode: 'NOT_ASKED', eSimMode: 'NOT_ASKED' } as const;
const clean = (): DiagnosticsType => ({ calls: true, touch: true, originalScreen: true, warranty: false, validBill: true,
  mobileAge: 'above11', eSim: null, accessories: ['box', 'charger'], box: true, charger: true, defects: [], hardware: [],
  screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null });
let checks = 0;
function get(d: DiagnosticsType, extra: object = {}) {
  return calculateTeamWorkbookCandidate({ brand: 'Apple', model: 'Apple iPhone 8', storage: '128 GB', reference: 5850, diagnostics: d, route, ...extra });
}
for (const row of cases) {
  const result = calculateTeamWorkbookCandidate({ brand: row.brand, model: row.model, storage: row.storage,
    reference: row.reference, diagnostics: row.diagnostics, route });
  assert(result.supported, row.caseId); assert.equal(result.quote.cashifyConditionEquivalent, row.observed, row.caseId);
  assert.equal(result.quote.fhoneifyPrice, applyCompetitorUplift(row.reference, row.observed)); checks++;
}
for (const d of [ { ...clean(), calls: null }, { ...clean(), warranty: true }, { ...clean(), validBill: false },
  { ...clean(), mobileAge: null }, { ...clean(), mobileAge: 'below3' }, { ...clean(), eSim: 'Single eSIM' },
  { ...clean(), charger: false }, { ...clean(), box: false }, { ...clean(), accessories: ['box'] },
  { ...clean(), accessories: ['box', 'charger', 'bill'] }, { ...clean(), hardware: ['wifi'] },
  { ...clean(), defects: ['body_bent'] }, { ...clean(), defects: ['screen_scratch'] },
  { ...clean(), bodyBent: 'Bent/ curved panel' }, { ...clean(), screenCondition: 'Screen cracked/ glass broken', hardware: ['charging'] },
  { ...clean(), screenSpots: 'Large/ heavy visible spots on screen', screenLines: 'Visible line(s) on display' },
  { ...clean(), screenDiscoloration: 'Major Discoloration' }, { ...clean(), screenCondition: '1-2 scratches on screen' } ]) {
  assert.equal(get(d).supported, false); checks++;
}
for (const extra of [ { model: 'Apple iPhone 12 Pro', storage: '256 GB' }, { storage: '256 GB' },
  { model: 'Xiaomi 15', brand: 'Xiaomi' }, { reference: NaN }, { reference: 0 },
  { route: { ...route, semantics: { ...route.semantics, ageMode: 'UNKNOWN' } } },
  { route: { ...route, semantics: { ...route.semantics, ageMode: 'NOT_ASKED' } } },
  { route: { ...route, chargerMode: 'NOT_ASKED' } }, { route: { ...route, boxMode: 'NOT_ASKED' } },
  { route: { ...route, semantics: { ...route.semantics, warrantyMode: 'NOT_ASKED' } } },
  { route: { ...route, semantics: { ...route.semantics, billMode: 'NOT_ASKED' } } },
  { baseline: { kind: 'measured_clean_control', cleanSellingPrice: -1 } } ]) {
  assert.equal(get(clean(), extra).supported, false); checks++;
}
assert.equal(get(clean(), { storage: '128GB' }).supported, true); checks++;
assert.notEqual(workbookStorageIdentity('12 GB/512 GB'), workbookStorageIdentity('8 GB/512 GB')); checks++;
assert.notEqual(workbookStorageIdentity('512 GB'), workbookStorageIdentity('12 GB/512 GB')); checks++;
const back = fixture.specs.find(s => s.deviceId === 'FM009')!;
const hardware = { ...clean(), hardware: ['charging', 'charging'] };
const dedup = calculateTeamWorkbookCandidate({ ...back, reference: back.validatedGetUpto, diagnostics: hardware, route });
assert(dedup.supported); assert.equal(dedup.componentDeduction, 2500); checks++;
assert.deepEqual(workbookComponents(hardware), ['charging']); checks++;
const measured = get({ ...clean(), screenCondition: 'Screen cracked/ glass broken' }, { baseline: { kind: 'measured_clean_control', cleanSellingPrice: 5830 } });
assert(measured.supported); assert.equal(measured.baselineKind, 'measured_clean_control'); assert.equal(measured.quote.cashifyConditionEquivalent, 3930); checks++;
assert.equal(estimateWorkbookGlassLoss(0), null); assert.equal(estimateWorkbookGlassLoss(NaN), null); checks++;
assert.equal(estimateWorkbookGlassLoss(940), 1900); checks++;
const activeBefore = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S26 Ultra', 86250, clean());
get(clean()); assert.deepEqual(calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S26 Ultra', 86250, clean()), activeBefore); checks++;
console.log(`PASS workbook candidate ${checks} assertions; fitted cases are development reproductions, not independent validation`);
