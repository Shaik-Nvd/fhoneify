/** Release scope register and launch evaluation (2026-10-03). Offline: no
 * database, network, production configuration or Cashify request. Calls the
 * actual pricing service under three explicitly labelled input scenarios:
 *
 *   captured  - observed Get Upto at collection, actual route (development fit view)
 *   saved     - owner-approved READ ONLY production export of 2026-10-02 (actual metadata)
 *   overlay   - LOCAL_REFRESH_OVERLAY: `saved` with only the eight keys fetched by the
 *               2026-10-03 existing-refresh dry-run replaced by their live values. Never
 *               written anywhere; models what the existing refresh would store.
 *
 * node ../../../node_modules/tsx/dist/cli.mjs scripts/pricing/release-scope-register.ts [--out file] [--at ISO]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import routeFixture from './fixtures/release-route-evidence-2026-10-02.json';
import savedProduction from './fixtures/release-saved-production-inputs-2026-10-02.json';
import dryRun from './fixtures/claude-reference-dry-run-2026-10-03.json';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION } from '../../lib/pricing/pricingService';
import { findCatalogDevice, type CatalogDevice } from '../../lib/pricing/catalog';
import { RC_ALLOWLIST } from '../../lib/pricing/releaseCandidate';
import { isBoxIncludedIdentity } from '../../lib/pricing/accessoryBasis';
import { isQuestionMode, type QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import type { WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import { workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { customerPayout } from '../../lib/pricing/payout';
import { deviceKey, type ReferencePriceRecord, type MatchConfidence, type ReferencePriceStatus } from '../../lib/referencePricing/types';
import { validatePriceObservation } from '../../lib/referencePricing/validation';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey, type QuestionnaireProfileStatus } from '../../lib/referencePricing/questionnaire/types';

const argAt = process.argv.indexOf('--at');
const at = new Date(argAt >= 0 ? process.argv[argAt + 1] : '2026-10-03T12:00:00Z');
const OVERLAY_VERIFIED_AT = '2026-10-03T05:26:14.165Z'; // dry-run Finished time (live-dry-run.log)
const assumedProfileDate = '2026-10-03T11:00:00.000Z';
const mode = (v: unknown) => isQuestionMode(v) ? v : 'UNKNOWN';
const appleStorage = (v: string) => v.replace(/\s+GB/g, 'GB');
const argRoutes = process.argv.indexOf('--routes');
const routeSource: { rows: any[] } = argRoutes >= 0 ? JSON.parse(fs.readFileSync(process.argv[argRoutes + 1], 'utf8')) : routeFixture;
const routes: WorkbookRouteEvidence[] = routeSource.rows.map((r: any) => ({
  ...r, semantics: { warrantyMode: mode(r.semantics.warrantyMode), billMode: mode(r.semantics.billMode), ageMode: mode(r.semantics.ageMode) },
  boxMode: mode(r.boxMode), chargerMode: mode(r.chargerMode), sPenMode: mode(r.sPenMode), eSimMode: mode(r.eSimMode),
}));
const status = (raw: string): ReferencePriceStatus => ({ FRESH: 'fresh', APPROACHING_STALE: 'approaching_stale', STALE: 'stale', REFRESH_FAILED: 'refresh_failed' } as Record<string, ReferencePriceStatus>)[raw] ?? 'missing';
const confidence = (raw: string): MatchConfidence => ({ EXACT: 'exact', HIGH: 'high', AMBIGUOUS: 'ambiguous' } as Record<string, MatchConfidence>)[raw] ?? 'unmatched';
const overlay = new Map(dryRun.rows.map(r => [r.deviceKey, r.liveDryRun]));
type Scenario = 'captured' | 'saved' | 'overlay';
type Decision = 'CANDIDATE_VERIFIED' | 'ACCESSORY_CORRECTED' | 'LEGACY_FALLBACK' | 'LEGACY_MODE' | 'INSPECTION' | 'REFUSED_OTHER';

function catalogDevice(brand: string, model: string, storage: string) {
  return findCatalogDevice(brand, model, brand === 'Apple' ? appleStorage(storage) : storage);
}
/** One isolated service per call: inputs never leak between rows. */
function serviceFor(kind: Scenario, device: CatalogDevice, pricingMode: 'legacy' | 'release-candidate',
  captured?: { getUpto: number; route: { warranty: string; validBill: string; mobileAge: string } }, log?: string[]) {
  const records = new Map<string, ReferencePriceRecord>();
  const profiles = new InMemoryQuestionnaireProfileStore();
  const key = deviceKey(device);
  if (kind === 'captured' && captured) {
    records.set(key, { ...device, deviceKey: key, source: 'cashify', currentPrice: captured.getUpto, matchConfidence: 'exact', status: 'fresh',
      lastVerifiedAt: assumedProfileDate, lastAttemptedAt: assumedProfileDate, lastFailureAt: null, lastFailureError: null,
      consecutiveFailures: 0, createdAt: assumedProfileDate, updatedAt: assumedProfileDate });
    const s: QuestionnaireSemantics = { warrantyMode: mode(captured.route.warranty), billMode: mode(captured.route.validBill), ageMode: mode(captured.route.mobileAge) };
    profiles.profiles.set(questionnaireModelKey(device), { ...s, ...device, modelKey: questionnaireModelKey(device), questionLabels: [], status: 'OK',
      statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'offline-captured-route', observedAt: assumedProfileDate });
  } else {
    const saved = savedProduction.rows.find(r => r.expectedKey === key);
    const r = saved?.reference, q = saved?.questionnaire;
    if (r) {
      const live = kind === 'overlay' ? overlay.get(key) : undefined;
      records.set(key, { ...r, status: status(r.status), matchConfidence: confidence(r.matchConfidence), lastFailureError: null, createdAt: '',
        ...(live != null ? { currentPrice: live, lastVerifiedAt: OVERLAY_VERIFIED_AT, lastAttemptedAt: OVERLAY_VERIFIED_AT, updatedAt: OVERLAY_VERIFIED_AT } : {}) });
    }
    if (q) profiles.profiles.set(questionnaireModelKey(device), { ...q, brand: device.brand, model: device.model,
      status: q.status as QuestionnaireProfileStatus, warrantyMode: mode(q.warrantyMode), billMode: mode(q.billMode), ageMode: mode(q.ageMode),
      statusDetail: null, parserVersion: 'saved-owner-approved-read-only-export' });
  }
  return createPricingService({
    repository: { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
      async upsert() { throw new Error('READ_ONLY'); }, async appendHistory() { throw new Error('READ_ONLY'); }, async getHistory() { return []; } },
    questionnaireStore: profiles, releaseRouteEvidence: routes, catalog: [device], now: () => at, pricingMode, snapshot: {},
    signingSecret: 'offline-register-signing-key-not-a-production-secret', tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
    logger: { info(o: any) { if (o?.reason) log?.push(o.reason); }, warn() {}, error() {} },
  });
}
async function price(kind: Scenario, device: CatalogDevice, pricingMode: 'legacy' | 'release-candidate', diagnostics: unknown,
  captured?: Parameters<typeof serviceFor>[3]) {
  const log: string[] = [];
  const q = await serviceFor(kind, device, pricingMode, captured, log).quote({ ...device, diagnostics });
  if (!q.ok) return { decision: (q.code === 'MANUAL_INSPECTION_REQUIRED' ? 'INSPECTION' : 'REFUSED_OTHER') as Decision, code: q.code, reason: log[0] ?? q.message };
  const rc = q.internal.releaseCandidate;
  const decision: Decision = pricingMode === 'legacy' ? 'LEGACY_MODE' : rc?.kind === 'VERIFIED' ? 'CANDIDATE_VERIFIED'
    : q.internal.accessoryBasis.startsWith('GET_UPTO_INCLUDES') ? 'ACCESSORY_CORRECTED' : 'LEGACY_FALLBACK';
  return { decision, estimate: q.internal.cashifyConditionEquivalent, fhoneifyPrice: q.fhoneifyPrice, reference: q.internal.cashifyGetUptoReference,
    accessoryBasis: q.internal.accessoryBasis, rule: rc?.kind === 'VERIFIED' ? rc.evidence : null };
}

const CLEAN = { calls: true, touch: true, originalScreen: true, defects: [] as string[], screenCondition: null as string | null, // the UI sends null unless a screen defect is ticked
  screenSpots: 'No spots on screen', screenLines: 'No line(s) on Display', screenDiscoloration: 'No Discoloration',
  bodyScratches: 'No scratches', bodyDents: 'No dents', bodyPanel: 'No defect on side or back panel', bodyBent: 'Phone not bent',
  hardware: [] as string[], accessories: ['box', 'charger'], warranty: null as boolean | null, validBill: null as boolean | null, eSim: null, mobileAge: null };
const COMPONENT: Record<string, Partial<typeof CLEAN>> = {
  screen_heavy: { defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' },
  glass_cracked: { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' },
  display_lines: { defects: ['screen_spot'], screenLines: 'Visible line(s) on display' },
  display_spots: { defects: ['screen_spot'], screenSpots: 'Large/ heavy visible spots on screen' },
  body_heavy: { defects: ['body_scratch'], bodyScratches: 'More than 2 scratches' },
  body_dents: { defects: ['body_scratch'], bodyDents: 'Major dent(s) or more than 2' },
};
/** Warranty No / bill Yes where asked (route, else the saved profile), box and charger present. */
function routeAnswers(route: WorkbookRouteEvidence | undefined, extra: Partial<typeof CLEAN> = {}, profile?: { warrantyMode?: string; billMode?: string } | null) {
  const warranty = route?.semantics.warrantyMode ?? profile?.warrantyMode, bill = route?.semantics.billMode ?? profile?.billMode;
  return { ...CLEAN, accessories: route?.chargerMode === 'NOT_ASKED' ? ['box'] : ['box', 'charger'],
    warranty: warranty === 'ASKED' ? false : null, validBill: bill === 'ASKED' ? true : null, ...extra };
}
const pct = (e: number, o: number) => Math.abs(e) / o * 100;
const round2 = (n: number | null) => n == null ? null : Math.round(n * 100) / 100;
function metrics(rows: { ok: boolean; error?: number; ape?: number }[]) {
  const n = rows.filter(r => r.ok); const e = n.map(r => r.error!), a = n.map(r => r.ape!);
  return { rows: rows.length, numeric: n.length, refused: rows.length - n.length,
    mape: round2(a.length ? a.reduce((s, x) => s + x, 0) / a.length : null), mae: round2(e.length ? e.reduce((s, x) => s + Math.abs(x), 0) / e.length : null),
    maxApe: round2(a.length ? Math.max(...a) : null), maxSignedOverpayment: e.length ? Math.max(0, ...e) : null, maxUnderpayment: e.length ? Math.min(0, ...e) : null,
    within3: a.filter(x => x <= 3).length, outside3: a.filter(x => x > 3).length, overpayments: e.filter(x => x > 0).length, underpayments: e.filter(x => x < 0).length };
}

async function evaluateObservations(kind: Scenario) {
  const out: any[] = [];
  for (const o of fixture.observations as any[]) {
    if ('excluded' in o) continue;
    const device = catalogDevice(o.brand, o.model, o.storage);
    const base = { id: o.id, brand: o.brand, model: o.model, storage: o.storage, observed: o.observed, getUpto: o.getUpto, role: o.provenance.evaluationRole, collectedAt: o.collectedAt };
    if (!device) { out.push({ ...base, legacy: { decision: 'REFUSED_OTHER', code: 'CATALOG_MISSING' }, rc: { decision: 'REFUSED_OTHER', code: 'CATALOG_MISSING' } }); continue; }
    const captured = { getUpto: o.getUpto, route: o.route };
    const [legacy, rc] = await Promise.all([price(kind, device, 'legacy', o.diagnostics, captured), price(kind, device, 'release-candidate', o.diagnostics, captured)]);
    const score = (r: any) => r.estimate == null ? { ...r, ok: false } : { ...r, ok: true, error: r.estimate - o.observed, ape: round2(pct(r.estimate - o.observed, o.observed)) };
    out.push({ ...base, legacy: score(legacy), rc: score(rc) });
  }
  const rc = out.map(r => r.rc), lg = out.map(r => r.legacy);
  const matched = out.filter(r => r.rc.ok && r.legacy.ok);
  const byDecision = Object.fromEntries(['CANDIDATE_VERIFIED', 'ACCESSORY_CORRECTED', 'LEGACY_FALLBACK'].map(d => {
    const rows = out.filter(r => r.rc.decision === d);
    return [d, { rc: metrics(rows.map(r => r.rc)), legacySameRows: metrics(rows.map(r => r.legacy)) }];
  }));
  const coverage = rc.reduce((s: Record<string, number>, r: any) => { s[r.decision] = (s[r.decision] ?? 0) + 1; return s; }, {});
  return {
    coverage, legacy: metrics(lg), rc: metrics(rc),
    matchedCohort: { rows: matched.length, legacy: metrics(matched.map(r => r.legacy)), rc: metrics(matched.map(r => r.rc)) },
    byDecision,
    rcFailuresOutside3: out.filter(r => r.rc.ok && r.rc.ape > 3).map(r => ({ id: r.id, model: r.model, storage: r.storage, role: r.role, decision: r.rc.decision,
      observed: r.observed, estimate: r.rc.estimate, signedError: r.rc.error, ape: r.rc.ape })),
    rows: out,
  };
}

async function register() {
  const out: any[] = [];
  for (const s of savedProduction.rows) {
    const ref = s.reference, q = s.questionnaire;
    const [brand, model] = [ref?.brand, ref?.model];
    const device = ref ? findCatalogDevice(ref.brand, ref.model, ref.storage) : null;
    const route = device ? routes.find(r => r.brand === device.brand && r.model === device.model && workbookStorageIdentity(r.storage) === workbookStorageIdentity(device.storage)) : undefined;
    const spec = device ? RC_ALLOWLIST.find(x => x.brand === device.brand && x.model === device.model && workbookStorageIdentity(x.storage) === workbookStorageIdentity(device.storage)) : undefined;
    const scope = !device ? 'NO_REFERENCE_OR_CATALOG'
      : (device.model === 'Xiaomi 14 Ultra') ? 'INSPECTION_QUARANTINE'
      : spec?.family === 'fresh-glass' && (spec as any).cleanRetention > 1 ? 'INSPECTION_HEADLINE_BLOCK'
      : spec ? 'CANDIDATE' : isBoxIncludedIdentity(device) ? 'ACCESSORY_ONLY'
      : device.model === 'Xiaomi Redmi Note 15 Pro Plus 5G' ? 'LEGACY_FALLBACK_HARDWARE_INSPECTION' : 'LEGACY_FALLBACK';
    const components = spec && 'componentCosts' in spec ? Object.keys(spec.componentCosts) : spec?.family === 'fresh-glass' ? ['screen_heavy', 'glass_cracked'] : ['screen_heavy', 'glass_cracked', 'body_heavy', 'body_dents'];
    const conditions: Record<string, any> = {};
    if (device) for (const kind of ['saved', 'overlay'] as const) {
      const c: Record<string, any> = {};
      c.clean = await price(kind, device, 'release-candidate', routeAnswers(route, {}, q));
      for (const comp of components) {
        c[comp] = await price(kind, device, 'release-candidate', routeAnswers(route, COMPONENT[comp], q));
        c[comp + ':legacyMode'] = await price(kind, device, 'legacy', routeAnswers(route, COMPONENT[comp], q));
      }
      c.missingBox = await price(kind, device, 'release-candidate', routeAnswers(route, { accessories: route?.chargerMode === 'NOT_ASKED' ? [] : ['charger'] }, q));
      c['clean:legacyMode'] = await price(kind, device, 'legacy', routeAnswers(route, {}, q));
      conditions[kind] = c;
    }
    const live = ref ? overlay.get(ref.deviceKey) : undefined;
    out.push({
      deviceId: s.deviceId, key: s.expectedKey, brand: brand ?? null, model: model ?? null, scope,
      questionnaire: q ? { warranty: q.warrantyMode, bill: q.billMode, age: q.ageMode, status: q.status, observedAt: q.observedAt } : null,
      route: route ? { observedAt: route.observedAt, box: route.boxMode, charger: route.chargerMode, sPen: route.sPenMode, eSim: route.eSimMode, baselineGetUpto: route.baselineGetUpto ?? null } : null,
      referenceDomain: { saved: ref?.currentPrice ?? null, savedVerifiedAt: ref?.lastVerifiedAt ?? null, liveDryRun2026_10_03: live ?? null,
        calibration: spec?.validatedGetUpto ?? route?.baselineGetUpto ?? null,
        ingestionCheck: live != null && ref ? validatePriceObservation({ price: live, previousPrice: ref.currentPrice }) : null },
      candidate: spec ? { family: spec.family, evidence: spec.evidence, baseline: 'baseline' in spec ? spec.baseline : { kind: 'clean_retention', retention: (spec as any).cleanRetention },
        components: 'componentCosts' in spec ? spec.componentCosts : { screen_heavy: (spec as any).heavyScratchLoss, glass_cracked: 'estimateWorkbookGlassLoss(heavyScratchLoss)' } } : null,
      conditions,
    });
  }
  return out;
}

/** Weekly refresh: the same answers at the calibration reference and at a
 * +1% moved reference. Shows which routes stay eligible after a move. */
async function movement() {
  const out: any[] = [];
  for (const route of routes) {
    const device = findCatalogDevice(route.brand, route.model, route.brand === 'Apple' ? appleStorage(route.storage) : route.storage);
    if (!device) continue;
    const spec = RC_ALLOWLIST.find(x => x.brand === device.brand && x.model === device.model && workbookStorageIdentity(x.storage) === workbookStorageIdentity(device.storage));
    const cal = spec?.validatedGetUpto ?? route.baselineGetUpto; if (!cal) continue;
    const comp = spec && 'componentCosts' in spec ? Object.keys(spec.componentCosts)[0] : 'screen_heavy';
    const res: Record<string, any> = { model: device.model, storage: device.storage, calibration: cal };
    for (const [label, ref] of [['atCalibration', cal], ['moved+1%', Math.round(cal * 1.01 / 10) * 10]] as const) {
      const captured = { getUpto: ref, route: { warranty: route.semantics.warrantyMode, validBill: route.semantics.billMode, mobileAge: route.semantics.ageMode } };
      const c = await price('captured', device, 'release-candidate', routeAnswers(route), captured);
      const d = await price('captured', device, 'release-candidate', routeAnswers(route, COMPONENT[comp]), captured);
      res[label] = { reference: ref, clean: c.decision === 'INSPECTION' ? 'INSPECTION' : `${c.decision} ${(c as any).estimate}`, [comp]: d.decision === 'INSPECTION' ? 'INSPECTION' : `${d.decision} ${(d as any).estimate}` };
    }
    out.push(res);
  }
  return out;
}

function payoutChain(rows: any[]) {
  return rows.filter(r => r.rc.ok).map(r => {
    const p = customerPayout(r.rc.fhoneifyPrice, false);
    return { id: r.id, model: r.model, decision: r.rc.decision, cashifySelling: r.observed, getUpto: r.rc.reference, estimate: r.rc.estimate,
      uplift: r.rc.fhoneifyPrice - r.rc.estimate, fhoneifyQuote: r.rc.fhoneifyPrice, fee: p.deduction, payout: p.payout, payoutMinusCashify: p.payout - r.observed };
  });
}
function capBoundaries() {
  const cases: [string, number, number][] = [
    ['8% tier, low price (fee exceeds uplift below ~1,238)', 1760, 1200], ['8% tier break-even', 20000, 1238], ['8% tier top', 20000, 19980],
    ['6% tier just above 8% boundary', 20010, 19990], ['6% tier at cap threshold', 50000, 33333], ['6% tier capped', 50000, 40000],
    ['4% tier (Open clean)', 51650, 40310], ['4% tier at cap threshold', 120000, 50000], ['4% tier capped', 120000, 90000],
  ];
  return cases.map(([label, ref, estimate]) => { const q = applyCompetitorUplift(ref, estimate), p = customerPayout(q, false);
    return { label, getUpto: ref, estimate, uplift: q - estimate, fhoneifyQuote: q, fee: p.deduction, payout: p.payout, netAdvantage: p.payout - estimate }; });
}

async function main() {
  const scenarios: Record<string, any> = {};
  for (const kind of ['captured', 'saved', 'overlay'] as const) scenarios[kind] = await evaluateObservations(kind);
  const holdouts = (scenarios.overlay.rows as any[]).concat().filter(r => /PRESERVED_PREREGISTERED/.test(r.role))
    .map(r => ({ id: r.id, model: r.model, role: r.role, observed: r.observed, rcDecision: r.rc.decision, rcReason: r.rc.reason ?? null, rcEstimate: r.rc.estimate ?? null,
      legacyEstimate: r.legacy.estimate ?? null, legacySignedError: r.legacy.error ?? null }));
  const report = {
    version: 'release-scope-register/2026-10-03', pricingVersion: RELEASE_CANDIDATE_PRICING_VERSION, evaluatedAt: at.toISOString(),
    inputs: Object.fromEntries(['release-candidate-observations-2026-10-02', 'release-route-evidence-2026-10-02', 'release-saved-production-inputs-2026-10-02', 'claude-reference-dry-run-2026-10-03']
      .map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'fixtures', `${f}.json`))).digest('hex')])),
    labels: { overlay: `LOCAL_REFRESH_OVERLAY: saved export with ${overlay.size} dry-run keys replaced, lastVerifiedAt ${OVERLAY_VERIFIED_AT}; not written anywhere` },
    register: await register(), movement: await movement(), holdouts,
    payout: { overlay: payoutChain(scenarios.overlay.rows), formulaBoundaries: capBoundaries() },
    scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, { ...v, rows: undefined }])),
    rows: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, v.rows])),
  };
  const outIndex = process.argv.indexOf('--out');
  if (outIndex >= 0) fs.writeFileSync(path.resolve(process.argv[outIndex + 1]), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ at: report.evaluatedAt, pricingVersion: report.pricingVersion,
    scenarios: Object.fromEntries(Object.entries(report.scenarios).map(([k, v]: [string, any]) => [k, { coverage: v.coverage, matched: v.matchedCohort, byDecision: v.byDecision, outside3: v.rcFailuresOutside3.length }])) }, null, 1));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
