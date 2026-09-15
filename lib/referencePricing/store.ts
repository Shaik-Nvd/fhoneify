import fs from 'fs';
import path from 'path';
import { ReferencePriceRecord, ReferencePriceHistoryEntry } from './types';

/**
 * Repository interface for reference-price storage. Every consumer in this
 * codebase (matching, ingestion, admin reporting, the export step that
 * regenerates cashify_prices.json) depends on THIS interface, never on the
 * file-store implementation directly - so swapping to the Postgres-backed
 * implementation once DATABASE_URL exists (see the ReferencePrice /
 * ReferencePriceHistory models in prisma/schema.prisma) is a one-file
 * change, not a rewrite of everything that uses reference prices.
 */
export interface ReferencePriceRepository {
  get(deviceKey: string): Promise<ReferencePriceRecord | null>;
  upsert(record: ReferencePriceRecord): Promise<void>;
  listAll(): Promise<ReferencePriceRecord[]>;
  appendHistory(deviceKey: string, entry: ReferencePriceHistoryEntry): Promise<void>;
  getHistory(deviceKey: string): Promise<ReferencePriceHistoryEntry[]>;
}

interface StoreFileShape {
  version: 1;
  records: Record<string, ReferencePriceRecord>;
  history: Record<string, ReferencePriceHistoryEntry[]>;
}

const EMPTY_STORE: StoreFileShape = { version: 1, records: {}, history: {} };

/**
 * Durable, file-backed implementation.
 *
 * HONEST LIMITATION (do not remove this comment when this is eventually
 * replaced - it explains why): this survives process restarts/crashes on
 * the SAME running container, because writes are flushed to disk with an
 * atomic write-then-rename (never a partial/corrupt file, even if the
 * process dies mid-write). It does NOT survive a Render redeploy unless
 * this file is committed into the repo (Render's free tier gives an
 * ephemeral filesystem per deployed image), and it does NOT provide
 * cross-instance consistency if the app ever runs more than one backend
 * instance simultaneously - two instances writing to their own local copy
 * of this file would silently diverge. Both of those are exactly the
 * properties real Postgres persistence provides and this interim store
 * does not. This store is the correct backing for: local development, CI
 * test runs, and a single-instance deployment where the file is
 * re-committed after each refresh run - it is NOT a substitute for the
 * Phase 2 Postgres migration for a scaled, multi-instance production
 * deployment. See PRICING_REFERENCE_DATA_ARCHITECTURE.md.
 */
export class FileReferencePriceStore implements ReferencePriceRepository {
  private filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(process.cwd(), 'server', 'data', 'reference-prices', 'store.json');
  }

  private readSync(): StoreFileShape {
    if (!fs.existsSync(this.filePath)) return structuredClone(EMPTY_STORE);
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 1) throw new Error('unsupported store file version');
      return parsed;
    } catch (err: any) {
      // A corrupt store file must never silently look like "everything is
      // missing", which would make every device appear to need a fresh
      // refresh and could mask real data loss. Fail loudly instead.
      throw new Error(`Reference price store file is corrupt or unreadable at ${this.filePath}: ${err.message}`);
    }
  }

  private writeSync(data: StoreFileShape): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Atomic write: write to a temp file in the same directory, then
    // rename over the real file. A crash mid-write leaves either the old
    // file intact or the new file fully written - never a half-written
    // truncated JSON file that would corrupt the whole store.
    const tmpPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.filePath);
  }

  /** Serializes writes within this process so concurrent refresh calls
   * (e.g. a batch job processing several devices "in parallel") can't
   * interleave a read-modify-write and lose an update. This does NOT
   * protect against a second OS process/container instance writing to the
   * same file concurrently - see the class-level limitation note. */
  private async withWriteLock<T>(fn: (data: StoreFileShape) => T): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(() => {
      const data = this.readSync();
      result = fn(data);
      this.writeSync(data);
    });
    await this.writeQueue;
    return result;
  }

  async get(deviceKey: string): Promise<ReferencePriceRecord | null> {
    const data = this.readSync();
    return data.records[deviceKey] ?? null;
  }

  async upsert(record: ReferencePriceRecord): Promise<void> {
    await this.withWriteLock((data) => {
      data.records[record.deviceKey] = record;
    });
  }

  async listAll(): Promise<ReferencePriceRecord[]> {
    const data = this.readSync();
    return Object.values(data.records);
  }

  async appendHistory(deviceKey: string, entry: ReferencePriceHistoryEntry): Promise<void> {
    await this.withWriteLock((data) => {
      if (!data.history[deviceKey]) data.history[deviceKey] = [];
      data.history[deviceKey].push(entry);
    });
  }

  async getHistory(deviceKey: string): Promise<ReferencePriceHistoryEntry[]> {
    const data = this.readSync();
    return data.history[deviceKey] ?? [];
  }
}

let defaultStore: FileReferencePriceStore | null = null;
export function getDefaultReferencePriceStore(): FileReferencePriceStore {
  if (!defaultStore) defaultStore = new FileReferencePriceStore();
  return defaultStore;
}

/**
 * A buffered wrapper for BULK operations only (migrations, catalog-wide
 * imports). FileReferencePriceStore does one full read-parse and one full
 * write-serialize PER CALL, which is the right tradeoff for a single admin
 * submission (immediately durable, safe to call rarely) but is O(n) work
 * per device for a job touching thousands of devices - O(n^2) overall for
 * a full-catalog run, which is what made the brand-snapshot importer hang.
 *
 * This wrapper loads the file ONCE, serves every get/upsert/appendHistory
 * purely from an in-memory copy, and only touches disk once - on an
 * explicit flush() call. This trades "each write is immediately durable"
 * (fine for a rare admin action) for "the whole batch is durable once it
 * completes" (fine, and necessary, for a several-thousand-record import) -
 * it does NOT change any of the correctness guarantees (idempotency,
 * never-destroy-on-failure, atomic file write), only when the disk write
 * happens. Always call flush() when done, including on error paths where
 * partial progress should still be saved (see the importer scripts for the
 * pattern: wrap the loop in try/finally with flush() in finally).
 */
export class BufferedReferencePriceStore implements ReferencePriceRepository {
  private data: StoreFileShape;
  private backing: FileReferencePriceStore;

  constructor(backing: FileReferencePriceStore) {
    this.backing = backing;
    this.data = (backing as any).readSync();
  }

  async get(deviceKey: string): Promise<ReferencePriceRecord | null> {
    return this.data.records[deviceKey] ?? null;
  }

  async upsert(record: ReferencePriceRecord): Promise<void> {
    this.data.records[record.deviceKey] = record;
  }

  async listAll(): Promise<ReferencePriceRecord[]> {
    return Object.values(this.data.records);
  }

  async appendHistory(deviceKey: string, entry: ReferencePriceHistoryEntry): Promise<void> {
    if (!this.data.history[deviceKey]) this.data.history[deviceKey] = [];
    this.data.history[deviceKey].push(entry);
  }

  async getHistory(deviceKey: string): Promise<ReferencePriceHistoryEntry[]> {
    return this.data.history[deviceKey] ?? [];
  }

  /** Persists the in-memory buffer to disk in one atomic write. Safe to
   * call multiple times (e.g. periodically during a very long batch, to
   * bound how much work a crash could lose). */
  flush(): void {
    (this.backing as any).writeSync(this.data);
  }
}
