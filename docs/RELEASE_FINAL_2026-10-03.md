# Pricing release package — 3 October 2026

Branch `fix/xiaomi-inr-deductions`. The final SHA is in the commit that adds this file; see `git log -1 -- docs/RELEASE_FINAL_2026-10-03.md`. Base `ad295e5` (Codex final; `b39da3b` = cherry-pick of Claude `7a56aaf`).

**Verdict.** This is a narrow, verified release, behind `PRICING_RELEASE_CANDIDATE` (off by default). It is **not** a fully fixed engine. Exact binding corrections cover:

- 7 candidate variants;
- 13 further accessory-corrected variants;
- everything else is either inspection or the unchanged legacy engine, labelled `UNVALIDATED_LEGACY`.

The ±3% target is met for every candidate and accessory-corrected observation, but almost all of those observations are fitting or control data. Independent evidence is limited to two out-of-sample predictions, both within ±3% and both underpaying. Legacy fallback still misses ±3% on 40 of 71 observations.

No deploy, push, merge, production query or production write occurred. Collection used 7 attempts (19/24 used, 5 remaining).

## 1. What changed in this pass

| Commit | Change | Why |
|---|---|---|
| `719aefe` | Measured rupee deductions apply only when the reference equals the calibrated Get Upto. The clean baseline of offset specs still follows the reference (Get Upto − 20). Questionnaire profiles use the crawl's own 30-day reuse policy. Release version bumped to `v5-reference-domain`. | Codex's re-anchoring carried fixed deductions to unobserved references (extrapolation). The 14-day rule would have expired every 24 Sep profile on **8 Oct** (the crawl only re-learns at 30 days), silently sending every supported route to inspection. |
| `8058c97` | The accessory-corrected route binds only clean and body conditions. Screen, glass and functional faults go to inspection. Adds `scripts/pricing/release-scope-register.ts`. | Matched controls on this route: screen scratches +7.9% and cracked glass **+26.3% (₹1,450)** overpaid on OnePlus 9. Functional faults were never measured. |
| `435609a` | Frozen v5 predictions, committed before the independent run. | Prospective evaluation. |
| `52cf541` | Register typing fix: the committed `8058c97` failed `next build`. Independent results recorded. | Build blocker. |
| `0717ae5` | Accessory-route body narrowed to exactly "More than 2 scratches" / "Major dent(s)". Register output committed. | 1–2 scratches, minor dents, panel, bent and combined body faults were never measured. AGENTS.md flags panel/bent as possibly undeducted in legacy. |

Unchanged: `calculateFhoneifyPrice`, `applyCompetitorUplift` (8/6/4% tiers, ₹2,000 cap, ₹100 floor), ₹99 fee, payout rounding, all penalty/accessory/scrap constants, weekly refresh, legacy mode.

## 2. Supported scope (exact)

Full register with per-condition outcomes under the saved export and the refresh overlay: `scripts/pricing/fixtures/release-scope-register-2026-10-03.json` → `register`.

**Candidate corrections.** These require all of the following; any missing input means inspection:

- a fresh, exact Cashify repository reference;
- a stored profile with `OK` status, under 30 days old, agreeing with the route;
- reviewed route evidence under 14 days old;
- box present, plus charger where asked;
- calls, touch and original screen all Yes.

| Variant | Regime | Calibrated Get Upto | Clean | Supported single condition (deduction) |
|---|---|---:|---|---|
| Xiaomi Mi A2 4/64 | all NOT_ASKED, box+charger | 2,520 | GU − 20 | Body >2 scratches 150; major dents 250 |
| Redmi Note 9 Pro 4/128 | same | 4,990 | GU − 20 | Screen >2 scratches 700; cracked glass 1,430 |
| Redmi Note 10 Pro Max 6/128 | same | 5,970 | GU − 20 | Visible lines / heavy spots 3,060 |
| OnePlus Nord 8/128 | same | 8,340 | GU − 20 | Visible lines / heavy spots 4,680 |
| Xiaomi 14 CIVI 8/256 | warranty No, bill Yes, age NOT_ASKED | 18,900 | 77.2% retention (only at 18,900) | Screen scratches 2,820; glass 5,710 |
| OnePlus Open 16/512 | warranty No, bill Yes | 51,650 | 78.0% retention (only at 51,650) | Lines / heavy spots 28,610 |
| Galaxy S23 FE 8/128 | all NOT_ASKED, box (charger NOT_ASKED) | 18,060 | 99.9% retention (only at 18,060) | Screen scratches 3,090; glass (shared frozen rule) |

**Accessory-corrected (13 variants).** Clean = Get Upto − 20 (legacy box bonus removed), plus the legacy delta for exactly one of "More than 2 scratches" or "Major dent(s)" on the body.

- Apple: iPhone 8 128, XS Max 256, 11 Pro Max 256, 14 256
- Samsung: Galaxy M32 4/64, A50s 4/128, S21 Ultra 12/256
- OnePlus: 7 Pro 8/256, 8 Pro 8/128, 9 5G 8/128
- Xiaomi: Redmi 11 Prime 4/64, Redmi 5 3/32, K50i 6/128

All other conditions and missing accessories on these routes require inspection.

**Inspection, always:**

- touch No, non-original screen, any display fault outside the measured scopes, any combination, unrecognised or contradictory answers;
- missing box/charger on a measured route;
- iPhone 12 Pro 256 (clean Selling exceeds Get Upto: headline decision needed);
- Xiaomi 14 Ultra 16/512 (₹9,030 legacy baseline overpayment);
- Redmi Note 15 Pro+ 12/512 with any hardware fault.

**Legacy fallback (`UNVALIDATED_LEGACY`).** Every other catalog variant with a single clean, screen-scratch, cracked-glass, body or functional condition. This is identical to today's production engine.

### Why the seven preregistered holdouts get no price

All seven are legitimate guards; none is a mapping bug:

| Holdout | Observed | Legacy would pay (error) | Release decision |
|---|---:|---:|---|
| Xiaomi 17 combined | 32,220 | 34,400 (+2,180) | Inspection: combined condition unvalidated |
| Redmi Turbo 5 combined | 14,640 | 15,850 (+1,210) | Inspection: combined |
| Note 15 Pro+ camera pair | 16,580 | 18,870 (+2,290) | Inspection: Note hardware regime |
| Note 15 Pro+ audio/port | 20,380 | 19,850 (−530) | Inspection: Note hardware regime |
| Note 15 Pro+ four faults | 7,410 | 17,420 (**+10,010**) | Inspection: Note hardware regime |
| Note 15 Pro+ five faults | 6,410 | 16,760 (**+10,350**) | Inspection: Note hardware regime |
| iPhone 12 Pro conditional glass | 16,730 | 18,222 (+1,492) | Inspection: changed reference / headline block |

The eighth holdout (S23 FE conditional glass, 11,790) is priced at exactly 11,790.

## 3. Reference eligibility and the weekly refresh

**Proposed update.** Apply it through the existing refresh only, never raw SQL. The ingestion policy (`validatePriceObservation`) accepts all of the following with no review flag (threshold 40%). Live values were fetched 2026-10-03 05:25:52–05:26:14 UTC by `refresh-from-cashify.ts --dry-run`; the saved values are the 2026-10-02 READ ONLY export, last verified 2026-09-27.

| Key | Saved | Proposed (live) | Change | Calibration |
|---|---:|---:|---:|---:|
| `xiaomi\|xiaomi mi a2\|4 gb/64 gb` | 2,500 | 2,520 | +0.80% | 2,520 |
| `xiaomi\|xiaomi redmi note 9 pro\|4 gb/128 gb` | 4,940 | 4,990 | +1.01% | 4,990 |
| `xiaomi\|xiaomi redmi note 10 pro max\|6 gb/128 gb` | 5,800 | 5,970 | +2.93% | 5,970 |
| `xiaomi\|xiaomi 14 civi\|8 gb/256 gb` | 18,720 | 18,900 | +0.96% | 18,900 |
| `oneplus\|oneplus nord\|8 gb/128 gb` | 8,260 | 8,340 | +0.97% | 8,340 |
| `oneplus\|oneplus open\|16 gb/512 gb` | 51,410 | 51,650 | +0.47% | 51,650 |
| `samsung\|samsung galaxy s23 fe 5g\|8 gb/128 gb` | 17,880 | 18,060 | +1.01% | 18,060 |
| `apple\|apple iphone 12 pro\|256gb` (not part of the release) | 24,220 | 24,780 | +2.31% | 24,460 → stays blocked |

The 2026-10-03 17:17–17:18 UTC collector pages showed Get Upto unchanged for Note 9 Pro (4,990), S21 Ultra (17,130) and 8 Pro (11,520).

**No special write is needed.** The scheduled weekly job (`reference-price-refresh.yml`, Sundays 02:30 UTC, first run **4 Oct 08:00 IST**) refreshes every key through the same policy. Recommended:

1. Let the scheduled job run, or dispatch it with owner approval.
2. Read-only verify the 7 + 13 rows (amount, `lastVerifiedAt`, `EXACT`, failures 0).

**Rollback** is the existing refresh/history mechanism. The runtime never pins references to calibration amounts.

### When a reference moves

Verified in the register's `movement` table (+1% move):

| Route type | At calibration | After any move |
|---|---|---|
| Offset candidates (Mi A2, Note 9 Pro, Note 10 Pro Max, Nord) | Clean and damage priced | Clean = new GU − 20; damage → inspection |
| Retention candidates (CIVI, Open, S23 FE) | Clean and damage priced | Everything → inspection |
| Accessory-corrected (13) | Clean and 2 body subtypes priced | Clean = new GU − 20; body → inspection |

Every route fails closed on stale inputs:

- **16 Oct 2026, from 11:18 UTC (per route; the last at 17:37 UTC):** the route evidence and candidate calibrations (observed 2026-10-02) leave the 14-day window, and every candidate and accessory route goes to inspection. Re-observe before then to keep scope.
- **2026-10-24:** the questionnaire profiles (24 Sep) expire.

### Labelled local overlay

The `overlay` scenario is the saved export with only those 8 keys replaced and `lastVerifiedAt` set to the dry-run time. It is never written anywhere. It reproduces the launch state if Cashify is unchanged.

## 4. Accuracy

Prediction = Cashify-equivalent estimate before uplift. Error = estimate − Cashify Selling (positive = Fhoneify overpays). Refusals are excluded, never scored as zero.

### Matched cohorts (rows numeric in both legacy and release)

| Scenario | Rows | Legacy MAPE / max APE / max overpay / within ±3% | Release MAPE / max APE / max overpay / within ±3% |
|---|---:|---|---|
| Overlay (launch-like) | 118 | 10.12% / 171.39% / ₹20,053 / 42 | **2.69% / 13.34% / ₹1,600 / 78** |
| Saved export (today's production inputs) | 98 | 4.86% / 22.41% / ₹1,600 / 37 | 3.38% / 13.34% / ₹1,600 / 58 |
| Captured Get Upto | 127 | 9.77% / 171.39% / ₹20,053 / 43 | 2.12% / 10.32% / ₹2,120 / 88 |

### By decision (overlay)

| Decision | n | MAPE | Max APE | Max overpay | Within ±3% | Legacy on the same rows |
|---|---:|---:|---:|---:|---:|---|
| Candidate | 29 | 0.00% | 0.00% | 0 | 29/29 | 26.99%, max overpay ₹20,053 |
| Accessory-corrected | 18 | 1.16% | 2.92% | 0 | 18/18 | 6.44%, max overpay ₹400 |
| Legacy fallback | 71 | 4.17% | 13.34% | **₹1,600** | 31/71 | identical (unchanged engine) |

- **Candidate rows are fitting/controls.** The zero error is tautological and is not accuracy evidence. Of the 29, 15 are clean controls and 13 are development observations; the one holdout is S23 FE glass, which is exact.
- **All 40 rows outside ±3% are legacy fallback.** 11 overpay, all Xiaomi 17 / 17T / 15 / Turbo 5 / OnePlus 13, by +3.41% to +4.55%, maximum +₹1,600. The rest underpay, by as much as −₹4,721. Per-row data is in `scenarios.overlay.rcFailuresOutside3` and `rows.overlay`.

**Coverage, overlay (168 observation rows):**

- 29 candidate, 18 accessory-corrected, 71 legacy fallback (118 numeric);
- 46 inspection;
- 4 no reference (Xiaomi 14 / 14 Ultra).

On the saved export: 9 / 18 / 71 numeric, 66 inspection, 4 unavailable.

**Risk removed by inspection.** Legacy currently prices the 46 inspection rows with 37 overpayments, up to ₹15,210 (overlay) or ₹19,907 (saved), and a maximum APE of 2,716%.

### Independent and temporal evaluation

Frozen at `435609a` before collection; results in `scripts/pricing/fixtures/claude-independent-results-2026-10-03.json`.

| Case | Role | Frozen | Cashify | Signed error |
|---|---|---:|---:|---:|
| S21 Ultra 12/256, major dents | **Independent** | 15,860 | 16,190 | −330 (−2.04%) |
| OnePlus 8 Pro 8/128, >2 body scratches | **Independent** | 10,620 | 10,820 | −200 (−1.85%) |
| S21 Ultra, 8 Pro, Note 9 Pro clean | Control (second day) | GU − 20 | GU − 20 | 0 ×3 |
| Note 9 Pro cracked glass | Temporal repeat | 3,540 | 3,540 | 0 |
| iPhone 11 Pro Max clean | Failed (timeout, charged) | — | — | Damaged case skipped by preregistered rule |

- **Independent:** 2/2 within ±3%; maximum APE 2.04%; maximum signed overpayment ₹0. n = 2 is directional, not a statistical guarantee. No reference moved, so moved-reference clean pricing is still temporally untested.
- **Open provenance:** OPEN_TR_B and OPEN_TR_C (₹11,700) are two separate live runs. Their files were written 27 s apart and their question traces differ (lines vs heavy spots). The PNGs are byte-identical, and match 2 Oct `FM032_CORR_C`, because the collector clips only the "Selling price" card (model, storage, price). Count them as 2 temporal repeats, not unseen-condition validation. Open clean timed out.
- **iPhone 17:** ₹11,280 / ₹14,030 remain provisional, because B/C are undated and untraced. They are not used.

## 5. Customer payout

Chain: Cashify Selling → estimate → uplift → fee → payout (`register.payout`).

| Case | Cashify | GU | Estimate | Uplift | Quote | Fee | Payout | vs Cashify |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Nord clean | 8,320 | 8,340 | 8,320 | 666 (8%) | 8,986 | 99 | 8,887 | +567 |
| Nord visible lines | 3,640 | 8,340 | 3,640 | 291 | 3,931 | 99 | 3,832 | +192 |
| Mi A2 major dents | 2,250 | 2,520 | 2,250 | 180 | 2,430 | 99 | 2,331 | +81 |
| Redmi 5 clean | 1,740 | 1,750* | 1,730 | 138 | 1,868 | 99 | 1,769 | **+29** |
| S23 FE cracked glass | 11,790 | 18,060 | 11,790 | 943 | 12,733 | 99 | 12,634 | +844 |
| iPhone 14 clean | 28,410 | 28,030* | 28,010 | 1,681 (6%) | 29,691 | 99 | 29,592 | +1,182 |
| Open clean | 40,310 | 51,650 | 40,310 | 1,612 (4%) | 41,922 | 99 | 41,823 | +1,513 |
| Open lines | 11,700 | 51,650 | 11,700 | 468 | 12,168 | 99 | 12,069 | +369 |

\* Saved reference below today's Cashify Get Upto, so the estimate is ₹20 below Cashify until the weekly refresh.

- **Candidate and accessory-corrected:** the payout beats Cashify on all 47 rows (min +₹29, max +₹1,513).
- **Legacy fallback:** **18 of 71** rows pay the customer *less* than Cashify, down to −₹3,445 (OnePlus 15 C). This is existing production behaviour, unchanged here.

Formula boundaries (`register.payout.formulaBoundaries`); the formula is not altered:

- **Fee vs uplift:** in the 8% tier the ₹99 fee exceeds the uplift for estimates below ₹1,238, so the net advantage is negative. No supported outcome is that low; the lowest supported estimate is ₹1,730.
- **₹2,000 cap:** reached at an estimate of ₹33,333 (6% tier) or ₹50,000 (4% tier). No supported outcome reaches it (maximum uplift ₹1,612).
- **Tier step:** the uplift percentage drops from 8% to 6% as Get Upto crosses ₹20,000. For example, an estimate of ₹19,990 gets ₹1,599 at GU ₹20,000 and ₹1,199 at GU ₹20,010.

## 6. Flow verification (local, production writes impossible)

**Test suites.** `DATABASE_URL` pointed at an unreachable sentinel throughout. Suite D (`quote-integration`, which writes to production) was **not** run. All passed:

- regression; production 37; cashify-comparison; reference-data 28; consistency 10; get-upto 5; inr-deductions 22; condition-matrix 20; calibration 9; questionnaire-coverage 3; questionnaire-metadata 14; refresh 34;
- **release-flow 32** (HTTP routes, token, lead spy, zero DB writes);
- **release accessories 17**.

The release-flow and accessories suites cover:

- supported quotes;
- mismatched profile or route;
- missing accessories;
- unsupported damage returning 422 with no token;
- moved reference (clean priced; damaged inspected; **a clean token cannot carry a damaged lead**);
- stale or future-dated route evidence;
- profile age (24 Sep accepted; 31 days and future-dated rejected);
- old-token rejection on version change;
- lead bypass prevention;
- release→legacy switch.

**Builds.**

- `tsc -p tsconfig.next.json` passes.
- `next build` passes at `0717ae5`.
- `next build` also passes on a **temporary merge with current `main` d261b25** (the UI launch). There are no conflicts and no overlapping files: the UI pass touched the homepage, navigation and styles; this branch touches the quote API and pricing.
- `tsc -p tsconfig.server.json` reports the same 6 pre-existing errors (admin status ×2, inventory fields ×2, `test-iphone14.ts` puppeteer, `test-random-10.ts`). **Not deploy blockers:** the API image runs `npm install → prisma generate → tsx server/server.ts` and never type-checks. None is in pricing code.

**Real page on the merged UI.** Next dev on :3007 against the fixture API on :5007, reached through the page's own saved-session reload path (no auth, OTP or contact data):

- Nord clean: server ₹8,986 → displayed **₹8,887**.
- Visible lines: ₹3,931 → **₹3,832**.
- Touch No and missing box: **Inspection required**, no Schedule Pickup.
- Rollback: the same saved release session after restarting in legacy mode revalidates to legacy ₹9,418 → displayed **₹9,319**.

Screenshots: `scratch/release-2026-10-03-final/ui/`.

**API input finding (UI unaffected).** The legacy engine prices `screenCondition: 'No scratches on screen'` as a defect: −₹5,350 on iPhone 11 Pro Max. The quote UI never sends that string; it sends `null` unless a screen defect is ticked. Only a direct API caller could trigger it, and it can only underpay. Left unchanged, because legacy semantics are owner-protected.

## 7. Activation (owner decision; nothing here was deployed)

1. Merge this branch to `main` and deploy the API with `PRICING_RELEASE_CANDIDATE` **unset**. Behaviour is unchanged; confirm legacy quotes are unchanged.
2. Let the Sunday 4 Oct reference refresh complete, or dispatch it. Then read-only verify the 20 rows in §3 and their questionnaire profiles (`OK`, `observedAt` under 30 days, modes as in the route file).
3. On Render, set:
   - `PRICING_RELEASE_ROUTE_EVIDENCE_FILE=scripts/pricing/fixtures/release-route-evidence-2026-10-02.json` (in the image via `COPY . .`);
   - `PRICING_RELEASE_CANDIDATE=on`.

   Restart. If the file variable is missing, every candidate and accessory route goes to inspection (fails closed).
4. Smoke test `/api/quote/price`:
   - Nord 8/128 clean, box+charger → `fhoneifyPrice` 8,986 at GU 8,340;
   - touch No → 422 `MANUAL_INSPECTION_REQUIRED`.
5. Before **16 Oct**, re-observe the route/calibration controls, or accept that scope shrinks to inspection.

**Rollback:** unset `PRICING_RELEASE_CANDIDATE` and restart. Tokens carrying the release version are recomputed under legacy (verified in tests and in the browser). The UI needs no change, because its 422/inspection path ships already.

## 8. Remaining blocks and owner decisions

- **Independent accuracy.** Only 2 independent observations. Broad ±3% is **not** established.
- **Legacy fallback** (most of the catalog): 40/71 observations outside ±3%, maximum overpayment ₹1,600, and 18 rows where the customer payout is below Cashify. Owner decision: accept as `UNVALIDATED_LEGACY` or route to inspection.
- **NOT_ASKED variants outside the 18:**
  - iPhone 14 Pro Max, A72 and Note 10 Lite keep the legacy +₹380 box bonus, overpaying clean by about ₹400 vs the observed Get Upto − 20 pattern.
  - Applying −20 generally is not authorised: iPhone 12 Pro is a counterexample at +300.
- **Blocked:** iPhone 12 Pro (headline), Xiaomi 14 Ultra (baseline), Note 15 Pro+ hardware, combined/display/touch faults.
- **Expiry:** candidate and route evidence expire about 16 Oct; profiles on 24 Oct.

## Reproduce

From the pricing worktree, with `DATABASE_URL` set to an unreachable sentinel:

```
node ../../../node_modules/tsx/dist/cli.mjs scripts/pricing/release-scope-register.ts --out <file>
npx tsx scripts/test/pricing.release-flow.test.ts
npx tsx scripts/test/pricing.release-candidate-accessories.test.ts
```

Fixture hashes are listed in `register.inputs`.
