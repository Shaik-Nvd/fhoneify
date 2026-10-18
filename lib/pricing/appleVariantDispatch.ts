import support from './apple512FallbackSupport.json';
import type { DiagnosticsType } from '../pricingCalculator';
import { isReleaseEvidenceCurrent } from './releaseEvidenceAge';

/** Narrow dispatch repair for the six reviewed catalog variants.
 * This scope is independent of capture eligibility: reference/profile/evidence
 * checks still decide whether exact captured pricing applies. Other variants
 * retain main's existing dispatch until their payout impact is reviewed.
 */
const reviewedIdentities = new Set([
  'apple|apple iphone 15|128gb',
  'apple|apple iphone 12 pro max|128gb',
  'apple|apple iphone 12 pro max|256gb',
  'apple|apple iphone 12 pro max|512gb',
  'apple|apple iphone 14|128gb',
  'apple|apple iphone 14|256gb',
  'apple|apple iphone 14|512gb',
  'apple|apple iphone 13|128gb',
  'apple|apple iphone x|64gb',
  'apple|apple iphone x|128gb',
  'apple|apple iphone x|256gb',
  'apple|apple iphone xr|64gb',
  'apple|apple iphone xr|128gb',
  'apple|apple iphone xr|256gb',
  'apple|apple iphone xs|64gb',
  'apple|apple iphone xs|128gb',
  'apple|apple iphone xs|256gb',
  'apple|apple iphone xs|512gb',
  'apple|apple iphone 11|64gb',
  'apple|apple iphone 11|128gb',
  'apple|apple iphone 11|256gb',
  'apple|apple iphone 12|64gb',
  'apple|apple iphone 12|128gb',
  'apple|apple iphone 12|256gb',
  'apple|apple iphone 13|256gb',
  'apple|apple iphone 13|512gb',
]);

/** Existing specialized rules substantiated by the team's same-device transcripts.
 * In-warranty age branches and variants without a specialized rule are not promoted.
 * This is a wiring repair, not a claim of exact evidence or transferable deductions. */
export const TEAM_TEXT_OUT_OF_WARRANTY_MODELS = new Set([
  'apple iphone 15 plus', 'apple iphone 15 pro', 'apple iphone 15 pro max',
  'apple iphone 16', 'apple iphone 16 plus', 'apple iphone 17',
]);

export function teamTextOutOfWarrantyRule(model: string, storage: string | undefined, warranty: boolean | null): boolean {
  return warranty === false && storage?.replace(/\s+/g, '').toLowerCase() === '512gb' &&
    TEAM_TEXT_OUT_OF_WARRANTY_MODELS.has(model.trim().toLowerCase());
}

/** Answer-only eligibility; no captured Selling amounts enter this dispatcher. */
export function apple512AnswerSignature(d: DiagnosticsType): string | null {
  if ((d.box != null && d.box !== d.accessories.includes('box')) ||
    (d.charger != null && d.charger !== d.accessories.includes('charger'))) return null;
  const none = (value: string | null, label: string) => value === label ? null : value;
  const hardware = d.hardware.map(h => h === 'face_sensor' ? 'face' : h === 'speaker_faulty' ? 'speaker' : h).sort();
  return JSON.stringify([d.calls,d.touch,d.originalScreen,d.warranty,d.validBill,
    d.eSim === 'single' ? 'Single eSIM' : d.eSim === 'dual' ? 'Dual eSIM' : d.eSim,
    [...d.defects].sort(),none(d.screenCondition,'No scratches on screen'),none(d.screenSpots,'No spots on screen'),
    none(d.screenLines,'No line(s) on Display'),none(d.screenDiscoloration,'No Discoloration'),
    none(d.bodyScratches,'No scratches'),none(d.bodyDents,'No dents'),none(d.bodyPanel,'No defect on side or back panel'),
    none(d.bodyBent,'Phone not bent'),hardware,[...d.accessories].sort()]);
}

export function supportedApple512Fallback(device: { brand: string; model: string; storage: string }, d: DiagnosticsType,
  reference: number, now: Date): boolean {
  if (device.brand !== 'Apple' || !teamTextOutOfWarrantyRule(device.model, device.storage, d.warranty)) return false;
  const signature = apple512AnswerSignature(d);
  return signature !== null && support.rows.some(row => row.model === device.model && row.storage === device.storage &&
    row.reference === reference && row.signature === signature &&
    // Day-only source dates expire conservatively from the start of that day.
    isReleaseEvidenceCurrent(`${row.sourceDate}T00:00:00.000Z`, now));
}

export function reviewedAppleDispatchStorage(device: { brand: string; model: string; storage: string }, diagnostics?: { warranty: boolean | null }): string | undefined {
  const identity = `${device.brand.trim().toLowerCase()}|${device.model.trim().toLowerCase()}|${device.storage.replace(/\s+/g, '').toLowerCase()}`;
  return reviewedIdentities.has(identity) || (device.brand.trim().toLowerCase() === 'apple' &&
    teamTextOutOfWarrantyRule(device.model, device.storage, diagnostics?.warranty ?? null)) ? device.storage : undefined;
}
