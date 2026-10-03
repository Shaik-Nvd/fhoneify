/** Builds measured-point release candidates for workbook variants outside the
 * launch scope, from already-collected traced evidence only (no new data):
 *
 *   - the clean control must be traced, in the verified regime (warranty No /
 *     bill Yes where asked; box, and charger / S Pen where asked, present;
 *     the eSIM answer where asked is recorded and required);
 *   - each condition must be a single common component, traced in the SAME
 *     block, at the SAME Get Upto and route as that control; repeated
 *     measurements must agree exactly;
 *   - severe faults, interactions, non-original screen, touch, and the Note 15
 *     Pro+ hardware regime are never emitted.
 *
 * The result is a one-point calibration exactly like the approved 14 CIVI /
 * Open specs: it binds only while the production reference equals the
 * calibrated Get Upto and the evidence is under 14 days old. Reproducing the
 * calibration observations is NOT accuracy evidence.
 *
 *   npx tsx scripts/pricing/build-measured-point-specs.ts [--write]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import followup from './fixtures/release-followup-results-2026-10-03.json';
import oldRoutes from './fixtures/release-route-evidence-2026-10-02.json';
import { RC_ALLOWLIST, conditionClass } from '../../lib/pricing/releaseCandidate';
import { isBoxIncludedIdentity } from '../../lib/pricing/accessoryBasis';
import { workbookComponents, workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';

const COMMON = new Set(['screen_heavy', 'glass_cracked', 'display_lines', 'display_spots', 'body_heavy', 'body_dents', 'charging', 'back_camera']);
const BLOCKED = new Set(['Apple iPhone 12 Pro', 'Xiaomi 14 Ultra']);      // headline block / quarantined baseline (release policy)
const HARDWARE_GUARDED = new Set(['Xiaomi Redmi Note 15 Pro Plus 5G']);  // release adapter refuses hardware faults
const ident = (brand: string, model: string, storage: string) => `${brand}|${model}|${workbookStorageIdentity(storage)}`;

type Mode = 'ASKED' | 'NOT_ASKED';
interface Obs { id: string; brand: string; model: string; storage: string; getUpto: number; observed: number; collectedAt: string; sha: string;
  block: string; modes: Record<string, Mode>; answers: Record<string, string | null>; components: string[] | null; cls: string }

function fromFixture(): Obs[] {
  return (fixture.observations as any[]).filter(o => !('excluded' in o) && o.provenance.type === 'AUTOMATIC_COLLECTOR_OBSERVATION').map(o => {
    const parsed = parseDiagnostics(o.diagnostics);
    const oa = o.originalAnswers ?? {};
    return { id: o.id, brand: o.brand, model: o.model, storage: o.storage, getUpto: o.getUpto, observed: o.observed, collectedAt: o.collectedAt,
      sha: o.screenshotSha256, block: `${o.job}:${o.provenance.blockId ?? o.id}`, modes: o.route,
      answers: { warranty: oa.warranty ?? null, validBill: oa.validBill ?? null, box: oa.box ?? null, charger: oa.charger ?? null, sPen: oa.sPen ?? null, eSim: oa.eSim ?? null },
      components: parsed.ok ? workbookComponents(parsed.value) : null, cls: parsed.ok ? conditionClass(parsed.value) : 'unknown' };
  });
}
function fromFollowup(): Obs[] {
  return (followup.accepted as any[]).filter(a => /_RC_WNO_/.test(a.id)).map(a => {
    const m = (k: string): Mode => a.route[k].mode === 'ASKED' ? 'ASKED' : 'NOT_ASKED';
    const sel = (k: string) => a.route[k].selectedAnswer ?? null;
    return { id: `release-followup-2026-10-02:${a.id}`, brand: a.brand, model: a.model, storage: a.storage, getUpto: a.GetUpto, observed: a.finalSelling,
      collectedAt: a.collectedAt, sha: a.screenshotSha256 ?? a.evidenceSha256 ?? '', block: `followup:${a.id}`,
      modes: Object.fromEntries(['warranty', 'validBill', 'mobileAge', 'eSim', 'box', 'charger', 'sPen'].map(k => [k, m(k)])),
      answers: { warranty: sel('warranty'), validBill: sel('validBill'), box: sel('box'), charger: sel('charger'), sPen: sel('sPen'), eSim: sel('eSim') },
      components: [], cls: 'clean' };
  });
}
/** Verified regime: warranty No / bill Yes where asked; box, and charger/S Pen where asked, present. */
function inRegime(o: Obs) {
  const a = o.answers, m = o.modes;
  return (m.warranty !== 'ASKED' || a.warranty === 'no') && (m.validBill !== 'ASKED' || a.validBill === 'yes') && m.box === 'ASKED' && a.box === 'present' &&
    (m.charger !== 'ASKED' || a.charger === 'present') && (m.sPen !== 'ASKED' || a.sPen === 'present') && m.mobileAge === 'NOT_ASKED' &&
    (m.eSim !== 'ASKED' || a.eSim === 'single');
}

export function buildMeasuredPointSpecs() {
  const all = [...fromFixture(), ...fromFollowup()];
  const groups = new Map<string, Obs[]>();
  for (const o of all) (groups.get(ident(o.brand, o.model, o.storage)) ?? groups.set(ident(o.brand, o.model, o.storage), []).get(ident(o.brand, o.model, o.storage))!).push(o);
  const specs: any[] = [], skipped: any[] = [];
  for (const [key, obs] of groups) {
    const { brand, model, storage } = obs[0];
    if (RC_ALLOWLIST.some(s => s.brand === brand && s.model === model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(storage)) ||
      isBoxIncludedIdentity({ brand, model, storage })) continue;
    if (BLOCKED.has(model)) { skipped.push({ key, reason: 'Blocked by release policy' }); continue; }
    // Latest regime-matched traced clean control defines the calibration point.
    const controls = obs.filter(o => o.cls === 'clean' && o.components?.length === 0 && inRegime(o)).sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
    const control = controls[0];
    if (!control) { skipped.push({ key, reason: 'No traced clean control in the verified regime' }); continue; }
    const sameRoute = (o: Obs) => JSON.stringify(o.modes) === JSON.stringify(control.modes);
    const cleanAgree = controls.filter(c => c.getUpto === control.getUpto && sameRoute(c));
    if (cleanAgree.some(c => c.observed !== control.observed)) { skipped.push({ key, reason: 'Disagreeing clean controls at the same Get Upto' }); continue; }
    // Any block with its own agreeing clean control at this Get Upto and route
    // supplies matched controls for its conditions.
    const controlBlocks = new Set(cleanAgree.map(c => c.block));
    const componentCosts: Record<string, number> = {}, sources = [...cleanAgree], notes: string[] = [];
    const byComponent = new Map<string, Obs[]>();
    for (const o of obs) {
      if (!controlBlocks.has(o.block) || o.getUpto !== control.getUpto || !sameRoute(o) || !inRegime(o) || !o.components || o.components.length !== 1) continue;
      const c = o.components[0];
      if (!COMMON.has(c)) continue;
      if (HARDWARE_GUARDED.has(model) && (c === 'charging' || c === 'back_camera')) { notes.push(`${c}: hardware guard`); continue; }
      (byComponent.get(c) ?? byComponent.set(c, []).get(c)!).push(o);
    }
    for (const [c, list] of byComponent) {
      if (new Set(list.map(o => o.observed)).size !== 1) { notes.push(`${c}: repeated measurements disagree`); continue; }
      componentCosts[c] = control.observed - list[0].observed; sources.push(...list);
    }
    const m = control.modes;
    specs.push({
      deviceId: key, brand, model, storage, validatedGetUpto: control.getUpto,
      modes: { warranty: m.warranty, validBill: m.validBill, mobileAge: m.mobileAge, eSim: m.eSim, box: m.box, charger: m.charger, sPen: m.sPen },
      ...(m.eSim === 'ASKED' ? { eSimAnswer: 'Single eSIM' } : {}),
      baseline: { kind: 'conditional_retention', retention: control.observed / control.getUpto },
      componentCosts, supportedProfiles: [[], ...Object.keys(componentCosts).map(c => [c])],
      calibratedAt: sources.map(s => s.collectedAt).sort().at(-1),
      evidenceQuality: 'VERIFIED_TRACE_SCREENSHOT', role: 'ONE_POINT_CALIBRATION_NOT_VALIDATION',
      source: sources.map(s => ({ experimentId: s.id, observed: s.observed, reference: s.getUpto, collectedAt: s.collectedAt, screenshotSha256: s.sha })),
      ...(notes.length ? { notes } : {}),
    });
  }
  return { specs, skipped };
}

function routeRows(specs: any[]) {
  return specs.map(s => ({ brand: s.brand, model: s.model, storage: s.storage, source: 'VERIFIED_COLLECTOR_TRACE', status: 'OK',
    // The clean control's own observation: evidence age starts there, never later.
    observedAt: s.source[0].collectedAt, evidenceSha256: s.source[0].screenshotSha256,
    semantics: { warrantyMode: s.modes.warranty, billMode: s.modes.validBill, ageMode: s.modes.mobileAge },
    boxMode: s.modes.box, chargerMode: s.modes.charger, sPenMode: s.modes.sPen, eSimMode: s.modes.eSim }));
}

if (require.main === module) {
  const { specs, skipped } = buildMeasuredPointSpecs();
  const fx = { version: 'measured-point-research/2026-10-03', builtFrom: ['release-candidate-observations-2026-10-02.json', 'release-followup-results-2026-10-03.json'], specs };
  const routes = { version: 'release-route-evidence/2026-10-03-measured-point-expansion', rows: [...oldRoutes.rows, ...routeRows(specs)] };
  for (const s of specs) console.log(`${s.brand} ${s.model} ${s.storage}`.padEnd(46), 'GU', s.validatedGetUpto, 'clean', Math.round(s.validatedGetUpto * s.baseline.retention),
    'modes', Object.values(s.modes).map((v: any) => v[0]).join(''), JSON.stringify(s.componentCosts), s.notes ?? '');
  console.log('skipped', JSON.stringify(skipped));
  if (process.argv.includes('--write')) {
    fs.writeFileSync('scripts/pricing/fixtures/measured-point-candidates-2026-10-03.json', JSON.stringify(fx, null, 2) + '\n');
    fs.writeFileSync('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json', JSON.stringify(routes, null, 2) + '\n');
    console.log('written', specs.length, 'specs;', routes.rows.length, 'route rows; sha', crypto.createHash('sha256').update(JSON.stringify(fx)).digest('hex').slice(0, 16));
  }
}
