import type { ReferencePriceRepository } from './store';
import type { ReferencePriceRecord, ReferencePriceHistoryEntry } from './types';

/**
 * In-memory read cache in front of a ReferencePriceRepository.
 *
 * A quote's single `ReferencePrice.findUnique` round trip to Supabase was
 * measured at ~490-510ms, about 58% of the warm server time for
 * POST /api/quote/price. The whole table is roughly 2,200 small rows and the
 * refresh that writes it runs WEEKLY (.github/workflows/
 * reference-price-refresh.yml), so serving reads from memory costs a trivial
 * amount of heap and cannot be meaningfully staler than the data already is.
 *
 * What this deliberately does NOT do:
 *  - It does not change what a lookup returns. Records are handed back
 *    exactly as the underlying repository produced them, and freshness is
 *    still derived at read time by classifyFreshness() in the pricing engine,
 *    so `referenceStatus` and `referenceLastVerifiedAt` stay honest.
 *  - It does not cache writes. upsert/appendHistory go straight through and
 *    then update the cached copy, so an admin edit or a refresh run is
 *    visible immediately rather than after a TTL.
 *  - It never invents a price. If the preload fails, or a device is not in
 *    the loaded snapshot, the call falls through to the real repository.
 *
 * A negative result is not cached, so a device that has no row keeps asking
 * the database. That path already falls back to the bundled snapshot and is
 * rare, and caching it would hide a row appearing mid-refresh.
 */
export class CachedReferencePriceStore implements ReferencePriceRepository {
  private records = new Map<string, ReferencePriceRecord>();
  private loadedAt = 0;
  private loading: Promise<void> | null = null;

  constructor(
    private readonly inner: ReferencePriceRepository,
    private readonly ttlMs = Number(process.env.REFERENCE_PRICE_CACHE_TTL_MS ?? 15 * 60 * 1000)
  ) {}

  private isFresh(): boolean {
    return this.loadedAt > 0 && Date.now() - this.loadedAt < this.ttlMs;
  }

  /**
   * Loads the whole table into memory. Concurrent callers share one
   * in-flight load. Never throws: a failed preload leaves the cache empty
   * and every lookup simply goes to the database, which is exactly the
   * behaviour before this class existed.
   */
  async preload(): Promise<{ loaded: number; error?: string }> {
    if (this.loading) {
      await this.loading;
      return { loaded: this.records.size };
    }

    let error: string | undefined;
    this.loading = (async () => {
      try {
        const all = await this.inner.listAll();
        const next = new Map<string, ReferencePriceRecord>();
        for (const record of all) next.set(record.deviceKey, record);
        this.records = next;
        this.loadedAt = Date.now();
      } catch (err: any) {
        error = err?.message ?? String(err);
      }
    })();

    try {
      await this.loading;
    } finally {
      this.loading = null;
    }

    return { loaded: this.records.size, error };
  }

  async get(deviceKey: string): Promise<ReferencePriceRecord | null> {
    if (this.isFresh()) {
      const hit = this.records.get(deviceKey);
      if (hit) return hit;
      // Not in a fresh snapshot: could be a device with no row at all, so ask
      // the database rather than reporting "missing" from memory.
      return this.inner.get(deviceKey);
    }

    // Stale or never loaded. Serve this request from the database so nobody
    // waits for the refresh, and repopulate in the background.
    const direct = this.inner.get(deviceKey);
    if (!this.loading) void this.preload();
    return direct;
  }

  async upsert(record: ReferencePriceRecord): Promise<void> {
    await this.inner.upsert(record);
    // Keep the cached copy correct immediately; an admin edit or a refresh
    // run must not be hidden behind the TTL.
    if (this.loadedAt > 0) this.records.set(record.deviceKey, record);
  }

  listAll(): Promise<ReferencePriceRecord[]> {
    return this.inner.listAll();
  }

  appendHistory(deviceKey: string, entry: ReferencePriceHistoryEntry): Promise<void> {
    return this.inner.appendHistory(deviceKey, entry);
  }

  getHistory(deviceKey: string): Promise<ReferencePriceHistoryEntry[]> {
    return this.inner.getHistory(deviceKey);
  }

  /** Reporting only - used by the health endpoint. */
  stats(): { size: number; loadedAt: string | null; fresh: boolean } {
    return {
      size: this.records.size,
      loadedAt: this.loadedAt ? new Date(this.loadedAt).toISOString() : null,
      fresh: this.isFresh(),
    };
  }
}
