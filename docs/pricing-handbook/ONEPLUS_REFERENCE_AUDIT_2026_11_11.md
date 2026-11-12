# OnePlus reference and catalog audit

Production read completed **11 November 2026 at 07:25:20 UTC**, on worktree baseline `769595d066f7931b063e245fa927811369397e03`. The working-tree catalog was inspected again after concurrent catalog additions. This audit changed no application code or catalog data, performed no Cashify fetch or reference refresh, and made no production writes.

The connected Supabase account exposes an unrelated project rather than Fhoneify. The authorized fallback used the local root production configuration through Prisma. Queries ran inside `SET TRANSACTION READ ONLY`; `SHOW transaction_read_only` returned `on`. Only OnePlus reference/profile columns were selected. Full per-variant values, differences, timestamps, source pointers and modes remain in gitignored `release-test-logs/android/oneplus-reference-audit.json`; this public report summarizes coverage.

## Source and production reference coverage

| Item | Count |
|---|---:|
| Extracted source model folders | 53 |
| Source variants | 115 |
| Source rows | 5,567 |
| Priced rows / pending rows | 5,539 / 28 |
| Production reference rows | 106 |
| `FRESH` / `REFRESH_FAILED` production rows | 105 / 1 |
| Source variants with an exact production device key | 105 |
| Source variants missing a production reference | 10 |
| Referenced source variants whose database reference equals observed baseline base | 102 |

The other three comparisons are database-minus-observed-base differences of **+Rs 10, +Rs 10 and +Rs 50**: OnePlus 12 12/256, OnePlus 12R 8/256, and OnePlus 7T Pro McLaren Edition 12/256 respectively. Across the 105 comparisons the median difference is zero and the range is zero through +Rs 50. The collection occurred on 8–9 November, while fresh production references were verified on 8 November between 09:33:11 and 09:37:48 UTC; the dates are retained separately in the private audit.

The single `REFRESH_FAILED` row belongs to OnePlus 7T Pro McLaren Edition 12/256. Its last successful verification was **8 September 2026 at 21:34:57 UTC**. No source baseline was substituted for this existing reference.

Ten source variants have no exact production reference:

- OnePlus 13s: 16 GB/512 GB.
- OnePlus N6: 4 GB/128 GB and 6 GB/128 GB.
- OnePlus N6 Lite: 4 GB/64 GB.
- OnePlus N6x: 4 GB/64 GB.
- OnePlus Nord CE 6 5G: 8 GB/128 GB and 8 GB/256 GB.
- OnePlus Nord CE 6 Lite 5G: 6 GB/128 GB, 8 GB/128 GB and 8 GB/256 GB.

**OnePlus 9RT 5G 12/256 has a fresh, exact production reference**, verified on 8 November at 09:34:58 UTC. It has no supplied collection data and its baseline catalog row has no curated Cashify link. Those are separate coverage gaps; absence of supplied evidence does not mean absence of a production reference. Its existing database source URL is RAM/storage-specific.

OnePlus 9RT 5G 8/128 has a reference and a measured baseline but only 18 priced source rows; its other 28 rows remain pending. The reference audit does not turn pending condition cases into measurements.

## Catalog and matching

The baseline catalog has 106 OnePlus variants: 105 with supplied source data and the 9RT 12/256 variant without source data. Ten source variants were absent. The concurrently updated working-tree catalog has **116 variants**, including all 115 supplied variants; this audit did not edit it.

Offline calls to the actual refresh catalog loader find all **115/115 source variants** in the updated catalog. The existing page identity verifier accepts each recorded model heading and matching RAM/storage pair: **115/115**. Newly added variants use their curated variant-specific URLs. This verifies local catalog inclusion and identity compatibility, not live URL availability. Exact lowercase `brand|model|storage` repository keys remain distinct; no missing reference was filled through fuzzy matching or a hardcoded source base.

Adding catalog variants alone does not create production references. The ten missing reference rows remain a release limitation pending an authorized refresh or separate reference-data process.

## Questionnaire profiles

Production contains **49 OnePlus model profiles**, all using parser `cashify-questionnaire/1`:

| Stored modes: warranty / bill / age | Models |
|---|---:|
| `NOT_ASKED / NOT_ASKED / NOT_ASKED` | 27 |
| `ASKED / ASKED / NOT_ASKED` | 21 |
| `UNKNOWN / UNKNOWN / UNKNOWN` | 1 |

The unknown profile belongs to OnePlus 7T Pro McLaren Edition; its status is `NOT_FOUND`, zero variants checked, observed on **4 November 2026 at 11:30:16 UTC**. The other 48 profiles have status `OK`, observed on 28 October 2026. All timestamps and variant counts are retained in the private audit.

Four supplied models lack a production questionnaire profile: **N6, N6 Lite, Nord CE 6 5G and Nord CE 6 Lite 5G**, covering eight supplied variants. N6x does have an existing `ASKED / ASKED / NOT_ASKED` profile despite its missing source-variant reference row.

The source case inventory contains age/warranty cases on **55 variants** and no age cases on **60 variants**, consistent with the work order's split. This is distinct from production initial-page profile metadata: conditional age answers must remain available to the evidence model where supported. The audit changed no questionnaire profiles.

## Limits

These checks establish production reference/profile state and offline source/catalog matching. They do not verify deployed revisions, live OTP/lead flows, current Cashify availability, pending condition prices, combination accuracy, or refreshed coverage. Source-level exports remain private, and the production read was restricted to reference/profile tables.
