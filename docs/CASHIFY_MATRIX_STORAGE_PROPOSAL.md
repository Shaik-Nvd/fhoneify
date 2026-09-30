# Cashify matrix evidence storage — review proposal only

The integrated collector writes **only** to an ignored local SQLite database
under `research-evidence/`. It does not read `DATABASE_URL`, call Prisma, or
alter the existing `CashifyResearch*` history. A future shared store needs a
separately reviewed, non-destructive migration. Do not run `prisma db push`
against production for this work.

Proposed PostgreSQL DDL for review (not applied):

```sql
CREATE TABLE public."CashifyMatrixObservation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "planVersion" text NOT NULL,
  "runId" uuid NOT NULL,
  "experimentId" text NOT NULL,
  "blockId" text NOT NULL,
  "deviceKey" text NOT NULL,
  "status" text NOT NULL CHECK ("status" IN (
    'COMPLETED','UNSUPPORTED','NOT_ASKED','INVALID_ANSWER_MISMATCH','AUTH_REQUIRED','FAILED')),
  "finalPrice" integer,
  "getUptoAtCollection" integer,
  "collectedAt" timestamptz NOT NULL,
  "observation" jsonb NOT NULL,
  CONSTRAINT "CashifyMatrixObservation_completed_price" CHECK (
    ("status" = 'COMPLETED' AND "finalPrice" > 0)
    OR ("status" <> 'COMPLETED' AND "finalPrice" IS NULL))
);
CREATE UNIQUE INDEX "CashifyMatrixObservation_run_experiment_key"
  ON public."CashifyMatrixObservation" ("planVersion", "runId", "experimentId");
CREATE INDEX "CashifyMatrixObservation_block_idx"
  ON public."CashifyMatrixObservation" ("planVersion", "runId", "blockId");
ALTER TABLE public."CashifyMatrixObservation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."CashifyMatrixObservation" FROM anon, authenticated;
```

The full record belongs in `observation`: exact planned vector, actual
questions and selected options, changed factors, baseline and reference IDs,
live Get Upto, questionnaire fingerprint, timestamp, validity, screenshot
reference and SHA-256. It must **not** contain cookies, OTPs, session paths,
raw screenshots, or personal details. A run ID keeps repeated or interrupted
blocks distinct; analyses may use only a complete, valid single run.

Before approving deployment: review the DDL against the live schema, test it
on an isolated local/staging PostgreSQL database, add an explicit service-only
access policy and retention plan, and approve a versioned migration. No
existing research table is changed or deleted. No migration has been run.

Current bounded pilot (read-only preview):

```powershell
npx tsx scripts/pricing-research/run-matrix-pilot.ts --dry-run --block-id 0i55edv:blk2
```

The live command additionally requires `--pilot --headed --max-experiments 5`
and one fresh `--session-file session-<timestamp>.json`. It selects exactly
Claude's existing P08 opening baseline, screen scratches, body scratches,
combined scratches, and closing baseline from that block. It stops on the
first unsupported answer, challenge, or quote failure. Rerun the **whole**
block after interruption; do not splice rows from different run IDs.

The first reachable local attempt was rejected at the opening baseline because
Cashify showed an unselected "Battery Faulty" card rather than the planned
battery-health-threshold card. The corrected collector records that card as
additional unselected P3 evidence without equating its meaning to a health
percentage. A selected unknown card still invalidates the experiment. The one
authorized fresh-session retry verified its opening baseline with a final-price
screenshot, then stopped at the screen-scratch subpage because the collector
could not verify the question heading for its requested answer. No pair or
closing baseline was collected; a further live retry needs separate approval.

The subsequent one-page diagnostic captured only the POCO F4 screen question
component. It proved that the old ancestor-leaf search returned the option's
own text before reaching the sibling "Screen Physical Condition" header.
Defect details now require the captured header/grid relationship, one heading,
unique option labels, and consistent selected/unselected card classes. The
collector rechecks the same heading and options after clicking and stores the
complete `optionStates` vector. The plan verifier and local store both require
that vector for rendered defect details. Ambiguous components remain rejected;
bounded sanitized component evidence is retained locally on rejection.

Offline tests use the captured screen fixture and derived body-layout cases;
the body cases are not represented as live Cashify observations. After the owner
approved one five-quote P08 pilot, all five actual quotations passed, including
the screen and body detail associations. The closing baseline matched the opening
baseline exactly. See `CASHIFY_P08_PILOT_2026-10-01.md` for the bounded result and
local evidence references; this does not authorize further collection.
