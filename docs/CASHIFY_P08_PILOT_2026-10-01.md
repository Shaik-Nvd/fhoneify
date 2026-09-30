# POCO F4 P08 verified pilot

One owner-approved local block completed: **5/5 verified quotations**, with
**5/5 final screenshots visually matching SQLite amounts and stored SHA-256
hashes**. No pickup/order was submitted. Authentication used the user's new
manual login, verified through a stable final quotation before the diagnostic.

- Device: POCO F4 5G, 8 GB/128 GB.
- Plan block: `0i55edv:blk2`.
- Run: `b96dea11-b2f6-461b-a9b2-9c1275cbaee6`.
- Collection window: 2026-09-30 19:57:42.763–19:59:23.347 UTC (2026-10-01 IST).
- Local store: ignored `research-evidence/matrix.sqlite`, `matrix_attempts` rows for this run.
- Redacted final-card screenshots: ignored `research-evidence/matrix/`; paths and
  hashes are preserved in each observation. No session or authenticated page was uploaded.

| Experiment | Final Selling price | Deduction from opening baseline |
| --- | ---: | ---: |
| `0i55edv:baseline#2` | ₹7,330 | ₹0 |
| `0i55edv:screenCondition=scratch_gt2` | ₹6,150 | ₹1,180 |
| `0i55edv:bodyScratches=scratch_gt2` | ₹6,890 | ₹440 |
| `0i55edv:screenCondition=scratch_gt2+bodyScratches=scratch_gt2` | ₹5,720 | ₹1,610 |
| `0i55edv:baseline-close#2` | ₹7,330 | ₹0 |

The public Get Upto remained **₹7,270** throughout and is stored separately.
Opening/closing final-price drift was **₹0**, within the predeclared ₹10
tolerance. Their questionnaire fingerprints matched. All five timestamps,
run/experiment/baseline identities, complete requested vectors, changed factors,
actual answer trails, and screenshot hashes were checked again from read-only
SQLite after collection. The block passed `blockValidity`.

Actual detail headings were `Screen Physical Condition`,
`1. Scratches on device Body`, and `2. Dents on device Body`.
Selected detail options were `More than 2 scratches on screen`,
`More than 2 scratches`, and `No dents`, only in the experiments requiring them.
Every option in those detail groups was recorded with its selection state.
Calls, touch, and original screen were Yes; charger and box were selected.
All actual hardware fault cards were unselected, including the extra
`Battery Faulty` card, retained as UNKNOWN. The absent battery-health card,
warranty, bill, and age questions were retained as NOT_ASKED rather than No.

The additive deduction prediction is **₹1,620**; actual minus predicted is
**−₹10**. The simple multiplicative prediction is **₹1,549.17** (residual
**+₹60.83**); maximum-only overlap predicts **₹1,180** (residual **+₹430**).
Claude's `classifyInteraction` returns **ADDITIVE** at its documented ₹20
interaction tolerance. This one block distinguishes those three simple
predictions at that tolerance. It does not establish a general POCO rule,
deduction scaling across prices, other interactions, or a calibrated Fhoneify model.

The heading failure was reproduced by the sanitized live fixture: the old
ancestor search returned the selected option's own text from its immediate
parent. The replacement verifies the sibling header and option-grid component,
one heading, unique options, and consistent card selection classes, then
rechecks the same component after clicking. Five focused offline fixture tests,
matrix integration checks, four final-quote/security tests, three checkpoint
tests, eighteen planner tests, and TypeScript checking passed before the run.
Live screen and both body groups subsequently passed with real final quotations.

No current blocker remains for this P08 block. Further model/family replication
and broader matrix execution require their own approved scope.
