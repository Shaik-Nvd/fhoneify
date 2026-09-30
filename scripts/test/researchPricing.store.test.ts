import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresResearchStore } from '../../lib/researchPricing/store';

const row = {
  id: 'experiment-1',
  deviceKey: 'Samsung|Galaxy S24|8 GB/256 GB',
  brand: 'Samsung',
  model: 'Galaxy S24',
  storage: '8 GB/256 GB',
  profile: 'A_CLEAN_BASELINE',
  status: 'PENDING',
  sourceUrl: null,
  originalGetUptoReference: null,
  questionsAsked: null,
  answersSelected: null,
  finalQuote: null,
  unsupportedReason: null,
  errorReason: null,
  questionnaireFingerprint: null,
  claimedBy: null,
  claimedAt: null,
  batchId: null,
};

test('claimNext makes an AUTH_REQUIRED checkpoint retryable after re-authentication', async () => {
  let query = '';
  const prisma = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      query = strings.join('?');
      return [row];
    },
  };
  const store = new PostgresResearchStore(prisma as any);

  const claimed = await store.claimNext({
    workerId: 'fresh-session-worker',
    claimTtlMs: 15 * 60 * 1000,
    profiles: ['A_CLEAN_BASELINE'],
  });

  assert.equal(claimed?.id, row.id);
  assert.match(query, /OR status = 'AUTH_REQUIRED'/);
  assert.doesNotMatch(query, /status IN \('IN_PROGRESS', 'AUTH_REQUIRED'\)/);
});

test('a stale worker cannot overwrite or append to a newer checkpoint', async () => {
  let observationWrites = 0;
  const prisma = {
    $transaction: async (work: (tx: any) => Promise<unknown>) =>
      work({
        cashifyResearchExperiment: {
          updateMany: async () => ({ count: 0 }),
        },
        cashifyResearchObservation: {
          create: async () => {
            observationWrites += 1;
          },
        },
      }),
  };
  const store = new PostgresResearchStore(prisma as any);

  const result = await store.recordOutcome(
    row.id,
    { status: 'COMPLETED', finalQuote: 25000 },
    'expired-worker'
  );

  assert.deepEqual(result, { written: false });
  assert.equal(observationWrites, 0);
});

test('a successful outcome updates the checkpoint and appends exactly one observation', async () => {
  const updates: unknown[] = [];
  const observations: unknown[] = [];
  const prisma = {
    $transaction: async (work: (tx: any) => Promise<unknown>) =>
      work({
        cashifyResearchExperiment: {
          updateMany: async (args: unknown) => {
            updates.push(args);
            return { count: 1 };
          },
        },
        cashifyResearchObservation: {
          create: async (args: unknown) => {
            observations.push(args);
          },
        },
      }),
  };
  const store = new PostgresResearchStore(prisma as any);

  const result = await store.recordOutcome(
    row.id,
    { status: 'COMPLETED', finalQuote: 25000, answersSelected: { calls: true } },
    'current-worker'
  );

  assert.deepEqual(result, { written: true });
  assert.equal(updates.length, 1);
  assert.equal(observations.length, 1);
  assert.deepEqual((updates[0] as any).where, { id: row.id, claimedBy: 'current-worker' });
  assert.equal((updates[0] as any).data.status, 'COMPLETED');
  assert.equal((updates[0] as any).data.claimedBy, null);
  assert.equal((observations[0] as any).data.experimentId, row.id);
  assert.equal((observations[0] as any).data.finalQuote, 25000);
});
