/**
 * Release-candidate accessory accounting (owner decision 2026-10-03).
 *
 * Where Cashify asks neither warranty, bill nor age, its Get Upto already
 * prices a phone with original box and charger: every verified collector
 * block in that route (OnePlus, Xiaomi, Apple, Samsung) paid clean
 * Selling = Get Upto - 20 with box and charger Yes
 * (scripts/pricing/fixtures/owner-correction-2026-10-02.json). Adding the
 * engine's box bonus there double counts the box. Box No was measured only
 * on Redmi Note 10 Pro Max 6/128 (-300), so no missing-box deduction is
 * applied generally: that case is flagged, not guessed. Charger answers are
 * unchanged. Other routes keep the legacy box bonus until measured.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';

export type AccessoryBasis =
  | 'LEGACY_BOX_BONUS'
  | 'GET_UPTO_INCLUDES_BOX_AND_CHARGER'
  | 'GET_UPTO_INCLUDES_BOX_MISSING_BOX_UNMEASURED';

export const ACCESSORY_BASIS_EVIDENCE = 'scripts/pricing/fixtures/owner-correction-2026-10-02.json#boxAccounting';

/** Get Upto already includes box and charger: verified only for the
 * all-NOT_ASKED route, and only from a stored profile (not the fallback). */
export function getUptoIncludesAccessories(q: QuestionnaireSemantics & { source: 'profile' | 'fallback' }): boolean {
  return q.source === 'profile' && q.warrantyMode === 'NOT_ASKED' && q.billMode === 'NOT_ASKED' && q.ageMode === 'NOT_ASKED';
}

export const hasBox = (d: DiagnosticsType) => (d.accessories || []).includes('box') || d.box === true;

/** The same answers without the box, so the engine adds no box bonus and
 * nothing else changes (the box answer only drives that bonus). */
export const withoutBoxBonus = (d: DiagnosticsType): DiagnosticsType =>
  ({ ...d, box: null, accessories: (d.accessories || []).filter((a) => a !== 'box') });
