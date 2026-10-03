/**
 * Claude-owned independent audit of the 171-row release observation fixture
 * (scripts/pricing/fixtures/release-candidate-observations-2026-10-02.json).
 * Checks each row against its raw collector record, re-hashes the screenshot
 * on disk, finds duplicates/repeats and matched clean controls. A row in the
 * fixture is evidence of a capture, not an independent pricing validation.
 *
 *   npx tsx scripts/pricing/claude-observation-audit.ts [--evidence-root <dir>]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fixture from './fixtures/release-candidate-observations-2026-10-02.json';
import { conditionClass } from '../../lib/pricing/releaseCandidate';

const arg = process.argv.indexOf('--evidence-root');
const root = path.resolve(arg > 0 ? process.argv[arg + 1] : '../../../scratch/cashify-matrix-integration/research-evidence');
const raw: Record<string, any[]> = {};
const load = (job: string) => (raw[job] ??= JSON.parse(fs.readFileSync(path.join(root, job, 'observations.json'), 'utf8')));
const sha = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rows: any[] = (fixture as any).observations;

const issues: any[] = []; const perRow: any[] = [];
for (const r of rows) {
  const src = load(r.job).filter((o) => o.experimentId === r.experimentId);
  // Retries reuse an experimentId: audit the completed record, report earlier failures.
  const s = src.find((o) => o.status === 'COMPLETED' && (o.finalPrice ?? o.finalSellingPrice) === r.observed) ?? src[0];
  const finalPrice = s?.finalPrice ?? s?.finalSellingPrice, gu = s?.getUptoAtCollection ?? s?.getUpto;
  const evidenceFile = s?.evidenceRef && fs.existsSync(s.evidenceRef) ? s.evidenceRef : null;
  const check = {
    id: r.id, sourceRecords: src.length, earlierNonCompletedRecords: src.filter((o) => o !== s && o.status !== 'COMPLETED').length, status: s?.status ?? null,
    priceMatches: finalPrice === r.observed, getUptoMatches: gu === r.getUpto, timeMatches: s?.collectedAt === r.collectedAt,
    shaMatchesSource: (s?.evidenceSha256 ?? null) === r.screenshotSha256,
    screenshotOnDisk: !!evidenceFile, screenshotRehashMatches: evidenceFile ? sha(evidenceFile) === r.screenshotSha256 : null,
    role: r.provenance?.evaluationRole ?? null, claimsIndependentSuccess: r.provenance?.independentPricingSuccess === true,
  };
  perRow.push(check);
  const bad = Object.entries({ singleCompletedSource: src.filter((o) => o.status === 'COMPLETED').length === 1, completed: s?.status === 'COMPLETED', price: check.priceMatches, getUpto: check.getUptoMatches,
    time: check.timeMatches, sha: check.shaMatchesSource, rehash: check.screenshotRehashMatches !== false, noIndependentClaim: !check.claimsIndependentSuccess })
    .filter(([, ok]) => !ok).map(([k]) => k);
  if (bad.length) issues.push({ id: r.id, failed: bad });
}

const group = (key: (r: any) => string) => { const m: Record<string, string[]> = {}; for (const r of rows) (m[key(r)] ??= []).push(r.id); return Object.entries(m).filter(([, ids]) => ids.length > 1); };
const duplicateIds = group((r) => r.id);
const sharedScreenshots = group((r) => r.screenshotSha256);
const answerSig = (r: any) => JSON.stringify(r.diagnostics);
const repeats = group((r) => `${r.brand}|${r.model}|${r.storage}|${JSON.stringify(r.route)}|${answerSig(r)}|${r.getUpto}`);

const routeSig = (r: any) => JSON.stringify(r.route);
const controls = rows.filter((r) => { try { return conditionClass(r.diagnostics) === 'clean'; } catch { return false; } });
const unmatched: any[] = []; let damaged = 0;
for (const r of rows) {
  let cls: string; try { cls = conditionClass(r.diagnostics); } catch { cls = 'unknown'; }
  if (cls === 'clean') continue;
  damaged++;
  const near = controls.filter((c) => c.brand === r.brand && c.model === r.model && c.storage === r.storage && c.getUpto === r.getUpto &&
    routeSig(c) === routeSig(r) && Math.abs(Date.parse(c.collectedAt) - Date.parse(r.collectedAt)) <= 6 * 3600e3 &&
    JSON.stringify([...(c.diagnostics.accessories ?? [])].sort()) === JSON.stringify([...(r.diagnostics.accessories ?? [])].sort()));
  if (!near.length) unmatched.push({ id: r.id, conditionClass: cls, getUpto: r.getUpto });
}

const roles: Record<string, number> = {}; for (const c of perRow) roles[c.role ?? 'none'] = (roles[c.role ?? 'none'] ?? 0) + 1;
const out = {
  fixtureRows: rows.length, evidenceRoot: 'scratch/cashify-matrix-integration/research-evidence (ignored, local)',
  sourceCheck: { rowsWithIssues: issues.length, issues, screenshotsRehashed: perRow.filter((c) => c.screenshotRehashMatches === true).length,
    screenshotsMissingOnDisk: perRow.filter((c) => !c.screenshotOnDisk).map((c) => c.id),
    retriedIds: perRow.filter((c) => c.earlierNonCompletedRecords > 0).map((c) => ({ id: c.id, earlierNonCompleted: c.earlierNonCompletedRecords })) },
  duplicates: { duplicateRowIds: duplicateIds, sharedScreenshotGroups: sharedScreenshots.map(([sha, ids]) => ({ sha, ids })),
    repeatedIdenticalObservationGroups: repeats.length, rowsInRepeatGroups: repeats.reduce((n, [, ids]) => n + ids.length, 0),
    independentObservationUnits: rows.length - repeats.reduce((n, [, ids]) => n + ids.length - 1, 0) },
  matchedControls: { damagedRows: damaged, withMatchedCleanControl: damaged - unmatched.length, unmatched },
  roles,
};
fs.writeFileSync('scripts/pricing/fixtures/claude-observation-audit-2026-10-03.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ rows: rows.length, rowsWithIssues: issues.length, issueKinds: [...new Set(issues.flatMap((i) => i.failed))],
  rehashed: out.sourceCheck.screenshotsRehashed, missingOnDisk: out.sourceCheck.screenshotsMissingOnDisk.length, duplicateIds: duplicateIds.length,
  sharedScreenshotGroups: sharedScreenshots.length, repeatGroups: repeats.length, independentUnits: out.duplicates.independentObservationUnits,
  damaged, matched: damaged - unmatched.length, unmatched: unmatched.length, roles }));
