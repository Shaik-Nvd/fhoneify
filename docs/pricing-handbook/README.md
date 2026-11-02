# Pricing handbook: start here

This handbook travels with the Fhoneify repository. A teammate can use it on their own computer with Codex. They need repository access, a local checkout, the project dependencies and their own quote-data folder. They do not need the original owner's Windows directories, browser session or credentials.

## Owner: three steps

1. Give the teammate access to this repository. Have them clone the current `main` and open its folder in Codex.
2. Give them the Cashify screenshots/ZIPs for the brand they will handle. The folder may be anywhere on their computer.
3. For Xiaomi/Mi/Redmi/POCO, paste the prompt from [XIAOMI_START_HERE.md](XIAOMI_START_HERE.md). For another brand, change the brand and data-folder portions of that prompt.

The method transfers between brands. Apple's actual repair costs, questionnaire branches and calibration values do not. Codex must learn the teammate's brand from its own evidence and keep the completed iPhone rules protected.

## Read in this order

1. [STRICT_RULES.md](STRICT_RULES.md): mandatory rules and protected business policy.
2. [CODEX_PRICING_HANDBOOK.md](CODEX_PRICING_HANDBOOK.md): intake, deduction learning, fitting, tests and release process.
3. [XIAOMI_START_HERE.md](XIAOMI_START_HERE.md): portable setup and the Mi handoff prompt.
4. [IPHONE_RELEASE_2026_10_30.md](IPHONE_RELEASE_2026_10_30.md): what was integrated and verified in this iPhone release.
5. [FINAL_DATA_REPORT.md](FINAL_DATA_REPORT.md): the original final-folder inventory and analysis. Its dated analysis-only status describes the intake stage; the release report supersedes that status.

## Setup for Codex

Read the repository's `AGENTS.md` and `docs/HANDOFF_CODEX.md`, then this handbook. Inspect `package.json` for supported tools and run the established dependency setup. Configure safe local/disposable services using `.env.example`; never copy production passwords or an owner's personal browser session to another computer. Keep secrets out of Git.

The source is a Next.js frontend, Express API and Prisma/Postgres project. Node and Python are used by the existing evidence tooling. Install the versions compatible with the checked-out project. Use actual local paths rather than copying a historical `C:\Users\...` path from a report.

The source reports' old paths inside audit manifests are provenance. They are not runtime dependencies. The fitted calibration and code regression tests work without the final source folder. The final quote-level corpus and bulk audit exports are kept local/private and are not part of this public release. Reproducing the full final-intake fit needs the owner-authorized local measurements; the write command refuses to overwrite calibration when they are missing. Dataset-dependent checks explicitly report a skip when private evidence is absent. A new brand’s audit uses its own supplied folder.

## Safe verification commands

From the repository root, after dependency setup:

```powershell
node --import tsx scripts/pricing-evidence/run-offline-suites.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.next.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.server.json
npm run build
```

The portable suite runner deliberately uses unreachable database endpoints and excludes the known DB-writing integration test and browser-only suite. It produces logs under `release-test-logs/offline`. Build/typecheck commands do not establish browser, OTP or real persistence behavior; check those separately as required by the change.

Review the current API startup script and its database configuration before local startup; older project instructions describe a database-push behavior that has since been removed. Use a safe local/disposable database. Do not run reference refresh/import scripts as an incidental pricing test.

## The protected quote rule

The Cashify condition-equivalent is learned first. Then add the tier bonus calculated from the **original current database reference**, capped at ₹2,000, once. Preserve the existing ₹100 final-engine-price floor, fees, coupon headroom, signed quotes and server authority. See the full handbook for exact tier boundaries and worked examples.

Fixed measured repair deductions are allowed; fixed final phone-price lookups are not the pricing design. Stored historical references must not replace the current reference silently.


## Public code, private evidence

This repository is public. Publish code, fitted calibration parameters, regression fixtures and the handbook. Keep full quote records, raw ZIPs and bulk quote-level audit/validation exports local/private unless the owner explicitly authorizes public disclosure. The final iPhone evidence is preserved locally; it is not a runtime dependency. Your teammate can use the handbook and their own Mi data without receiving the owner's private iPhone corpus.
