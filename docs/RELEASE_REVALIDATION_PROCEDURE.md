# Release evidence revalidation procedure

**Deadline.** The route evidence (`scripts/pricing/fixtures/release-route-evidence-2026-10-02.json`) and the candidate calibrations were observed on 2026-10-02, between 11:18 and 17:37 UTC. Each route leaves the 14-day freshness window on **2026-10-16** at the same time of day.

**What expiry looks like.** From that moment the route returns HTTP 422 `MANUAL_INSPECTION_REQUIRED`. The customer sees "Request an inspection on WhatsApp", an email link and "Review answers". There is no price and no token. Nothing else breaks.

**Do not extend validity without new observations.** Never edit `observedAt` or `calibratedAt`, or copy amounts, to keep a route alive.

## When

Run between 2026-10-12 and 2026-10-15. This leaves a day to review and merge before expiry.

## 1. Fresh inputs, read-only

1. Make sure the weekly reference refresh has run, or dispatch it for the 20 keys. Read-only export, per key: `currentPrice`, `lastVerifiedAt`, `matchConfidence`, `consecutiveFailures`.
2. Profiles. The weekly crawler re-learns a profile only once it is 30 days old: the 24 Sep profiles would be re-learned on about 28 Oct, but the release rejects them from 24 Oct. Dispatch `questionnaire-metadata-refresh.yml` with `force=true` for the affected brands, then confirm for every route model:
   - `status=OK`;
   - `observedAt` is fresh;
   - the warranty/bill/age modes equal the route file.

   A profile whose modes changed must **not** be revalidated. It stays at inspection until the route is re-observed and reviewed.

## 2. Freeze predictions, then commit before any attempt

```
echo '{"<deviceKey>": <current Get Upto>, ...}' > refs.json   # from step 1
npx tsx scripts/pricing/revalidation-plan.ts --references refs.json --out scripts/pricing/fixtures/release-revalidation-plan-<date>.json
git add scripts/pricing/fixtures/release-revalidation-plan-<date>.json && git commit -m "Freeze revalidation predictions"
```

The plan holds, for every route, the clean control plus each measured single condition. These are the actual service's outputs at the current Get Upto. If a reference moved:

- for offset and accessory routes, clean follows the reference, but damaged cases are unscorable (the service inspects them);
- for retention routes (CIVI, Open, S23 FE), nothing can be predicted until it is recalibrated.

## 3. Collect, at least 27 attempts

Owner budget approval is required.

- **All 20 clean controls.** Each verifies the route trace (every conditional question's status) and the clean rule.
- **At least one measured damaged case per candidate (7).**
- Accessory-route body cases add independent coverage if the budget allows.

Use the existing collector runner pattern: `scratch/cashify-matrix-integration/research-evidence/claude-independent-2026-10-03/run.ts`. It has a shared ledger, a frozen-hash check, stop on auth/CAPTCHA, and it skips a damaged case if its block's clean control failed or its Get Upto moved. Do not retry failures beyond the plan.

## 4. Accept per route (never on average)

A route is revalidated only if **all** of the following hold:

- The captured Get Upto equals the planned reference.
- Every route-trace mode (warranty, bill, age, box, charger, S Pen, eSIM) matches the route file.
- Clean Selling equals the frozen clean prediction.
- Every scored damaged case is within ±3% **and** does not overpay by more than 3%.

A route that fails stays expired (inspection). Record failures; do not tune and accept in the same round. Any re-fit needs a later independent check.

## 5. Publish

1. Write a new route evidence file with `observedAt` and `evidenceSha256` taken from the new verified traces. Keep the old file.
2. For candidates whose damage was revalidated, bump `calibratedAt` in their development fixture only from the new observations.
3. Point `config/pricing-release.json` → `routeEvidenceFile` at the new file.
4. Run:
   ```
   npm run test:pricing:release && npm run test:pricing && npx tsc --noEmit -p tsconfig.next.json && npm run build
   ```
5. Merge via PR. Render redeploys from `main`.
6. Verify `GET https://fhoneify-api.onrender.com/health` → `pricing.releaseRoutes` and a Nord clean smoke quote.

## Labels to preserve

- Temporal repeats of already-measured conditions are **not** independent validation. This includes the 2026-10-03 OnePlus Open lines/spots repeats: their PNGs are identical because the collector clips only the price card.
- The iPhone 17 B/C differences (₹11,280 / ₹14,030) remain provisional and unused until B/C are re-observed with traces.
