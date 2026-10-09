# Agent Z HTTP acceptance review

The original real-router harness reproduced a missing-token bypass: omitted token200 persisted recomputed6458, while stale (including updated6458), invalid and empty tokens409. Commit eb5d1f7 closed omission only in hybrid mode and retained legacy tokenless compatibility.

This update closes recomputed/tokenless HTTP persistence in every mode. All14 stale/invalid/empty/omitted-token combinations409 QUOTE_CHANGED with zero writes before fresh acceptance, including both coupon states and omitted client prices. Fresh signed quotes succeed, storing6458 with the real payout. Fresh legacy tokens succeed; tokenless legacy requests now409.

The rollback harness verifies old cache-version tokens409 with zero writes in cache-off hybrid and legacy, fresh mode-appropriate tokens succeed, and previously accepted exact/fallback records stay unchanged. Full code rollback to eb5d1f7/main reopens unsafe acceptance; retain the signed-token controller guard.

The client requotes on409 and requires another Schedule Pickup click. Reloaded changed offers and expired/missing saved offers on direct step12 return to payout review. Browser regressions traverse real UI and fixture OTP, coupon off/on, changed reload, mounted expiry and already-expired saved-token reload. They check displayed/stored payout equality. Browser requests outside loopback are blocked. Valid same-version fallback tokens retain the existing price lock.

```sh
node --import tsx scripts/test/pricing.agent-z-acceptance.test.ts
node --import tsx scripts/test/pricing.agent-z-rollback.test.ts
node --import tsx scripts/test/pricing.release-flow.test.ts
```

Persistence is an in-memory Prisma spy, with an unreachable database sentinel. Updated command exits and browser outputs are in scratch/agent-z-release-validation. The6458 example establishes fallback consistency, not independent Cashify accuracy.
