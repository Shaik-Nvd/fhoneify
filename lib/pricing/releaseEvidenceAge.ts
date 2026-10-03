/** Fixed validity of release evidence (route traces, calibrations): 14 days
 * from observation, never in the future. Deliberately independent of the
 * env-tunable Get Upto freshness policy, so tuning reference staleness can
 * never extend (or, with a bad value, disable) evidence expiry. */
export const RELEASE_EVIDENCE_MAX_AGE_DAYS = 14;
export function isReleaseEvidenceCurrent(observedAt: string | null | undefined, now: Date): boolean {
  const t = observedAt ? Date.parse(observedAt) : NaN, n = now.getTime();
  return Number.isFinite(t) && Number.isFinite(n) && t <= n && n - t < RELEASE_EVIDENCE_MAX_AGE_DAYS * 86400000;
}
