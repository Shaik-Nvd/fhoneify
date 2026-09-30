import type { PrismaClient } from '@prisma/client';

// One-time Cashify pricing research campaign. Fully separate from
// lib/referencePricing/* - never read by quote pricing or the weekly
// refresh. Only touches CashifyResearchBatch / CashifyResearchExperiment /
// CashifyResearchObservation (see prisma/schema.prisma, "One-time Cashify
// pricing research campaign" section).

export type ResearchProfile = 'A_CLEAN_BASELINE' | 'B_SINGLE_VARIABLE_CONTROL' | 'C_DAMAGE_CONDITION';
export type ResearchExperimentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'UNSUPPORTED' | 'AUTH_REQUIRED' | 'FAILED';

export interface ResearchExperimentRow {
  id: string;
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  profile: ResearchProfile;
  status: ResearchExperimentStatus;
  sourceUrl?: string | null;
  originalGetUptoReference?: number | null;
  questionsAsked?: unknown;
  answersSelected?: unknown;
  finalQuote?: number | null;
  unsupportedReason?: string | null;
  errorReason?: string | null;
  questionnaireFingerprint?: string | null;
  claimedBy?: string | null;
  claimedAt?: Date | null;
  batchId?: string | null;
}

export interface ResearchStore {
  createBatch(input: {
    batchLabel: string;
    brandFilter?: string;
    modelFilter?: string;
    triggeredBy: 'cli' | 'github-actions';
    externalRunId?: string;
    requestedLimit?: number;
  }): Promise<{ id: string }>;
  finishBatch(batchId: string, notes?: string): Promise<void>;

  ensureExperiments(
    devices: { deviceKey: string; brand: string; model: string; storage: string }[],
    profiles: ResearchProfile[],
    opts: { batchId?: string; force?: boolean }
  ): Promise<{ created: number; alreadyExisted: number; skippedCompleted: number }>;

  claimNext(opts: {
    workerId: string;
    claimTtlMs: number;
    deviceKeys?: string[];
    /** Explicit, scoped retry after a collector selector bug is fixed. */
    retryUnsupported?: boolean;
    /** Explicit re-verification; append an observation, retain prior history. */
    reverifyCompleted?: boolean;
    brandFilter?: string;
    modelFilter?: string;
    profiles?: ResearchProfile[];
  }): Promise<ResearchExperimentRow | null>;

  recordOutcome(
    experimentId: string,
    outcome: {
      status: 'COMPLETED' | 'UNSUPPORTED' | 'AUTH_REQUIRED' | 'FAILED';
      sourceUrl?: string;
      originalGetUptoReference?: number;
      questionsAsked?: unknown;
      answersSelected?: unknown;
      finalQuote?: number;
      unsupportedReason?: string;
      errorReason?: string;
      questionnaireFingerprint?: string;
    },
    /**
     * The worker id that claimed this experiment (from claimNext). Scopes
     * the write so a worker whose claim was already reclaimed as abandoned
     * (TTL expiry -> a second worker claimed and possibly already recorded
     * its own outcome) can never overwrite fresher data with a stale result.
     * Optional for backward compatibility with direct/manual calls, but every
     * real collection path must pass it.
     */
    workerId?: string
  ): Promise<{ written: boolean; observationId?: string }>;

  getRecordedEvidence(observationId: string): Promise<{
    id: string;
    experimentId: string;
    status: string;
    finalQuote: number | null;
    questionsAsked: unknown;
    answersSelected: unknown;
    recordedAt: Date;
    questionnaireFingerprint: string | null;
  } | null>;

  releaseClaim(experimentId: string, workerId?: string): Promise<void>;

  getProgress(filter?: { brandFilter?: string; modelFilter?: string }): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    unsupported: number;
    authRequired: number;
    failed: number;
  }>;

  listCompleted(filter?: { brandFilter?: string; includeHistory?: boolean }): Promise<Array<ResearchExperimentRow & { observations?: unknown[] }>>;

  disconnect(): Promise<void>;
}

// Prisma's generated row type has Json fields typed as JsonValue | null and
// numeric fields as number | null - structurally compatible with
// ResearchExperimentRow but not nominally identical, so we map field by
// field rather than casting.
function toRow(r: {
  id: string;
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  profile: string;
  status: string;
  sourceUrl: string | null;
  originalGetUptoReference: number | null;
  questionsAsked: unknown;
  answersSelected: unknown;
  finalQuote: number | null;
  unsupportedReason: string | null;
  errorReason: string | null;
  questionnaireFingerprint: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  batchId: string | null;
}): ResearchExperimentRow {
  return {
    id: r.id,
    deviceKey: r.deviceKey,
    brand: r.brand,
    model: r.model,
    storage: r.storage,
    profile: r.profile as ResearchProfile,
    status: r.status as ResearchExperimentStatus,
    sourceUrl: r.sourceUrl,
    originalGetUptoReference: r.originalGetUptoReference,
    questionsAsked: r.questionsAsked,
    answersSelected: r.answersSelected,
    finalQuote: r.finalQuote,
    unsupportedReason: r.unsupportedReason,
    errorReason: r.errorReason,
    questionnaireFingerprint: r.questionnaireFingerprint,
    claimedBy: r.claimedBy,
    claimedAt: r.claimedAt,
    batchId: r.batchId,
  };
}

export class PostgresResearchStore implements ResearchStore {
  constructor(private readonly prisma: PrismaClient) {}

  async createBatch(input: {
    batchLabel: string;
    brandFilter?: string;
    modelFilter?: string;
    triggeredBy: 'cli' | 'github-actions';
    externalRunId?: string;
    requestedLimit?: number;
  }): Promise<{ id: string }> {
    const batch = await this.prisma.cashifyResearchBatch.create({
      data: {
        batchLabel: input.batchLabel,
        brandFilter: input.brandFilter,
        modelFilter: input.modelFilter,
        triggeredBy: input.triggeredBy,
        externalRunId: input.externalRunId,
        requestedLimit: input.requestedLimit,
      },
      select: { id: true },
    });
    return { id: batch.id };
  }

  async finishBatch(batchId: string, notes?: string): Promise<void> {
    await this.prisma.cashifyResearchBatch.update({
      where: { id: batchId },
      data: { finishedAt: new Date(), notes },
    });
  }

  async ensureExperiments(
    devices: { deviceKey: string; brand: string; model: string; storage: string }[],
    profiles: ResearchProfile[],
    opts: { batchId?: string; force?: boolean }
  ): Promise<{ created: number; alreadyExisted: number; skippedCompleted: number }> {
    let created = 0;
    let alreadyExisted = 0;
    let skippedCompleted = 0;

    for (const device of devices) {
      for (const profile of profiles) {
        const existing = await this.prisma.cashifyResearchExperiment.findUnique({
          where: { deviceKey_profile: { deviceKey: device.deviceKey, profile } },
          select: { id: true, status: true },
        });

        if (!existing) {
          await this.prisma.cashifyResearchExperiment.create({
            data: {
              deviceKey: device.deviceKey,
              brand: device.brand,
              model: device.model,
              storage: device.storage,
              profile,
              status: 'PENDING',
              batchId: opts.batchId,
            },
          });
          created += 1;
          continue;
        }

        alreadyExisted += 1;

        if (existing.status === 'COMPLETED' && !opts.force) {
          skippedCompleted += 1;
          continue;
        }

        if (opts.force) {
          await this.prisma.cashifyResearchExperiment.update({
            where: { id: existing.id },
            data: {
              brand: device.brand,
              model: device.model,
              storage: device.storage,
              status: 'PENDING',
              claimedBy: null,
              claimedAt: null,
              batchId: opts.batchId,
            },
          });
        }
      }
    }

    return { created, alreadyExisted, skippedCompleted };
  }

  // Single atomic UPDATE ... WHERE ... RETURNING, gated on a row subquery
  // that uses FOR UPDATE SKIP LOCKED - two concurrent callers can never
  // land on the same row because Postgres serializes the subquery's row
  // lock, and a second caller whose subquery finds the row already locked
  // skips it instead of blocking. This is the only correctness-critical
  // path in this file; keep it as one statement, not a read-then-write.
  async claimNext(opts: {
    workerId: string;
    claimTtlMs: number;
    deviceKeys?: string[];
    retryUnsupported?: boolean;
    reverifyCompleted?: boolean;
    brandFilter?: string;
    modelFilter?: string;
    profiles?: ResearchProfile[];
  }): Promise<ResearchExperimentRow | null> {
    const staleBefore = new Date(Date.now() - opts.claimTtlMs);
    const profiles = opts.profiles && opts.profiles.length > 0 ? opts.profiles : null;
    const deviceKeys = opts.deviceKeys && opts.deviceKeys.length > 0 ? opts.deviceKeys : null;

    const rows = await this.prisma.$queryRaw<any[]>`
      UPDATE "CashifyResearchExperiment" AS e
      SET status = 'IN_PROGRESS', "claimedBy" = ${opts.workerId}, "claimedAt" = now(), "updatedAt" = now()
      WHERE e.id = (
        SELECT id FROM "CashifyResearchExperiment"
        WHERE (
          status = 'PENDING'
          OR status = 'AUTH_REQUIRED'
          OR (${opts.retryUnsupported === true} AND status = 'UNSUPPORTED')
          OR (${opts.reverifyCompleted === true} AND status = 'COMPLETED')
          OR (status = 'IN_PROGRESS' AND "claimedAt" IS NOT NULL AND "claimedAt" < ${staleBefore})
        )
        AND (${opts.brandFilter ?? null}::text IS NULL OR brand ILIKE ${opts.brandFilter ?? null})
        AND (${opts.modelFilter ?? null}::text IS NULL OR model ILIKE ${opts.modelFilter ? `%${opts.modelFilter}%` : null})
        AND (${deviceKeys}::text[] IS NULL OR "deviceKey" = ANY(${deviceKeys}::text[]))
        AND (${profiles}::"ResearchProfile"[] IS NULL OR profile = ANY(${profiles}::"ResearchProfile"[]))
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING e.*;
    `;

    if (!rows || rows.length === 0) return null;
    return toRow(rows[0]);
  }

  // Scoped on claimedBy (when given) so a worker whose claim was already
  // reclaimed as abandoned by another worker (TTL expiry) can never
  // overwrite that other worker's fresher result with a stale one - see the
  // "TOCTOU between releaseClaim/claimNext and a slow recordOutcome" note
  // this closes. updateMany + matchedCount replaces the plain update() so we
  // can detect "nothing matched" and skip the observation insert instead of
  // writing an orphaned/stale history row.
  async recordOutcome(
    experimentId: string,
    outcome: {
      status: 'COMPLETED' | 'UNSUPPORTED' | 'AUTH_REQUIRED' | 'FAILED';
      sourceUrl?: string;
      originalGetUptoReference?: number;
      questionsAsked?: unknown;
      answersSelected?: unknown;
      finalQuote?: number;
      unsupportedReason?: string;
      errorReason?: string;
      questionnaireFingerprint?: string;
    },
    workerId?: string
  ): Promise<{ written: boolean; observationId?: string }> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.cashifyResearchExperiment.updateMany({
        where: workerId ? { id: experimentId, claimedBy: workerId } : { id: experimentId },
        data: {
          status: outcome.status,
          sourceUrl: outcome.sourceUrl,
          originalGetUptoReference: outcome.originalGetUptoReference,
          questionsAsked: outcome.questionsAsked as any,
          answersSelected: outcome.answersSelected as any,
          finalQuote: outcome.finalQuote,
          unsupportedReason: outcome.unsupportedReason,
          errorReason: outcome.errorReason,
          questionnaireFingerprint: outcome.questionnaireFingerprint,
          claimedBy: null,
          claimedAt: null,
        },
      });

      if (updateResult.count === 0) {
        // Someone else already reclaimed this experiment as abandoned (and
        // quite possibly already recorded a fresher outcome) - this caller's
        // result is stale. Dropping it here is strictly safer than clobbering
        // newer data or appending a history row nobody can trust the order of.
        return { written: false };
      }

      const observation = await tx.cashifyResearchObservation.create({
        data: {
          experimentId,
          status: outcome.status,
          finalQuote: outcome.finalQuote,
          questionsAsked: outcome.questionsAsked as any,
          answersSelected: outcome.answersSelected as any,
          errorReason: outcome.errorReason,
        },
      });

      return { written: true, observationId: observation.id };
    });
  }

  async getRecordedEvidence(observationId: string) {
    const observation = await this.prisma.cashifyResearchObservation.findUnique({
      where: { id: observationId },
      select: {
        id: true, experimentId: true, status: true, finalQuote: true,
        questionsAsked: true, answersSelected: true, recordedAt: true,
        experiment: { select: { questionnaireFingerprint: true } },
      },
    });
    if (!observation) return null;
    return {
      id: observation.id,
      experimentId: observation.experimentId,
      status: observation.status,
      finalQuote: observation.finalQuote,
      questionsAsked: observation.questionsAsked,
      answersSelected: observation.answersSelected,
      recordedAt: observation.recordedAt,
      questionnaireFingerprint: observation.experiment.questionnaireFingerprint,
    };
  }

  async releaseClaim(experimentId: string, workerId?: string): Promise<void> {
    await this.prisma.cashifyResearchExperiment.updateMany({
      where: workerId
        ? { id: experimentId, status: 'IN_PROGRESS', claimedBy: workerId }
        : { id: experimentId, status: 'IN_PROGRESS' },
      data: { status: 'PENDING', claimedBy: null, claimedAt: null },
    });
  }

  async getProgress(filter?: { brandFilter?: string; modelFilter?: string }): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    unsupported: number;
    authRequired: number;
    failed: number;
  }> {
    // Case-insensitive brand match, case-insensitive substring model match -
    // must mirror run-batch.ts's catalog filtering (exact-brand,
    // substring-model, both case-insensitive) and claimNext()'s ILIKE
    // filters, or a progress check can disagree with what was actually
    // ensured/claimed.
    const where = {
      ...(filter?.brandFilter ? { brand: { equals: filter.brandFilter, mode: 'insensitive' as const } } : {}),
      ...(filter?.modelFilter ? { model: { contains: filter.modelFilter, mode: 'insensitive' as const } } : {}),
    };

    const [total, pending, inProgress, completed, unsupported, authRequired, failed] = await Promise.all([
      this.prisma.cashifyResearchExperiment.count({ where }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'UNSUPPORTED' } }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'AUTH_REQUIRED' } }),
      this.prisma.cashifyResearchExperiment.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return { total, pending, inProgress, completed, unsupported, authRequired, failed };
  }

  async listCompleted(filter?: { brandFilter?: string; includeHistory?: boolean }): Promise<Array<ResearchExperimentRow & { observations?: unknown[] }>> {
    const rows = await this.prisma.cashifyResearchExperiment.findMany({
      where: {
        status: 'COMPLETED',
        ...(filter?.brandFilter ? { brand: { equals: filter.brandFilter, mode: 'insensitive' as const } } : {}),
      },
      include: filter?.includeHistory
        ? { observations: { orderBy: { recordedAt: 'asc' } } }
        : undefined,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { storage: 'asc' }],
    });

    return rows.map((r: any) => ({
      ...toRow(r),
      ...(filter?.includeHistory ? { observations: r.observations } : {}),
    }));
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch {
      // Shutdown must not fail because the connection was already gone.
    }
  }
}
