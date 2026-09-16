import { PriceSource } from '../ingestion';
import { DeviceIdentity } from '../types';
import { matchDevices } from '../matching';

/**
 * A safe, legal, no-scraping refresh path: an operator manually checks
 * Cashify's site (or any other reference) themselves and submits the
 * verified price through the admin API
 * (server/modules/admin/referencePricing). This is the ONLY refresh
 * mechanism actually wired up end-to-end in this pass - see
 * PRICING_REFERENCE_DATA_ARCHITECTURE.md for why an automated scraper is
 * not implemented (legal/business decision still pending).
 *
 * fetch() here is a single-shot adapter: it's constructed fresh with the
 * exact device + submitted price for one admin API call, matches identity
 * defensively (an admin could theoretically submit a price for a
 * differently-cased device object than what's on file), and returns null
 * (rejecting the observation) rather than guessing if the submitted
 * device doesn't match with at least 'high' confidence.
 */
export function createManualSubmissionSource(params: {
  submittedFor: DeviceIdentity;
  price: number;
  submittedByUserId: string;
  sourceUrl?: string;
}): PriceSource {
  return {
    name: `manual:${params.submittedByUserId}`,
    async fetch(device: DeviceIdentity) {
      const match = matchDevices(device, params.submittedFor);
      if (match.confidence === 'unmatched' || match.confidence === 'ambiguous') {
        return null;
      }
      return {
        price: params.price,
        sourceUrl: params.sourceUrl,
        matchConfidence: match.confidence,
        matchEvidence: `manually verified by user ${params.submittedByUserId}: ${match.evidence}`,
      };
    },
  };
}
