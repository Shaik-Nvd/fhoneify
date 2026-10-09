# Agent Z exact quote evidence review

Review snapshot: worktree based on `5fc2ceb3d0fb691084c65f12b91f694c2efa0c2a` (`origin/main`), with the exact-final-quote and current integration patches present during review. This was a read-only review. No implementation files were changed and no network or database access was used.

## Findings

The exact final-selling cache has explicit runtime gates. A lookup requires an exact, fresh Cashify repository record for the selected device and storage; reference, route, profile, and capture evidence must be current; the stored questionnaire profile must be `OK` and compatible with the observed route; diagnostics must parse and pass the release safety checks; and normalized answers plus the Get Upto amount must match the captured key. Captures with invalid provenance, invalid amounts or dates, unsafe/incomplete diagnostics, stale timestamps, or conflicting Selling prices are rejected or abstained from. Same-price candidates are fingerprinted with their evidence identifiers, hashes, amounts, and timestamps. A miss leaves the existing hybrid result in place.

The quote service carries the matched evidence fingerprint and offer policy into the pricing version and lead audit. Lead verification recomputes the quote against the current evidence, so a moved reference, expired capture, conflict, or changed policy invalidates the prior exact quote. The pricing configuration selects the bounded-net policy for exact matches; that is a new behavior for those exact matches, while legacy and fitted fallback formulas remain on their existing paths.

The proposed glass candidate is a research shadow. The HTTP test confirms its result is omitted from the public quote response and lead record, and its candidate output is marked `researchOnly`. Eligibility is narrow: exact device/storage manifest spec, unchanged validated reference, safe diagnostics containing only the supported cracked-glass component, and individually matching clean and heavy-scratch anchors with the expected IDs, roles, price, capture date, and screenshot hash. Both anchors must then pass the exact index's normal freshness, route, profile, and diagnostics checks.

There is no independent untouched cracked-glass outcome establishing the glass transfer. The method derives glass loss by applying a frozen ratio to the clean-minus-heavy-scratch anchor difference. In the observed iPhone 12 Pro example, the anchors differ by ₹3,970 and the ratio yields an ₹8,030 glass loss. This is an inference from scratch evidence, not a verified Cashify glass price. Keep the candidate shadow-only until independent glass outcomes support it.

## Focused checks observed

Commands were run from `scratch/agent-z-release`:

```powershell
node --import tsx scripts/test/pricing.exact-final-quotes.test.ts
node --import tsx scripts/test/pricing.glass-shadow-http.test.ts
node --import tsx scripts/test/pricing.release-flow.test.ts
git diff --check
```

Observed outcomes:

- Exact-final-quote suite passed all 8 groups, including moved/expired references, conflicting observations, unsupported answers, lead/token consistency, 52,944 bounded-payout cases, evidence loading, and durable collection budget checks. It reported zero browser requests and zero database writes.
- Glass-shadow HTTP integration passed. It asserted public quote equality with the control, no shadow in public quote or lead payloads, abstention for mutated anchors and unsupported conditions, and zero database writes.
- Release-flow suite passed 38 checks with 0 failures and 5 in-memory leads, zero database writes.
- `git diff --check` produced no diagnostics.

These focused checks support the integration and privacy boundaries above. They do not independently validate the accuracy of the inferred glass loss or establish that captured Selling prices remain current beyond the freshness window.
