# Cashify hosted matrix campaign (free GitHub runners)

Status: prepared 2026-10-01 under the owner's staged approval. Research-only; nothing
here changes `lib/pricingCalculator.ts`, coefficients, the 4–8% uplift, the ₹2,000
cap, Render, Vercel or any database.

## Scope and budget

- **Global cap: 1,500 quotation attempts**, counted across every dispatch, failure,
  interruption and rerun. Stages are cumulative caps: **Stage 1 ≤ 100, Stage 2 ≤ 500,
  Stage 3 ≤ 1,500**.
- Work = whole blocks of Claude's committed `cashify-design/2` plan. The queue
  (`scripts/pricing-research/hosted/campaign-queue.json`) is a deterministic filter
  and order of that plan. Experiment IDs, complete answer vectors, block membership,
  opening/closing baselines and referenced singles are unchanged. The runner
  rebuilds the queue from the plan and refuses to run if it differs.
- Only TRAINING devices (ANCHOR/CORE) of the priority groups are included. Groups
  are classified by model name, because Redmi and Mi are catalogued under brand
  "Xiaomi": **Apple → Samsung → OnePlus → Xiaomi/Mi → Redmi**. POCO is excluded.
  All 51 held-out VALIDATION models are excluded; a test enforces this.
- Order: the four Stage 1 verification blocks come first. Next come every anchor
  block of the priority groups (full-depth OFAT, ladder, pairs, replicates and
  storage contrast). Last come core models, round-robin across groups and spread
  over price bands. Pages that the weekly refresh has not verified go at the end.
  Within 1,500 attempts this reaches about 60 of 84 blocks.
- Cashify URL: the catalog link, else the same dictionary/generated URL that the
  weekly refresh verified as fresh/exact (`cashifyUrlResolver`).

Stage 1 (exactly 100 attempts, four complete 25-experiment core blocks):

| block | device | group | band |
|---|---|---|---|
| `167obut:blk1` | Apple iPhone 14 256GB | apple | ₹20–40k |
| `0abbfp9:blk1` | Samsung Galaxy S25 Edge 12/256 | samsung | ≥₹40k |
| `0zt9sxs:blk1` | OnePlus 9 5G 8/128 | oneplus | ₹5–10k |
| `0xhkdbp:blk1` | Xiaomi Mi A2 4/64 | xiaomi_mi | <₹5k |

Stage 2 (to 500): Apple iPhone 12 Pro and 14 Pro Max anchors, the Samsung Galaxy
M32 anchor and storage contrast, the OnePlus 7 Pro anchor, then the Redmi 11 Prime
anchor as budget allows. Stage 3 (to 1,500): the remaining anchor blocks, then core
models round-robin.

## Execution safety

- Runs only from `codex/cashify-matrix-integration` on `ubuntu-latest`. It is
  dispatched manually and has no schedule. `DATABASE_URL` is deliberately unreachable.
- Session: only the dedicated `CASHIFY_RESEARCH_SESSION` secret. The old
  `CASHIFY_SESSION_STATE` secret and historical session files are never read. The
  wrapper must be under 7 days old, and it is created only after the owner passes the
  live final-price gate in a visible browser. The first quotation of every job must
  pass the final-price gate, or the job stops; an unexpired cookie is not proof.
- Stops: AUTH_REQUIRED or CAPTCHA stops the job. UNSUPPORTED,
  INVALID_ANSWER_MISMATCH, FAILED or an unexpected NOT_ASKED stops that device for
  the rest of the campaign, with the exact reason recorded. A NOT_ASKED result
  continues only when every changed factor was planned as runtime-confirmed
  (warranty, bill, age, charger, model-dependent options). Options are never
  substituted, for example "Battery Faulty" for a battery-health threshold. The
  job also stops after two invalid blocks or three stopped devices.
- Pacing is 20 s between quotations and 60 s between blocks. There is no retry
  loop, no identity rotation and no CAPTCHA solving, and the pickup, order and
  contact buttons are never clicked.

## Budget ledger (non-sensitive, resumable without the private key)

`ledger.json` is kept on branch **`research/cashify-hosted-ledger`**, never on main.
It holds identities, statuses, sanitised reasons, hashes and artifact references.
It holds no prices, answers, page text or session data.

1. **Reserve.** Before any Cashify request, the job charges the full size of
   every block it will run and pushes the ledger. If the push fails, nothing is
   collected. No reservation is possible while an earlier one is unreconciled.
2. **Write-ahead manifest.** Each attempt is written to the manifest before
   Cashify is contacted.
3. **Finalize.** After the artifact has been read back, attempts are charged
   exactly. Blocks that provably never started are released. A started block that
   stopped early stays STOPPED and is never re-run automatically.
4. **Unverifiable runs.** If the manifest is missing or tampered, or the run
   died, the whole reservation stays charged (UNCERTAIN) and its blocks are never
   re-queued.

## Evidence (encrypted before upload)

- Each attempt is sealed on the runner as one bundle, using RSA-OAEP-SHA256 +
  AES-256-GCM with the owner's **public** key. A bundle contains the observation,
  the verbatim questionnaire trace, the final price and the cropped screenshot.
  The plaintext screenshot is then deleted. The public key is pinned in
  `research-public.pem` and verified against its fingerprint in
  `research-public-key.json`.
- The artifact `cashify-hosted-<run>-<attempt>` contains only `*.fhc` ciphertexts
  and `manifest.json`, with **retention-days: 90**. The job then downloads it back
  through the API and re-hashes every ciphertext. An experiment becomes COMPLETED
  only when its ciphertext is recovered with the recorded hash and the actual
  artifact expiry is ≥ 89 days after collection. Otherwise it is
  EVIDENCE_UNVERIFIED, which is never a completed observation.
- Public-repository Actions logs, summaries and the ledger show no prices.
- This is a public repository, so standard-runner minutes and artifact storage
  are free. The expected size is about 150 MB for 1,500 attempts.

## Quality gates (defined before collection; evaluated on the laptop)

A stage passes only if every gate passes. A failure is recorded as FAIL in the
ledger and collection stops. There is no override.

| gate | threshold |
|---|---|
| G1 authentication | 0 AUTH_REQUIRED / CAPTCHA in the stage |
| G2 evidence | 0 EVIDENCE_UNVERIFIED or INTERRUPTED; every run FINALIZED. Every COMPLETED row decrypted locally, with the screenshot hash equal to the recorded hash and the ciphertext hash equal to the ledger |
| G3 genuine final quotes | every COMPLETED row passed the collector's "Selling price" details-page gate and the local store validation; no valid block where every price is identical |
| G4 device/variant | 0 rows whose model or variant differs from the queued device |
| G5 planned answers | accepted rows have `matchedPlan` everywhere (enforced by the store); rejected INVALID_ANSWER_MISMATCH ≤ 5% of stage attempts |
| G6 baseline drift | opening vs closing ≤ ₹10: Stage 1 requires 0 drifted blocks; Stages 2–3 allow ≤ 10% of bracketed blocks |
| G7 run integrity | 0 blocks mixing run IDs; no experiment attempted twice |
| G8 completion | (COMPLETED + runtime-confirmed NOT_ASKED) / attempts ≥ 80%; valid blocks on ≥ 3 devices in ≥ 3 priority groups |

Block validity is Claude's `blockValidity`, unchanged: both baselines complete,
drift ≤ ₹10, the same full fingerprint, the same live Get Upto, and the block
within 6 h. The one hosted extension: a member may be NOT_ASKED only when all of
its changed factors are runtime-confirmed. Deductions are always measured inside
one valid block against that block's own opening baseline.

## Owner setup (one time, all free)

1. The private key already exists at `%USERPROFILE%\.fhoneify-research\keys\private.pem`.
   It is outside OneDrive and the repository, and readable only by your Windows
   account. **Copy it to an offline USB drive**: without it the evidence cannot be
   decrypted.
2. Create the fresh session, in your own terminal:
   `npx tsx scripts/pricing-research/hosted/laptop.ts push-session`.
   Log in inside the visible browser, finish a POCO C3 quote up to "Selling price",
   then press Enter. The session goes straight from memory into the
   `CASHIFY_RESEARCH_SESSION` secret, and no session file is written. Repeat it
   whenever a job reports AUTH_REQUIRED or the session is older than 7 days.
3. Still recommended from earlier: revoke the historically exposed Cashify sessions
   by logging out of all devices in Cashify, and then delete the unused
   `CASHIFY_SESSION_STATE` secret once the weekly refresh no longer needs it.

## Operating commands

```bash
# dry run: tests, preflight, reservation preview; no Cashify request, no ledger write
gh workflow run cashify-research-campaign.yml --ref codex/cashify-matrix-integration -f stage=1 -f max_attempts=100 -f mode=dry-run
# evidence self-test: seal/upload/read back a synthetic price-free record (verified 2026-10-01, artifact 11126943087)
gh workflow run cashify-research-campaign.yml --ref codex/cashify-matrix-integration -f stage=1 -f max_attempts=100 -f mode=evidence-selftest
# collect (only the approved stage)
gh workflow run cashify-research-campaign.yml --ref codex/cashify-matrix-integration -f stage=1 -f max_attempts=100 -f mode=collect

# laptop: pull the ledger, then download, verify, decrypt and ingest, then report
git fetch origin research/cashify-hosted-ledger && git show origin/research/cashify-hosted-ledger:ledger.json > %TEMP%\ledger.json
npx tsx scripts/pricing-research/hosted/laptop.ts fetch  --ledger %TEMP%\ledger.json
npx tsx scripts/pricing-research/hosted/laptop.ts report --ledger %TEMP%\ledger.json --stage 1
# record the gate decision in a ledger-branch checkout, then push that branch
npx tsx scripts/pricing-research/hosted/laptop.ts decide-stage --ledger <ledger-checkout>/ledger.json --stage 1
```

`fetch` keeps every raw artifact zip in `%USERPROFILE%\.fhoneify-research\evidence\artifacts\`
permanently. It also keeps decrypted screenshots and `hosted.sqlite`, all outside
OneDrive. Back up this folder before the 90-day artifact expiry.
A single bundle can be decrypted with
`node scripts/pricing-research/artifact-crypto.cjs decrypt <private.pem> <file.fhc> <out.json>`.

## Analysis boundary

Reports list within-block rupee and percentage deductions, per-condition medians,
`fitDeductionForm` (constant rupees, proportional or affine) and interaction
classes (additive, multiplicative, overlap, floor/cap, super- or sub-additive). This
is training evidence only. No validation accuracy is claimed, and no production
coefficient changes until held-out validation supports a proposal and the owner
approves it.
