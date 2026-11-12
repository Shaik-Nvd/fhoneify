import type { DiagnosticsType } from '../../pricingCalculator';
import { InspectionRequiredError } from '../inspectionRequired';

export interface DeductionRule {
  form: 'fixed' | 'pct' | 'affine' | 'capped' | 'byStorage';
  value: number;
  slope?: number;
  values?: Record<string, number>;
  references?: Record<string, number>;
  fallback?: { form: 'fixed' | 'pct'; value: number };
  support: number;
  residual: number;
  inferredFrom?: string;
}
export interface RunnerProfile {
  brand: 'Nothing' | 'OnePlus';
  model: string;
  hasAge: boolean;
  variants: Record<string, { accessories: string[]; scrap: number; scrapInferredFrom?: string }>;
  rules: Record<string, DeductionRule>;
}
export interface RunnerCalibration { version: string; sourceHash: string; profiles: Record<string, RunnerProfile> }
export const modelKey = (model: string) => String(model ?? '').toLowerCase().replace(/cmf by nothing/g, 'cmf').replace(/nothing\s+/g, '').replace(/[^a-z0-9]/g, '');
export const storageKey = (storage?: string | null) => String(storage ?? '').toLowerCase().replace(/\s/g, '');
export const round10 = (value: number) => Math.round(value / 10) * 10;
export function runnerAge(value: string | null): string {
  const raw = String(value ?? '').toLowerCase().trim();
  if (/above\s*11|more than\s*11/.test(raw)) return 'above11';
  if (/below\s*3|0\s*-\s*3/.test(raw)) return 'below3';
  if (/3\s*(?:months\s*)?(?:-|to)\s*6/.test(raw)) return '3to6';
  if (/6\s*(?:months\s*)?(?:-|to)\s*11/.test(raw)) return '6to11';
  return raw || 'below3';
}

export function evaluateDeduction(rule: DeductionRule, reference: number, storage: string): number {
  const form = rule.form === 'byStorage' ? rule.fallback!.form : rule.form;
  const value = rule.form === 'byStorage' ? rule.fallback!.value : rule.value;
  if (rule.form === 'byStorage' && rule.values?.[storage] !== undefined) {
    // A measured repair amount is allowed; a historic final-price lookup is not.
    // Percentage-backed measurements are anchored at their observation reference,
    // not frozen rupee amounts. The caller's current reference still drives price.
    if (form === 'pct') {
      const measuredReference = rule.references?.[storage];
      if (!measuredReference || !Number.isFinite(measuredReference) || measuredReference <= 0) {
        throw new InspectionRequiredError('Missing runner deduction measurement reference');
      }
      return rule.values[storage] * reference / measuredReference;
    }
    return rule.values[storage];
  }
  return Math.max(0, form === 'fixed' ? value : form === 'pct' ? value * reference :
    form === 'affine' ? value + rule.slope! * reference : Math.min(value, rule.slope! * reference));
}

const hardwareAliases: Record<string, string> = { battery: 'battery_service', battery_health: 'battery_service', charging_port: 'charging',
  'Front Camera not working': 'front_camera', 'Back Camera not working': 'back_camera', 'Battery Faulty': 'battery_service' };
const normalize = (value: string | null) => String(value ?? '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/');
const select = (value: string | null, choices: string[]) => choices.map(normalize).indexOf(normalize(value));
export const SCREENS = ['Screen cracked/ glass broken', 'Chipped/cracked outside display area', 'More than 2 scratches on screen', '1-2 scratches on screen'];
export const SPOTS = ['Large/ heavy visible spots on screen', '3 or more minor spots on screen', '1-2 minor spots on screen'];
export const LINES = ['Visible line(s) on display', 'Display faded along edges'];
export const COLORS = ['Major Discoloration', 'Minor Discoloration'];
export const SCRATCHES = ['More than 2 scratches', '1-2 scratches'];
export const DENTS = ['Major dent(s) or more than 2', '1-2 minor dents'];

/** Keys describe repairs/branch changes, not recorded answer fingerprints. */
export function runnerFaults(d: DiagnosticsType): string[] {
  const faults: string[] = [];
  if (d.calls === false) faults.push('calls');
  if (d.touch === false) faults.push('touch');
  if (d.originalScreen === false) faults.push('original');
  for (const [field, values, prefix] of [
    [d.screenCondition, SCREENS, 'screen'], [d.screenSpots, SPOTS, 'spots'], [d.screenLines, LINES, 'lines'],
    [d.screenDiscoloration, COLORS, 'color'], [d.bodyScratches, SCRATCHES, 'scratch'], [d.bodyDents, DENTS, 'dent'],
  ] as const) { const index = select(field, [...values]); if (index >= 0) faults.push(`${prefix}:${index}`); }
  if (select(d.bodyPanel, ['Cracked/ broken side or back panel', 'Missing side or back panel']) >= 0) faults.push('panel');
  if (normalize(d.bodyBent) === normalize('Bent/ curved panel')) faults.push('bent');
  if (normalize(d.bodyBent) === normalize('Loose screen (Gap in screen and body)')) faults.push('loose');
  const aliases = Object.fromEntries(Object.entries(hardwareAliases).map(([key, value]) => [normalize(key), value]));
  for (const code of new Set(d.hardware.map(v => aliases[normalize(v)] ?? normalize(v)))) faults.push(`hardware:${code}`);
  return faults;
}

export function evaluateRunner(profile: RunnerProfile, reference: number, d: DiagnosticsType, storage?: string | null) {
  if (!Number.isFinite(reference) || reference <= 0) throw new Error('Invalid runner reference');
  const sk = storageKey(storage);
  const variant = profile.variants[sk];
  const faults = runnerFaults(d);
  // Unknown and incomplete answers must never silently become a flawless quote.
  for (const [value, choices] of [
    [d.screenCondition, SCREENS], [d.screenSpots, [...SPOTS, 'No spots on screen']],
    [d.screenLines, [...LINES, 'No line(s) on Display']], [d.screenDiscoloration, [...COLORS, 'No Discoloration']],
    [d.bodyScratches, [...SCRATCHES, 'No scratches']], [d.bodyDents, [...DENTS, 'No dents']],
    [d.bodyPanel, ['Cracked/ broken side or back panel', 'Missing side or back panel', 'No defect on side or back panel']],
    [d.bodyBent, ['Bent/ curved panel', 'Loose screen (Gap in screen and body)', 'Phone not bent']],
  ] as const) if (value != null && select(value, [...choices]) < 0) throw new InspectionRequiredError('Unsupported runner condition answer');
  const groups: Record<string, boolean> = {
    screen_scratch: !!d.screenCondition, broken_screen: !!d.screenCondition,
    screen_spot: !!(d.screenSpots && d.screenLines && d.screenDiscoloration),
    body_scratch: !!(d.bodyScratches && d.bodyDents), panel_missing: !!(d.bodyPanel && d.bodyBent),
    screen_lines: !!d.screenLines, screen_discoloration: !!d.screenDiscoloration,
  };
  for (const group of d.defects) if (groups[normalize(group)] !== true) throw new InspectionRequiredError('Unsupported or incomplete runner defect group');
  for (const fault of faults) {
    const keys = fault === 'screen:0' ? ['original', 'crackedExtra'] : [fault];
    if (keys.some(key => key !== 'calls' && !profile.rules[key])) throw new InspectionRequiredError('Unsupported runner fault for this model');
  }
  const forcing = faults.some(k => ['original', 'touch', 'screen:0', 'panel', 'bent'].includes(k));
  const forcedAge = profile.hasAge && (forcing || d.warranty === false || d.validBill === false);
  const selectedAge = runnerAge(d.mobileAge);
  if (profile.hasAge && !forcedAge && d.calls !== false && !String(d.mobileAge ?? '').trim()) throw new InspectionRequiredError('Missing runner age answer');
  const age = profile.hasAge ? (forcedAge ? 'above11' : selectedAge) : 'below3';
  const breakdown: { rule: string; amount: number; support: 'measured' | 'inferred' }[] = [];
  let inherited = false;
  const amount = (key: string) => {
    const rule = profile.rules[key];
    if (!rule) throw new InspectionRequiredError('Unsupported runner deduction');
    const value = evaluateDeduction(rule, reference, sk);
    if (!rule.support || rule.inferredFrom || (rule.form === 'byStorage' && rule.values?.[sk] === undefined)) inherited = true;
    breakdown.push({ rule: key, amount: value, support: variant && rule.support > 0 && !rule.inferredFrom ? 'measured' : 'inferred' });
    return value;
  };
  const availableVariants = Object.values(profile.variants);
  const scrap = variant?.scrap ?? Math.min(...availableVariants.map(v => v.scrap));
  // Count all condition changes before the calls-only branch as well.
  const offered = variant?.accessories ?? availableVariants[0].accessories;
  const present = new Set(d.accessories);
  if (d.box === true) present.add('box');
  if (d.charger === true) present.add('charger');
  if (d.box === false) present.delete('box');
  if (d.charger === false) present.delete('charger');
  const missing = offered.filter(a => !present.has(a));
  const changes = faults.length + (profile.hasAge ? Number(d.warranty === false) + Number(d.validBill === false) + Number(selectedAge !== 'below3') : 0) + (missing.length ? 1 : 0);
  if (d.calls === false) return { price: Math.round(scrap), support: changes === 1 && variant && !variant.scrapInferredFrom ? 'measured' as const : 'inferred' as const,
    breakdown: [{ rule: 'calls:flat-scrap-deduction', amount: reference - Math.round(scrap), support: variant && !variant.scrapInferredFrom ? 'measured' as const : 'inferred' as const }], forcedAge: false, faults };
  let loss = age === 'below3' ? 0 : amount(`age:${age}`);
  const screen: number[] = [];
  const panel: number[] = [];
  for (const key of faults) {
    if (key === 'original') screen.push(amount('original'));
    else if (key === 'screen:0') screen.push(amount('original') + amount('crackedExtra'));
    else if (key === 'touch') screen.push(amount('touch'));
    else if (key.startsWith('screen:') || key.startsWith('spots:') || key.startsWith('lines:') || key.startsWith('color:')) screen.push(amount(key));
    else if (['panel', 'bent', 'loose'].includes(key)) panel.push(amount(key));
    else if (key !== 'calls') loss += amount(key);
  }
  const screenMaximum = Math.max(0, ...screen);
  const overlap = screen.reduce((sum, value) => sum + value, 0) - screenMaximum;
  if (overlap) breakdown.push({ rule: 'screen:overlap-credit', amount: -overlap, support: 'inferred' });
  loss += screenMaximum;
  const panelMaximum = Math.max(0, ...panel);
  const panelOverlap = panel.reduce((sum, value) => sum + value, 0) - panelMaximum;
  if (panelOverlap) breakdown.push({ rule: 'panel:overlap-credit', amount: -panelOverlap, support: 'inferred' });
  loss += panelMaximum;
  // The variant's questionnaire decides whether charger loss is applicable.
  if (missing.length > 1) loss += profile.rules.both ? amount('both') : Math.max(...missing.map(amount));
  else if (missing.length) loss += amount(missing[0]);
  const price = Math.max(Math.round(scrap), round10(reference - loss));
  const roundingAndFloor = reference - loss - price;
  if (roundingAndFloor) breakdown.push({ rule: price === scrap ? 'scrap-floor-credit' : 'rounding', amount: roundingAndFloor, support: 'inferred' });
  return { price,
    support: changes <= 1 && variant && !inherited ? 'measured' as const : 'inferred' as const,
    breakdown, forcedAge, faults };
}
