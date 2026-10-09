/** Admission inventory only. Does not replay prices, request quotes or access a database. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { existingExactFinalQuoteEvidence, existingExactFinalQuoteIndex } from './exact-final-quote-evidence';
import { workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';

const source = path.resolve(__dirname, 'fixtures/release-candidate-observations-2026-10-02.json');
const rows = existingExactFinalQuoteEvidence();
const index = existingExactFinalQuoteIndex();
const rejectedIds = new Set(index.rejected.map(row => row.id));
const admitted = rows.filter(row => !rejectedIds.has(row.id));
const variants = [...new Set(admitted.map(row => `${row.brand}|${row.model}|${workbookStorageIdentity(row.storage)}`))].sort();
const saved = JSON.parse(readFileSync(path.resolve(__dirname, '../../scratch/agent-z-release-validation/stored-coverage-summary.json'), 'utf8'));
console.log(JSON.stringify({
  classification: 'ADMISSION_INVENTORY_ONLY_NOT_CURRENT_RUNTIME_COVERAGE_OR_INDEPENDENT_ACCURACY',
  source: path.basename(source), sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
  importedRows: rows.length, admittedRows: admitted.length, rejectedRows: index.rejected,
  canonicalBuckets: index.size, variantCount: variants.length, variants,
  admittedEvidenceIds: admitted.map(row => row.id).sort(),
  frozenOctober7Comparison: { source: saved.source, captured: saved.capturedExact, savedPublic: saved.savedPublicExact, gaps: saved.gaps },
  claimed11842: { verified: false, reason: 'No source fixture or exact ID list substantiates five additional combinations on five variants.' },
}, null, 2));
