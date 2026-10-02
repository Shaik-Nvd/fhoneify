# Owner questionnaire correction and targeted local fixes — handoff (2026-10-02)

Branch `fix/xiaomi-inr-deductions`, starting HEAD `a227404` (after Codex `80ca8a3`). Nothing pushed, merged or deployed. No production writes. Uplift tiers, ₹2,000 cap, ₹100 minimum bonus, ₹99 fee, rounding and weekly refresh unchanged.

## Commits

| Commit | Kind | Content |
|---|---|---|
| `08d4a32` | code | Revert `a227404` (Note 10 Pro Max active-engine anchor) |
| `d6f4a2d` | data | `scripts/pricing/fixtures/owner-correction-2026-10-02.json`: corrected interpretation, matched controls, verdicts, box contrast |
| `fafcfc3` | code | Team-workbook preview refuses devices without a matched warranty-No control |
| `514444e` | code | Disabled OnePlus display-fault research preview |
| this doc | docs | Handoff |

## 1. Corrected questionnaire metadata (manual workbook prices only)

Owner correction: tester **A** = clean, warranty **Yes**, age "Above 11 months" where asked; testers **B/C** = warranty **No** where asked; all three box **Yes**, charger **Yes**. The 66 raw tester records are unchanged; the corrected interpretation is a separate layer (`owner-correction/tester-observations-owner-corrected.json` in the ignored evidence root, summarized in the committed fixture). Collector observations keep their own verified traces; none were relabelled.

Affected derived artifacts: `teamWorkbookCandidate` fixture (16 development specs: clean retention from A, component costs from A−B/C), the shared glass ratio 50980/25190 (trained on FM001/006/019/020 A−B and A−C), the "original tester reports" accuracy rows (66 cases, 18 reserved), and the baseline/deduction cancellation examples in `TEAM_WORKBOOK_VALIDATION_2026-10-02.md`.

## 2. Matched clean controls

Existing evidence search: older jobs (`xiaomi-candidate`, `xiaomi-severe-followup`, `xiaomi-validation`) cover Xiaomi only; FM004/FM017 already had verified live warranty-NOT_ASKED controls. No other reusable control existed.

Collection (`scratch/cashify-matrix-integration/research-evidence/owner-correction-2026-10-02/`, own ledger, cap 40): **37 attempts, 23 accepted**. Plan frozen before collection; headless; no pickups; stopped short of the cap because the remaining failures repeated.

- Warranty-No clean controls accepted: FM001, 002, 003, 005, 007, 009, 013, 014, 016.
- Not obtained: FM006/008/010/011/012 (Cashify asks eSIM; workbook gives no eSIM answer — not guessed), FM015/018 (questionnaire timeout twice), FM019/022 (S Pen selection mismatch), FM020/021 (constructed device page 404).
- All six budget-blocked workbook cases collected, each with a fresh opening control at the same Get Upto: FM024_C 5,520 (A 9,690), FM032_C 11,700 (A 40,310), FM039_C 13,300 (A 16,500), FM040_C 1,570 (A 1,740), FM042_C 19,880 (A 21,380), FM045_C 43,790 (A 45,290). **Workbook coverage is now 150/150.**
- Box contrast (FM037 Note 10 Pro Max 6/128, Get Upto 5,970, warranty NOT_ASKED): box Yes 5,950, box No 5,650.

## 3. Conclusions preserved, changed or uncertain

| Verdict | Devices | Basis |
|---|---|---|
| PRESERVED (route) | iPhone 8, XS Max, 12 Pro, 14; M32, A50s, S21 Ultra, S23 FE | Live trace: Cashify does not ask warranty for these variants, so the correction cannot change their route |
| PRESERVED (numerically) | iPhone 15, iPhone 16 | Warranty asked; warranty-No clean equals tester A exactly at the same Get Upto (35,900; 44,400). Whether A was priced as "Yes + >11 months" or as "No" is unproven |
| UNCERTAIN | iPhone 11 Pro Max (Get Upto changed), 14 Pro Max, 15 Pro Max, 16 Pro Max, 17, 17 Pro Max, A72, S25 Edge, S26 Ultra, Fold5, Flip6, Note 10 Lite | No matched control |
| CHANGED | none observed | — |

Consequences:
- `teamWorkbookCandidate` preview now refuses 9 development devices (`OWNER_CORRECTION_UNMATCHED_WARRANTY`); 6 preserved devices still reproduce; iPhone 11 Pro Max keeps its prior quarantine. No coefficient refitted.
- Shared glass ratio: derivation **uncertain** (3 of 4 training devices unmatched). The two prospective fresh holdouts (iPhone 12 Pro 256GB, S23 FE 8/128) used warranty-NOT_ASKED live routes and remain 2/2 exact; the fresh-glass candidate is unchanged.
- Tester-report accuracy rows remain as recorded but are valid only for the preserved devices; reserved-validation figures that include uncertain devices are not re-scored.
- iPhone 12 Pro tester values sit +320 above the live captures for A and B at the same Get Upto (constant offset, undated tester session) — deductions agree.

## 4. Review of `a227404` (Note 10 Pro Max) — reverted

Comparing engine output before/after for 15 conditions in two regimes: besides the measured lines/heavy spots, the ₹10,200 anchor changed 12 unmeasured conditions (cracked −1,481/−2,022, dead touch −1,568, back camera −939/−1,283, local screen −1,456, body, functional), the warranty-ASKED regime, and the unmeasured 6/64 and 8/128 variants (model-level group). It was reverted in `08d4a32`. The supported behaviour (6/128, warranty NOT_ASKED, clean/lines/heavy spots, ₹3,060) is already priced exactly — and everything else refused — by Codex's disabled `xiaomiWorkbookEvidenceCandidate`.

**₹400 discrepancy traced.** On all 10 OnePlus/Xiaomi collector blocks whose trace shows warranty NOT_ASKED with box+charger Yes (FM023/024/025/026/033/035/036/037/040/041; FM043 excluded, see §6), clean Selling = Get Upto − 20, so Cashify's Get Upto already corresponds to a box-and-charger phone. Box No costs 300 on FM037. Charger present vs missing at unchanged Get Upto (cross-day): +1,000 Xiaomi 17, +800 Xiaomi 15, +600 Turbo 5, +350 Note 15 Pro+. The active engine computes `reference × retention − deductions + 380` when the box is present, so on these routes it overstates the Cashify-equivalent by ~400 (380 box + rounding) before uplift; with box absent it is ~300 high. This is accessory accounting inside the Cashify-equivalent, distinct from the protected uplift applied afterwards. The box bonus is a protected value and was **not** changed; owner decision required (e.g. treat Get Upto as box-inclusive and deduct a measured box-missing amount instead).

## 5. OnePlus display fixes (disabled preview)

Matched evidence (same route, same Get Upto, stable/fresh clean controls, screenshot hashes in fixture):

| Variant | Route | Clean | Lines | Heavy spots | Deduction |
|---|---|---:|---:|---:|---:|
| OnePlus Nord 8/128 | warranty/bill NOT_ASKED | 8,320 | 3,640 | 3,640 | 4,680 each |
| Oneplus Open 16/512 | warranty No, bill Yes | 40,310 | 11,700 | 11,700 | 28,610 each |

Active engine at captured Get Upto (pre-uplift Cashify-equivalent): Nord clean +400 (4.8%), lines +3,078 (84.6%), spots +3,412 (93.7%); Open clean +1,214 (3.0%), lines +18,098 (154.7%), spots +20,053 (171.4%). The preview reproduces all six exactly — **development fit, not independent validation**. Open spots (17:33) was collected after Open lines (11:57) without a frozen prediction; it is consistent with the lines = spots pattern seen on every device measured (Nord, Note 10 Pro Max, Open; tester XS Max, A72, 15 Pro Max, Flip6), but that is an observation, not a preregistered test.

Scope: exactly these two variants, their observed routes, clean and single lines or heavy spots. Cracked glass, touch, discoloration, lines+spots together, body, functional, other variants (e.g. Nord 12/256, Open 12/256), warranty Yes and changed Get Upto all return unsupported. The active OnePlus engine is unchanged; the test asserts it still overpays.

## 6. Production read-only check (executed with owner approval)

`docs/TEAM_WORKBOOK_PRODUCTION_INPUTS_READ_ONLY.sql` ran in a `READ ONLY` transaction (reference and questionnaire tables only). First attempt earlier in the session was rejected by the auto-mode classifier ("Production Reads"); this attempt was permitted.

- 48/50 variants have a fresh Cashify reference (5.3–5.4 days). **Xiaomi 14 12/512 and Xiaomi 14 Ultra 16/512 have no production reference.**
- Production references are at or below today's live Get Upto for every compared variant (0 to −2,990; e.g. Nord −80, Open −240, Note 10 Pro Max −170, iPhone 16 Pro Max −2,990). Cause not determined (price drift since refresh vs capture difference). Consequence: all verified previews return `REFERENCE_OUTSIDE_VALIDATED_DOMAIN` against current production inputs — they fail closed.
- Profile vs live route: 43/44 agree. **Xiaomi 14 Ultra**: production profile says warranty/bill ASKED, the live 16/512 trace labels them NOT_ASKED, but its clean price (29,330 on 37,980 = 77%) matches warranty-No pricing rather than Get Upto − 20, and an owner capture on 2026-10-01 recorded warranty No at the same price. The trace label is more likely wrong than the profile; unresolved.
- Profiles report `ageMode NOT_ASKED` everywhere; live traces only cover warranty-No routes, so age visibility under warranty Yes remains unverified.

## Tests

All 23 offline pricing suites pass with an unreachable database sentinel (including new `pricing.oneplus-display` 60 assertions, updated `pricing.team-workbook-service` 68); Next TypeScript passes. `pricing.quote-integration` and `pricing.reference-data` were not run (database integration; production-writing risk).

## Remaining tasks

1. Owner: eSIM answer for iPhone 14 Pro Max and newer (blocks 5 controls); decision on box accounting (₹380 bonus vs box-inclusive Get Upto).
2. Collector: S Pen option selection (S26 Ultra, Note 10 Lite), Fold5/Flip6 exact device links, A72/S25 Edge timeouts. 3 attempts remain in this authorization.
3. Investigate why production references trail live Get Upto; recalibrate previews against refreshed references before any activation.
4. Add production references for Xiaomi 14 12/512 and 14 Ultra 16/512; resolve the Xiaomi 14 Ultra trace-vs-profile route conflict (likely collector warranty-label detection).
5. Independent (preregistered) validation for OnePlus display on further variants before broadening scope; conditional-route schema for age/eSIM/accessories.
