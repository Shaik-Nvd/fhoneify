import { referenceBonus } from '../../lib/pricing/referenceBonus';
/**
 * Traced Selling captures (2026-10-10) for six exact iPhone variants, through the real, offline pricing
 * service. No network, no database, no Cashify request. An exact capture applies only at its own Get Upto
 * and with its own route/profile; any other reference keeps the existing hybrid result.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadExactFinalQuoteFile } from '../../lib/pricing/exactFinalQuoteFile';
import { existingExactFinalQuoteIndex } from '../pricing/exact-final-quote-evidence';
import { boundedCompetitiveOffer, type ExactFinalQuoteEvidence } from '../../lib/pricing/exactFinalQuote';
import { createPricingService } from '../../lib/pricing/pricingService';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { customerPayout } from '../../lib/pricing/payout';

const MANIFEST = 'scripts/pricing/fixtures/exact-captures-2026-10-10.json';
const ROUTES = 'scripts/pricing/fixtures/release-route-evidence-2026-10-10-iphone-captures.json';
const at = new Date('2026-10-11T12:00:00Z');
const rows = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).rows as ExactFinalQuoteEvidence[];
const routes = loadReleaseRouteEvidence(ROUTES);
const payouts = (gross: number, headroom: number) => ({ standard: customerPayout(gross, false, headroom).payout, coupon: customerPayout(gross, true, headroom).payout });
const inCorridor = (payout: number, selling: number) => payout > selling && payout - selling <= 1000;

async function main() {
  // 1. Existing validation: nothing rejected; 6 variants x (clean key + Face ID key) = 12 exact keys; repeats share a key.
  const index = loadExactFinalQuoteFile(MANIFEST);
  assert.deepEqual(index.rejected, []);
  assert.equal(index.size, 12);
  assert.equal(routes.length, 6);
  assert.ok(rows.every((r) => r.provenance.screenshotVerified && r.provenance.planMatched && r.provenance.routeComplete));
  console.log(`PASS manifest validates through the existing index: ${rows.length} rows, 0 rejected, ${index.size} exact keys, 6 routes`);

  // 2. Corridor on every captured profile, both coupon states.
  for (const row of rows) {
    const gross = boundedCompetitiveOffer(row.getUpto, row.sellingPrice);
    for (const coupon of [false, true]) assert.ok(inCorridor(customerPayout(gross, coupon).payout, row.sellingPrice), `${row.id} coupon=${coupon}`);
  }
  console.log('PASS 0 < payout - Cashify Selling <= 1000, coupon off and on, for all captured profiles');

  const table: string[] = [];
  const variants = [...new Set(rows.map((r) => `${r.brand}|${r.model}|${r.storage}`))];
  for (const id of variants) {
    const [brand, model, storage] = id.split('|');
    const device = findCatalogDevice(brand, model, storage)!;
    const route = routes.find((r) => r.model === model && r.storage.replace(/\s/g, '') === storage)!;
    const profiles = new InMemoryQuestionnaireProfileStore();
    profiles.profiles.set(questionnaireModelKey(device), { brand, model, modelKey: questionnaireModelKey(device), warrantyMode: route.semantics.warrantyMode,
      billMode: route.semantics.billMode, ageMode: route.semantics.ageMode, questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null,
      variantsChecked: 1, parserVersion: 'offline', observedAt: '2026-10-10T18:27:01.643Z' });
    let record!: ReferencePriceRecord;
    const setReference = (price: number) => {
      const stamp = '2026-10-10T18:30:00.000Z';
      record = { ...device, deviceKey: deviceKey(device), source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: stamp,
        lastAttemptedAt: stamp, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: stamp, updatedAt: stamp };
    };
    const base = {
      repository: { async get() { return record; }, async listAll() { return [record]; }, async upsert() { throw new Error('offline'); }, async appendHistory() { throw new Error('offline'); }, async getHistory() { return []; } },
      questionnaireStore: profiles, releaseRouteEvidence: routes, pricingMode: 'hybrid' as const,
      signingSecret: 'iphone-captures-offline-signing-secret-not-production', tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
      logger: { info() {}, warn() {}, error() {} }, snapshot: {}, catalog: [device], now: () => at,
    };
    const hybrid = createPricingService(base);
    const exact = createPricingService({ ...base, exactFinalQuoteIndex: existingExactFinalQuoteIndex(), exactFinalQuoteOfferPolicy: 'bounded-net' });
    const captured = rows.filter((r) => `${r.brand}|${r.model}|${r.storage}` === id);
    const profileRows = new Map<string, ExactFinalQuoteEvidence>();
    for (const r of captured) profileRows.set(JSON.stringify((r.diagnostics as { hardware: string[] }).hardware), r);

    for (const row of profileRows.values()) {
      const label = (row.diagnostics as { hardware: string[] }).hardware.length ? 'Face ID' : 'clean';
      const input = { ...device, diagnostics: row.diagnostics as never };
      setReference(row.getUpto);
      const before = await hybrid.quote(input);
      const after = await exact.quote(input);
      assert.ok(before.ok && after.ok, `${model} ${storage} ${label}: quotes stay available`);
      assert.ok(after.internal.exactFinalQuote, `${model} ${storage} ${label}: exact capture applies at its own reference`);
      assert.equal(after.internal.cashifyConditionEquivalent, row.sellingPrice);
      // Service payouts consume the signed allowance; research helpers above deliberately use the full coupon.
      const b = payouts(before.fhoneifyPrice, before.couponHeadroom), a = payouts(after.fhoneifyPrice, after.couponHeadroom);
      const expectedGross = Math.round(row.sellingPrice + referenceBonus(row.getUpto));
      assert.equal(after.fhoneifyPrice, expectedGross, 'captured Selling plus the approved original-reference bonus');
      assert.equal(after.couponHeadroom, 0, 'full reference bonus leaves no extra coupon budget');
      assert.equal(a.standard, expectedGross - 99);
      assert.equal(a.coupon, a.standard);
      assert.ok(inCorridor(a.standard, row.sellingPrice) && inCorridor(a.coupon, row.sellingPrice), `${model} ${storage} ${label}: ${JSON.stringify(a)}`);
      table.push(`${model} ${storage}`.padEnd(26) + label.padEnd(8) + `Selling ${row.sellingPrice}`.padEnd(15) + `before ${b.standard}/${b.coupon} (${b.standard - row.sellingPrice >= 0 ? '+' : ''}${b.standard - row.sellingPrice})`.padEnd(34) + `after ${a.standard}/${a.coupon} (+${a.standard - row.sellingPrice})`);

      // A moved reference must not be relabelled as eligible, and the quote stays available and unchanged.
      setReference(row.getUpto + 500);
      const movedExact = await exact.quote(input), movedHybrid = await hybrid.quote(input);
      assert.ok(movedExact.ok && movedHybrid.ok);
      assert.equal(movedExact.internal.exactFinalQuote, undefined, `${model} ${storage} ${label}: moved reference must fall back`);
      assert.equal(movedExact.fhoneifyPrice, movedHybrid.fhoneifyPrice);
    }
  }
  console.log('PASS exact capture applies only at its own reference; every other reference keeps the hybrid quote\n' + table.join('\n'));
  console.log('iPhone captures: all groups passed; zero network, zero database writes');
}
main().catch((e) => { console.error(e); process.exit(1); });
