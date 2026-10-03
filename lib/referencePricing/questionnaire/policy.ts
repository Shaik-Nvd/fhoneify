/**
 * When a model's questionnaire profile needs to be (re)learned. Keeps the
 * metadata crawl cheap: stable, recently verified models are reused.
 */
import type { CashifyQuestionnaireProfile } from './types';

export const QUESTIONNAIRE_MAX_AGE_DAYS = 30;

export type RefreshReason = 'new' | 'unknown' | 'failed' | 'stale' | 'parser_changed' | null;

export function refreshReason(
  profile: CashifyQuestionnaireProfile | null | undefined,
  params: { now: Date; parserVersion: string; maxAgeDays?: number }
): RefreshReason {
  if (!profile) return 'new';
  if (profile.status !== 'OK') return 'failed';
  if (profile.warrantyMode === 'UNKNOWN' || profile.billMode === 'UNKNOWN' || profile.ageMode === 'UNKNOWN') return 'unknown';
  if (profile.parserVersion !== params.parserVersion) return 'parser_changed';
  const ageMs = params.now.getTime() - Date.parse(profile.observedAt);
  if (!(ageMs < (params.maxAgeDays ?? QUESTIONNAIRE_MAX_AGE_DAYS) * 86400000)) return 'stale';
  return null;
}

/** A stored profile is a structural fact (which questions Cashify shows), so
 * it stays usable for exactly as long as the weekly crawl reuses it rather
 * than under the 14-day Get Upto price freshness window. */
export function isQuestionnaireProfileCurrent(observedAt: string | null | undefined, now: Date, maxAgeDays = QUESTIONNAIRE_MAX_AGE_DAYS): boolean {
  const t = observedAt ? Date.parse(observedAt) : NaN;
  return Number.isFinite(t) && Number.isFinite(now.getTime()) && t <= now.getTime() && now.getTime() - t < maxAgeDays * 86400000;
}
