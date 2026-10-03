/** Offline actual-service audit. No database, network, production configuration,
 * calibration changes or pickup actions. Prints metrics; --out writes the full
 * per-row audit to an explicitly supplied local path. Historical controls and
 * fitting rows are not relabelled as independent validation.
 *
 * node node_modules/tsx/dist/cli.mjs scripts/pricing/evaluate-release-candidate.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import routeFixture from './fixtures/release-route-evidence-2026-10-02.json';
import savedProduction from './fixtures/release-saved-production-inputs-2026-10-02.json';
import { createPricingService } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { releaseCandidateOutcome } from '../../lib/pricing/releaseCandidate';
import { isQuestionMode, type QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import type { WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import { deviceKey, type ReferencePriceRecord, type ReferencePriceStatus, type MatchConfidence } from '../../lib/referencePricing/types';
import { classifyFreshness } from '../../lib/referencePricing/freshnessPolicy';
import type { QuestionnaireProfileStatus } from '../../lib/referencePricing/questionnaire/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';

const at = new Date('2026-10-03T12:00:00Z');
const capture = new Date('2026-10-02T12:00:00Z');
const assumedProfileDate = '2026-10-03T11:00:00.000Z';
const mode = (v: unknown) => isQuestionMode(v) ? v : 'UNKNOWN';
const storageIdentity = (v: string) => v.replace(/\s+GB/g, 'GB');
const routes: WorkbookRouteEvidence[] = routeFixture.rows.map(r => ({
  ...r, semantics: { warrantyMode: mode(r.semantics.warrantyMode), billMode: mode(r.semantics.billMode), ageMode: mode(r.semantics.ageMode) },
  boxMode: mode(r.boxMode), chargerMode: mode(r.chargerMode), sPenMode: mode(r.sPenMode), eSimMode: mode(r.eSimMode),
}));
const localPath = path.resolve(__dirname, '../../server/data/reference-prices/store.json');
const local: { records: Record<string, ReferencePriceRecord> } = JSON.parse(fs.readFileSync(localPath, 'utf8'));
type Scenario = 'captured' | 'production' | 'local' | 'saved-production-metadata';
function referenceStatus(raw: string): ReferencePriceStatus {
  switch (raw) {
    case 'FRESH': return 'fresh'; case 'APPROACHING_STALE': return 'approaching_stale';
    case 'STALE': return 'stale'; case 'REFRESH_FAILED': return 'refresh_failed'; default: return 'missing';
  }
}
function confidence(raw: string): MatchConfidence {
  switch (raw) { case 'EXACT': return 'exact'; case 'HIGH': return 'high'; case 'AMBIGUOUS': return 'ambiguous'; default: return 'unmatched'; }
}
function profileStatus(raw: string): QuestionnaireProfileStatus {
  switch (raw) {
    case 'OK': return 'OK'; case 'FETCH_FAILED': return 'FETCH_FAILED'; case 'NOT_FOUND': return 'NOT_FOUND';
    case 'VARIANT_MISMATCH': return 'VARIANT_MISMATCH'; default: return 'PARSE_FAILED';
  }
}
interface Row {
  id: string; brand: string; model: string; observed: number; role: string; ok: boolean;
  code?: string; message?: string; prediction?: number; error?: number; ape?: number;
  decision?: string; referenceResolved?: number; referenceStatus?: string; referenceSource?: string | null;
  accessoryBasis?: string;
}
function metrics(rows: Row[]) {
  const numeric = rows.filter(r => r.ok);
  const errors = numeric.map(r => r.error!);
  const ape = numeric.map(r => r.ape!);
  return {
    attempts: rows.length, numeric: numeric.length, refused: rows.length - numeric.length,
    refusals: rows.filter(r => !r.ok).reduce((s, r) => { const k = r.code ?? 'UNKNOWN'; s[k] = (s[k] ?? 0) + 1; return s; }, {} as Record<string, number>),
    mape: ape.length ? ape.reduce((a, b) => a + b, 0) / ape.length : null,
    mae: errors.length ? errors.reduce((s, x) => s + Math.abs(x), 0) / errors.length : null,
    maxApe: ape.length ? Math.max(...ape) : null,
    maxAbsoluteRupeeError: errors.length ? Math.max(...errors.map(Math.abs)) : null,
    maxOverpayment: errors.length ? Math.max(0, ...errors) : null,
    overpayments: errors.filter(x => x > 0).length, underpayments: errors.filter(x => x < 0).length,
    exact: errors.filter(x => x === 0).length, within3: ape.filter(x => x <= 3).length,
  };
}
async function evaluate(kind: Scenario, pricingMode: 'legacy' | 'release-candidate') {
  const rows: Row[] = [];
  for (const o of fixture.observations) {
    if ('excluded' in o) continue;
    const row: Row = { id: o.id, brand: o.brand, model: o.model, observed: o.observed, role: o.provenance.evaluationRole, ok: false };
    const device = findCatalogDevice(o.brand, o.model, o.brand === 'Apple' ? storageIdentity(o.storage) : o.storage);
    if (!device) { rows.push({ ...row, code: 'CATALOG_MISSING' }); continue; }
    const p = fixture.productionInputs.rows.find(r => r.model === o.model && storageIdentity(r.storage) === storageIdentity(o.storage));
    const records = new Map<string, ReferencePriceRecord>();
    const profiles = new InMemoryQuestionnaireProfileStore();
    const price = kind === 'captured' ? o.getUpto : p?.currentPrice;
    const verified = kind === 'captured' ? assumedProfileDate : p?.ageDays != null ? new Date(capture.getTime() - p.ageDays * 86400000).toISOString() : null;
    let semantics: QuestionnaireSemantics | null = null;
    if (kind === 'saved-production-metadata') {
      const saved = savedProduction.rows.find(r => r.expectedKey === deviceKey(device));
      const r = saved?.reference, q = saved?.questionnaire;
      if (r) records.set(deviceKey(device), { ...r, status: referenceStatus(r.status), matchConfidence: confidence(r.matchConfidence),
        lastFailureError: null, createdAt: '' }); // createdAt was not exported and is unused by quote/readiness.
      if (q) profiles.profiles.set(questionnaireModelKey(device), { ...q, brand: device.brand, model: device.model,
        status: profileStatus(q.status), warrantyMode: mode(q.warrantyMode), billMode: mode(q.billMode), ageMode: mode(q.ageMode),
        statusDetail: null, parserVersion: 'saved-owner-approved-read-only-export' });
    } else if (kind === 'local') {
      const record = local.records[deviceKey(device)];
      if (record) records.set(deviceKey(device), record);
    } else {
      if (price && verified) records.set(deviceKey(device), {
        ...device, deviceKey: deviceKey(device), source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh',
        lastVerifiedAt: verified, lastAttemptedAt: verified, lastFailureAt: null, lastFailureError: null,
        consecutiveFailures: 0, createdAt: verified, updatedAt: verified,
      });
      semantics = kind === 'captured' ? {
        warrantyMode: mode(o.route.warranty), billMode: mode(o.route.validBill), ageMode: mode(o.route.mobileAge),
      } : p ? { warrantyMode: mode(p.warrantyMode), billMode: mode(p.billMode), ageMode: mode(p.ageMode) } : null;
    }
    if (semantics) profiles.profiles.set(questionnaireModelKey(device), {
      ...semantics, ...device, modelKey: questionnaireModelKey(device), questionLabels: [], status: 'OK', statusDetail: null,
      sourceUrl: null, variantsChecked: 1, parserVersion: 'offline-sensitivity-assumption', observedAt: assumedProfileDate,
    });
    const service = createPricingService({
      repository: {
        async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
        async upsert() { throw new Error('READ_ONLY_AUDIT'); }, async appendHistory() { throw new Error('READ_ONLY_AUDIT'); }, async getHistory() { return []; },
      }, questionnaireStore: profiles, releaseRouteEvidence: routes, catalog: [device], now: () => at, pricingMode,
      signingSecret: 'offline-research-signing-key-not-a-production-secret', tokenTtlSeconds: 900, strictReferenceMode: true,
      ...(kind === 'local' ? {} : { snapshot: {} }), referenceLookupTimeoutMs: 100,
      logger: { info() {}, warn() {}, error() {} },
    });
    try {
      const q = await service.quote({ ...device, diagnostics: o.diagnostics });
      if (q.ok) {
        const prediction = q.internal.cashifyConditionEquivalent;
        const error = prediction - o.observed;
        rows.push({ ...row, ok: true, prediction, error, ape: Math.abs(error) / o.observed * 100,
          decision: q.internal.releaseCandidate?.kind ?? 'LEGACY_MODE', accessoryBasis: q.internal.accessoryBasis,
          referenceResolved: q.internal.cashifyGetUptoReference, referenceStatus: q.referenceStatus, referenceSource: q.internal.referenceSource });
      } else rows.push({ ...row, code: q.code, message: q.message });
    } catch (err) { rows.push({ ...row, code: 'THROWN', message: String(err) }); }
  }
  return {
    summary: metrics(rows),
    byBrand: Object.fromEntries([...new Set(rows.map(r => r.brand))].map(b => [b, metrics(rows.filter(r => r.brand === b))])),
    byHistoricalRole: Object.fromEntries([...new Set(rows.map(r => r.role))].map(role => [role, metrics(rows.filter(r => r.role === role))])),
    byDecision: Object.fromEntries([...new Set(rows.filter(r => r.ok).map(r => r.decision))].map(d => [d!, metrics(rows.filter(r => r.ok && r.decision === d))])), rows,
  };
}
function knownProductionReadiness() {
  return routes.map(r => {
    const p = savedProduction.rows.find(p => p.expectedKey === deviceKey({ ...r, storage: r.brand === 'Apple' ? storageIdentity(r.storage) : r.storage }));
    const ref = p?.reference, q = p?.questionnaire;
    const o = fixture.observations.find(o => o.model === r.model && storageIdentity(o.storage) === storageIdentity(r.storage) && o.provenance.evaluationRole === 'CLEAN_CONTROL_OR_BASELINE_OBSERVATION');
    const parsed = parseDiagnostics(o?.diagnostics);
    if (!parsed.ok) throw new Error(`Invalid saved clean control for ${r.model}`);
    return { model: r.model, storage: r.storage, outcome: releaseCandidateOutcome({
      device: r, reference: ref?.currentPrice ?? 0, referenceFresh: !!ref?.lastVerifiedAt && classifyFreshness({ lastVerifiedAt: ref.lastVerifiedAt, consecutiveFailures: ref.consecutiveFailures, now: at }) === 'fresh', referenceSource: ref?.source ?? null,
      baseSource: 'reference_repository', referenceLastVerifiedAt: ref?.lastVerifiedAt ?? null, referenceExact: ref?.matchConfidence === 'EXACT',
      questionnaire: { warrantyMode: mode(q?.warrantyMode), billMode: mode(q?.billMode), ageMode: mode(q?.ageMode), source: 'profile',
        ...(q ? { status: q.status, observedAt: q.observedAt } : {}) },
      routeEvidence: routes, diagnostics: parsed.value, now: at,
    }) };
  });
}
async function main() {
  const scenarios: Record<string, Awaited<ReturnType<typeof evaluate>>> = {};
  for (const kind of ['captured', 'production', 'local', 'saved-production-metadata'] as const) for (const pricingMode of ['legacy', 'release-candidate'] as const) scenarios[`${kind}:${pricingMode}`] = await evaluate(kind, pricingMode);
  const readiness = knownProductionReadiness();
  const report = {
    at: at.toISOString(), productionAgeAnchor: capture.toISOString(),
    assumptions: {
      captured: 'Observed Get Upto and actual route, represented by synthetic fresh/exact repository and profile metadata; no measured-clean runtime substitution.',
      production: 'Actual saved production prices/three modes and approximate age. Source/exact confidence/profile status/date are synthetic sensitivity assumptions, not proven availability.',
      local: 'Actual checked-in repository/materialized inputs and absent local profiles: UNKNOWN fallback; no invented freshness/profile metadata.',
      savedProductionMetadata: 'Owner-approved historical READ ONLY export: actual source/confidence/status/verification dates and profile status/date; no synthetic readiness metadata. No new production query. Snapshot queriedAt ' + savedProduction.queriedAt,
      independence: 'Historical aggregate contains fitting, repeats, controls and preserved holdouts. Numeric refusals are not zero-error quotes. Measured-clean diagnostic results remain separate in preserved reports.',
    }, scenarios,
    strictKnownProductionAvailability: { numeric: readiness.filter(r => r.outcome.kind === 'VERIFIED').length, total: readiness.length, rows: readiness },
  };
  const outputIndex = process.argv.indexOf('--out');
  if (outputIndex >= 0) {
    const output = process.argv[outputIndex + 1];
    if (!output) throw new Error('--out requires a local filename');
    fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ at: report.at, assumptions: report.assumptions,
    scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, { ...v.summary,
      numericByDecision: Object.fromEntries(Object.entries(v.byDecision).map(([d, m]) => [d, m.numeric])) }])),
    strictKnownProductionAvailability: { numeric: report.strictKnownProductionAvailability.numeric, total: readiness.length } }, null, 2));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
