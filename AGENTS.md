# Repository Guidelines

## Project Structure & Module Organization
Fhoneify is a smartphone resale platform with a Next.js frontend and Express API. Use the current root-level layout; the README's `apps/` and `packages/` tree is outdated.

- `app/`: App Router pages, layouts, and API routes.
- `components/`: reusable React UI; `styles/` and `public/`: styles and static assets.
- `lib/`: shared utilities, Zustand stores, pricing calculations, and `referencePricing/` repositories.
- `server/`: API entry point, middleware, and feature modules under `server/modules/`.
- `prisma/`: database schema and seed script.
- `scripts/test/`: pricing suites; `scripts/reference-pricing/`: import, refresh, and export tooling.

## Build, Test, and Development Commands
Run commands from the repository root:

- `npm install`: install dependencies; the postinstall hook downloads Playwright Chromium.
- `npm run dev`: start the API and web app together (default ports 5000 and 3001).
- `npm run dev:web` / `npm run dev:api`: start either service independently.
- `npm run build`: build the Next.js application.
- `npm start`: serve the built frontend; run the API separately.
- `npm run lint`: run ESLint with `next/core-web-vitals`.
- `npm run test:pricing:all`: run all four pricing suites.

## Coding Style & Naming Conventions
Use TypeScript with strict checking. Follow nearby code: two-space indentation, semicolons, and single-quoted strings are common. Name React components in PascalCase and functions/variables in camelCase. Preserve Next.js filenames such as `page.tsx` and `layout.tsx`; organize backend features in their existing modules. Use Tailwind utilities consistently with adjacent UI. No dedicated formatter is configured.

## Testing Guidelines
Pricing tests use `node:assert/strict`, executed through `tsx`, without Jest or Vitest. Add cases under `scripts/test/` using `pricing.<area>.test.ts`. Run `npm run test:pricing` for focused regression checks and the full suite for quote/reference-price changes. Integration tests consume the configured reference repository, so ensure its data and database configuration are available. No coverage threshold is configured. Investigate changed golden prices; update expectations only for deliberate, reviewed pricing changes.

## Commit & Pull Request Guidelines
Recent commits use imperative, descriptive subjects, such as `Fix ...`, `Add ...`, and `Update ...`. Keep commits focused. PRs should explain behavior changes, link relevant issues, report validation commands/results, and include screenshots for UI changes. Explicitly identify pricing, schema, or configuration impacts.

## Security & Configuration
Use `.env.example` to configure local `.env`; never commit credentials. Set required JWT/admin values and an appropriate `DATABASE_URL`. Consult `PRICING_REFERENCE_DATA_ARCHITECTURE.md` before changing reference-price storage or generated exports.

# Fhoneify Engineering Rules

## Main goal

The highest-priority engineering goal is:

Make Fhoneify pricing correct, server-authoritative, persistent across reloads, and aligned with Cashify condition outcomes before applying the existing Fhoneify uplift.

## Production architecture

- Frontend: Next.js on Vercel
- Backend: Express API on Render
- Database: Supabase/Postgres
- Cashify reference refresh: GitHub Actions
- Current production pricing source must be server-side
- `/api/quote/price` is the authoritative quote endpoint
- Signed quote token protects lead creation

## Pricing rules that must NOT be changed casually

Do not modify these unless explicitly approved:

- calculateFhoneifyPrice
- applyCompetitorUplift
- 4% / 6% / 8% uplift tiers
- ?2,000 uplift cap
- ?100 minimum bonus
- age depreciation values
- condition penalty values
- accessory values
- scrap values

Do not invent new penalty percentages.

Historical/existing penalty constants may be restored if they were accidentally disconnected.

## Current pricing bugs

Known completed/fixed work:
- Cashify reference prices refreshed for 2,127 / 2,200 devices
- weekly GitHub Actions refresh exists
- server-authoritative signed quote path exists
- PR #2 fixes frontend duplicate pricing
- PR #2 fixes reload ? ?0
- frontend must display server quote only

Known unresolved pricing issue:
- many condition answers are ignored
- cracked screen may have no deduction
- screen spots/lines/discoloration may have no deduction
- broken panel and bent frame may have no deduction
- Samsung/Xiaomi/Oppo functional conditions may be ignored
- touchPenalty, originalScreenPenalty and COMMON_FUNCTIONAL_PENALTIES may exist but not be wired
- warranty/age mapping may be wrong
- historical commit f1034f4 changed the condition pricing behavior

## Pricing acceptance criteria

Pricing is NOT fixed just because:
- API returns 200
- ReferencePrice is fresh
- regression tests pass

Pricing is fixed only when:

1. Same inputs produce one server quote.
2. Frontend displays that exact quote.
3. Lead stores that exact quote.
4. Reload restores that exact quote.
5. Meaningful condition inputs affect price according to intended existing rules.
6. Fhoneify internal Cashify-equivalent is close to real Cashify for semantically matched conditions.
7. Only then is uplift applied.

## Safety rules

- Never expose secrets.
- Never print passwords or hashes.
- Never commit .env files.
- Never force-push.
- Never modify supervisor data.
- Do not modify admin auth unless the task is explicitly about admin auth.
- Do not touch Cashify refresh unless explicitly asked.
- Do not write test rows into production unnecessarily.
- Never run known production-writing integration tests without explicit approval.
- Prefer read-only verification on production.

## Git rules

Before a major task:
- git status
- git fetch
- identify current branch/commit
- create a checkpoint if necessary

After changes:
- show changed files
- run targeted tests
- run regression tests
- do not push until tests pass

Before any Fhoneify pricing task, read docs/HANDOFF_CODEX.md.


## Current evidence-pricing handbook (30 October 2026)

For pricing tasks also read `docs/pricing-handbook/README.md` and `STRICT_RULES.md`. That handbook records the owner's subsequent approved policy: calculate the 4/6/8% bonus on the original current database reference, cap the bonus at ₹2,000, and add it once after Cashify condition deductions. Do not restore a damaged-condition-value percentage ceiling. The existing ₹100 rule is a final-engine-price floor, not an extra minimum bonus.

Historical bug lists above are investigation leads; confirm whether current code already fixes them before changing anything. Evidence-backed calibration explicitly requested by the owner is authorized work, while unrelated policy, authentication, schema and refresh changes remain out of scope. New brand work must preserve iPhone calibrations and use that brand's own source evidence. Use the portable safe suite runner documented in the handbook; production-writing integration tests remain excluded unless explicitly authorized.

This repository is public. Do not publish full quote datasets or bulk source-derived audit artifacts without explicit owner approval. Keep private evidence commits out of the public branch history; code, fitted parameters and the handbook can be published within their authorized task scope.
