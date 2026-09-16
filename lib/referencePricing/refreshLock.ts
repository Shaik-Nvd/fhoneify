/**
 * Mutual exclusion for the reference-price refresh (Phase 9).
 *
 * Two refreshes running at once is not hypothetical: a scheduler can retry, a
 * human can hit "Run workflow" during the weekly run, and a re-run of a
 * "stuck" job can start while the original is still alive. Concurrent runs
 * would interleave read-modify-write on the same device records.
 *
 * The lock is a single row keyed by name, acquired with a CONDITIONAL update
 * (`updateMany where expiresAt < now`), which Postgres evaluates atomically -
 * so of two racing acquirers exactly one sees rowCount 1 and wins. It carries
 * a TTL, so a runner that is killed mid-run (CI timeout, OOM) cannot wedge
 * the pipeline forever; and it is heartbeated while held, so a long but
 * healthy run never has its lock stolen.
 *
 * When there is no database (local file-store mode), the equivalent guarantee
 * is provided by an exclusive-create lock file, which is atomic on every
 * platform's filesystem.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

export const REFRESH_LOCK_NAME = 'reference-price-refresh';

export interface RefreshLock {
  /** Extends the lock's expiry. Called periodically while the run works. */
  heartbeat(): Promise<void>;
  release(): Promise<void>;
  holder: string;
  backend: 'postgres' | 'file';
}

export interface AcquireResult {
  acquired: boolean;
  lock?: RefreshLock;
  /** Set when acquired=false: who currently holds it and until when. */
  heldBy?: string;
  heldUntil?: string;
}

export function makeHolderId(trigger: string): string {
  return `${os.hostname()}/pid-${process.pid}/${trigger}/${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

export async function acquirePostgresLock(
  prisma: any,
  params: { holder: string; ttlMs: number; name?: string }
): Promise<AcquireResult> {
  const name = params.name ?? REFRESH_LOCK_NAME;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlMs);

  // Conditional update: succeeds only if the existing lock has expired.
  // updateMany returns a count, so the winner is decided by the database, not
  // by a read-then-write race in application code.
  const takeover = await prisma.referencePriceRefreshLock.updateMany({
    where: { name, expiresAt: { lt: now } },
    data: { holder: params.holder, acquiredAt: now, expiresAt },
  });

  if (takeover.count === 0) {
    // Either the row does not exist yet (first ever run) or it is held.
    try {
      await prisma.referencePriceRefreshLock.create({
        data: { name, holder: params.holder, acquiredAt: now, expiresAt },
      });
    } catch {
      // Unique violation on the primary key => someone else holds it.
      const current = await prisma.referencePriceRefreshLock.findUnique({ where: { name } });
      return {
        acquired: false,
        heldBy: current?.holder,
        heldUntil: current?.expiresAt?.toISOString(),
      };
    }
  }

  return {
    acquired: true,
    lock: {
      holder: params.holder,
      backend: 'postgres',
      async heartbeat() {
        await prisma.referencePriceRefreshLock.updateMany({
          where: { name, holder: params.holder },
          data: { expiresAt: new Date(Date.now() + params.ttlMs) },
        });
      },
      async release() {
        // Scoped to this holder: a run whose lock already expired and was
        // taken over must not delete the new holder's lock on its way out.
        await prisma.referencePriceRefreshLock.deleteMany({ where: { name, holder: params.holder } });
      },
    },
  };
}

// ---------------------------------------------------------------------------
// File (no-database fallback)
// ---------------------------------------------------------------------------

interface FileLockPayload {
  holder: string;
  expiresAt: string;
}

export async function acquireFileLock(params: {
  holder: string;
  ttlMs: number;
  lockPath?: string;
}): Promise<AcquireResult> {
  const lockPath =
    params.lockPath ?? path.join(process.cwd(), 'server', 'data', 'reference-prices', '.refresh.lock');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  const write = () => {
    const payload: FileLockPayload = {
      holder: params.holder,
      expiresAt: new Date(Date.now() + params.ttlMs).toISOString(),
    };
    // wx = create-exclusive: fails if the file already exists. This is the
    // atomic primitive; nothing here is a check-then-act race.
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, JSON.stringify(payload), 'utf8');
    fs.closeSync(fd);
  };

  try {
    write();
  } catch {
    // Exists. Take it over only if it has genuinely expired.
    let existing: FileLockPayload | null = null;
    try {
      existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch {
      existing = null;
    }
    const expired = !existing || new Date(existing.expiresAt).getTime() < Date.now();
    if (!expired) {
      return { acquired: false, heldBy: existing!.holder, heldUntil: existing!.expiresAt };
    }
    fs.rmSync(lockPath, { force: true });
    try {
      write();
    } catch {
      return { acquired: false, heldBy: existing?.holder, heldUntil: existing?.expiresAt };
    }
  }

  return {
    acquired: true,
    lock: {
      holder: params.holder,
      backend: 'file',
      async heartbeat() {
        const payload: FileLockPayload = {
          holder: params.holder,
          expiresAt: new Date(Date.now() + params.ttlMs).toISOString(),
        };
        fs.writeFileSync(lockPath, JSON.stringify(payload), 'utf8');
      },
      async release() {
        try {
          const current: FileLockPayload = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (current.holder !== params.holder) return; // taken over; not ours to delete
        } catch {
          return;
        }
        fs.rmSync(lockPath, { force: true });
      },
    },
  };
}
