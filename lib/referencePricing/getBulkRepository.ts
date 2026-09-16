import { ReferencePriceRepository, FileReferencePriceStore, BufferedReferencePriceStore } from './store';
import { getReferencePriceRepository } from './getStore';

export interface BulkRepository extends ReferencePriceRepository {
  /** No-op for Postgres (every write is already durable); flushes the
   * in-memory buffer to disk for the file-backed fallback. Bulk scripts
   * should always call this when done (and in a finally block), so the
   * same script works correctly against either backing. */
  flush(): void;
}

/**
 * For the one-time/bulk scripts (migration, brand-snapshot import): uses
 * the real authoritative repository (Postgres, when DATABASE_URL is
 * configured) directly - Postgres handles concurrent upserts natively, no
 * local buffering needed or possible. Falls back to a buffered file store
 * (see store.ts's documented O(n^2)-avoidance rationale) only when Postgres
 * isn't available, so these scripts remain fast either way.
 */
export function getBulkRepository(): BulkRepository {
  const repo = getReferencePriceRepository();
  if (repo instanceof FileReferencePriceStore) {
    const buffered = new BufferedReferencePriceStore(repo);
    return buffered;
  }
  // Postgres (or any other non-file repository): every write already
  // durable, flush is a no-op.
  return Object.assign(repo, { flush: () => {} }) as BulkRepository;
}
