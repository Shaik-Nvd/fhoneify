/** Frozen conditional glass method. Inputs contain A/B anchors only; no target Selling price. */
import manifest from '../../scripts/pricing/fixtures/fresh-glass-ab-development-2026-10-02.json';
import { createExactFinalQuoteIndex, boundedCompetitiveOffer, type ExactFinalQuoteEvidence } from './exactFinalQuote';
import { estimateWorkbookGlassLoss, workbookComponents, workbookStorageIdentity } from './teamWorkbookCandidate';
import { customerPayout } from './payout';
import { releaseSafetyInspectionReason } from './releaseCandidate';

export const GLASS_SHADOW_VERSION = 'conditional-glass-shadow/v1';
type MatchInput = Parameters<ReturnType<typeof createExactFinalQuoteIndex>['find']>[0];
export function createGlassShadowCandidate(evidence: readonly ExactFinalQuoteEvidence[]) {
  return (input: MatchInput) => {
    const abstain = (reason: string) => ({ supported: false as const, researchOnly: true as const, version: GLASS_SHADOW_VERSION, reason });
    const spec = manifest.specs.find(s => s.brand === input.device.brand && s.model === input.device.model &&
      workbookStorageIdentity(s.storage) === workbookStorageIdentity(input.device.storage));
    if (!spec) return abstain('NO_DEVICE_SPECIFIC_ANCHORS');
    if (input.reference !== spec.validatedGetUpto) return abstain('CHANGED_REFERENCE');
    if (releaseSafetyInspectionReason(input.device, input.diagnostics, true) ||
      workbookComponents(input.diagnostics)?.join('|') !== 'glass_cracked') return abstain('UNPROVEN_OR_UNSAFE_CONDITION');
    const sources = spec.source.slice(0, 2); // clean A and heavy-scratch B, never C or another device
    const rows: ExactFinalQuoteEvidence[] = [];
    for (const anchor of sources) {
      const id = `team-workbook-2026-10-02:${anchor.id}`;
      const matches = evidence.filter(e => e.id === id);
      if (matches.length !== 1) return abstain('MISSING_OR_DUPLICATE_ANCHOR');
      const row = matches[0];
      if (row.brand !== spec.brand || row.model !== spec.model || workbookStorageIdentity(row.storage) !== workbookStorageIdentity(spec.storage) ||
        row.getUpto !== anchor.reference || row.sellingPrice !== anchor.observed || row.observedAt !== anchor.collectedAt ||
        row.screenshotSha256 !== anchor.screenshotSha256 || row.provenance.role !== (rows.length === 0 ? 'CLEAN_CONTROL_OR_BASELINE_OBSERVATION' : 'DEVELOPMENT_OR_ESTABLISHED_OBSERVATION')) return abstain('ANCHOR_MANIFEST_MISMATCH');
      rows.push(row);
    }
    const index = createExactFinalQuoteIndex(rows);
    if (index.rejected.length) return abstain('INVALID_ANCHOR_EVIDENCE');
    // Only the screen severity and its derived parent change. All other answers remain bound.
    const cleanDiagnostics = { ...input.diagnostics, screenCondition: null, defects: [] };
    const scratchDiagnostics = { ...input.diagnostics, screenCondition: 'More than 2 scratches on screen', defects: ['screen_scratch'] };
    const clean = index.find({ ...input, diagnostics: cleanDiagnostics });
    const scratch = index.find({ ...input, diagnostics: scratchDiagnostics });
    if (!clean.matched) return abstain(`CLEAN_ANCHOR_${clean.reason}`);
    if (!scratch.matched) return abstain(`SCRATCH_ANCHOR_${scratch.reason}`);
    const loss = estimateWorkbookGlassLoss(clean.sellingPrice - scratch.sellingPrice);
    if (loss === null) return abstain('INVALID_SCRATCH_LOSS');
    const sellingEstimate = Math.round((clean.sellingPrice - loss) / 10) * 10;
    if (!Number.isSafeInteger(sellingEstimate) || sellingEstimate <= 0) return abstain('INVALID_SELLING_ESTIMATE');
    const gross = boundedCompetitiveOffer(input.reference, sellingEstimate);
    return { supported: true as const, researchOnly: true as const, version: GLASS_SHADOW_VERSION,
      method: 'same-device-clean-minus-frozen-scratch-derived-glass-loss' as const,
      anchors: { clean: { ids: clean.evidenceIds, sellingPrice: clean.sellingPrice, observedAt: clean.observedAt, fingerprint: clean.fingerprint },
        scratch: { ids: scratch.evidenceIds, sellingPrice: scratch.sellingPrice, observedAt: scratch.observedAt, fingerprint: scratch.fingerprint } },
      scratchLoss: clean.sellingPrice - scratch.sellingPrice, glassLoss: loss, sellingEstimate, gross,
      couponOff: customerPayout(gross, false), couponOn: customerPayout(gross, true) };
  };
}
export type GlassShadowCandidate = ReturnType<typeof createGlassShadowCandidate>;
export type GlassShadowResult = ReturnType<GlassShadowCandidate>;
