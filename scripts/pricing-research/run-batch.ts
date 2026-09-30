/**
 * Batch driver for the one-time Cashify pricing-research campaign.
 *
 * Ties together, in order: the device catalog (lib/referencePricing/catalog),
 * each model's known questionnaire semantics (CashifyQuestionnaireProfile),
 * the A/B/C profile builder (./profiles), the Playwright collector
 * (./collector), and the research store (lib/researchPricing).
 *
 * Designed to run as a single bounded batch that exits cleanly - not a
 * long-lived process. A GitHub Actions job runs this once per dispatch and
 * exits; the NEXT dispatch (or a local re-run) resumes because every claim
 * and every completed experiment lives in Postgres, not in this process's
 * memory. See docs/PRICING_RESEARCH_CAMPAIGN.md for the exact commands.
 *
 *   npm run research:collect -- --brand Samsung --limit 20 --batch-size 5
 *   npm run research:collect -- --resume --max-experiments 200
 *
 * Flags:
 *   --brand B            only this brand's catalog devices
 *   --model M            only devices whose model contains M (case-insensitive)
 *   --limit N            cap on distinct DEVICES to consider ensuring experiments for
 *   --batch-size N       how many experiments this invocation claims+collects before exiting (default 10)
 *   --max-experiments N  hard cap on experiments collected this invocation (defaults to batch-size)
 *   --profiles LIST      comma list from A,B,C (default A,B,C)
 *   --dry-run            ensure experiments and print the plan, collect nothing
 *   --headed             force a visible browser (also CASHIFY_SCRAPER_HEADED=true)
 *   --claim-ttl-ms N     abandoned-claim TTL (default 900000 = 15 min)
 *   --json <file>        write the run summary to a file
 */
import 'dotenv/config';
import fs from 'fs';
import { loadRefreshCatalog, buildCashifyLinkIndex } from '../../lib/referencePricing/catalog';
import { deviceKey } from '../../lib/referencePricing/types';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { getQuestionnaireProfileStore, disconnectReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { getResearchStore } from '../../lib/researchPricing/getResearchStore';
import type { ResearchExperimentRow } from '../../lib/researchPricing/store';
import { buildProfileA, buildProfileB, buildProfileC, type QuestionnaireProfileInput } from './profiles';
import { collectCashifyQuote } from './collector';
import { materializeResearchSessionFromEnv } from './sessionMaterializer';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type ProfileCode = 'A' | 'B' | 'C';
const PROFILE_ENUM: Record<ProfileCode, ResearchExperimentRow['profile']> = {
  A: 'A_CLEAN_BASELINE',
  B: 'B_SINGLE_VARIABLE_CONTROL',
  C: 'C_DAMAGE_CONDITION',
};

const WORKER_ID =
  process.env.RESEARCH_WORKER_ID ||
  (process.env.GITHUB_RUN_ID && process.env.GITHUB_RUN_ATTEMPT
    ? `gha-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`
    : `local-${process.pid}-${Date.now()}`);

async function main() {
  materializeResearchSessionFromEnv();
  const catalog = loadRefreshCatalog();
  const linkIndex = buildCashifyLinkIndex(catalog.entries);

  let entries = catalog.entries;
  const brand = arg('brand');
  if (brand) entries = entries.filter((e) => e.device.brand.toLowerCase() === brand.toLowerCase());
  const modelSub = arg('model');
  if (modelSub) entries = entries.filter((e) => e.device.model.toLowerCase().includes(modelSub.toLowerCase()));
  const limit = arg('limit') ? Number(arg('limit')) : undefined;
  if (limit) entries = entries.slice(0, limit);

  const profileCodes = (arg('profiles') ?? 'A,B,C')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is ProfileCode => s === 'A' || s === 'B' || s === 'C');

  const dryRun = flag('dry-run');
  const batchSize = arg('batch-size') ? Number(arg('batch-size')) : 10;
  const maxExperiments = arg('max-experiments') ? Number(arg('max-experiments')) : batchSize;
  const claimTtlMs = arg('claim-ttl-ms') ? Number(arg('claim-ttl-ms')) : 15 * 60 * 1000;
  const headed = flag('headed');

  const research = getResearchStore();
  const questionnaireStore = getQuestionnaireProfileStore();

  const batch = await research.createBatch({
    batchLabel: `${brand ?? 'all-brands'}${modelSub ? `:${modelSub}` : ''}-${new Date().toISOString()}`,
    brandFilter: brand,
    modelFilter: modelSub,
    triggeredBy: process.env.GITHUB_ACTIONS ? 'github-actions' : 'cli',
    externalRunId: process.env.GITHUB_RUN_ID,
    requestedLimit: limit,
  });

  console.log(`[research] batch ${batch.id} (${entries.length} candidate devices, profiles=${profileCodes.join(',')})`);

  // Ensure every requested (device, profile) has an experiment row. This is
  // the "process a configurable batch, write checkpoints, exit" contract:
  // ensureExperiments never resets a COMPLETED row, so re-running this same
  // command tomorrow with the same filters is always safe.
  const deviceRows = entries.map((e) => ({
    deviceKey: deviceKey(e.device),
    brand: e.device.brand,
    model: e.device.model,
    storage: e.device.storage,
  }));
  const ensured = await research.ensureExperiments(
    deviceRows,
    profileCodes.map((c) => PROFILE_ENUM[c]),
    { batchId: batch.id }
  );
  console.log(`[research] ensured experiments: +${ensured.created} new, ${ensured.alreadyExisted} already existed, ${ensured.skippedCompleted} already completed`);

  if (dryRun) {
    const progress = await research.getProgress({ brandFilter: brand, modelFilter: modelSub });
    console.log('[research] dry-run - not collecting.', JSON.stringify(progress, null, 2));
    await research.finishBatch(batch.id, 'dry-run');
    await teardown();
    return;
  }

  const results: Array<{ deviceKey: string; profile: string; status: string; reason?: string }> = [];
  let collected = 0;
  let authRequiredHit = false;

  while (collected < maxExperiments && collected < batchSize && !authRequiredHit) {
    const claimed = await research.claimNext({
      workerId: WORKER_ID,
      claimTtlMs,
      brandFilter: brand,
      modelFilter: modelSub,
      profiles: profileCodes.map((c) => PROFILE_ENUM[c]),
    });
    if (!claimed) {
      console.log('[research] nothing left to claim for this filter.');
      break;
    }

    const modelKey = questionnaireModelKey({ brand: claimed.brand, model: claimed.model });
    const qProfileRow = await questionnaireStore.get(modelKey);
    const qProfile: QuestionnaireProfileInput = qProfileRow ?? {
      warrantyMode: 'UNKNOWN',
      billMode: 'UNKNOWN',
      ageMode: 'UNKNOWN',
      status: undefined,
    };

    const device = { brand: claimed.brand, model: claimed.model, storage: claimed.storage };
    const built =
      claimed.profile === 'A_CLEAN_BASELINE'
        ? buildProfileA(device)
        : claimed.profile === 'B_SINGLE_VARIABLE_CONTROL'
        ? buildProfileB(device, qProfile)
        : buildProfileC(device, qProfile);

    if (built.unsupported) {
      await research.recordOutcome(claimed.id, { status: 'UNSUPPORTED', unsupportedReason: built.reason }, WORKER_ID);
      results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status: 'UNSUPPORTED', reason: built.reason });
      collected++;
      continue;
    }

    const cashifyUrl = linkIndex.get(claimed.deviceKey);
    try {
      const outcome = await collectCashifyQuote(
        { brand: device.brand, model: device.model, storage: device.storage, cashifyUrl },
        built.answers,
        { headless: !headed }
      );
      const { written } = await research.recordOutcome(claimed.id, outcome, WORKER_ID);
      const status = written ? outcome.status : 'STALE_CLAIM_DISCARDED';
      results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status, reason: outcome.errorReason ?? outcome.unsupportedReason });
      if (!written) {
        console.warn(`[research] ${claimed.deviceKey} (${claimed.profile}) was reclaimed by another worker before this result landed - discarded, not written.`);
      } else if (outcome.status === 'AUTH_REQUIRED') {
        authRequiredHit = true;
        console.warn(`[research] AUTH_REQUIRED on ${claimed.deviceKey} (${claimed.profile}) - stopping this batch cleanly. Re-authenticate with "npm run research:login" and resume with the same command.`);
      }
    } catch (error: any) {
      await research.releaseClaim(claimed.id, WORKER_ID);
      results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status: 'RELEASED', reason: error?.message ?? String(error) });
      console.error(`[research] unexpected error on ${claimed.deviceKey} (${claimed.profile}), claim released for retry:`, error?.message ?? error);
    }
    collected++;
  }

  await research.finishBatch(batch.id, `collected=${collected} authRequiredHit=${authRequiredHit}`);
  const progress = await research.getProgress({ brandFilter: brand, modelFilter: modelSub });

  console.log('\n=== CASHIFY RESEARCH BATCH SUMMARY ===');
  console.log(JSON.stringify({ batchId: batch.id, workerId: WORKER_ID, collected, authRequiredHit, results, progress }, null, 2));

  const out = arg('json');
  if (out) fs.writeFileSync(out, JSON.stringify({ batchId: batch.id, workerId: WORKER_ID, collected, authRequiredHit, results, progress }, null, 2));

  process.exitCode = authRequiredHit ? 2 : 0;
  await teardown();
}

async function teardown() {
  await disconnectReferencePriceRepository().catch(() => {});
  await getResearchStore()
    .disconnect()
    .catch(() => {});
}

main()
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Playwright/Prisma handles can keep the event loop alive briefly after
    // the work is done and the exit code is already set (see the identical
    // note in scripts/reference-pricing/refresh-questionnaire-profiles.ts).
    setTimeout(() => process.exit(), 2000).unref();
  });
