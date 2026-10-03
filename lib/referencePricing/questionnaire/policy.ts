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
 * it stays usable for as long as the weekly crawl keeps it current, not under
 * the 14-day Get Upto price freshness window. */
/** The weekly crawl (Wednesdays) re-learns a profile only once it is
 * QUESTIONNAIRE_MAX_AGE_DAYS old, so under normal operation a profile can be
 * up to max age + 7 days old before its replacement lands; +1 day of slack. */
export const QUESTIONNAIRE_USABLE_DAYS = QUESTIONNAIRE_MAX_AGE_DAYS + 8;
export function isQuestionnaireProfileCurrent(observedAt: string | null | undefined, now: Date, maxAgeDays = QUESTIONNAIRE_USABLE_DAYS): boolean {
  const t = observedAt ? Date.parse(observedAt) : NaN;
  return Number.isFinite(t) && Number.isFinite(now.getTime()) && t <= now.getTime() && now.getTime() - t < maxAgeDays * 86400000;
}
