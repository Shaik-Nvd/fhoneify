/**
 * Fixed-₹ condition model (Cashify-shaped).
 *
 * The percentage model in pricingCalculator.ts removes the same share of the
 * reference for a defect on every phone, so a ₹75k flagship loses three times
 * as many rupees as a ₹25k phone for the same broken display. Cashify's quotes
 * do not behave that way: on the 2026-10-01 Xiaomi benchmark the rupee gap
 * between two condition sets is ~₹8,500 for 15 Ultra, 17 and 17 Ultra alike
 * (Get Upto ₹57k-75k) and ₹1.5k-3.5k on Redmis. Deductions follow repair
 * cost, which depends on the phone's parts, not its resale price.
 *
 *   value = R × ageRetention − screenGroup − body − Σ functional + box
 *   screenGroup = min(screenReplacement, localDisplay + max(physical, display))
 *                 (touch failure or cracked glass = screenReplacement)
 *   value is floored at the dead-phone price and rounded to config.roundTo.
 *
 * Tables, group membership and per-model warranty retention are data
 * (inrDeductionTables.ts). Browser-safe: no imports beyond types/constants.
 */
import type { DiagnosticsType } from '../pricingCalculator';

export interface InrScreenTable {
  /** Non-original (local/copy) display. Added to the worst display defect. */
  localDisplay: number;
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
  /** Cost of a full display replacement: the cap on the screen group, and the
   * charge for a failed touch screen or cracked glass. */
  screenReplacement: number;
  screen: InrScreenTable;
  body: InrBodyTable;
  /** Keyed like COMMON_FUNCTIONAL_PENALTIES (charging, back_camera, ...).
   * Faults absent here fall back to `functionalDefault`. */
  functional: Record<string, number>;
  functionalDefault: number;
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
   * null = no upper bound. */
  tierGroups: { maxReference: number | null; group: string }[];
  /** Lowercase catalog model name -> share of Get Upto Cashify pays for a
   * clean phone answered "warranty: No". Absent = the brand's age table. */
  warrantyRetention: Record<string, number>;
  roundTo: number;
}

export interface InrConditionBreakdown {
  group: string;
  screen: number;
  body: number;
  functional: number;
  box: number;
  value: number;
}

const lower = (value: unknown) => String(value ?? '').toLowerCase();

export function resolveInrGroup(config: InrDeductionConfig, model: string, reference: number): string {
  const explicit = config.modelGroups[lower(model).trim()];
  if (explicit) return explicit;
  const tier = config.tierGroups.find((t) => t.maxReference === null || reference <= t.maxReference);
  if (!tier) throw new Error(`inrDeductions: no tier group covers reference ${reference}`);
  return tier.group;
}

export function warrantyRetentionFor(config: InrDeductionConfig, model: string): number | undefined {
  return config.warrantyRetention[lower(model).trim()];
}

function screenDeduction(d: DiagnosticsType, t: InrGroupTable): number {
  const defects = new Set(d.defects || []);
  const condition = lower(d.screenCondition);
  const spots = lower(d.screenSpots);
  const lines = lower(d.screenLines);
  const discoloration = lower(d.screenDiscoloration);
  const cracked = condition.includes('cracked') || condition.includes('glass broken') || defects.has('broken_screen');
  const chippedOutside = condition.includes('outside display');

  // A replacement display is already priced in; nothing stacks on top.
  if (d.touch === false || (cracked && !chippedOutside)) return t.screenReplacement;

  let physical = 0;
  if (chippedOutside) physical = t.screen.chipped;
  else if (condition.includes('more than 2')) physical = t.screen.scratchesHeavy;
  else if (condition.includes('1-2')) physical = t.screen.scratchesLight;
  else if (defects.has('screen_scratch') && !condition) physical = t.screen.scratchesHeavy;

  let display = 0;
  if (spots.includes('large') || spots.includes('3 or more')) display = t.screen.spotsHeavy;
  else if (spots.includes('1-2')) display = t.screen.spotsLight;
  if (lines.includes('visible line')) display = Math.max(display, t.screen.lines);
  else if (lines.includes('faded')) display = Math.max(display, t.screen.fadedEdges);
  if (discoloration.includes('major')) display = Math.max(display, t.screen.discolorationMajor);
  else if (discoloration.includes('minor')) display = Math.max(display, t.screen.discolorationMinor);
  if (defects.has('screen_spot') && !spots && !lines && !discoloration) display = t.screen.spotsHeavy;

  const local = d.originalScreen === false ? t.screen.localDisplay : 0;
  return Math.min(t.screenReplacement, local + Math.max(physical, display));
}

function bodyDeduction(d: DiagnosticsType, t: InrGroupTable): number {
  const scratches = lower(d.bodyScratches);
  const dents = lower(d.bodyDents);
  const panel = lower(d.bodyPanel);
  const bentAnswer = lower(d.bodyBent);
  const defects = new Set(d.defects || []);

  let cosmetic = 0;
  if (scratches.includes('more than 2')) cosmetic += t.body.scratchesHeavy;
  else if (scratches.includes('1-2')) cosmetic += t.body.scratchesLight;
  if (dents.includes('major') || dents.includes('more than 2')) cosmetic += t.body.dentsMajor;
  else if (dents.includes('1-2')) cosmetic += t.body.dentsMinor;

  let structural = 0;
  if (panel.includes('missing')) structural = t.body.panelMissing;
  else if (panel.includes('cracked') || panel.includes('broken')) structural = t.body.panelCracked;
  const bent = (bentAnswer.includes('bent') && !bentAnswer.includes('not bent')) || bentAnswer.includes('curved');
  if (bent) structural = Math.max(structural, t.body.bent);
  else if (bentAnswer.includes('loose screen') || bentAnswer.includes('gap')) structural = Math.max(structural, t.body.looseScreen);
  if (defects.has('panel_missing') && !panel && !bentAnswer) structural = t.body.panelMissing;

  return cosmetic + structural;
}

function functionalDeduction(d: DiagnosticsType, t: InrGroupTable): number {
  let total = 0;
  for (const fault of new Set(d.hardware || [])) total += t.functional[fault] ?? t.functionalDefault;
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
  model: string;
  reference: number;
  ageRetention: number;
  diagnostics: DiagnosticsType;
  deadPhonePrice: number;
}): InrConditionBreakdown {
  const { config, model, reference, ageRetention, diagnostics, deadPhonePrice } = params;
  const group = resolveInrGroup(config, model, reference);
  const table = config.groups[group];
  if (!table) throw new Error(`inrDeductions: unknown group "${group}"`);

  const screen = screenDeduction(diagnostics, table);
  const body = bodyDeduction(diagnostics, table);
  const functional = functionalDeduction(diagnostics, table);
  const hasBox = (diagnostics.accessories || []).includes('box') || diagnostics.box === true;
  const box = hasBox ? table.box : 0;

  const raw = reference * ageRetention - screen - body - functional + box;
  const rounded = Math.round(raw / config.roundTo) * config.roundTo;
  return { group, screen, body, functional, box, value: Math.max(rounded, deadPhonePrice) };
}
