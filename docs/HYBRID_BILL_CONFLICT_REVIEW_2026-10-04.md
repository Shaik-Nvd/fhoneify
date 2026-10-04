# Post-deployment hybrid review

Base: PR #14 deployed main `28d62f556d8b64980861d58b40ce01f179f50b35`.

## Verified behavior

Direct production `/health` reports this commit, hybrid mode, 44 loaded/fresh routes and first route expiry 2026-10-15T14:04:30.047Z. Both GitHub Vercel checks are successful. Direct quote requests reproduced Nord clean gross8,986, Nord display-lines gross3,931 and iPhone17Pro1TB fallback gross85,078, each with a token. No production leads or Cashify collection attempts were created.

The missing-reference caveat is real: Huawei Mate20Pro6/128 quotes gross3,951 with referenceStatus missing using the existing catalog baseline. This is the pre-existing permissive reference policy, not a verified Cashify correction. The follow-up preserves that policy; it does not enable the blanket strict-reference flag. A new test covers permissive catalog fallback and strict refusal separately.

## Bug and correction

The guarded classifier rejected false box/charger flags paired with present accessories, but did not reject `validBill:false` plus `accessories:["bill"]`. Those contradictory answers could receive a signed hybrid legacy-fallback quote, benefit from bill presence in the underlying calculator, and reach lead verification.

The new guard treats this explicit bill conflict as unknown/conflicting diagnostics. Hybrid and strict release modes return inspection without price/token. Current inspection also rejects an old legacy token before lead persistence. Legacy rollback calculations are untouched. Consistent bill Yes and No inputs remain priceable; no coefficients, references, evidence or flags changed.

A regression failed before the fix and passed after. Independent read-only code review confirmed the change is narrow and compatible with actual UI flows.

## Validation

- Hybrid18groups, including catalog parity, bill conflict/old-token rejection, consistent bill answers and both reference policies.
- Real HTTP/controller/token/lead flow37groups, four in-memory leads and zero database writes.
- Production37, golden pricing27, measured-point10groups, strict release policy12groups and accessory17checks all passed.
- Production build passed with existing quote-page hook/image warnings; git diff --check passed.

## Deployment

Apply this small follow-up on the deployed main commit in an isolated branch, run release/production tests and build, then use normal PR review/merge. GitHub branch creation in this session was rejected with403 Resource not accessible by integration, so this session did not publish or deploy the change.

## Pricing limit

PR #14 successfully fixes correction selection and general quote availability. It does not establish accurate legacy fallback pricing for all50 workbook devices or all combinations.44 loaded routes are not44 independently validated production variants. This input-conflict patch closes a reproducible implementation defect and does not invent calibration coverage.
