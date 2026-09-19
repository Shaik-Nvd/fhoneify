import { z } from 'zod';
import type { DiagnosticsType } from '../pricingCalculator';

/**
 * Validation for the diagnostics payload the quote flow sends. The pricing
 * engine (lib/pricingCalculator.ts) assumes arrays are arrays and flags are
 * booleans - a malformed payload used to reach it unchecked via
 * `answers: z.any()` and either crash (e.g. `hardware.forEach` on a string)
 * or price something the UI can never produce.
 *
 * This only enforces SHAPE and size. It does not allowlist option values,
 * because the engine deliberately accepts both the UI ids ("battery_service")
 * and legacy labels ("Battery in Service"); an unrecognized value simply
 * matches no penalty, exactly as before.
 */

const MAX_TEXT_LENGTH = 120;
const MAX_LIST_ITEMS = 40;

const text = z.string().trim().max(MAX_TEXT_LENGTH);
const nullableText = text.nullable().default(null);
const nullableBool = z.boolean().nullable().default(null);
const list = z
  .array(text)
  .max(MAX_LIST_ITEMS)
  .default([])
  // Duplicates are never produced by the UI, and some brand branches sum
  // hardware penalties per entry - dedupe so one payload has one price.
  .transform((items) => [...new Set(items)]);

export const DiagnosticsSchema = z.object({
  calls: nullableBool,
  touch: nullableBool,
  originalScreen: nullableBool,
  defects: list,
  screenCondition: nullableText,
  screenSpots: nullableText,
  screenLines: nullableText,
  screenDiscoloration: nullableText,
  bodyScratches: nullableText,
  bodyDents: nullableText,
  bodyPanel: nullableText,
  bodyBent: nullableText,
  hardware: list,
  accessories: list,
  warranty: nullableBool,
  validBill: nullableBool,
  eSim: nullableText,
  mobileAge: nullableText,
  // Left optional (not defaulted): the Samsung/Vivo branches distinguish
  // "charger answered false" from "charger never asked" via `!== undefined`.
  box: z.boolean().nullable().optional(),
  charger: z.boolean().nullable().optional(),
});

export type DiagnosticsParseResult =
  | { ok: true; value: DiagnosticsType }
  | { ok: false; error: string };

export function parseDiagnostics(input: unknown): DiagnosticsParseResult {
  const result = DiagnosticsSchema.safeParse(input ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path?.length ? issue.path.join('.') : 'diagnostics';
    return { ok: false, error: `${where}: ${issue?.message ?? 'invalid value'}` };
  }
  return { ok: true, value: result.data as DiagnosticsType };
}

/**
 * Uses the values the current quote UI actually sends. The old page checked
 * legacy defect ids such as `screen_lines` and `body_bent`, so severe damage
 * could leave warranty=true and then be priced as a below-three-month phone.
 */
export function warrantyVoidedByDiagnostics(diagnostics: Pick<DiagnosticsType,
  'calls' | 'originalScreen' | 'screenCondition' | 'screenSpots' |
  'screenLines' | 'screenDiscoloration' | 'bodyPanel' | 'bodyBent'
>): boolean {
  const value = (input: string | null) => String(input ?? '').toLowerCase();
  const screenCondition = value(diagnostics.screenCondition);
  const spots = value(diagnostics.screenSpots);
  const lines = value(diagnostics.screenLines);
  const discoloration = value(diagnostics.screenDiscoloration);
  const panel = value(diagnostics.bodyPanel);
  const bent = value(diagnostics.bodyBent);
  const bentOrCurved = (bent.includes('bent') && !bent.includes('not bent')) || bent.includes('curved');

  return diagnostics.calls === false ||
    diagnostics.originalScreen === false ||
    screenCondition.includes('cracked') ||
    screenCondition.includes('glass broken') ||
    (!!spots && !spots.includes('no spots')) ||
    (!!lines && !lines.includes('no line')) ||
    (!!discoloration && !discoloration.includes('no discoloration')) ||
    panel.includes('cracked') ||
    panel.includes('broken') ||
    panel.includes('missing') ||
    bentOrCurved ||
    bent.includes('loose screen') ||
    bent.includes('gap');
}
