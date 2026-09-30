# Phase 2 P08 replication scope

Prepared for owner approval. Maximum **15 new planned quotation attempts**:
three training devices, five quotes each, using the verified collector and local
SQLite. No collection is authorized by this document alone.

| Purpose | Training device | RAM/storage | Existing block ID | Role | Catalog Get Upto for sampling |
| --- | --- | --- | --- | --- | ---: |
| Lower-priced POCO | POCO C51 | 4 GB/64 GB | `0ip731n:blk1` | CORE | ₹4,530 |
| Higher-priced POCO | POCO X8 Pro | 8 GB/256 GB | `09l641s:blk2` | ANCHOR | ₹21,060 |
| Other brand | Samsung Galaxy M32 | 4 GB/64 GB | `1wrfoy8:blk2` | ANCHOR | ₹3,530 |

Sampling values are Claude's historical catalog headlines, not current final
offers. Actual opening final quotations determine the comparison price bands.
All three models are training devices. Held-out validation models remain untouched.

Each block runs in this order with its own fresh run ID: opening clean baseline,
`More than 2 scratches on screen`, `More than 2 scratches` on body with `No dents`,
both scratch conditions with `No dents`, and closing clean baseline. All other
requested factors retain that device's planned baseline. Actual question presence
and exact selected options are verified at collection, never assumed from the plan.

The two ANCHOR blocks already contain P08 and its same-block singles. C51's
existing training block contains its baseline, both requested singles, and closing
baseline, but no P08 pair. The explicit research-only supplement
`scripts/pricing-research/phase2/poco-c51-p08.json` supplies exactly that pair:
`0ip731n:screenCondition=scratch_gt2+bodyScratches=scratch_gt2`.
It references `0ip731n:baseline`, `0ip731n:screenCondition=scratch_gt2`, and
`0ip731n:bodyScratches=scratch_gt2`, with a complete answer vector. Claude's planner
and serialized original plan are unchanged. No other pair is generated.

The runner selects exactly these five experiments from each block; it never
executes the other planned members. The C51 command adds
`--supplement-file scripts/pricing-research/phase2/poco-c51-p08.json`.
Each command requires `--pilot --headed --max-experiments 5` and one explicitly
selected recent local session that passed the final-quotation login gate.

Acceptance: all five final quotes, verified complete answer evidence, redacted
screenshots with matching SQLite prices/hashes, unchanged live Get Upto, opening/
closing questionnaire fingerprints, and baseline drift at most ₹10. Earlier runs
are never spliced into a new block. Authentication challenges stop collection.
Unsupported questionnaires stop that device; record the exact issue and propose
another training device rather than silently mapping questions or adding retries.
Replacements are outside this exact three-device approval.

For valid blocks report rupee and baseline-relative percentage deductions,
additive prediction, combined deduction, residual (actual minus additive), and
the alternative interaction predictions at Claude's ₹20 analysis tolerance.
Inspect any ancillary question/answer changes for conditional confounding.
Keep the earlier POCO F4 result exploratory. Three POCO phones across price bands
can test a provisional scratch interaction; they cannot establish all condition
rules, within-model repeatability, or independent validation accuracy.
