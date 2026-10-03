import crypto from 'crypto';
import type { DiagnosticsType } from '../pricingCalculator';

/**
 * Signed, price-locked quote tokens (server only).
 *
 * The API returns one with every authoritative price. Lead creation honours
 * the token's price only if the signature is valid, it has not expired, and
 * it was issued for the same device and the same diagnostics - so a client
 * can neither invent a price nor reuse a good-condition quote for a
 * damaged-condition lead. Stateless: no quote table, survives restarts and
 * works across instances.
 *
 * The payload is signed, not encrypted - keep it free of internal figures.
 */

export const QUOTE_TOKEN_VERSION = 1;

export interface QuoteTokenPayload {
  v: typeof QUOTE_TOKEN_VERSION;
  /** reference-pricing deviceKey */
  dk: string;
  /** canonicalDiagnosticsHash() of the priced diagnostics */
  dh: string;
  /** locked customer price, whole rupees */
  p: number;
  /** PRICING_ENGINE_VERSION */
  pv: string;
  iat: number;
  exp: number;
}

export type QuoteTokenVerification =
  | { ok: true; payload: QuoteTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'unsupported_version' | 'expired' };

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

/** Order-insensitive hash of already-validated diagnostics. */
export function canonicalDiagnosticsHash(diagnostics: DiagnosticsType): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(diagnostics))).digest('base64url');
}

function sign(encodedPayload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function signQuoteToken(payload: QuoteTokenPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyQuoteToken(token: string, secret: string, nowSeconds: number): QuoteTokenVerification {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [encoded, signature] = parts;

  const expected = Buffer.from(sign(encoded, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: QuoteTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (payload?.v !== QUOTE_TOKEN_VERSION) return { ok: false, reason: 'unsupported_version' };
  if (
    typeof payload.dk !== 'string' ||
    typeof payload.dh !== 'string' ||
    typeof payload.pv !== 'string' ||
    !payload.pv ||
    !Number.isInteger(payload.p) ||
    payload.p <= 0 ||
    !Number.isInteger(payload.iat) ||
    payload.iat < 0 ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= payload.iat
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (nowSeconds >= payload.exp) return { ok: false, reason: 'expired' };

  return { ok: true, payload };
}
