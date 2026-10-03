/**
 * Release-candidate accessory basis (lib/pricing/accessoryBasis.ts): default
 * legacy pricing is unchanged; RC accessory accounting requires a measured
 * exact variant, compatible inputs and verified route. NOT_ASKED alone grants
 * no correction. Missing accessories remain unsupported.
 */
import assert from 'node:assert/strict';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { PRICING_ENGINE_VERSION } from '../../lib/pricing/engine';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';

const at = new Date('2026-10-03T12:00:00Z'), t = '2026-10-03T11:00:00Z';
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore();
function add(brand: string, model: string, storage: string, price: number, mode: 'ASKED' | 'NOT_ASKED') {
  const device = findCatalogDevice(brand, model, storage)!; assert(device, model); const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: t,
    lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { warrantyMode: mode, billMode: mode, ageMode: 'NOT_ASKED', brand: device.brand, model: device.model,
    modelKey: questionnaireModelKey(device), questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'fixture', observedAt: t });
  return device;
}
const nord = add('OnePlus', 'OnePlus Nord', '8 GB/128 GB', 8340, 'NOT_ASKED');
const open = add('OnePlus', 'Oneplus Open', '16 GB/512 GB', 51650, 'ASKED');
const ablationMeasured = add('OnePlus', 'OnePlus 9 5G', '8 GB/128 GB', 9710, 'NOT_ASKED');
const apple = add('Apple', 'Apple iPhone 12 Pro', '256GB', 24460, 'NOT_ASKED');
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; } };
const make = (pricingMode?: 'legacy' | 'release-candidate') => createPricingService({ repository, questionnaireStore: profiles, now: () => at, pricingMode,
  releaseRouteEvidence: loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-02.json'),
  signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900, strictReferenceMode: true,
  referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const clean = { calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: 'No scratches', bodyDents: 'No dents', bodyPanel: 'No defect on side or back panel', bodyBent: 'Phone not bent', hardware: [],
  accessories: ['box', 'charger'], warranty: null, validBill: null, eSim: null, mobileAge: null };
let checks = 0;
async function main() {
  const legacy = make(), implicit = make(undefined), rc = make('release-candidate');
  const q = (s: ReturnType<typeof make>, d: object, dev = nord) => s.quote({ brand: dev.brand, model: dev.model, storage: dev.storage, diagnostics: d });
  // Default and explicit legacy are identical and keep the box bonus.
  const l = await q(legacy, clean), i = await q(implicit, clean);
  assert(l.ok && i.ok); assert.equal(l.fhoneifyPrice, i.fhoneifyPrice); assert.equal(l.pricingVersion, PRICING_ENGINE_VERSION);
  assert.equal(l.internal.accessoryBasis, 'LEGACY_BOX_BONUS'); checks++;
  // RC, all-NOT_ASKED route: box bonus removed; Cashify paid Get Upto - 20 = 8,320 for this answer set.
  const r = await q(rc, clean); assert(r.ok);
  assert.equal(r.internal.accessoryBasis, 'GET_UPTO_INCLUDES_BOX_AND_CHARGER');
  assert.equal(r.pricingVersion, RELEASE_CANDIDATE_PRICING_VERSION);
  assert(l.internal.cashifyConditionEquivalent - r.internal.cashifyConditionEquivalent >= 300, 'bonus removed');
  assert(Math.abs(r.internal.cashifyConditionEquivalent - 8320) < Math.abs(l.internal.cashifyConditionEquivalent - 8320)); checks++;
  assert.equal(r.fhoneifyPrice, applyCompetitorUplift(8340, r.internal.cashifyConditionEquivalent)); checks++;
  // RC, missing box is unsupported, with no binding price or token.
  const noBox = await q(rc, { ...clean, accessories: ['charger'] }), legacyNoBox = await q(legacy, { ...clean, accessories: ['charger'] });
  assert(!noBox.ok && legacyNoBox.ok); assert.equal(noBox.code, 'MANUAL_INSPECTION_REQUIRED');
  assert.equal('quoteToken' in noBox, false); checks++;
  // RC, measured ASKED route uses its own candidate, no NOT_ASKED box claim.
  const asked = { ...clean, warranty: false, validBill: true };
  const ra = await q(rc, asked, open), la = await q(legacy, asked, open); assert(ra.ok && la.ok);
  assert.equal(ra.internal.accessoryBasis, 'CALIBRATED_ROUTE_ACCESSORIES'); assert.equal(ra.internal.cashifyConditionEquivalent, 40310); checks++;
  // Open uses a one-point conditional-retention baseline. A changed fresh
  // Get Upto must not be treated as a reference-relative offset formula.
  const openKey = deviceKey(open), originalOpen = records.get(openKey)!;
  try {
    records.set(openKey, { ...originalOpen, currentPrice: 51410 });
    const changed = await q(rc, { ...clean, warranty: false, validBill: true }, open);
    assert(!changed.ok); assert.equal(changed.code, 'MANUAL_INSPECTION_REQUIRED'); checks++;
  } finally { records.set(openKey, originalOpen); }
  // Tokens: RC token verifies only against an RC service quote of the same answers.
  assert.notEqual(r.quoteToken, l.quoteToken); checks++;
  // The independently audited exact OnePlus 9 route uses the accessory
  // correction; the disabled legacy engine keeps its historical quote.
  const ru = await q(rc, clean, ablationMeasured), lu = await q(legacy, clean, ablationMeasured); assert(ru.ok && lu.ok);
  assert.equal(ru.internal.cashifyConditionEquivalent, 9690); assert.equal(ru.internal.accessoryBasis, 'GET_UPTO_INCLUDES_BOX_AND_CHARGER');
  assert.equal(lu.internal.accessoryBasis, 'LEGACY_BOX_BONUS'); assert.equal(lu.fhoneifyPrice - ru.fhoneifyPrice, 432); checks++;
  const scratched = await q(rc, { ...clean, defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' }, ablationMeasured);
  assert(!scratched.ok); assert.equal(scratched.code, 'MANUAL_INSPECTION_REQUIRED', 'measured +7.9% screen-scratch overpayment on this route'); checks++;
  const glass = await q(rc, { ...clean, defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' }, ablationMeasured);
  assert(!glass.ok); assert.equal(glass.code, 'MANUAL_INSPECTION_REQUIRED', 'measured +26.3% cracked-glass overpayment on this route');
  const functional = await q(rc, { ...clean, hardware: ['wifi'] }, ablationMeasured);
  assert(!functional.ok); assert.equal(functional.code, 'MANUAL_INSPECTION_REQUIRED'); checks++;
  const body = await q(rc, { ...clean, defects: ['body_scratch'], bodyScratches: 'More than 2 scratches' }, ablationMeasured), legacyBody = await q(legacy, { ...clean, defects: ['body_scratch'], bodyScratches: 'More than 2 scratches' }, ablationMeasured);
  assert(body.ok && legacyBody.ok); assert.equal(body.internal.accessoryBasis, 'GET_UPTO_INCLUDES_BOX_AND_CHARGER');
  assert(body.internal.cashifyConditionEquivalent < 9690 && body.internal.cashifyConditionEquivalent < legacyBody.internal.cashifyConditionEquivalent, 'body delta kept, box bonus removed'); checks++;
  for (const unmeasured of [{ bodyScratches: '1-2 scratches' }, { bodyDents: '1-2 minor dents' }, { bodyPanel: 'Cracked/ broken side or back panel' },
    { bodyBent: 'Bent/ curved panel' }, { bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2' }]) {
    const d = { ...clean, defects: [unmeasured.bodyPanel || unmeasured.bodyBent ? 'panel_missing' : 'body_scratch'], ...unmeasured };
    const r = await q(rc, d, ablationMeasured); assert(!r.ok, JSON.stringify(unmeasured)); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED');
  }
  checks++;
  // A moved reference keeps the cross-variant clean rule (Get Upto - 20) but
  // no condition delta: those were checked only at the calibrated reference.
  const nineKey = deviceKey(ablationMeasured), originalNine = records.get(nineKey)!;
  try {
    records.set(nineKey, { ...originalNine, currentPrice: 9720 });
    const changed = await q(rc, clean, ablationMeasured); assert(changed.ok); assert.equal(changed.internal.cashifyConditionEquivalent, 9700);
    const changedScratch = await q(rc, { ...clean, defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' }, ablationMeasured);
    assert(!changedScratch.ok); assert.equal(changedScratch.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal('quoteToken' in changedScratch, false);
  } finally { records.set(nineKey, originalNine); }
  checks++;
  // Stored questionnaire profiles follow the crawl's own 30-day reuse policy,
  // not the 14-day Get Upto window; future-dated and expired ones are refused.
  const ageKey = questionnaireModelKey(ablationMeasured), ageProfile = profiles.profiles.get(ageKey)!;
  try {
    for (const [observedAt, ok] of [['2026-09-24T03:30:00Z', true], ['2026-09-03T11:00:00Z', false], ['2026-10-04T11:00:00Z', false]] as const) {
      profiles.profiles.set(ageKey, { ...ageProfile, observedAt });
      const aged = await q(rc, clean, ablationMeasured); assert.equal(aged.ok, ok, observedAt);
      if (!aged.ok) assert.equal(aged.code, 'MANUAL_INSPECTION_REQUIRED');
    }
  } finally { profiles.profiles.set(ageKey, ageProfile); }
  checks++;
  const profileKey = questionnaireModelKey(ablationMeasured), savedProfile = profiles.profiles.get(profileKey)!;
  try {
    profiles.profiles.delete(profileKey);
    const missingProfile = await q(rc, clean, ablationMeasured); assert(!missingProfile.ok);
    assert(['INVALID_DIAGNOSTICS', 'MANUAL_INSPECTION_REQUIRED'].includes(missingProfile.code)); assert.equal('quoteToken' in missingProfile, false);
    profiles.profiles.set(profileKey, { ...savedProfile, warrantyMode: 'ASKED' });
    const mismatchedRoute = await q(rc, clean, ablationMeasured); assert(!mismatchedRoute.ok); assert.equal(mismatchedRoute.code, 'MANUAL_INSPECTION_REQUIRED');
  } finally { profiles.profiles.set(profileKey, savedProfile); }
  checks++;
  // Missing box remains explicitly unsupported for this evidence route.
  const missingNineBox = await q(rc, { ...clean, accessories: ['charger'] }, ablationMeasured);
  assert(!missingNineBox.ok); assert.equal(missingNineBox.code, 'MANUAL_INSPECTION_REQUIRED'); checks++;
  // Preserve the research Apple result, but block binding headline activation.
  const ap = await q(rc, { ...clean, accessories: ['box'] }, apple); assert(!ap.ok);
  assert.equal(ap.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal('quoteToken' in ap, false); checks++;
  console.log(`PASS release-candidate accessory basis ${checks} checks; default legacy unchanged`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
