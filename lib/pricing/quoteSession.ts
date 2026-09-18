/**
 * Keeps the quote page's signed prices across a page reload.
 *
 * The page used to hold its prices only in React state while the URL kept the
 * step, so a reload came back on the price screen with no price: "Get upto"
 * rendered `basePrice || 0` = ₹0, and the lead form would have submitted
 * `Number(null)` = 0 with empty answers. Only prices signed by the server are
 * stored here, together with the exact answers each was signed for, and a
 * restore is refused unless it is for the same device, positive, and unexpired
 * - in which case the page asks the server again rather than showing a number
 * it cannot stand behind.
 *
 * Browser-safe: storage is injected (sessionStorage in the page, a fake in
 * tests).
 */

export interface QuoteSessionDevice {
  brand: string;
  model: string;
  storage: string;
}

export interface SignedQuote {
  /** The device exactly as the page submitted it. */
  device: QuoteSessionDevice;
  /** POST /api/quote/price fhoneifyPrice - the price the customer is shown. */
  price: number;
  token: string;
  expiresAt: string;
  /** The exact answers the token was signed for; the lead must send these. */
  diagnostics: unknown;
}

export interface QuoteSession extends QuoteSessionDevice {
  v: 1;
  /** Perfect-condition ("Get upto") quote. */
  starting: SignedQuote | null;
  /** Quote for the customer's answers. */
  final: SignedQuote | null;
  /** The answers as the question screens hold them, to resume the flow. */
  answers: unknown;
  couponApplied: boolean;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const QUOTE_SESSION_KEY = 'fhoneify-quote-session';

export const sameDevice = (a: QuoteSessionDevice, b: QuoteSessionDevice) =>
  a.brand === b.brand && a.model === b.model && a.storage === b.storage;

/** A price the page may show for this device: signed, positive, unexpired. */
export function isUsableSignedQuote(q: unknown, device: QuoteSessionDevice, now: Date): q is SignedQuote {
  if (!q || typeof q !== 'object') return false;
  const s = q as SignedQuote;
  return (
    !!s.device &&
    sameDevice(s.device, device) &&
    typeof s.price === 'number' &&
    Number.isFinite(s.price) &&
    s.price > 0 &&
    typeof s.token === 'string' &&
    s.token.length > 0 &&
    typeof s.expiresAt === 'string' &&
    Date.parse(s.expiresAt) > now.getTime()
  );
}

export function saveQuoteSession(storage: KeyValueStorage, session: Omit<QuoteSession, 'v'>): void {
  try {
    storage.setItem(QUOTE_SESSION_KEY, JSON.stringify({ v: 1, ...session }));
  } catch {
    // Storage full or blocked: the page still works, it just re-prices after a reload.
  }
}

export function clearQuoteSession(storage: KeyValueStorage): void {
  try {
    storage.removeItem(QUOTE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Restores what is still valid for this device; drops anything that is not. */
export function loadQuoteSession(storage: KeyValueStorage, device: QuoteSessionDevice, now: Date): QuoteSession | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(QUOTE_SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== 1 || !sameDevice(parsed, device)) return null;
  return {
    v: 1,
    brand: parsed.brand,
    model: parsed.model,
    storage: parsed.storage,
    starting: isUsableSignedQuote(parsed.starting, device, now) ? parsed.starting : null,
    final: isUsableSignedQuote(parsed.final, device, now) ? parsed.final : null,
    answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : null,
    couponApplied: parsed.couponApplied === true,
  };
}
