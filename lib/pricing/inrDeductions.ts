/**
 * Fixed-₹ condition model (Cashify-shaped).
 *
 * The percentage model in pricingCalculator.ts removes the same share of the
 * age-adjusted price for a defect on every phone, so a ₹75k flagship loses
 * three times as many rupees as a ₹25k phone for the same broken display.
 * Cashify's quotes do not behave that way: on the 2026-10-01 Xiaomi benchmark
 * the rupee gap between two condition sets is ~₹8,500 for 15 Ultra, 17 and
 * 17 Ultra alike (Get Upto ₹57k-75k) and ₹1.5k-3.5k on Redmis. Deductions
 * follow repair cost, which depends on the phone's parts, not its price.
 *
 * This model keeps the percentage model's combination rules exactly
 * (rawConditionAdjustments) and only changes what the shares multiply: a
 * per-group rupee table instead of the age-adjusted price.
 *
 *   value = R × ageRetention
 *           − touchFailure                                  (supersedes every screen charge)
 *             or max(physical screen, display defect)       (cracked glass supersedes local display)
 *           − overlap(localDisplay, body)                   (larger + 0.327 × smaller)
 *           − Σ functional + box
 *   floored at the dead-phone price and rounded to config.roundTo.
 *
 * Tables, group membership and per-model warranty retention are data
 * (inrDeductionTables.ts). Browser-safe.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import { CASHIFY_CALIBRATION } from './calibration';

export interface InrScreenTable {
  /** Non-original (local/copy) display where Cashify asks warranty. */
  localDisplay: number;
  /** Non-original display where Cashify does not ask warranty (no age cut
   * applies there, so the whole observed cut is condition). */
  localDisplayNotAsked: number;
  cracked: number;
  chipped: number;
  scratchesHeavy: number;
  scratchesLight: number;
  spotsHeavy: number;
  spotsLight: number;
  lines: number;
  fadedEdges: number;
  discolorationMajor: number;
  discolorationMinor: number;
}

export interface InrBodyTable {
  scratchesHeavy: number;
  scratchesLight: number;
  dentsMajor: number;
  dentsMinor: number;
  panelMissing: number;
  panelCracked: number;
  bent: number;
  looseScreen: number;
}

export interface InrGroupTable {
  label: string;
  /** A failed touch screen: supersedes every other screen charge. */
  touchFailure: number;
  screen: InrScreenTable;
  body: InrBodyTable;
  /** Keyed like COMMON_FUNCTIONAL_PENALTIES (charging, back_camera, ...).
   * Unrecognized faults cost nothing, as in the percentage model
   * (lib/pricing/diagnostics.ts). */
  functional: Record<string, number>;
  box: number;
}

export interface InrDeductionConfig {
  /** Recorded in PRICING_ENGINE_VERSION reviews; bump on any value change. */
  version: string;
  /** Off = the brand keeps the percentage model, byte for byte. */
  enabled: boolean;
  groups: Record<string, InrGroupTable>;
  /** Lowercase catalog model name -> group. Checked before tierGroups. */
  modelGroups: Record<string, string>;
  /** Fallback by Cashify Get Upto, ascending; first `maxReference >= R` wins,
   * null = no upper bound. Empty = models without an explicit group keep
   * the percentage model. */
  tierGroups: { maxReference: number | null; group: string }[];
  /** Lowercase catalog model name -> share of Get Upto Cashify pays for a
   * clean phone answered "warranty: No". */
  warrantyRetention: Record<string, number>;
  /** Out-of-warranty retention for fixed-₹ models without their own
   * measurement. null = the brand's age table. */
  defaultWarrantyRetention: number | null;
  roundTo: number;
}

export interface InrConditionBreakdown {
  group: string;
  screen: number;
  localDisplay: number;
  body: number;
  functional: number;
  box: number;
  value: number;
}

const lower = (value: unknown) => String(value ?? '').toLowerCase();

/** The model's repair-cost group, or null when the fixed-₹ model does not
 * cover it (disabled, or no explicit group and no tier fallback). */
export function resolveInrGroup(config: InrDeductionConfig, model: string, reference: number): string | null {
  if (!config.enabled) return null;
  const explicit = config.modelGroups[lower(model).trim()];
  if (explicit) return explicit;
  return config.tierGroups.find((t) => t.maxReference === null || reference <= t.maxReference)?.group ?? null;
}

/** Screen charges other than the local display, plus the local display
 * charge itself (kept apart for the display/body overlap). */
function screenDeductions(d: DiagnosticsType, t: InrGroupTable, warrantyNotAsked: boolean): { screen: number; localDisplay: number } {
  const defects = new Set(d.defects || []);
  const condition = lower(d.screenCondition);
  const spots = lower(d.screenSpots);
  const lines = lower(d.screenLines);
  const discoloration = lower(d.screenDiscoloration);
  const cracked = condition.includes('cracked') || condition.includes('glass broken') || defects.has('broken_screen');

  if (d.touch === false) return { screen: t.touchFailure, localDisplay: 0 };

  let physical = 0;
  if (defects.has('screen_scratch') || defects.has('broken_screen') || condition) {
    if (cracked && !condition.includes('outside display')) physical = t.screen.cracked;
    else if (condition.includes('outside display')) physical = t.screen.chipped;
    else if (condition.includes('more than 2')) physical = t.screen.scratchesHeavy;
    else if (condition.includes('1-2')) physical = t.screen.scratchesLight;
    else physical = t.screen.cracked;
  }

  let display = 0;
  if (defects.has('screen_spot') || spots || lines || discoloration) {
    if (spots.includes('large') || spots.includes('3 or more')) display = t.screen.spotsHeavy;
    else if (spots.includes('1-2')) display = t.screen.spotsLight;
    if (lines.includes('visible line')) display = Math.max(display, t.screen.lines);
    else if (lines.includes('faded')) display = Math.max(display, t.screen.fadedEdges);
    if (discoloration.includes('major')) display = Math.max(display, t.screen.discolorationMajor);
    else if (discoloration.includes('minor')) display = Math.max(display, t.screen.discolorationMinor);
    if (defects.has('screen_spot') && !spots && !lines && !discoloration) display = t.screen.spotsHeavy;
  }

  // Cracked glass already implies a new display: no separate local charge.
  const localDisplay = d.originalScreen === false && !cracked
    ? (warrantyNotAsked ? t.screen.localDisplayNotAsked : t.screen.localDisplay)
    : 0;
  return { screen: Math.max(physical, display), localDisplay };
}

function bodyDeduction(d: DiagnosticsType, t: InrGroupTable): number {
  const scratches = lower(d.bodyScratches);
  const dents = lower(d.bodyDents);
  const panel = lower(d.bodyPanel);
  const bentAnswer = lower(d.bodyBent);
  const defects = new Set(d.defects || []);

  let cosmetic = 0;
  if (defects.has('body_scratch') || scratches || dents) {
    if (scratches.includes('more than 2')) cosmetic += t.body.scratchesHeavy;
    else if (scratches.includes('1-2')) cosmetic += t.body.scratchesLight;
    if (dents.includes('major') || dents.includes('more than 2')) cosmetic += t.body.dentsMajor;
    else if (dents.includes('1-2')) cosmetic += t.body.dentsMinor;
  }

  let structural = 0;
  if (defects.has('panel_missing') || defects.has('body_bent') || panel || bentAnswer) {
    if (panel.includes('missing')) structural = t.body.panelMissing;
    else if (panel.includes('cracked') || panel.includes('broken')) structural = t.body.panelCracked;
    const bent = (bentAnswer.includes('bent') && !bentAnswer.includes('not bent')) || bentAnswer.includes('curved');
    if (bent) structural = Math.max(structural, t.body.bent);
    else if (bentAnswer.includes('loose screen') || bentAnswer.includes('gap')) structural = Math.max(structural, t.body.looseScreen);
    if (defects.has('panel_missing') && !panel && !bentAnswer) structural = t.body.panelMissing;
  }

  return cosmetic + structural;
}

function functionalDeduction(d: DiagnosticsType, t: InrGroupTable): number {
  let total = 0;
  for (const fault of new Set(d.hardware || [])) total += t.functional[fault] ?? 0;
  return total;
}

/**
 * Cashify condition equivalent under the fixed-₹ model. `ageRetention` is the
 * caller's age/warranty/bill factor (1 when Cashify does not ask warranty).
 * `deadPhonePrice` floors the result so a working phone never prices below a
 * phone that does not power on.
 */
export function inrConditionValue(params: {
  config: InrDeductionConfig;
  group: string;
  reference: number;
  ageRetention: number;
  diagnostics: DiagnosticsType;
  deadPhonePrice: number;
  warrantyNotAsked?: boolean;
}): InrConditionBreakdown {
  const { config, group, reference, ageRetention, diagnostics, deadPhonePrice } = params;
  const table = config.groups[group];
  if (!table) throw new Error(`inrDeductions: unknown group "${group}"`);
  const { screen, localDisplay, body, functional, total } = conditionDeduction(diagnostics, table, params.warrantyNotAsked === true);
  const hasBox = (diagnostics.accessories || []).includes('box') || diagnostics.box === true;
  const box = hasBox ? table.box : 0;
  const raw = reference * ageRetention - total + box;
  const rounded = Math.round(raw / config.roundTo) * config.roundTo;
  return { group, screen, localDisplay, body, functional, box, value: Math.max(rounded, deadPhonePrice) };
}

interface DeductionBreakdown { screen: number; localDisplay: number; body: number; functional: number; total: number }

function conditionDeduction(d: DiagnosticsType, table: InrGroupTable, warrantyNotAsked: boolean): DeductionBreakdown {
  const { screen, localDisplay } = screenDeductions(d, table, warrantyNotAsked);
  const body = bodyDeduction(d, table);
  const functional = functionalDeduction(d, table);
  // A local display and body damage overlap (lib/pricing/calibration.ts):
  // the larger in full, a share of the smaller.
  const overlapping = localDisplay > 0 && body > 0
    ? Math.max(localDisplay, body) + CASHIFY_CALIBRATION.damageOverlap.displayAndBodySecondFactor * Math.min(localDisplay, body)
    : localDisplay + body;
  let chosen: DeductionBreakdown = { screen, localDisplay, body, functional, total: screen + overlapping + functional };

  // A failed touch screen or cracked glass supersedes other screen charges,
  // so it is charged at least what the same phone is charged without it
  // (as calculateConditionAdjustments does for the percentage model).
  const lesser: DiagnosticsType[] = [];
  if (d.touch === false) lesser.push({ ...d, touch: true });
  const condition = lower(d.screenCondition);
  if (condition.includes('cracked') || condition.includes('glass broken') || (d.defects || []).includes('broken_screen')) {
    lesser.push({ ...d, screenCondition: null, defects: (d.defects || []).filter((x) => x !== 'broken_screen' && x !== 'screen_scratch') });
  }
  for (const candidate of lesser) {
    const without = conditionDeduction(candidate, table, warrantyNotAsked);
    if (without.total > chosen.total) chosen = without;
  }
  return chosen;
}
