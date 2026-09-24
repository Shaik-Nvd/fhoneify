/**
 * Durable storage for model questionnaire profiles. The Postgres store is the
 * production backend (tables CashifyQuestionnaireProfile + ...History); the
 * in-memory store backs tests. A change in any mode or status appends a
 * history row, so profile changes are auditable.
 */
import type { CashifyQuestionnaireProfile, QuestionMode, QuestionnaireProfileStatus } from './types';

export interface QuestionnaireProfileStore {
  get(modelKey: string): Promise<CashifyQuestionnaireProfile | null>;
  list(): Promise<CashifyQuestionnaireProfile[]>;
  /** Returns whether the stored semantics changed (a history row was added). */
  upsert(profile: CashifyQuestionnaireProfile): Promise<{ changed: boolean }>;
}

const semanticsChanged = (a: CashifyQuestionnaireProfile | null, b: CashifyQuestionnaireProfile) =>
  !a || a.warrantyMode !== b.warrantyMode || a.billMode !== b.billMode || a.ageMode !== b.ageMode || a.status !== b.status;

export class InMemoryQuestionnaireProfileStore implements QuestionnaireProfileStore {
  readonly profiles = new Map<string, CashifyQuestionnaireProfile>();
  readonly history: CashifyQuestionnaireProfile[] = [];

  async get(modelKey: string) {
    return this.profiles.get(modelKey) ?? null;
  }
  async list() {
    return [...this.profiles.values()];
  }
  async upsert(profile: CashifyQuestionnaireProfile) {
    const changed = semanticsChanged(this.profiles.get(profile.modelKey) ?? null, profile);
    this.profiles.set(profile.modelKey, { ...profile });
    if (changed) this.history.push({ ...profile });
    return { changed };
  }
}

const toProfile = (row: any): CashifyQuestionnaireProfile => ({
  modelKey: row.modelKey,
  brand: row.brand,
  model: row.model,
  warrantyMode: row.warrantyMode as QuestionMode,
  billMode: row.billMode as QuestionMode,
  ageMode: row.ageMode as QuestionMode,
  questionLabels: row.questionLabels ?? [],
  status: row.status as QuestionnaireProfileStatus,
  statusDetail: row.statusDetail ?? null,
  sourceUrl: row.sourceUrl ?? null,
  variantsChecked: row.variantsChecked ?? 0,
  parserVersion: row.parserVersion,
  observedAt: new Date(row.observedAt).toISOString(),
});

export class PostgresQuestionnaireProfileStore implements QuestionnaireProfileStore {
  constructor(private readonly prisma: any) {}

  async get(modelKey: string) {
    const row = await this.prisma.cashifyQuestionnaireProfile.findUnique({ where: { modelKey } });
    return row ? toProfile(row) : null;
  }

  async list() {
    const rows = await this.prisma.cashifyQuestionnaireProfile.findMany();
    return rows.map(toProfile);
  }

  async upsert(profile: CashifyQuestionnaireProfile) {
    const existing = await this.get(profile.modelKey);
    const changed = semanticsChanged(existing, profile);
    const data = {
      brand: profile.brand,
      model: profile.model,
      warrantyMode: profile.warrantyMode,
      billMode: profile.billMode,
      ageMode: profile.ageMode,
      questionLabels: profile.questionLabels,
      status: profile.status,
      statusDetail: profile.statusDetail,
      sourceUrl: profile.sourceUrl,
      variantsChecked: profile.variantsChecked,
      parserVersion: profile.parserVersion,
      observedAt: new Date(profile.observedAt),
    };
    await this.prisma.$transaction(async (tx: any) => {
      const row = await tx.cashifyQuestionnaireProfile.upsert({
        where: { modelKey: profile.modelKey },
        create: { modelKey: profile.modelKey, ...data },
        update: data,
      });
      if (changed) {
        await tx.cashifyQuestionnaireProfileHistory.create({
          data: {
            profileId: row.id,
            warrantyMode: profile.warrantyMode,
            billMode: profile.billMode,
            ageMode: profile.ageMode,
            status: profile.status,
            parserVersion: profile.parserVersion,
            observedAt: new Date(profile.observedAt),
          },
        });
      }
    });
    return { changed };
  }
}
