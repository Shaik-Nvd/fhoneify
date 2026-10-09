# Agent Z release candidate — review only

Verified base: `5fc2ceb3d0fb691084c65f12b91f694c2efa0c2a` (fetched origin/main on 2026-10-09). Public Render `/health` returned commit prefix `5fc2ceb3d0fb`, hybrid pricing and database connected. This read-only health check verifies the reported API revision; it is not a customer transaction test or current Cashify comparison. The initial health request timed out; the retry succeeded.

A's supplied ZIP reports commit `b4eff8a0d835261a564fd4e8a96f0770f2337b03` on base `6b22374bf865219b43ca0291e216ecab299707f3`. Neither object exists in this repository. Their identities cannot be independently verified. The supplied glass patch is frozen by SHA-256 `eca25d2f6bdc918034fc7d4bc3da25e842fcf0fdc8588d7ac7ca8b852c3f8f57`; it applied cleanly after the exact prerequisites. The ZIP contains README.txt, not APPLY.txt. Its narrow equivalent-base instructions were followed.

## Patch selection and ports

The original exact-fixes APPLY.txt distinguishes exact-engine.patch from the combined offline-audit patch. Only exact-engine.patch was applied; the 84ba2d1 offline prediction tooling remains on its separate review branch and is absent here. Current main does not contain the prior independent-review fixes. The latest final-fixes APPLY.txt therefore selects after-a8a7140.patch; after-1e28f66.patch was not applied.

The selected patch expected an unavailable a8a7140 prerequisite. Check failed on the prior explanatory document, ledger duplicate guard context and a missing review-followup test. The remaining hunks applied cleanly, including the two localized pickup-UI changes on Claude's current page. The ledger/refresh and review-followup test were ported from independently reviewed 98bee31 code to retain durable restart/authentication-stop safety. Historical document context was retained without fabricating a8a7140 history; this report documents the port instead. No patches were stacked redundantly.

A reproduced integration defect showed environment mode `hybrid` omitted the reviewed exact-cache/net-policy fields. The already-reviewed 98bee31 releaseConfig implementation supplies those fields while explicit `off` retains legacy. Its regression failed before the port and passed afterward.

A new real-router failure showed that omitted quoteToken persisted a recomputed hybrid lead without fresh acceptance. The controller now rejects recomputation in hybrid mode even when the token is omitted. The quote service still supports tokenless recomputation for internal/legacy compatibility; explicit legacy-mode HTTP rollback retains that compatibility. This deliberate hybrid pickup API change is tested and must be reviewed for any external tokenless client migration.

## Customer-facing changes

- Eligible exact captured final Selling replaces fitted condition equivalence only when variant, reference, full canonical condition answers, route/profile and evidence freshness match. Contradictory observations, changed references, unknown answers and inspection-only profiles never acquire exact support.
- For those exact matches, bounded-net preserves the existing preferred uplift and clamps the gross offer to Selling+100 through Selling+1800. Existing fee, coupon299, rounding, uplift tiers and calculator remain unchanged. Both actual payout deltas are strictly positive and at most 2000; the exact gross1200 fee exception is checked with the real helper.
- Hybrid cache misses retain ordinary fallback availability and the existing inspection safeguards. No final-payout corridor claim is made for those unsupported fallback quotes.
- Stale, invalid, empty or omitted tokens cannot persist hybrid leads. Updated client amounts or omitted amounts do not bypass fresh acceptance. The UI fetches a replacement quote on 409 QUOTE_CHANGED and requires another pickup attempt.
- Glass remains an optional internal shadow injection. Production pricing wiring does not inject it; real controllers strip it from public quote responses and lead audit. It never changes the customer quote, gross, coupon or persistence decision.

Evidence example: `owner-correction-2026-10-02:FM037_BOXREF_BOXNO`, Xiaomi Redmi Note 10 Pro Max 6/128. At captured Get Upto5970, its exact Selling5650 produces bounded gross6102, standard6003 (delta353), coupon6302 (delta652). When the reference moves to5980, exact reuse is refused and the fixture emits fallback gross6458; old/invalid/empty/omitted-token pickups return409 with zero writes. Fresh signed quote acceptance persists6458 with real payouts6359/6658. Those fallback payouts are consistency checks, not exact Cashify corridor validation.

## Evidence and accuracy are separate

Implementation: three focused reviewers checked exact eligibility, arithmetic and HTTP acceptance. Exact tests exercise 52944 payout cases and safety/reference/conflict guards. Final real-router acceptance proves zero persistence before a fresh quote, both coupon states, omitted prices, and explicit legacy rollback compatibility. Glass tests prove equality to the control's public quote and absence from public responses and lead audit.

Stored evidence: 168 imported captures, 12 admission rejections and 116 index buckets. The supplied frozen October7 evaluation contains 116 captured-reference exact combinations across38 variants, and113 exact combinations across37 variants against its saved public input snapshot. These counts are not recomputed live coverage. Three iPhone12Pro256 combinations (A/B/C) miss that saved public snapshot because the captured24460 reference differs from saved24780. The stored summary is in scratch/agent-z-release-validation/stored-coverage-summary.json. No broad replay evaluator was rerun.

Independent accuracy: zero untouched eligible glass cases have been established. Previously known glass outcomes and their matched A/B anchors are retrospective conditional checks, not fresh Cashify or independent transfer accuracy. The glass candidate accepts only four manifest-bound A/B anchor IDs: team-workbook-2026-10-02:FM004_LIVE_A/B and FM017_LIVE_A/B. It uses the frozen50980/25190 workbook ratio, whose original source devices cannot independently validate it. No new quotation collection occurred. No glass activation is justified.

## Verification and remaining gaps

- Frontend TypeScript and Next production build passed with installed dependencies and an unreachable database URL.
- Required offline pricing regressions passed: hybrid, production, quote consistency, regression, release observations, Cashify fixture comparison, reference data, Get Upto, INR deductions, scraper blocking, and the four patched Xiaomi suites.
- Real-router release-flow, acceptance and glass-shadow checks passed after the controller change. All persistence is in-memory and no database connects or production writes occur.
- Backend TypeScript reports six errors. All six locations/codes are independently reproduced at unchanged verified main: admin service rejected-status errors at41/54; inventory missing locationId/isSelectTier at16/20; missing puppeteer in server/test-iphone14; invalid `.data` in server/test-random-10 at98. Scraper type wording changed but introduced no new diagnostic. This existing backend compile gate remains unresolved and is not represented as passing.
- Production fresh-quote/pickup behavior after deployment, external tokenless-client migration, current Cashify Selling accuracy, all fallback phone/condition corridors, evidence expiry/reference movement and glass transfer remain unverified. No deployment is authorized by this report.

Reproduce from this candidate with existing dependencies:

```sh
node --import tsx scripts/test/pricing.exact-final-quotes.test.ts
node --import tsx scripts/test/pricing.agent-z-acceptance.test.ts
node --import tsx scripts/test/pricing.release-flow.test.ts
node --import tsx scripts/test/pricing.glass-shadow-http.test.ts
node --import tsx scripts/test/pricing.review-followup.test.ts
node --import tsx scripts/test/pricing.hybrid.test.ts
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.server.json
npm run build
```

The server command is expected to reproduce the six documented baseline errors. Full suite commands/actual exit codes and separate reviewers' notes accompany this candidate. Tests that would write configured production database rows were replaced by the real-router in-memory harnesses; no production-writing integration test was run.

## Preservation and rollback

Claude's Meta/public-page/admin exclusion, profile/auth, Navbar and quote UX changes come directly from verified main. Only the two pickup recovery hunks alter app/quote/page.tsx; Meta components, layout, auth/profile and Navbar have no diff. Existing pricing tiers, fee/coupon helpers, condition penalties and inspection guards are unchanged.

Immediate quote-pricing rollback: set ENABLE_EXACT_FINAL_QUOTE_CACHE=false (retain ordinary hybrid pricing), or PRICING_RELEASE_CANDIDATE=off for explicit legacy pricing. The latter also restores legacy tokenless compatibility; the default hybrid gate requires a fresh signed token. Glass needs no deactivation because production never injects it. Full code rollback is a normal revert of this release-candidate commit on the release branch, preserving main's Claude/Meta changes; never force-push. No push, merge, deployment, installation, collection or production data write was performed.
