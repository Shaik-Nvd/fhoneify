/** Portable real-router integration using genuine read-only production inputs; no live writes/collection. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import captured from '../pricing/fixtures/exact-captures-2026-10-10.json';
import c1 from '../pricing/fixtures/exact-captures-2026-10-11-iphone12.json';
import snapshot from './fixtures/composed-iphone-production-inputs-2026-10-11.json';
import { existingExactFinalQuoteEvidence } from '../pricing/exact-final-quote-evidence';
import { createPricingService } from '../../lib/pricing/pricingService';
import { createExactFinalQuoteIndex, type ExactFinalQuoteEvidence } from '../../lib/pricing/exactFinalQuote';
import { loadExactFinalQuoteFile } from '../../lib/pricing/exactFinalQuoteFile';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';
import { customerPayout } from '../../lib/pricing/payout';
const sentinel = 'postgresql://offline:offline@127.0.0.1:1/none?connect_timeout=1';
Object.assign(process.env, { DATABASE_URL: sentinel, DIRECT_URL: sentinel, NODE_ENV: 'test', LOG_LEVEL: 'silent',
 JWT_SECRET: 'composed-offline-jwt', QUOTE_SIGNING_SECRET: 'composed-offline-signing-secret-32-plus', ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false',
 QUOTE_PRICE_RATE_LIMIT: '1000', QUOTE_LEAD_RATE_LIMIT: '1000', EXACT_FINAL_QUOTE_EVIDENCE_FILE: 'scripts/pricing/fixtures/exact-captures-2026-10-11-iphone12.json',
 PRICING_RELEASE_ROUTE_EVIDENCE_FILE: 'scripts/pricing/fixtures/release-route-evidence-2026-10-11-iphone12.json' });
async function main() {
 const all = existingExactFinalQuoteEvidence(), previous = all.filter(r => !r.id.startsWith('shoaeb-iphone12-2026-10-11:'));
 assert.equal(captured.rows.length, 13); assert.equal(c1.rows.length, 1);
 for (const row of captured.rows) assert.deepEqual(all.find(r => r.id === row.id), row);
 assert.equal(createExactFinalQuoteIndex(previous).size, 128); assert.equal(createExactFinalQuoteIndex(all).size, 129);
 const index = loadExactFinalQuoteFile(process.env.EXACT_FINAL_QUOTE_EVIDENCE_FILE!, all);
 assert.equal(index.size, 129); assert.deepEqual(index.rejected, createExactFinalQuoteIndex(previous).rejected);
 const config = resolvePricingReleaseConfig(process.env), routes = loadReleaseRouteEvidence(config.routeEvidenceFile!);
 assert.equal(config.routeEvidenceFile!.split(',').length, 3); assert.equal(routes.length, 51);
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'composed-evidence-'));
 try {
  const bad = path.join(temp, 'conflict.json');
  fs.writeFileSync(bad, JSON.stringify({ version: 'exact-final-quote-evidence/1', rows: [{ ...captured.rows[0], sellingPrice: 1 }] }));
  assert.throws(() => loadExactFinalQuoteFile(bad, all), /Conflicting exact evidence identity/);
 } finally { fs.rmSync(temp, { recursive: true }); }
 const now = new Date(snapshot.checkedAt);
 const records = snapshot.references.map(r => ({ ...r, status: r.status.toLowerCase(), matchConfidence: r.matchConfidence.toLowerCase() }));
 const make = (rows: any = all, rr: any = routes) => createPricingService({
  repository: { get: async key => records.find(r => r.deviceKey === key) as any, listAll: async () => records as any,
   upsert: async () => { throw Error('No writes'); }, appendHistory: async () => { throw Error('No writes'); }, getHistory: async () => [] },
  questionnaireStore: { get: async (key: string) => snapshot.profiles.find(p => p.modelKey === key) } as any,
  pricingMode: 'hybrid', releaseRouteEvidence: rr, exactFinalQuoteIndex: rows === all ? index : createExactFinalQuoteIndex(rows), exactFinalQuoteOfferPolicy: 'bounded-net',
  signingSecret: process.env.QUOTE_SIGNING_SECRET!, tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
  snapshot: {}, now: () => now, logger: { info() {}, warn() {}, error() {} } });
 const before = make(previous, routes.filter(r => r.model !== 'Apple iPhone 12')), after = make();
 const [{ default: express }, { default: prisma }, { pricingService, pricingStatus }, { default: router }] = await Promise.all([
  import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'), import('../../server/modules/quote/routes')]);
 // 2026-10-28: the committed configuration disables the runtime captured-price cache (served iPhone quotes come from the calibrated rules)
 assert.equal(pricingStatus(now).exactFinalQuoteCache.uniqueKeys, 0, 'the runtime exact cache is disabled by config/pricing-release.json');
 assert.equal(pricingStatus(now).releaseRoutes, 51, 'actual runtime C1-only route override preserves all manifests');
 prisma.$connect = async () => { throw Error('No production connections'); };
 let selected: any, active = after;
 pricingService.quote = async input => { selected = await active.quote(input); return selected; };
 pricingService.verifyLeadPrice = input => active.verifyLeadPrice(input);
 const accepted = { id: 'already-accepted', quotedPrice: 17311, answers: c1.rows[0].diagnostics };
 const saved: any[] = [accepted], immutable = JSON.stringify(accepted);
 Object.defineProperty(prisma.lead, 'count', { value: async () => 0, configurable: true }); // coupon history: none, no database
 Object.defineProperty(prisma.lead, 'create', { value: async ({ data }: any) => { saved.push(data); return { ...data, id: `offline-${saved.length}` }; } });
 const app = express(); app.use(express.json()); app.use('/api/quote', router);
 const server = await new Promise<import('node:http').Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
 const addr = server.address(); assert(addr && typeof addr !== 'string');
 const post = async (endpoint: string, body: any) => { const r = await fetch(`http://127.0.0.1:${addr.port}/api/quote/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() as any }; };
 const unique: any[] = [...new Map(captured.rows.map(r => [`${r.model}|${r.storage}|${JSON.stringify(r.diagnostics)}`, r])).values()];
 assert.equal(unique.length, 12);
 const table: any[] = [];
 try {
  for (const row of [...unique, c1.rows[0]]) {
   const req = { brand: row.brand, model: row.model, storage: row.storage, diagnostics: row.diagnostics };
   const old = await before.quote(req); assert(old.ok);
   const response = await post('price', req); assert.equal(response.status, 200);
   const q = selected; assert(q.ok && q.internal.exactFinalQuote);
   assert.equal(q.internal.cashifyConditionEquivalent, row.sellingPrice);
   const expectedIds = captured.rows.filter(r => r.model === row.model && r.storage === row.storage && JSON.stringify(r.diagnostics) === JSON.stringify(row.diagnostics)).map(r => r.id);
   if (row.id === c1.rows[0].id) expectedIds.push(row.id);
   assert.deepEqual([...q.internal.exactFinalQuote.evidenceIds].sort(), expectedIds.sort());
   if (row.id !== c1.rows[0].id) {
    assert.equal(q.fhoneifyPrice, old.fhoneifyPrice); assert.equal(q.pricingVersion, old.pricingVersion);
    assert.deepEqual(q.internal.exactFinalQuote, old.internal.exactFinalQuote);
   }
   const off = customerPayout(q.fhoneifyPrice, false).payout, on = customerPayout(q.fhoneifyPrice, true, q.couponHeadroom).payout;
   assert(off > row.sellingPrice && off - row.sellingPrice <= 2000);
   assert(on > row.sellingPrice && on - row.sellingPrice <= 2000);
   for (const couponApplied of [false, true]) {
    const body = { ...req, answers: row.diagnostics, phone: '9876500000', quotedPrice: q.fhoneifyPrice, couponApplied };
    const count = saved.length;
    for (const quoteToken of [undefined, 'invalid']) { assert.equal((await post('leads', { ...body, quoteToken })).status, 409); assert.equal(saved.length, count); }
    const issued = await post('leads', { ...body, quoteToken: old.quoteToken });
    assert.equal(issued.status, row.id === c1.rows[0].id ? 409 : 200);
    if (row.id === c1.rows[0].id) assert.equal(saved.length, count);
    assert.equal((await post('leads', { ...body, quoteToken: q.quoteToken })).status, 200);
    assert.equal(saved.at(-1).answers.pricing.customerPayout.payout, couponApplied ? on : off);
    assert.deepEqual(saved.at(-1).answers.pricing.exactFinalQuote.evidenceIds, q.internal.exactFinalQuote.evidenceIds);
   }
   table.push({ evidenceIds: q.internal.exactFinalQuote.evidenceIds, model: row.model, storage: row.storage, selling: row.sellingPrice,
    beforeGross: old.fhoneifyPrice, gross: q.fhoneifyPrice, beforeOff: customerPayout(old.fhoneifyPrice, false).payout,
    beforeOn: customerPayout(old.fhoneifyPrice, true).payout, off, on, offMargin: off - row.sellingPrice, onMargin: on - row.sellingPrice,
    fingerprint: q.internal.exactFinalQuote.fingerprint, pricingVersion: q.pricingVersion });
  }
  const row = c1.rows[0], req = { brand: row.brand, model: row.model, storage: row.storage, diagnostics: row.diagnostics };
  const fresh = await after.quote(req); assert(fresh.ok); active = before;
  const count = saved.length;
  for (const couponApplied of [false, true]) assert.equal((await post('leads', { ...req, answers: req.diagnostics, phone: '9876500000', quotedPrice: fresh.fhoneifyPrice, quoteToken: fresh.quoteToken, couponApplied })).status, 409);
  assert.equal(saved.length, count); assert.equal(JSON.stringify(saved[0]), immutable);
  console.log('COMPOSED_ROUTER ' + JSON.stringify({ currentReferenceSnapshot: snapshot.checkedAt, profiles: table.length, preservedPriorProfiles: 12, storedPriorRows: 13, routes: routes.length, exactKeys: index.size, table, productionWrites: 0, collectionRequests: 0, acceptedCommitmentPreserved: true, rollbackRepricedTokensRequireReview: true }));
 } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await prisma.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
