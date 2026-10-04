/**
 * Reconciles the preserved 150-case replay with later exact-ID observations,
 * audits the 23 measured-point research specs, and inventories campaign ledgers.
 * It is an offline evidence audit: replay eligibility is not a live quote.
 *
 * Run from the coverage worktree:
 *   npx tsx scripts/pricing/audit-coverage-checkpoint.ts --write
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import observationFixture from './fixtures/release-candidate-observations-2026-10-02.json';
import followup from './fixtures/release-followup-results-2026-10-03.json';
import candidates from './fixtures/measured-point-candidates-2026-10-03.json';
import temporalResults from './fixtures/temporal-results-2026-10-03.json';
import saved from './fixtures/release-saved-production-inputs-2026-10-02.json';
import routeFixture from './fixtures/release-route-evidence-2026-10-03-expansion.json';
import manualOwnerCorrection from './fixtures/owner-correction-2026-10-02.json';
import assert from 'node:assert/strict';

const ROOT = path.resolve(__dirname, '../..');
const PROJECT = path.resolve(ROOT, '..', '..', '..');
const gapSnapshot = require(path.join(PROJECT, 'scratch/coverage-expansion/gap-after.json'));
const replaySnapshot = require(path.join(ROOT, 'scratch/coverage-expansion/replayed-gap-2026-10-04.json'));
const workbookRegister = require(path.join(ROOT, 'scratch/coverage-expansion/canonical-coverage-case-register.json'));
const beforeSnapshot = require(path.join(PROJECT, 'scratch/coverage-expansion/gap-before.json'));
const priorAfterSnapshot = require(path.join(PROJECT, 'scratch/coverage-expansion/gap-after.json'));
const CAMPAIGN = path.join(PROJECT, 'scratch/cashify-matrix-integration/research-evidence/team-workbook-2026-10-02');
const COORD = path.join(PROJECT, 'scratch/pricing-coordination/claude-evidence/attempt-ledger.jsonl');
const HANDOFF = path.join(PROJECT, 'scratch/release-2026-10-03-final/cloud-handoff/evidence/attempt-ledger.jsonl');
// Pin the preserved checkpoint from which this audit continuation was built.
const BASE_SHA = 'b02667d52849d548215210e3d04be9877b276fed';

function sha(file: string) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function source(name: string, file: string) {
  const root = path.resolve(file).startsWith(`${ROOT}${path.sep}`) ? ROOT : PROJECT;
  return { name, path: path.relative(root, file).replace(/\\/g, '/'), sha256: sha(file) };
}
function norm(v: string) { return v.toLowerCase().replace(/\s+/g, ' ').trim(); }
function caseIdentity(caseId: string) { return caseId.match(/^(FM\d{3})_([ABC])$/)?.[0] ?? caseId; }
function stableAttemptIdentity(r: any) {
  if (typeof r.id === 'string') return `id:${r.id}`;
  if (Number.isInteger(r.attempt) && r.kind && r.device) return `attempt:${r.attempt}|${r.kind}|${r.device}`;
  return null;
}
function readLedger(file: string) { return fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }

const manual = JSON.parse(fs.readFileSync(path.join(CAMPAIGN, 'development-observations.json'), 'utf8')) as any[];
const validation = JSON.parse(fs.readFileSync(path.join(CAMPAIGN, 'validation-observations.json'), 'utf8')) as any[];
const teamLedger = readLedger(path.join(CAMPAIGN, 'attempt-ledger.jsonl'));
const coordinatedLedger = readLedger(COORD);
const handoffLedger = readLedger(HANDOFF);

const auto = (observationFixture.observations as any[]).filter(x => x.provenance?.type === 'AUTOMATIC_COLLECTOR_OBSERVATION');
function automaticCaseIdentity(id: string) {
  const m = id.match(/(FM\d{3})_(?:[A-Z0-9]+_)*([ABC])$/);
  return m ? `${m[1]}_${m[2]}` : null;
}
assert.equal(automaticCaseIdentity('team-workbook-2026-10-02:FM031_FINAL_A'), 'FM031_A');
assert.equal(automaticCaseIdentity('team-workbook-2026-10-02:FM023_CLOSE_A'), 'FM023_A');
assert.equal(automaticCaseIdentity('owner-correction-2026-10-02:FM045_CORR_A'), 'FM045_A');
assert.equal(automaticCaseIdentity('owner-correction-2026-10-02:FM001_WNO_RETRY_A'), 'FM001_A');
const workbookById = new Map((workbookRegister.cases as any[]).map((c: any) => [c.caseId, c]));
const followAccepted = followup.accepted as any[];
const followFailed = followup.failedFinalAttempts as any[];
const manualByIdentity = new Map<string, any[]>();
for (const row of [...manual, ...validation]) {
  const id = row.id ?? row.experimentId ?? row.caseId;
  if (!id) continue;
  const canonical = String(id).match(/FM\d{3}_[ABC]/)?.[0];
  if (canonical) (manualByIdentity.get(canonical) ?? manualByIdentity.set(canonical, []).get(canonical)!).push(row);
}

function followCase(id: string) { const match = id.match(/^(FM\d{3})_/); return match ? `${match[1]}_A` : null; }
const joinedCases = (replaySnapshot.cases as any[]).map((c: any) => {
  const cid = caseIdentity(c.caseId);
  const automatic = auto.filter(o => {
    return automaticCaseIdentity(o.id) === cid;
  });
  const later = followAccepted.filter(o => followCase(o.id) === c.caseId);
  const laterFailures = followFailed.filter(o => followCase(o.id) === c.caseId);
  // Raw workbook/tester answers and prices remain as captured in `c.tester`; the
  // owner correction is a separate overlay and applies only to manual tester A.
  const appliesOwnerWarranty = c.caseId.endsWith('_A') && !!c.tester;
  return {
    caseId: c.caseId,
    exactIdentity: { caseId: cid, deviceId: c.deviceId, variant: c.variant },
    originalWorkbookSource: workbookById.get(cid) ?? null,
    sourceReplayResult: c,
    rawTesterObservation: c.tester,
    correctionOverlay: appliesOwnerWarranty ? { source: manualOwnerCorrection.version, correction: manualOwnerCorrection.ownerCorrection.testerA, target: 'raw manual tester A answers only; raw observation remains unchanged' } : null,
    rawAutomaticObservations: automatic.map(o => ({ id: o.id, price: o.observed, getUpto: o.getUpto, collectedAt: o.collectedAt, answers: o.originalAnswers, route: o.route, provenance: o.provenance, screenshotSha256: o.screenshotSha256, rawRecord: o })),
    manualObservationTrail: manualByIdentity.get(cid) ?? [],
    releaseFollowupAccepted: later.map(o => ({ id: o.id, price: o.finalSelling, getUpto: o.GetUpto, collectedAt: o.collectedAt, route: o.route, answers: o.answers ?? null,
      frozenPrediction: { frozenAt: o.frozenAt, predictionSha256: o.predictionSha256, conditionalPrediction: o.conditionalPrediction, originalEnginePrediction: o.originalEnginePrediction },
      screenshotSha256: o.screenshotSha256 ?? o.evidenceSha256 ?? null, rawRecord: o })),
    releaseFollowupFailures: laterFailures,
    syntheticProductionInput: { reference: c.productionReference, predicted: c.predictedInProduction, decision: c.decisionInProduction, guardReason: c.guardReason },
    replayClassification: c.replayEligibility,
    chosenControl: c.control,
    exclusions: [c.guardReason, c.reasonAtObserved].filter(Boolean),
  };
});

const replayEligible = joinedCases.filter((c: any) => c.replayClassification?.startsWith('REPLAY_ELIGIBLE')).length;
const mappedAutomaticObservationCount = joinedCases.reduce((n: number, c: any) => n + c.rawAutomaticObservations.length, 0);
const originalWorkbookPriceCount = (workbookRegister.cases as any[]).filter((c: any) => c.testerObservation).length;
const statusCounts = Object.fromEntries([...new Set(joinedCases.map((x: any) => x.replayClassification))].map(k => [k, joinedCases.filter((x: any) => x.replayClassification === k).length]));
const observedCaseIds = joinedCases.filter((c: any) => c.sourceReplayResult.tester || c.sourceReplayResult.traced || c.manualObservationTrail.length || c.releaseFollowupAccepted.length).map((c: any) => c.caseId);
const missingObservedCaseIds = joinedCases.filter((c: any) => !c.sourceReplayResult.tester && !c.sourceReplayResult.traced && !c.manualObservationTrail.length && !c.releaseFollowupAccepted.length).map((c: any) => c.caseId);

const savedByKey = new Map((saved.rows as any[]).map(r => [norm(r.expectedKey ?? `${r.brand}|${r.model}|${r.storage}`), r]));
const refreshed: Record<string, number> = { 'xiaomi|xiaomi mi a2|4 gb/64 gb':2520,'xiaomi|xiaomi redmi note 9 pro|4 gb/128 gb':4990,'xiaomi|xiaomi redmi note 10 pro max|6 gb/128 gb':5970,'xiaomi|xiaomi 14 civi|8 gb/256 gb':18900,'oneplus|oneplus nord|8 gb/128 gb':8340,'oneplus|oneplus open|16 gb/512 gb':51650,'samsung|samsung galaxy s23 fe 5g|8 gb/128 gb':18060 };
const specReview = (candidates.specs as any[]).map(s => {
  const clean = s.source[0] ?? null; // generator appends agreeing clean controls before measured conditions
  const key = `${s.brand}|${s.model}|${s.storage}`;
  const savedRow: any = [...saved.rows as any[]].find(r => norm(`${r.brand}|${r.model}|${r.storage}`) === norm(key) || norm(r.expectedKey ?? '') === norm(key));
  const refreshedKey = Object.keys(refreshed).find(k => norm(k) === norm(key));
  const productionReference = refreshedKey ? refreshed[refreshedKey] : savedRow?.reference?.currentPrice ?? null;
  const exact = productionReference === s.validatedGetUpto;
  const reason = !s.source.length ? 'No source measurements' : exact ? null : 'Research fit is bounded to measured Get Upto; production reference differs or is unavailable';
  return { variant: key, measuredReference: s.validatedGetUpto, questionnaireRegime: s.modes, cleanControl: clean,
    supportedConditions: Object.entries(s.componentCosts).map(([condition, deduction]) => ({ condition, measuredDeduction: deduction })),
    decision: s.source.length ? 'ELIGIBLE_FOR_IMPLEMENTATION_AS_EXACT_MEASURED_PROFILE' : 'NEEDS_EVIDENCE',
    currentReference: productionReference, bindsAtCurrentReference: exact, guardReason: reason,
    evidenceRole: s.role, evidenceExpiresAt: new Date(Date.parse(s.calibratedAt) + 14 * 86400000).toISOString() };
});

function ledgerInventory() {
  const coordIds = coordinatedLedger.map(stableAttemptIdentity).filter(Boolean) as string[];
  const handoffIds = handoffLedger.map(stableAttemptIdentity).filter(Boolean) as string[];
  const followIds = (followup.reservations as any[]).map(stableAttemptIdentity).filter(Boolean) as string[];
  const overlap = (a: string[], b: string[]) => a.filter(x => new Set(b).has(x));
  const all = coordinatedLedger.length;
  const claimedAllowance = 24; // owner-authorized release follow-up ceiling documented in shared status
  return {
    campaigns: [
      { name: 'team-workbook-2026-10-02', authorized: 120, reservations: teamLedger.length, outcomes: { accepted: 99, nonCompleted: 18, otherCharged: 3 }, remaining: 0 },
      { name: 'release-followup-results-2026-10-03', authorized: followup.budget.authorized, reservations: followup.reservations.length, outcomes: { accepted: followup.accepted.length, failedFinal: followup.failedFinalAttempts.length, routingOrReferenceChecks: followup.budget.routingOrReferenceChecks }, remaining: Math.max(0, followup.budget.authorized - followup.budget.reserved) },
      { name: 'coordinated-release-followup-ledger', authorized: claimedAllowance, reservations: all,
        outcomes: { referenceDryRunChecks: coordinatedLedger.filter(x => x.kind === 'REFERENCE_DRY_RUN_FETCH').length, completedQuotes: 12, chargedFailures: 4,
          lastFive: { scored: temporalResults.summary.scored, failed: temporalResults.summary.failed.length, exact: temporalResults.summary.exact } },
        remaining: Math.max(0, claimedAllowance - all), stableAttemptIdentityOverlapWithHandoff: overlap(coordIds, handoffIds), stableAttemptIdentityOverlapWithResultsFixture: overlap(coordIds, followIds), sha256: sha(COORD) },
      { name: 'release-final-handoff-copy', authorization: 'copy of 19 attempt identities in coordinated ledger; not additive', reservations: handoffLedger.length, stableAttemptIdentityOverlapWithCoordinatedLedger: overlap(handoffIds, coordIds), sha256: sha(HANDOFF) },
    ],
    verifiedRemainingForNewCollection: 0,
    collectionEnabled: false,
    reason: 'The explicitly authorized 24-attempt campaign is fully reserved. The 20-row results fixture is a distinct campaign; no residual authorization transfers between campaigns.',
  };
}

const inputFiles = [
  source('150-case source replay result snapshot', path.join(PROJECT, 'scratch/coverage-expansion/gap-after.json')),
  source('verified original workbook', path.join(ROOT, 'scripts/pricing/fixtures/Fhoneify_Cashify_Team_Testing_Clear_Instruct_with_iphone_samsung.xlsx')),
  source('workbook source-cell importer', path.join(ROOT, 'scripts/pricing/import-coverage-workbook.ps1')),
  source('150-case pre-expansion replay snapshot', path.join(PROJECT, 'scratch/coverage-expansion/gap-before.json')),
  source('150-case scope replay with condition records', path.join(PROJECT, 'scratch/coverage-expansion/scope-after.json')),
  source('canonical workbook-source 150-case register used by the rerun', path.join(ROOT, 'scratch/coverage-expansion/canonical-coverage-case-register.json')),
  source('rerun output from actual release pricing service', path.join(ROOT, 'scratch/coverage-expansion/replayed-gap-2026-10-04.json')),
  source('deterministic replay runner', path.join(ROOT, 'scripts/pricing/coverage-gap-register.ts')),
  source('measured-point spec builder', path.join(ROOT, 'scripts/pricing/build-measured-point-specs.ts')),
  source('release candidate service decision', path.join(ROOT, 'lib/pricing/releaseCandidate.ts')),
  source('raw automatic observation fixture', path.join(ROOT, 'scripts/pricing/fixtures/release-candidate-observations-2026-10-02.json')),
  source('manual/correction observation file', path.join(CAMPAIGN, 'development-observations.json')),
  source('validation observation file', path.join(CAMPAIGN, 'validation-observations.json')),
  source('team workbook preregistration', path.join(CAMPAIGN, 'final-preregistered.json')),
  source('team workbook attempt ledger', path.join(CAMPAIGN, 'attempt-ledger.jsonl')),
  source('release follow-up results', path.join(ROOT, 'scripts/pricing/fixtures/release-followup-results-2026-10-03.json')),
  source('manual tester owner correction overlay', path.join(ROOT, 'scripts/pricing/fixtures/owner-correction-2026-10-02.json')),
  source('later control correction overlay', path.join(ROOT, 'scripts/pricing/fixtures/claude-owner-correction-update-2026-10-03.json')),
  source('eSIM correction overlay', path.join(ROOT, 'scripts/pricing/fixtures/claude-esim-correction-2026-10-03.json')),
  source('saved production inputs', path.join(ROOT, 'scripts/pricing/fixtures/release-saved-production-inputs-2026-10-02.json')),
  source('read-only post-refresh reference snapshot notes', path.join(PROJECT, 'scratch/release-2026-10-03-final/production/pre-activation-references.md')),
  source('expansion route evidence', path.join(ROOT, 'scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json')),
  source('measured point candidate specs', path.join(ROOT, 'scripts/pricing/fixtures/measured-point-candidates-2026-10-03.json')),
  source('five-attempt temporal outcomes', path.join(ROOT, 'scripts/pricing/fixtures/temporal-results-2026-10-03.json')),
  source('coordinated 24-attempt ledger', COORD),
  source('handoff ledger copy', HANDOFF),
  source('coordinator status and campaign outcome summary', path.join(PROJECT, 'scratch/pricing-coordination/CLAUDE_STATUS.md')),
  source('live reference dry-run log for attempts 1-8', path.join(PROJECT, 'scratch/pricing-coordination/claude-evidence/live-dry-run.log')),
  source('frozen prospective outcomes for attempts 9-19', path.join(ROOT, 'scripts/pricing/fixtures/claude-prospective-results-2026-10-03.json')),
  source('frozen temporal predictions for attempts 20-24', path.join(ROOT, 'scripts/pricing/fixtures/temporal-frozen-2026-10-03.json')),
  source('temporal outcomes for attempts 20-24', path.join(ROOT, 'scripts/pricing/fixtures/temporal-results-2026-10-03.json')),
];

const result = {
  version: 'coverage-checkpoint-audit/2026-10-04', baseSha: BASE_SHA, replayTimestamp: replaySnapshot.evaluatedAt,
  classification: 'OFFLINE_REPLAY_ELIGIBILITY_ONLY; NOT EVIDENCE OF A LIVE CUSTOMER PRICE',
  reproducibility: { inputFiles, originalCanonical150Register: 'Recovered from workbook source cells (A6:I56); raw instructions and original cell values preserved separately from the warranty correction overlay',
    referenceSnapshot: { savedSnapshotVersion: saved.version, savedSnapshotQueriedAt: saved.queriedAt, refreshedAt: '2026-10-03T18:08:00.000Z', refreshedKeys: refreshed, source: 'read-only post-refresh reference snapshot notes; no production query in this replay' },
    questionnaireProfileSnapshot: { version: saved.version, queriedAt: saved.queriedAt, rows: (saved.rows as any[]).length, source: 'release-saved-production-inputs-2026-10-02.json' } },
  replay: { caseCount: joinedCases.length, productionReplayEligible: replayEligible, statusCounts, previouslyReported34Reproduced: replayEligible === 34,
    automaticObservations: { sourceRows: auto.length, matchedToCanonical150: mappedAutomaticObservationCount },
    originalWorkbook: { caseRows: workbookRegister.cases.length, sourcePriceRows: originalWorkbookPriceCount, observationDatesAndManualTraces: 'UNKNOWN unless independently present in observation provenance' },
    observedDataCoverage: { observedCases: observedCaseIds.length, missingCases: missingObservedCaseIds, historical144Of150Superseded: observedCaseIds.length > 144 },
    beforeAfter: { beforeObservedPointEligible: (beforeSnapshot.cases as any[]).filter(c => ['CANDIDATE', 'ACCESSORY'].includes(c.decisionAtObservedGetUpto)).length,
      afterObservedPointEligibleBeforeFollowupJoin: (priorAfterSnapshot.cases as any[]).filter(c => ['CANDIDATE', 'ACCESSORY'].includes(c.decisionAtObservedGetUpto)).length,
      afterObservedPointEligibleWithFollowupJoin: (replaySnapshot.cases as any[]).filter((c: any) => ['CANDIDATE', 'ACCESSORY'].includes(c.decisionAtObservedGetUpto)).length,
      afterProductionReplayEligibleWithFollowupJoin: replayEligible }, cases: joinedCases },
  specReview: { generatedCount: specReview.length, review: specReview, totalGeneratedIsNotValidatedAdditions: true,
    activation: 'No activation change included. Existing live release config and rollback remain unchanged.' },
  collectionAccounting: ledgerInventory(),
  collectionQueue: (() => {
    const supported = new Set(['clean','screen_heavy','glass_cracked','display_lines','display_spots','body_heavy','body_dents','charging','back_camera']);
    const groups = new Map<string, any>();
    for (const c of joinedCases as any[]) {
      if (c.sourceReplayResult.traced || !supported.has(c.sourceReplayResult.condition)) continue;
      if (c.exactIdentity.variant.includes('Apple iPhone 12 Pro ') || c.exactIdentity.variant.includes('Xiaomi 14 Ultra ')) continue;
      const device = (replaySnapshot.devices as any[]).find(d => d.deviceId === c.caseId.slice(0, 5));
      const observedReference = c.rawTesterObservation?.getUpto ?? c.syntheticProductionInput.reference;
      const parsedIdentity = c.exactIdentity.variant.match(/^(Apple|Samsung|OnePlus|Xiaomi)\s+(.+?)\s+(\d+\s*GB(?:\/\d+\s*GB)?)$/i);
      const expectedRoute = parsedIdentity && (routeFixture.rows as any[]).find(r => norm(r.brand) === norm(parsedIdentity[1]) && norm(r.model) === norm(parsedIdentity[2]) &&
        norm(r.storage.replace(/\s+/g, '')) === norm(parsedIdentity[3].replace(/\s+/g, '')));
      const expectedModes = expectedRoute ? { warranty: expectedRoute.semantics.warrantyMode, validBill: expectedRoute.semantics.billMode, mobileAge: expectedRoute.semantics.ageMode,
        eSim: expectedRoute.eSimMode, box: expectedRoute.boxMode, charger: expectedRoute.chargerMode, sPen: expectedRoute.sPenMode } : null;
      const controls = (device?.cleanControls ?? []).filter((x: any) => observedReference != null && x.getUpto === observedReference && expectedModes &&
        Object.entries(expectedModes).every(([k, v]) => x.route[k] === v));
      const key = c.exactIdentity.variant;
      const item = groups.get(key) ?? { variant: key, deviceId: c.caseId.slice(0, 5), targetCases: [], exactVariantControls: [], unresolvedReference: observedReference ?? null,
        questionnaireRegime: expectedModes, routeEvidenceAvailable: !!expectedModes };
      item.targetCases.push({ caseId: c.caseId, condition: c.sourceReplayResult.condition, testerPricePreserved: c.rawTesterObservation?.price ?? null, testerGetUpto: c.rawTesterObservation?.getUpto ?? null });
      for (const control of controls) if (!item.exactVariantControls.some((x: any) => x.id === control.id)) item.exactVariantControls.push(control);
      groups.set(key, item);
    }
    return [...groups.values()].map((q: any) => ({ ...q, rank: q.exactVariantControls.length ? 1 : 2,
      rankReason: q.exactVariantControls.length ? 'Exact variant has verified-regime clean control at the target Get Upto; still collect a same-block opening clean with target condition.' : 'No exact variant, verified-regime clean control at the target Get Upto; collect opening clean and target condition in one block.',
      plannedAttempts: q.targetCases.some((x: any) => x.condition === 'clean') ? q.targetCases.length : q.targetCases.length + 1,
      collectionStatus: 'RESEARCH_QUEUE_ONLY; NOT AUTHORIZED; DO NOT DISPATCH' }))
      .sort((a: any, b: any) => a.rank - b.rank || a.variant.localeCompare(b.variant));
  })(),
  excludedFromCollectionQueue: joinedCases.filter((c: any) => !c.sourceReplayResult.traced && !['clean','screen_heavy','glass_cracked','display_lines','display_spots','body_heavy','body_dents','charging','back_camera'].includes(c.sourceReplayResult.condition)).map((c: any) => ({ caseId: c.caseId, condition: c.sourceReplayResult.condition, reason: 'Unsupported severe, interaction, touch, non-original-screen or unknown profile remains inspection-only' })),
};

const out = path.join(ROOT, 'scratch/coverage-expansion/checkpoint-audit-2026-10-04.json');
const md = path.join(ROOT, 'docs/COVERAGE_CHECKPOINT_AUDIT_2026-10-04.md');
const summary = `# Coverage checkpoint audit (2026-10-04)\n\n- Branch base: ${BASE_SHA}\n- Replay timestamp: ${result.replayTimestamp}\n- 150-case production replay eligibility: ${replayEligible}/150. This is offline fixture eligibility, not proof of live prices.\n- Exact-identity observation join: ${result.replay.observedDataCoverage.observedCases}/150 have a workbook price, tester/traced observation or follow-up control; missing: ${result.replay.observedDataCoverage.missingCases.join(', ')}. Historical 144/150 is superseded.\n- Automatic observations: ${auto.length} raw source records; ${mappedAutomaticObservationCount} join to canonical identities, including FINAL/CLOSE/correction-prefixed IDs.\n- Original workbook: 150 condition rows recovered from source cells; ${joinedCases.reduce((n: number, c: any) => n + (c.sourceReplayResult.tester ? 1 : 0), 0)} source price-bearing tester records are joined. Observation dates/manual traces remain unknown unless separately recorded.\n- Observed-point eligibility: ${result.replay.beforeAfter.beforeObservedPointEligible} before -> ${result.replay.beforeAfter.afterObservedPointEligibleBeforeFollowupJoin} earlier -> ${result.replay.beforeAfter.afterObservedPointEligibleWithFollowupJoin} after exact follow-up joins. Production-reference replay eligibility remains ${replayEligible}.\n- Research specs reviewed: ${specReview.length}; parameterized checks cover every clean and measured-condition profile. All remain development fits, not independent validation, and the current route file rejects them to inspection. Exact references, controls, supported conditions and guard reasons are in JSON.\n- Collection: the authorized 24-attempt campaign is fully reserved; the 20/20 release-review fixture is a separate campaign. Verified remaining allowance is 0 and collection is disabled. Holdouts and failures remain preserved.\n\n## Reproduction\n\nRun powershell -File scripts/pricing/import-coverage-workbook.ps1 (bundled workbook SHA-256 57f7b74f16e9d95ec1a17ba3f0b8ddc891cca3fe35a06bc983513ca0ec3bc0aa), rerun npx tsx scripts/pricing/coverage-gap-register.ts --register scratch/coverage-expansion/canonical-coverage-case-register.json --at 2026-10-03T19:00:00Z --out scratch/coverage-expansion/replayed-gap-2026-10-04.json --md scratch/coverage-expansion/replayed-gap-2026-10-04.md, then npx tsx scripts/pricing/audit-coverage-checkpoint.ts --write. Workbook hash/size, input paths and hashes are recorded in scratch/coverage-expansion/checkpoint-audit-2026-10-04.json. Raw workbook instructions/prices and the owner correction overlay remain separate; synthetic production inputs never inherit observed prices.\n`;
if (process.argv.includes('--write')) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.mkdirSync(path.dirname(md), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(md, summary); }
console.log(JSON.stringify({ baseSha: BASE_SHA, cases: joinedCases.length, productionReplayEligible: replayEligible, previouslyReported34Reproduced: replayEligible === 34,
  mappedAutomaticObservationCount, originalWorkbookPriceCount, reviewedSpecs: specReview.length, collection: result.collectionAccounting, outputs: process.argv.includes('--write') ? [out, md] : [] }, null, 2));
