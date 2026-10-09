import type { GlassShadowCandidate, GlassShadowResult } from './glassShadowCandidate';
import { boundedCompetitiveOffer, EXACT_FINAL_QUOTE_VERSION, type ExactFinalQuoteIndex } from './exactFinalQuote';
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
import { UNKNOWN_QUESTIONNAIRE, isQuestionMode, type QuestionnaireSemantics } from './questionnaireSemantics';
import { releaseCandidateOutcome, releaseSafetyInspectionReason, conditionClass, type ReleaseCandidateOutcome } from './releaseCandidate';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
import { workbookComponents, workbookStorageIdentity } from './teamWorkbookCandidate';
import { isReleaseEvidenceCurrent } from './releaseEvidenceAge';
import { applyCompetitorUplift } from '../pricingCalculator';
import { accessoryBasisForRoute, cleanAccessoryBaselineDiagnostics, getUptoIncludesAccessories, hasBox, hasVerifiedBoxIncludedRoute, isBoxIncludedIdentity, withoutBoxBonus, type AccessoryBasis } from './accessoryBasis';
import type { QuestionnaireProfileStore } from '../referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../referencePricing/questionnaire/types';
import { isQuestionnaireProfileCurrent } from '../referencePricing/questionnaire/policy';
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
  /** Hybrid overlays eligible corrections while keeping ordinary legacy quotes. */
  pricingMode?: 'legacy' | 'release-candidate' | 'hybrid';
  /** Explicit, audited exact-variant conditional traces; absent never inferred. */
  releaseRouteEvidence?: readonly WorkbookRouteEvidence[];
  /** Optional cache of exact observed final Selling prices; cache misses preserve hybrid behavior. */
  exactFinalQuoteIndex?: ExactFinalQuoteIndex;
  exactFinalQuoteOfferPolicy?: 'existing-uplift' | 'bounded-net';
  /** Offline injection only; no server configuration enables this shadow. */
  glassShadowCandidate?: GlassShadowCandidate;
}

export type PricingErrorCode =
  | 'INVALID_DIAGNOSTICS'
  | 'DEVICE_NOT_FOUND'
  | 'REFERENCE_PRICE_UNAVAILABLE'
  | 'PRICING_INVARIANT_VIOLATION'
  /** Release candidate only: no instant binding price for this condition. */
  | 'MANUAL_INSPECTION_REQUIRED';

export interface PricingFailure {
  ok: false;
  code: PricingErrorCode;
  message: string;
  /** Nonbinding context lets customers answer questions after a refused quote. */
  context?: { questionnaire: QuestionnaireSemantics; startingPrice: number; pricingVersion: string };
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
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback'; observedAt?: string; status?: string };
  /** Server-side only - never send to clients. */
  internal: {
    deviceKey: string;
    diagnosticsHash: string;
    cashifyGetUptoReference: number;
    baseSource: BaseSource;
    referenceSource: string | null;
    cashifyConditionEquivalent: number;
    accessoryBasis: AccessoryBasis;
    releaseCandidate?: ReleaseCandidateOutcome;
    routeEvidenceSha256?: string | null;
    glassShadow?: GlassShadowResult;
    exactFinalQuote?: { evidenceIds: string[]; fingerprint: string; observedAt: string; policy: string };
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
  tokenPricingVersion?: string | null;
  activePricingVersion?: string;
  accessoryBasis?: AccessoryBasis | null;
  releaseCandidate?: ReleaseCandidateOutcome | null;
  routeEvidenceSha256?: string | null;
  exactFinalQuote?: { evidenceIds: string[]; fingerprint: string; observedAt: string; policy: string } | null;
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

const ACCESSORY_ROUTE_CONDITIONS = new Set(['clean', 'body']);
export const RELEASE_CANDIDATE_PRICING_VERSION = `${PRICING_ENGINE_VERSION}+rc-verified-inputs-v6-no-legacy-binding-2026-10-03`;

export const HYBRID_PRICING_VERSION = `${PRICING_ENGINE_VERSION}+rc-hybrid-v1-2026-10-04`;

export function createPricingService(deps: PricingServiceDeps) {
  const hybrid = deps.pricingMode === 'hybrid';
  const releaseCandidate = hybrid || deps.pricingMode === 'release-candidate';
  const pricingVersion = hybrid ? HYBRID_PRICING_VERSION : releaseCandidate ? RELEASE_CANDIDATE_PRICING_VERSION : PRICING_ENGINE_VERSION;
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

  async function lookupQuestionnaire(device: { brand: string; model: string }): Promise<AuthoritativeQuote['questionnaire']> {
    if (!deps.questionnaireStore) return { ...UNKNOWN_QUESTIONNAIRE, source: 'fallback' };
    const modelKey = questionnaireModelKey(device);
    try {
      const profile = await withTimeout(deps.questionnaireStore.get(modelKey), deps.referenceLookupTimeoutMs);
      if (profile) return { warrantyMode: isQuestionMode(profile.warrantyMode) ? profile.warrantyMode : 'UNKNOWN', billMode: isQuestionMode(profile.billMode) ? profile.billMode : 'UNKNOWN', ageMode: isQuestionMode(profile.ageMode) ? profile.ageMode : 'UNKNOWN', source: 'profile', ...(releaseCandidate ? { observedAt: profile.observedAt, status: profile.status } : {}) };
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
    // Missing is not "No": where the bill question is shown, an exact value
    // needs the answer rather than silently depreciating (or crediting) it.
    if (questionnaire.billMode !== 'NOT_ASKED' && diagnostics.validBill === null && !(diagnostics.accessories || []).includes('bill')) {
      return { ok: false, code: 'INVALID_DIAGNOSTICS', message: 'validBill: required for this device' };
    }

    const at = now();
    const base = resolveReference({ device, repositoryRecord: reference.record, snapshot: deps.snapshot, now: at });

    if (!base || (deps.strictReferenceMode && base.source === 'catalog_base_price')) {
      deps.logger.warn({ deviceKey: key, baseSource: base?.source ?? null, strict: deps.strictReferenceMode }, 'Quote refused: no usable reference price');
      return { ok: false, code: 'REFERENCE_PRICE_UNAVAILABLE', message: 'Reference price unavailable for this device' };
    }

    const legacyQuestionnaire = { ...questionnaire };
    let quotePricingVersion = pricingVersion;
    const route = releaseCandidate ? deps.releaseRouteEvidence?.find(r => r.brand === device.brand && r.model === device.model && workbookStorageIdentity(r.storage) === workbookStorageIdentity(device.storage)) : undefined;
    if (route && questionnaire.source === 'profile' && questionnaire.status === 'OK' &&
      /^[a-f0-9]{64}$/.test(route.evidenceSha256) && isReleaseEvidenceCurrent(route.observedAt, at) &&
      (['warrantyMode', 'billMode', 'ageMode'] as const).every(k => questionnaire[k] === route.semantics[k])) {
      Object.assign(questionnaire, { boxMode: route.boxMode, chargerMode: route.chargerMode, sPenMode: route.sPenMode, eSimMode: route.eSimMode });
    }
    let result;
    let startingPrice;
    let accessoryBasis: AccessoryBasis = 'LEGACY_BOX_BONUS';
    let rc: ReleaseCandidateOutcome | null = null;
    let exactFinalQuote: AuthoritativeQuote['internal']['exactFinalQuote'];
    try {
      // The quote page passes the brand/model exactly as selected; pricing
      // with the catalog's own strings keeps the engine's model matching
      // identical for both.
      result = priceDevice(device.brand, device.model, base.cashifyGetUptoReference, diagnostics, hybrid ? legacyQuestionnaire : questionnaire);
      const exact = hybrid && deps.exactFinalQuoteIndex ? deps.exactFinalQuoteIndex.find({ device, diagnostics,
        reference: base.cashifyGetUptoReference, referenceVerifiedAt: base.referenceLastVerifiedAt, questionnaire, route, now: at,
        referenceExact: base.source === 'reference_repository' && base.referenceStatus === 'fresh' && base.referenceSource === 'cashify' && !reference.degraded &&
          reference.record?.matchConfidence === 'exact' && reference.record?.deviceKey === key && reference.record?.brand === device.brand &&
          reference.record?.model === device.model && workbookStorageIdentity(reference.record?.storage ?? '') === workbookStorageIdentity(device.storage) }) : null;
      if (exact?.matched && !releaseSafetyInspectionReason(device, diagnostics, true)) {
        const policy = deps.exactFinalQuoteOfferPolicy ?? 'existing-uplift';
        result = { cashifyConditionEquivalent: exact.sellingPrice, fhoneifyPrice: policy === 'bounded-net'
          ? boundedCompetitiveOffer(base.cashifyGetUptoReference, exact.sellingPrice) : applyCompetitorUplift(base.cashifyGetUptoReference, exact.sellingPrice) };
        accessoryBasis = 'OBSERVED_FINAL_SELLING_PRICE';
        exactFinalQuote = { evidenceIds: exact.evidenceIds, fingerprint: exact.fingerprint, observedAt: exact.observedAt, policy };
        rc = { kind: 'VERIFIED', cashifyConditionEquivalent: exact.sellingPrice, rule: EXACT_FINAL_QUOTE_VERSION, evidence: exact.fingerprint, conditionClass: conditionClass(diagnostics) };
        quotePricingVersion = `${HYBRID_PRICING_VERSION}+${EXACT_FINAL_QUOTE_VERSION}+${policy}+${exact.fingerprint}`;
      } else if (releaseCandidate) {
        const legacyResult = result;
        let correctionRejectionReason: string | null = null;
        const correctionFailure = (() : PricingFailure | undefined => {
          rc = releaseCandidateOutcome({ device, reference: base.cashifyGetUptoReference, referenceFresh: base.referenceStatus === 'fresh',
            referenceSource: base.referenceSource, baseSource: base.source, referenceLastVerifiedAt: base.referenceLastVerifiedAt,
            referenceExact: reference.record?.matchConfidence === 'exact' && reference.record?.deviceKey === key &&
              reference.record?.brand === device.brand && reference.record?.model === device.model &&
              workbookStorageIdentity(reference.record?.storage ?? '') === workbookStorageIdentity(device.storage) && !reference.degraded,
            questionnaire, routeEvidence: deps.releaseRouteEvidence, diagnostics, now: at });
          if (rc.kind === 'MANUAL_INSPECTION_REQUIRED') {
            correctionRejectionReason = rc.reason;
            deps.logger.info({ deviceKey: key, reason: rc.reason, pricingVersion, reference: base.cashifyGetUptoReference, referenceSource: base.referenceSource,
              questionnaire, conditionClass: rc.conditionClass, routeEvidenceSha256: route?.evidenceSha256 ?? null }, 'Release candidate: manual inspection required');
            return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'We need to inspect this phone before we can quote a price',
              context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
          }
          if (rc.kind === 'VERIFIED') {
            accessoryBasis = 'CALIBRATED_ROUTE_ACCESSORIES';
            if (getUptoIncludesAccessories(device, questionnaire, route, rc.rule !== 'fresh-glass')) accessoryBasis = accessoryBasisForRoute(route!);
            result = { cashifyConditionEquivalent: rc.cashifyConditionEquivalent,
              fhoneifyPrice: applyCompetitorUplift(base.cashifyGetUptoReference, rc.cashifyConditionEquivalent) };
          }
          if (rc.kind === 'LEGACY' && isBoxIncludedIdentity(device)) {
            const routeFresh = route && /^[a-f0-9]{64}$/.test(route.evidenceSha256) && isReleaseEvidenceCurrent(route.observedAt, at);
            const profileFresh = questionnaire.status === 'OK' && isQuestionnaireProfileCurrent(questionnaire.observedAt, at);
            const exactReference = base.source === 'reference_repository' && base.referenceStatus === 'fresh' && base.referenceSource === 'cashify' &&
              !!base.referenceLastVerifiedAt && reference.record?.matchConfidence === 'exact' && reference.record?.deviceKey === key &&
              reference.record.brand === device.brand && reference.record.model === device.model &&
              workbookStorageIdentity(reference.record.storage) === workbookStorageIdentity(device.storage) && !reference.degraded;
            if (!routeFresh || !profileFresh || !exactReference || !hasVerifiedBoxIncludedRoute(device, questionnaire, route) ||
              route!.baselineGetUpto == null || (route!.baselineGetUpto !== base.cashifyGetUptoReference && rc.conditionClass !== 'clean')) {
              return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'Accessory route or clean-reference evidence needs revalidation',
                context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
            }
            // Matched controls on these routes support the clean rule and the
            // legacy deltas for exactly "More than 2 scratches" and "Major
            // dent(s)" (6/6 within 3%, all underpaid; 2/2 independent within
            // 2.04%). Screen/glass deltas overpaid (OnePlus 9: +7.9%, +26.3%);
            // other body subtypes, panel, bent and functional were never measured.
            const components = workbookComponents(diagnostics);
            if (!ACCESSORY_ROUTE_CONDITIONS.has(rc.conditionClass) || !components || components.length > 1 ||
              components.some(c => c !== 'body_heavy' && c !== 'body_dents')) {
              return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'This condition is not validated on the accessory-corrected route',
                context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
            }
            // Same answer strictness as the verified candidates: on these
            // NOT_ASKED routes no ownership/eSIM answer exists, and only box and
            // charger are accessories Cashify asks about.
            const accessories = diagnostics.accessories ?? [];
            if (diagnostics.warranty != null || diagnostics.validBill != null || diagnostics.mobileAge != null || diagnostics.eSim != null ||
              accessories.some(a => a !== 'box' && a !== 'charger') || (diagnostics.box === true && !accessories.includes('box'))) {
              return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'We need to inspect this phone before we can quote a price',
                context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
            }
            const boxAndChargerPresent = hasBox(diagnostics) && diagnostics.box !== false &&
              (route!.chargerMode !== 'ASKED' || (diagnostics.charger !== false && (diagnostics.charger === true || accessories.includes('charger'))));
            if (!boxAndChargerPresent) {
              return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'Missing accessory deductions are not verified for this route',
                context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
            }
            const withoutBox = (d: typeof diagnostics) => priceDevice(device.brand, device.model, base.cashifyGetUptoReference, withoutBoxBonus(d), questionnaire);
            const cleanEngine = withoutBox(cleanAccessoryBaselineDiagnostics(diagnostics));
            const conditionEngine = withoutBox(diagnostics);
            const measuredClean = Math.round((base.cashifyGetUptoReference - 20) / 10) * 10;
            const correctedEquivalent = Math.max(0, Math.round((measuredClean + conditionEngine.cashifyConditionEquivalent - cleanEngine.cashifyConditionEquivalent) / 10) * 10);
            result = { cashifyConditionEquivalent: correctedEquivalent,
              fhoneifyPrice: applyCompetitorUplift(base.cashifyGetUptoReference, correctedEquivalent) };
            accessoryBasis = accessoryBasisForRoute(route!);
          }
        // Defence in depth for the launch policy: in release mode a binding price
        // comes only from a verified candidate or the accessory-corrected route.
        if (rc && rc.kind !== 'VERIFIED' && !accessoryBasis.startsWith('GET_UPTO_INCLUDES')) {
          return { ok: false, code: 'MANUAL_INSPECTION_REQUIRED', message: 'We need to inspect this phone before we can quote a price',
            context: { questionnaire, startingPrice: computeFhoneifyGetUpto(base.cashifyGetUptoReference), pricingVersion } };
        }
          return undefined;
        })();
        if (correctionFailure) {
          if (!hybrid || correctionFailure.code !== 'MANUAL_INSPECTION_REQUIRED' || releaseSafetyInspectionReason(device, diagnostics, true)) return correctionFailure;
          // Evidence guards reject the correction, not ordinary quote availability.
          // Restore the exact legacy calculation and questionnaire from this same
          // reference/profile lookup; never infer or re-anchor a measured deduction.
          result = legacyResult;
          for (const field of ['boxMode', 'chargerMode', 'sPenMode', 'eSimMode'] as const) delete (questionnaire as unknown as Record<string, unknown>)[field];
          Object.assign(questionnaire, legacyQuestionnaire);
          accessoryBasis = 'LEGACY_BOX_BONUS';
          rc = { kind: 'LEGACY', flag: 'UNVALIDATED_LEGACY', reason: correctionRejectionReason ?? correctionFailure.message, conditionClass: conditionClass(diagnostics) };
          quotePricingVersion = `${HYBRID_PRICING_VERSION}+legacy-fallback`;
          deps.logger.info({ deviceKey: key, reason: correctionRejectionReason ?? correctionFailure.message, pricingVersion: quotePricingVersion }, 'Hybrid correction ineligible; unchanged legacy quote selected');
        } else if (hybrid) {
          quotePricingVersion = `${HYBRID_PRICING_VERSION}+verified`;
        }
      }
      // Get Upto: the reference plus the uplift, nothing else.
      startingPrice = computeFhoneifyGetUpto(base.cashifyGetUptoReference);
    } catch (err) {
      if (err instanceof PricingInvariantError) {
        deps.logger.error({ deviceKey: key, ...err.details, reason: err.message }, 'Pricing invariant violated; quote refused');
        return { ok: false, code: 'PRICING_INVARIANT_VIOLATION', message: 'Unable to price this device right now' };
      }
      throw err;
    }

    let glassShadow: GlassShadowResult | undefined;
    if (deps.glassShadowCandidate) {
      try {
        glassShadow = deps.glassShadowCandidate({ device, diagnostics, reference: base.cashifyGetUptoReference,
          referenceVerifiedAt: base.referenceLastVerifiedAt, questionnaire: legacyQuestionnaire, route, now: at,
          referenceExact: base.source === 'reference_repository' && base.referenceStatus === 'fresh' && base.referenceSource === 'cashify' && !reference.degraded &&
            reference.record?.matchConfidence === 'exact' && reference.record?.deviceKey === key && reference.record?.brand === device.brand &&
            reference.record?.model === device.model && workbookStorageIdentity(reference.record?.storage ?? '') === workbookStorageIdentity(device.storage) });
      } catch {
        glassShadow = { supported: false, researchOnly: true, version: 'conditional-glass-shadow/v1', reason: 'SHADOW_EVALUATION_FAILED' };
      }
    }
    const diagnosticsHash = canonicalDiagnosticsHash(diagnostics);
    const iat = Math.floor(at.getTime() / 1000);
    const exp = iat + deps.tokenTtlSeconds;
    const quoteToken = signQuoteToken(
      { v: QUOTE_TOKEN_VERSION, dk: key, dh: diagnosticsHash, p: result.fhoneifyPrice, pv: quotePricingVersion, iat, exp },
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
      pricingVersion: quotePricingVersion,
      referenceStatus: base.referenceStatus,
      referenceLastVerifiedAt: base.referenceLastVerifiedAt,
      referenceLookupDegraded: reference.degraded,
      questionnaire,
      internal: {
        ...(glassShadow ? { glassShadow } : {}),
        deviceKey: key,
        diagnosticsHash,
        cashifyGetUptoReference: base.cashifyGetUptoReference,
        baseSource: base.source,
        referenceSource: base.referenceSource,
        cashifyConditionEquivalent: result.cashifyConditionEquivalent,
        accessoryBasis,
        ...(exactFinalQuote ? { exactFinalQuote } : {}),
        ...(rc ? { releaseCandidate: rc, routeEvidenceSha256: route?.evidenceSha256 ?? null } : {}),
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
    // A previously signed legacy price must not bypass an inspection decision.
    if (!current.ok && current.code === 'MANUAL_INSPECTION_REQUIRED') return current;
    const activePricingVersion = current.ok ? current.pricingVersion : pricingVersion;
    const clientQuotedPrice = typeof input.clientQuotedPrice === 'number' ? input.clientQuotedPrice : null;

    let tokenRejectedReason: string | null = null;
    let tokenPrice: number | null = null;
    let tokenIssuedAt: string | null = null;
    let tokenPricingVersion: string | null = null;

    if (input.quoteToken) {
      const verification = verifyQuoteToken(input.quoteToken, deps.signingSecret, Math.floor(now().getTime() / 1000));
      if (!verification.ok) {
        tokenRejectedReason = verification.reason;
      } else if (verification.payload.pv !== activePricingVersion && (releaseCandidate || verification.payload.pv.includes('+rc-'))) {
        tokenRejectedReason = 'pricing_version_changed';
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
          tokenPricingVersion = verification.payload.pv;
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
      pricingVersion: tokenPricingVersion ?? activePricingVersion,
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
      tokenPricingVersion, activePricingVersion,
      accessoryBasis: current.ok ? current.internal.accessoryBasis : null,
      releaseCandidate: current.ok ? current.internal.releaseCandidate ?? null : null,
      routeEvidenceSha256: current.ok ? current.internal.routeEvidenceSha256 ?? null : null,
      exactFinalQuote: current.ok ? current.internal.exactFinalQuote ?? null : null,
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
