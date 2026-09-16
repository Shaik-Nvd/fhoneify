/**
 * The refresh RUN: its report shape, how outcomes are classified into counts,
 * how the report is rendered, and where the run is recorded for monitoring.
 *
 * Kept separate from refreshJob.ts (which orchestrates) so the classification
 * rules - the part that decides whether a device counts as "updated",
 * "unchanged", "rejected", "failed" or "missing" - are pure functions that can
 * be tested directly against hand-built outcomes.
 */
import { IngestOutcome } from './types';

export type RefreshRunStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type OutcomeClass = 'updated' | 'unchanged' | 'rejected' | 'failed' | 'missing';

export interface RefreshReport {
  source: string;
  trigger: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  devicesDiscovered: number;
  updated: number;
  unchanged: number;
  rejected: number;
  failed: number;
  missing: number;
  /** Accepted, but with a price swing large enough to want a human look.
   * A subset of `updated`, not a separate bucket. */
  flagged: number;
  /** Devices never attempted (time cap / abort). They kept their prices. */
  notAttempted: number;
  /** Catalog rows that could not be refreshed at all (incomplete identity). */
  skippedCatalogRows: number;
  status: RefreshRunStatus;
  /** Set when the whole run failed before/while processing devices. */
  error?: string;
  /** Up to a bounded number of examples per problem class, for the log. */
  samples: {
    updated: { deviceKey: string; from?: number; to?: number }[];
    flagged: { deviceKey: string; from?: number; to?: number; reason?: string }[];
    rejected: { deviceKey: string; reason?: string }[];
    failed: { deviceKey: string; reason?: string; pricePreserved: boolean }[];
    missing: { deviceKey: string; reason?: string }[];
  };
}

const SAMPLE_LIMIT = 10;

/**
 * Classifies one device's outcome.
 *
 * The distinction that matters most here is `failed` vs `missing`: both mean
 * "we did not get a price today", but `failed` means a previously-valid price
 * is still sitting in the database untouched (Phase 6's guarantee), while
 * `missing` means this device has never had one. Collapsing them would make a
 * healthy run that preserved 40 prices look identical to one that has 40
 * devices with no data at all.
 */
export function classifyOutcome(outcome: IngestOutcome): OutcomeClass {
  if (outcome.accepted) {
    const changed =
      outcome.previousPrice === undefined || outcome.previousPrice !== outcome.newPrice;
    return changed ? 'updated' : 'unchanged';
  }

  // Our own storage failed; we cannot claim the device has no price.
  if (outcome.infrastructureError) return 'failed';

  const reason = outcome.reason ?? '';
  const wasRejected = reason.startsWith('rejected:') || reason.startsWith('rejected by source');

  if (outcome.preservedPreviousPrice) {
    // A rejection that preserved a good price is still a rejection - the
    // operator needs to know the data was bad, not merely unreachable.
    return wasRejected ? 'rejected' : 'failed';
  }

  // No previous price survived, so this device currently has nothing.
  return 'missing';
}

export function buildRefreshReport(params: {
  source: string;
  trigger: string;
  startedAt: Date;
  finishedAt: Date;
  devicesDiscovered: number;
  outcomes: IngestOutcome[];
  notAttempted: number;
  skippedCatalogRows: number;
  error?: string;
}): RefreshReport {
  const report: RefreshReport = {
    source: params.source,
    trigger: params.trigger,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs: params.finishedAt.getTime() - params.startedAt.getTime(),
    devicesDiscovered: params.devicesDiscovered,
    updated: 0,
    unchanged: 0,
    rejected: 0,
    failed: 0,
    missing: 0,
    flagged: 0,
    notAttempted: params.notAttempted,
    skippedCatalogRows: params.skippedCatalogRows,
    status: 'SUCCESS',
    error: params.error,
    samples: { updated: [], flagged: [], rejected: [], failed: [], missing: [] },
  };

  for (const outcome of params.outcomes) {
    const cls = classifyOutcome(outcome);
    report[cls]++;

    if (outcome.flagged) {
      report.flagged++;
      if (report.samples.flagged.length < SAMPLE_LIMIT) {
        report.samples.flagged.push({
          deviceKey: outcome.deviceKey,
          from: outcome.previousPrice,
          to: outcome.newPrice,
          reason: outcome.reason,
        });
      }
    }

    if (cls === 'updated' && report.samples.updated.length < SAMPLE_LIMIT) {
      report.samples.updated.push({ deviceKey: outcome.deviceKey, from: outcome.previousPrice, to: outcome.newPrice });
    } else if (cls === 'rejected' && report.samples.rejected.length < SAMPLE_LIMIT) {
      report.samples.rejected.push({ deviceKey: outcome.deviceKey, reason: outcome.reason });
    } else if (cls === 'failed' && report.samples.failed.length < SAMPLE_LIMIT) {
      report.samples.failed.push({
        deviceKey: outcome.deviceKey,
        reason: outcome.reason,
        pricePreserved: !!outcome.preservedPreviousPrice,
      });
    } else if (cls === 'missing' && report.samples.missing.length < SAMPLE_LIMIT) {
      report.samples.missing.push({ deviceKey: outcome.deviceKey, reason: outcome.reason });
    }
  }

  report.status = decideStatus(report);
  return report;
}

/**
 * SUCCESS / PARTIAL / FAILED.
 *
 * A run is only FAILED if it blew up outright or got essentially nothing -
 * that is the signal "the pipeline is broken, go look". Individual device
 * failures make a run PARTIAL, not FAILED, because the system is behaving
 * correctly in that case: bad data was refused and good data was preserved.
 */
export function decideStatus(
  report: Pick<RefreshReport, 'error' | 'updated' | 'unchanged' | 'rejected' | 'failed' | 'missing' | 'notAttempted' | 'devicesDiscovered'>
): RefreshRunStatus {
  if (report.error) return 'FAILED';

  const succeeded = report.updated + report.unchanged;
  const attempted = succeeded + report.rejected + report.failed + report.missing;

  if (attempted === 0) return 'FAILED';
  if (succeeded === 0) return 'FAILED';

  const problems = report.rejected + report.failed + report.missing + report.notAttempted;
  return problems > 0 ? 'PARTIAL' : 'SUCCESS';
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
}

export function formatRefreshReport(report: RefreshReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('========================================');
  lines.push('FHONEIFY CASHIFY REFRESH');
  lines.push('========================================');
  lines.push(`Source:    ${report.source}`);
  lines.push(`Trigger:   ${report.trigger}`);
  lines.push(`Started:   ${report.startedAt}`);
  lines.push(`Finished:  ${report.finishedAt}`);
  lines.push(`Duration:  ${formatDuration(report.durationMs)}`);
  lines.push('');
  lines.push(`Devices discovered: ${report.devicesDiscovered}`);
  lines.push(`Updated:            ${report.updated}`);
  lines.push(`Unchanged:          ${report.unchanged}`);
  lines.push(`Rejected:           ${report.rejected}`);
  lines.push(`Failed:             ${report.failed}`);
  lines.push(`Missing:            ${report.missing}`);
  lines.push(`Flagged for review: ${report.flagged}`);
  if (report.notAttempted) lines.push(`Not attempted:      ${report.notAttempted}`);
  if (report.skippedCatalogRows) lines.push(`Catalog rows skipped: ${report.skippedCatalogRows}`);
  lines.push('');
  lines.push(`Status: ${report.status}`);
  if (report.error) lines.push(`Error:  ${report.error}`);

  const section = (title: string, rows: string[]) => {
    if (rows.length === 0) return;
    lines.push('');
    lines.push(`--- ${title} ---`);
    for (const row of rows) lines.push(`  ${row}`);
  };

  section(
    `Sample updates (${Math.min(report.samples.updated.length, SAMPLE_LIMIT)} of ${report.updated})`,
    report.samples.updated.map((s) => `${s.deviceKey}: ${s.from ?? 'none'} -> ${s.to}`)
  );
  section(
    `Flagged: large price movement, ACCEPTED but worth review (${report.flagged})`,
    report.samples.flagged.map((s) => `${s.deviceKey}: ${s.from} -> ${s.to} :: ${s.reason ?? ''}`)
  );
  section(
    `Rejected: bad data refused, previous price PRESERVED (${report.rejected})`,
    report.samples.rejected.map((s) => `${s.deviceKey}: ${s.reason ?? ''}`)
  );
  section(
    `Failed: unreachable, previous price PRESERVED (${report.failed})`,
    report.samples.failed.map((s) => `${s.deviceKey}: ${s.reason ?? ''}`)
  );
  section(
    `Missing: no price today and none previously stored (${report.missing})`,
    report.samples.missing.map((s) => `${s.deviceKey}: ${s.reason ?? ''}`)
  );

  lines.push('');
  lines.push('========================================');
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Where a run gets recorded (Phase 13 monitoring)
// ---------------------------------------------------------------------------

export interface RefreshRunRecorder {
  /** Records that a run has begun; returns an opaque id for finish(). */
  start(params: { source: string; trigger: string; startedAt: Date }): Promise<string | null>;
  finish(id: string | null, report: RefreshReport): Promise<void>;
  describe(): string;
}

/** Records runs in Postgres via the ReferencePriceRefreshRun model. Degrades
 * to a warning (never a failed refresh) if the table has not been pushed yet -
 * losing the monitoring row is bad, but failing the whole price refresh
 * because of it would be worse. */
export function createPrismaRunRecorder(prisma: any): RefreshRunRecorder {
  let degraded = false;
  const warn = (err: any) => {
    if (!degraded) {
      degraded = true;
      console.warn(
        `[refresh] could not record run metadata in Postgres (${err?.message}). ` +
          'The price refresh itself is unaffected. Run `npx prisma db push` to create ' +
          'the ReferencePriceRefreshRun table.'
      );
    }
  };

  return {
    describe: () => 'postgres(ReferencePriceRefreshRun)',
    async start({ source, trigger, startedAt }) {
      try {
        const row = await prisma.referencePriceRefreshRun.create({
          data: { source, trigger, status: 'RUNNING', startedAt },
        });
        return row.id;
      } catch (err) {
        warn(err);
        return null;
      }
    },
    async finish(id, report) {
      if (!id) return;
      try {
        await prisma.referencePriceRefreshRun.update({
          where: { id },
          data: {
            status: report.status,
            finishedAt: new Date(report.finishedAt),
            durationMs: report.durationMs,
            devicesDiscovered: report.devicesDiscovered,
            updatedCount: report.updated,
            unchangedCount: report.unchanged,
            rejectedCount: report.rejected,
            failedCount: report.failed,
            missingCount: report.missing,
            flaggedCount: report.flagged,
            notAttemptedCount: report.notAttempted,
            error: report.error ?? null,
            report: formatRefreshReport(report),
          },
        });
      } catch (err) {
        warn(err);
      }
    },
  };
}

/** Appends runs to a JSON file. Used when there is no database, so local runs
 * still have the same operational history the deployed system has. */
export function createFileRunRecorder(filePath: string): RefreshRunRecorder {
  // Imported lazily so the browser-free lib surface stays importable in any
  // environment that does not need file recording.
  const fs = require('fs');
  const path = require('path');

  const readAll = (): any[] => {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  };
  const writeAll = (rows: any[]) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
  };

  return {
    describe: () => `file(${filePath})`,
    async start({ source, trigger, startedAt }) {
      const id = `run-${startedAt.getTime()}-${process.pid}`;
      const rows = readAll();
      rows.push({ id, source, trigger, status: 'RUNNING', startedAt: startedAt.toISOString() });
      // Bounded history: the last 200 runs is ~4 years of weekly runs.
      writeAll(rows.slice(-200));
      return id;
    },
    async finish(id, report) {
      if (!id) return;
      const rows = readAll();
      const index = rows.findIndex((r) => r.id === id);
      const record = { id, ...report, reportText: formatRefreshReport(report) };
      if (index >= 0) rows[index] = record;
      else rows.push(record);
      writeAll(rows.slice(-200));
    },
  };
}

export const NULL_RUN_RECORDER: RefreshRunRecorder = {
  describe: () => 'none',
  async start() {
    return null;
  },
  async finish() {},
};
