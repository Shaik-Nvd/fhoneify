/**
 * Pure device-identity and price-parsing logic for the Cashify reference
 * refresh. Deliberately separated from the Playwright driver so every rule
 * in Phase 4 (exact device/variant matching) and Phase 5 (price validation)
 * is unit-testable without launching a browser.
 *
 * The governing rule, inherited from matching.ts: a wrong reference price is
 * worse than a missing one. Nothing here ever "rescues" a near-miss with
 * substring or fuzzy logic - "OnePlus 15" must never resolve to "OnePlus 15R",
 * and "12 GB/256 GB" must never resolve to "12 GB/512 GB". Anything that is
 * not provably the same variant is REJECTED.
 */
import { DeviceIdentity, MatchConfidence } from '../types';
import { normalize } from '../matching';

/** Boilerplate Cashify wraps around a device name in page titles/headings. */
const TITLE_NOISE = [
  /^sell\s+old\s+/i,
  /^sell\s+your\s+old\s+/i,
  /^sell\s+/i,
  /^buy\s+old\s+/i,
  /^used\s+/i,
  /\s*\|\s*cashify.*$/i,
  /\s*-\s*cashify.*$/i,
  /\s+online.*$/i,
  /\s+at\s+best\s+price.*$/i,
];

export function stripTitleNoise(title: string): string {
  let out = title.trim();
  for (const pattern of TITLE_NOISE) out = out.replace(pattern, '').trim();
  return out;
}

/**
 * The catalog stores brand and model separately, but most model strings
 * already embed the brand ("OPPO Find X9s", "Apple iPhone 14"), while a few
 * do not. This produces the single canonical normalized device name to
 * compare against whatever Cashify displays, without ever double-prefixing
 * or dropping a brand.
 */
export function canonicalDeviceName(brand: string, model: string): string {
  const b = normalize(brand);
  const m = normalize(model);
  if (!b) return m;
  if (m.startsWith(b)) return m;
  return b + m;
}

export interface ParsedVariant {
  /** Normalized RAM token, e.g. "12gb". null when the catalog/page does not
   * express RAM at all (common for iPhones, which have one RAM per model). */
  ram: string | null;
  /** Normalized storage token, e.g. "512gb" / "1tb". */
  storage: string | null;
  raw: string;
}

const CAPACITY_RE = /(\d+(?:\.\d+)?)\s*(tb|gb|mb)\b/gi;

/**
 * Parses a variant label into its RAM/storage components.
 *
 * "12 GB/512 GB" -> { ram: "12gb", storage: "512gb" }   (RAM first, Cashify's order)
 * "512GB"        -> { ram: null,   storage: "512gb" }
 * "8 GB / 1 TB"  -> { ram: "8gb",  storage: "1tb"   }
 *
 * A label with more than two capacity tokens is NOT guessed at - it returns
 * storage: null, which callers treat as unmatched.
 */
export function parseVariant(label: string): ParsedVariant {
  const raw = (label ?? '').trim();
  const tokens: string[] = [];
  CAPACITY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CAPACITY_RE.exec(raw)) !== null) {
    tokens.push(`${m[1]}${m[2]}`.toLowerCase().replace(/\.0(?=[a-z])/, ''));
  }

  if (tokens.length === 1) return { ram: null, storage: tokens[0], raw };
  if (tokens.length === 2) return { ram: tokens[0], storage: tokens[1], raw };
  return { ram: null, storage: null, raw };
}

export interface VariantMatch {
  matched: boolean;
  reason: string;
}

/**
 * Compares the variant the catalog asked for against the variant the page
 * actually has selected.
 *
 * Both RAM and storage must agree when both sides express RAM. If exactly one
 * side expresses RAM the comparison is AMBIGUOUS and is rejected - guessing
 * that "12 GB/512 GB" and "512 GB" are the same device is precisely the class
 * of error Phase 4 forbids.
 */
export function matchVariant(requested: string, observed: string): VariantMatch {
  const a = parseVariant(requested);
  const b = parseVariant(observed);

  if (!a.storage) return { matched: false, reason: `could not parse a storage capacity from the requested variant "${requested}"` };
  if (!b.storage) return { matched: false, reason: `could not parse a storage capacity from the observed variant "${observed}"` };

  if (a.storage !== b.storage) {
    return { matched: false, reason: `storage mismatch: requested ${a.storage}, page has ${b.storage}` };
  }

  const aHasRam = a.ram !== null;
  const bHasRam = b.ram !== null;

  if (aHasRam && bHasRam) {
    if (a.ram !== b.ram) {
      return { matched: false, reason: `RAM mismatch: requested ${a.ram}, page has ${b.ram}` };
    }
    return { matched: true, reason: `RAM and storage both match (${a.ram}/${a.storage})` };
  }

  if (aHasRam !== bHasRam) {
    return {
      matched: false,
      reason: `ambiguous variant: requested "${requested}" ${aHasRam ? 'specifies' : 'does not specify'} RAM but the page variant "${observed}" ${bHasRam ? 'does' : 'does not'} - refusing to guess`,
    };
  }

  return { matched: true, reason: `storage matches (${a.storage}); neither side expresses RAM` };
}

/** What the driver managed to read off a Cashify device page. */
export interface CashifyPageSnapshot {
  url: string;
  /** The device name as displayed (h1 / document title). */
  deviceName: string;
  /** The variant label that is actually SELECTED on the page. Empty when the
   * requested variant is not offered at all - which is a rejection, not a
   * licence to read whichever variant happened to be selected instead. */
  selectedVariant: string;
  /** Raw price text exactly as rendered, e.g. "₹15,140". */
  priceText: string;
  /** Every variant the page offered. Purely for the rejection message, so an
   * operator can see WHY a device didn't match without re-scraping. */
  availableVariants?: string[];
}

export interface IdentityVerdict {
  ok: boolean;
  confidence: MatchConfidence;
  evidence: string;
}

/**
 * The gate every scraped observation must pass before it is allowed anywhere
 * near a stored reference price. Device name must match EXACTLY after pure
 * formatting normalization, and the selected variant must match exactly.
 */
export function verifyPageIdentity(device: DeviceIdentity, snapshot: CashifyPageSnapshot): IdentityVerdict {
  const expected = canonicalDeviceName(device.brand, device.model);
  const observedName = stripTitleNoise(snapshot.deviceName ?? '');
  const observed = normalize(observedName);

  if (!observed) {
    return { ok: false, confidence: 'unmatched', evidence: 'page exposed no device name to verify against' };
  }

  if (expected !== observed) {
    return {
      ok: false,
      confidence: 'unmatched',
      evidence: `device-name mismatch: expected "${expected}" (from ${device.brand} / ${device.model}), page says "${observed}" ("${observedName}")`,
    };
  }

  const variant = matchVariant(device.storage, snapshot.selectedVariant ?? '');
  if (!variant.matched) {
    const offered = snapshot.availableVariants?.length
      ? ` (page offered: ${snapshot.availableVariants.join(', ')})`
      : '';
    return { ok: false, confidence: 'unmatched', evidence: `variant rejected: ${variant.reason}${offered}` };
  }

  return {
    ok: true,
    confidence: 'exact',
    evidence: `device name "${observedName}" and selected variant "${snapshot.selectedVariant}" both verified on ${snapshot.url} (${variant.reason})`,
  };
}

export interface PriceParse {
  ok: boolean;
  price?: number;
  reason?: string;
}

const FOREIGN_CURRENCY_RE = /(\$|€|£|¥|\bUSD\b|\bEUR\b|\bGBP\b|\bAED\b)/i;
const INR_RE = /(₹|\bINR\b|\bRs\.?\b)/i;

/**
 * Parses Cashify's rendered price text into rupees.
 *
 * Rejects anything that is not unambiguously an INR amount - a wrong-currency
 * value silently coerced to a number would poison the reference price with a
 * number ~85x too small, which is exactly the "wrong currency" case Phase 5
 * calls out.
 */
export function parsePriceText(priceText: string): PriceParse {
  const text = (priceText ?? '').trim();
  if (!text) return { ok: false, reason: 'empty price text' };

  if (FOREIGN_CURRENCY_RE.test(text)) {
    return { ok: false, reason: `price text "${text}" carries a non-INR currency marker` };
  }
  if (!INR_RE.test(text)) {
    return { ok: false, reason: `price text "${text}" has no INR currency marker (₹/INR/Rs) - refusing to assume the currency` };
  }

  // Pull the amount out of its currency marker rather than stripping
  // non-digits globally: "Rs. 15,140" would otherwise keep the "." from "Rs."
  // and parse as 0.15140, which rounds to 0 - a silently-destroyed price
  // dressed up as a successful parse.
  const amount =
    text.match(/(?:₹|INR|Rs\.?)\s*(-?[\d,]+(?:\.\d{1,2})?)/i)?.[1] ??
    text.match(/(-?[\d,]+(?:\.\d{1,2})?)/)?.[1];

  if (!amount || !/\d/.test(amount)) {
    return { ok: false, reason: `price text "${text}" contains no parseable amount` };
  }

  const value = Number(amount.replace(/,/g, ''));
  if (!Number.isFinite(value)) {
    return { ok: false, reason: `price text "${text}" did not parse to a finite number` };
  }
  if (value <= 0) {
    return { ok: false, reason: `price text "${text}" parsed to a non-positive value (${value})` };
  }

  return { ok: true, price: Math.round(value) };
}

/**
 * Builds the Cashify device-page slug for a variant, matching the URL shape
 * already present in the catalog's `cashifyLink` fields
 * (…/used-oppo-find-x9s-12-gb-512-gb). Only used when the catalog has no
 * explicit link for a device; a generated URL is still identity-verified
 * against the page it lands on, so a bad guess is rejected, never trusted.
 */
export function buildCashifySlug(device: DeviceIdentity): string {
  const brand = device.brand.toLowerCase().trim();
  const model = device.model.toLowerCase().trim();
  const modelWithoutBrand = model.startsWith(brand) ? model.slice(brand.length).trim() : model;
  const parts = [brand, modelWithoutBrand, device.storage ?? ''].join(' ');
  return parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCashifyUrl(device: DeviceIdentity): string {
  return `https://www.cashify.in/sell-old-mobile-phone/used-${buildCashifySlug(device)}`;
}
