/**
 * Reading back refresh-run history, for the admin API and the status CLI.
 *
 * Reads from Postgres when there is a database, and from the JSON run log
 * otherwise, normalizing both into the same shape so callers never have to
 * care which backend recorded the run.
 */
export interface RefreshRunSummary {
  id: string;
  source: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  devicesDiscovered: number;
  updatedCount: number;
  unchangedCount: number;
  rejectedCount: number;
  failedCount: number;
  missingCount: number;
  flaggedCount: number;
  notAttemptedCount: number;
  error: string | null;
}

function fromPrismaRow(row: any): RefreshRunSummary {
  return {
    id: row.id,
    source: row.source,
    trigger: row.trigger,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    durationMs: row.durationMs ?? null,
    devicesDiscovered: row.devicesDiscovered,
    updatedCount: row.updatedCount,
    unchangedCount: row.unchangedCount,
    rejectedCount: row.rejectedCount,
    failedCount: row.failedCount,
    missingCount: row.missingCount,
    flaggedCount: row.flaggedCount,
    notAttemptedCount: row.notAttemptedCount,
    error: row.error ?? null,
  };
}

function fromFileRow(row: any): RefreshRunSummary {
  // The file recorder writes a RUNNING stub on start and the full report on
  // finish, so both shapes have to normalize cleanly.
  return {
    id: row.id,
    source: row.source ?? 'unknown',
    trigger: row.trigger ?? 'unknown',
    status: row.status ?? 'RUNNING',
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? null,
    durationMs: row.durationMs ?? null,
    devicesDiscovered: row.devicesDiscovered ?? 0,
    updatedCount: row.updated ?? 0,
    unchangedCount: row.unchanged ?? 0,
    rejectedCount: row.rejected ?? 0,
    failedCount: row.failed ?? 0,
    missingCount: row.missing ?? 0,
    flaggedCount: row.flagged ?? 0,
    notAttemptedCount: row.notAttempted ?? 0,
    error: row.error ?? null,
  };
}

export async function readRecentRuns(params: {
  limit?: number;
  prisma?: any;
  filePath?: string;
}): Promise<RefreshRunSummary[]> {
  const limit = params.limit ?? 10;

  if (params.prisma) {
    try {
      const rows = await params.prisma.referencePriceRefreshRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
      return rows.map(fromPrismaRow);
    } catch {
      // Table not pushed yet, or the database is unreachable. Fall through to
      // the file log rather than failing the whole status read - a missing
      // monitoring row must never look like a missing price.
    }
  }

  if (!params.filePath) return [];
  try {
    const fs = require('fs');
    const rows = JSON.parse(fs.readFileSync(params.filePath, 'utf8'));
    return rows
      .slice()
      .reverse()
      .slice(0, limit)
      .map(fromFileRow);
  } catch {
    return [];
  }
}

/** Reference-price records whose last accepted price moved far enough to have
 * been flagged, so an operator can review them without reading every history
 * row. Derived from the history notes the ingestion layer already writes. */
export async function listSuspiciousChanges(
  repo: { listAll(): Promise<any[]>; getHistory(key: string): Promise<any[]> },
  limit = 50
): Promise<{ deviceKey: string; price: number; recordedAt: string; note: string }[]> {
  const out: { deviceKey: string; price: number; recordedAt: string; note: string }[] = [];
  const records = await repo.listAll();

  for (const record of records) {
    if (out.length >= limit) break;
    const history = await repo.getHistory(record.deviceKey);
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (entry.note && entry.note.includes('flagged for review')) {
        out.push({
          deviceKey: record.deviceKey,
          price: entry.price,
          recordedAt: entry.recordedAt,
          note: entry.note,
        });
        break; // most recent flag per device is enough
      }
    }
  }

  return out;
}
