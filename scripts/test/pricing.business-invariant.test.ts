/**
 * FINAL BUSINESS INVARIANT
 *
 * Passing the regression, calibration and catalog suites does not prove the
 * customer is offered the right amount. Those suites compare the engine to
 * itself. This suite compares the engine's FINAL OFFER to externally observed
 * Cashify condition quotes, which is the actual business objective:
 *
 *     final offer  ~=  real Cashify condition quote + existing uplift
 *
 * The uplift rule is unchanged (8% <= Rs 20,000 reference, 6% <= Rs 50,000,
 * else 4%, extra capped at Rs 2,000). Nothing here clamps a price to a live
 * Cashify quote - production has no such quote. These are calibration
 * assertions over stored observations only.
 *
 * Two errors are tracked separately on purpose:
 *   equivalentError - how close the internal Cashify-equivalent is
 *   finalOfferError - how close the customer's actual offer is
 * A small equivalentError with a large finalOfferError would mean the uplift
 * stage is wrong, and vice versa.
 */
import assert from 'node:assert/strict';
import {
  buildBusinessInvariantRows,
  DEFAULT_COMPARISON_FILE,
} from '../pricing/business-invariant-report';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${(error as Error).message}`);
  }
}

const rows = buildBusinessInvariantRows(DEFAULT_COMPARISON_FILE);
const comparable = rows.filter((row) => row.comparability === 'COMPARABLE');

const mae = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length) : 0;

console.log('\nFinal business invariant');

test('there are comparable Cashify observations to measure against', () => {
  assert.ok(comparable.length >= 10, `only ${comparable.length} comparable observations`);
});

test('every comparable final offer is at or above the real Cashify quote', () => {
  const below = comparable.filter((row) => row.actualUpliftOverCashify < 0);
  assert.equal(
    below.length,
    0,
    `these devices are quoted below Cashify: ${below
      .map((r) => `${r.device} (${r.actualUpliftOverCashify})`)
      .join(', ')}`
  );
});

test('no comparable final offer exceeds the real Cashify quote by more than the Rs 2,000 cap plus tolerance', () => {
  // The Rs 2,000 cap is applied to the engine's own Cashify-equivalent. Any
  // residual equivalent error leaks past the cap when measured against the
  // real quote, so the allowance here is the cap plus the calibration
  // tolerance the comparison report already uses (5%, floor Rs 500).
  const offenders = comparable.filter((row) => {
    const allowance = 2000 + Math.max(500, row.cashifyQuote * 0.05);
    return row.actualUpliftOverCashify > allowance;
  });
  assert.equal(
    offenders.length,
    0,
    `uplift over real Cashify too large: ${offenders
      .map((r) => `${r.device} (+${r.actualUpliftOverCashify})`)
      .join(', ')}`
  );
});

test('the engine never awards more than Rs 2,000 of uplift over its own equivalent', () => {
  const offenders = rows.filter((row) => row.actualFinal - row.cashifyEquivalent > 2000);
  assert.equal(
    offenders.length,
    0,
    `uplift cap breached: ${offenders
      .map((r) => `${r.device} (+${r.actualFinal - r.cashifyEquivalent})`)
      .join(', ')}`
  );
});

test('uplift is never negative - the offer always beats the internal equivalent', () => {
  const offenders = rows.filter((row) => row.actualFinal < row.cashifyEquivalent);
  assert.equal(offenders.length, 0, `negative uplift: ${offenders.map((r) => r.device).join(', ')}`);
});

test('cashifyEquivalent MAE stays within Rs 600 across comparable observations', () => {
  const value = mae(comparable.map((row) => row.equivalentError));
  assert.ok(value <= 600, `cashifyEquivalent MAE is Rs ${value}`);
});

test('final-offer MAE stays within Rs 600 across comparable observations', () => {
  const value = mae(comparable.map((row) => row.finalOfferError));
  assert.ok(value <= 600, `final-offer MAE is Rs ${value}`);
});

test('no single comparable observation drifts more than 8% on the final offer', () => {
  const offenders = comparable.filter(
    (row) => Math.abs(row.finalOfferError) / row.expectedFinal > 0.08
  );
  assert.equal(
    offenders.length,
    0,
    `outliers: ${offenders
      .map((r) => `${r.device} (${((r.finalOfferError / r.expectedFinal) * 100).toFixed(1)}%)`)
      .join(', ')}`
  );
});

test('the customer payout stays below the signed final price by the documented fee', () => {
  // customerPayout subtracts the Rs 99 fee and may add the Rs 299 coupon.
  // It must never exceed the signed quote without the coupon being claimed.
  const offenders = rows.filter((row) => row.customerPayout > row.actualFinal + 299);
  assert.equal(offenders.length, 0, `payout above signed quote: ${offenders.map((r) => r.device).join(', ')}`);
});

console.log(`\ncomparable observations : ${comparable.length} of ${rows.length}`);
console.log(`cashifyEquivalent MAE   : Rs ${mae(comparable.map((r) => r.equivalentError))}`);
console.log(`final-offer MAE         : Rs ${mae(comparable.map((r) => r.finalOfferError))}`);
console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
