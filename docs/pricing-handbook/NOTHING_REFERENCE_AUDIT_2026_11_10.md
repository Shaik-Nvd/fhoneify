# Nothing / CMF reference and catalog audit

Audit work order: 10 November 2026. Production read completed **11 November 2026, 07:20:47 UTC**. Baseline checkout: `0a683cd1ec14948e8135fd5237d5ccb90a202474`; the catalog comparison also inspects the concurrent working-tree catalog changes. This is a read-only audit, with no reference refresh, database write, schema/auth change or Cashify request.

The connected Supabase project list exposed an unrelated project only. The authorized fallback used the local root production configuration through Prisma, with `SET TRANSACTION READ ONLY`; `SHOW transaction_read_only` returned `on`. Only Nothing/CMF reference/profile fields were selected. Credentials and personal information were not emitted. Full per-variant values, differences, source pointers, timestamps and profile modes remain in the gitignored private file `release-test-logs/android/reference-audit.json`.

## Production references

| Finding | Count |
|---|---:|
| Source variants, from 13 extracted model `results.json` files | 34 |
| Production reference rows, including placeholder | 32 |
| Source variants with an exact database device key | 31 |
| `FRESH` references, each exactly matching its 8 November source baseline base | 27 |
| `REFRESH_FAILED` CMF references | 4 |
| Placeholder reference (`Nothing Phone 4b`, storage `128 GB`, price zero, `MISSING`) | 1 |
| Source variants without production references | 3 |

The 27 fresh rows were last verified on 8 November 2026 between 10:07:42 and 10:08:51 UTC. The four CMF rows retain references last verified on **8 September 2026 at 21:34:57 UTC**. Their last refresh attempts/failures were on 8 November 2026; each has nine consecutive failures. They are below the supplied source bases by between **Rs 1,040 and Rs 1,620**. Their stored prices are existing database values, not newly approved source replacements.

Missing exact production keys:

- Nothing Phone 4a, 6 GB/128 GB.
- Nothing Phone 4b, 6 GB/128 GB.
- Nothing Phone 4b, 8 GB/128 GB.

Adding these catalog entries does not create production reference rows. They must remain pending reference availability; no recorded source price was written into production or added as a catalog fallback by this audit. The existing unrelated placeholder reference is retained in the database and cannot match either new RAM-specific Phone 4b identity.

## Catalog and refresh matching

The baseline catalog contains **32 Nothing rows: 31 real variants and one placeholder**, rather than 31 total rows. The supplied plan's 31 count corresponds to the real variants. The working-tree catalog has 34 source-matched variants: the three missing variants have been added, the placeholder removed, and the CMF Phone 2 Pro 8/128 `phoe` link spelling repaired by the concurrent implementation agent. This audit made no catalog edits.

A local call to the actual refresh catalog loader includes all 34 variants. Each added key resolves to its curated RAM/storage-specific URL, and each matches its own recorded storage under the existing variant matcher. Exact repository keys are lowercased `brand|model|storage`; there is no fuzzy fallback from the old storage-only placeholder to the added keys. URL availability was not checked because fetching Cashify is excluded.

A separate identity limitation remains: the existing `canonicalDeviceName('Nothing', 'CMF by Nothing Phone ...')` prepends `Nothing`, producing a normalized name with an extra brand prefix. In an offline check against the supplied source's recorded headings, the existing page identity verifier accepts **30/34 variants** and rejects the **four CMF variants**. This demonstrates a name-matching incompatibility; it does not establish the historical cause of their refresh failures, because no fresh Cashify page or failure-detail text was read. Fixing the reference refresh is outside this work order.

## Questionnaire profiles

All **13** production model profiles have status `OK`, parser `cashify-questionnaire/1`, and `observedAt` timestamps on **28 October 2026** (10:29:58 through 10:30:46 UTC). Each reports two variants checked.

| Model set | Warranty | Bill | Age |
|---|---|---|---|
| Nothing Phone 1 | `NOT_ASKED` | `NOT_ASKED` | `NOT_ASKED` |
| Other 12 Nothing/CMF models | `ASKED` | `ASKED` | `NOT_ASKED` |

Phone 1's stored profile matches the supplied questionnaire evidence. For the other models, the supplied collection includes a conditional age page although the stored initial-page profile says age `NOT_ASKED`. The model integration must preserve the raw age answer for covered evidence models instead of treating the stored initial-page mode as proof that age never applies. No profile values were changed.

## Limits

This audit establishes database reference/profile state and offline catalog identity behavior. It does not establish deployed revisions, live frontend/OTP/lead behavior, current Cashify page availability, or refreshed reference coverage. Per-variant source-derived exports remain private; this public report gives aggregate results and actionable coverage gaps only.
