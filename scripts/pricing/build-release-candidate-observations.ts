/**
 * Builds the committed, database-free observation fixture used by the
 * release-candidate evaluation (scripts/pricing/evaluate-release-candidate.ts).
 *
 * Source: the ignored local collector evidence (verified traces + screenshot
 * hashes) of five collection jobs, plus the read-only production input export
 * of 2026-10-02. Nothing here is fitted: each row records what Cashify asked
 * (route, from the questionnaire trace; an absent question is NOT_ASKED, never
 * "No"), what was answered, the captured Get Upto and the final Selling price,
 * and the diagnostics vector the Fhoneify quote page would send for those
 * answers.
 *
 *   npx tsx scripts/pricing/build-release-candidate-observations.ts [--evidence-root <dir>]
 *
 * The default evidence root is the main checkout's scratch/ directory
 * (three levels above this worktree).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { QuestionMode } from '../../lib/pricing/questionnaireSemantics';
import { observationRouteMode } from './releaseObservationSemantics';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--evidence-root');
const scratch = path.resolve(rootArg >= 0 ? args[rootArg + 1] : path.join(process.cwd(), '../../../scratch'));
const collector = path.join(scratch, 'cashify-matrix-integration/research-evidence');
const productionInputs = path.join(scratch, 'xiaomi-severe-followup-2026-10-01/team-workbook-2026-10-02/owner-correction/production-inputs-2026-10-02.txt');
const out = path.join(process.cwd(), 'scripts/pricing/fixtures/release-candidate-observations-2026-10-02.json');

type Mode = QuestionMode;
interface CollectorObservation {
  experimentId: string; brand: string; model: string; storage: string; status: string;
  getUptoAtCollection: number | null; finalPrice: number | null; collectedAt: string;
  answers: Record<string, string | null>; questions: { factorId: string | null; status: string; selectionState?: string | null; matchedPlan?: boolean; questionText?: string }[];
  evidenceSha256: string | null; evidenceRef?: string | null; changedFactors?: string[];
  blockId?: string; baselineExperimentId?: string | null;
}

function loadJob(job: string): CollectorObservation[] {
  const dir = path.join(collector, job);
  const json = path.join(dir, 'observations.json');
  if (fs.existsSync(json)) return JSON.parse(fs.readFileSync(json, 'utf8'));
  // Older jobs keep their accepted observations only in the collector store.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(dir, 'evidence.sqlite'), { readOnly: true });
  return db.prepare('select observation_json from matrix_experiments').all().map((r: any) => JSON.parse(r.observation_json));
}

const JOBS = ['xiaomi-validation', 'xiaomi-candidate-2026-10-01', 'xiaomi-severe-followup-2026-10-01', 'team-workbook-2026-10-02', 'owner-correction-2026-10-02'];
const ROUTE_FACTORS = ['warranty', 'validBill', 'mobileAge', 'eSim', 'box', 'charger', 'sPen'] as const;

/** Missing, conflicting and unfamiliar statuses retain uncertainty. Only an
 * explicit collector NOT_ASKED record establishes a question was absent. */
const routeMode = observationRouteMode;

function evaluationRole(job: string, o: CollectorObservation): string {
  if (job === 'xiaomi-validation' && /^V[1-9]$/.test(o.experimentId)) return 'ORIGINAL_FAILED_HOLDOUT_NOW_DEVELOPMENT';
  if (job === 'xiaomi-candidate-2026-10-01' && ['17-COMBINED', 'T5-COMBINED'].includes(o.experimentId)) return 'PRESERVED_PREREGISTERED_COMBINED_HOLDOUT';
  if (job === 'xiaomi-severe-followup-2026-10-01' && ['N-CAMPAIR', 'N-AUDIOPORT', 'N-FOUR', 'N-FIVE'].includes(o.experimentId)) return 'PRESERVED_PREREGISTERED_ADDITIVE_HOLDOUT';
  if (job === 'team-workbook-2026-10-02' && ['FM004_LIVE_C', 'FM017_LIVE_C'].includes(o.experimentId)) return 'PRESERVED_PREREGISTERED_CONDITIONAL_GLASS_HOLDOUT';
  return (o.changedFactors ?? []).length === 0 ? 'CLEAN_CONTROL_OR_BASELINE_OBSERVATION' : 'DEVELOPMENT_OR_ESTABLISHED_OBSERVATION';
}

/** Xiaomi 14 Ultra 16/512: the trace labels warranty/bill NOT_ASKED but the
 * clean price matches warranty-No pricing and production's profile says
 * ASKED (OWNER_CORRECTION_HANDOFF §6). The route is disputed, so it is not
 * comparable evidence for either regime. */
const EXCLUDED: Record<string, string> = { 'Xiaomi 14 Ultra|16 GB/512 GB': 'ROUTE_TRACE_DISPUTED (owner-correction handoff §6)' };

const yesNo = (v: string | null | undefined) => (v === 'yes' ? true : v === 'no' ? false : null);
const SCREEN: Record<string, string> = { scratch_gt2: 'More than 2 scratches on screen', scratch_1_2: '1-2 scratches on screen', cracked: 'Screen cracked/ glass broken', chipped: 'Chipped/cracked outside display area' };
const SPOTS: Record<string, string> = { heavy: 'Large/ heavy visible spots on screen', minor_3plus: '3 or more minor spots on screen', minor_1_2: '1-2 minor spots on screen' };
const LINES: Record<string, string> = { visible_lines: 'Visible line(s) on display', faded_edges: 'Display faded along edges' };
const DISCOLOR: Record<string, string> = { major: 'Major Discoloration', minor: 'Minor Discoloration' };
const BODY_SCRATCH: Record<string, string> = { scratch_gt2: 'More than 2 scratches', scratch_1_2: '1-2 scratches' };
const BODY_DENTS: Record<string, string> = { major: 'Major dent(s) or more than 2', minor: '1-2 minor dents' };
const known = (map: Record<string, string>, v: string | null | undefined, field: string) => {
  if (v == null || v === 'none') return null;
  if (!map[v]) throw new Error(`Unmapped ${field} answer ${v}`);
  return map[v];
};

/** The diagnostics the quote page sends for these answers on this route
 * (app/quote/page.tsx): a question Cashify does not ask is null; with the
 * warranty asked and no age question, a warranty-No phone is sent as
 * mobileAge "above11"; an accessory is listed only when present. */
function frontendDiagnostics(a: Record<string, string | null>, route: Record<string, Mode>) {
  const screenCondition = known(SCREEN, a.screenCondition, 'screenCondition');
  const spots = known(SPOTS, a.screenSpots, 'screenSpots');
  const lines = known(LINES, a.screenLines, 'screenLines');
  const discoloration = known(DISCOLOR, a.screenDiscoloration, 'screenDiscoloration');
  const bodyScratches = known(BODY_SCRATCH, a.bodyScratches, 'bodyScratches');
  const bodyDents = known(BODY_DENTS, a.bodyDents, 'bodyDents');
  if ((a.bodyPanel && a.bodyPanel !== 'none') || (a.bodyBent && a.bodyBent !== 'none')) throw new Error('Unmapped panel/bent answer');
  const display = !!(spots || lines || discoloration);
  const body = !!(bodyScratches || bodyDents);
  const warranty = route.warranty === 'NOT_ASKED' ? null : yesNo(a.warranty);
  const hardware = Object.entries(a).filter(([k, v]) => k.startsWith('hw_') && v === 'faulty').map(([k]) => k.slice(3)).sort();
  const accessories = [
    ...(route.box === 'ASKED' && a.box === 'present' ? ['box'] : []),
    ...(route.charger === 'ASKED' && a.charger === 'present' ? ['charger'] : []),
    ...(route.sPen === 'ASKED' && a.sPen === 'present' ? ['spen'] : []),
  ];
  return {
    calls: yesNo(a.calls), touch: yesNo(a.touch), originalScreen: yesNo(a.originalScreen),
    defects: [...(screenCondition ? ['screen_scratch'] : []), ...(display ? ['screen_spot'] : []), ...(body ? ['body_scratch'] : [])],
    screenCondition,
    screenSpots: display ? spots ?? 'No spots on screen' : null,
    screenLines: display ? lines ?? 'No line(s) on Display' : null,
    screenDiscoloration: display ? discoloration ?? 'No Discoloration' : null,
    bodyScratches: body ? bodyScratches ?? 'No scratches' : null,
    bodyDents: body ? bodyDents ?? 'No dents' : null,
    bodyPanel: null, bodyBent: null, hardware, accessories,
    warranty,
    validBill: route.validBill === 'NOT_ASKED' ? null : yesNo(a.validBill),
    eSim: route.eSim === 'NOT_ASKED' ? null : a.eSim ?? null,
    mobileAge: route.mobileAge === 'NOT_ASKED' ? (route.warranty === 'ASKED' && warranty === false ? 'above11' : null) : a.mobileAge ?? null,
  };
}

const rows: any[] = [];
const sources: Record<string, string> = {};
for (const job of JOBS) {
  const file = fs.existsSync(path.join(collector, job, 'observations.json')) ? path.join(collector, job, 'observations.json') : path.join(collector, job, 'evidence.sqlite');
  sources[job] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for (const o of loadJob(job)) {
    if (o.status !== 'COMPLETED' || !(o.finalPrice! > 0) || !(o.getUptoAtCollection! > 0)) continue;
    const route = Object.fromEntries(ROUTE_FACTORS.map(f => [f, routeMode(o.questions, f)])) as Record<string, Mode>;
    const screenshotVerified = !!(o.evidenceRef && o.evidenceSha256 && fs.existsSync(o.evidenceRef) &&
      crypto.createHash('sha256').update(fs.readFileSync(o.evidenceRef)).digest('hex') === o.evidenceSha256);
    const planMatched = o.questions.every(q => q.matchedPlan === true);
    const routeComplete = ROUTE_FACTORS.every(f => route[f] !== 'UNKNOWN');
    const changed = Object.fromEntries(Object.entries(o.answers).filter(([k, v]) => v != null && !['none', 'ok', 'yes', 'present'].includes(v) && k !== 'mobileAge' &&
      !(k === 'warranty' && route.warranty !== 'ASKED') && !(k === 'validBill' && route.validBill !== 'ASKED')));
    for (const f of ['box', 'charger', 'sPen'] as const) if (route[f] !== 'ASKED') delete changed[f];
    const key = `${o.model}|${o.storage}`;
    rows.push({
      id: `${job}:${o.experimentId}`, job, experimentId: o.experimentId, brand: o.brand, model: o.model, storage: o.storage,
      getUpto: o.getUptoAtCollection, observed: o.finalPrice, collectedAt: o.collectedAt, route,
      answers: changed, diagnostics: frontendDiagnostics(o.answers, route), screenshotSha256: o.evidenceSha256,
      originalAnswers: o.answers,
      provenance: { type: 'AUTOMATIC_COLLECTOR_OBSERVATION', screenshotVerified, planMatched, routeComplete,
        quality: screenshotVerified && planMatched && routeComplete ? 'VERIFIED_CAPTURE_ROUTE_REVIEW_STILL_REQUIRED' : 'INCOMPLETE_EVIDENCE',
        blockId: o.blockId ?? null, baselineExperimentId: o.baselineExperimentId ?? null,
        evaluationRole: evaluationRole(job, o), independentPricingSuccess: false },
      ...(EXCLUDED[key] ? { excluded: EXCLUDED[key] } : {}),
    });
  }
}
rows.sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Duplicate observation identity');
const repeatGroups = new Map<string, string[]>();
for (const r of rows) {
  const key = JSON.stringify([r.job, r.brand, r.model, r.storage, r.getUpto, r.observed, r.originalAnswers]);
  repeatGroups.set(key, [...(repeatGroups.get(key) ?? []), r.id]);
}
const correctedManualPath = path.join(scratch, 'xiaomi-severe-followup-2026-10-01/team-workbook-2026-10-02/owner-correction/tester-observations-owner-corrected.json');
const manual = JSON.parse(fs.readFileSync(correctedManualPath, 'utf8'));
for (const row of manual) {
  if (row.finalPrice !== row.provenance.priceOriginalValue || !row.rawRecordUnchanged || row.provenance.type !== 'TESTER_REPORTED') throw new Error('Manual raw measurement was changed');
}

const production = fs.readFileSync(productionInputs, 'utf8').trim().split(/\r?\n/).map(line => {
  const [deviceId, model, storage, price, status, age, warrantyMode, billMode, ageMode] = line.split('|').map(s => s.trim());
  return { deviceId, model, storage, currentPrice: /^\d+$/.test(price) ? Number(price) : null, status: status || 'NO_REFERENCE',
    ageDays: age ? Number(age.replace('d', '')) : null, warrantyMode, billMode, ageMode };
});

fs.writeFileSync(out, JSON.stringify({
  version: 'release-candidate-observations/2026-10-02',
  note: 'Automatic collector observations with per-row screenshot/trace provenance; captures are not all independent pricing validation. UNKNOWN is never NOT_ASKED. Three Xiaomi14Ultra rows retain disputed-route exclusion. Corrected manual interpretations are separate from automatic captures and raw measurements.',
  sourceSha256: sources,
  productionInputs: { capturedAt: '2026-10-02', ageNote: 'ageDays measured at capture time on 2026-10-02', rows: production },
  observations: rows,
  repeatedMeasurements: [...repeatGroups.values()].filter(group => group.length > 1),
  manualInterpretation: { sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(correctedManualPath)).digest('hex'),
    ownerCorrection: 'A warranty YES + age Above11 where asked; B/C warranty NO where asked; all box/charger YES where asked',
    rawMeasurementCount: manual.length, provenance: 'TESTER_REPORTED_WITHOUT_TRACE_OR_CAPTURE_DATE',
    observations: manual },
}, null, 1) + '\n');
console.log(`wrote ${rows.length} observations (${rows.filter(r => r.excluded).length} excluded) and ${production.length} production rows to ${path.relative(process.cwd(), out)}`);
