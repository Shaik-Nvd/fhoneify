/**
 * Learns Cashify questionnaire profiles for catalog models, separately from
 * the weekly price refresh so that refresh stays fast.
 *
 * Model level: variants of one model share a profile. The first time a model
 * is learned (or when its profile is being re-verified) up to
 * `variantsPerModel` variant pages are read; if they disagree the model is
 * stored UNKNOWN with status VARIANT_MISMATCH rather than trusting either.
 * Known, recent, OK profiles are reused without any browser work.
 *
 * The browser part is injected (`fetchPageText`) so the job and all of its
 * decisions are testable without Chromium.
 */
import type { DeviceIdentity } from '../types';
import { parseQuestionnairePage, QUESTIONNAIRE_PARSER_VERSION } from './parser';
import { refreshReason, QUESTIONNAIRE_MAX_AGE_DAYS } from './policy';
import type { QuestionnaireProfileStore } from './store';
import { questionnaireModelKey, type CashifyQuestionnaireProfile } from './types';

export interface QuestionnairePageFetch {
  /** Visible text of the first questionnaire page, or null when the variant
   * page itself does not exist on Cashify. Throws for transport failures. */
  pageText: string | null;
  url: string;
}

export type QuestionnairePageFetcher = (device: DeviceIdentity, url: string) => Promise<QuestionnairePageFetch>;

export interface QuestionnaireRefreshOptions {
  devices: DeviceIdentity[];
  store: QuestionnaireProfileStore;
  fetchPageText: QuestionnairePageFetcher;
  resolveUrl: (device: DeviceIdentity) => string;
  now?: () => Date;
  maxAgeDays?: number;
  variantsPerModel?: number;
  /** Only (re)learn this many models this run (0/undefined = no limit). */
  limit?: number;
  dryRun?: boolean;
  /** Ignore freshness and re-learn every selected model. */
  force?: boolean;
  log?: (line: string) => void;
  /** Models learned in parallel (one browser context each). */
  concurrency?: number;
}

export interface QuestionnaireRefreshReport {
  models: number;
  reused: number;
  refreshed: number;
  byReason: Record<string, number>;
  outcome: Record<string, number>;
  asks: { warranty: Record<string, number>; bill: Record<string, number>; age: Record<string, number> };
  changed: number;
  profiles: CashifyQuestionnaireProfile[];
}

const bump = (counts: Record<string, number>, key: string) => { counts[key] = (counts[key] ?? 0) + 1; };

export async function runQuestionnaireRefresh(options: QuestionnaireRefreshOptions): Promise<QuestionnaireRefreshReport> {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const variantsPerModel = Math.max(1, options.variantsPerModel ?? 2);

  const models = new Map<string, DeviceIdentity[]>();
  for (const device of options.devices) {
    const key = questionnaireModelKey(device);
    if (!models.has(key)) models.set(key, []);
    models.get(key)!.push(device);
  }

  const report: QuestionnaireRefreshReport = {
    models: models.size, reused: 0, refreshed: 0, byReason: {}, outcome: {},
    asks: { warranty: {}, bill: {}, age: {} }, changed: 0, profiles: [],
  };

  const queue = [...models.entries()];
  let started = 0;
  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [modelKey, variants] = next;
      const existing = await options.store.get(modelKey);
      const reason = options.force ? 'forced' : refreshReason(existing, {
        now: now(), parserVersion: QUESTIONNAIRE_PARSER_VERSION, maxAgeDays: options.maxAgeDays ?? QUESTIONNAIRE_MAX_AGE_DAYS,
      });
      if (!reason || (options.limit && started >= options.limit)) {
        if (existing) {
          report.reused++;
          report.profiles.push(existing);
        }
        continue;
      }
      started++;
      bump(report.byReason, reason);

      const profile = await learnModel(modelKey, variants.slice(0, variantsPerModel), options, now);
      report.refreshed++;
      bump(report.outcome, profile.status);
      bump(report.asks.warranty, profile.warrantyMode);
      bump(report.asks.bill, profile.billMode);
      bump(report.asks.age, profile.ageMode);
      report.profiles.push(profile);
      log(`${profile.status.padEnd(16)} warranty=${profile.warrantyMode} bill=${profile.billMode} age=${profile.ageMode}  ${variants[0].brand} ${variants[0].model} (${profile.variantsChecked} variant(s)) ${profile.statusDetail ?? ''}`);

      if (!options.dryRun) {
        const { changed } = await options.store.upsert(profile);
        if (changed) report.changed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency ?? 1) }, worker));
  return report;
}

async function learnModel(
  modelKey: string,
  variants: DeviceIdentity[],
  options: QuestionnaireRefreshOptions,
  now: () => Date
): Promise<CashifyQuestionnaireProfile> {
  const base = {
    modelKey,
    brand: variants[0].brand,
    model: variants[0].model,
    parserVersion: QUESTIONNAIRE_PARSER_VERSION,
    observedAt: now().toISOString(),
  };
  const unknown = (status: CashifyQuestionnaireProfile['status'], statusDetail: string, sourceUrl: string | null, variantsChecked: number, questionLabels: string[] = []): CashifyQuestionnaireProfile => ({
    ...base, warrantyMode: 'UNKNOWN', billMode: 'UNKNOWN', ageMode: 'UNKNOWN', questionLabels, status, statusDetail, sourceUrl, variantsChecked,
  });

  const reads: { url: string; parse: ReturnType<typeof parseQuestionnairePage> }[] = [];
  for (const device of variants) {
    const url = options.resolveUrl(device);
    let fetched: QuestionnairePageFetch;
    try {
      fetched = await options.fetchPageText(device, url);
    } catch (err: any) {
      // A transport failure is not evidence about the questionnaire.
      if (reads.length === 0) return unknown('FETCH_FAILED', String(err?.message ?? err).slice(0, 300), url, 0);
      break;
    }
    if (fetched.pageText === null) continue;
    const parse = parseQuestionnairePage(fetched.pageText);
    if (!parse.ok) return unknown('PARSE_FAILED', parse.reason ?? 'parse failed', fetched.url, reads.length, parse.questionLabels);
    reads.push({ url: fetched.url, parse });
  }

  if (reads.length === 0) return unknown('NOT_FOUND', 'no Cashify page for any checked variant', null, 0);
  const first = reads[0].parse;
  const disagree = reads.find((r) => r.parse.warrantyMode !== first.warrantyMode || r.parse.billMode !== first.billMode || r.parse.ageMode !== first.ageMode);
  if (disagree) {
    return unknown('VARIANT_MISMATCH', `variants disagree: ${reads.map((r) => `${r.url} w=${r.parse.warrantyMode} b=${r.parse.billMode}`).join('; ')}`, reads[0].url, reads.length, first.questionLabels);
  }
  return {
    ...base,
    warrantyMode: first.warrantyMode,
    billMode: first.billMode,
    ageMode: first.ageMode,
    questionLabels: first.questionLabels,
    status: 'OK',
    statusDetail: null,
    sourceUrl: reads[0].url,
    variantsChecked: reads.length,
  };
}
