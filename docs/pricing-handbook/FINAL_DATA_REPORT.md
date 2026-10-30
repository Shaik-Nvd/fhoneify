> Quote-level records and audit exports referenced below are retained locally/private; they are not uploaded with this public handbook.

> This is the dated intake analysis. The completed integration, verification and release status are in [IPHONE_RELEASE_2026_10_30.md](IPHONE_RELEASE_2026_10_30.md).

# Final iPhone intake: verified analysis

Prepared 30 October 2026 from `C:\Users\shoae\OneDrive\projects\fhineify_data\last_data`. These are the owner's team-supplied Cashify observations. No pricing code, database, production data or deployment was changed by this analysis.

## Counts

| Measure | Count |
|---|---:|
| ZIP files supplied | 47 |
| Byte-distinct archive contents | 37 |
| Identical archive copies | 10 |
| Archive contents not byte-identical to the previous `new_data` folder | 27 |
| Parsed text case occurrences after removing identical archives | 7,879 |
| Report records after case/export deduplication | 6,380 |
| Records with a numeric Selling price | 4,334 |
| iPhone models with numeric quotes | 25 |
| Model/storage pairs with numeric quotes | 80 |
| Priced records in the iPhone 12–18 generations | 1,643 |
| Pending/unresolved records | 1,246 |
| Other unavailable/unpriced records | 800 |

The priced-record count is not the number of independent experiments. It preserves genuine retests, source case systems and dated observations; repeated answer selections can still occur. Candidate fitting further deduplicates equivalent single-fault contrasts. “New archive contents” does not mean every contained quote is new: compare semantic observations before adding training data. Unavailable/unpriced records are not numeric zero quotes; this aggregate includes absent questions and other unpriced outcomes rather than asserting every row has the same cause.

## Findings that matter for the engine

**iPhone 12 Mini now has its own direct evidence:** 147 numeric records across 64/128/256 GB. Its flawless Selling prices are ₹14,410 / ₹15,990 / ₹16,640. Controlled observed deductions include front camera ₹1,250, back camera ₹2,500, volume/power ₹500, charging port ₹1,250, battery service ₹2,000 and battery health 80–85% ₹600 across all three storages. These are condition deductions from the observed flawless Selling baseline, before Fhoneify's bonus and fees. They can test or replace a sibling-derived Mini profile; this package does not claim that replacement has already happened.

**A single global percentage would lose useful information.** Across this intake, 1,510 deduplicated eligible single-functional contrasts constrain 450 model/fault groups. Comparing fixed rupees with a fraction of flawless Selling across storage chose fixed rupees for 350 groups and a fraction for 68. Zero-change controls can appear in these groups; they are not automatically a repair cost for a feature the app does not offer. Mini Wi-Fi/Bluetooth losses vary by storage (₹5,660 / ₹6,240 / ₹6,480), unlike its camera and battery repairs.

These candidate comparisons are exploratory, not independent final-engine accuracy. The winning form is selected using the available storage comparisons, and the denominator here is flawless Selling B, not necessarily database reference R. Establish the B-to-R relationship and use frozen validation before promoting a coefficient into the runtime. Source-linked deductions and all candidate scores are in `../../data/pricing-evidence/final-data-2026-10-30/`.

**Older iPhones have useful direct tests here.** Completed records include 6/6 Plus, 6S/6S Plus, 7/7 Plus, 8/8 Plus, SE generations, X/XS/XS Max and 11 variants. Run them through the production service route as well as the calculator to catch routing, question mapping and fee errors. Preserve different source sessions rather than averaging them indiscriminately.

**Completed and pending exports coexist.** The final folder contains a completed 15 Plus report as well as an unfilled 15 Plus template. The 17, 17 Pro, 17 Pro Max, 17e and Air records in this intake have no numeric quotes. This says nothing negative about earlier completed evidence for those models: retain it. Do not turn these templates into zero-valued training rows or erase previous coverage.

**Single-fault data identifies deductions, not every combination rule.** The analysis exports baseline comparisons; running analyse.py also regenerates paired contrasts. They are derived comparisons, not additional independent Cashify collections. Preserve evidence-supported repair overlaps, warranty/age branch changes, minimums and scrap behavior. Four small archive/storage groups have no usable same-group baseline and are excluded from baseline-derived fitting; see `analysis-summary.json` for their exact identities.

## Extraction verification completed

- Original source hashes checked: 47.
- JSON price comparisons: 285; JSON input-field comparisons: 287.
- Independent case-summary price checks: 1,101; storage-matrix price checks: 1,438.
- Complete fee arithmetic checks: 1,977.
- Parser regression assertions: 18 plus 9 compact-input checks, passing. The completed input pass recovers 5,220 explicit answer fields from the original extraction.
- Unresolved conflicting selected inputs: 0. Conflicting known fee amounts: 0.

The importer was corrected for curly-apostrophe Cashify labels, Price Summary totals, missing session dates in mirrored members, explicit pending headings, and distinct source numbering systems. In particular, one report's case 15 is microphone and another's is vibrator; keeping the case systems separate resolves that false collision. Complementary mirrors supplied 567 previously omitted fee fields, with source pointers and no conflicting amounts. Eleven explicitly pending headings were kept pending. All raw files were preserved.

Some observations lack a full independent JSON/table representation; passing the available cross-checks does not assert every field was independently corroborated in every row. Source pointers remain available for review.

## What was and was not done

Done: read-only intake, normalization, deduction analysis, extraction tests, strict Codex handbook, owner instructions and portable handoff.

Not done in this task: fitting these final observations into the current production engine, benchmarking that engine against this complete intake, running a Next build/browser/OTP test, committing/pushing or deploying a change. See `IMPLEMENTATION_HANDOFF.md` for the concrete next implementation instruction.

The handbook requires the approved bonus on original R, capped at ₹2,000. It supports future reference changes without storing final-price lookups. It does not promise that changing reference alone predicts future changes to Cashify's repair or age rules.

## Coverage of this final folder

| Model | Priced records | Priced storage GB | Pending/unresolved | Other unavailable/unpriced |
|---|---:|---|---:|---:|
| iPhone 11 | 144 | 64, 128, 256 | 0 | 0 |
| iPhone 11 Pro | 153 | 64, 256, 512 | 0 | 79 |
| iPhone 11 Pro Max | 153 | 64, 256, 512 | 0 | 79 |
| iPhone 12 Mini | 147 | 64, 128, 256 | 0 | 27 |
| iPhone 12 Pro | 291 | 128, 256, 512 | 5 | 19 |
| iPhone 12 Pro Max | 150 | 128, 256, 512 | 0 | 82 |
| iPhone 13 | 147 | 128, 256, 512 | 0 | 27 |
| iPhone 13 Mini | 147 | 128, 256, 512 | 0 | 27 |
| iPhone 13 Pro | 200 | 128, 256, 512, 1024 | 0 | 32 |
| iPhone 15 | 165 | 128, 256, 512 | 0 | 67 |
| iPhone 15 Plus | 168 | 128, 256, 512 | 174 | 3 |
| iPhone 15 Pro | 228 | 128, 256, 512, 1024 | 236 | 8 |
| iPhone 17 | 0 | — | 116 | 0 |
| iPhone 17 Pro | 0 | — | 174 | 0 |
| iPhone 17 Pro Max | 0 | — | 232 | 0 |
| iPhone 17e | 0 | — | 116 | 0 |
| iPhone 6 | 204 | 16, 32, 64, 128 | 4 | 86 |
| iPhone 6 Plus | 144 | 16, 64, 128 | 0 | 0 |
| iPhone 6S | 204 | 16, 32, 64, 128 | 0 | 86 |
| iPhone 6S Plus | 381 | 16, 32, 64, 128 | 15 | 27 |
| iPhone 7 | 144 | 32, 128, 256 | 0 | 0 |
| iPhone 7 Plus | 144 | 32, 128, 256 | 0 | 0 |
| iPhone 8 | 144 | 64, 128, 256 | 0 | 0 |
| iPhone 8 Plus | 144 | 64, 128, 256 | 0 | 0 |
| iPhone Air | 0 | — | 174 | 0 |
| iPhone SE 1st Generation | 192 | 16, 32, 64, 128 | 0 | 0 |
| iPhone SE 2020 | 141 | 64, 128, 256 | 0 | 0 |
| iPhone X | 102 | 64, 256 | 0 | 72 |
| iPhone XS | 153 | 64, 256, 512 | 0 | 79 |
| iPhone XS Max | 144 | 64, 256, 512 | 0 | 0 |
