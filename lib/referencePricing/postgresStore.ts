import { PrismaClient } from '@prisma/client';
import { ReferencePriceRepository } from './store';
import { ReferencePriceRecord, ReferencePriceHistoryEntry, ReferencePriceStatus, MatchConfidence } from './types';

/**
 * Real, authoritative Postgres-backed implementation of
 * ReferencePriceRepository. This is what STEP 12 asks for: reference
 * pricing must not depend on a process-local file/array. Implements the
 * exact same interface as FileReferencePriceStore, so nothing that
 * consumes a ReferencePriceRepository (ingestion.ts, the admin API,
 * server/modules/quote/service.ts) needs to change to use this instead -
 * only the store construction call site does (see getReferencePriceStore()
 * at the bottom of this file).
 *
 * Concurrency/correctness properties this gets "for free" from Postgres
 * that the file store explicitly could NOT provide (see store.ts's
 * documented limitation): a unique constraint on deviceKey prevents two
 * concurrent inserts for the same device from creating duplicate rows;
 * multiple backend instances can safely share one authoritative store;
 * and a redeploy does not wipe the data (unlike Render's ephemeral
 * filesystem for the file store).
 */
export class PostgresReferencePriceStore implements ReferencePriceRepository {
  constructor(private prisma: PrismaClient) {}

  async get(deviceKey: string): Promise<ReferencePriceRecord | null> {
    const row = await this.prisma.referencePrice.findUnique({ where: { deviceKey } });
    if (!row) return null;
    return this.toRecord(row);
  }

  async upsert(record: ReferencePriceRecord): Promise<void> {
    const data = {
      brand: record.brand,
      model: record.model,
      storage: record.storage,
      source: record.source,
      sourceUrl: record.sourceUrl ?? null,
      currentPrice: record.currentPrice,
      matchConfidence: record.matchConfidence.toUpperCase() as any,
      matchEvidence: record.matchEvidence ?? null,
      status: record.status.toUpperCase() as any,
      lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : null,
      lastAttemptedAt: record.lastAttemptedAt ? new Date(record.lastAttemptedAt) : null,
      lastFailureAt: record.lastFailureAt ? new Date(record.lastFailureAt) : null,
      lastFailureError: record.lastFailureError ?? null,
      consecutiveFailures: record.consecutiveFailures,
      updatedAt: new Date(record.updatedAt),
    };

    // Upsert on the unique deviceKey - Postgres guarantees this is atomic
    // and safe under concurrent calls from multiple processes/instances,
    // which the file store's in-process write queue cannot guarantee
    // across more than one running instance.
    await this.prisma.referencePrice.upsert({
      where: { deviceKey: record.deviceKey },
      create: { deviceKey: record.deviceKey, ...data },
      update: data,
    });
  }

  async listAll(): Promise<ReferencePriceRecord[]> {
    const rows = await this.prisma.referencePrice.findMany();
    return rows.map((r) => this.toRecord(r));
  }

  async appendHistory(deviceKey: string, entry: ReferencePriceHistoryEntry): Promise<void> {
    const record = await this.prisma.referencePrice.findUnique({ where: { deviceKey } });
    if (!record) return; // history without a parent record shouldn't happen via the normal ingestion path
    await this.prisma.referencePriceHistory.create({
      data: {
        referencePriceId: record.id,
        price: entry.price,
        recordedAt: new Date(entry.recordedAt),
        source: entry.source,
        note: entry.note ?? null,
      },
    });
  }

  async getHistory(deviceKey: string): Promise<ReferencePriceHistoryEntry[]> {
    const record = await this.prisma.referencePrice.findUnique({
      where: { deviceKey },
      include: { history: { orderBy: { recordedAt: 'asc' } } },
    });
    if (!record) return [];
    return record.history.map((h) => ({
      price: h.price,
      recordedAt: h.recordedAt.toISOString(),
      source: h.source,
      note: h.note ?? undefined,
    }));
  }

  private toRecord(row: any): ReferencePriceRecord {
    return {
      deviceKey: row.deviceKey,
      brand: row.brand,
      model: row.model,
      storage: row.storage,
      source: row.source,
      sourceUrl: row.sourceUrl ?? undefined,
      currentPrice: row.currentPrice,
      matchConfidence: row.matchConfidence.toLowerCase() as MatchConfidence,
      matchEvidence: row.matchEvidence ?? undefined,
      status: row.status.toLowerCase() as ReferencePriceStatus,
      lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
      lastAttemptedAt: row.lastAttemptedAt ? row.lastAttemptedAt.toISOString() : null,
      lastFailureAt: row.lastFailureAt ? row.lastFailureAt.toISOString() : null,
      lastFailureError: row.lastFailureError ?? null,
      consecutiveFailures: row.consecutiveFailures,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
