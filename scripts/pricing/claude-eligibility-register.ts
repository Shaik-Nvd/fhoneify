/**
 * Claude-owned diagnostic (read-only, database-free): why do the release
 * candidates' eight measured scopes reject the saved production inputs?
 *
 * Every guard of lib/pricing/releaseCandidate.ts is evaluated independently
 * (not just the first failure) against the approved read-only export
 * scripts/pricing/fixtures/release-saved-production-inputs-2026-10-02.json,
 * at the export time and at a later review time. A counterfactual candidate
 * run at the stored reference shows what the guard is protecting against;
 * it is diagnostic only and never a runtime input.
 *
 *   npx tsx scripts/pricing/claude-eligibility-register.ts [--now ISO]
 */
import fs from 'fs';
import crypto from 'crypto';
import saved from './fixtures/release-saved-production-inputs-2026-10-02.json';
import routes from './fixtures/release-route-evidence-2026-10-02.json';
import { RC_ALLOWLIST } from '../../lib/pricing/releaseCandidate';
import { workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { classifyFreshness } from '../../lib/referencePricing/freshnessPolicy';
import { calculateXiaomiWorkbookEvidenceCandidate } from '../../lib/pricing/xiaomiWorkbookEvidenceCandidate';
import { calculateOnePlusDisplayEvidenceCandidate } from '../../lib/pricing/onePlusDisplayEvidenceCandidate';
import { calculateFreshGlassEvidenceCandidate } from '../../lib/pricing/freshGlassEvidenceCandidate';

const nowArg = process.argv.indexOf('--now');
const times = { export: new Date(saved.queriedAt), review: new Date(nowArg > 0 ? process.argv[nowArg + 1] : '2026-10-03T12:00:00Z') };
const same = (a: { model: string; storage: string }, b: { model: string; storage: string }) =>
  a.model === b.model && workbookStorageIdentity(a.storage) === workbookStorageIdentity(b.storage);
const fresh = (t: string | null | undefined, now: Date) => !!t && Date.parse(t) <= now.getTime() &&
  classifyFreshness({ lastVerifiedAt: t, consecutiveFailures: 0, now }) === 'fresh';
const cleanDiagnostics = (route: any) => ({
  calls: true, touch: true, originalScreen: true, defects: [], hardware: [], screenCondition: null, screenSpots: null, screenLines: null,
  screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  warranty: route.semantics.warrantyMode === 'ASKED' ? false : null, validBill: route.semantics.billMode === 'ASKED' ? true : null,
  mobileAge: null, eSim: null, box: true, charger: route.chargerMode === 'ASKED' ? true : null,
  accessories: route.chargerMode === 'ASKED' ? ['box', 'charger'] : ['box'] } as any);

const register = RC_ALLOWLIST.map((spec: any) => {
  const prod: any = (saved as any).rows.find((r: any) => r.reference && same(r.reference, spec));
  const route: any = (routes as any).rows.find((r: any) => r.brand === spec.brand && same(r, spec));
  const ref = prod?.reference ?? null, q = prod?.questionnaire ?? null;
  const guards = (now: Date) => ({
    routeEvidencePresentAndFresh: !!route && fresh(route.observedAt, now) && /^[a-f0-9]{64}$/.test(route.evidenceSha256),
    profileStoredOkFresh: !!q && q.status === 'OK' && fresh(q.observedAt, now),
    profileModesMatchRoute: !!q && !!route && (['warrantyMode', 'billMode', 'ageMode'] as const).every((k) => q[k] === route.semantics[k]),
    referenceCashifyExactFresh: !!ref && ref.source === 'cashify' && ref.matchConfidence === 'EXACT' && ref.status === 'FRESH' && fresh(ref.lastVerifiedAt, now),
    referenceEqualsCalibration: !!ref && ref.currentPrice === spec.validatedGetUpto,
    calibrationFresh: fresh(spec.calibratedAt, now),
  });
  const g = { atExport: guards(times.export), atReview: guards(times.review) };
  const calibrationCapture = Math.max(...(spec.source ?? []).map((s: any) => Date.parse(s.collectedAt)).filter(Number.isFinite));
  let counterfactual: any = null;
  if (ref && route) {
    const args = { ...spec, reference: ref.currentPrice, diagnostics: cleanDiagnostics(route), route, now: times.export };
    const r: any = spec.family === 'xiaomi-workbook' ? calculateXiaomiWorkbookEvidenceCandidate(args)
      : spec.family === 'oneplus-display' ? calculateOnePlusDisplayEvidenceCandidate(args) : calculateFreshGlassEvidenceCandidate(args);
    const measuredClean = spec.source?.[0]?.observed ?? null;
    counterfactual = r.supported ? { cleanAtStoredReference: r.quote.cashifyConditionEquivalent, measuredCleanAtCalibration: measuredClean,
      differenceRs: measuredClean == null ? null : r.quote.cashifyConditionEquivalent - measuredClean } : { unsupported: r.reason };
  }
  const failing = Object.entries(g.atExport).filter(([, ok]) => !ok).map(([k]) => k);
  const category = !ref ? 'MISSING_REFERENCE'
    : failing.some((k) => k.startsWith('profile') || k === 'routeEvidencePresentAndFresh') ? 'QUESTIONNAIRE_OR_ROUTE_UNVERIFIED'
    : failing.includes('referenceCashifyExactFresh') ? 'STALE_OR_UNVERIFIED_REFERENCE'
    : failing.length === 1 && failing[0] === 'referenceEqualsCalibration' ? 'GUARD_PINNED_TO_CALIBRATION_AMOUNT'
    : failing.length ? 'MULTIPLE' : 'ELIGIBLE';
  return {
    scope: `${spec.brand} ${spec.model} ${spec.storage}`, family: spec.family, evidence: spec.evidence,
    storedReference: ref && { amount: ref.currentPrice, source: ref.source, matchConfidence: ref.matchConfidence, status: ref.status, lastVerifiedAt: ref.lastVerifiedAt, sourceUrl: ref.sourceUrl },
    calibrationReference: { amount: spec.validatedGetUpto, capturedAt: Number.isFinite(calibrationCapture) ? new Date(calibrationCapture).toISOString() : null, calibratedAt: spec.calibratedAt },
    referenceDeltaRs: ref ? ref.currentPrice - spec.validatedGetUpto : null,
    referencePredatesCalibration: ref && Number.isFinite(calibrationCapture) ? Date.parse(ref.lastVerifiedAt) < calibrationCapture : null,
    cleanBaselineRule: spec.baseline ? spec.baseline : { kind: 'clean_retention', retention: spec.cleanRetention },
    questionnaire: q && { status: q.status, observedAt: q.observedAt, warranty: q.warrantyMode, bill: q.billMode, age: q.ageMode },
    route: route && { observedAt: route.observedAt, semantics: route.semantics, box: route.boxMode, charger: route.chargerMode, sPen: route.sPenMode, eSim: route.eSimMode },
    guards: g, failingAtExport: failing, failingAtReview: Object.entries(g.atReview).filter(([, ok]) => !ok).map(([k]) => k),
    category, counterfactual,
  };
});
const out = { generatedFrom: { saved: saved.sourceSha256, savedQueriedAt: saved.queriedAt, reviewTime: times.review.toISOString() }, register };
const json = JSON.stringify(out, null, 2) + '\n';
fs.writeFileSync('scripts/pricing/fixtures/claude-eligibility-register-2026-10-03.json', json);
for (const r of register) console.log([r.scope, r.category, `ref ${r.storedReference?.amount ?? '-'} @${r.storedReference?.lastVerifiedAt?.slice(0, 10) ?? '-'}`,
  `cal ${r.calibrationReference.amount} @${r.calibrationReference.capturedAt?.slice(0, 16)}`, `Δ${r.referenceDeltaRs}`, `predates=${r.referencePredatesCalibration}`,
  `fail@export=[${r.failingAtExport}]`, `fail@review=[${r.failingAtReview}]`, `cf=${JSON.stringify(r.counterfactual)}`].join(' | '));
console.log('sha256', crypto.createHash('sha256').update(json).digest('hex'));
