/**
 * Release-candidate accessory accounting (owner decision 2026-10-03).
 *
 * On the exact matched Mi A2, Note9Pro, Note10ProMax and Nord routes,
 * Get Upto includes box and charger (clean Selling = Get Upto - 20).
 * NOT_ASKED warranty/bill/age alone does not establish this for other models;
 * Apple12Pro and Xiaomi14Ultra provide counterexamples to that baseline.
 * Adding the engine's box bonus on eligible routes double counts the box.
 * Box No was measured only
 * on Redmi Note 10 Pro Max 6/128 (-300), so no missing-box deduction is
 * applied generally: unsupported missing accessories receive no binding
 * corrected quote. Other verified routes use their own calibrated baseline.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';

export type AccessoryBasis =
  | 'CALIBRATED_ROUTE_ACCESSORIES'
  | 'LEGACY_BOX_BONUS'
  | 'GET_UPTO_INCLUDES_BOX_AND_CHARGER'
  | 'GET_UPTO_INCLUDES_BOX_MISSING_BOX_UNMEASURED';

export const ACCESSORY_BASIS_EVIDENCE = 'scripts/pricing/fixtures/owner-correction-2026-10-02.json#boxAccounting';

/** Get Upto already includes box and charger: verified only for the
 * all-NOT_ASKED route, and only from a stored profile (not the fallback). */
export function getUptoIncludesAccessories(q: QuestionnaireSemantics & { source: 'profile' | 'fallback' }, route?: WorkbookRouteEvidence, evidenceEligible = false): boolean {
  return evidenceEligible && !!route && route.boxMode === 'ASKED' && route.chargerMode === 'ASKED' &&
    q.source === 'profile' && q.warrantyMode === 'NOT_ASKED' && q.billMode === 'NOT_ASKED' && q.ageMode === 'NOT_ASKED';
}

export const hasBox = (d: DiagnosticsType) => (d.accessories || []).includes('box') || d.box === true;

/** The same answers without the box, so the engine adds no box bonus and
 * nothing else changes (the box answer only drives that bonus). */
export const withoutBoxBonus = (d: DiagnosticsType): DiagnosticsType =>
  ({ ...d, box: null, accessories: (d.accessories || []).filter((a) => a !== 'box') });
