/**
 * The live Cashify reference-price source.
 *
 * This is the PriceSource adapter that sits between the team's existing
 * Playwright Cashify scraper (server/modules/quote/cashifyScraper.ts) and the
 * reference-price ingestion pipeline. It contains no browser code of its own:
 * the browser work is injected as `fetchSnapshot`, which is what makes every
 * matching/validation rule here testable without launching Chromium, and what
 * keeps this file from becoming a second scraper.
 *
 * Its whole job is to be paranoid about identity. The scraper can and does
 * land on the wrong page (a generated slug 404s into search, a variant chip
 * doesn't exist and the previously-selected one stays active). Every
 * observation is therefore re-verified against the page it actually came from
 * before it is allowed to become a reference price - and anything that
 * doesn't verify is rejected with a reason, never guessed.
 */
import { DeviceIdentity } from '../types';
import { PriceSource, PriceObservation, PriceRejection } from '../ingestion';
import {
  CashifyPageSnapshot,
  verifyPageIdentity,
  parsePriceText,
  buildCashifyUrl,
} from './cashifyIdentity';

export const CASHIFY_SOURCE_NAME = 'cashify';

/**
 * Fetches one Cashify device page for one variant.
 *
 * Contract:
 *  - resolve/return `null` when the device genuinely has no page on Cashify
 *    (a real "not sold here"), which is recorded as a non-retryable miss;
 *  - THROW for a transport-level problem (timeout, navigation error, browser
 *    crash, blocked request) so the ingestion layer's retry/backoff applies;
 *  - otherwise return whatever was actually on the page, unfiltered. Do not
 *    pre-validate here - verification is this module's job, so the rules live
 *    in exactly one place.
 */
export type CashifySnapshotFetcher = (
  device: DeviceIdentity,
  url: string
) => Promise<CashifyPageSnapshot | null>;

export interface CashifySourceOptions {
  fetchSnapshot: CashifySnapshotFetcher;
  /** Per-device canonical Cashify URL from the catalog (`cashifyLink`). This
   * is the strongest identifier available - a variant-specific URL that the
   * team already curated - so it is always preferred over a generated slug. */
  resolveUrl?: (device: DeviceIdentity) => string | undefined;
}

export function createCashifyPriceSource(options: CashifySourceOptions): PriceSource {
  const { fetchSnapshot, resolveUrl } = options;

  return {
    name: CASHIFY_SOURCE_NAME,
    async fetch(device: DeviceIdentity): Promise<PriceObservation | PriceRejection | null> {
      const curated = resolveUrl?.(device);
      const url = curated ?? buildCashifyUrl(device);

      // A transport failure propagates as a throw (retried upstream); a
      // genuine "no such device page" comes back as null.
      const snapshot = await fetchSnapshot(device, url);
      if (!snapshot) return null;

      const identity = verifyPageIdentity(device, snapshot);
      if (!identity.ok) {
        return {
          rejected: true,
          reason: identity.evidence,
          // Not retryable: the page loaded fine, it is simply a different
          // device. Retrying would fetch the same wrong page again.
          retryable: false,
        };
      }

      const parsed = parsePriceText(snapshot.priceText);
      if (!parsed.ok) {
        return {
          rejected: true,
          reason: `${parsed.reason} (device verified as ${device.brand} ${device.model} ${device.storage} on ${snapshot.url})`,
          // A missing/garbled price CAN be a rendering race, unlike a wrong
          // device - so this one is worth one more look.
          retryable: true,
        };
      }

      return {
        price: parsed.price!,
        sourceUrl: snapshot.url,
        matchConfidence: identity.confidence,
        matchEvidence: `${curated ? 'catalog cashifyLink' : 'generated slug'}; ${identity.evidence}; price text "${snapshot.priceText}"`,
        // Omitted observedAt on purpose: this is a genuinely live source, so
        // the fetch IS the observation and "now" is the honest timestamp.
      };
    },
  };
}
