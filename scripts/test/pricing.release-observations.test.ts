import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/release-candidate-observations-2026-10-02.json';
import routes from '../pricing/fixtures/release-route-evidence-2026-10-02.json';
import { observationRouteMode } from '../pricing/releaseObservationSemantics';

let checks = 0;
for (const [questions, expected] of [
  [[], 'UNKNOWN'],
  [[{ factorId: 'warranty', status: 'UNKNOWN' }], 'UNKNOWN'],
  [[{ factorId: 'warranty', status: 'unexpected' }], 'UNKNOWN'],
  [[{ factorId: 'box', status: 'NOT_ASKED' }], 'UNKNOWN'],
  [[{ factorId: 'warranty', status: 'ASKED' }], 'ASKED'],
  [[{ factorId: 'warranty', status: 'NOT_ASKED' }], 'NOT_ASKED'],
  [[{ factorId: 'warranty', status: 'ASKED' }, { factorId: 'warranty', status: 'NOT_ASKED' }], 'UNKNOWN'],
] as const) {
  assert.equal(observationRouteMode(questions, 'warranty'), expected); checks++;
}
assert.equal(fixture.observations.length, 171); checks++;
assert.equal(new Set(fixture.observations.map(o => o.id)).size, 171); checks++;
assert.equal(fixture.observations.filter(o => 'excluded' in o).length, 3); checks++;
assert.equal(fixture.manualInterpretation.rawMeasurementCount, 66); checks++;
for (const row of fixture.manualInterpretation.observations) {
  assert.equal(row.finalPrice, row.provenance.priceOriginalValue);
  assert.equal(row.questionnaireIntent.warranty.intent, row.caseId.endsWith('_A') ? 'yes' : 'no');
  assert.equal(row.provenance.type, 'TESTER_REPORTED');
  assert.equal(row.observedAt, null); checks += 4;
}
assert.equal(routes.rows.length, 8); checks++;
for (const r of routes.rows) {
  const o = fixture.observations.find(row => row.id === r.observationId);
  assert(o);
  assert.equal(o.provenance.screenshotVerified, true);
  assert.equal(o.provenance.planMatched, true);
  assert.equal(o.provenance.routeComplete, true);
  assert.equal(r.evidenceSha256, o.screenshotSha256);
  assert.equal(r.observedAt, o.collectedAt);
  assert.deepEqual(r.semantics, { warrantyMode: o.route.warranty, billMode: o.route.validBill, ageMode: o.route.mobileAge });
  assert.equal(r.chargerMode, o.route.charger);
  assert.equal(r.boxMode, o.route.box);
  assert.equal(r.eSimMode, o.route.eSim);
  assert.equal(r.sPenMode, o.route.sPen); checks += 11;
}
console.log(`PASS release observation semantics and provenance ${checks} assertions`);
