/**
 * THE weekly job. Refreshes every catalog device's reference price from
 * Cashify using the team's existing scraper, then exits with a status code.
 *
 * This is what the scheduled GitHub Actions workflow runs
 * (.github/workflows/reference-price-refresh.yml). It is fully
 * non-interactive: no prompts, no visible browser, no manual price editing.
 *
 *   npm run reference-prices:refresh-cashify
 *   npm run reference-prices:refresh-cashify -- --limit 5 --dry-run
 *   npm run reference-prices:refresh-cashify -- --device "Oppo|OPPO Find X9s|12 GB/512 GB"
 *
 * Exit codes:
 *   0  SUCCESS or PARTIAL (prices are in a good state)
 *   1  FAILED (the pipeline is broken - every existing price was preserved)
 *   75 another refresh already holds the lock (retryable, not an error)
 */
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

import { loadRefreshCatalog, buildCashifyLinkIndex } from '../../lib/referencePricing/catalog';
import { getReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { deviceKey, DeviceIdentity } from '../../lib/referencePricing/types';
import { createCashifyPriceSource } from '../../lib/referencePricing/sources/cashifySource';
import { runRefreshJob, exitCodeFor } from '../../lib/referencePricing/refreshJob';
import {
  createPrismaRunRecorder,
  createFileRunRecorder,
  RefreshRunRecorder,
} from '../../lib/referencePricing/refreshRun';
import {
  acquireFileLock,
  acquirePostgresLock,
  makeHolderId,
  REFRESH_LOCK_NAME,
} from '../../lib/referencePricing/refreshLock';
import { scrapeCashifyReferenceSnapshot } from '../../server/modules/quote/cashifyReferenceSnapshot';
import { closeCashifyBrowser } from '../../server/modules/quote/cashifyScraper';
import { ReferencePriceRepository } from '../../lib/referencePricing/store';
import { ReferencePriceRecord, ReferencePriceHistoryEntry } from '../../lib/referencePricing/types';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

interface Args {
  limit?: number;
  brand?: string;
  device?: string;
  dryRun: boolean;
  trigger: string;
  concurrency: number;
  maxRetries: number;
  maxDurationMinutes: number;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    limit: get('--limit') ? Number(get('--limit')) : undefined,
    brand: get('--brand'),
    device: get('--device'),
    dryRun: argv.includes('--dry-run'),
    trigger: get('--trigger') ?? process.env.REFRESH_TRIGGER ?? 'cli',
    concurrency: Number(get('--concurrency') ?? process.env.REFRESH_CONCURRENCY ?? 3),
    maxRetries: Number(get('--max-retries') ?? process.env.REFRESH_MAX_RETRIES ?? 2),
    maxDurationMinutes: Number(
      get('--max-minutes') ?? process.env.REFRESH_MAX_DURATION_MINUTES ?? 300
    ),
  };
}

// ---------------------------------------------------------------------------
// CI session material
// ---------------------------------------------------------------------------

/**
 * Materializes a Cashify session from the CASHIFY_SESSION_STATE secret so CI
 * never needs a session file committed to the repository.
 *
 * The value is a base64-encoded Playwright storageState JSON. Nothing about
 * it is ever logged - not its length, not a prefix, not a parse error that
 * might echo its contents.
 */
function materializeSessionFromEnv(): boolean {
  const encoded = process.env.CASHIFY_SESSION_STATE;
  if (!encoded) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
    JSON.parse(decoded); // validate shape only; never print the result
  } catch {
    throw new Error(
      'CASHIFY_SESSION_STATE is set but is not valid base64-encoded JSON. ' +
        'Re-generate it with: base64 -w0 cashify-sessions/<session>.json'
    );
  }

  const dir = path.join(process.cwd(), 'cashify-sessions');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'ci-session.json');
  fs.writeFileSync(target, decoded, { encoding: 'utf8', mode: 0o600 });
  console.log('[refresh] Cashify session materialized from CASHIFY_SESSION_STATE (contents not logged).');
  return true;
}

// ---------------------------------------------------------------------------
// Dry-run repository wrapper
// ---------------------------------------------------------------------------

/** Reads through to the real repository but discards every write, so
 * `--dry-run` exercises the complete real code path (matching, validation,
 * swing detection against the REAL previous prices) without changing data. */
function makeDryRunRepository(inner: ReferencePriceRepository): ReferencePriceRepository {
  return {
    get: (key) => inner.get(key),
    listAll: () => inner.listAll(),
    getHistory: (key) => inner.getHistory(key),
    async upsert(_record: ReferencePriceRecord) {
      /* discarded */
    },
    async appendHistory(_key: string, _entry: ReferencePriceHistoryEntry) {
      /* discarded */
    },
  };
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const hadEnvSession = materializeSessionFromEnv();
  if (!hadEnvSession) {
    console.log('[refresh] No CASHIFY_SESSION_STATE set; using session files already on disk.');
  }

  // --- catalog -------------------------------------------------------------
  const catalog = loadRefreshCatalog();
  let entries = catalog.entries;

  if (args.brand) {
    const wanted = args.brand.toLowerCase();
    entries = entries.filter((e) => e.device.brand.toLowerCase() === wanted);
  }
  if (args.device) {
    const [brand, model, storage] = args.device.split('|');
    const wantedKey = deviceKey({ brand: brand ?? '', model: model ?? '', storage: storage ?? '' });
    entries = entries.filter((e) => deviceKey(e.device) === wantedKey);
    if (entries.length === 0) {
      console.error(`[refresh] --device "${args.device}" matched no catalog entry. Nothing to do.`);
      process.exit(1);
    }
  }
  if (args.limit && args.limit > 0) entries = entries.slice(0, args.limit);

  console.log(
    `[refresh] catalog: ${catalog.entries.length} refreshable device(s) ` +
      `(${catalog.skipped.length} skipped, ${catalog.duplicates} duplicate key(s) collapsed); ` +
      `this run will process ${entries.length}.`
  );
  for (const skip of catalog.skipped) {
    console.warn(`[refresh] skipped catalog row ${skip.seedId ?? '(no id)'}: ${skip.reason}`);
  }

  const linkIndex = buildCashifyLinkIndex(catalog.entries);
  const devices: DeviceIdentity[] = entries.map((e) => e.device);

  // --- wiring --------------------------------------------------------------
  const realRepo = getReferencePriceRepository();
  const repo = args.dryRun ? makeDryRunRepository(realRepo) : realRepo;
  if (args.dryRun) console.log('[refresh] DRY RUN - every write is discarded.');

  const source = createCashifyPriceSource({
    fetchSnapshot: (device, url) => scrapeCashifyReferenceSnapshot(device, url),
    resolveUrl: (device) => linkIndex.get(deviceKey(device)),
  });

  let prisma: any = null;
  let recorder: RefreshRunRecorder;
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
      recorder = createPrismaRunRecorder(prisma);
    } catch (err: any) {
      console.warn(`[refresh] Prisma unavailable (${err.message}); recording runs to file instead.`);
      recorder = createFileRunRecorder(
        path.join(process.cwd(), 'server', 'data', 'reference-prices', 'refresh-runs.json')
      );
    }
  } else {
    recorder = createFileRunRecorder(
      path.join(process.cwd(), 'server', 'data', 'reference-prices', 'refresh-runs.json')
    );
  }
  console.log(`[refresh] run history: ${recorder.describe()}`);

  const holder = makeHolderId(args.trigger);
  // TTL comfortably exceeds the heartbeat interval so a healthy long run is
  // never overtaken, while a killed run frees the lock within the TTL.
  const lockTtlMs = 15 * 60 * 1000;
  const acquireLock = async () => {
    if (prisma) {
      try {
        return await acquirePostgresLock(prisma, { holder, ttlMs: lockTtlMs, name: REFRESH_LOCK_NAME });
      } catch (err: any) {
        console.warn(
          `[refresh] Postgres lock unavailable (${err.message}); falling back to the file lock. ` +
            'Run `npx prisma db push` to create the ReferencePriceRefreshLock table.'
        );
      }
    }
    return acquireFileLock({ holder, ttlMs: lockTtlMs });
  };

  // --- run -----------------------------------------------------------------
  let lastLogged = 0;
  const result = await runRefreshJob({
    repo,
    devices,
    source,
    trigger: args.trigger,
    skippedCatalogRows: catalog.skipped.length,
    recorder,
    acquireLock,
    maxDurationMs: args.maxDurationMinutes * 60 * 1000,
    options: { concurrency: args.concurrency, maxRetries: args.maxRetries, retryDelayMs: 1500 },
    onProgress: (done, total) => {
      // One line per 25 devices: enough to see progress in a CI log without
      // producing thousands of lines.
      if (done - lastLogged >= 25 || done === total) {
        lastLogged = done;
        console.log(`[refresh] ${done}/${total} devices processed`);
      }
    },
  });

  await closeCashifyBrowser();
  if (prisma) await prisma.$disconnect().catch(() => {});

  process.exit(exitCodeFor(result));
}

main().catch(async (err) => {
  // Reaching here means the run could not even start (bad session secret,
  // unreadable catalog). No prices were touched.
  console.error(`[refresh] fatal: ${err.message}`);
  await closeCashifyBrowser().catch(() => {});
  process.exit(1);
});
