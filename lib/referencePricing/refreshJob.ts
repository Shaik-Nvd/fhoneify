/**
 * Orchestrates one full reference-price refresh run.
 *
 * Responsibilities, in order: take the lock, record that a run started, walk
 * the catalog against the source with bounded concurrency and a wall-clock
 * cap, build the report, record the result, release the lock. Everything it
 * needs is injected, so a test can run the exact production code path against
 * a temp store and a fake source with no browser, no database and no network.
 *
 * Safety properties this is responsible for:
 *  - a second concurrent run is refused, not queued into corruption (Phase 9);
 *  - the lock is heartbeated while working and always released, including on
 *    a crash path, and expires on its own if the process is killed outright;
 *  - a total failure is reported as FAILED and leaves every stored price
 *    untouched (Phase 6) - this function never deletes or zeroes anything;
 *  - a time-capped run reports the devices it never reached rather than
 *    counting them as failures.
 */
import { ReferencePriceRepository } from './store';
import { PriceSource, RefreshOptions, refreshCatalogWithControls } from './ingestion';
import { DeviceIdentity } from './types';
import {
  RefreshReport,
  RefreshRunRecorder,
  NULL_RUN_RECORDER,
  buildRefreshReport,
  formatRefreshReport,
} from './refreshRun';
import { AcquireResult, RefreshLock } from './refreshLock';

export interface RefreshJobParams {
  repo: ReferencePriceRepository;
  devices: DeviceIdentity[];
  source: PriceSource;
  trigger: string;
  /** Catalog rows that could not be refreshed at all, for the report. */
  skippedCatalogRows?: number;
  recorder?: RefreshRunRecorder;
  /** Returns whether the lock was taken. Omit to run without locking (only
   * appropriate for a test with its own isolated store). */
  acquireLock?: () => Promise<AcquireResult>;
  options?: RefreshOptions;
  /** Wall-clock budget. On expiry the run stops cleanly between devices and
   * reports PARTIAL - it never abandons a half-written device. */
  maxDurationMs?: number;
  /** How often to extend the lock while working. */
  heartbeatIntervalMs?: number;
  onProgress?: (done: number, total: number) => void;
  log?: (message: string) => void;
}

export interface RefreshJobResult {
  ran: boolean;
  /** Set when ran=false because another run holds the lock. */
  lockedBy?: string;
  report?: RefreshReport;
}

export async function runRefreshJob(params: RefreshJobParams): Promise<RefreshJobResult> {
  const log = params.log ?? ((m: string) => console.log(m));
  const recorder = params.recorder ?? NULL_RUN_RECORDER;
  const maxDurationMs = params.maxDurationMs ?? Number(process.env.REFRESH_MAX_DURATION_MS ?? 5 * 60 * 60 * 1000);
  const heartbeatIntervalMs = params.heartbeatIntervalMs ?? 60_000;

  let lock: RefreshLock | undefined;
  if (params.acquireLock) {
    const acquisition = await params.acquireLock();
    if (!acquisition.acquired) {
      const heldBy = `${acquisition.heldBy ?? 'unknown'} (until ${acquisition.heldUntil ?? 'unknown'})`;
      log(`[refresh] another refresh is already running - held by ${heldBy}. Exiting without touching any prices.`);
      return { ran: false, lockedBy: heldBy };
    }
    lock = acquisition.lock;
    log(`[refresh] lock acquired via ${lock?.backend} backend by ${lock?.holder}`);
  }

  const startedAt = new Date();
  const deadline = startedAt.getTime() + maxDurationMs;

  // Monitoring must never be able to break the refresh, and a throw here
  // (before the try/finally below) would otherwise leak the lock until TTL.
  let runId: string | null = null;
  try {
    runId = await recorder.start({ source: params.source.name, trigger: params.trigger, startedAt });
  } catch (err: any) {
    log(`[refresh] could not record run start (${err?.message ?? err}); continuing without run history.`);
  }

  let heartbeat: NodeJS.Timeout | undefined;
  if (lock) {
    heartbeat = setInterval(() => {
      lock!.heartbeat().catch((err) => log(`[refresh] lock heartbeat failed: ${err.message}`));
    }, heartbeatIntervalMs);
    // Do not keep the process alive purely for the heartbeat timer.
    heartbeat.unref?.();
  }

  let report: RefreshReport;

  try {
    const { outcomes, notAttempted, abortedReason } = await refreshCatalogWithControls(
      params.repo,
      params.devices,
      params.source,
      {
        ...params.options,
        shouldStop: () => Date.now() >= deadline,
        onProgress: (done, total) => params.onProgress?.(done, total),
      }
    );

    if (abortedReason) {
      log(`[refresh] run aborted: ${abortedReason}. Remaining devices keep their existing prices.`);
    } else if (notAttempted.length > 0) {
      log(
        `[refresh] wall-clock budget of ${Math.round(maxDurationMs / 60000)}m reached - ` +
          `${notAttempted.length} device(s) not attempted. They keep their existing prices.`
      );
    }

    report = buildRefreshReport({
      source: params.source.name,
      trigger: params.trigger,
      startedAt,
      finishedAt: new Date(),
      devicesDiscovered: params.devices.length,
      outcomes,
      notAttempted: notAttempted.length,
      skippedCatalogRows: params.skippedCatalogRows ?? 0,
      error: abortedReason,
    });
  } catch (err: any) {
    // A total failure. Nothing here writes to the store, so every previously
    // stored price is exactly as it was before this run started.
    report = buildRefreshReport({
      source: params.source.name,
      trigger: params.trigger,
      startedAt,
      finishedAt: new Date(),
      devicesDiscovered: params.devices.length,
      outcomes: [],
      notAttempted: params.devices.length,
      skippedCatalogRows: params.skippedCatalogRows ?? 0,
      error: err?.message ?? String(err),
    });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (lock) {
      await lock.release().catch((err) => log(`[refresh] lock release failed: ${err.message}`));
    }
  }

  // Print first: if recording fails, the report must still reach the CI log.
  log(formatRefreshReport(report));
  try {
    await recorder.finish(runId, report);
  } catch (err: any) {
    log(`[refresh] could not record run result (${err?.message ?? err}); the report above is still accurate.`);
  }

  return { ran: true, report };
}

/** Process exit code for a run: 0 for SUCCESS/PARTIAL, 1 for FAILED, 75 for
 * "another run holds the lock" (EX_TEMPFAIL - a retryable, non-error
 * condition, so a scheduler can tell it apart from a broken pipeline). */
export function exitCodeFor(result: RefreshJobResult): number {
  if (!result.ran) return 75;
  return result.report?.status === 'FAILED' ? 1 : 0;
}
