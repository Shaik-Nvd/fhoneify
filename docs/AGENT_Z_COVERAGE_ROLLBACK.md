# Agent Z coverage and rollback audit

Audit target: release candidate `eb5d1f75bad399b411bd16028e3d02bccf6b7b6c`, with evidence files already in this checkout and the two Glass ZIPs in Downloads. No capture, broad replay, production query, or database write was performed.

## Coverage reconciliation

The reported `118 combinations / 42 variants` cannot be reconciled to exact evidence IDs in the supplied package or this checkout. A's reported commit `b4eff8a0d835261a564fd4e8a96f0770f2337b03` is not present as a Git object. The newer `Fhoneify_Glass_Shadow_2026-10-09 (1).zip` has SHA-256 `092dd489523956c9cfa1b94c97bcfc77c2aad0a264c7ba929c1fdb20d5b7359a`; its patch and shadow output match the earlier ZIP, and its extra files are packaging/source manifests. It contains no release-candidate capture index or 118/42 ID list. The Glass patch itself only names four A/B anchors.

The existing default index builder imports `release-candidate-observations-2026-10-02.json`; it does not import `release-followup-results-2026-10-03.json`. A focused run of that builder's actual evidence/index functions returned 168 rows, 12 rejected rows, 116 canonical buckets, and 38 variants. The 12 rejections are all `UNSAFE_OR_INCOMPLETE_DIAGNOSTICS`:

`xiaomi-candidate-2026-10-01:NOTE-SEVERE`; `xiaomi-severe-followup-2026-10-01:N-PORT`, `N-SPEAKER`, `N-FRONT`, `N-BACK`, `N-WIFI`, `N-FINGER`, `N-CAMPAIR`, `N-AUDIOPORT`, `N-FOUR`, `N-FIVE`, and `N-SIX`.

These are intentional safety exclusions, not lost eligible clean or single-condition exact rows. The 156 admitted evidence rows reduce to 116 canonical buckets because matching variant, reference, and normalized answer identities share a bucket. There are 24 groups with repeated screenshot hashes in the source rows; those repeated images are temporal repeats and do not provide independent evidence. Examples include `FM004_LIVE_A` / `FM004_LIVE_CLOSE_A`, `FM017_LIVE_A` / `FM017_LIVE_CLOSE_A`, and the paired Nord temporal/recovery IDs. They can corroborate one exact answer but do not add independent validation.

The stored October 7 evaluation reports 116 exact combinations / 38 variants against captured references and 113 / 37 against its saved public input snapshot. The only three saved-snapshot misses are:

| Exact evidence ID | Variant | Captured Get Upto | Captured Selling | Saved-snapshot decision |
|---|---|---:|---:|---|
| `team-workbook-2026-10-02:FM004_LIVE_CLOSE_A` | Apple iPhone 12 Pro, 256 GB | 24,460 | 24,760 | LEGACY |
| `team-workbook-2026-10-02:FM004_LIVE_B` | Apple iPhone 12 Pro, 256 GB | 24,460 | 20,790 | LEGACY |
| `team-workbook-2026-10-02:FM004_LIVE_C` | Apple iPhone 12 Pro, 256 GB | 24,460 | 16,730 | LEGACY |

The saved public snapshot has Get Upto 24,780 for this variant. The captured reference mismatch correctly prevents reuse. This is a saved-input comparison, not a current live quote or fresh Cashify check.

The separate follow-up fixture has 11 accepted numeric observations, but none is silently promoted into the 116-row count. Its records lack the canonical diagnostics/provenance shape consumed by the default index builder. Several are explicitly marked `UNSUPPORTED_NO_VERIFIED_RUNTIME_REFERENCE_PROFILE`; the four Nord temporal/recovery rows reuse the same two screenshot hashes. Reconstructing canonical answers and proving exact current reference, route, profile, and evidence eligibility would be additional work. Thus this fixture is a plausible source of the differing claim, but does not substantiate 118/42 by itself. No eligible rows were identified as accidentally lost from the existing default index; the five-case difference remains unidentified without A's exact ID list/source fixture.

The default index also admits the preregistered roles `team-workbook-2026-10-02:FM004_LIVE_C` and `FM017_LIVE_C` as exact observations; it does not filter on `evaluationRole`. Preserve their `PRESERVED_PREREGISTERED_CONDITIONAL_GLASS_HOLDOUT` role in any accuracy analysis. They are not independent validation of the glass shadow. The glass shadow itself permits only the four A/B controls named in the ZIP and establishes zero untouched eligible targets. Runtime lookup separately requires a fresh exact Cashify reference and current compatible route/profile; the frozen counts do not guarantee a runtime match after reference movement or evidence expiry.

## Rollback behavior

The focused regression is `scripts/test/pricing.agent-z-rollback.test.ts`. It uses a deterministic in-memory exact capture, unreachable database URL, and in-memory lead-create spy. It exercises cache-on hybrid to cache-off hybrid and hybrid to explicit legacy service behavior, confirms each mode issues and accepts its own fresh signed token, and verifies old version tokens are recomputed/rejected by the real lead controller with HTTP 409 and zero writes. It also verifies the previously accepted lead record remains unchanged after rollback attempts. `PRICING_RELEASE_CANDIDATE=off` resolves to legacy mode.

Rollback switches:

| Switch | Result | Token behavior |
|---|---|---|
| `ENABLE_EXACT_FINAL_QUOTE_CACHE=false` while hybrid remains active | ordinary hybrid fallback quotes continue | new hybrid fallback token accepted; old cache-version token rejected pending fresh acceptance |
| `PRICING_RELEASE_CANDIDATE=off` | legacy pricing mode | new legacy token accepted; prior hybrid token rejected pending fresh acceptance |

The HTTP controller now requires a signed, currently valid quote token in every mode. Tokenless recomputation returns 409 before persistence, including explicit legacy rollback. Accepted lead records remain as stored; changing the mode affects only later submissions.

Verification: `node --import tsx scripts/test/pricing.agent-z-rollback.test.ts` passed. The test is offline and uses in-memory persistence only.

Portable admission inventory: `node --import tsx scripts/pricing/audit-agent-z-coverage.ts`. This lists every admitted/rejected source ID without replaying quote prices. The source fixture has the same Git blob on verified main and this branch: `5aa5e2c41511976ddc81bacafa7dc8a180dadccd`.

A full code rollback to `eb5d1f7` or verified main reopens tokenless persistence in at least one mode. Retain/backport the all-mode signed-token gate and client recovery fixes. The two pricing configuration switches above preserve that gate.
