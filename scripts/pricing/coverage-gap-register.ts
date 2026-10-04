/** Coverage / gap register for the 50 workbook devices (150 canonical cases).
 * Deterministic, offline: no database, network or Cashify access.
 *
 * For every case: exact variant, condition, observed prices (tester and
 * traced collector), matched same-block clean control, the ACTUAL release
 * service's prediction at the observation's Get Upto and at the current
 * production reference, the guard reason, and the next action. Per device:
 * which evidence exists and exactly what is missing for clean/common-condition
 * activation.
 *
 *   npx tsx scripts/pricing/coverage-gap-register.ts --register <case-register150.json> [--out file] [--md file]
 */
import fs from 'node:fs';
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import followup from './fixtures/release-followup-results-2026-10-03.json';
import routeFixture from './fixtures/release-route-evidence-2026-10-02.json';
import saved from './fixtures/release-saved-production-inputs-2026-10-02.json';
import { createPricingService } from '../../lib/pricing/pricingService';
import { findCatalogDevice, type CatalogDevice } from '../../lib/pricing/catalog';
import { RC_ALLOWLIST, conditionClass } from '../../lib/pricing/releaseCandidate';
import { isBoxIncludedIdentity } from '../../lib/pricing/accessoryBasis';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { workbookComponents, workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { isQuestionMode } from '../../lib/pricing/questionnaireSemantics';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';

const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const parsedRegister = JSON.parse(fs.readFileSync(arg('--register')!, 'utf8'));
const register: any[] = Array.isArray(parsedRegister) ? parsedRegister : parsedRegister.cases;
if (!Array.isArray(register) || register.length !== 150 || new Set(register.map(r => r.caseId)).size !== 150) {
  throw new Error('Expected a canonical 150-case register with unique exact case identities');
}
const at = new Date(arg('--at') ?? '2026-10-03T19:00:00Z');
const mode = (v: unknown) => isQuestionMode(v) ? v : 'UNKNOWN';
const routes = loadReleaseRouteEvidence(arg('--routes') ?? 'scripts/pricing/fixtures/release-route-evidence-2026-10-02.json');
// Production references after the 2026-10-03 targeted refresh (run 37142985497), else the saved export.
const REFRESHED: Record<string, number> = { 'xiaomi|xiaomi mi a2|4 gb/64 gb': 2520, 'xiaomi|xiaomi redmi note 9 pro|4 gb/128 gb': 4990,
  'xiaomi|xiaomi redmi note 10 pro max|6 gb/128 gb': 5970, 'xiaomi|xiaomi 14 civi|8 gb/256 gb': 18900, 'oneplus|oneplus nord|8 gb/128 gb': 8340,
  'oneplus|oneplus open|16 gb/512 gb': 51650, 'samsung|samsung galaxy s23 fe 5g|8 gb/128 gb': 18060 };
const REFRESHED_AT = '2026-10-03T18:08:00.000Z';

function catalog(brand: string, model: string, storage: string) {
  return findCatalogDevice(brand, model, brand === 'Apple' ? storage.replace(/\s+GB/g, 'GB') : storage);
}
/** Workbook intent -> diagnostics (owner correction: A = warranty Yes/Above 11, B/C = warranty No, box+charger present). */
function intentDiagnostics(r: any) {
  const sourceClass = r.reconstruction?.sourceConditionClass;
  const q = { ...(r.questionnaireIntent ?? {}) }, letter = r.caseId.slice(-1);
  if (sourceClass === 'screen_heavy') q.screenCondition = 'more_than_2_scratches';
  if (sourceClass === 'glass_cracked') q.screenCondition = 'cracked';
  if (sourceClass === 'display_lines') q.screenLines = 'visible';
  if (sourceClass === 'display_spots') q.screenSpots = 'large_heavy';
  if (sourceClass === 'body_heavy') q.bodyScratches = 'more_than_2';
  if (sourceClass === 'body_dents') q.bodyDents = 'major_or_more_than_2';
  if (sourceClass === 'touch') q.touch = { intent: 'no' };
  if (sourceClass === 'original_screen') q.originalScreen = { intent: 'no' };
  if (sourceClass === 'charging') q.hardwareFaults = ['hw_charging'];
  if (sourceClass === 'back_camera') q.hardwareFaults = ['hw_back_camera'];
  const pick = (v: string | null | undefined, m: Record<string, string>) => v == null || v === 'none' ? null : m[v] ?? `UNMAPPED:${v}`;
  const d: any = { calls: q.calls?.intent !== 'no', touch: q.touch?.intent !== 'no', originalScreen: q.originalScreen?.intent !== 'no', defects: [],
    screenCondition: pick(q.screenCondition, { more_than_2_scratches: 'More than 2 scratches on screen', cracked: 'Screen cracked/ glass broken' }),
    screenSpots: pick(q.screenSpots, { large_heavy: 'Large/ heavy visible spots on screen' }), screenLines: pick(q.screenLines, { visible: 'Visible line(s) on display' }),
    screenDiscoloration: pick(q.screenDiscoloration, { major: 'Major Discoloration' }), bodyScratches: pick(q.bodyScratches, { more_than_2: 'More than 2 scratches' }),
    bodyDents: pick(q.bodyDents, { major_or_more_than_2: 'Major dent(s) or more than 2' }), bodyPanel: null, bodyBent: null,
    hardware: (q.hardwareFaults ?? []).map((h: string) => h.replace(/^hw_/, '')), accessories: ['box', 'charger'],
    warranty: letter === 'A', validBill: true, eSim: null, mobileAge: letter === 'A' ? 'above11' : null };
  if (d.screenCondition) d.defects.push('screen_scratch');
  if (d.screenSpots || d.screenLines || d.screenDiscoloration) { d.defects.push('screen_spot'); d.screenSpots ??= 'No spots on screen'; d.screenLines ??= 'No line(s) on Display'; d.screenDiscoloration ??= 'No Discoloration'; }
  if (d.bodyScratches || d.bodyDents) { d.defects.push('body_scratch'); d.bodyScratches ??= 'No scratches'; d.bodyDents ??= 'No dents'; }
  return d;
}

type Obs = { id: string; caseId: string | null; brand?: string; model?: string; storage?: string; originalAnswers?: any; answers?: any;
  getUpto: number; observed: number; collectedAt: string; route: any; diagnostics: any; block: string | null; baseline: string | null; role: string;
  screenshotSha256?: string; provenance?: any };
const auto: Obs[] = (fixture.observations as any[]).filter(o => !('excluded' in o)).map(o => {
  const m = o.id.split(':')[1].match(/(FM\d{3})_(?:[A-Z0-9]+_)*([ABC])$/);
  return { id: o.id, caseId: m ? `${m[1]}_${m[2]}` : null, brand: o.brand, model: o.model, storage: o.storage,
    getUpto: o.getUpto, observed: o.observed, collectedAt: o.collectedAt, route: o.route,
    diagnostics: o.diagnostics, originalAnswers: o.originalAnswers, answers: o.originalAnswers, screenshotSha256: o.screenshotSha256, provenance: o.provenance,
    block: o.provenance.blockId ?? null, baseline: o.provenance.baselineExperimentId ?? null, role: o.provenance.evaluationRole } as any;
});
// Later exact-identity controls are merged as additional observations. Their
// recorded answers remain attached to the observed price; production replay
// inputs are built separately below and never inherit this measured price.
const followupAuto: Obs[] = (followup.accepted as any[]).flatMap(o => {
  const m = o.id.match(/^(FM\d{3})_/);
  if (!m) return [];
  const route: any = {}, originalAnswers: any = { ...o.conditions };
  for (const k of ['warranty', 'validBill', 'mobileAge', 'eSim', 'box', 'charger', 'sPen']) {
    route[k] = o.route[k].mode;
    originalAnswers[k] = o.route[k].selectedAnswer;
  }
  const accessories = ['box', 'charger', 'sPen'].filter(k => originalAnswers[k] === 'present').map((k: string) => k === 'sPen' ? 'spen' : k);
  const diagnostics: any = { calls: true, touch: true, originalScreen: true, warranty: false, validBill: true, mobileAge: null,
    eSim: originalAnswers.eSim === 'single' ? 'single' : null, defects: [], hardware: [], accessories,
    screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null };
  return [{ id: `release-followup-2026-10-03:${o.id}`, caseId: `${m[1]}_A`, getUpto: o.GetUpto, observed: o.finalSelling,
    collectedAt: o.collectedAt, route, diagnostics, answers: originalAnswers, screenshotSha256: o.screenshotSha256,
    provenance: { source: 'release-followup-results-2026-10-03.json', attempt: o.attempt, frozenAt: o.frozenAt,
      predictionSha256: o.predictionSha256, role: 'FOLLOWUP_CONTROL' },
    block: `release-followup:${o.id}`, baseline: null, role: 'FOLLOWUP_CONTROL',
    brand: o.brand, model: o.model, storage: o.storage, originalAnswers } as any];
});
const allAuto: Obs[] = [...auto, ...followupAuto];

/** One service per input set; refusal reasons captured from the service's own log. */
async function predict(device: CatalogDevice, diagnostics: unknown, reference: number | null, verifiedAt: string | null, profile: any) {
  if (reference == null) return { decision: 'NO_REFERENCE', estimate: null, reason: 'No production reference for this key' };
  const key = deviceKey(device), log: string[] = [];
  const record: ReferencePriceRecord = { ...device, deviceKey: key, source: 'cashify', currentPrice: reference, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: verifiedAt!, lastAttemptedAt: verifiedAt!, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: verifiedAt!, updatedAt: verifiedAt! } as any;
  const profiles = new InMemoryQuestionnaireProfileStore();
  if (profile) profiles.profiles.set(questionnaireModelKey(device), { brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device),
    warrantyMode: mode(profile.warrantyMode), billMode: mode(profile.billMode), ageMode: mode(profile.ageMode), questionLabels: [], status: 'OK', statusDetail: null,
    sourceUrl: null, variantsChecked: 1, parserVersion: 'cashify-questionnaire/1', observedAt: profile.observedAt });
  const s = createPricingService({ repository: { async get() { return record; }, async listAll() { return [record]; }, async upsert() { throw new Error('read only'); },
    async appendHistory() {}, async getHistory() { return []; } }, questionnaireStore: profiles, releaseRouteEvidence: routes, catalog: [device], now: () => at,
    pricingMode: 'release-candidate', snapshot: {}, signingSecret: 'coverage-register-signing-key-not-production-0000', tokenTtlSeconds: 900,
    strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info(o: any) { if (o?.reason) log.push(o.reason); }, warn() {}, error() {} } });
  const q = await s.quote({ ...device, diagnostics });
  if (q.ok) return { decision: q.internal.releaseCandidate?.kind === 'VERIFIED' ? 'CANDIDATE' : 'ACCESSORY', estimate: q.internal.cashifyConditionEquivalent, reason: null };
  return { decision: q.code, estimate: null, reason: log[0] ?? q.message };
}

const COMMON = new Set(['clean', 'screen_heavy', 'glass_cracked', 'display_lines', 'display_spots', 'body_heavy', 'body_dents', 'charging', 'back_camera']);
function componentLabel(d: any) {
  const parsed = parseDiagnostics(d); if (!parsed.ok) return 'INVALID';
  const comps = workbookComponents(parsed.value);
  if (!comps) return conditionClass(parsed.value) === 'clean' ? 'clean' : `UNSUPPORTED:${conditionClass(parsed.value)}`;
  return comps.length === 0 ? 'clean' : comps.length === 1 ? comps[0] : `combined:${comps.join('+')}`;
}

async function main() {
  const cases: any[] = [], devices: any[] = [];
  const byDevice = new Map<string, any[]>();
  for (const r of register) (byDevice.get(r.deviceId) ?? byDevice.set(r.deviceId, []).get(r.deviceId)!).push(r);
  for (const [deviceId, rows] of byDevice) {
    const r0 = rows[0];
    const device = catalog(r0.brand, r0.model, r0.variant);
    const savedRow = (saved.rows as any[]).find(s => s.deviceId === deviceId);
    const key = device ? deviceKey(device) : savedRow?.expectedKey;
    const prodRef = key && REFRESHED[key] != null ? REFRESHED[key] : savedRow?.reference?.currentPrice ?? null;
    const prodVerified = key && REFRESHED[key] != null ? REFRESHED_AT : savedRow?.reference?.lastVerifiedAt ?? null;
    const profile = savedRow?.questionnaire ?? null;
    const spec = device ? RC_ALLOWLIST.find(s => s.brand === device.brand && s.model === device.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(device.storage)) : undefined;
    const accessory = device ? isBoxIncludedIdentity(device) && !spec : false;
    const routeRow = device ? routes.find(x => x.model === device.model && workbookStorageIdentity(x.storage) === workbookStorageIdentity(device.storage)) : undefined;
    const devAuto = allAuto.filter(o => o.caseId?.startsWith(deviceId + '_') || (device && o.caseId == null && false));
    const allDev = allAuto.filter((o: any) => device && o.model === device.model &&
      workbookStorageIdentity(o.brand === 'Apple' ? o.storage.replace(/\s+GB/g, 'GB') : o.storage) === workbookStorageIdentity(device.storage));
    const controls = allDev.filter(o => componentLabel(o.diagnostics) === 'clean' && (o.route.warranty !== 'ASKED' || o.originalAnswers?.warranty === 'no') &&
      (o.route.validBill !== 'ASKED' || o.originalAnswers?.validBill === 'yes') && o.route.mobileAge === 'NOT_ASKED' &&
      (o.route.eSim !== 'ASKED' || o.originalAnswers?.eSim === 'single') && o.route.box === 'ASKED' && o.originalAnswers?.box === 'present' &&
      (o.route.charger !== 'ASKED' || o.originalAnswers?.charger === 'present') && (o.route.sPen !== 'ASKED' || o.originalAnswers?.sPen === 'present'))
      .map(o => ({ id: o.id, getUpto: o.getUpto, observed: o.observed, collectedAt: o.collectedAt, offset: o.observed - o.getUpto, retention: +(o.observed / o.getUpto).toFixed(4), route: o.route, answers: o.originalAnswers, provenance: o.provenance, screenshotSha256: o.screenshotSha256 }));
    const routeModes = [...new Set(allDev.map(o => JSON.stringify(o.route)))].map(s => JSON.parse(s));
    for (const r of rows) {
      const tester = r.testerObservation ? { price: r.testerObservation.finalSellingPrice, getUpto: r.testerObservation.getUpto, regime: r.caseId.endsWith('A') ? 'warranty Yes (owner correction)' : 'warranty No' } : null;
      const obs = allAuto.filter(o => o.caseId === r.caseId && (o as any).model === device?.model &&
        workbookStorageIdentity((o as any).brand === 'Apple' ? (o as any).storage.replace(/\s+GB/g, 'GB') : (o as any).storage) === workbookStorageIdentity(device?.storage ?? '')).sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
      const latest = obs.at(-1);
      const observationTrail = obs.map(o => ({ id: o.id, getUpto: o.getUpto, price: o.observed, collectedAt: o.collectedAt,
        route: o.route, answers: o.originalAnswers, provenance: o.provenance, screenshotSha256: o.screenshotSha256 }));
      const repeatClassification = obs.length < 2 ? 'SINGLE_OBSERVATION' : new Set(obs.map(o => `${o.getUpto}:${o.observed}`)).size === 1 ? 'EXACT_REPEAT' : 'DISAGREEING_REPEAT';
      const diag = latest?.diagnostics ?? intentDiagnostics(r);
      const label = componentLabel(diag);
      const control = latest ? controls.filter(c => c.getUpto === latest.getUpto && JSON.stringify(c.route) === JSON.stringify(latest.route))
        .sort((a, b) => Math.abs(Date.parse(a.collectedAt) - Date.parse(latest.collectedAt)) - Math.abs(Date.parse(b.collectedAt) - Date.parse(latest.collectedAt)))[0] : undefined;
      const atObs = device && latest ? await predict(device, latest.diagnostics, latest.getUpto, at.toISOString(), { warrantyMode: latest.route.warranty, billMode: latest.route.validBill, ageMode: latest.route.mobileAge, observedAt: at.toISOString() }) : null;
      // What a customer on the live UI would send for this condition: no ownership answers where
      // the profile says NOT_ASKED, warranty No / bill Yes where asked (the verified regime),
      // charger only where the route asks it.
      const customer = { ...diag, mobileAge: null, eSim: null,
        warranty: profile?.warrantyMode === 'ASKED' ? false : profile?.warrantyMode === 'NOT_ASKED' ? null : diag.warranty,
        validBill: profile?.billMode === 'ASKED' ? true : profile?.billMode === 'NOT_ASKED' ? null : diag.validBill,
        accessories: (latest?.route.charger ?? routeRow?.chargerMode) === 'NOT_ASKED' ? ['box'] : ['box', 'charger'], box: undefined, charger: undefined };
      const atProd = device ? await predict(device, customer, prodRef, prodVerified, profile) : { decision: 'NO_CATALOG', estimate: null, reason: 'Variant not in catalog' };
      const policyBlocked = /UNSUPPORTED:(touch|nonOriginalScreen|combined|display|unknown)|combined:/.test(label) || /Note 15 Pro Plus/.test(r0.model) && /charging|back_camera/.test(label);
      let next: string;
      if (atProd.decision === 'CANDIDATE' || atProd.decision === 'ACCESSORY') next = 'PRICED_IN_PRODUCTION';
      else if (policyBlocked) next = 'KEEP_INSPECTION (severe/interaction)';
      else if (!latest && !tester) next = 'MISSING_OBSERVATION';
      else if (!latest) next = 'TESTER_ONLY: needs traced observation + same-block control';
      else if (!control) next = 'NEEDS_SAME_GET_UPTO_CLEAN_CONTROL';
      else if (atObs && (atObs.decision === 'CANDIDATE' || atObs.decision === 'ACCESSORY')) next = 'PRICED_AT_CALIBRATION_GET_UPTO: needs production reference = observed Get Upto';
      else next = `EVIDENCE_PRESENT_NOT_ACTIVATED (${COMMON.has(label) ? 'common condition' : label})`;
      cases.push({ caseId: r.caseId, deviceId, variant: `${r0.brand} ${r0.model} ${r0.variant}`, condition: label, conditionText: r.conditionText.split(':')[0],
        tester, traced: latest ? { id: latest.id, price: latest.observed, getUpto: latest.getUpto, at: latest.collectedAt, route: latest.route,
          answers: latest.originalAnswers, provenance: latest.provenance, repeats: obs.length, repeatClassification } : null,
        observationTrail,
        control: control ? { price: control.observed, getUpto: control.getUpto, id: control.id } : null,
        measuredDeduction: control && latest && label !== 'clean' ? control.observed - latest.observed : null,
        predictedAtObservedGetUpto: atObs?.estimate ?? null, decisionAtObservedGetUpto: atObs?.decision ?? null, reasonAtObserved: atObs?.reason ?? null,
        productionReference: prodRef, predictedInProduction: atProd.estimate, decisionInProduction: atProd.decision, guardReason: atProd.reason,
        replayEligibility: atProd.decision === 'CANDIDATE' || atProd.decision === 'ACCESSORY' ? 'REPLAY_ELIGIBLE_NOT_LIVE_PRODUCTION_PRICE' : 'NOT_REPLAY_ELIGIBLE',
        syntheticProductionInput: { diagnostics: customer, questionnaireProfile: profile ? { warrantyMode: profile.warrantyMode, billMode: profile.billMode, ageMode: profile.ageMode } : null, reference: prodRef, referenceVerifiedAt: prodVerified }, nextAction: next });
    }
      devices.push({ deviceId, variant: `${r0.brand} ${r0.model} ${r0.variant}`, catalog: !!device, scope: spec ? 'CANDIDATE' : accessory ? 'ACCESSORY' : 'NONE',
      productionReference: prodRef, profile: profile ? `${profile.warrantyMode}/${profile.billMode}/${profile.ageMode}` : null, routeEvidence: !!routeRow,
      tracedRoutes: routeModes, cleanControls: controls, tracedCases: rows.filter(r => devAuto.some(o => o.caseId === r.caseId)).map(r => r.caseId) });
  }
  const summary = {
    cases: cases.length,
    byNextAction: cases.reduce((s: any, c) => { const k = c.nextAction.split(':')[0].split(' (')[0]; s[k] = (s[k] ?? 0) + 1; return s; }, {}),
    devicesByScope: devices.reduce((s: any, d) => { s[d.scope] = (s[d.scope] ?? 0) + 1; return s; }, {}),
  };
  const out = { version: 'coverage-gap-register/2026-10-03', evaluatedAt: at.toISOString(), summary, devices, cases };
  if (arg('--out')) fs.writeFileSync(arg('--out')!, JSON.stringify(out, null, 2) + '\n');
  if (arg('--md')) {
    const md = ['| Case | Variant | Condition | Observed (traced / tester) | Control (same GU) | Predicted at obs GU | Production | Guard reason | Next action |', '|---|---|---|---|---|---|---|---|---|',
      ...cases.map(c => `| ${c.caseId} | ${c.variant} | ${c.condition} | ${c.traced ? `${c.traced.price} @${c.traced.getUpto}` : '—'} / ${c.tester ? `${c.tester.price} @${c.tester.getUpto}` : '—'} | ${c.control ? `${c.control.price} @${c.control.getUpto}` : '—'} | ${c.predictedAtObservedGetUpto ?? c.decisionAtObservedGetUpto ?? '—'} | ${c.predictedInProduction ?? c.decisionInProduction} | ${c.guardReason ?? ''} | ${c.nextAction} |`)];
    fs.writeFileSync(arg('--md')!, md.join('\n') + '\n');
  }
  console.log(JSON.stringify(summary, null, 1));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
