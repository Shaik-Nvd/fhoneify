# Instant-price coverage expansion (follow-up to the 3 Oct release)

Branch `feat/pricing-coverage-expansion`, based on `main` `3c20f89`. **This PR changes no production behaviour.** The new specs bind only when `config/pricing-release.json` points `routeEvidenceFile` at `release-route-evidence-2026-10-03-expansion.json`. That one-line activation is deliberately left out of this PR for a separate review. Production keeps the 2026-10-02 route file. Tests confirm the new specs inspect under it, and that legacy mode is unaffected.

## What was added

**23 measured-point specs**, built deterministically by `scripts/pricing/build-measured-point-specs.ts` from evidence already collected. No new fitting data went into them. The standard is the same as the approved 14 CIVI and Open specs:

- **Clean control:** a traced clean control in the verified regime. That means warranty No and bill Yes where asked; box present; charger and S Pen present where asked; and the measured eSIM answer where asked.
- **Conditions:** single common conditions, traced at the same Get Upto and route in a block that has its own agreeing clean control. Repeated measurements must agree exactly.
- **When they bind:** only at the calibrated Get Upto, only with that exact answer regime, and only for the measured conditions. Evidence expires 14 days after observation: 16 Oct 2026 between 11:21 and 19:29 UTC, and 17 Oct for iPhone 17.
- **Never emitted:**
  - touch and non-original-screen faults;
  - combinations;
  - Note 15 Pro+ hardware faults;
  - iPhone 12 Pro (headline block);
  - Xiaomi 14 Ultra (quarantined baseline);
  - the iPhone 17 provisional B/C deductions.

| Variant | Calibrated Get Upto | Clean | Measured conditions (deduction) |
|---|---:|---:|---|
| OnePlus 12 12/256 | 33,150 | 26,470 | screen >2 scratches 4,710 |
| OnePlus 13 16/512 | 43,950 | 33,480 | screen scratches 5,590; cracked glass 11,310 |
| OnePlus 15 12/256 | 57,250 | 44,250 | back camera 6,000; charging 2,000 |
| OnePlus Nord 5 12/256 | 24,540 | 18,560 | screen scratches 2,350; glass 4,760 |
| OnePlus Nord CE 5 8/256 | 19,540 | 14,780 | body scratches 870; major dents 1,510 |
| Redmi Note 12 Pro+ 8/256 | 12,490 | 9,990 | screen scratches 1,470; glass 2,980 |
| Redmi Note 15 Pro 8/128 | 21,820 | 16,500 | charging 1,000; back camera 3,200 |
| Redmi Note 15 Pro+ 12/512 | 29,250 | 22,130 | glass 2,680 (hardware stays guarded) |
| Redmi Turbo 5 12/256 | 26,750 | 20,240 | charging 1,000 |
| Xiaomi 14 12/512 | 27,400 | 21,380 | charging 1,500 (production key not created yet) |
| Xiaomi 15 12/512 | 37,350 | 28,270 | glass 10,420 |
| Xiaomi 15 Ultra 16/512 | 59,830 | 45,290 | glass 10,710; charging 1,500 |
| Xiaomi 17 12/512 | 57,750 | 43,720 | charging 1,500 |
| Xiaomi 17T 12/512 | 40,750 | 30,840 | charging 1,500 |
| Xiaomi 17 Ultra 16/512 | 75,620 | 57,250 | clean only |
| iPhone 15 256 | 44,220 | 35,900 | clean only |
| iPhone 16 256 | 54,720 | 44,400 | clean only |
| iPhone 17 256 (Single eSIM) | 65,000 | 49,210 | clean only |
| iPhone 14 Pro Max 256 (Single eSIM) | 46,010 | 45,990 | clean only |
| Galaxy Z Fold5 12/256 | 49,740 | 37,820 | clean only |
| Galaxy Z Flip6 12/256 | 38,700 | 29,230 | clean only |
| Galaxy S26 Ultra 12/512 (S Pen) | 86,250 | 67,040 | clean only |
| Galaxy Note 10 Lite 6/128 (S Pen) | 5,600 | 5,580 | clean only |

**Code changes:**
- The shared candidate calculator now expects exactly the accessories the route asks about, plus the measured eSIM answer. This is behaviour-identical for the existing specs; all existing suites are unchanged.
- A new `measured-point` family in `RC_ALLOWLIST`. Retention baselines never price at a moved reference.

## Coverage gained, same cohorts (`scripts/pricing/release-scope-register.ts --routes ...`)

**171-observation evaluation set** (168 scored):

| | Before (production config) | After (expansion route file) |
|---|---:|---:|
| Binding at each observation's own Get Upto | 53 | **101** |
| Binding at current production references | 47 | 47 |

**150 workbook cases** (`docs/COVERAGE_GAP_REGISTER_2026-10-03.md`): 40 → 77 binding at the observed Get Upto. **Catalog:** variants that can receive an instant price go from 20 to **43 of 2,258**, each only for its listed conditions.

**No gain at today's production references.** All 22 existing keys still hold 27 Sep values that differ from the 2 Oct calibration points, and the Xiaomi 14 12/512 key doesn't exist yet. The gain materialises only when production references equal the calibrated Get Upto. The weekly refresh normally does that, if Cashify hasn't moved; any move keeps the scope at inspection.

## Accuracy, reported separately from payouts

- **In-sample (fit):** the 48 newly bound observation rows (27 clean controls, 21 conditions) have 0 error by construction. This is calibration reproduction, **not accuracy evidence**.
- **Out-of-sample temporal check.** These are the last 5 shared attempts, so the budget is now 24/24 used. Predictions were frozen at `a1063eb` before collection:

  | Case | Result | Signed error |
  |---|---|---:|
  | Xiaomi 15 Ultra charging | ₹43,790 at unchanged GU 59,830 | 0 |
  | iPhone 16 clean | ₹44,400 at 54,720 | 0 |
  | Redmi Note 12 Pro+ screen scratches | ₹8,520 at 12,490 | 0 |
  | OnePlus 13 glass | questionnaire timed out | — |
  | Galaxy Z Fold5 clean | collector device page HTTP 404 (a collector URL issue, not a price) | — |

  So 3 of 3 scored cases are exact about 31 hours after calibration, all with zero mismatched trace answers. That is temporal stability for those exact scopes only, with n = 3: no unseen-condition or cross-variant validation. Results are in `temporal-results-2026-10-03.json`.
- **Customer payout** (estimate → gross offer → net after ₹99), across all 44 new outcomes at their calibration points: the net payout beats Cashify by ₹347 to ₹1,901. 6 outcomes reach the ₹2,000 uplift cap. The uplift tiers, cap, fee and rounding are unchanged.

## Still missing, by device

| Device | Missing |
|---|---|
| iPhone 15 Pro Max 512, iPhone 16 Pro Max 512, iPhone 17 Pro Max 512, Galaxy A72 8/128, Galaxy S25 Edge 12/256 | Tester prices only. Each needs one traced clean control in the verified regime, plus same-block traced conditions. |
| Measured-point devices without a condition (iPhone 15, 16, 17, 14 Pro Max, Fold5, Flip6, S26 Ultra, Note 10 Lite, Xiaomi 17 Ultra) | Clean only. Each condition needs a same-block traced observation. |
| All measured-point routes | Warranty Yes, no-bill, and missing-accessory answers stay inspection (not measured). |
| Xiaomi 14 Ultra | Blocked: baseline overpayment. |
| iPhone 12 Pro | Blocked: needs an owner decision on clean Selling above Get Upto. |

**Deliberately kept at inspection:** touch, non-original screen, combinations, three-display-fault cases, Note 15 Pro+ hardware, moved references, and expired evidence.

## Activation (separate review)

1. Let the weekly refresh run. Read-only, compare each of the 23 keys with its calibrated Get Upto (query in the PR). A scope activates only where they are equal; anything else stays at inspection automatically.
2. Merge a one-line change: `config/pricing-release.json` → `routeEvidenceFile: scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json`.
3. Verify `/health` → `releaseRoutes: 44`, then smoke-test one clean and one condition per family.
4. **Rollback:** point the config back to the 2026-10-02 file. A host `PRICING_RELEASE_CANDIDATE=off` still switches everything to legacy.

## Maintenance (separate from this expansion)

All release evidence, old and new, expires 16–17 Oct. `docs/RELEASE_REVALIDATION_PROCEDURE.md` requires at least 27 attempts for the original 20 routes, plus about 23 clean controls (and the condition rows) for the new ones. The shared budget is exhausted, so this needs a new owner-approved budget before 16 Oct. Without it, everything returns to inspection on expiry, as designed.
