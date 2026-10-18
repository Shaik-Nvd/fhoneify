# Team TXT pricing repair — 18 October2026

Base: a6a4600b2753f18d1e20118ecee1bc6bc7e454a2, reverified origin/main and read-only API health. Worktree isolated; preserves teammates' admin, valuation lead, Meta/UI and collector changes. No push, deployment, new collection, production quote request or production write.

## Concrete changes

1. The API omitted storage for the supplied512GB variants. Broad base15 and16 checks additionally swallowed Pro/Plus siblings. Restored explicit512GB dispatch for eligible out-of-warranty15Plus,15Pro,15ProMax,16,16Plus and17. Exact model checks apply within this new scope; existing13 captured profiles and other identities retain their paths. No deduction constants recalibrated.
2. Corrected offers now use the existing bounded-net helper. The old gross uplift cap could produce Selling+2200 with coupon ON after the99 fee. Preferred uplift, rupee rounding, fee,299coupon and2000net limit remain existing policy.
3. Added an answer-only eligibility manifest,94distinct supplied answer signatures, containing no Selling target inputs. It requires the exact device/storage, supplied reference value, observed answer combination and conservative14day expiry from the supplied source day. Unseen faults, reference changes, warrantyYes, unknown accessories, unsupported screen/body combinations and expiry retain main's fallback. No reference-price threshold selects a storage constant. Existing screenshot-verified exact matching is untouched and has priority. The new path remains LEGACY fallback, not exact verified evidence.
4. Added a fail-closed parser and reusable actual-service replay. Preserves all nine original TXT files, byte hashes, raw case text, explicit answers, fee summaries and day-precision dates. It rejects unknown choices and inconsistent fee arithmetic. No screenshot verification or exact timestamp is invented.

## Measured benefit

198entries;196reported Selling quotations;172unique complete answer combinations;24repeat observations;2unexecutable charger entries. No conflicting identical-answer Selling amounts.

At the supplied reference values, with the actual hybrid createPricingService and UNKNOWN questionnaire fallback:
- Both-coupon policy passes:21 ->81unique combinations (+60, or120additional OFF/ON checks).
-89changed observations represent74unique combinations. All74now match the reported Selling amount BEFORE uplift and pass both actual payout checks (148checks).
- Zero formerly passing combinations lost. Availability unchanged:164of196observations priced;32remain inspection-required. In unique terms144of172priceable;28inspection-required.
-94eligibility signatures are NOT94priceable/exact captured profiles. Runtime exact-evidence coverage gained:zero; these are source-reported historical replay gains.

| Model(all512GB) | Unique observed | Before both pass | After both pass | Changed unique | Inspection |
|---|---:|---:|---:|---:|---:|
|iPhone 15 Plus | 24 | 4 | 16 | 15 | 4 |
|iPhone 15 Pro Max | 24 | 0 | 15 | 15 | 4 |
|iPhone 15 Pro | 14 | 0 | 7 | 7 | 2 |
|iPhone 16 | 24 | 7 | 15 | 15 | 4 |
|iPhone 16 Plus | 24 | 4 | 15 | 15 | 4 |
|iPhone 16e | 24 | 5 | 5 | 0 | 4 |
|iPhone 17 | 14 | 0 | 7 | 7 | 2 |
|iPhone Air | 24 | 1 | 1 | 0 | 4 |

Examples, actual payout OFF/ON:
| Model/sourcecase01 | Selling | Before OFF/ON | After OFF/ON |
|---|---:|---:|---:|
|15Pro512|35890|47667/47966|37227/37526|
|16Plus512|28270|39457/39756|29302/29601|
|17512|32010|46875/47174|33191/33490|

## Limits and unresolved cases

These are team-reported transcripts, not independently verified current Cashify captures. Replay uses a clearly labelled synthetic current reference timestamp to test the supplied reference amount, not a production freshness claim. No synthetic questionnaire profile or route is installed. Real production references/profiles can differ; matching must be checked during a separately authorized release verification.

Air and16e remain unchanged: no existing specialized rule was available to validate by wiring repair. This patch does not invent one from fitted deductions. All warrantyYes cases remain unchanged. Age-only Cashify prices conflict with the user's age-neutral rule:15of16groups cannot share one payout that satisfies both coupon states. A fixed OFF payout P requires maxSelling+1 <= P <= minSelling+1701. Examples4/5/6differ by5950–10570. Changing age in the newly enabled warrantyNo scope does not change its price. Generic/in-warranty age deductions remain an existing, separate policy gap; no age-based differences are introduced here.

The32inspection-required observations and2charger-unavailable entries are not silently made priceable. Original rejected collector evidence and reservation19/22 are untouched. No new quotations were collected.

## Validation

-12/12focused tests, including raw-source reproduction, corruptfee/unknownchoice rejection, all six own-rule case01checks, actualcoupon cap, age neutrality, reference/storage/answer/expiry guards and preserved C1 exact amount12247/payouts12148and12447.
-Existing six-iPhone router suite:12exact profiles,24mocked signed-lead payout checks and72eligibility cases pass.
-Existing HTTP acceptance suite:14stale/invalid/empty/missing-token cases409withzero writes;freshacceptance succeeds;rollback safeguards pass.
-Exact-final suite:8groups pass, including52944bounded-offer values and exact mismatch/expiry/conflict tests.
-Pricing golden regression27/27passes via node --import tsx. npm test:pricing CLI was blocked by this environment's tsx IPC socket EPERM; the same test file passes directly on main and candidate.
-Server and frontend TypeScript pass. Backend emitted build passes; its imported94rowJSON is data-equal to source and the compiled dispatcher executes successfully. TypeScript reformats JSON, so raw source/build hashes differ.
-Independent focused review APPROVE scoped offline patch.

Known baseline failure: scripts/test/pricing.iphone12-captured-profile.test.ts stops at its historical counterfactual assertion11686 !=17311on both currentmain and this branch. It is not a failure of C1's supported current quote. A separate focused C1 test proves12247exact gross and both payouts; the baseline test itself was not changed.

## Reproduce

```bash
node --import tsx --test scripts/test/pricing.team-text-wiring.test.ts
node --import tsx scripts/pricing/team-text-20261018.ts
node --import tsx scripts/pricing/replay-team-text-20261018.ts --out scratch/team-text/after.json
# Supply a separate checkout of the declared base for before comparison:
node --import tsx scripts/pricing/replay-team-text-20261018.ts --baseline-root /path/to/a6a4600-checkout --out scratch/team-text/before.json
node --import tsx scripts/test/pricing.six-iphone-router.test.ts
node --import tsx scripts/test/pricing.agent-z-acceptance.test.ts
node --import tsx scripts/test/pricing.exact-final-quotes.test.ts
node --import tsx scripts/test/pricing.regression.test.ts
npx tsc --noEmit -p tsconfig.server.json
npx tsc --noEmit
```

Apply only to the verified base with git apply --check before git apply, or port the four product files additively after reviewing intervening changes. Do not overwrite teammate work. The portable package includes patch/base/hashes, original inputs, before/afterCSVandJSON, review and focused logs. No activation or rollback was executed; rollback of this isolated change should retain existing acceptance code and existing exact evidence/configuration, which this patch never modifies.
