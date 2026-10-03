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
const unmeasured = add('OnePlus', 'OnePlus 9 5G', '8 GB/128 GB', 9710, 'NOT_ASKED');
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
  // NOT_ASKED alone grants no correction to an unmeasured model.
  const ru = await q(rc, clean, unmeasured), lu = await q(legacy, clean, unmeasured); assert(ru.ok && lu.ok);
  assert.equal(ru.fhoneifyPrice, lu.fhoneifyPrice); assert.equal(ru.internal.accessoryBasis, 'LEGACY_BOX_BONUS'); checks++;
  // Preserve the research Apple result, but block binding headline activation.
  const ap = await q(rc, { ...clean, accessories: ['box'] }, apple); assert(!ap.ok);
  assert.equal(ap.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal('quoteToken' in ap, false); checks++;
  console.log(`PASS release-candidate accessory basis ${checks} checks; default legacy unchanged`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
