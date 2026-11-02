/** Bonus is based on the original database reference, capped at INR 1,000. */
export function referenceBonus(reference: number): number {
  const rate = reference <= 20000 ? 0.08 : reference <= 50000 ? 0.06 : 0.04;
  return Math.min(reference * rate, 1000);
}
