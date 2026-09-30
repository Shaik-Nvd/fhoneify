# Cashify Pricing Research — Experimental Design v2

Status: design only. Nothing here collects prices, changes pricing, touches the
database or modifies the collector. The collector (`scripts/pricing-research/`,
`lib/researchPricing/`) is owned by Codex; this document and
`scripts/research-design/` define **what to measure and how to read it**.

Generated plan: `scripts/research-design/output/` (regenerate with
`npx tsx scripts/research-design/plan.ts`; tests:
`npx tsx scripts/research-design/planner.test.ts`).

---

## 0. Summary

| | Original campaign | This design |
|---|---|---|
| Unit | every catalog variant | stratified sample of models |
| Devices | 2,227 variants | 227 models (17 anchor, 159 core, 51 held-out validation) + 14 storage-contrast variants |
| Experiments / device | 3 (A, one of B, one C) | anchors ≈ 80, core ≈ 26, validation 7 |
| Quotation requests | 6,681 | 5,958 (0.89×) |
| Runtime at observed p50 (32 s/quote) | 59 h | 53 h |
| Distinct single-factor contrasts | ≤ 2 per device, different factor per device | 4,551 OFAT contrasts across 48 of the 49 non-baseline factor levels |
| Pair interactions | none | 15 candidate pairs, each on 26 devices (390 pair runs) |
| Drift control | none | every block bracketed by two baselines |
| Held-out validation | none | 51 models, blind, + POCO comparisons |

The request count is similar, but the information is not. The original design
measures the price of 2,227 clean phones and one cracked screen per phone. This
design measures **how** each answer moves the price, whether those movements
are rupee or percentage rules, and how they combine.

---

## 1. What the current A/B/C design measures, and what it cannot

Sources read: `profiles.ts`, `collector.ts`, `run-batch.ts`, `analyze.ts`,
`lib/researchPricing/store.ts`, `docs/PRICING_RESEARCH_CAMPAIGN.md` (branch
`feature/cashify-pricing-research` and Codex's
`codex/cashify-research-collector-hardening`), `lib/pricing/families.ts`,
`lib/pricingCalculator.ts`, `lib/referencePricing/questionnaire/parser.ts`,
`app/quote/page.tsx`.

**What it measures, per device:**
- **A:** the price of a best-case phone (all Yes, no defects, charger + box,
  age "Below 3 months", warranty and bill Yes). Compared with the public Get
  Upto, this is the clean-phone premium.
- **B:** exactly one of Δ(warranty No), Δ(age Above 11), Δ(bill No). Which one
  is measured depends on the model's stored questionnaire modes (priority
  warranty > age > bill).
- **C:** Δ(screen cracked / glass broken) against A.

**What it cannot identify:**

1. **All other condition answers.** Screen scratches (two levels), chipped
   outside the display, spots (three levels), lines (two), discoloration (two),
   body scratches and dents, panel cracked or missing, bent or loose frame,
   original screen, calls, touch, 18 hardware faults, charger, box and the two
   middle age bands are never varied. These are exactly the answers
   `AGENTS.md` lists as ignored or unwired in Fhoneify.
2. **Severity structure.** One level per factor (the worst screen state)
   cannot show whether levels are graded, capped or all-or-nothing.
3. **Rupee vs percentage.** A single Δ per device cannot separate
   "Cashify subtracts a repair cost" from "Cashify takes x%". Across devices
   this is confounded with brand and model-specific repair costs. The same
   deduction must be seen at different baselines of the **same model**
   (storage variants) and at different price levels **within a brand**.
4. **Any interaction.** No run changes two answers, so additive,
   multiplicative, worst-of, capped and condition-dependent combination rules
   are all indistinguishable.
5. **B is not one quantity.** Different devices measure different factors, so
   B cannot be pooled. Older models (warranty/bill NOT_ASKED) get no B at all,
   which systematically removes old and cheap phones from ownership/age
   analysis.
6. **B(warranty No) is confounded.** The collector's own PAGE-5 logic, and
   Fhoneify's quote page, only show the age page when warranty and bill are
   Yes. Setting warranty No therefore probably also drops the "Below 3 months"
   age credit. Δ_B = warranty effect + age effect, and the two are
   unseparable.
7. **B(age) never fires, and stored `ageMode` is not evidence.**
   `parseQuestionnairePage` reads only the **first** questionnaire page, and
   its AGE regex (`how old is your …|purchase date…`) does not match Cashify's
   last-page question "What is your mobile age?". Stored `ageMode` is
   therefore NOT_ASKED or UNKNOWN for every model regardless of reality.
8. **B(bill) records a baseline, not a control (collector defect, reported to
   Codex, not fixed here).** Page-1 answers are applied **by position**
   (`YES_NO_FIELDS[i]` → the i-th Yes/No pair, `collector.ts` ~L445–456, still
   present on Codex's hardening branch). Profile B chooses bill only when
   warranty is NOT_ASKED. Then the 4th rendered pair is the bill question,
   but it receives `answers.warranty` (= true → "Yes"). `validBill=false` is
   never clicked. Every B(bill) row is a clean baseline labelled as a bill
   control. The same indexing breaks whenever Cashify renders a different set
   of Yes/No questions.
9. **No noise or drift estimate.** One observation per (device, profile)
   and no repeat of A: a change in Cashify's baseline between A and C is read
   as a deduction.
10. **Storage shape.** `CashifyResearchExperiment` is unique on
    `(deviceKey, profile)` with `profile ∈ {A, B, C}`, so it cannot hold more
    than three experiments per variant (see §9 for the contract).

---

## 2. Representative device selection

### 2.1 Catalog facts (from `lib/seed_devices.ts` + `lib/cashify_prices.generated.json`)

- 2,243 rows → 2,227 unique variants (1 incomplete row, 15 duplicates) → **1,125 models**, 20 brands.
- 1,062 models have a fresh Cashify Get Upto; 63 do not (all Huawei, S24 Ultra, some others).
- Price bands (representative variant): <₹5k 447 · ₹5–10k 289 · ₹10–20k 192 · ₹20–40k 83 · ≥₹40k 51 · unpriced 63.
- 48 candidate Fhoneify families (`classifyPricingFamily`), 106 model series.
- Largest brands: Vivo 180, Samsung 149, Oppo 139, Xiaomi 112, Realme 110.

### 2.2 Strata

| Dimension | Source | Why it is a stratum |
|---|---|---|
| Brand | catalog | Cashify's model pages, and probably its tables, are per brand |
| Get Upto band (5 fixed rupee bands) | offline Get Upto | deductions are likely banded or price-proportional; fixed bands keep models from switching strata across refreshes |
| Era (tercile of generation inside its series) | model name | questionnaire structure (warranty/bill) and age treatment differ for new vs old models |
| Device class (foldable / Pro-Ultra-Plus / standard) | model name | repair costs (screen, panel) differ by construction |
| Fhoneify family | `families.ts` | each family is a **hypothesis** to test, not an assumed Cashify grouping |
| Model-level exceptions | `families.ts`, `app/quote/page.tsx` | named families (A34, A35, S24/S26 Ultra, Find X9*, Reno16*), OnePlus bill overrides, no-charger models, S Pen, age-skip models, eSIM models |
| Questionnaire structure | optional snapshot of `CashifyQuestionnaireProfile` | warranty/bill asked or not |
| RAM/storage | variants | handled by storage-contrast blocks (§4.4), not by sampling more models |

### 2.3 Allocation rule (sample size from the data, not a fixed %)

For each **brand × price band** cell (64 non-empty cells):
- 1 model if the cell has ≤ 3 models (9 cells)
- 2 if it has 4–14 (28 cells): two is the minimum that gives a within-cell spread
- 3 if it has ≥ 15 (23 cells)
- +1 if the cell's Get Upto coefficient of variation > 0.35 (4 cells): a
  wide price range inside the cell needs more points

Inside a cell, models are picked to maximise new era terciles, then new
families. Ties are broken by a seeded hash, so the sample is reproducible and
not hand-picked. This gives 150 models. **Coverage rules** then add 26: every
Fhoneify family, every exception tag, every brand × device class, and every
observed questionnaire structure gets at least one training model. Unpriced
models may fill a coverage gap (flagged; the collector records the live Get
Upto). Result: **176 training models (15.6% of models)**. Every one of the 48
candidate families is covered.

**Anchors (17):** one per brand with ≥ 20 models (from its most populated
band), then topped up to ≥ 2 anchors per price band, preferring a brand not
yet anchored in that band. The anchors lean towards <₹5k (9 of 17) because
that is where the catalog's volume is.

**Validation (51, held out):** per brand, ⌈0.25 × training models⌉ from models
**not** in training, spread across bands first. Their answers are fixed
realistic multi-defect profiles, marked `blind`, and are never used to fit.

### 2.4 Three kinds of grouping evidence

| Kind | Today | What changes it |
|---|---|---|
| 1. Candidate groups inferred from Fhoneify's code | all 48 families + exception tags | nothing: these are hypotheses |
| 2. Groups supported by Cashify observations | **none yet**. The 26 completed pilot observations cover 4 devices, and 8 comparison records + 27 team-QA screenshots mix conditions | a group is supported when its members' deductions for a factor share one form (§7.2) and differ from neighbouring groups beyond the tolerance |
| 3. Groups still needing investigation | all of the above, plus Cashify groupings Fhoneify does not model at all (e.g. price-band schedules across brands) | Phase 1 and 2 results |

The plan records this split in `sampling.groupEvidence`.

---

## 3. Controlled experiments

### 3.1 Factors (`scripts/research-design/factors.ts`)

36 factors (49 non-baseline levels) from Cashify's five questionnaire pages. Option texts are expected
from the collector, scraper and quote-page selectors, not proof that every
device renders them. A 2026-10-01 POCO F4 5G pilot rendered an unticked
"Battery Faulty" card instead of the planned "Battery in Service (Health < 80%)"
card; these are not treated as equivalent. The battery-health-threshold
factor is model-dependent and must be confirmed at runtime. Ten sub-page question
**headings** are descriptive labels (`unverifiedQuestionText`), not
Cashify's words. For those the collector must record the heading it sees and
match on option text.

| Page | Factors (levels) |
|---|---|
| P1 Yes/No | calls, touch, originalScreen (No) · warranty (No, gated) · validBill (No, gated) · eSIM (Dual, model-dependent) |
| P2 screen | screenCondition: 1-2 scratches · >2 scratches · chipped outside display · cracked |
| P2 display | spots (3 levels) · lines (2) · discoloration (2) |
| P2 body | body scratches (2) · dents (2) |
| P2 panel | panel cracked / missing · loose screen / bent |
| P3 hardware | 18 checkboxes (back/front camera, battery <80%, battery 80–85%, charging port, speaker, mic, WiFi, fingerprint, face, power, volume, camera glass, receiver, Bluetooth, vibrator, proximity, silent) |
| P4 accessories | charger missing (model-dependent) · box missing · S Pen missing (S Pen devices) |
| P5 age | 3–6 · 6–11 · >11 months (runtime-discovered) |

**Baseline:** every asked factor at its clean level, charger and box present,
age "Below 3 months", warranty and bill Yes. Two baselines bracket each block.

### 3.2 Complete answer vectors and ASKED / NOT_ASKED / UNKNOWN

Every experiment carries a value for **all 36 factors**:
- **ASKED:** a level id.
- **UNKNOWN:** the baseline level id **if the question renders**. If the
  experiment varies an UNKNOWN factor, that factor is listed in
  `requiresRuntimeConfirmation`. The collector must confirm the question or
  option rendered (by text) or record `NOT_ASKED`. It must never return a
  price as if the answer were given.
- **NOT_ASKED:** `null`. It is never varied, and `null` is never read as "No".

Status sources: `always_rendered` (core pages) · `questionnaire_snapshot`
(warranty/bill, when a snapshot file is passed) · `runtime_discovery` (age
always; model-dependent options) · `physical_inference` (S Pen on devices
without one).

### 3.3 Isolation flags

- `CLEAN`: one question changed, nothing else on the page affected.
- `SUBPAGE_SIBLINGS_HELD`: the change ticks a defect checkbox whose sub-page
  forces its sibling questions to be answered. The siblings are stated
  explicitly at their "none" option. Anchors also run a **checkbox-null**
  experiment (tick with every sub-answer "none") to measure whether the tick
  alone costs anything.
- `CONDITIONAL_CONFOUNDED`: warranty = No or bill = No where the age page may
  disappear. It is decomposed with the same block's age runs (3–6 / 6–11 /
  >11 at warranty Yes). The collector must record whether the age page
  rendered.

### 3.4 Which levels each role measures

- **Anchor:** every level of every applicable factor.
- **Core:** the priority-1 set (`coreLevels`): calls, touch, original screen,
  warranty, bill, screen 1-2 / >2 / cracked, spots 1-2 / heavy, visible lines,
  body 1-2 / >2 scratches, major dent, panel cracked, bent, back camera, front
  camera, battery <80%, charger, box, age 6–11 / >11.
- **Validation:** V1 light wear · V2 typical used · V3 heavy screen · V4
  functional faults · V5 out of warranty + no bill.

---

## 4. Interactions

### 4.1 Candidate pairs (`candidatePairs`)

| id | pair | question |
|---|---|---|
| P01 | body >2 scratches + major dent | same sub-page: sum or one body deduction |
| P02 | cracked + major dent | cross-group |
| P03 | screen not original + cracked | crack deduction conditional on originality |
| P04 | cracked + touch No | overlapping screen-replacement cost |
| P05 | cracked + back camera | independent parts |
| P06 | warranty No + cracked | ownership × damage |
| P07 | age >11 + charger missing | accessories × age |
| P08 | screen >2 scratches + body >2 scratches | the common "used" combination |
| P09 | heavy spots + visible lines | same display sub-page: worst-of or sum |
| P10 | panel cracked + bent | same panel sub-page |
| P11 | battery <80% + back camera | two hardware faults |
| P12 | calls No + touch No | floor or cap |
| P13 | charger + box missing | accessory bundle |
| P14 | age >11 + cracked | is damage taken from the aged value? |
| P15 | warranty No + bill No | ownership overlap |

These are candidates. A pair is generated for a device only when neither
factor is NOT_ASKED, and it inherits `requiresRuntimeConfirmation` for
UNKNOWN factors. Every pair run's two singles are in the **same block** (a
replicate is added if needed), so all three deductions share one baseline.

Coverage: every anchor gets all 15 pairs. Core devices get a covering
assignment: 9 core devices per pair, cycling low / mid / high price groups,
at most 2 pairs per device. Total: **26 devices per pair**.

### 4.2 Telling the combination rules apart

With baseline B and single deductions d_A and d_B, the observed joint
deduction d_AB is compared with:

- additive: d_A + d_B
- multiplicative: B·(1 − (1 − d_A/B)(1 − d_B/B)) = d_A + d_B − d_A·d_B/B
- overlap (worst-of): max(d_A, d_B)
- floor / cap: B − d_AB pinned at a constant across further additions (ladder)
- condition-dependent: d_AB outside all of these (super- or sub-additive)

The additive and multiplicative predictions differ by only **d_A·d_B / B**.
With Cashify's ₹10 rounding and the ₹10 bracket tolerance, that gap is only
resolvable when both deductions are large relative to B. That is why the
factorial anchors and part of every pair's coverage sit in the higher bands,
and why `classifyInteraction` returns `ADDITIVE_OR_MULTIPLICATIVE` instead of
guessing when the gap is below the tolerance.

### 4.3 Ladder and fractional factorial (anchors)

- **Severity ladder:** cracked → + major dent → + panel cracked → + back camera
  → + calls No → + box missing, cumulative, each step with its single. A
  price that stops falling shows a floor; steps that fall less than their
  single shows a cap.
- **2^(5-1) resolution V** on the three factorial anchors (iPhone 14 Pro Max,
  Honor 200, OnePlus 7 Pro): cracked, major dent, back camera, box missing,
  screen not original (E = ABCD). 16 runs estimate all 5 main effects and all
  10 two-factor interactions unaliased (the test verifies orthogonality). The
  factors were chosen from different pages and have no known
  conditional-page effect. Runs identical to an OFAT or pair run are merged,
  not duplicated.

### 4.4 Storage contrasts (rupee vs percentage)

Every anchor with a second variant ≥ 15% away in Get Upto, plus one core model
per brand, gets a second block on that variant: baseline, cracked, >2 body
scratches, back camera, warranty No. If a deduction is constant in rupees
across variants of one model, it is repair-cost-like. If it scales with the
variant's value, it is a percentage. `fitDeductionForm` makes that call
across all points.

### 4.5 Sequential / adaptive (`adaptiveRules`)

Phase 1 is anchors (1,431 requests). Then, before Phase 2 (core + validation,
4,527 requests):
- **R1:** drop null factors.
- **R2:** promote model-dependent priority-2 factors.
- **R3:** thin settled pairs.
- **R4:** expand pairs whose class disagrees between anchors.
- **R5:** re-queue drifted blocks.
- **R6:** add models to any stratum with held-out MAPE > 5%.

The plan is pre-registered. Rules change only what is still uncollected, and
every change is logged against the rule id.

---

## 5. The durable experimental record

One row per collected experiment. Additive to Codex's schema, and never
secrets.

```ts
interface DesignObservation {
  planVersion: 'cashify-design/2';
  experimentId: string;        // from the plan, stable
  blockId: string;
  baselineExperimentId: string | null;
  referenceExperimentIds: string[];
  deviceKey: string;           // brand|model|storage, lowercased
  brand: string; model: string; ram: string | null; storage: string;
  candidateFamily: string;     // Fhoneify family at plan time (hypothesis)
  getUptoAtCollection: number | null;   // read on the page, this run
  getUptoOffline: number | null;        // from the plan
  answers: Record<string, string | null>;       // planned vector (factorId -> level id)
  questions: Array<{                            // what was actually rendered, in order
    factorId: string | null;   // null = a question the plan does not know
    questionText: string;      // verbatim as rendered
    status: 'ASKED' | 'NOT_ASKED' | 'UNKNOWN';
    optionText: string | null; // verbatim option clicked
    matchedPlan: boolean;      // selected option == planned level's option text
  }>;
  changedFactors: string[];    // from the plan's `changes`
  checkboxesTicked: string[];  // incl. forceCheckboxes
  agePageRendered: boolean | null;
  finalPrice: number | null;   // only when status = COMPLETED
  status: 'COMPLETED' | 'UNSUPPORTED' | 'NOT_ASKED' | 'INVALID_ANSWER_MISMATCH' | 'AUTH_REQUIRED' | 'FAILED';
  statusReason: string | null;
  collectedAt: string;         // ISO
  sessionValidity: 'VALID' | 'EXPIRED' | 'CHALLENGED';   // no cookie/token contents
  sessionPoolIndex: number | null;                         // which pool slot, not the file
  evidenceRef: string | null;  // screenshot/HTML artifact path of the final-price screen
  questionnaireFingerprint: string | null;
  collectorVersion: string;
}
```

**Deductions** are computed only inside a block that passes `blockValidity`:
all five or more required experiments COMPLETED with a live Get Upto,
fingerprint and valid timestamp; both baselines within ₹10 of each other
with the same full questionnaire fingerprint; the same live Get Upto across
the block; and the whole block within 6 h. A defect sub-page legitimately
changes the full question list, so non-baseline fingerprints need not equal
the clean baselines. Every non-baseline answer is instead verified against
the exact requested option before its quote is accepted. A deduction is
`baseline(block) − price(experiment)`, and as a fraction
`/ baseline(block)`. Prices from different blocks are **never** subtracted
from each other; cross-block and cross-week comparisons use the in-block
fractions only. A block collected weeks later is simply another block with its
own baseline.

---

## 6. The offline planner

`scripts/research-design/`:

| file | role |
|---|---|
| `factors.ts` | factor catalog: exact option texts, gates, sub-page structure, conditional flags, priority |
| `catalog.ts` | catalog + offline Get Upto → models with strata (pure `buildModelIndex`) |
| `sampling.ts` | deterministic stratified selection: cells, coverage, anchors, validation |
| `design.ts` | question status, answer vectors, OFAT / pair / ladder / factorial / storage / validation experiments, block packing with drift brackets |
| `analysis.ts` | block validity, deductions, interaction classifier, rupee-vs-% fit, factorial effects, error metrics |
| `plan.ts` | assembly, estimate, adaptive rules, stopping criteria; CLI |
| `planner.test.ts` | 18 tests, including a full invariant sweep of the real plan |

```
npx tsx scripts/research-design/plan.ts [--out dir] [--questionnaire snapshot.json] [--seed s]
```

It reads only committed files, plus an optional questionnaire snapshot you
export yourself. It never navigates Cashify, needs no OTP or secrets, never
opens a DB connection, writes only to `--out`, and never dispatches
workflows. A test asserts that the planner imports no Prisma, Playwright,
`child_process`, collector or pricing-calculator code. Output is
byte-deterministic.

Outputs:
- **`experiment-plan.json`:** complete plan. Answer vectors are arrays aligned
  with `answerOrder` (`null` = NOT_ASKED); `expandAnswers()` restores objects.
- **`experiment-plan.csv`:** one row per experiment, with one named column per
  factor.
- **`plan-summary.json`:** the counts in this document.

With a questionnaire snapshot, warranty/bill for NOT_ASKED models are
removed from the plan and ASKED ones stop needing runtime confirmation. The
committed plan was generated **without** one, so warranty and bill are UNKNOWN
(runtime-confirmed) everywhere.

---

## 7. From observations to pricing hypotheses

### 7.1 Required reporting

- **Samples:** size by Fhoneify family, brand, band and era (training and
  validation separately).
- **Factor coverage:** valid blocks per factor level per band group. Missing
  combinations are listed explicitly: NOT_ASKED, UNSUPPORTED, invalid block,
  never collected.
- **Deductions per factor level:** median rupees and median %, IQR, n, and
  the `fitDeductionForm` result (CONSTANT_RUPEES / PROPORTIONAL / AFFINE, R²).
- **Interactions:** each pair's class per device, and its discrimination
  (d_A·d_B/B vs tolerance). Pairs that were not discriminable are listed.
- **Generations:** deduction vs era tercile inside each series.
- **Held-out error:** absolute and percentage error, bias
  (predicted − actual), max error. Overall, per brand, per band,
  in-family vs out-of-family.

### 7.2 Procedure

1. Keep only valid blocks and COMPLETED rows whose recorded answers match
   the plan (`matchedPlan` everywhere). A mismatch → INVALID_ANSWER_MISMATCH.
2. Per factor level, fit the deduction form across anchors, then across core
   devices. A group is "supported by Cashify observations" only when its
   members share a form and parameters within tolerance, and differ from
   neighbouring groups.
3. Per pair, classify. Only rules confirmed on ≥ 3 discriminating devices
   enter the hypothesis.
4. Freeze the hypothesis (commit its parameters). Only then un-blind the
   validation profiles and score them.
5. **POCO comparisons** (Codex's `scripts/pricing-research/poco-comparisons.json`,
   46 records, most `unverified_answers`) are used as prospective validation
   only for records with verified answers and a Get Upto. They are reported
   separately because they are one brand.
6. A hypothesis is still just a proposal. Any change to penalties or
   coefficients follows the owner-approval rule in `AGENTS.md`.

**Representativeness claim:** results are claimed for the catalog only in
strata that have ≥ 2 valid training models and ≥ 1 validation model.
Everywhere else they are reported as "observed on N handpicked-equivalent
models", not as catalog-wide.

---

## 8. Cost and campaign estimate

The planner derives these from the plan (`plan-summary.json`):

| | Requests |
|---|---|
| Anchors (Phase 1) | 1,431 |
| Core | 4,170 |
| Validation | 357 |
| **Total** | **5,958** |
| of which bracket baselines | 554 |
| of which replicates (repeatability) | 78 |

Observed speed: seconds per COMPLETED quote from the 49 pilot observations
(19 gaps, read-only query, 2026-09-30). 5 h per GitHub Actions batch (under
the 6 h job limit):

| speed | s/quote | total hours | quotes/batch | batches |
|---|---|---|---|---|
| fast (p10) | 17 | 28.1 | 1,058 | 6 |
| typical (p50) | 32 | 53.0 | 562 | 11 |
| slow (p90) | 75 | 124.1 | 240 | 25 |

The original 2,227 × 3 design would need 6,681 requests (59 h at p50). The
pilot's completion rate was 53% (18 of 49 UNSUPPORTED, mostly device-page or
variant mismatches). At that rate about 3,160 of the 5,958 would complete. The
**catalog-matching failures should be fixed before Phase 2** rather than
buying more requests. Batching must keep each block whole: a batch boundary
may fall only between blocks.

**Stopping criteria** (`stoppingCriteria`):
- Every priority-1 level has ≥ 3 valid blocks per band group.
- The deduction form is stable to < 10% under the last 20% of data.
- Every pair is classified on ≥ 3 discriminating devices, or documented as
  non-discriminable.
- Held-out MAPE ≤ 3% with |bias| ≤ 1% of Get Upto overall, and ≤ 5% per brand.
- **Hard stop:** 2 consecutive AUTH_REQUIRED batches, or more than 20% invalid
  blocks in a batch (Cashify likely changed its questionnaire).

Phase 1 alone (1,431 requests, about 13 h at p50) already answers the
structural questions: which factors matter, rupee vs %, and combination rules.
It should be reviewed before Phase 2 is dispatched.

---

## 9. Integration contract for Codex's collector

The planner produces work; the collector consumes it. Nothing here requires
changing Codex's code today. These are the interface requirements:

1. **Input:** one plan experiment (from `experiment-plan.json`, expanded with
   `expandAnswers`) plus its device (`cashifyLink`, storage, RAM).
2. **Answer by question text, never by position.** For page 1, locate each
   Yes/No pair by its question text (`factors[].questionText` is expected
   copy, not proof that every device renders it verbatim) and click the
   planned option. The verified collector already removed the old
   `YES_NO_FIELDS[i]` positional bug; the matrix bridge now rejects a
   rendered label/option mismatch rather than silently treating it as a
   supported answer.
3. **Checkboxes:** tick a defect checkbox iff a factor on its page is at a
   non-baseline level, or it appears in `forceCheckboxes`. Answer **every**
   sub-page question with the planned option text (siblings at their "none"
   option). Hardware: tick exactly the `faulty` factors. Accessories: tick
   exactly the `present` factors.
4. **UNKNOWN / runtime confirmation:** for every factor in
   `requiresRuntimeConfirmation`, the option must be found by exact text. If
   it isn't, stop and return `NOT_ASKED` with the rendered question list. For
   UNKNOWN factors at their baseline, click the baseline option if it is
   present. Record whether the age page rendered.
5. **Output:** one `DesignObservation` (§5), including verbatim question and
   option text for everything rendered, the live Get Upto, fingerprint,
   evidence reference and session-validity status. Any planned answer that
   could not be applied → `INVALID_ANSWER_MISMATCH`, never a price.
6. **Blocks:** run a block's experiments in `order`, in one session, without
   interleaving other blocks of the same device, BASELINE_OPEN first and
   BASELINE_CLOSE last. On AUTH_REQUIRED mid-block, re-run the whole block
   later.
7. **Storage:** the existing `CashifyResearchExperiment` is unique on
   `(deviceKey, profile)` and cannot hold a design plan. This integration
   uses an ignored local SQLite database with append-only attempts and
   run IDs, so an interrupted block cannot be combined with a prior run.
   An additive, separately reviewed PostgreSQL table is proposed in
   `docs/CASHIFY_MATRIX_STORAGE_PROPOSAL.md`; no production schema command
   is part of collection. Never run an unreviewed `prisma db push` against
   production.
   The committed plan output remains Claude's original fixed catalog sample.
   The integration loader preserves its experiment IDs while explicitly
   correcting the known box-card label and treating battery-health-threshold
   availability as runtime-discovered. Regenerating against the PR #7 catalog
   changed the sample count, so a new plan must be separately reviewed.
8. **Safety:** unchanged from the existing collector: no pickup, order or
   checkout clicks, no CAPTCHA solving, pacing as configured.

---

## 10. Remaining uncertainty

- **Headings and options not yet observed on live pages:** ten sub-page
  headings, the eSIM wording, the S Pen option text, and whether the charger
  option is hidden for the models where Fhoneify hides it.
- **The age-page condition:** "shown only when warranty and bill are Yes" is
  inferred from Fhoneify code and collector heuristics, not observed.
  Anchors will settle it.
- **Questionnaire modes:** without a snapshot every warranty/bill factor is
  UNKNOWN. About 1,300 experiments depend on runtime confirmation and will
  convert to NOT_ASKED where Cashify doesn't ask.
- **Unpriced models:** 63 models (Huawei, S24 Ultra among them) have no fresh
  offline Get Upto. Three are in training only for family coverage, and their
  band is unknown until collection.
- **Sample shape:** anchors lean towards the <₹5k band (the catalog's mass).
  High-band anchors are 2 per band. If R4/R6 fire there, Phase 2 grows.
- **Stability of Cashify's rules** over the campaign's duration (weeks) is
  unknown. The block brackets detect shifts but cannot prevent them. If rules
  change mid-campaign, blocks before and after must be analysed as separate
  regimes.
- **Selection is by Fhoneify's candidate structure:** Cashify groupings that
  cut across brand × band × era (e.g. per-model repair-cost tables) will
  appear as poor within-cell fits. R6 is the response, not a guarantee.
