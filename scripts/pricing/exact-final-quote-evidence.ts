/** Import existing verified automatic captures without changing prices, answers, dates or roles. */
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import { createExactFinalQuoteIndex, type ExactFinalQuoteEvidence } from '../../lib/pricing/exactFinalQuote';
export function existingExactFinalQuoteEvidence(): ExactFinalQuoteEvidence[] {
  return (fixture.observations as any[]).filter(o => !o.excluded && o.provenance?.type === 'AUTOMATIC_COLLECTOR_OBSERVATION').map(o => ({
    id: o.id, brand: o.brand, model: o.model, storage: o.storage, getUpto: o.getUpto, sellingPrice: o.observed,
    observedAt: o.collectedAt, screenshotSha256: o.screenshotSha256, route: o.route, diagnostics: o.diagnostics,
    provenance: { screenshotVerified: o.provenance.screenshotVerified, planMatched: o.provenance.planMatched,
      routeComplete: o.provenance.routeComplete, source: fixture.version, role: o.provenance.evaluationRole },
  }));
}
export function existingExactFinalQuoteIndex() { return createExactFinalQuoteIndex(existingExactFinalQuoteEvidence()); }
