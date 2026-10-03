/**
 * Release-candidate accessory accounting (owner decision 2026-10-03).
 *
 * Exact variant controls establish clean Selling = Get Upto - 20 for 18
 * all-NOT_ASKED routes. Applying the release correction also requires a fresh
 * matching reference and stored questionnaire. Apple 12 Pro and Xiaomi 14
 * Ultra are explicit counterexamples and stay outside this set.
 * Box No was measured only
 * on Redmi Note 10 Pro Max 6/128 (-300), so no missing-box deduction is
 * applied generally: unsupported missing accessories receive no binding
 * corrected quote.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
import { workbookStorageIdentity } from './teamWorkbookCandidate';

export type AccessoryBasis =
  | 'CALIBRATED_ROUTE_ACCESSORIES'
  | 'LEGACY_BOX_BONUS'
  | 'GET_UPTO_INCLUDES_BOX_AND_CHARGER'
  | 'GET_UPTO_INCLUDES_BOX'
  | 'GET_UPTO_INCLUDES_BOX_MISSING_BOX_UNMEASURED';

export const ACCESSORY_BASIS_EVIDENCE = 'scripts/pricing/fixtures/claude-accessory-ablation-2026-10-03.json#recommendation.accessoryCorrectionEligibleVariants;scripts/pricing/fixtures/release-route-evidence-2026-10-02.json#baselineGetUpto';

/** Get Upto already includes box and charger: verified only for the
 * all-NOT_ASKED route, and only from a stored profile (not the fallback). */
export function getUptoIncludesAccessories(device: { brand: string; model: string; storage: string }, q: QuestionnaireSemantics & { source: 'profile' | 'fallback' }, route?: WorkbookRouteEvidence, evidenceEligible = false): boolean {
  return evidenceEligible && hasVerifiedBoxIncludedRoute(device, q, route) && !!route && route.chargerMode === 'ASKED' &&
    q.source === 'profile' && q.warrantyMode === 'NOT_ASKED' && q.billMode === 'NOT_ASKED' && q.ageMode === 'NOT_ASKED';
}

/** Exact clean-control identities with verified box-present Selling = Get
 * Upto - 20 on this route. The route itself is still checked at runtime. */
const BOX_INCLUDED_IDENTITIES = new Set([
  'Apple|Apple iPhone 8|128 GB', 'Apple|Apple iPhone XS Max|256 GB', 'Apple|Apple iPhone 11 Pro Max|256 GB', 'Apple|Apple iPhone 14|256 GB',
  'Samsung|Samsung Galaxy M32|4 GB/64 GB', 'Samsung|Samsung Galaxy A50s|4 GB/128 GB',
  'Samsung|Samsung Galaxy S21 Ultra 5G|12 GB/256 GB', 'Samsung|Samsung Galaxy S23 FE 5G|8 GB/128 GB',
  'OnePlus|OnePlus 7 Pro|8 GB/256 GB', 'OnePlus|OnePlus 8 Pro|8 GB/128 GB', 'OnePlus|OnePlus 9 5G|8 GB/128 GB', 'OnePlus|OnePlus Nord|8 GB/128 GB',
  'Xiaomi|Xiaomi Mi A2|4 GB/64 GB', 'Xiaomi|Xiaomi Redmi 11 Prime|4 GB/64 GB', 'Xiaomi|Xiaomi Redmi 5|3 GB/32 GB',
  'Xiaomi|Xiaomi Redmi K50i 5G|6 GB/128 GB', 'Xiaomi|Xiaomi Redmi Note 9 Pro|4 GB/128 GB', 'Xiaomi|Xiaomi Redmi Note 10 Pro Max|6 GB/128 GB',
]);
const identity = (v: string) => v.replace(/\s+/g, ' ').trim().toLowerCase();
export function isBoxIncludedIdentity(device: { brand: string; model: string; storage: string }): boolean {
  return [...BOX_INCLUDED_IDENTITIES].some(key => {
    const [brand, model, storage] = key.split('|');
    return brand === device.brand && model === device.model && workbookStorageIdentity(storage) === workbookStorageIdentity(device.storage);
  });
}
export function hasVerifiedBoxIncludedRoute(device: { brand: string; model: string; storage: string }, q: QuestionnaireSemantics & { source: 'profile' | 'fallback' }, route?: WorkbookRouteEvidence): boolean {
  if (!isBoxIncludedIdentity(device)) return false;
  return !!route && identity(route.brand) === identity(device.brand) && identity(route.model) === identity(device.model) &&
    workbookStorageIdentity(route.storage) === workbookStorageIdentity(device.storage) && route.semantics.warrantyMode === 'NOT_ASKED' &&
    route.semantics.billMode === 'NOT_ASKED' && route.semantics.ageMode === 'NOT_ASKED' &&
    route.boxMode === 'ASKED' && ['ASKED', 'NOT_ASKED'].includes(route.chargerMode) &&
    route.sPenMode === 'NOT_ASKED' && route.eSimMode === 'NOT_ASKED' && q.source === 'profile' &&
    q.warrantyMode === 'NOT_ASKED' && q.billMode === 'NOT_ASKED' && q.ageMode === 'NOT_ASKED';
}

export function accessoryBasisForRoute(route: WorkbookRouteEvidence): 'GET_UPTO_INCLUDES_BOX_AND_CHARGER' | 'GET_UPTO_INCLUDES_BOX' {
  return route.chargerMode === 'ASKED' ? 'GET_UPTO_INCLUDES_BOX_AND_CHARGER' : 'GET_UPTO_INCLUDES_BOX';
}

export const hasBox = (d: DiagnosticsType) => (d.accessories || []).includes('box') || d.box === true;

/** The same answers without the box, so the engine adds no box bonus and
 * nothing else changes (the box answer only drives that bonus). */
export const withoutBoxBonus = (d: DiagnosticsType): DiagnosticsType =>
  ({ ...d, box: null, accessories: (d.accessories || []).filter((a) => a !== 'box') });

/** Preserve all non-condition answers while deriving the same-route clean
 * engine reference used to isolate the measured clean-baseline offset. */
export const cleanAccessoryBaselineDiagnostics = (d: DiagnosticsType): DiagnosticsType => ({
  ...d, calls: true, touch: true, originalScreen: true, defects: [],
  screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [],
  warranty: null, validBill: null, eSim: null, mobileAge: null,
});
