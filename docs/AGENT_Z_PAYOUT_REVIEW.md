# Agent Z payout arithmetic review

Review scope: `boundedCompetitiveOffer` and the actual `customerPayout` function for supported exact Selling-price cases. This is an arithmetic review only; it does not approve a pricing release or activate a shadow candidate.

## Bound proof

For a positive integer captured Selling price `S`, `boundedCompetitiveOffer` selects a whole-rupee gross quote `G` in:

`S + 100 <= G <= S + 1,800`

The existing payout rules are:

- Standard payout: `G - fee`, where `fee = 99`, except `fee = 0` when `G = 1,200`.
- Coupon payout: `G - fee + 299`.

When `G != 1,200`, the standard payout delta from Selling is `G - S - 99`, hence from ₹1 through ₹1,701. The coupon delta is `G - S + 200`, hence from ₹201 through ₹2,000. When `G = 1,200`, the fee waiver increases both deltas by ₹99; because `G >= S + 100`, the standard delta is at least ₹100 and the coupon delta is at least ₹399. The fee waiver therefore cannot violate either the strict-positive lower bound or the ₹2,000 ceiling.

The preferred offer still comes from `applyCompetitorUplift`, including its existing whole-rupee rounding and 4%/6%/8% tiers with the ₹2,000 cap. The bounded policy clamps that preferred amount to the interval above. Thus rounding and cap behavior cannot move the final gross outside the proven interval. The upper endpoint gives coupon payout exactly `S + 2,000` and standard payout `S + 1,701` whenever the fee applies.

## Observed checks

The focused test command was:

```text
npx tsx scripts/test/pricing.exact-final-quotes.test.ts
```

It passed all eight groups, including the 52,944-case payout loop, exact evidence matching, fallback behavior, inspection handling, scraper parsing, and offline ledger checks. Its output reported zero browser requests and zero database writes.

A direct read-only probe covered Get Upto values ₹20,000, ₹20,001, ₹50,000, and ₹50,001; Selling values included ₹1,100 (which reaches gross ₹1,200), values immediately around the fee boundary, the tier boundaries, and high values through ₹1,50,000. Every case satisfied `0 < standard payout - Selling <= 2000` and `0 < coupon payout - Selling <= 2000`. At `S = ₹1,100`, `G = ₹1,200`, the fee was ₹0, and the payout deltas were ₹100 standard and ₹399 with coupon.

## Fallback and shadow scope

The focused test confirmed that expired, conflicting, and unmeasured exact observations retain the hybrid quote and that a bill contradiction remains inspection-only. The glass shadow candidate is research-only metadata behind an optional injected dependency. The server pricing setup does not inject it, so it does not affect the authoritative customer quote or payout.

## Release boundary

This note establishes the payout arithmetic for eligible exact observations. It does not establish Cashify-wide price parity and does not authorize release activation. The exact offer policy remains proposed pending its own release review; the release candidate remains inactive.
