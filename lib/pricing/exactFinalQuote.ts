/** Exact observed Selling-price lookup. This is a cache, never a fitted damage model. */
import crypto from 'node:crypto';
import { parseDiagnostics } from './diagnostics';
import { canonicalDiagnosticsHash } from './quoteToken';
import { workbookStorageIdentity } from './teamWorkbookCandidate';
import { isReleaseEvidenceCurrent } from './releaseEvidenceAge';
import { isQuestionnaireProfileCurrent } from '../referencePricing/questionnaire/policy';
import { releaseSafetyInspectionReason } from './releaseCandidate';
import { applyCompetitorUplift, type DiagnosticsType } from '../pricingCalculator';
import { customerPayout, FIRST_TIME_COUPON_BONUS } from './payout';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
import type { QuestionnaireSemantics } from './questionnaireSemantics';

export const EXACT_FINAL_QUOTE_VERSION = 'exact-final-selling-cache/v1';
export const FACTORS = ['warranty','validBill','mobileAge','eSim','box','charger','sPen'] as const;
export interface ExactFinalQuoteEvidence {
  id: string; brand: string; model: string; storage: string;
  getUpto: number; sellingPrice: number; observedAt: string; screenshotSha256: string;
  route: Record<typeof FACTORS[number], 'ASKED' | 'NOT_ASKED' | 'UNKNOWN'>;
  diagnostics: unknown;
  provenance: { screenshotVerified: boolean; planMatched: boolean; routeComplete: boolean; source: string; role: string };
}
const identity = (d: { brand: string; model: string; storage: string }) => `${d.brand}|${d.model}|${workbookStorageIdentity(d.storage)}`;
function normalise(d: DiagnosticsType, route: ExactFinalQuoteEvidence['route']): DiagnosticsType | null {
  const copy = { ...d, hardware: [...d.hardware], accessories: [...d.accessories], defects: [...d.defects] };
  // Recorded collector enums vs public UI labels. Token hashes still bind the original input.
  if (copy.eSim === 'single') copy.eSim = 'Single eSIM';
  if (copy.eSim === 'dual') copy.eSim = 'Dual eSIM';
  if (route.mobileAge === 'NOT_ASKED' && route.warranty === 'ASKED' && copy.warranty === false && copy.mobileAge === 'above11') copy.mobileAge = null;
  for (const [factor, field] of [['warranty','warranty'],['validBill','validBill'],['mobileAge','mobileAge'],['eSim','eSim']] as const) {
    if (route[factor] === 'UNKNOWN') return null;
    if (route[factor] === 'NOT_ASKED' && copy[field] != null) return null;
    if (route[factor] === 'ASKED' && copy[field] == null && !(factor === 'validBill' && copy.accessories.includes('bill'))) return null;
  }
  // Optional explicit flags and accessory list describe the same selected answer.
  if (copy.box != null && copy.box !== copy.accessories.includes('box')) return null;
  if (copy.charger != null && copy.charger !== copy.accessories.includes('charger')) return null;
  delete copy.box; delete copy.charger;
  for (const [factor, accessory] of [['box','box'],['charger','charger'],['sPen','spen']] as const) {
    if (route[factor] === 'UNKNOWN' || (route[factor] === 'NOT_ASKED' && copy.accessories.includes(accessory))) return null;
  }
  // Normalize only explicit no-fault labels; never merge distinct damage severities.
  for (const [field, noFault] of [['screenCondition','No scratches on screen'],['screenSpots','No spots on screen'],['screenLines','No line(s) on Display'],
    ['screenDiscoloration','No Discoloration'],['bodyScratches','No scratches'],['bodyDents','No dents'],['bodyPanel','No defect on side or back panel'],['bodyBent','Phone not bent']] as const)
    if (copy[field] === noFault) copy[field] = null;
  return copy;
}
const modesOf = (r: WorkbookRouteEvidence): ExactFinalQuoteEvidence['route'] => ({ warranty: r.semantics.warrantyMode, validBill: r.semantics.billMode,
  mobileAge: r.semantics.ageMode, eSim: r.eSimMode, box: r.boxMode, charger: r.chargerMode, sPen: r.sPenMode });

export function createExactFinalQuoteIndex(rows: readonly ExactFinalQuoteEvidence[]) {
  const buckets = new Map<string, ExactFinalQuoteEvidence[]>();
  const rejected: { id: string; reason: string }[] = [];
  for (const row of rows) {
    const parsed = parseDiagnostics(row.diagnostics);
    const d = parsed.ok ? normalise(parsed.value, row.route) : null;
    const reason = !row.provenance.screenshotVerified || !row.provenance.planMatched || !row.provenance.routeComplete ? 'INCOMPLETE_PROVENANCE'
      : !/^[a-f0-9]{64}$/.test(row.screenshotSha256) || !Number.isFinite(Date.parse(row.observedAt)) ? 'INVALID_EVIDENCE'
      : !Number.isSafeInteger(row.getUpto) || row.getUpto <= 0 || !Number.isSafeInteger(row.sellingPrice) || row.sellingPrice <= 0 ? 'INVALID_PRICE'
      : !d || releaseSafetyInspectionReason(row, d, true) ? 'UNSAFE_OR_INCOMPLETE_DIAGNOSTICS' : null;
    if (reason) { rejected.push({ id: row.id, reason }); continue; }
    const key = `${identity(row)}|${row.getUpto}|${canonicalDiagnosticsHash(d!)}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(row);
  }
  return {
    rejected,
    size: buckets.size,
    find(input: { device: { brand: string; model: string; storage: string }; diagnostics: DiagnosticsType; reference: number; referenceExact: boolean;
      referenceVerifiedAt: string | null; questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback'; status?: string; observedAt?: string };
      route?: WorkbookRouteEvidence; now: Date }): { matched: true; sellingPrice: number; evidenceIds: string[]; fingerprint: string; observedAt: string } | { matched: false; reason: string } {
      const miss = (reason: string) => ({ matched: false as const, reason });
      const r = input.route, q = input.questionnaire;
      if (!input.referenceExact || !isReleaseEvidenceCurrent(input.referenceVerifiedAt, input.now)) return miss('REFERENCE_NOT_CURRENT_EXACT_CASHIFY');
      if (!r || identity(r) !== identity(input.device) || !/^[a-f0-9]{64}$/.test(r.evidenceSha256) || !isReleaseEvidenceCurrent(r.observedAt, input.now)) return miss('ROUTE_NOT_CURRENT');
      if (q.source !== 'profile' || q.status !== 'OK' || !isQuestionnaireProfileCurrent(q.observedAt, input.now) ||
        q.warrantyMode !== r.semantics.warrantyMode || q.billMode !== r.semantics.billMode || q.ageMode !== r.semantics.ageMode) return miss('PROFILE_NOT_COMPATIBLE');
      const modes = modesOf(r), d = normalise(input.diagnostics, modes);
      if (!d || releaseSafetyInspectionReason(input.device, d, true)) return miss('UNSAFE_OR_INCOMPLETE_DIAGNOSTICS');
      const key = `${identity(input.device)}|${input.reference}|${canonicalDiagnosticsHash(d)}`;
      const candidates = (buckets.get(key) ?? []).filter(e => isReleaseEvidenceCurrent(e.observedAt, input.now) && FACTORS.every(f => e.route[f] === modes[f]));
      if (!candidates.length) return miss('NO_EXACT_CURRENT_OBSERVATION');
      // Conflicting amounts at the same identity, reference and answers are not resolved by choosing the newest.
      if (new Set(candidates.map(e => e.sellingPrice)).size !== 1) return miss('CONFLICTING_EXACT_OBSERVATIONS');
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(candidates.map(e => [e.id,e.screenshotSha256,e.sellingPrice,e.observedAt]).sort())).digest('hex');
      return { matched: true, sellingPrice: candidates[0].sellingPrice, evidenceIds: candidates.map(e => e.id), fingerprint,
        observedAt: candidates.map(e => e.observedAt).sort()[0] };
    },
  };
}
export type ExactFinalQuoteIndex = ReturnType<typeof createExactFinalQuoteIndex>;

/** Evaluate the requirement against the final standard payout and the existing coupon. */
export function competitiveOfferAudit(getUpto: number, sellingPrice: number) {
  const gross = applyCompetitorUplift(getUpto, sellingPrice);
  const standard = customerPayout(gross, false).payout, coupon = customerPayout(gross, true).payout;
  return { gross, standard, coupon, standardDelta: standard - sellingPrice, couponDelta: coupon - sellingPrice,
    standardPass: standard > sellingPrice && standard - sellingPrice <= 2000,
    couponPass: coupon > sellingPrice && coupon - sellingPrice <= 2000 };
}
/** Separate reviewed policy: unchanged percentage preference, constrained so both coupon states meet the net corridor.
 * Does not alter applyCompetitorUplift, legacy pricing, fee, coupon, or deduction floors. */
export function boundedCompetitiveOffer(getUpto: number, sellingPrice: number): number {
  if (!Number.isSafeInteger(sellingPrice) || sellingPrice <= 0 || !Number.isSafeInteger(getUpto) || getUpto <= 0) throw new Error('Positive integer captured prices required');
  const preferred = applyCompetitorUplift(getUpto, sellingPrice);
  // Choose in whole rupees. The existing exact-₹1200 fee exemption is checked by the payout helper below.
  const lower = sellingPrice + 100;
  const upper = sellingPrice + 2000 + 99 - FIRST_TIME_COUPON_BONUS;
  const gross = Math.max(lower, Math.min(preferred, upper));
  const standard = customerPayout(gross, false).payout, coupon = customerPayout(gross, true).payout;
  if (standard <= sellingPrice || coupon - sellingPrice > 2000) throw new Error('Competitive payout invariant violated');
  return gross;
}
