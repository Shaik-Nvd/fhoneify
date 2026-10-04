# Coverage checkpoint audit (2026-10-04)

- Branch base: b02667d52849d548215210e3d04be9877b276fed
- Replay timestamp: 2026-10-03T19:00:00.000Z
- 150-case production replay eligibility: 35/150. This is offline fixture eligibility, not proof of live prices.
- Exact-identity observation join: 148/150 have a workbook price, tester/traced observation or follow-up control; missing: FM043_B, FM043_C. Historical 144/150 is superseded.
- Automatic observations: 171 raw source records; 120 join to canonical identities, including FINAL/CLOSE/correction-prefixed IDs.
- Original workbook: 150 condition rows recovered from source cells; 66 source price-bearing tester records are joined. Observation dates/manual traces remain unknown unless separately recorded.
- Observed-point eligibility: 40 before -> 77 earlier -> 40 after exact follow-up joins. Production-reference replay eligibility remains 35.
- Research specs reviewed: 23; parameterized checks cover every clean and measured-condition profile. All remain development fits, not independent validation, and the current route file rejects them to inspection. Exact references, controls, supported conditions and guard reasons are in JSON.
- Collection: the authorized 24-attempt campaign is fully reserved; the 20/20 release-review fixture is a separate campaign. Verified remaining allowance is 0 and collection is disabled. Holdouts and failures remain preserved.

## Reproduction

Run powershell -File scripts/pricing/import-coverage-workbook.ps1 (bundled workbook SHA-256 57f7b74f16e9d95ec1a17ba3f0b8ddc891cca3fe35a06bc983513ca0ec3bc0aa), rerun npx tsx scripts/pricing/coverage-gap-register.ts --register scratch/coverage-expansion/canonical-coverage-case-register.json --at 2026-10-03T19:00:00Z --out scratch/coverage-expansion/replayed-gap-2026-10-04.json --md scratch/coverage-expansion/replayed-gap-2026-10-04.md, then npx tsx scripts/pricing/audit-coverage-checkpoint.ts --write. Workbook hash/size, input paths and hashes are recorded in scratch/coverage-expansion/checkpoint-audit-2026-10-04.json. Raw workbook instructions/prices and the owner correction overlay remain separate; synthetic production inputs never inherit observed prices.
