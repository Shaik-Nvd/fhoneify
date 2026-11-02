import template from './template.json';
import type { DiagnosticsType } from '../../pricingCalculator';

/**
 * Evidence-calibrated model of Cashify's iPhone condition quote.
 *
 * It reproduces the structure observed in the collected Cashify quotations (see
 * docs/PRICING_EVIDENCE_REPORT.md): the age/out-of-warranty effect is applied once,
 * condition groups combine by "largest wins" or "add up", values are either fixed rupees or
 * a fraction of the reference price, and a model-specific floor applies. All numbers live in
 * calibration.json (per model) and template.json (shared relative weights); this file holds
 * only the logic, and every rupee it returns is explained in `breakdown`.
 *
 * Pure and deterministic: no I/O, no randomness, no clock.
 */

export type ClassKey = 'display' | 'cracked' | 'touch' | 'orig' | 'body' | 'panel' | 'cam' | 'fminA' | 'fminB' | 'prox' | 'wifi' | 'face' | 'batt' | 'finger';
export type ValueKind = 'fixed' | 'pct';
/** How a calibrated number is known. 'measured' = fitted from this model's own quotes; 'inferred' = borrowed
 * from sibling models / the shared template and not confirmed by this model's own data. */
export type Support = 'measured' | 'inferred';

export interface ClassCal {
  kind: ValueKind;
  /** Rupees (fixed) or a fraction of the reference price (pct) for the class anchor (weight 1). */
  value: number;
  support: Support;
  /** Number of independent quote shapes that constrain this value. */
  n: number;
  /** True when fixed-vs-fraction was decided by this model's own quotes at two or more capacities (otherwise borrowed from other models). */
  decided?: boolean;
  /** Where an inferred value comes from (the model's own codes of the class, or the nearest models by reference). */
  basis?: string;
}

export interface AgeCal {
  /** deduction = a + b * reference */
  a: number;
  b: number;
  support: Support;
  n: number;
}

export interface ModelProfile {
  modelKey: string;
  family: string;
  /** Storage capacities (GB) with quotes in the evidence. Values are relative to each variant's own reference,
   * but accuracy is only validated on these variants. */
  storagesGb: number[];
  asks: { warranty: boolean; bill: boolean; age: boolean; eSim: boolean; /** the live form offers a charger answer (iPhone X-XS Max, 11 Pro, 7 Plus) */ charger?: boolean };
  /** Age deductions for 3-6, 6-11 and over-11 months. Null when the model's Cashify flow has no age effect. */
  age: { '1': AgeCal; '2': AgeCal; '3': AgeCal } | null;
  /** Measured age deductions as a fraction of that variant's reference, keyed by storage GB. Preferred over the
   * model-level law above for the variants it lists (some models' age effect is not linear in the reference). */
  ageByStorage?: Record<string, { '1': number | null; '2': number | null; '3': number | null }>;
  boxNo: { base: number; aged: number; support: Support };
  /** Missing-charger deduction on the models whose form asks for it (rupees; aged = once treated as over 11 months). */
  chargerNo?: { base: number; aged: number; support: Support; fixedByControlledPairs?: boolean };
  eSimDualPct: number | null;
  /** Lowest quote once the over-11-months state is forced, as a fraction of either the reference price or the aged
   * price (reference minus the over-11-months deduction), whichever explains the model's plateau; null when no
   * plateau was observed. It never applies in the younger states (the 'all faults' quotes are not floored). */
  floor: { basis: 'reference' | 'aged'; value: number } | null;
  classes: Partial<Record<ClassKey, ClassCal>>;
  /** Per-code deductions measured on this model's own quotes (fixed rupees or a fraction of the reference). A code listed here is priced by
   * its own value; the class anchor x template weight is only the fallback for codes without one. Several models' controlled labels disagree
   * with the shared template ratios (camera front/back, battery, Wi-Fi), so the template is a prior, not the rule. */
  codes?: Record<string, ClassCal>;
  /** Capacity-specific fractions for functional codes whose controlled quotes
   * cannot be explained by one model-wide fraction. Values still multiply the
   * current reference; unseen capacities use the shared code calibration. */
  functionalByStorage?: Record<string, Record<string, ClassCal>>;
  /** Condition codes that make Cashify price the phone as over 11 months old (it skips its age question). Absent = the template list; some models
   * (iPhone 14: a cracked panel) price those codes without the age effect. */
  ageTriggers?: string[];
  /** Fixed rupees by which Cashify's flawless quote sits BELOW the database reference (Get Upto). Zero/absent for most models; INR 400 on the
   * iPhone 11 / 11 Pro Max and INR 150 on the iPhone 7 / 8 / 8 Plus. Learned from the supplied flawless quotes against the verified references. */
  cleanOffset?: { value: number; support: Support; n: number };
  scrap: number;
  /** Functional-fault count at or above which the combination is outside the evidence. */
  extremeFaultCount: number;
  evidence: { shapes: number; measurements: number; dates: string[]; /** median reference of the model's quotes (scales borrowed fixed costs) */ medianReference?: number };
  /** Combinations of condition groups (see interactionSignature) that appear together in this model's own quotes. A quote that
   * combines groups never seen together on this model is still priced by the group rules, but labelled 'inferred'. */
  observedInteractions?: string[];
  notes: string[];
}

export interface Calibration {
  version: string;
  generatedFrom: string;
  models: Record<string, ModelProfile>;
}

export interface BreakdownLine {
  rule: string;
  label: string;
  /** Rupees deducted from the quote (never negative in practice). */
  amount: number;
  support: Support | 'rule';
  codes?: string[];
}

export type EvidenceOutcome =
  | { kind: 'PRICE'; price: number; reference: number; breakdown: BreakdownLine[]; confidence: Support; floorApplied: boolean; state: number; notes: string[] }
  | { kind: 'NO_OFFER'; reason: string; reference: number; breakdown: BreakdownLine[] }
  | { kind: 'UNSUPPORTED'; reason: string };

// ---------------------------------------------------------------------------
// Answers -> Cashify condition codes
// ---------------------------------------------------------------------------
const HARDWARE_CODE: Record<string, string> = {
  front_camera: 'F01', back_camera: 'F02', volume: 'F03', fingerprint: 'F04', wifi: 'F05', speaker: 'F06', silent: 'F07',
  face: 'F08', face_sensor: 'F08', power: 'F09', charging: 'F10', audio_receiver: 'F11', camera_glass: 'F12', microphone: 'F13',
  bluetooth: 'F14', vibrator: 'F15', proximity: 'F16', battery_service: 'F17', battery_health: 'F18',
};
const SCREEN_CONDITION: Record<string, string> = {
  'screen cracked/ glass broken': 'S01', 'chipped/cracked outside display area': 'S02', 'more than 2 scratches on screen': 'S03', '1-2 scratches on screen': 'S04',
};
const SCREEN_SPOTS: Record<string, string> = {
  'large/ heavy visible spots on screen': 'D01', '3 or more minor spots on screen': 'D02', '1-2 minor spots on screen': 'D03',
};
const SCREEN_LINES: Record<string, string> = { 'visible line(s) on display': 'D04', 'display faded along edges': 'D05' };
const SCREEN_DISCOLORATION: Record<string, string> = { 'major discoloration': 'D06', 'minor discoloration': 'D07' };
const BODY_SCRATCHES: Record<string, string> = { 'more than 2 scratches': 'C01', '1-2 scratches': 'C02' };
const BODY_DENTS: Record<string, string> = { 'major dent(s) or more than 2': 'C03', '1-2 minor dents': 'C04' };
const BODY_PANEL: Record<string, string> = { 'cracked/ broken side or back panel': 'P01', 'missing side or back panel': 'P02' };
const BODY_BENT: Record<string, string> = { 'bent/ curved panel': 'P03', 'loose screen (gap in screen and body)': 'P04' };
const NO_FAULT = new Set(['no scratches on screen', 'no spots on screen', 'no line(s) on display', 'no discoloration', 'no scratches', 'no dents', 'no defect on side or back panel', 'phone not bent']);

const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export interface ParsedAnswers {
  codes: string[];
  callsFailed: boolean;
  boxMissing: boolean;
  /** No charger selected. Priced only where the model's form asks for one (profile.asks.charger). */
  chargerMissing: boolean;
  dualEsim: boolean;
  warranty: boolean | null;
  validBill: boolean | null;
  mobileAge: string | null;
  unsupported: string[];
}

export function parseAnswers(d: DiagnosticsType): ParsedAnswers {
  const codes = new Set<string>();
  const unsupported: string[] = [];
  const pick = (value: string | null, table: Record<string, string>, field: string) => {
    const key = norm(value);
    if (!key || NO_FAULT.has(key)) return;
    const code = table[key];
    if (code) codes.add(code); else unsupported.push(`${field}: "${value}"`);
  };
  pick(d.screenCondition, SCREEN_CONDITION, 'screenCondition');
  pick(d.screenSpots, SCREEN_SPOTS, 'screenSpots');
  pick(d.screenLines, SCREEN_LINES, 'screenLines');
  pick(d.screenDiscoloration, SCREEN_DISCOLORATION, 'screenDiscoloration');
  pick(d.bodyScratches, BODY_SCRATCHES, 'bodyScratches');
  pick(d.bodyDents, BODY_DENTS, 'bodyDents');
  pick(d.bodyPanel, BODY_PANEL, 'bodyPanel');
  pick(d.bodyBent, BODY_BENT, 'bodyBent');
  for (const h of d.hardware ?? []) {
    const code = HARDWARE_CODE[h];
    if (code) codes.add(code); else unsupported.push(`hardware: "${h}"`);
  }
  if (d.touch === false) codes.add('Q02');
  if (d.originalScreen === false) codes.add('Q03');
  const hasBox = d.box === true || (d.accessories ?? []).includes('box');
  // Same reading as the legacy engine: a 'bill' accessory also means a valid GST bill.
  const validBill = d.validBill ?? ((d.accessories ?? []).includes('bill') ? true : null);
  return {
    codes: [...codes].sort(),
    callsFailed: d.calls === false,
    // Same as the legacy engine: every iPhone flow asks about the box, so an unselected box is a missing box.
    boxMissing: !hasBox,
    chargerMissing: !(d.charger === true || (d.accessories ?? []).includes('charger')),
    dualEsim: norm(d.eSim) === 'dual esim',
    warranty: d.warranty ?? null,
    validBill,
    mobileAge: d.mobileAge ?? null,
    unsupported,
  };
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------
type TemplateClass = { label: string; anchor: string; combine: 'max' | 'sum'; group: string; weights: Record<string, number> };
const TEMPLATE = template as unknown as { classes: Record<ClassKey, TemplateClass>; ageTriggerCodes: string[]; scrapQuote: number };
export const CLASS_ORDER = Object.keys(TEMPLATE.classes) as ClassKey[];
export const AGE_TRIGGER_CODES = new Set(TEMPLATE.ageTriggerCodes);
export const triggersOf = (profile: ModelProfile): Set<string> => (profile.ageTriggers ? new Set(profile.ageTriggers) : AGE_TRIGGER_CODES);
export const SCRAP_QUOTE = TEMPLATE.scrapQuote;
export const classWeights = (cls: ClassKey) => TEMPLATE.classes[cls].weights;
export const classOf = (code: string): ClassKey | null => CLASS_ORDER.find(c => code in TEMPLATE.classes[c].weights) ?? null;
export const classInfo = (cls: ClassKey) => TEMPLATE.classes[cls];

/** Age answer -> state (0 under 3 months, 1 = 3-6, 2 = 6-11, 3 = over 11). Accepts the form ids ('3to6') and the labels
 * ('3 months - 6 months') the legacy engine also reads. Anything unreadable counts as the youngest state, like the legacy engine. */
export function ageStateFromAnswer(answer: string | null | undefined): number {
  const t = String(answer ?? '').toLowerCase().replace(/\s+/g, '');
  if (!t) return 0;
  if (t.includes('above') || t.includes('over') || t === 'above11') return 3;
  if (t.includes('6to11') || (t.includes('6') && t.includes('11'))) return 2;
  if (t.includes('3to6') || (t.includes('3') && t.includes('6'))) return 1;
  return 0;
}
export const roundTo10 = (n: number) => Math.round(n / 10) * 10;

/** Fraction of a class's standalone body deduction that remains when an age-trigger answer (e.g. a cracked screen)
 * has already forced the over-11-months state. Measured on the 18 Pro Max 2 TB pairs (C01/C04 7,350 of 19,800;
 * C03 12,690 of 26,400; C02 0 of 10,720); applied to other models as an inference. */
export const BODY_UNDER_TRIGGER_REMAINING: Record<string, number> = { C01: 0.37121, C02: 0, C03: 0.48068, C04: 0.37121 };

export function ageStateOf(a: ParsedAnswers, profile: ModelProfile): { state: number; forcedBy: string[] } {
  if (!profile.asks.warranty) return { state: 0, forcedBy: [] };
  const forcedBy: string[] = [];
  if (a.warranty === false) forcedBy.push('warranty=No');
  if (a.validBill === false && profile.asks.bill) forcedBy.push('bill=No');
  const triggers = triggersOf(profile);
  for (const c of a.codes) if (triggers.has(c)) forcedBy.push(c);
  if (forcedBy.length) return { state: 3, forcedBy };
  return { state: ageStateFromAnswer(a.mobileAge), forcedBy };
}

/**
 * When Cashify's minimum quote binds. Models with an age question: any functional fault once the phone is treated as over 11 months old.
 * Models without one (iPhone 6 to 14 generations): two or more functional faults at any age; a single fault can quote below the minimum
 * (iPhone 6 16 GB: back camera alone INR 280, front + back camera INR 350 = 22.9% of the reference).
 */
export const floorMinFaults = (profile: ModelProfile): number => (profile.age ? 1 : 2);

export function classValue(cal: ClassCal, reference: number): number {
  return cal.kind === 'fixed' ? cal.value : cal.value * reference;
}

/** The groups an answer set touches, e.g. 'AGED+BODY+SCREEN+WIFI'. Which groups co-occur is what the quotes can vouch for. */
const GROUP_TOKEN: Record<string, string> = { display: 'SCREEN', cracked: 'SCREEN', touch: 'SCREEN', orig: 'SCREEN', body: 'BODY', panel: 'BODY', cam: 'CAM', fminA: 'FMIN', fminB: 'FMIN', prox: 'FMIN', wifi: 'WIFI', face: 'FACE', batt: 'BATT', finger: 'FMIN' };
export function interactionSignature(codes: string[], aged: boolean, extras: { box?: boolean; esim?: boolean } = {}): string {
  const tokens = new Set<string>();
  for (const c of codes) { const cls = classOf(c); if (cls) tokens.add(GROUP_TOKEN[cls]); }
  if (aged) tokens.add('AGED');
  if (extras.box) tokens.add('BOX');
  if (extras.esim) tokens.add('ESIM');
  return [...tokens].sort().join('+');
}

export interface Deduction {
  deduction: number;
  breakdown: BreakdownLine[];
  confidence: Support;
  state: number;
  notes: string[];
  /** Number of condition codes (functional + physical) in the answers. */
  codeCount: number;
  /** Number of functional-fault codes (F01-F18) among them: the floor only ever binds when there is at least one. */
  faultCount: number;
  /** Reference minus the over-11-months deduction (what the floor is a fraction of), when the model has an age law. */
  agedPrice: number | null;
}

type DeductResult =
  | Deduction
  | { kind: 'UNSUPPORTED'; reason: string }
  | { kind: 'NO_OFFER'; reason: string; breakdown: BreakdownLine[] }
  | { kind: 'SCRAP'; breakdown: BreakdownLine[] };

/** Everything before the floor and rounding: the rupee deduction from the reference price and why. */
export function deduct(profile: ModelProfile, reference: number, a: ParsedAnswers, storageGb?: number): DeductResult {
  const breakdown: BreakdownLine[] = [];
  const notes: string[] = [];
  let confidence: Support = 'measured';
  const weaken = (s: Support | 'rule') => { if (s === 'inferred') confidence = 'inferred'; };

  const faultCodes = a.codes.filter(c => c.startsWith('F'));
  if (faultCodes.length >= profile.extremeFaultCount) {
    // Cashify's quotes for the 17-fault phone ranged from INR 950 to a quarter of the price depending on the model: no rule can be
    // read from that, so it goes to inspection rather than to a guess.
    return { kind: 'NO_OFFER', reason: `${faultCodes.length} simultaneous functional faults is outside the evidence (>= ${profile.extremeFaultCount})`, breakdown };
  }
  if (a.callsFailed) {
    if (a.codes.length > 0) {
      return { kind: 'NO_OFFER', reason: 'cannot make or receive calls combined with other faults: Cashify declined every such combination measured', breakdown };
    }
    breakdown.push({ rule: 'scrap', label: 'Cannot make or receive calls: scrap quote', amount: 0, support: 'rule', codes: ['Q01'] });
    return { kind: 'SCRAP', breakdown };
  }

  const { state, forcedBy } = ageStateOf(a, profile);
  // groups that never appear together in this model's own quotes: priced by the group rules but not vouched for
  if (profile.observedInteractions && a.codes.length > 0) {
    const sig = interactionSignature(a.codes, state === 3, { box: a.boxMissing, esim: a.dualEsim && profile.asks.eSim });
    const lenient = interactionSignature(a.codes, state === 3);
    if (!profile.observedInteractions.includes(sig) && !profile.observedInteractions.includes(lenient)) {
      weaken('inferred');
      notes.push(`group combination ${sig} was never measured together on ${profile.modelKey}`);
    }
  }
  let deduction = 0;
  let agedPrice: number | null = null;
  if (profile.age) {
    const m3 = storageGb != null ? profile.ageByStorage?.[String(storageGb)]?.['3'] : null;
    agedPrice = reference - (profile.cleanOffset?.value ?? 0) - (m3 != null ? m3 * reference : profile.age['3'].a + profile.age['3'].b * reference);
  }

  // 0. clean offset: Cashify's flawless quote for this model sits a fixed amount below the reference it advertises
  if (profile.cleanOffset && profile.cleanOffset.value > 0) {
    deduction += profile.cleanOffset.value;
    breakdown.push({ rule: 'baseline', label: 'Flawless quote sits below the advertised reference', amount: profile.cleanOffset.value, support: profile.cleanOffset.support });
    weaken(profile.cleanOffset.support);
  }

  // 1. age / out-of-warranty (applied once)
  if (state > 0 && profile.age) {
    const key = String(state) as '1' | '2' | '3';
    const cal = profile.age[key];
    const measuredPct = storageGb != null ? profile.ageByStorage?.[String(storageGb)]?.[key] : null;
    const amount = measuredPct != null ? measuredPct * reference : cal.a + cal.b * reference;
    deduction += amount;
    weaken(measuredPct != null ? 'measured' : cal.support);
    breakdown.push({
      rule: 'age',
      label: state === 3 && forcedBy.length ? `Treated as over 11 months (${forcedBy.join(', ')})` : ['', 'Aged 3-6 months', 'Aged 6-11 months', 'Over 11 months / out of warranty'][state],
      amount, support: measuredPct != null ? 'measured' : cal.support, codes: forcedBy,
    });
  }

  // 2. condition classes (largest wins / add up within a group)
  const triggers = triggersOf(profile);
  const triggered = forcedBy.some(f => triggers.has(f));
  const classAmounts: { cls: ClassKey; code: string; amount: number; support: Support }[] = [];
  for (const cls of CLASS_ORDER) {
    const info = TEMPLATE.classes[cls];
    const present = a.codes.filter(c => c in info.weights);
    if (!present.length) continue;
    const cal = profile.classes[cls];
    for (const code of present) {
      // P04 (loose screen) is priced like a cracked panel once an age-trigger answer has forced the aged state (measured exception, template.json)
      const own = (storageGb != null ? profile.functionalByStorage?.[String(storageGb)]?.[code] : undefined) ?? profile.codes?.[code === 'P04' && triggered ? 'P01' : code];
      if (!own && !cal) return { kind: 'UNSUPPORTED', reason: `no calibration for ${cls} (${present.join(',')}) on ${profile.modelKey}` };
      let amount = own ? classValue(own, reference) : info.weights[code === 'P04' && triggered ? 'P01' : code] * classValue(cal!, reference);
      if (cls === 'body' && triggered) amount *= BODY_UNDER_TRIGGER_REMAINING[code] ?? 1;
      const support: Support = own ? own.support : cal!.support;
      weaken(support);
      classAmounts.push({ cls, code, amount, support: cls === 'body' && triggered ? 'inferred' : support });
    }
    if (cls === 'body' && triggered) weaken('inferred');
  }
  // body and panel share one deduction (largest); every other class combines by its own rule
  const groups = new Map<string, { combine: 'max' | 'sum'; items: typeof classAmounts }>();
  for (const item of classAmounts) {
    const info = TEMPLATE.classes[item.cls];
    const g = groups.get(info.group) ?? groups.set(info.group, { combine: info.combine, items: [] }).get(info.group)!;
    g.items.push(item);
  }
  for (const [group, g] of groups) {
    const winner = g.combine === 'max' ? g.items.reduce((m, i) => (i.amount > m.amount ? i : m)) : null;
    const amount = winner ? winner.amount : g.items.reduce((s, i) => s + i.amount, 0);
    const cals = g.items.map(i => i.support);
    deduction += amount;
    breakdown.push({
      rule: `class:${group}`,
      label: `${TEMPLATE.classes[g.items[0].cls].label}${winner ? ` - ${winner.code} applies` : ''}`,
      amount, support: cals.includes('inferred') ? 'inferred' : 'measured', codes: g.items.map(i => i.code),
    });
  }

  // 3. accessories and eSIM
  if (a.boxMissing) {
    const amount = state === 3 ? profile.boxNo.aged : profile.boxNo.base;
    deduction += amount; weaken(profile.boxNo.support);
    breakdown.push({ rule: 'box', label: 'Original box missing', amount, support: profile.boxNo.support });
  }
  if (a.chargerMissing && profile.asks.charger && profile.chargerNo) {
    const amount = state === 3 ? profile.chargerNo.aged : profile.chargerNo.base;
    deduction += amount; weaken(profile.chargerNo.support);
    breakdown.push({ rule: 'charger', label: 'Charger missing', amount, support: profile.chargerNo.support });
  }
  if (a.dualEsim && profile.asks.eSim && profile.eSimDualPct != null) {
    const amount = profile.eSimDualPct * reference;
    deduction += amount;
    breakdown.push({ rule: 'esim', label: 'Dual eSIM', amount, support: 'measured' });
  }
  return { deduction, breakdown, confidence, state, notes, codeCount: a.codes.length, faultCount: faultCodes.length, agedPrice };
}

export function evaluateAppleEvidence(profile: ModelProfile, reference: number, diagnostics: DiagnosticsType, storageGb?: number): EvidenceOutcome {
  if (!(reference > 0)) return { kind: 'UNSUPPORTED', reason: 'invalid reference price' };
  const a = parseAnswers(diagnostics);
  if (a.unsupported.length) return { kind: 'UNSUPPORTED', reason: `unrecognised answers: ${a.unsupported.join('; ')}` };
  const weaker: Record<string, string[]> = {
    S01: ['S02', 'S03', 'S04'], S03: ['S04'], D01: ['D02', 'D03'], D02: ['D03'],
    D04: ['D05'], D06: ['D07'], C01: ['C02'], C03: ['C04'], P02: ['P01'], P03: ['P04'],
  };
  const result = evaluateParsed(profile, reference, a, storageGb);
  if (result.kind !== 'PRICE' || a.callsFailed) return result;
  const physical = a.codes.filter(c => !c.startsWith('F'));
  if (!physical.length) return result;
  const triggers = triggersOf(profile);
  const choices = physical.map(code => [null, code, ...(weaker[code] ?? [])]);
  const charge = (code: string | null, triggered: boolean) => {
    if (!code) return 0;
    const cls = classOf(code);
    if (!cls) return 0;
    const info = TEMPLATE.classes[cls];
    const key = code === 'P04' && triggered ? 'P01' : code;
    const own = profile.codes?.[key], cal = profile.classes[cls];
    let amount = own ? classValue(own, reference) : cal ? info.weights[key] * classValue(cal, reference) : 0;
    if (cls === 'body' && triggered) amount *= BODY_UNDER_TRIGGER_REMAINING[code] ?? 1;
    return amount;
  };
  // Physical repair groups use maxima. Only the presence of an age-trigger
  // couples them. Enumerate that trigger witness, then maximize each field's
  // charge within its weaker choices, avoiding a Cartesian subset traversal.
  const scenarios: ({ field: number; code: string } | null)[] = [null];
  choices.forEach((options, field) => options.forEach(code => { if (code && triggers.has(code)) scenarios.push({ field, code }); }));
  let ceiling = result.price;
  for (const witness of scenarios) {
    const codes = a.codes.filter(c => c.startsWith('F'));
    choices.forEach((options, field) => {
      const eligible = witness?.field === field ? [witness.code] : options.filter(code => witness || !code || !triggers.has(code));
      const best = eligible.reduce<string | null>((winner, code) => charge(code, Boolean(witness)) > charge(winner, Boolean(witness)) ? code : winner, null);
      // A zero-valued witness still determines age and must not disappear.
      const selected = witness?.field === field ? witness.code : best;
      if (selected) codes.push(selected);
    });
    const lesser = evaluateParsed(profile, reference, { ...a, codes: [...new Set(codes)].sort() }, storageGb);
    if (lesser.kind === 'PRICE') ceiling = Math.min(ceiling, lesser.price);
  }
  return ceiling < result.price ? { ...result, price: ceiling, confidence: 'inferred', floorApplied: false,
    breakdown: [...result.breakdown, { rule: 'repair-dominance', label: 'Preserve the deduction for an existing or less severe repair', amount: result.price - ceiling, support: 'rule' }],
    notes: [...result.notes, 'Inferred repair values constrained so added or more severe physical damage cannot raise the quote'] } : result;

}

function evaluateParsed(profile: ModelProfile, reference: number, a: ParsedAnswers, storageGb?: number): EvidenceOutcome {
  const d = deduct(profile, reference, a, storageGb);
  if ('kind' in d) {
    if (d.kind === 'UNSUPPORTED') return d;
    if (d.kind === 'NO_OFFER') return { kind: 'NO_OFFER', reason: d.reason, reference, breakdown: d.breakdown };
    return {
      kind: 'PRICE', price: profile.scrap, reference, breakdown: d.breakdown, confidence: 'inferred', floorApplied: false, state: 0,
      notes: ['scrap quote measured on the iPhone 18 Pro Max; assumed for this model'],
    };
  }
  const breakdown = d.breakdown;
  let price = reference - d.deduction;
  let floorApplied = false;
  const floorBase = profile.floor ? (profile.floor.basis === 'aged' ? d.agedPrice : reference) : null;
  if (profile.floor && floorBase != null && (d.state === 3 || !profile.age) && d.faultCount >= floorMinFaults(profile) && price < profile.floor.value * floorBase) {
    const floor = profile.floor.value * floorBase;
    breakdown.push({ rule: 'floor', label: `${profile.age ? 'Lowest quote once treated as over 11 months' : 'Lowest quote for a phone with functional faults'} (${(profile.floor.value * 100).toFixed(2)}% of the ${profile.floor.basis === 'aged' ? 'aged price' : 'reference'})`, amount: price - floor, support: 'measured' });
    price = floor; floorApplied = true;
  }
  if (price <= 0) return { kind: 'NO_OFFER', reason: 'combined deductions exceed the reference price', reference, breakdown };
  return { kind: 'PRICE', price: roundTo10(price), reference, breakdown, confidence: d.confidence, floorApplied, state: d.state, notes: d.notes };
}

export function describeBreakdown(o: EvidenceOutcome): string[] {
  if (o.kind === 'UNSUPPORTED') return [`unsupported: ${o.reason}`];
  const lines = [`reference ${o.reference}`];
  for (const b of o.breakdown) lines.push(`-${Math.abs(Math.round(b.amount))}  ${b.label} [${b.support}]${b.codes?.length ? ` (${b.codes.join(',')})` : ''}`);
  lines.push(o.kind === 'PRICE' ? `= ${o.price}` : `= no offer (${o.reason})`);
  return lines;
}
