# Cashify Pricing Research Campaign

A **one-time** research campaign to collect real, condition-based Cashify
quotes and use them to propose (never auto-apply) Fhoneify pricing
calibration. Fully separate from customer-facing pricing and from the weekly
`ReferencePrice` refresh — see AGENTS.md ("Do not touch Cashify refresh
unless explicitly asked", "Do not invent new penalty percentages").

## What this is not

- Not a change to `lib/pricingCalculator.ts`, `applyCompetitorUplift`, the
  4/6/8% uplift, the ₹2,000 cap, or any penalty value.
- Not a change to the weekly `reference-price-refresh.yml` job or the
  `ReferencePrice`/`CashifyQuestionnaireProfile` tables.
- Not a recurring job. `.github/workflows/cashify-research-campaign.yml` has
  **no schedule trigger** — every run is a deliberate `workflow_dispatch`.
- Not a checkout/lead-submission bot. The collector (`scripts/pricing-research/collector.ts`)
  never clicks a pickup/order/checkout button and refuses to (`assertSafeToSelect`).

## What it collects

For each device variant, up to 3 real Cashify quotes via an authenticated
Playwright session:

- **A — clean baseline**: every condition answer at its best/working value.
- **B — single-variable control**: exactly one field Cashify's questionnaire
  is *confirmed* (`CashifyQuestionnaireProfile` ASKED) to present for that
  model — warranty, then age, then GST bill, in that priority. If none of the
  three is confirmed ASKED, the experiment is marked `UNSUPPORTED` with a
  reason. Never guesses an answer to a question Cashify wasn't confirmed to ask.
- **C — damage condition**: a cracked-screen/broken-glass condition, all
  other answers held at the Profile A baseline. `UNSUPPORTED` if the model's
  questionnaire was never successfully verified (`status !== 'OK'`).

Every observation records: device identity, the exact question text and
selected answer for every question actually shown, the final quote, the
original "Get Upto" headline, a questionnaire fingerprint, and a status
(`COMPLETED` / `UNSUPPORTED` / `AUTH_REQUIRED` / `FAILED`) — never a
fabricated number.

## Storage

New, isolated Postgres tables (same `DATABASE_URL` as the rest of the app,
via Prisma): `CashifyResearchBatch`, `CashifyResearchExperiment` (current
state, unique per device+profile — safe to re-run), `CashifyResearchObservation`
(append-only history). See `prisma/schema.prisma`, appended after
`CashifyQuestionnaireProfileHistory`.

The research tables already exist in the database. Before any future pilot,
verify their presence with a read-only query. Do not run a schema command as
part of collection.

## One-time setup

### 1. Verify the existing research schema

The three `CashifyResearch*` tables have already been created. Check their
presence and existing row counts through read-only database access before a
pilot. Any future schema change needs its own reviewed migration plan and
approval. Do not use `prisma db push` against production from this guide.

### 2. Authenticate as a Cashify user (local, manual OTP)

```bash
npm run research:login
```

This is `scripts/setup-cashify.js` (already existed in this repo before this
campaign) — it opens Cashify's real login page in a visible browser, waits
for you to enter your phone number and OTP by hand, then saves the
authenticated session to `cashify-sessions/session-<timestamp>.json`.

The collector rotates across every session file in `cashify-sessions/`, same
as the existing on-demand scraper. If a session expires mid-collection, the
run stops with `AUTH_REQUIRED` (see "Handling AUTH_REQUIRED" below) —
re-run this command to add a fresh session, then resume.

### 3. Provisioning the session for GitHub Actions

The workflow never uses a committed session file. It decodes the
`CASHIFY_SESSION_STATE` repository secret at runtime (same mechanism the
existing `reference-price-refresh.yml` uses):

```bash
base64 -w0 cashify-sessions/<your-session-file>.json
```

Paste the output into the `CASHIFY_SESSION_STATE` secret under
*Settings → Secrets and variables → Actions*. Re-generate and re-paste this
secret whenever the session expires. `DATABASE_URL` and `DIRECT_URL` must
also be present as repository secrets (they already are, for the weekly refresh).

## Running a safety pilot (do this before any full-scale collection)

```bash
# 1. Plan only — no collection, just confirms which experiments would be created:
npm run research:collect -- --brand Apple --limit 5 --dry-run

# 2. Collect real data for those 5 devices (small, bounded, watch it run):
npm run research:collect -- --brand Apple --limit 5 --batch-size 15 --headed

# 3. Check progress:
npm run research:progress -- --brand Apple

# 4. Check the analysis tool runs cleanly against real (even sparse) data:
npm run research:analyze -- --brand Apple
```

Manually verify a few rows against the real Cashify site before trusting the
data (device identity, storage, selected conditions, and the final
quotation) — the campaign brief requires this, and it is the only way to
catch a selector/DOM assumption that silently drifted.

An earlier bounded GitHub Actions pilot succeeded. Review its job summary,
artifact, and stored research observations before permitting another pilot.
Use a small, explicit brand/model filter and batch size for any further run.

**Do not dispatch the full, unscoped campaign until the pilot has been
manually reviewed and approved.**

## Running the full campaign (after pilot approval)

Each GitHub Actions dispatch processes one bounded batch and exits; progress
is checkpointed in Postgres, so the next dispatch with the same
brand/model filter resumes automatically — nothing is lost between runs.

```
Actions → Cashify pricing research campaign (one-time, manual only) → Run workflow
  brand:            (blank for all brands, or e.g. "Samsung")
  model:            (optional substring filter)
  batch_size:       25        # experiments per dispatch — tune to your risk appetite
  max_experiments:  (blank = same as batch_size)
  profiles:         A,B,C
  resume:           true      # false = dry-run/plan only, no collection
```

Re-dispatch with the same `brand`/`model` filter as many times as needed
until `npm run research:progress` shows `remaining: 0` for that filter, then
move to the next brand. Multiple *different* brand filters may be dispatched
concurrently (the concurrency group is per brand+model); the same filter
queues rather than overlapping.

### Handling AUTH_REQUIRED

If a batch stops early on `AUTH_REQUIRED` (exit code 2, a warning annotation
in the run, not a failure): the Cashify session expired or was challenged.
Run `npm run research:login` locally, refresh the `CASHIFY_SESSION_STATE`
secret (step 3 above), then re-dispatch the same workflow inputs — it
resumes from checkpoint, nothing is repeated or lost.

## Analysis

```bash
npm run research:analyze -- --json scratch/research-calibration-proposal.json
```

Produces an evidence-backed calibration proposal: for every candidate
coefficient, the underlying observations that support it, a held-out
validation error, and an explicit list of which additional experiments would
most improve confidence. **This tool never writes to `lib/pricingCalculator.ts`
or any pricing config.** Any resulting penalty/coefficient change requires
the same owner-approval process as any other pricing change (AGENTS.md,
`docs/HANDOFF_CODEX.md` §4 Task 3).

## Known, pre-existing, out-of-scope risk

`cashify-sessions/*.json` and `cashify-session.json` are ignored because
they are Playwright storageState files containing live Cashify session
cookies. CI materializes its session only from `CASHIFY_SESSION_STATE` at
runtime and never logs its contents. Historical commits contained tracked
session files; rotate the affected Cashify sessions and coordinate any
history-cleanup decision with repository owners. Do not add local session
files to Git.
