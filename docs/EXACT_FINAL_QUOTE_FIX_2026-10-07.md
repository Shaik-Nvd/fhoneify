# Exact final quotation engine — implemented change

Base main and public API health rechecked on 7 October: `93bcb5fd4e0cd289aadb2ebcd74103db4741e96b` / `93bcb5fd4e0c`. PostgreSQL connected; hybrid; all 44 release routes fresh. Frontend serves HTTP 200; authenticated deployment identity inspection was denied, so its commit is not independently verified. No production changes or database writes were made.

## Implemented behavior

Before fitted hybrid corrections, match the actual recorded Cashify Selling price by exact device, storage, current Get Upto reference, normalized answers, questionnaire and reviewed route. Require fresh exact Cashify reference, compatible fresh profile/route, screenshot provenance and fresh observations. Reject ambiguous prices, conflicting observations, unmeasured answers and unsafe profiles. Misses preserve existing hybrid availability. Signed quotes and lead revalidation use the same evidence fingerprint and pricing policy; changed or expired evidence invalidates old exact quotes.

For these exact matches, prefer the existing percentage uplift and ₹2,000 cap, then bound the offer so customer payout after the existing ₹99 fee is strictly above the captured selling price and no more than ₹2,000 above it, with or without the existing ₹299 coupon. Existing rounding and the ₹1,200 fee exemption are unchanged. This is a deliberate new bounded-net policy for exact matches, not a claim that the old gross uplift alone meets the net requirement. Legacy and fitted fallback formulas are unchanged. Config enables this proposed policy on this branch; it is not deployed and the historical approval does not approve this change.

## Exact measured coverage

168 eligible source observations yield 127 distinct cases. Safety rejects 12 observations representing 11 distinct unsafe hardware combinations. The index holds 116 safe combinations.

| Replay | Exact matches | Standard corridor passes | Coupon corridor passes |
|---|---:|---:|---:|
| Current public inputs, existing hybrid | 0 | 94/116 | 88/116 |
| Current public inputs, new engine | 113 | 114/116 | 113/116 |
| Recorded capture inputs, new engine | 116 | 116/116 | 116/116 |

The 113 exact matches span 37 variants, correct 41 distinct equivalent values, and all 113 pass both payout corridors. The third remaining safe variant case family is iPhone 12 Pro 256 GB: three capture references differ from current reference, so cache reuse is rejected. Two fallback quotes exceed the historical ₹2,000 comparison; they are not claimed accurate current Cashify comparisons.

The public probe observed 38 unique derived reference amounts, 38 fresh statuses and 38 stored profiles with no failures. Derivation verifies the existing starting-price transform, including tier discontinuities. The public API does not expose raw DB match confidence/source: this replay conditionally assumes exact Cashify records; deployed matching checks these fields directly. It is not deployed activation proof. Capture replay reproduces stored evidence; it is not independent validation. Historical city/PIN is absent and not inferred. Same Get Upto does not prove Selling price unchanged today.

## Scraper and maintenance

Reuse the existing scraper: no first-currency fallback, no default Yes/eSIM/age, no skipped missing variant, explicit accessory/condition selections, exact page identity checks, no session rotation or retries. Authentication, CAPTCHA and rate-limit responses stop collection. Serial scheduling requires explicit campaign/ceiling, reserves every attempt durably before fetch, locks concurrent workers, persists spacing across restarts, and enforces at least 30 seconds between starts. Zero allowance means zero fetches. The old helper cannot produce the full selected-state provenance, so its output stays unverified and is never automatically admitted to the engine. A reviewed sanitized external collector manifest can be loaded through EXACT_FINAL_QUOTE_EVIDENCE_FILE; malformed manifests safely disable that cache.

The regenerated 116-job deduplicated queue uses current public derived amounts: 113 rechecks scorable against captured references, three changed-reference jobs unscorable. Collection remains disabled. Priority is clean, cosmetic, then hardware, not invented demand. No new Cashify requests, leads or writes were made.

## Verification and remaining work

New tests cover the real missing-box correction (₹5,970 → recorded ₹5,650), quote/lead agreement, moved/expired/conflicting evidence, unknown answers, bill safety, 52,944 payout/tier combinations, Selling-price extraction, explicit answers, zero allowance, pacing, auth stop, durable budget and worker locks, valid/invalid manifest loading. Existing release, measured-point, accessories, hybrid, production, golden, reference-data, consistency and identity suites pass; hybrid includes 6,768 ordinary catalog quotes. Final production build and Next TypeScript pass. Server TypeScript retains six pre-existing admin/inventory/standalone-script errors; no new pricing errors.

Remaining: reviewed publication and deployment, runtime activation verification, independent current Selling-price checks under an explicitly bounded new allowance, changed-reference iPhone cases, unsafe inspections, unmeasured catalog/condition combinations and market context. Offline evidence cannot honestly guarantee every current Cashify price. This implementation avoids guessing those missing prices while improving all supported combinations now.

Rollback: ENABLE_EXACT_FINAL_QUOTE_CACHE=false disables the new index while retaining hybrid; PRICING_RELEASE_CANDIDATE=off restores existing legacy rollback. Existing evidence freshness is preserved, not extended. No new GitHub dependencies or broad research are needed.
