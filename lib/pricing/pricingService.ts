import type { ReferencePriceRepository } from '../referencePricing/store';
import type { ReferencePriceRecord } from '../referencePricing/types';
import { deviceKey } from '../referencePricing/types';
import { CatalogDevice, findCatalogDevice } from './catalog';
import { parseDiagnostics } from './diagnostics';
import {
  BaseSource,
  PRICING_ENGINE_VERSION,
  PricingInvariantError,
  QuoteReferenceStatus,
  computeFhoneifyGetUpto,
  priceDevice,
  resolveReference,
} from './engine';
import { UNKNOWN_QUESTIONNAIRE, type QuestionnaireSemantics } from './questionnaireSemantics';
import type { QuestionnaireProfileStore } from '../referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../referencePricing/questionnaire/types';
import { QUOTE_TOKEN_VERSION, canonicalDiagnosticsHash, signQuoteToken, verifyQuoteToken } from './quoteToken';

/**
 * Server-authoritative pricing: device resolution -> Cashify Get Upto
 * reference -> methodology -> guardrails -> signed quote. Dependencies are
 * injected so tests run against an in-memory repository instead of the
 * live database; server/modules/quote/pricing.ts wires the real ones.
 */

export interface PricingLogger {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export interface PricingServiceDeps {
  repository: ReferencePriceRepository;
  signingSecret: string;
  tokenTtlSeconds: number;
  /** QUOTE_STRICT_REFERENCE_MODE: refuse to quote devices whose only price is
   * the catalog basePrice (no reference data of any kind). */
  strictReferenceMode: boolean;
  referenceLookupTimeoutMs: number;
  logger: PricingLogger;
  catalog?: CatalogDevice[];
  snapshot?: Record<string, number>;
  now?: () => Date;
  /** Cashify questionnaire profiles per model. Absent or unreadable = the
   * explicit UNKNOWN fallback (every question asked, answers priced as given). */
  questionnaireStore?: QuestionnaireProfileStore;
}

export type PricingErrorCode =
  | 'INVALID_DIAGNOSTICS'
  | 'DEVICE_NOT_FOUND'
  | 'REFERENCE_PRICE_UNAVAILABLE'
  | 'PRICING_INVARIANT_VIOLATION';

export interface PricingFailure {
  ok: false;
  code: PricingErrorCode;
  message: string;
}

export interface AuthoritativeQuote {
  ok: true;
  device: { brand: string; model: string; storage: string };
  /** Fhoneify final offer for these answers. */
  fhoneifyPrice: number;
  /** Fhoneify Get Upto: Cashify's Get Upto plus the uplift, no deductions. */
  startingPrice: number;
  quoteToken: string;
  expiresAt: string;
  pricingVersion: string;
  referenceStatus: QuoteReferenceStatus;
  referenceLastVerifiedAt: string | null;
  /** True when the repository could not be read and the materialized
   * snapshot was used instead. */
  referenceLookupDegraded: boolean;
  /** Which questions Cashify asks for this model; the quote page shows
   * exactly these (UNKNOWN = asked, as the safe fallback). */
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback' };
  /** Server-side only - never send to clients. */
  internal: {
    deviceKey: string;
    diagnosticsHash: string;
    cashifyGetUptoReference: number;
    baseSource: BaseSource;
    referenceSource: string | null;
    cashifyConditionEquivalent: number;
  };
}

/** Persisted with the lead so every stored price is auditable. */
export interface LeadPricingAudit {
  priceSource: 'quote_token' | 'recomputed';
  fhoneifyPrice: number;
  pricingVersion: string;
  pricedAt: string;
  tokenIssuedAt: string | null;
  tokenRejectedReason: string | null;
  clientQuotedPrice: number | null;
  clientPriceMismatch: boolean;
  currentPrice: number | null;
  cashifyGetUptoReference: number | null;
  baseSource: BaseSource | null;
  cashifyConditionEquivalent: number | null;
  fhoneifyGetUpto: number | null;
  questionnaire: (QuestionnaireSemantics & { source: 'profile' | 'fallback' }) | null;
  referenceStatus: QuoteReferenceStatus | null;
  referenceSource: string | null;
  referenceLastVerifiedAt: string | null;
}

export interface VerifiedLeadPrice {
  ok: true;
  price: number;
  diagnostics: import('../pricingCalculator').DiagnosticsType;
  audit: LeadPricingAudit;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createPricingService(deps: PricingServiceDeps) {
  if (!deps.signingSecret || deps.signingSecret.length < 32) {
    throw new Error('Quote signing secret must be at least 32 characters');
  }
  const now = deps.now ?? (() => new Date());

  async function lookupReference(key: string): Promise<{ record: ReferencePriceRecord | null; degraded: boolean }> {
    try {
      return { record: await withTimeout(deps.repository.get(key), deps.referenceLookupTimeoutMs), degraded: false };
    } catch (err: any) {
      // The materialized snapshot is exported from this same repository, so
      // it is the correct fallback - a DB blip must not take quoting down.
      deps.logger.error({ deviceKey: key, err: err?.message }, 'Reference price lookup failed; falling back to materialized snapshot');
      return { record: null, degraded: true };
    }
  }

  async function lookupQuestionnaire(device: { brand: string; model: string }): Promise<QuestionnaireSemantics & { source: 'profile' | 'fallback' }> {
    if (!deps.questionnaireStore) return { ...UNKNOWN_QUESTIONNAIRE, source: 'fallback' };
    const modelKey = questionnaireModelKey(device);
    try {
      const profile = await withTimeout(deps.questionnaireStore.get(modelKey), deps.referenceLookupTimeoutMs);
      if (profile) return { warrantyMode: profile.warrantyMode, billMode: profile.billMode, ageMode: profile.ageMode, source: 'profile' };
    } catch (err: any) {
      deps.logger.warn({ modelKey, err: err?.message }, 'Questionnaire profile lookup failed; using the UNKNOWN fallback');
    }
    return { ...UNKNOWN_QUESTIONNAIRE, source: 'fallback' };
  }

  async function quote(input: { brand: string; model: string; storage: string; diagnostics: unknown }): Promise<AuthoritativeQuote | PricingFailure> {
    const parsed = parseDiagnostics(input.diagnostics);
    if (!parsed.ok) return { ok: false, code: 'INVALID_DIAGNOSTICS', message: parsed.error };
    const diagnostics = parsed.value;

    const device = findCatalogDevice(input.brand, input.model, input.storage, deps.catalog);
    if (!device) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device not found' };

    const key = deviceKey({ brand: device.brand, model: device.model, storage: device.storage });
    const [reference, questionnaire] = await Promise.all([lookupReference(key), lookupQuestionnaire(device)]);
    const at = now();
    const base = resolveReference({ device, repositoryRecord: reference.record, snapshot: deps.snapshot, now: at });

    if (!base || (deps.strictReferenceMode && base.source === 'catalog_base_price')) {
      deps.logger.warn({ deviceKey: key, baseSource: base?.source ?? null, strict: deps.strictReferenceMode }, 'Quote refused: no usable reference price');
      return { ok: false, code: 'REFERENCE_PRICE_UNAVAILABLE', message: 'Reference price unavailable for this device' };
    }

    let result;
    let startingPrice;
    try {
      // The quote page passes the brand/model exactly as selected; pricing
      // with the catalog's own strings keeps the engine's model matching
      // identical for both.
      result = priceDevice(device.brand, device.model, base.cashifyGetUptoReference, diagnostics, questionnaire);
      // Get Upto: the reference plus the uplift, nothing else.
      startingPrice = computeFhoneifyGetUpto(base.cashifyGetUptoReference);
    } catch (err) {
      if (err instanceof PricingInvariantError) {
        deps.logger.error({ deviceKey: key, ...err.details, reason: err.message }, 'Pricing invariant violated; quote refused');
        return { ok: false, code: 'PRICING_INVARIANT_VIOLATION', message: 'Unable to price this device right now' };
      }
      throw err;
    }

    const diagnosticsHash = canonicalDiagnosticsHash(diagnostics);
    const iat = Math.floor(at.getTime() / 1000);
    const exp = iat + deps.tokenTtlSeconds;
    const quoteToken = signQuoteToken(
      { v: QUOTE_TOKEN_VERSION, dk: key, dh: diagnosticsHash, p: result.fhoneifyPrice, pv: PRICING_ENGINE_VERSION, iat, exp },
      deps.signingSecret
    );

    if (questionnaire.source === 'fallback' || questionnaire.warrantyMode === 'UNKNOWN') {
      // Telemetry: priced with every question asked, no stored Cashify profile.
      deps.logger.info({ deviceKey: key, questionnaire }, 'Quote priced with the UNKNOWN questionnaire fallback');
    }
    if (base.referenceStatus !== 'fresh') {
      deps.logger.info({ deviceKey: key, referenceStatus: base.referenceStatus, baseSource: base.source }, 'Quote priced from a non-fresh reference');
    }

    return {
      ok: true,
      device: { brand: device.brand, model: device.model, storage: device.storage },
      fhoneifyPrice: result.fhoneifyPrice,
      startingPrice,
      quoteToken,
      expiresAt: new Date(exp * 1000).toISOString(),
      pricingVersion: PRICING_ENGINE_VERSION,
      referenceStatus: base.referenceStatus,
      referenceLastVerifiedAt: base.referenceLastVerifiedAt,
      referenceLookupDegraded: reference.degraded,
      questionnaire,
      internal: {
        deviceKey: key,
        diagnosticsHash,
        cashifyGetUptoReference: base.cashifyGetUptoReference,
        baseSource: base.source,
        referenceSource: base.referenceSource,
        cashifyConditionEquivalent: result.cashifyConditionEquivalent,
      },
    };
  }

  /** Fhoneify Get Upto only (homepage cards): the same reference lookup and
   * computeFhoneifyGetUpto as quote(), with no answers and no token. */
  async function getUpto(input: { brand: string; model: string; storage: string }): Promise<
    { ok: true; device: { brand: string; model: string; storage: string }; startingPrice: number; referenceStatus: QuoteReferenceStatus } | PricingFailure
  > {
    const device = findCatalogDevice(input.brand, input.model, input.storage, deps.catalog);
    if (!device) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device not found' };
    const key = deviceKey({ brand: device.brand, model: device.model, storage: device.storage });
    const reference = await lookupReference(key);
    const base = resolveReference({ device, repositoryRecord: reference.record, snapshot: deps.snapshot, now: now() });
    if (!base || (deps.strictReferenceMode && base.source === 'catalog_base_price')) {
      return { ok: false, code: 'REFERENCE_PRICE_UNAVAILABLE', message: 'Reference price unavailable for this device' };
    }
    return {
      ok: true,
      device: { brand: device.brand, model: device.model, storage: device.storage },
      startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference),
      referenceStatus: base.referenceStatus,
    };
  }

  /**
   * The price a lead is stored with. Never the client's number: a valid token
   * for this exact device + diagnostics locks its price; otherwise the price
   * is recomputed now. The client's figure is kept only as audit evidence.
   */
  async function verifyLeadPrice(input: {
    brand: string;
    model: string;
    storage: string;
    diagnostics: unknown;
    quoteToken?: string | null;
    clientQuotedPrice?: number | null;
  }): Promise<VerifiedLeadPrice | PricingFailure> {
    const current = await quote(input);
    const clientQuotedPrice = typeof input.clientQuotedPrice === 'number' ? input.clientQuotedPrice : null;

    let tokenRejectedReason: string | null = null;
    let tokenPrice: number | null = null;
    let tokenIssuedAt: string | null = null;

    if (input.quoteToken) {
      const verification = verifyQuoteToken(input.quoteToken, deps.signingSecret, Math.floor(now().getTime() / 1000));
      if (!verification.ok) {
        tokenRejectedReason = verification.reason;
      } else if (!current.ok && current.code === 'INVALID_DIAGNOSTICS') {
        tokenRejectedReason = 'invalid_diagnostics';
      } else {
        const parsed = parseDiagnostics(input.diagnostics);
        const device = findCatalogDevice(input.brand, input.model, input.storage, deps.catalog);
        const key = device ? deviceKey({ brand: device.brand, model: device.model, storage: device.storage }) : null;
        if (verification.payload.dk !== key) tokenRejectedReason = 'device_mismatch';
        else if (!parsed.ok || verification.payload.dh !== canonicalDiagnosticsHash(parsed.value)) tokenRejectedReason = 'diagnostics_mismatch';
        else {
          tokenPrice = verification.payload.p;
          tokenIssuedAt = new Date(verification.payload.iat * 1000).toISOString();
        }
      }
    }

    if (tokenPrice === null && !current.ok) return current;

    const price = tokenPrice ?? (current as AuthoritativeQuote).fhoneifyPrice;
    const parsed = parseDiagnostics(input.diagnostics);
    if (!parsed.ok) return { ok: false, code: 'INVALID_DIAGNOSTICS', message: parsed.error };

    const audit: LeadPricingAudit = {
      priceSource: tokenPrice !== null ? 'quote_token' : 'recomputed',
      fhoneifyPrice: price,
      pricingVersion: PRICING_ENGINE_VERSION,
      pricedAt: now().toISOString(),
      tokenIssuedAt,
      tokenRejectedReason,
      clientQuotedPrice,
      clientPriceMismatch: clientQuotedPrice !== null && clientQuotedPrice !== price,
      currentPrice: current.ok ? current.fhoneifyPrice : null,
      cashifyGetUptoReference: current.ok ? current.internal.cashifyGetUptoReference : null,
      baseSource: current.ok ? current.internal.baseSource : null,
      cashifyConditionEquivalent: current.ok ? current.internal.cashifyConditionEquivalent : null,
      fhoneifyGetUpto: current.ok ? current.startingPrice : null,
      questionnaire: current.ok ? current.questionnaire : null,
      referenceStatus: current.ok ? current.referenceStatus : null,
      referenceSource: current.ok ? current.internal.referenceSource : null,
      referenceLastVerifiedAt: current.ok ? current.referenceLastVerifiedAt : null,
    };

    if (tokenRejectedReason) {
      deps.logger.warn({ brand: input.brand, model: input.model, storage: input.storage, reason: tokenRejectedReason }, 'Quote token rejected; lead price recomputed');
    }
    if (audit.clientPriceMismatch) {
      deps.logger.warn({ brand: input.brand, model: input.model, storage: input.storage, clientQuotedPrice, price, priceSource: audit.priceSource }, 'Client-submitted lead price differs from authoritative price; stored authoritative price');
    }

    return { ok: true, price, diagnostics: parsed.value, audit };
  }

  return { quote, getUpto, verifyLeadPrice };
}

export type PricingService = ReturnType<typeof createPricingService>;
