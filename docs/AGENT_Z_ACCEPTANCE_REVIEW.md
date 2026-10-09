# Agent Z HTTP acceptance review

The focused independent reviewer initially reproduced the missing-token bypass through the actual quote router, using synthetic signing keys and an in-memory Prisma lead spy. Before integration repair, an omitted-token request returned200 and persisted recomputed6458; stale token (including updated6458), invalid signature and empty token returned409.

Agent Z preserved the failing harness before changing the controller. After the hybrid-only omission gate, all14 stale/invalid/empty/omitted-token combinations return409 QUOTE_CHANGED with zero lead writes before fresh acceptance. This includes both coupon states and omitted client prices. A fresh signed quote returns6458 and two accepted hybrid requests store exactly that authoritative gross and the helper-calculated payout. Explicit legacy-mode rollback retains tokenless compatibility, verified by a separate final in-memory write.

Reproduce: `node --import tsx scripts/test/pricing.agent-z-acceptance.test.ts`. Final test log: scratch/agent-z-release-validation/pricing.agent-z-acceptance.log. Database connection sentinel is unreachable; `$connect` throws if used; lead persistence is a spy. No production database or customer row was used. The6458 quote is a changed-reference fallback and establishes persistence consistency, not exact Cashify accuracy.

Controller fix also passed the release-flow and glass-shadow real-router suites. Client pickup handling fetches a replacement signed quote on409 and makes the customer review it before trying again. This is an intentional hybrid API contract change for callers that previously omitted the token; review any external client migration before deployment.
