# Agent Z release candidate — review only

Verified integration base: 5fc2ceb3d0fb691084c65f12b91f694c2efa0c2a. The earlier read-only Render /health check reported 5fc2ceb3d0fb, hybrid pricing and a connected database. This identifies the API revision at the check time, not production pickup or current Cashify accuracy. This blocker update starts at eb5d1f75bad399b411bd16028e3d02bccf6b7b6c on the isolated release branch. The portable package records its final commit and hashes.

## Patch selection and preservation

The original exact-fixes APPLY.txt selects exact-engine.patch, rather than the combined offline audit patch. Only the engine patch was integrated. The 84ba2d1 prediction tooling stays separate. The latest final-fixes APPLY.txt selects after-a8a7140.patch for main without the earlier independent-review fixes. Its unavailable prerequisite required ports of the durable duplicate ledger/refresh guard and regression harness from verified98bee31; incompatible old documentation was replaced with this integration record. No redundant patch stack was applied.

A reports glass commit b4eff8a0d835261a564fd4e8a96f0770f2337b03 on 6b22374bf865219b43ca0291e216ecab299707f3. Neither object is available locally, so those identities remain unverified. The supplied glass patch is frozen at SHA-256 eca25d2f6bdc918034fc7d4bc3da25e842fcf0fdc8588d7ac7ca8b852c3f8f57. Both Glass ZIPs were inspected; neither contains A's reported six backend type fixes. The second adds source/exposure manifests. The patch applied after the exact prerequisites, following its README equivalent-base instructions.

The six pre-existing backend errors were corrected with types for the already-used rejected listing status and optional inventory fields, plus two diagnostic-script fixes: use installed Playwright instead of missing Puppeteer; read the existing scraper price result with a finite-number guard. Neither collector was executed. These corrections change no pricing formula, authentication behavior or dependency.

Claude's Meta components, layout, auth/profile and Navbar remain at verified main. Quote-page edits concern fresh acceptance/recovery only. Existing uplift tiers, cap, fee, coupon, rounding, condition constants and inspection safeguards remain unchanged. This blocker update does not expand release configuration.

## Customer-facing behavior

- Exact Selling applies only to matching variant/storage, reference, complete canonical answers, compatible route/profile, valid provenance and current evidence. Conflicts, changed references, unknown answers and inspection cases fail closed.
- Exact matches use the existing preferred uplift bounded to gross Selling+100 through Selling+1800. Real fee/coupon helpers establish 0 < payout - exact Selling <= 2000 in both coupon states, including the gross1200 fee exception. Unsupported hybrid fallback remains available; its Cashify corridor is not claimed.
- Every HTTP pickup requires a currently acceptable signed token in every mode. Stale, invalid, empty or omitted tokens409 before persistence; supplying the new amount or omitting price cannot bypass rejection. Inspection-required requests remain422 before persistence.
- On409, the client requotes and returns to payout review, with no automatic resubmission. Reload compares device, price, Get Upto, pricing version and token expiry. Changed offers, and expired/missing saved offers on a direct pickup URL, require another review and Schedule Pickup click.
- Valid same-version fallback tokens retain the existing price lock for their lifetime. Reference movement alone does not invalidate every fallback offer. Exact eligibility/version changes and expired/rejected tokens use fresh acceptance.
- Glass remains internal shadow-only. Production pricing does not inject it. Controllers strip shadow output from public responses and lead audit; customer amounts and persistence decisions remain unchanged.

Evidence example: owner-correction-2026-10-02:FM037_BOXREF_BOXNO, Xiaomi Redmi Note10ProMax6/128. Captured Get Upto5970/Selling5650 gives gross6102, standard6003 and coupon6302. Moving the fixture reference to5980 refuses exact reuse and gives fallback6458. Fourteen stale/invalid/empty/omitted-token combinations409 with zero writes before fresh acceptance; fresh tokens store6458 with payouts6359/6658. Those fallback figures establish consistency, not Cashify accuracy.

## Separate result classes

Implementation: actual command exits are recorded in the updated verification manifest. Memory-only real-router tests cover fresh acceptance, pricing rollback and shadow isolation. The browser test traverses questionnaire and Get Upto routes, fixture OTP, coupon off/on, pickup details, unchanged/changed direct pickup reload, mounted-token expiry409, and expired-saved-token reload. It compares the fresh review payout with the real helper and stored audit, with zero persistence before fresh acceptance. All non-loopback browser traffic is blocked; no configured database is used.

Historical coverage:168 imported rows,12 unsafe/incomplete rejects,156 admitted source rows,116 canonical combinations across38 variants. The source fixture's Git blob is unchanged from verified main (5aa5e2c41511976ddc81bacafa7dc8a180dadccd). The frozen October7 result is116/38 at captured references,113/37 against saved public inputs. The three misses are team-workbook-2026-10-02:FM004_LIVE_CLOSE_A, FM004_LIVE_B and FM004_LIVE_C, all iPhone12Pro256 at captured24460 versus saved24780. These are intentional reference refusals. No eligible row was identified as lost in integration.118/42 lacks an exact source/ID list and remains unsubstantiated. Follow-up records cannot be promoted without complete canonical route/profile/reference evidence. Repeated screenshots add no independent validation. The coverage document and runnable admission inventory include exact IDs.

Independent accuracy: zero untouched eligible glass targets are established. Known glass outcomes and A/B anchors are retrospective; the frozen50980/25190 ratio proves no arbitrary-device/reference transfer. No saved comparison establishes current Cashify accuracy. No new quotation was collected. Glass activation remains unjustified.

## Reproduction with installed dependencies

```sh
npx tsc --noEmit -p tsconfig.server.json
npx tsc --noEmit
npm run build
node --import tsx scripts/test/pricing.agent-z-acceptance.test.ts
node --import tsx scripts/test/pricing.agent-z-rollback.test.ts
node --import tsx scripts/test/pricing.release-flow.test.ts
node --import tsx scripts/test/pricing.exact-final-quotes.test.ts
node --import tsx scripts/test/pricing.glass-shadow-http.test.ts
node --import tsx scripts/pricing/audit-agent-z-coverage.ts
```

For browser checks, use three local terminals:
1. node --import tsx scripts/test/pricing.release-flow.test.ts --serve
2. NEXT_PUBLIC_API_URL=http://127.0.0.1:5007 npm run dev:web (POSIX), or set $env:NEXT_PUBLIC_API_URL='http://127.0.0.1:5007' then npm run dev:web (PowerShell).
3. node --import tsx scripts/test/pricing.agent-z-browser.test.ts

Use installed Playwright Chromium. Do not run standalone Cashify collectors or production-writing integration scripts. The fixture's clock endpoint advances only its in-memory test clock.

## Remaining gates and rollback

The only first-party lead caller is the quote page; it submits the signed token and bound answers. No external pickup caller was identified in the repository. Outside consumers remain unknown and require owner confirmation before release; tokenless consumers must migrate to quote/accept/submit, never a server bypass.118/42 needs exact IDs/source before that count can be adopted. Current Cashify accuracy, unsupported fallback corridors, future freshness/reference movement and glass transfer remain unverified.

Safe pricing rollback keeps the patched acceptance controller: ENABLE_EXACT_FINAL_QUOTE_CACHE=false retains hybrid; PRICING_RELEASE_CANDIDATE=off selects legacy pricing. Each mode accepts its own fresh tokens. Changed-version tokens409 pending new quote and fresh acceptance. Already accepted exact/fallback records stay unchanged.

A full code rollback to eb5d1f7 or verified main would restore unsafe tokenless acceptance. Retain/backport the all-mode signed-token guard and client recovery fixes before any full rollback. Glass needs no runtime deactivation because production never injects it.

Stop at review. No collection, glass activation, push, merge, deployment, installation or production write occurred.
