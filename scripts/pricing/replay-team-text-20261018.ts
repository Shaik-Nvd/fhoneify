/** Offline actual-service replay. Team text is never installed as exact evidence. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TeamTextRow } from './team-text-20261018';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REPLAY_CLOCK = '2026-10-18T00:00:00.000Z';
export const SYNTHETIC_REFERENCE_LABEL = 'SYNTHETIC_REFERENCE_FRESHNESS_TIMESTAMP';
export interface ReplayOptions { baselineRoot?: string; fixturePath?: string }
const pass = (delta: number) => delta > 0 && delta <= 2000;
const observationKey = (row: TeamTextRow) => JSON.stringify([row.identity, row.referencePrice, row.answers]);

export async function replayTeamText(options: ReplayOptions = {}) {
  const engineRoot = path.resolve(options.baselineRoot ?? PROJECT_ROOT);
  const load = (relative: string) => import(pathToFileURL(path.join(engineRoot, relative)).href);
  const [{ createPricingService }, { findCatalogDevice }, { deviceKey }, { customerPayout }] = await Promise.all([
    load('lib/pricing/pricingService.ts'), load('lib/pricing/catalog.ts'),
    load('lib/referencePricing/types.ts'), load('lib/pricing/payout.ts'),
  ]);
  const fixturePath = path.resolve(options.fixturePath ?? path.join(PROJECT_ROOT, 'scripts/pricing/fixtures/team-text-2026-10-18.json'));
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as { rows: TeamTextRow[]; analysis: unknown };
  if (!Array.isArray(fixture.rows)) throw new Error('Fixture rows missing');
  const rows: any[] = [];
  for (const row of fixture.rows) {
    // These nullable details represent explicit absence of the corresponding selected defect,
    // supported by each transcript's screen/body NONE and unlisted-problems Not selected.
    const diagnostics = { ...row.answers, screenSpots: null, screenLines: null,
      screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null };
    const fullInput = { brand: row.identity.brand, model: row.identity.model, storage: row.identity.storage, diagnostics };
    const record: any = { id: row.id, file: row.file, caseId: row.caseId, sourceSha256: row.sourceSha256,
      sourceDate: row.sourceDate, sourceDatePrecision: row.datePrecision,
      sourceKind: row.sourceKind, screenshotVerified: false, identity: row.identity,
      capturedSelling: row.sellingPrice, capturedReference: row.referencePrice, capturedCashifyFees: row.cashifyFees,
      fullInput, referenceTimestampBasis: SYNTHETIC_REFERENCE_LABEL, referenceTimestamp: REPLAY_CLOCK,
      questionnaireBasis: 'FALLBACK_UNKNOWN_NO_SYNTHETIC_PROFILE_OR_ROUTE',
      supplementalDiagnosticsBasis: 'NULL_FOR_UNSELECTED_SCREEN_BODY_DETAILS_NO_ADDITIONAL_SELECTED_DEFECTS',
      replayed: false, quoteAmount: null, conditionEquivalent: null, questionnaire: null,
      couponOff: null, couponOn: null, deltaOff: null, deltaOn: null, passOff: false, passOn: false,
      bothCouponStatesPass: false, method: null, failureReason: null };
    rows.push(record);
    if (row.sellingPrice === null || !row.diagnostics.answersComplete || row.referencePrice === null) {
      record.failureReason = { code: 'INCOMPLETE_TEAM_TRANSCRIPT', message: row.diagnostics.issues.join('; ') };
      continue;
    }
    if (!row.identity.model || !row.identity.storage) {
      record.failureReason = { code: 'MISSING_EXACT_IDENTITY', message: 'No replay with missing model/storage' }; continue;
    }
    const device = findCatalogDevice(row.identity.brand, row.identity.model, row.identity.storage);
    if (!device) { record.failureReason = { code: 'DEVICE_NOT_FOUND', message: 'Exact catalog identity unavailable' }; continue; }
    const reference = { brand: device.brand, model: device.model, storage: device.storage,
      deviceKey: deviceKey(device), source: 'cashify', currentPrice: row.referencePrice,
      matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: REPLAY_CLOCK, lastAttemptedAt: REPLAY_CLOCK,
      lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: REPLAY_CLOCK, updatedAt: REPLAY_CLOCK };
    const noWrite = async () => { throw new Error('Replay forbids persistence'); };
    const repository = { async get(key: string) { return key === reference.deviceKey ? reference : null; },
      async listAll() { return [reference]; }, upsert: noWrite, appendHistory: noWrite, async getHistory() { return []; } };
    const service = createPricingService({ repository, catalog: [device], snapshot: {}, pricingMode: 'hybrid',
      signingSecret: 'offline-team-text-replay-not-a-production-signing-secret', tokenTtlSeconds: 900,
      strictReferenceMode: true, referenceLookupTimeoutMs: 100, now: () => new Date(REPLAY_CLOCK),
      logger: { info() {}, warn() {}, error() {} } });
    try {
      const quote = await service.quote(fullInput);
      record.replayed = true;
      if (!quote.ok) { record.failureReason = { code: quote.code, message: quote.message }; continue; }
      record.quoteAmount = quote.fhoneifyPrice;
      record.startingPrice = quote.startingPrice;
      record.conditionEquivalent = quote.internal.cashifyConditionEquivalent;
      record.referenceUsed = quote.internal.cashifyGetUptoReference;
      record.accessoryBasis = quote.internal.accessoryBasis;
      record.questionnaire = quote.questionnaire;
      record.couponOff = customerPayout(quote.fhoneifyPrice, false);
      record.couponOn = customerPayout(quote.fhoneifyPrice, true);
      record.deltaOff = record.couponOff.payout - row.sellingPrice;
      record.deltaOn = record.couponOn.payout - row.sellingPrice;
      record.passOff = pass(record.deltaOff); record.passOn = pass(record.deltaOn);
      record.bothCouponStatesPass = record.passOff && record.passOn;
      record.method = { pricingVersion: quote.pricingVersion, baseSource: quote.internal.baseSource,
        releaseRule: quote.internal.releaseCandidate?.rule ?? null,
        exactEvidenceApplied: Boolean(quote.internal.exactFinalQuote),
        routeEvidenceSha256: quote.internal.routeEvidenceSha256 ?? null };
    } catch (error) {
      record.failureReason = { code: 'REPLAY_EXCEPTION', message: error instanceof Error ? error.message : String(error) };
    }
  }
  const unique = new Map<string, any>();
  for (let index = 0; index < rows.length; index++) {
    if (fixture.rows[index].sellingPrice !== null) unique.set(observationKey(fixture.rows[index]), rows[index]);
  }
  const summarize = (values: any[]) => ({ rows: values.length, replayed: values.filter(row => row.replayed).length,
    priced: values.filter(row => row.quoteAmount !== null).length,
    bothCouponStatesPass: values.filter(row => row.bothCouponStatesPass).length,
    couponOffPass: values.filter(row => row.passOff).length, couponOnPass: values.filter(row => row.passOn).length,
    failedOrSkipped: values.filter(row => row.failureReason !== null).length });
  const models = [...new Set(rows.map(row => row.identity.model))];
  return { schema: 'fhoneify-team-text-replay/1', engineRoot, fixturePath, replayClock: REPLAY_CLOCK,
    referenceTimestampBasis: SYNTHETIC_REFERENCE_LABEL,
    scope: 'Offline hybrid createPricingService replay against transcript Get Upto. No DB, network, runtime evidence installation, synthetic questionnaire profile, production route or current-accuracy certification.',
    summary: { allRows: summarize(rows), observedRows: summarize(rows.filter(row => row.capturedSelling !== null)),
      uniqueObservedCombinations: summarize([...unique.values()]),
      byModel: Object.fromEntries(models.map(model => [model, {
        observations: summarize(rows.filter(row => row.identity.model === model && row.capturedSelling !== null)),
        unique: summarize([...unique.values()].filter(row => row.identity.model === model)),
      }])) }, fixtureAnalysis: fixture.analysis, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const value = (flag: string) => { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : undefined; };
  const output = path.resolve(value('--out') ?? path.join(PROJECT_ROOT, 'scratch/team-text-20261018/replay.json'));
  replayTeamText({ baselineRoot: value('--baseline-root'), fixturePath: value('--fixture') }).then(result => {
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result.summary, null, 2));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
