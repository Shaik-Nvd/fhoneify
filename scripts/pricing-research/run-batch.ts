/**
 * Bounded, explicitly authorized Cashify pricing-research pilot driver.
 *
 * Ties together, in order: the device catalog (lib/referencePricing/catalog),
 * each model's known questionnaire semantics (CashifyQuestionnaireProfile),
 * the A/B/C profile builder (./profiles), the Playwright collector
 * (./collector), and the research store (lib/researchPricing).
 *
 * Designed to run as a tiny local batch that exits cleanly. Checkpoints live
 * in Postgres, not process memory. Hosted collection remains disabled until
 * screenshot evidence has an approved durable destination. See the campaign
 * document for the exact local pilot command.
 *
 *   npm run research:collect -- --pilot --brand POCO --model C3 --storage "4 GB/64 GB" --limit 1 --batch-size 1 --max-experiments 1 --profiles A --session-file session-<timestamp>.json --headed
 *
 * Flags:
 *   --brand B            only this brand's catalog devices
 *   --model M            only devices whose model contains M (case-insensitive)
 *   --limit N            cap on distinct DEVICES to consider ensuring experiments for
 *   --batch-size N       how many experiments this invocation claims+collects before exiting (default 10)
 *   --max-experiments N  hard cap on experiments collected this invocation (defaults to batch-size)
 *   --profiles LIST      comma list from A,B,C (default A,B,C)
 *   --dry-run            print candidates without database writes
 *   --headed             force a visible browser (also CASHIFY_SCRAPER_HEADED=true)
 *   --force              disabled for collection; never reset completed rows
 *   --claim-ttl-ms N     abandoned-claim TTL (default 900000 = 15 min)
 *   --pace-ms N          idle delay between experiments within this batch (default 0 - no extra delay beyond the questionnaire walk's own waits)
 *   --json <file>        write the run summary to a file
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'node:util';
import { loadRefreshCatalog, buildCashifyLinkIndex } from '../../lib/referencePricing/catalog';
import { deviceKey } from '../../lib/referencePricing/types';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { getQuestionnaireProfileStore, disconnectReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { getResearchStore } from '../../lib/researchPricing/getResearchStore';
import type { ResearchExperimentRow } from '../../lib/researchPricing/store';
import { buildProfileA, buildProfileB, buildProfileC, type QuestionnaireProfileInput } from './profiles';
import { collectCashifyQuote, describeSessionPool } from './collector';
import { materializeResearchSessionFromEnv } from './sessionMaterializer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const catalog = loadRefreshCatalog();
  const linkIndex = buildCashifyLinkIndex(catalog.entries);

  let entries = catalog.entries;
  const brand = arg('brand');
  if (brand) entries = entries.filter((e) => e.device.brand.toLowerCase() === brand.toLowerCase());
  const modelSub = arg('model');
  if (modelSub) entries = entries.filter((e) => e.device.model.toLowerCase().includes(modelSub.toLowerCase()));
  const storageFilter = arg('storage');
  if (storageFilter) entries = entries.filter((e) => e.device.storage.toLowerCase() === storageFilter.toLowerCase());
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
  const paceMs = arg('pace-ms') ? Number(arg('pace-ms')) : 0;
  const headed = flag('headed');
  const force = flag('force');
  const retryUnsupported = flag('retry-unsupported');
  const reverifyCompleted = flag('reverify-completed');
  const sessionFileName = arg('session-file');

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, candidateDevices: entries.map((entry) => ({
      brand: entry.device.brand, model: entry.device.model, storage: entry.device.storage,
    })), profiles: profileCodes }));
    return; // genuinely read-only: no batch or experiment rows are created
  }
  if (!flag('pilot') || !brand || !modelSub || !storageFilter || limit == null || !Number.isInteger(limit) || !Number.isInteger(batchSize) ||
    !Number.isInteger(maxExperiments) || limit < 1 || limit > 2 || batchSize < 1 || batchSize > 2 ||
    maxExperiments < 1 || maxExperiments > 2 || entries.length === 0 || profileCodes.length === 0 || force ||
    !sessionFileName || !/^session-\d+\.json$/.test(sessionFileName)) {
    throw new Error('collection requires an explicit --pilot, a fresh --session-file, --brand, --model, --storage, --limit <= 2, --batch-size <= 2 and --max-experiments <= 2; --force is disabled');
  }
  if (reverifyCompleted && (entries.length !== 1 || batchSize !== 1 || maxExperiments !== 1 || profileCodes.length !== 1)) {
    throw new Error('--reverify-completed is limited to one exact device and one profile per pilot');
  }

  materializeResearchSessionFromEnv();

  const research = getResearchStore();
  const questionnaireStore = getQuestionnaireProfileStore();

  const sessionPool = describeSessionPool(sessionFileName);
  const usableSessions = sessionPool.filter((s) => s.valid).length;
  console.log(`[research] session pool: ${usableSessions}/${sessionPool.length} usable`);
  for (const s of sessionPool) console.log(`[research]   ${s.valid ? 'valid  ' : 'expired'} ${s.file} - ${s.reason}`);
  if (usableSessions === 0) {
    console.error('[research] no usable Cashify sessions - run "npm run research:login" before collecting. Stopping without attempting any network request.');
    await teardown();
    process.exitCode = 2;
    return;
  }

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
  const selectedDeviceKeys = deviceRows.map((row) => row.deviceKey);
  const ensured = await research.ensureExperiments(
    deviceRows,
    profileCodes.map((c) => PROFILE_ENUM[c]),
    { batchId: batch.id, force }
  );
  console.log(`[research] ensured experiments: +${ensured.created} new, ${ensured.alreadyExisted} already existed, ${ensured.skippedCompleted} already completed`);

  const results: Array<{ deviceKey: string; profile: string; status: string; reason?: string }> = [];
  let collected = 0;
  let authRequiredHit = false;
  let evidenceMismatch = false;
  const evidenceDir = path.resolve('research-evidence');

  while (collected < maxExperiments && collected < batchSize && !authRequiredHit && !evidenceMismatch) {
    const claimed = await research.claimNext({
      workerId: WORKER_ID,
      claimTtlMs,
      brandFilter: brand,
      modelFilter: modelSub,
      deviceKeys: selectedDeviceKeys,
      retryUnsupported,
      reverifyCompleted,
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
    let outcomePersisted = false;
    try {
      const outcome = await collectCashifyQuote(
        { brand: device.brand, model: device.model, storage: device.storage, cashifyUrl },
        built.answers,
        { headless: !headed, evidenceDir, evidenceId: claimed.id, sessionFileName }
      );
      if (outcome.status === 'COMPLETED' &&
        (!outcome.evidence || !outcome.finalQuote || !outcome.questionnaireFingerprint || !outcome.questionsAsked?.length)) {
        throw new Error('completed quotation lacked mandatory evidence');
      }
      const { written, observationId } = await research.recordOutcome(claimed.id, outcome, WORKER_ID);
      outcomePersisted = written;
      const status = written ? outcome.status : 'STALE_CLAIM_DISCARDED';
      results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status, reason: outcome.errorReason ?? outcome.unsupportedReason });
      if (written && outcome.status === 'COMPLETED') {
        const persisted = observationId ? await research.getRecordedEvidence(observationId) : null;
        if (!persisted || persisted.experimentId !== claimed.id || persisted.status !== 'COMPLETED' ||
          persisted.finalQuote !== outcome.finalQuote || persisted.questionnaireFingerprint !== outcome.questionnaireFingerprint ||
          !isDeepStrictEqual(persisted.questionsAsked, outcome.questionsAsked) ||
          !isDeepStrictEqual(persisted.answersSelected, outcome.answersSelected)) {
          evidenceMismatch = true;
          console.error('[research] persisted observation does not match the captured final-price evidence; stopping batch for review.');
        } else {
          fs.mkdirSync(evidenceDir, { recursive: true });
          fs.writeFileSync(path.join(evidenceDir, `${observationId}.json`), JSON.stringify({
            experimentId: claimed.id,
            observationId,
            model: claimed.model,
            storage: claimed.storage,
            finalQuote: outcome.finalQuote,
            screenshotPath: path.basename(outcome.evidence!.screenshotPath),
            screenshotSha256: outcome.evidence!.screenshotSha256,
            capturedAt: outcome.evidence!.capturedAt,
            recordedAt: persisted.recordedAt.toISOString(),
            questionnaireFingerprint: outcome.questionnaireFingerprint,
            questionsAsked: outcome.questionsAsked,
            answersSelected: outcome.answersSelected,
            verification: 'DB_MATCHED_SCREENSHOT_PENDING_VISUAL_REVIEW',
          }, null, 2));
        }
      }
      if (!written) {
        console.warn(`[research] ${claimed.deviceKey} (${claimed.profile}) was reclaimed by another worker before this result landed - discarded, not written.`);
      } else if (outcome.status === 'AUTH_REQUIRED') {
        authRequiredHit = true;
        console.warn(`[research] AUTH_REQUIRED on ${claimed.deviceKey} (${claimed.profile}) - stopping this batch cleanly. Re-authenticate with "npm run research:login" and resume with the same command.`);
      }
    } catch (error: any) {
      if (outcomePersisted) {
        evidenceMismatch = true;
        results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status: 'EVIDENCE_WRITE_FAILED' });
        console.error(`[research] observation was persisted for ${claimed.deviceKey}, but local evidence could not be completed; stopping for review.`);
      } else {
        await research.releaseClaim(claimed.id, WORKER_ID);
        results.push({ deviceKey: claimed.deviceKey, profile: claimed.profile, status: 'RELEASED', reason: 'collector or persistence error; inspect locally' });
        console.error(`[research] collector or persistence error on ${claimed.deviceKey} (${claimed.profile}); claim released for retry.`);
      }
    }
    collected++;
    if (paceMs > 0 && collected < maxExperiments && collected < batchSize && !authRequiredHit) await sleep(paceMs);
  }

  await research.finishBatch(batch.id, `collected=${collected} authRequiredHit=${authRequiredHit}`);
  const progress = await research.getProgress({ brandFilter: brand, modelFilter: modelSub });

  console.log('\n=== CASHIFY RESEARCH BATCH SUMMARY ===');
  console.log(JSON.stringify({ batchId: batch.id, workerId: WORKER_ID, collected, authRequiredHit, results, progress }, null, 2));

  const out = arg('json');
  if (out) fs.writeFileSync(out, JSON.stringify({ batchId: batch.id, workerId: WORKER_ID, collected, authRequiredHit, results, progress }, null, 2));

  process.exitCode = evidenceMismatch ? 1 : authRequiredHit ? 2 : 0;
  await teardown();
}

async function teardown() {
  await disconnectReferencePriceRepository().catch(() => {});
  await getResearchStore()
    .disconnect()
    .catch(() => {});
}

main()
  .catch(() => {
    console.error('[research] batch failed; inspect local setup and research database availability');
    process.exitCode = 1;
  })
  .finally(() => {
    // Playwright/Prisma handles can keep the event loop alive briefly after
    // the work is done and the exit code is already set (see the identical
    // note in scripts/reference-pricing/refresh-questionnaire-profiles.ts).
    setTimeout(() => process.exit(), 2000).unref();
  });
