/**
 * Fits per-model calibration profiles for lib/pricing/appleCashifyModel from normalized Cashify quotes.
 *
 * Method: the engine's own deduct() is the model. Parameters (age laws, box, eSIM, one value per condition class)
 * are fitted by damped Gauss-Newton on rupee residuals, with a weak ridge towards a prior (sibling models in the
 * same family, else the shared template) so that parameters the model's own quotes do not constrain stay at the
 * prior and are labelled 'inferred'. Nothing here reads a database or a network.
 */
import {
  AGE_TRIGGER_CODES, CLASS_ORDER, ageStateOf, classInfo, floorMinFaults, classOf, deduct, interactionSignature, parseAnswers,
  type Calibration, type ClassCal, type ClassKey, type ModelProfile, type ValueKind, type Support,
} from '../../lib/pricing/appleCashifyModel/model';
import { CLEAN_OFFSET, toDiagnostics, modelSemantics, type Measurement } from './evidenceLib';

export const SIGMA = 100; // rupee residual scale used to weight equations
let MULTISTART = 8;
let COORD_SWEEPS = 200;
/** Fewer random starts for cross-validation refits (the committed calibration uses the defaults). */
export function setFitOptions(o: { multistart?: number; coordSweeps?: number }) { if (o.multistart) MULTISTART = o.multistart; if (o.coordSweeps) COORD_SWEEPS = o.coordSweeps; }

function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rng: () => number): number { const u = Math.max(1e-12, rng()); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export function familyOf(modelKey: string): string {
  if (/iPhone 14/.test(modelKey)) return '14';
  if (/iPhone 15/.test(modelKey)) return '15';
  if (/iPhone 16/.test(modelKey)) return '16';
  if (/iPhone 17|iPhone 18|iPhone Air/.test(modelKey)) return '17plus';
  return 'other';
}

const FIXED_CLASSES: ClassKey[] = ['display', 'cracked', 'touch', 'orig', 'cam', 'fminA', 'fminB', 'prox', 'batt', 'finger'];
const PCT_CLASSES: ClassKey[] = ['wifi', 'face'];
export function defaultKind(cls: ClassKey, family: string): ValueKind {
  if (PCT_CLASSES.includes(cls)) return 'pct';
  if (FIXED_CLASSES.includes(cls)) return 'fixed';
  // body / panel: proportional on the 17 and 18 generations, fixed rupees before
  return family === '17plus' ? 'pct' : 'fixed';
}

// 18 Pro Max template anchors (rupees / fractions at reference 165,000), used as the last-resort prior.
const TEMPLATE_ANCHOR: Record<ClassKey, { fixed: number; pct: number }> = {
  display: { fixed: 25500, pct: 25500 / 165000 }, cracked: { fixed: 17850, pct: 0.108 }, touch: { fixed: 30000, pct: 0.182 }, orig: { fixed: 15000, pct: 0.091 }, body: { fixed: 3500, pct: 0.12 }, panel: { fixed: 4500, pct: 22050 / 165000 },
  cam: { fixed: 10000, pct: 0.06 }, fminA: { fixed: 6000, pct: 0.036 }, fminB: { fixed: 4500, pct: 0.027 }, prox: { fixed: 4950, pct: 0.03 },
  wifi: { fixed: 0, pct: 0.3 }, face: { fixed: 0, pct: 0.2 }, batt: { fixed: 4200, pct: 0.025 }, finger: { fixed: 0, pct: 0 },
};

interface Param { name: string; get: (p: ModelProfile) => number; set: (p: ModelProfile, v: number) => void; scale: number; lo: number; hi: number; prior: number }

function emptyProfile(modelKey: string, rows: Measurement[], sem: ReturnType<typeof modelSemantics>): ModelProfile {
  const family = familyOf(modelKey);
  const s = sem.get(modelKey)!;
  // The age/warranty flow is modelled only where the quotes actually exercise it (a 'No' warranty answer or an age other than under 3 months):
  // the iPhone 14 / 14 Pro reports record warranty 'yes' while the live questionnaire profile says the question is not asked, and with no
  // aged quote an age law would only split the screen deductions arbitrarily.
  const asksWarranty = s.warrantyMode !== 'NOT_ASKED' &&
    rows.some(r => r.inputs.warranty.value === 'no' || ['3 months - 6 months', '6 months - 11 months', 'Above 11 months'].includes(String(r.inputs.age.value)));
  const classes: Partial<Record<ClassKey, ClassCal>> = {};
  for (const cls of CLASS_ORDER) {
    const kind = defaultKind(cls, family);
    classes[cls] = { kind, value: TEMPLATE_ANCHOR[cls][kind], support: 'inferred', n: 0 };
  }
  const hasEsim = rows.some(r => r.inputs.esim.value === 'Single eSIM' || r.inputs.esim.value === 'Dual eSIM');
  // The fixed gap between the flawless quote and the reference on the iPhone 11 / 11 Pro Max / 7 / 8 / 8 Plus is Cashify's original-charger
  // answer (live 2026-10-28, iPhone 11 Pro Max 256 GB: charger yes 17,660 vs no 17,260). Its amount is known from the database gap, so it is a
  // fixed missing-charger deduction rather than a fitted one (the combination reports never selected a charger).
  const fixedCharger = CLEAN_OFFSET[modelKey];
  const asksCharger = Boolean(fixedCharger) || rows.some(r => r.inputs.charger.value === 'yes' || r.inputs.charger.value === 'no');
  const shapes = new Set(rows.map(r => r.deviations.join('|')));
  return {
    modelKey, family,
    storagesGb: [...new Set(rows.map(r => r.storage_gb))].sort((a, b) => a - b),
    asks: { warranty: asksWarranty, bill: s.billMode !== 'NOT_ASKED', age: s.ageMode !== 'NOT_ASKED', eSim: hasEsim, charger: asksCharger },
    ...(asksWarranty ? { ageTriggers: [...AGE_TRIGGER_CODES] } : {}),
    age: asksWarranty ? {
      '1': { a: 0, b: 0.11, support: 'inferred', n: 0 }, '2': { a: 0, b: 0.14, support: 'inferred', n: 0 }, '3': { a: 0, b: 0.2, support: 'inferred', n: 0 },
    } : null,
    boxNo: { base: 2250, aged: 2250, support: 'inferred' },
    ...(asksCharger ? { chargerNo: fixedCharger ? { base: fixedCharger, aged: fixedCharger, support: 'measured' as Support } : { base: 300, aged: 300, support: 'inferred' as Support } } : {}),
    eSimDualPct: hasEsim ? 0.05 : null,
    floor: null,
    classes,
    scrap: 1200,
    extremeFaultCount: 10,
    evidence: { shapes: shapes.size, measurements: rows.length, dates: [...new Set(rows.map(r => r.observed_date ?? 'unknown'))].sort() },
    notes: [],
  };
}

function paramList(profile: ModelProfile): Param[] {
  const ps: Param[] = [];
  if (profile.age) {
    for (const st of ['1', '2', '3'] as const) {
      ps.push({ name: `age${st}.a`, get: p => p.age![st].a, set: (p, v) => { p.age![st].a = v; }, scale: 2000, lo: -1000, hi: 4500, prior: 0 });
      ps.push({ name: `age${st}.b`, get: p => p.age![st].b, set: (p, v) => { p.age![st].b = v; }, scale: 0.2, lo: 0, hi: 0.6, prior: 0 });
    }
  }
  ps.push({ name: 'box.base', get: p => p.boxNo.base, set: (p, v) => { p.boxNo.base = v; }, scale: 2000, lo: 0, hi: 6000, prior: 2250 });
  if (profile.chargerNo && !CLEAN_OFFSET[profile.modelKey]) {
    ps.push({ name: 'charger.base', get: p => p.chargerNo!.base, set: (p, v) => { p.chargerNo!.base = v; }, scale: 500, lo: 0, hi: 3000, prior: 300 });
    if (profile.age) ps.push({ name: 'charger.aged', get: p => p.chargerNo!.aged, set: (p, v) => { p.chargerNo!.aged = v; }, scale: 500, lo: 0, hi: 3000, prior: 300 });
  }
  if (profile.age) ps.push({ name: 'box.aged', get: p => p.boxNo.aged, set: (p, v) => { p.boxNo.aged = v; }, scale: 2000, lo: 0, hi: 6000, prior: 2250 });
  if (profile.eSimDualPct != null) ps.push({ name: 'esim', get: p => p.eSimDualPct!, set: (p, v) => { p.eSimDualPct = v; }, scale: 0.05, lo: 0, hi: 0.3, prior: 0.05 });
  for (const cls of CLASS_ORDER) {
    if (cls === 'finger') continue;
    const kind = profile.classes[cls]!.kind;
    ps.push({ name: `class.${cls}`, get: p => p.classes[cls]!.value, set: (p, v) => { p.classes[cls]!.value = v; },
      scale: kind === 'fixed' ? 8000 : 0.2, lo: 0, hi: kind === 'fixed' ? 90000 : 0.95, prior: 0 });
  }
  return ps;
}

/** Plateau detection among quotes whose answers force the over-11-months state. A plateau is a quote-to-base ratio
 * shared (within 0.12%) by >= 2 different condition shapes across >= 3 quotes. Tried against two bases (the reference
 * price and the aged price); the basis whose plateau value predicts the plateau quotes best is kept. */
export function detectFloor(profile: ModelProfile, rows: { m: Measurement; ans: ReturnType<typeof parseAnswers>; ref: number; storageGb: number }[]): ModelProfile['floor'] {
  const pts: { obs: number; ref: number; aged: number; shape: string }[] = [];
  for (const r of rows) {
    if (r.ans.codes.length === 0 || r.m.base == null) continue;
    const d = deduct(profile, r.ref, r.ans, r.storageGb);
    // the floor belongs to the functional-fault deductions: an aged phone with only screen/body damage can quote below it (iPhone 15 touch+screen+panel)
    if (!('deduction' in d) || d.faultCount < floorMinFaults(profile) || (profile.age ? d.state !== 3 || d.agedPrice == null : false)) continue;
    pts.push({ obs: r.m.base, ref: r.ref, aged: d.agedPrice ?? r.ref, shape: r.m.deviations.join('|') });
  }
  const find = (basis: 'reference' | 'aged') => {
    const ratio = (q: typeof pts[number]) => q.obs / (basis === 'aged' ? q.aged : q.ref);
    // quotes are whole tens of rupees: on a INR 1,500 phone that rounding alone moves the ratio by 0.7%
    const slack = (q: typeof pts[number], min: number) => Math.max(min, 10 / (basis === 'aged' ? q.aged : q.ref));
    const sorted = [...pts].sort((x, y) => ratio(x) - ratio(y));
    for (const p of sorted.filter(q => ratio(q) < 0.35)) {
      const cluster = sorted.filter(q => Math.abs(ratio(q) - ratio(p)) <= slack(q, 0.0012));
      // A floor is the minimum price: no observed quote may sit below it. Coincidentally equal prices higher up are not a floor.
      const lowerExists = sorted.some(q => ratio(q) < ratio(p) - slack(q, 0.0015));
      if (!lowerExists && cluster.length >= 3 && new Set(cluster.map(c => c.shape)).size >= 2) {
        return { basis, value: Math.round((cluster.reduce((t, c) => t + ratio(c), 0) / cluster.length) * 100000) / 100000, cluster };
      }
    }
    return null;
  };
  const cands = (profile.age ? (['reference', 'aged'] as const) : (['reference'] as const)).map(find).filter((c): c is NonNullable<ReturnType<typeof find>> => c != null);
  if (!cands.length) return null;
  const union = new Set(cands.flatMap(c => c.cluster));
  const score = (c: typeof cands[number]) => Math.max(...[...union].map(q => Math.abs(c.value * (c.basis === 'aged' ? q.aged : q.ref) - q.obs)));
  const best = cands.sort((x, y) => score(x) - score(y))[0];
  return { basis: best.basis, value: best.value };
}

function solveSymmetric(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}
function invertDiag(A: number[][]): number[] {
  const n = A.length; const out: number[] = [];
  for (let j = 0; j < n; j++) { const e = Array(n).fill(0); e[j] = 1; out.push(solveSymmetric(A, e)[j]); }
  return out;
}

interface Row { m: Measurement; ans: ReturnType<typeof parseAnswers>; target: number; ref: number; shape: string; storageGb: number; atFloor?: boolean }
/** Residual in rupees. A floor-limited quote only says the true deduction is AT LEAST this large, so only an under-estimate is penalised. */
const residual = (r: Row, f: number) => (r.atFloor ? Math.max(0, r.target - f) : r.target - f);

function deductionFor(profile: ModelProfile, row: Row): number | null {
  const d = deduct(profile, row.ref, row.ans, row.storageGb);
  return 'deduction' in d ? d.deduction : null;
}

/**
 * Box and charger deductions from controlled pairs: two quotes of the same report and capacity whose answers differ ONLY by the missing
 * box (or charger). Where no such pair exists for the charger, a quote that differs from the flawless one by just the missing box and
 * charger, less the box deduction, gives it. This seeds the joint refinement, which cannot separate them alone because a model's
 * combination reports often leave the charger out of every quote.
 */
export function seedAccessoryDeductions(profile: ModelProfile, rows: Row[]) {
  const key = (r: Row, devs: string[]) => `${r.m.archive}|${r.m.member}|${r.m.storage_gb}|${[...devs].sort().join(',')}`;
  const byKey = new Map<string, Row>();
  for (const r of rows) byKey.set(key(r, r.m.deviations), r);
  const diffs = (token: string, aged: boolean) => {
    const out: number[] = [];
    for (const r of rows) {
      if (!r.m.deviations.includes(token)) continue;
      const partner = byKey.get(key(r, r.m.deviations.filter(d => d !== token)));
      if (!partner || (ageStateOf(r.ans, profile).state === 3) !== aged || (ageStateOf(partner.ans, profile).state === 3) !== aged) continue;
      out.push(r.target - partner.target);
    }
    return out;
  };
  const box = diffs('BOX_NO', false);
  if (box.length) profile.boxNo.base = Math.max(0, medianOf(box));
  const boxAged = profile.age ? diffs('BOX_NO', true) : [];
  if (boxAged.length) profile.boxNo.aged = Math.max(0, medianOf(boxAged));
  if (profile.chargerNo && profile.asks.charger && !CLEAN_OFFSET[profile.modelKey]) {
    let charger = diffs('CHARGER_NO', false);
    if (!charger.length) {
      charger = rows.filter(r => r.m.deviations.length > 0 && r.m.deviations.every(d => d === 'BOX_NO' || d === 'CHARGER_NO') && r.m.deviations.includes('CHARGER_NO') && ageStateOf(r.ans, profile).state !== 3)
        .map(r => r.target - (r.m.deviations.includes('BOX_NO') ? profile.boxNo.base : 0));
    }
    if (charger.length) profile.chargerNo.base = Math.max(0, medianOf(charger));
  }
}

/** How other models priced a code (fixed rupees vs a fraction of the reference); set between fitting passes and used when a model's own
 * quotes cannot tell the two apart (one capacity, or references too close together). */
let KIND_VOTES = new Map<string, ValueKind>();
export function setKindVotes(v: Map<string, ValueKind>) { KIND_VOTES = v; }
export function collectKindVotes(profiles: ModelProfile[]): Map<string, ValueKind> {
  const votes = new Map<string, { fixed: number; pct: number }>();
  for (const p of profiles) for (const [code, c] of Object.entries(p.codes ?? {})) {
    if (!c.decided) continue;
    const v = votes.get(code) ?? votes.set(code, { fixed: 0, pct: 0 }).get(code)!;
    v[c.kind]++;
  }
  return new Map([...votes].map(([k, v]) => [k, v.pct > v.fixed ? 'pct' : 'fixed'] as [string, ValueKind]));
}

/**
 * Per-code deductions. A code's value is read off the quotes that isolate it (the flawless quote vs the same quote with only that code
 * changed) as fixed rupees or as a fraction of the reference, whichever the model's own capacities support; then every code is refined
 * jointly on all the quotes that contain it, by least absolute error so a few odd or floor-limited quotes cannot drag it.
 */
export function fitCodeOverrides(profile: ModelProfile, rows: Row[], opts: { decide: boolean }) {
  const usable = rows.filter(r => !r.atFloor);
  const codes = [...new Set(usable.flatMap(r => r.ans.codes))].filter(c => classOf(c) != null).sort();
  profile.codes ??= {};
  const predict = (r: Row) => { const d = deduct(profile, r.ref, r.ans, r.storageGb); return 'deduction' in d ? d.deduction : null; };
  const lossFor = (code: string) => {
    let t = 0;
    for (const r of usable) if (r.ans.codes.includes(code)) { const f = predict(r); t += f == null ? 0 : Math.abs(r.target - f); }
    return t;
  };
  if (opts.decide) {
    for (const code of codes) {
      const cls = classOf(code)!;
      const classKind = profile.classes[cls]!.kind;
      const singles = usable.filter(r => r.m.deviations.length === 1 && r.m.deviations[0] === code);
      profile.codes[code] = { kind: 'fixed', value: 0, support: 'inferred', n: 0 };
      let amounts = singles.map(r => ({ ref: r.ref, gb: r.storageGb, amt: r.target - (predict(r) ?? 0) }));
      // a code that would force the aged state but whose whole single deduction is smaller than the age deduction does not force it on this model
      if (profile.ageTriggers?.includes(code) && amounts.length && medianOf(amounts.map(a => a.amt)) < -30) {
        profile.ageTriggers = profile.ageTriggers.filter(c => c !== code);
        amounts = singles.map(r => ({ ref: r.ref, gb: r.storageGb, amt: r.target - (predict(r) ?? 0) }));
      }
      if (!amounts.length) {
        // no isolating quote: start from the class anchor x template weight, refined jointly below
        const w = classInfo(cls).weights[code] ?? 1;
        const cal = profile.classes[cls]!;
        profile.codes[code] = { kind: cal.kind, value: Math.max(0, w * cal.value), support: 'inferred', n: 0 };
        continue;
      }
      const refs = amounts.map(a => a.ref);
      const spread = (Math.max(...refs) - Math.min(...refs)) / Math.max(1, Math.min(...refs));
      const vFixed = medianOf(amounts.map(a => a.amt));
      const pPct = medianOf(amounts.map(a => a.amt / a.ref));
      const lFixed = amounts.reduce((s, a) => s + Math.abs(a.amt - vFixed), 0);
      const lPct = amounts.reduce((s, a) => s + Math.abs(a.amt - pPct * a.ref), 0);
      let kind: ValueKind; let decided = false;
      if (spread >= 0.03 && new Set(amounts.map(a => a.gb)).size >= 2 && Math.abs(lFixed - lPct) > 0.15 * Math.max(lFixed, lPct, 1)) { kind = lPct < lFixed ? 'pct' : 'fixed'; decided = true; }
      else kind = KIND_VOTES.get(code) ?? classKind;
      profile.codes[code] = { kind, value: Math.max(0, kind === 'fixed' ? vFixed : pPct), support: 'measured', n: amounts.length, ...(decided ? { decided: true } : {}) };
    }
  }
  // accessories are refined with the codes: a charger-asking model's combinations only separate box from charger jointly
  type Coord = { name: string; kind: ValueKind; get: () => number; set: (v: number) => void; touches: (r: Row) => boolean };
  const stateOf = (r: Row) => ageStateOf(r.ans, profile).state;
  const coords: Coord[] = codes.filter(code => profile.codes![code]).map(code => {
    const c = profile.codes![code];
    return { name: code, kind: c.kind, get: () => c.value, set: (v: number) => { c.value = v; }, touches: (r: Row) => r.ans.codes.includes(code) };
  });
  // Codes seen only in combinations share a largest-wins group with equal template weights (D01/D04): moving one alone changes nothing while
  // the other ties, so each class's unisolated codes also move together by a common scale.
  const unisolated = new Map<string, string[]>();
  for (const code of codes) if (profile.codes[code] && !usable.some(r => r.m.deviations.length === 1 && r.m.deviations[0] === code)) {
    const cls = classOf(code)!;
    (unisolated.get(cls) ?? unisolated.set(cls, []).get(cls)!).push(code);
  }
  for (const [cls, members] of unisolated) {
    if (members.length < 2) continue;
    let scale = 1;
    coords.push({ name: `SCALE:${cls}`, kind: 'pct', get: () => scale,
      set: v => { const f = scale > 0 ? v / scale : 0; scale = v; if (f > 0) members.forEach(c => { profile.codes![c].value *= f; }); },
      touches: r => r.ans.codes.some(c => members.includes(c)) });
  }
  coords.push({ name: 'BOX', kind: 'fixed', get: () => profile.boxNo.base, set: v => { profile.boxNo.base = v; }, touches: r => r.ans.boxMissing && (!profile.age || stateOf(r) !== 3) });
  if (profile.age) coords.push({ name: 'BOX_AGED', kind: 'fixed', get: () => profile.boxNo.aged, set: v => { profile.boxNo.aged = v; }, touches: r => r.ans.boxMissing && stateOf(r) === 3 });
  if (profile.chargerNo && profile.asks.charger && !CLEAN_OFFSET[profile.modelKey]) {
    coords.push({ name: 'CHARGER', kind: 'fixed', get: () => profile.chargerNo!.base, set: v => { profile.chargerNo!.base = v; }, touches: r => r.ans.chargerMissing && (!profile.age || stateOf(r) !== 3) });
    if (profile.age) coords.push({ name: 'CHARGER_AGED', kind: 'fixed', get: () => profile.chargerNo!.aged, set: v => { profile.chargerNo!.aged = v; }, touches: r => r.ans.chargerMissing && stateOf(r) === 3 });
  }
  const loss = (c: Coord) => {
    let t = 0;
    for (const r of usable) if (c.touches(r)) { const f = predict(r); t += f == null ? 0 : Math.abs(r.target - f); }
    return t;
  };
  for (let sweep = 0; sweep < 12; sweep++) {
    let moved = false;
    for (const c of coords) {
      let step = c.kind === 'fixed' ? Math.max(50, 0.1 * c.get()) : Math.max(0.002, 0.1 * c.get());
      let cur = loss(c);
      if (cur === 0) continue;
      while (step > (c.kind === 'fixed' ? 0.5 : 1e-5)) {
        let improved = false;
        for (const dir of [1, -1]) {
          const old = c.get();
          c.set(Math.max(0, old + dir * step));
          const l = loss(c);
          if (l < cur - 1e-6) { cur = l; improved = true; moved = true; break; }
          c.set(old);
        }
        if (!improved) step /= 2;
      }
    }
    if (!moved) break;
  }
  // measured when an isolating quote or at least three distinct shapes constrain the code
  for (const code of codes) {
    const c = profile.codes[code];
    if (!c) continue;
    const shapes = new Set(usable.filter(r => r.ans.codes.includes(code)).map(r => r.shape)).size;
    c.n = Math.max(c.n, shapes);
    if (c.support !== 'measured' && shapes >= 3) c.support = 'measured';
  }
}

export interface FitReport { modelKey: string; rows: number; used: number; rmse: number; maxAbs: number; floor: ModelProfile['floor']; params: Record<string, { value: number; support: Support; shapes: number }> }

export function fitModel(modelKey: string, all: Measurement[], sem: ReturnType<typeof modelSemantics>, prior?: ModelProfile): { profile: ModelProfile; report: FitReport } {
  const rows = all.filter(m => m.model_key === modelKey && m.outcome === 'NUMERIC_QUOTE' && m.base != null);
  const profile = emptyProfile(modelKey, all.filter(m => m.model_key === modelKey), sem);
  // the quote for a phone that cannot make or receive calls (nothing else wrong) is a flat amount: INR 1,200 on every model measured but the SE 2022 (INR 800)
  const scrapQuotes = rows.filter(m => m.deviations.length === 1 && m.deviations[0] === 'Q01').map(m => m.base!);
  if (scrapQuotes.length) profile.scrap = median(scrapQuotes);
  // priors: sibling profile values replace template defaults; kind follows the sibling when it was decided from data
  const ps = paramList(profile);
  if (prior) {
    for (const cls of CLASS_ORDER) if (prior.classes[cls]) profile.classes[cls] = { ...prior.classes[cls]!, support: 'inferred', n: 0 };
    if (profile.age && prior.age) for (const st of ['1', '2', '3'] as const) profile.age[st] = { ...prior.age[st], support: 'inferred', n: 0 };
    profile.boxNo = { ...prior.boxNo, support: 'inferred' };
    if (profile.chargerNo && prior.chargerNo && !CLEAN_OFFSET[modelKey]) profile.chargerNo = { ...prior.chargerNo, support: 'inferred' };
    if (profile.eSimDualPct != null && prior.eSimDualPct != null) profile.eSimDualPct = prior.eSimDualPct;
  }
  const params = paramList(profile);
  const prior0 = params.map(p => p.get(profile));
  const fitRows: Row[] = [];
  for (const m of rows) {
    const ans = parseAnswers(toDiagnostics(m, 'none'));
    if (ans.unsupported.length || ans.callsFailed) continue;
    if (ans.codes.filter(c => c.startsWith('F')).length >= profile.extremeFaultCount) continue;
    fitRows.push({ m, ans, target: m.variant_get_upto - m.base!, ref: m.variant_get_upto, shape: m.deviations.join('|'), storageGb: m.storage_gb });
  }
  const lambda = Number(process.env.FIT_LAMBDA ?? 0.01);
  /** Damped Gauss-Newton over the `active` parameters on `useRows`, ridge towards `anchor`. Returns the Jacobian. */
  let lastSse = 0;
  const gaussNewton = (useRows: Row[], active: boolean[], anchor: number[], lam0: number, maxIter = 60): number[][] => {
    const sse = () => useRows.reduce((s, r) => { const f = deductionFor(profile, r); return s + (f == null ? 0 : (residual(r, f) / SIGMA) ** 2); }, 0);
    let cur = sse();
    let J: number[][] = [];
    for (let iter = 0; iter < maxIter; iter++) {
      const f0 = useRows.map(r => deductionFor(profile, r) ?? 0);
      J = useRows.map(() => Array(params.length).fill(0));
      params.forEach((p, j) => {
        if (!active[j]) return;
        const base = p.get(profile);
        const h = Math.max(1e-4 * Math.abs(base), 1e-3 * p.scale);
        p.set(profile, base + h);
        useRows.forEach((r, i) => { J[i][j] = ((deductionFor(profile, r) ?? 0) - f0[i]) / h; });
        p.set(profile, base);
      });
      const n = params.length;
      const A = Array.from({ length: n }, () => Array(n).fill(0));
      const g = Array(n).fill(0);
      useRows.forEach((r, i) => {
        const res = residual(r, f0[i]) / SIGMA;
        if (r.atFloor && res === 0) return;
        for (let a = 0; a < n; a++) { if (!J[i][a]) continue; g[a] += J[i][a] / SIGMA * res; for (let b = a; b < n; b++) A[a][b] += J[i][a] * J[i][b] / (SIGMA * SIGMA); }
      });
      for (let a = 0; a < n; a++) for (let b = 0; b < a; b++) A[a][b] = A[b][a];
      for (let a = 0; a < n; a++) {
        const lam = lam0 / (params[a].scale ** 2);
        A[a][a] += active[a] ? lam : 1e12; // frozen parameters cannot move
        g[a] -= active[a] ? lam * (params[a].get(profile) - anchor[a]) : 0;
      }
      const delta = solveSymmetric(A, g);
      let step = 1; let improved = false;
      const snapshot = params.map(p => p.get(profile));
      for (let tries = 0; tries < 10; tries++) {
        params.forEach((p, j) => p.set(profile, Math.min(p.hi, Math.max(p.lo, snapshot[j] + step * delta[j]))));
        const nxt = sse();
        if (nxt < cur - 1e-9) { cur = nxt; improved = true; break; }
        step /= 2;
      }
      if (!improved) { params.forEach((p, j) => p.set(profile, snapshot[j])); break; }
      if (Math.max(...delta.map((d, j) => Math.abs(step * d) / params[j].scale)) < 1e-6) break;
    }
    lastSse = cur;
    return J;
  };
  /** Derivative-free polish: coordinate search with shrinking steps. Gauss-Newton can stall at the kinks where a
   * largest-wins group switches its winner; a 1-D search per parameter walks across them. */
  const coordinateSearch = (useRows: Row[], active: boolean[], anchor: number[], lam0: number) => {
    const objective = () => {
      let t = 0;
      for (const r of useRows) { const f = deductionFor(profile, r); if (f != null) t += (residual(r, f) / SIGMA) ** 2; }
      params.forEach((p, j) => { if (active[j]) t += (lam0 / (p.scale ** 2)) * (p.get(profile) - anchor[j]) ** 2 / 2; });
      return t;
    };
    let cur = objective();
    const step = params.map(p => 0.1 * p.scale);
    for (let sweep = 0; sweep < COORD_SWEEPS; sweep++) {
      let moved = false;
      params.forEach((p, j) => {
        if (!active[j]) return;
        const base = p.get(profile);
        for (const dir of [1, -1]) {
          const v = Math.min(p.hi, Math.max(p.lo, base + dir * step[j]));
          if (v === base) continue;
          p.set(profile, v);
          const o = objective();
          if (o < cur - 1e-9) { cur = o; moved = true; return; }
          p.set(profile, base);
        }
        step[j] *= 0.6;
      });
      if (!moved && step.every((st, j) => !active[j] || st < 1e-5 * params[j].scale)) break;
    }
    lastSse = cur;
  };
  const isAgeOrBox = (name: string) => /^(age|box|charger)/.test(name);
  // Stage 1: age law and box deduction from quotes that differ from the flawless baseline ONLY in age/warranty/bill/box.
  const pure = fitRows.filter(r => r.m.deviations.every(d => d.startsWith('AGE:') || d === 'WARRANTY_NO' || d === 'BILL_NO' || d === 'BOX_NO' || d === 'CHARGER_NO'));
  if (pure.length) gaussNewton(pure, params.map(p => isAgeOrBox(p.name)), prior0, lambda);
  // Measured per-variant age percentages (rows without a box deduction), preferred by the engine for those variants
  if (profile.age) {
    const by = new Map<string, number[]>();
    for (const r of pure) {
      if (r.m.deviations.includes('BOX_NO') || r.m.deviations.includes('CHARGER_NO')) continue;
      const st = ageStateOf(r.ans, profile).state;
      if (st < 1) continue;
      const k = r.storageGb + ':' + st;
      (by.get(k) ?? by.set(k, []).get(k)!).push(r.target / r.ref);
    }
    const table: NonNullable<ModelProfile['ageByStorage']> = {};
    for (const [k, v] of by) {
      const [gb, st] = k.split(':');
      table[gb] ??= { '1': null, '2': null, '3': null };
      table[gb][st as '1' | '2' | '3'] = Math.round(median(v) * 100000) / 100000;
    }
    profile.ageByStorage = table;
  }
  // Stage 1.5: per-code deductions, so the floor is read off the aged price with the right per-code amounts
  seedAccessoryDeductions(profile, fitRows);
  fitCodeOverrides(profile, fitRows, { decide: true });
  // The floor is read off the aged price once the age law is known; floor-limited quotes carry no information about
  // the individual deductions, so they are excluded from the fit (and checked afterwards).
  profile.floor = detectFloor(profile, fitRows);
  // Cashify's minimum price is a property of the generation (about 17% of the reference from the iPhone 16 on): when this model's own quotes
  // cannot show the plateau (too few floor-limited shapes in the data at hand), the siblings' floor applies rather than none.
  if (!profile.floor && profile.age && prior?.floor) profile.floor = { ...prior.floor };
  if (profile.floor) {
    for (const r of fitRows) {
      const d = deduct(profile, r.ref, r.ans, r.storageGb);
      if ('deduction' in d && (profile.age ? d.state === 3 && d.agedPrice != null : true) && d.faultCount >= floorMinFaults(profile) && r.m.base! <= profile.floor.value * (profile.floor.basis === 'aged' ? d.agedPrice! : r.ref) * 1.003 + 10) r.atFloor = true;
    }
  }
  // per-code deductions again without the floor-limited quotes
  fitCodeOverrides(profile, fitRows, { decide: false });
  // Stage 2: condition classes with age/box frozen at stage-1 values
  const afterStage1 = params.map(p => p.get(profile));
  const classActive = params.map(p => !isAgeOrBox(p.name));
  // The largest-wins groups make the objective piecewise linear with many local minima, so start from the prior and from
  // several seeded perturbations of the class values and keep the best (ridge-penalised) fit.
  const rng = seededRng(modelKey);
  let best: { sse: number; values: number[] } | null = null;
  // Class anchors only price codes without their own value; when every code in the quotes has one, a single start suffices.
  const classesMatter = fitRows.some(r => r.ans.codes.some(c => !profile.codes?.[c]));
  for (let k = 0; k < (classesMatter ? MULTISTART : 1); k++) {
    params.forEach((p, j) => p.set(profile, classActive[j] && k > 0 ? Math.min(p.hi, Math.max(p.lo, afterStage1[j] * Math.exp(0.45 * gauss(rng)))) : afterStage1[j]));
    gaussNewton(fitRows, classActive, afterStage1, lambda, 30);
    if (classesMatter) coordinateSearch(fitRows, classActive, afterStage1, lambda);
    if (!best || lastSse < best.sse) best = { sse: lastSse, values: params.map(p => p.get(profile)) };
  }
  params.forEach((p, j) => p.set(profile, best!.values[j]));
  // Stage 3: polish everything together, ridge towards the staged values
  const afterStage2 = params.map(p => p.get(profile));
  const J = gaussNewton(fitRows, params.map(() => true), afterStage2, lambda);
  // the per-code values and accessories are least-absolute-error estimates: settle them once more against the polished age law
  fitCodeOverrides(profile, fitRows, { decide: false });
  // which group combinations the model's own quotes cover (used to label quotes outside them 'inferred')
  {
    const seen = new Set<string>();
    for (const m of rows) {
      const ans = parseAnswers(toDiagnostics(m, 'none'));
      if (ans.unsupported.length || ans.callsFailed || !ans.codes.length) continue;
      const state = ageStateOf(ans, profile).state;
      seen.add(interactionSignature(ans.codes, state === 3, { box: ans.boxMissing, esim: ans.dualEsim && profile.asks.eSim }));
      seen.add(interactionSignature(ans.codes, state === 3));
    }
    profile.observedInteractions = [...seen].sort();
  }
  // support: parameters pinned down by the model's own quotes
  const n = params.length;
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  fitRows.forEach((r, i) => { for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) A[a][b] += (J[i]?.[a] ?? 0) * (J[i]?.[b] ?? 0) / (SIGMA * SIGMA); });
  for (let a = 0; a < n; a++) A[a][a] += lambda / (params[a].scale ** 2);
  const variance = invertDiag(A);
  const shapesFor = (j: number) => new Set(fitRows.filter((r, i) => Math.abs(J[i]?.[j] ?? 0) > 1e-9).map(r => r.shape)).size;
  const report: FitReport = { modelKey, rows: rows.length, used: fitRows.length, rmse: 0, maxAbs: 0, floor: profile.floor, params: {} };
  params.forEach((p, j) => {
    const std = Math.sqrt(Math.max(variance[j], 0)) / p.scale;
    const nShapes = shapesFor(j);
    const support: Support = nShapes >= 1 && std < 0.25 ? 'measured' : 'inferred';
    report.params[p.name] = { value: p.get(profile), support, shapes: nShapes };
    const m = p.name.match(/^class\.(.+)$/);
    if (m) Object.assign(profile.classes[m[1] as ClassKey]!, { support, n: nShapes });
    const am = p.name.match(/^age(\d)\.(a|b)$/);
    if (am && profile.age) { const c = profile.age[am[1] as '1' | '2' | '3']; if (am[2] === 'b') { c.support = support; c.n = nShapes; } else if (support === 'inferred' && c.support !== 'measured') c.support = 'inferred'; }
    if (p.name === 'box.base') profile.boxNo.support = support;
    if (p.name === 'charger.base' && profile.chargerNo) profile.chargerNo.support = support;
  });
  const errs = fitRows.map(r => -residual(r, deductionFor(profile, r) ?? 0));
  report.rmse = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / Math.max(1, errs.length));
  report.maxAbs = Math.max(0, ...errs.map(Math.abs));
  return { profile, report };
}

function medianOf(xs: number[]): number { return median(xs); }
function median(xs: number[]): number { const v = [...xs].sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : NaN; }

/** Sibling prior: for each class/age parameter, the median of the other models in the same family. */
function siblingPrior(models: ModelProfile[], family: string, selfKey: string, template: ModelProfile): ModelProfile | undefined {
  const sibs = models.filter(m => m.family === family && m.modelKey !== selfKey);
  if (!sibs.length) return undefined;
  const out: ModelProfile = JSON.parse(JSON.stringify(template));
  // The cracked / touch / non-original screen anchors are priced relative to the display anchor; when this model's own
  // display anchor is pinned down by its quotes, scale the siblings' ratio to it.
  const ownDisplay = template.classes.display?.support === 'measured' ? template.classes.display.value : null;
  for (const cls of CLASS_ORDER) {
    const measured = sibs.filter(s => s.classes[cls]?.support === 'measured');
    const use = measured.length ? measured : sibs;
    let value = median(use.map(s => s.classes[cls]!.value));
    if ((cls === 'cracked' || cls === 'touch' || cls === 'orig') && ownDisplay != null && use[0].classes[cls]!.kind === 'fixed') {
      value = median(use.map(s => s.classes[cls]!.value / s.classes.display!.value)) * ownDisplay;
    }
    out.classes[cls] = { ...out.classes[cls]!, kind: use[0].classes[cls]!.kind, value };
  }
  if (out.age) {
    for (const st of ['1', '2', '3'] as const) {
      const have = sibs.filter(s => s.age).map(s => s.age![st]);
      if (have.length) out.age[st] = { ...out.age[st], a: median(have.map(h => h.a)), b: median(have.map(h => h.b)) };
    }
  }
  // minimum price: siblings' plateau as a share of the reference (an aged-basis plateau is converted with that sibling's own age law)
  const floors = sibs.filter(s => s.floor && s.age).map(s => s.floor!.basis === 'reference' ? s.floor!.value : s.floor!.value * (1 - s.age!['3'].b));
  if (floors.length) out.floor = { basis: 'reference', value: median(floors) };
  const boxes = sibs.map(s => s.boxNo);
  out.boxNo = { base: median(boxes.map(b => b.base)), aged: median(boxes.map(b => b.aged)), support: 'inferred' };
  const es = sibs.map(s => s.eSimDualPct).filter((x): x is number => x != null);
  if (es.length) out.eSimDualPct = median(es);
  return out;
}

export function fitCalibration(train: Measurement[], generatedFrom: string, onlyModels?: string[], semOverride?: ReturnType<typeof modelSemantics>): { calibration: Calibration; reports: FitReport[] } {
  const sem = semOverride ?? modelSemantics(train);
  const modelKeys = [...new Set(train.filter(m => m.outcome === 'NUMERIC_QUOTE').map(m => m.model_key))]
    .filter(k => !onlyModels || onlyModels.includes(k)).sort();
  // pass 1: template priors; pass 2: sibling priors
  KIND_VOTES = new Map();
  let fits = modelKeys.map(k => fitModel(k, train, sem));
  for (let pass = 0; pass < 2; pass++) {
    const profiles = fits.map(f => f.profile);
    KIND_VOTES = collectKindVotes(profiles);
    fits = modelKeys.map((k, i) => {
      const p = siblingPrior(profiles, familyOf(k), k, profiles[i]);
      return fitModel(k, train, sem, p);
    });
  }
  const models: Record<string, ModelProfile> = {};
  for (const f of fits) models[f.profile.modelKey] = f.profile;
  const typical = new Map(modelKeys.map(k => [k, median(train.filter(m => m.model_key === k && m.outcome === 'NUMERIC_QUOTE').map(m => m.variant_get_upto))]));
  for (const m of Object.values(models)) m.evidence.medianReference = typical.get(m.modelKey);
  fillUnobservedCodes(Object.values(models), typical);
  return { calibration: { version: 'apple-cashify-calibration/1', generatedFrom, models }, reports: fits.map(f => f.report) };
}

/**
 * Codes a model's own quotes never contain still need a value an answer can reach. In order:
 *  1. the model's own measured codes of the same template class, through the template's within-class ratio (D02 from this model's D01);
 *  2. otherwise the three models with the closest typical reference that measured the code, as a share of their reference applied to this
 *     model's (fixed rupees stay fixed rupees at this model's scale; a fraction stays a fraction).
 * Every value set here is labelled inferred, with its basis recorded; measured values are never touched.
 */
export function fillUnobservedCodes(profiles: ModelProfile[], typical: Map<string, number>) {
  const allCodes = CLASS_ORDER.flatMap(cls => Object.keys(classInfo(cls).weights));
  const measured = (p: ModelProfile, code: string) => { const c = p.codes?.[code]; return c && c.support === 'measured' ? c : null; };
  const filled: [ModelProfile, string, ClassCal][] = [];
  for (const p of profiles) {
    const ref = typical.get(p.modelKey);
    if (!ref) continue;
    for (const code of allCodes) {
      if (p.codes?.[code]) continue;
      const cls = classOf(code)!;
      const w = classInfo(cls).weights;
      const own = Object.keys(w).filter(c => c !== code && w[c] > 0 && measured(p, c));
      if (own.length && w[code] != null) {
        const kinds = own.map(c => p.codes![c].kind);
        const kind = kinds.filter(k => k === 'pct').length > kinds.length / 2 ? 'pct' : 'fixed';
        const anchors = own.filter(c => p.codes![c].kind === kind).map(c => p.codes![c].value / w[c]);
        filled.push([p, code, { kind, value: median(anchors) * w[code], support: 'inferred', n: 0, basis: `own ${own.join('/')} x template ratio` } as ClassCal]);
        continue;
      }
      const sources = profiles.filter(o => o !== p && measured(o, code) && typical.get(o.modelKey))
        .sort((a, b) => Math.abs(Math.log(typical.get(a.modelKey)! / ref)) - Math.abs(Math.log(typical.get(b.modelKey)! / ref))).slice(0, 3);
      if (!sources.length) continue;
      const kind: ValueKind = sources.filter(o => o.codes![code].kind === 'pct').length > sources.length / 2 ? 'pct' : 'fixed';
      const shares = sources.map(o => { const c = o.codes![code]; return c.kind === 'pct' ? c.value : c.value / typical.get(o.modelKey)!; });
      filled.push([p, code, { kind, value: kind === 'pct' ? median(shares) : median(shares) * ref, support: 'inferred', n: 0, basis: `siblings ${sources.map(o => o.modelKey).join(', ')}` } as ClassCal]);
    }
  }
  for (const [p, code, cal] of filled) { p.codes ??= {}; p.codes[code] = cal; }
}

/**
 * Zero-shot profile for a model that has NO quotes in the training data: every number is borrowed from the
 * sibling models of its family (same generation), so every parameter is 'inferred'. Used only to measure how far
 * calibration transfers between models (it is not a supported production path).
 */
export function zeroShotProfile(cal: Calibration, modelKey: string, modelRows: Measurement[]): ModelProfile {
  const sem = modelSemantics(modelRows);
  const base = emptyProfile(modelKey, modelRows, sem);
  const sibs = Object.values(cal.models).filter(m => m.family === base.family && m.modelKey !== modelKey);
  const prior = siblingPrior(Object.values(cal.models), base.family, modelKey, base);
  if (!prior) return base;
  for (const cls of CLASS_ORDER) base.classes[cls] = { ...prior.classes[cls]!, support: 'inferred', n: 0 };
  if (base.age && prior.age) for (const st of ['1', '2', '3'] as const) base.age[st] = { ...prior.age[st], support: 'inferred', n: 0 };
  base.boxNo = { ...prior.boxNo, support: 'inferred' };
  if (base.eSimDualPct != null && prior.eSimDualPct != null) base.eSimDualPct = prior.eSimDualPct;
  const typical = new Map(Object.values(cal.models).filter(m => m.evidence.medianReference).map(m => [m.modelKey, m.evidence.medianReference!] as [string, number]));
  typical.set(modelKey, median(modelRows.filter(m => m.outcome === 'NUMERIC_QUOTE').map(m => m.variant_get_upto)));
  const copies = Object.values(cal.models).filter(m => m.modelKey !== modelKey);
  fillUnobservedCodes([...copies, base], typical);
  const floors = sibs.map(s => s.floor).filter((f): f is NonNullable<typeof f> => f != null);
  if (base.age && floors.length) base.floor = { basis: floors[0].basis, value: median(floors.filter(f => f.basis === floors[0].basis).map(f => f.value)) };
  return base;
}
