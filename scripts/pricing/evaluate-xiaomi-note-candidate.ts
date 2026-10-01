/** File/fixture-only reconstruction. Never loads getStore or queries a DB.
 * Preserved targets/frozen predictions are read-only. Outputs separate
 * measured-control, captured-reference and offline-reference scenarios.
 */
import fs from 'node:fs';
import path from 'node:path';
import fixture from './fixtures/xiaomi-note-additive-2026-10-01.json';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { resolveReference } from '../../lib/pricing/engine';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { calculateXiaomiNoteEvidenceCandidate, XIAOMI_NOTE_IDENTITY } from '../../lib/pricing/xiaomiNoteEvidenceCandidate';
import { calculateXiaomiEvidenceCandidate } from '../../lib/pricing/xiaomiEvidenceCandidate';
import { calculateXiaomiApplicationCandidate } from '../../lib/pricing/xiaomiApplicationCandidate';
import type { DiagnosticsType } from '../../lib/pricingCalculator';

const now = new Date('2026-10-01T18:00:00Z');
const q = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as const;
const local = JSON.parse(fs.readFileSync(path.resolve('server/data/reference-prices/store.json'), 'utf8'));
const clean = fixture.cases.find(r => r.id === 'N-OPEN')!;
const price = (r: ReturnType<typeof calculateXiaomiEvidenceCandidate>) => r.supported ? r.quote.cashifyConditionEquivalent : null;
const rows = fixture.cases.map(r => {
  const device = findCatalogDevice('Xiaomi', r.model, r.storage)!;
  const reference = resolveReference({ device, repositoryRecord: local.records[deviceKey(device)] as ReferencePriceRecord ?? null, now });
  const d = r.diagnostics as DiagnosticsType;
  const isNote = r.model === XIAOMI_NOTE_IDENTITY.model;
  const raw = (R: number) => isNote ? calculateXiaomiNoteEvidenceCandidate({ model: r.model, storage: r.storage, diagnostics: d,
    questionnaire: q, eSimNotAsked: true, baseline: { kind: 'get_upto', reference: R } })
    : calculateXiaomiEvidenceCandidate(r.model, r.storage, R, d, q, true);
  const measured = isNote ? calculateXiaomiNoteEvidenceCandidate({ model: r.model, storage: r.storage, diagnostics: d,
    questionnaire: q, eSimNotAsked: true, baseline: { kind: 'measured_clean_control', reference: r.reference, cleanSellingPrice: clean.cashify } }) : null;
  const gate = calculateXiaomiApplicationCandidate({ model: r.model, storage: r.storage, reference, diagnostics: d,
    questionnaire: { ...q, source: 'profile' }, eSimMode: 'NOT_ASKED', now });
  const offline = reference ? price(raw(reference.cashifyGetUptoReference)) : null;
  return { id: r.id, role: r.role, model: r.model, storage: r.storage, status: r.status, cashify: r.cashify,
    originalINR: r.originalPredictions.INR, frozenAdditive: r.additiveFrozenPrediction,
    measuredCleanDiagnostic: measured ? price(measured) : null, capturedGetUptoCandidate: price(raw(r.reference)),
    offlineReference: reference, offlineRawCandidate: offline, offlineSignedError: offline === null ? null : offline - r.cashify,
    offlineAPE: offline === null ? null : Math.abs(offline - r.cashify) / r.cashify * 100,
    applicationGate: gate.supported ? { supported: true, price: gate.quote.cashifyConditionEquivalent } : gate };
});
function metrics(values: typeof rows, field: 'capturedGetUptoCandidate' | 'offlineRawCandidate' | 'measuredCleanDiagnostic') {
  const errors = values.filter(r => r[field] !== null).map(r => ({ error: r[field]! - r.cashify, ape: Math.abs(r[field]! - r.cashify) / r.cashify * 100 }));
  return { n: errors.length, MAPE: errors.length ? errors.reduce((s, e) => s + e.ape, 0) / errors.length : null,
    maxAPE: errors.length ? Math.max(...errors.map(e => e.ape)) : null,
    MAE: errors.length ? errors.reduce((s, e) => s + Math.abs(e.error), 0) / errors.length : null,
    overpayments: errors.filter(e => e.error > 0).length, underpayments: errors.filter(e => e.error < 0).length,
    within3: errors.filter(e => e.ape <= 3).length };
}
const holdouts = rows.filter(r => r.model === XIAOMI_NOTE_IDENTITY.model && r.role === 'holdout');
console.log(JSON.stringify({ evaluatedAt: now.toISOString(), databaseUsed: false,
  warning: 'Offline numeric scenarios assume the verified research route; production profile availability remains unqueried. Reproduction of old holdouts is not NEW independent validation.',
  noteFrozenHoldouts: { measuredControl: metrics(holdouts, 'measuredCleanDiagnostic'), capturedReference: metrics(holdouts, 'capturedGetUptoCandidate'),
    offlineReference: metrics(holdouts, 'offlineRawCandidate'), gatedNumericCoverage: holdouts.filter(r => r.applicationGate.supported).length },
  rows, priorNoteOutcomes: fixture.priorNoteObservations, priorRoutingOnlyAttempts: fixture.priorRoutingOnlyAttempts,
}, null, 2));
