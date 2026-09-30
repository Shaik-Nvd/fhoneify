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

The legacy collector defines three pilot profiles, but these are not a
complete experimental matrix and must not be run over the catalog by default:

- **A — clean baseline**: every condition answer at its best/working value.
- **B — single-variable control**: exactly one field Cashify's questionnaire
  is *confirmed* (`CashifyQuestionnaireProfile` ASKED) to present for that
  model — warranty, then age, then GST bill, in that priority. If none of the
  three is confirmed ASKED, the experiment is marked `UNSUPPORTED` with a
  reason. Never guesses an answer to a question Cashify wasn't confirmed to ask.
- **C — damage condition**: a cracked-screen/broken-glass condition, all
  other answers held at the Profile A baseline. `UNSUPPORTED` if the model's
  questionnaire was never successfully verified (`status !== 'OK'`).

New pilot observations record: device identity, the actual visible question
and answer vector (including unselected defect, hardware and accessory
choices), the final quote, a separate "Get Upto" headline, a questionnaire
fingerprint, an ignored local cropped final-card screenshot, and a status
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

This opens a visible browser for your own login and OTP entry. Complete the
POCO C3 (4 GB/64 GB) questionnaire and stop on its final **Selling price**
details page before pressing Enter in the terminal. The script saves an
ignored `cashify-sessions/session-<timestamp>.json` only after two stable,
unmasked final-price checks. Do not submit a pickup/order. A cookie expiry
alone does not prove authentication.

For a pilot, name the newly authenticated session explicitly with
`--session-file`; do not rotate through historically exposed sessions. If a
login modal or CAPTCHA appears at any point, the run stops with
`AUTH_REQUIRED`; reauthenticate before resuming the same bounded pilot.

### 3. GitHub Actions is dry-run only

Hosted collection is disabled until a reviewed, durable destination for
cropped, redacted final-quotation screenshots is approved. Do not upload a
local screenshot, session file, or unredacted browser log to Actions
artifacts. The workflow's session secret remains for compatibility with a
future approved collection path; its presence is not permission to run one.

## Running a safety pilot (do this before any full-scale collection)

```bash
# 1. Read-only candidate check:
npm run research:collect -- --dry-run --brand POCO --model C3 --storage "4 GB/64 GB" --limit 1 --profiles A

# 2. One explicitly authorized local pilot, using the fresh ignored session:
npm run research:collect -- --pilot --brand POCO --model C3 --storage "4 GB/64 GB" --limit 1 --batch-size 1 --max-experiments 1 --profiles A --session-file session-<timestamp>.json --headed

# 3. Check progress and audit evidence (read-only):
npm run research:progress -- --brand POCO
npx tsx scripts/pricing-research/audit-observations.ts

# 4. Visually inspect the ignored cropped final-card image before marking
# its local manifest VISUALLY_VERIFIED. A DB COMPLETED row is not proof alone.
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

## Future controlled matrix (not yet authorized)

Do not dispatch a full or unscoped campaign. The Actions workflow accepts
dry-run requests only. Claude's reviewed experiment plan must eventually
specify an approved representative device/variant, a baseline identifier, a
complete requested answer vector, and which variables differ from baseline.
The collector must preserve the actual displayed questions and verified
selected/unselected states for each plan row. Three legacy profiles per phone
cannot establish interaction rules, and the POCO screenshot price pairs with
missing questionnaire answers are not condition-matched fitting data.

### Handling AUTH_REQUIRED

If a batch stops early on `AUTH_REQUIRED` (exit code 2, a warning annotation
in the run, not a failure): the Cashify session expired or was challenged.
Run `npm run research:login` locally and repeat only the same authorized,
bounded pilot using its new `--session-file`. Checkpoints and append-only
observations retain completed work. `--retry-unsupported` and the narrowly
scoped `--reverify-completed` are for reviewed collector fixes, not a broad
campaign.

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
