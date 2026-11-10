import { referenceBonus } from '../../lib/pricing/referenceBonus';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Server } from 'node:http';
import captured from '../pricing/fixtures/exact-captures-2026-10-11-iphone12.json';
import baseline from './fixtures/iphone12-reported-profiles-2026-10-11.json';
import { createPricingService } from '../../lib/pricing/pricingService';
import { createExactFinalQuoteIndex, type ExactFinalQuoteEvidence } from '../../lib/pricing/exactFinalQuote';
import { existingExactFinalQuoteEvidence } from '../pricing/exact-final-quote-evidence';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';
import { customerPayout } from '../../lib/pricing/payout';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { applyCompetitorUplift, calculateApplePrice } from '../../lib/pricingCalculator';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
Object.assign(process.env, { DATABASE_URL: sentinel, DIRECT_URL: sentinel, NODE_ENV: 'test',
  JWT_SECRET: 'captured-in-memory-jwt-secret', QUOTE_SIGNING_SECRET: 'captured-in-memory-signing-secret-at-least-32',
  ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false', CASHIFY_FINAL_QUOTE_MAX_ATTEMPTS: '0',
  QUOTE_PRICE_RATE_LIMIT: '1000', QUOTE_LEAD_RATE_LIMIT: '1000' });

async function main() {
  assert.equal(captured.rows.length, 1, 'ambiguous C2 and unattempted C3/C4 must not be imported');
  const row = captured.rows[0] as ExactFinalQuoteEvidence;
  const identity = { brand: row.brand, model: row.model, storage: row.storage };
  const input = { ...identity, diagnostics: row.diagnostics };
  const now = new Date(Date.parse(row.observedAt) + 60000);
  const profiles = new InMemoryQuestionnaireProfileStore();
  profiles.profiles.set(baseline.profile.modelKey, baseline.profile as any);
  let record: any = { ...baseline.reference, status: 'fresh', matchConfidence: 'exact' };
  const repository = {
    async get(key: string) {
      const sibling = baseline.siblingReferences.find(r => r.deviceKey === key);
      return key === record.deviceKey ? record : sibling ? { ...sibling, status: 'fresh', matchConfidence: 'exact' } as any : null;
    }, async listAll() { return [record]; }, async getHistory() { return []; },
    async upsert() { throw Error('Writes forbidden'); }, async appendHistory() { throw Error('Writes forbidden'); },
  };
  const configured = resolvePricingReleaseConfig({}, process.cwd());
  const routes = loadReleaseRouteEvidence(configured.routeEvidenceFile!);
  assert.equal(routes.length, 51);
  for (const file of configured.routeEvidenceFile!.split(',')) assert(fs.existsSync(file), 'every configured route file must exist');
  assert.throws(() => loadReleaseRouteEvidence(`${configured.routeEvidenceFile},scripts/pricing/fixtures/release-route-evidence-2026-10-11-iphone12.json`), /Duplicate/);
  assert.throws(() => loadReleaseRouteEvidence(`${configured.routeEvidenceFile},absent-file.json`), /ENOENT/);
  const allRows = existingExactFinalQuoteEvidence();
  const oldRows = allRows.filter(r => r.provenance.source !== 'shoaeb-iphone12-2026-10-11');
  const make = (rows = allRows, routeEvidence = routes, at = now) => createPricingService({ repository,
    questionnaireStore: profiles, signingSecret: process.env.QUOTE_SIGNING_SECRET!, tokenTtlSeconds: 900,
    referenceLookupTimeoutMs: 100, strictReferenceMode: true, snapshot: {}, now: () => at,
    pricingMode: 'hybrid', exactFinalQuoteIndex: createExactFinalQuoteIndex(rows),
    exactFinalQuoteOfferPolicy: 'bounded-net', releaseRouteEvidence: routeEvidence,
    logger: { info() {}, warn() {}, error() {} } });
  const before = make(oldRows, routes.filter(r => r.model !== 'Apple iPhone 12')), after = make();
  const oldQuote = await before.quote(input); assert(oldQuote.ok);
  // This suite verifies router/capture wiring. Fallback amounts follow the current rules,
  // rather than the historical reported baseline (retained below as an immutable commitment).
  const ruleQuote = (diagnostics: unknown) => {
    const parsed = parseDiagnostics(diagnostics); assert(parsed.ok);
    return calculateApplePrice(identity.model, record.currentPrice, parsed.value, baseline.profile as any, identity.storage);
  };
  assert.equal(oldQuote.internal.cashifyConditionEquivalent, ruleQuote(row.diagnostics).cashifyConditionEquivalent);
  assert.equal(oldQuote.fhoneifyPrice, ruleQuote(row.diagnostics).fhoneifyPrice);
  const [{ default: express }, { default: prisma }, { pricingService, pricingRelease }, { default: router }] = await Promise.all([
    import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'), import('../../server/modules/quote/routes')]);
  prisma.$connect = async () => { throw Error('No database connections'); };
  const acceptedCommitment = { id: 'already-accepted', quotedPrice: 17311, answers: row.diagnostics };
  const frozenCommitment = JSON.stringify(acceptedCommitment);
  const persisted: any[] = [acceptedCommitment];
  Object.defineProperty(prisma.lead, 'create', { value: async ({ data }: any) => {
    persisted.push(data); return { ...data, id: `in-memory-${persisted.length}` };
  } });
  Object.assign(pricingService, after); pricingRelease.mode = 'hybrid';
  const app = express(); app.use(express.json()); app.use('/api/quote', router);
  const server: Server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const address = server.address(); assert(address && typeof address !== 'string');
  const post = async (route: string, body: any) => {
    const response = await fetch(`http://127.0.0.1:${address.port}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const response = await post('/api/quote/price', input); assert.equal(response.status, 200);
    const quote = response.body.data;
    const expectedGross = Math.round(row.sellingPrice + referenceBonus(row.getUpto));
    assert.equal(quote.fhoneifyPrice, expectedGross, 'actual router preserves captured Selling plus original-reference bonus');
    assert.equal(quote.fhoneifyPrice, applyCompetitorUplift(row.getUpto, row.sellingPrice), 'preferred uplift is preserved');
    const internal = await after.quote(input); assert(internal.ok);
    assert.deepEqual(internal.internal.exactFinalQuote!.evidenceIds, [row.id]);
    assert.equal(internal.internal.cashifyConditionEquivalent, 11340);
    assert.equal(quote.pricingVersion, internal.pricingVersion);
    assert.notEqual(quote.pricingVersion, oldQuote.pricingVersion);
    const table = { evidenceId: row.id, selling: row.sellingPrice, beforeGross: oldQuote.fhoneifyPrice, afterGross: quote.fhoneifyPrice,
      beforeOff: customerPayout(oldQuote.fhoneifyPrice, false, oldQuote.couponHeadroom).payout, beforeOn: customerPayout(oldQuote.fhoneifyPrice, true, oldQuote.couponHeadroom).payout,
      afterOff: customerPayout(quote.fhoneifyPrice, false, quote.couponHeadroom).payout, afterOn: customerPayout(quote.fhoneifyPrice, true, quote.couponHeadroom).payout };
    assert.equal(quote.couponHeadroom, 0, 'reference bonus exhausts the permitted coupon budget');
    assert.equal(table.afterOff, expectedGross - 99); assert.equal(table.afterOn, table.afterOff);
    for (const payout of [table.afterOff, table.afterOn]) assert(payout > row.sellingPrice && payout - row.sellingPrice <= 1000);
    const submit = (token: string | undefined, couponApplied: boolean, answers = row.diagnostics) => post('/api/quote/leads', {
      ...identity, phone: '0000000000', answers, quoteToken: token, quotedPrice: quote.fhoneifyPrice, couponApplied });
    for (const coupon of [false, true]) {
      for (const token of [oldQuote.quoteToken, undefined, 'invalid']) {
        const result = await submit(token, coupon); assert.equal(result.status, 409);
        assert.equal(persisted.length, 1, 'changed/unaccepted quote must require fresh review before persistence');
      }
    }
    for (const coupon of [false, true]) {
      assert.equal((await submit(quote.quoteToken, coupon)).status, 200);
      const saved = persisted.at(-1);
      assert.equal(saved.quotedPrice, quote.fhoneifyPrice);
      assert.equal(saved.answers.pricing.customerPayout.payout, coupon ? table.afterOn : table.afterOff);
      assert.deepEqual(saved.answers.pricing.exactFinalQuote.evidenceIds, [row.id]);
    }
    assert.equal(JSON.stringify(persisted[0]), frozenCommitment, 'accepted commitment is immutable');
    const d = row.diagnostics as any;
    for (const changed of [{ ...d, calls: false }, { ...d, touch: false }, { ...d, originalScreen: false }, { ...d, warranty: false }, { ...d, validBill: false }, { ...d, mobileAge: 'above11' },
      { ...d, hardware: ['face', 'battery_service'] }, { ...d, accessories: [] }, { ...d, screenCondition: '1-2 scratches on screen' }]) {
      const trial = { ...identity, diagnostics: changed }, q = await after.quote(trial), b = await before.quote(trial);
      // Calibrated rules may require inspection for non-working or unsupported answers.
      // Adding an exact capture must preserve that refusal as well as ordinary fallback quotes.
      assert.equal(q.ok, b.ok);
      if (!q.ok || !b.ok) {
        assert(!q.ok && !b.ok);
        assert.equal(q.code, b.code); assert.equal(q.code, 'MANUAL_INSPECTION_REQUIRED');
      } else {
        assert.equal(q.internal.exactFinalQuote, undefined); assert.equal(q.fhoneifyPrice, b.fhoneifyPrice);
      }
    }
    const rawSelector = await post('/api/quote/price', { ...input, diagnostics: { ...d, defects: ['broken_screen'] } });
    assert.equal(rawSelector.status, 422, 'collector ID must never weaken public matching');
    for (const storage of ['64GB', '128GB']) {
      const trial = { ...input, storage }, q = await after.quote(trial), b = await before.quote(trial);
      assert(q.ok && b.ok); assert.equal(q.internal.exactFinalQuote, undefined); assert.equal(q.fhoneifyPrice, b.fhoneifyPrice);
    }
    for (const c of baseline.cases.slice(1)) {
      const q = await post('/api/quote/price', { ...identity, diagnostics: c.controlledDiagnostics });
      assert.equal(q.status, 200); assert.equal(q.body.data.fhoneifyPrice, ruleQuote(c.controlledDiagnostics).fhoneifyPrice, 'unresolved C2-C4 use current calibrated rules');
      const prior = await before.quote({ ...identity, diagnostics: c.controlledDiagnostics }); assert(prior.ok);
      const accepted = await after.verifyLeadPrice({ ...identity, diagnostics: c.controlledDiagnostics,
        quoteToken: prior.quoteToken, clientQuotedPrice: prior.fhoneifyPrice });
      assert(accepted.ok); assert.equal(accepted.audit.priceSource, 'quote_token', 'unchanged issued quotes retain acceptance');
    }
    const original = record;
    for (const overrides of [{ currentPrice: 18631 }, { lastVerifiedAt: '2026-09-01T00:00:00.000Z' }, { source: 'catalog' }, { matchConfidence: 'unmatched' }]) {
      record = { ...original, ...overrides };
      const q = await after.quote(input), b = await before.quote(input); assert(q.ok && b.ok);
      assert.equal(q.internal.exactFinalQuote, undefined); assert.equal(q.fhoneifyPrice, b.fhoneifyPrice);
    }
    record = original;
    const oldRoute = routes.map(r => r.model === identity.model ? { ...r, observedAt: '2026-09-01T00:00:00.000Z' } : r);
    const staleRoute = await make(allRows, oldRoute).quote(input); assert(staleRoute.ok); assert.equal(staleRoute.internal.exactFinalQuote, undefined);
    const oldCapture = allRows.map(r => r.id === row.id ? { ...r, observedAt: '2026-09-01T00:00:00.000Z' } : r);
    const staleCapture = await make(oldCapture).quote(input); assert(staleCapture.ok); assert.equal(staleCapture.internal.exactFinalQuote, undefined);
    profiles.profiles.set(baseline.profile.modelKey, { ...baseline.profile, warrantyMode: 'ASKED' } as any);
    const incompatible = await after.quote(input); assert(incompatible.ok); assert.equal(incompatible.internal.exactFinalQuote, undefined);
    profiles.profiles.set(baseline.profile.modelKey, baseline.profile as any);
    Object.assign(pricingService, before);
    const count = persisted.length;
    assert.equal((await submit(quote.quoteToken, false)).status, 409, 'rollback also requires fresh review for a changed unaccepted quote');
    assert.equal(persisted.length, count); assert.equal(JSON.stringify(persisted[0]), frozenCommitment);
    Object.assign(pricingService, after);
    console.log('CAPTURED_PAYOUTS ' + JSON.stringify(table));
    console.log('PASS C1 router activation, exact evidence ID, both net payouts, fresh acceptance, immutable commitment, and reference/route/answer guards; C2-C4 unresolved');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
