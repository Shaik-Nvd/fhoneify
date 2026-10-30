/**
 * Held-out validation: current engine vs the evidence-calibrated engine on the SAME held-out Cashify quotes.
 *
 *   npx tsx scripts/pricing-evidence/validate-new-data.ts [--protocols p1,p2,p3,p4]
 *
 * Every protocol refits the calibration on a training partition only and predicts the held-out rows.
 * Leakage control: the unit that is kept together is the CONDITION SHAPE (model + the exact set of deviations from
 * the flawless baseline), so a repeated export, a repeat measurement, or the same condition measured on another
 * storage or date can never be split between training and test. Prices are never used to form partitions.
 *
 *   p1  unseen condition shapes   5 folds, shape hashed to a fold
 *   p2  unseen storage variants   hold out the r-th storage of every model (r = 0..3)
 *   p3  later session (prospective) fit on the EARLIER collection only (measurements.jsonl, 2026-10-16..24), test on the 2026-10-25..28 collection
 *                                 for every model the earlier collection covers; same configurations on other dates are separate sessions, so this
 *                                 is a date/reference check, not an unseen-condition check
 *   p4  unseen models             leave one model out (siblings' calibration only; transfer test)
 *
 * IMPORTANT: the structural form of the model was chosen after exploring the whole dataset. These numbers are
 * honest about parameter estimation (no test quote informs the fit) but optimistic about structure.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { priceDevice } from '../../lib/pricing/engine';
import { evaluateAppleEvidence, type Calibration, type EvidenceOutcome } from '../../lib/pricing/appleCashifyModel/model';
import { EVIDENCE_DIR, hasUnknownInput, loadMeasurements, modelSemantics, resolveCatalog, stats, toDiagnostics, type Measurement } from './evidenceLib';
import { fitCalibration, setFitOptions, zeroShotProfile } from './fitCalibration';

const argv = process.argv.slice(2);
const protocolsArg = argv.find(a => a.startsWith('--protocols='))?.split('=')[1] ?? 'p1,p2,p3,p4';
const protocols = protocolsArg.split(',');
setFitOptions({ multistart: Number(process.env.FIT_STARTS ?? 3), coordSweeps: Number(process.env.FIT_SWEEPS ?? 80) });

const all = loadMeasurements();
const usable = all.filter(m => !hasUnknownInput(m));
const excludedUnknown = all.length - usable.length;
const semantics = modelSemantics(all);
const OUT = argv.find(a => a.startsWith('--out-dir=')) ? path.resolve(process.cwd(), argv.find(a => a.startsWith('--out-dir='))!.slice(10)) : path.join(EVIDENCE_DIR, 'validation-2026-10-28');
fs.mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ predictions
type Pred = { kind: 'PRICE'; price: number } | { kind: 'NO_OFFER' } | { kind: 'UNSUPPORTED'; reason: string };
function existingPredict(m: Measurement): Pred {
  const device = resolveCatalog(m.model_key, m.storage_gb).hit;
  const sem = semantics.get(m.model_key)!;
  try {
    const r = priceDevice('Apple', device?.model ?? `Apple ${m.model_key}`, m.variant_get_upto, toDiagnostics(m, 'current'),
      { warrantyMode: sem.warrantyMode, billMode: sem.billMode, ageMode: sem.ageMode } as any, device?.storage ?? m.storage, { disableAppleEvidence: true });
    return { kind: 'PRICE', price: r.cashifyConditionEquivalent };
  } catch (e: any) { return { kind: 'UNSUPPORTED', reason: String(e?.message ?? e) }; }
}
function proposedPredict(cal: Calibration | null, zero: ReturnType<typeof zeroShotProfile> | null, m: Measurement): { pred: Pred; outcome: EvidenceOutcome | null } {
  const profile = zero ?? cal?.models[m.model_key];
  if (!profile) return { pred: { kind: 'UNSUPPORTED', reason: 'model not calibrated' }, outcome: null };
  const o = evaluateAppleEvidence(profile, m.variant_get_upto, toDiagnostics(m, 'none'), m.storage_gb);
  if (o.kind === 'PRICE') return { pred: { kind: 'PRICE', price: o.price }, outcome: o };
  if (o.kind === 'NO_OFFER') return { pred: { kind: 'NO_OFFER' }, outcome: o };
  return { pred: { kind: 'UNSUPPORTED', reason: o.reason }, outcome: o };
}

// ------------------------------------------------------------------ grouping labels
const shapeOf = (m: Measurement) => `${m.model_key}#${m.deviations.join('|')}`;
const hash = (s: string) => parseInt(crypto.createHash('sha1').update(s).digest('hex').slice(0, 8), 16);
function defectGroup(m: Measurement): string {
  const g = new Set<string>();
  for (const d of m.deviations) {
    if (d.startsWith('AGE:') || d === 'WARRANTY_NO' || d === 'BILL_NO') g.add('age/warranty');
    else if (d === 'BOX_NO' || d === 'CHARGER_NO' || d === 'ESIM_DUAL') g.add('accessory/eSIM');
    else if (d === 'Q01') g.add('calls');
    else if (d === 'Q02' || d === 'Q03') g.add('touch/original screen');
    else if (/^[SD]/.test(d)) g.add('screen/display');
    else if (/^[CP]/.test(d)) g.add('body/panel');
    else if (d.startsWith('F')) g.add('functional');
  }
  return g.size ? [...g].sort().join(' + ') : 'baseline';
}
const sizeBucket = (m: Measurement) => (m.n_dev === 0 ? '0 (baseline)' : m.n_dev === 1 ? '1' : m.n_dev === 2 ? '2' : m.n_dev <= 4 ? '3-4' : m.n_dev <= 8 ? '5-8' : '9+');

interface EvalRow {
  protocol: string; fold: string; m: Measurement; existing: Pred; proposed: Pred; outcome: EvidenceOutcome | null;
}
const rowsByProtocol: Record<string, EvalRow[]> = {};
function run(protocol: string, fold: string, cal: Calibration | null, test: Measurement[], zeroFor?: (m: Measurement) => ReturnType<typeof zeroShotProfile>) {
  const rows = (rowsByProtocol[protocol] ??= []);
  for (const m of test) {
    const { pred, outcome } = proposedPredict(cal, zeroFor ? zeroFor(m) : null, m);
    rows.push({ protocol, fold, m, existing: existingPredict(m), proposed: pred, outcome });
  }
}

// ------------------------------------------------------------------ protocols
const t0 = Date.now();
const log = (s: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
if (protocols.includes('p1')) {
  for (let f = 0; f < 5; f++) {
    const train = usable.filter(m => hash(shapeOf(m)) % 5 !== f);
    const test = usable.filter(m => hash(shapeOf(m)) % 5 === f);
    const { calibration } = fitCalibration(train, `p1 fold ${f}`, undefined, semantics);
    run('p1', `shape-fold-${f}`, calibration, test);
    log(`p1 fold ${f}: train ${train.length} test ${test.length}`);
  }
}
if (protocols.includes('p2')) {
  const storages = new Map<string, number[]>();
  for (const m of usable) { const a = storages.get(m.model_key) ?? []; if (!a.includes(m.storage_gb)) a.push(m.storage_gb); storages.set(m.model_key, a.sort((x, y) => x - y)); }
  for (let r = 0; r < 4; r++) {
    const heldOut = (m: Measurement) => { const a = storages.get(m.model_key)!; return a.length >= 3 && a[Math.min(r, a.length - 1)] === m.storage_gb && r < a.length; };
    const test = usable.filter(heldOut);
    if (!test.length) continue;
    const train = usable.filter(m => !heldOut(m));
    const { calibration } = fitCalibration(train, `p2 storage-rank ${r}`, undefined, semantics);
    run('p2', `storage-rank-${r}`, calibration, test);
    log(`p2 rank ${r}: train ${train.length} test ${test.length}`);
  }
}
if (protocols.includes('p3')) {
  const isNew = (m: Measurement) => m.family.startsWith('new_');
  const train = usable.filter(m => !isNew(m));
  const trainModels = new Set(train.map(m => m.model_key));
  const test = usable.filter(m => isNew(m) && trainModels.has(m.model_key));
  const { calibration } = fitCalibration(train, 'p3 earlier collection only', undefined, semantics);
  run('p3', 'train=earlier collection,test=2026-10-25..28', calibration, test);
  log(`p3: train ${train.length} test ${test.length}`);
}
if (protocols.includes('p4')) {
  const models = [...new Set(usable.map(m => m.model_key))].sort();
  for (const model of models) {
    const train = usable.filter(m => m.model_key !== model);
    const test = usable.filter(m => m.model_key === model);
    const { calibration } = fitCalibration(train, `p4 without ${model}`, undefined, semantics);
    const zero = zeroShotProfile(calibration, model, all.filter(m => m.model_key === model));
    run('p4', `without-${model}`, calibration, test, () => zero);
    log(`p4 ${model}: test ${test.length}`);
  }
}

// ------------------------------------------------------------------ metrics
function summarize(rows: EvalRow[], who: 'existing' | 'proposed') {
  const numeric = rows.filter(r => r.m.outcome === 'NUMERIC_QUOTE' && r.m.base != null);
  const predicted = numeric.filter(r => r[who].kind === 'PRICE');
  const errs = predicted.map(r => (r[who] as { price: number }).price - r.m.base!);
  const abs = errs.map(Math.abs);
  const s = stats(abs);
  const rel = predicted.map(r => Math.abs((r[who] as { price: number }).price - r.m.base!) / r.m.base!);
  return {
    n: numeric.length, predicted: predicted.length, unsupported: numeric.length - predicted.length,
    mae: round(s.mean), median: round(s.median), p90: round(s.p90), p95: round(s.p95), max: round(s.max),
    bias: round(errs.reduce((a, b) => a + b, 0) / Math.max(1, errs.length)),
    overQuotePct: pct(errs.filter(e => e > 0).length, errs.length),
    within100: pct(abs.filter(e => e <= 100).length, abs.length), within500: pct(abs.filter(e => e <= 500).length, abs.length),
    within2pct: pct(rel.filter(e => e <= 0.02).length, rel.length), medianRelPct: round(100 * (stats(rel).median || 0), 2),
  };
}
const round = (x: number, d = 0) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const pct = (a: number, b: number) => (b ? round((100 * a) / b, 1) : null);

function groupBy(rows: EvalRow[], key: (r: EvalRow) => string) {
  const map = new Map<string, EvalRow[]>();
  for (const r of rows) (map.get(key(r)) ?? map.set(key(r), []).get(key(r))!).push(r);
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, rs]) => ({ key: k, existing: summarize(rs, 'existing'), proposed: summarize(rs, 'proposed') }));
}
function noOfferTable(rows: EvalRow[]) {
  const no = rows.filter(r => r.m.outcome === 'NO_OFFER');
  const num = rows.filter(r => r.m.outcome === 'NUMERIC_QUOTE');
  const f = (who: 'existing' | 'proposed') => ({
    observedNoOffer: no.length,
    predictedNoOffer: no.filter(r => r[who].kind === 'NO_OFFER').length,
    unsupported: no.filter(r => r[who].kind === 'UNSUPPORTED').length,
    quotedAPriceWhereCashifyDeclined: no.filter(r => r[who].kind === 'PRICE').length,
    declinedWhereCashifyQuoted: num.filter(r => r[who].kind === 'NO_OFFER').length,
  });
  return { existing: f('existing'), proposed: f('proposed') };
}

// Merge into an existing summary so protocols can be re-run one at a time.
const summaryFile = path.join(OUT, 'summary.json');
const previous = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : { protocols: {} };
const summary: any = { generatedAt: 'deterministic (no clock)', excludedUnknownInput: excludedUnknown, protocols: { ...previous.protocols } };
for (const [protocol, rows] of Object.entries(rowsByProtocol)) {
  // proposed with fallback to the existing engine where the new one declines to price
  const combined = rows.map(r => ({ ...r, proposed: r.proposed.kind === 'UNSUPPORTED' ? r.existing : r.proposed }));
  summary.protocols[protocol] = {
    rows: rows.length,
    overall: { existing: summarize(rows, 'existing'), proposed: summarize(rows, 'proposed'), proposedWithExistingFallback: summarize(combined, 'proposed') },
    noOffer: noOfferTable(rows),
    byModel: groupBy(rows, r => r.m.model_key),
    byStorage: groupBy(rows, r => `${r.m.model_key} ${r.m.storage}`),
    byDefectGroup: groupBy(rows, r => defectGroup(r.m)),
    byCombinationSize: groupBy(rows, r => sizeBucket(r.m)),
    byConfidence: groupBy(rows.filter(r => r.outcome && r.outcome.kind === 'PRICE'), r => (r.outcome as any).confidence),
  };
  fs.writeFileSync(path.join(OUT, `rows_${protocol}.jsonl`), rows.map(r => JSON.stringify({
    protocol: r.protocol, fold: r.fold, id: r.m.measurement_id, source: `${r.m.archive}::${r.m.member}::${r.m.case_id}`,
    model: r.m.model_key, storage: r.m.storage, date: r.m.observed_date, deviations: r.m.deviations, reference: r.m.variant_get_upto,
    observedOutcome: r.m.outcome, observedBase: r.m.base, observedSelling: r.m.selling, observedPayout: r.m.payout,
    existing: r.existing, proposed: r.proposed, confidence: r.outcome && r.outcome.kind === 'PRICE' ? r.outcome.confidence : null,
    breakdown: r.outcome && r.outcome.kind !== 'UNSUPPORTED' ? r.outcome.breakdown.map(b => [b.rule, Math.round(b.amount), b.support, b.codes ?? []]) : null,
  })).join('\n') + '\n');
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');

for (const [protocol, s] of Object.entries<any>(summary.protocols)) {
  const o = s.overall;
  const line = (n: string, x: any) => `  ${n.padEnd(34)} n=${String(x.predicted).padStart(4)}/${String(x.n).padEnd(4)} MAE=₹${String(x.mae).padStart(6)} med=₹${String(x.median).padStart(5)} p90=₹${String(x.p90).padStart(6)} p95=₹${String(x.p95).padStart(6)} max=₹${String(x.max).padStart(6)} bias=${String(x.bias).padStart(6)} ≤₹500=${x.within500}% ≤2%=${x.within2pct}%`;
  console.log(`\n== ${protocol} (${s.rows} rows) ==`);
  console.log(line('existing engine', o.existing)); console.log(line('evidence engine (supported only)', o.proposed)); console.log(line('evidence + legacy fallback', o.proposedWithExistingFallback));
  console.log('  no-offer:', JSON.stringify(s.noOffer));
}
log('done');
