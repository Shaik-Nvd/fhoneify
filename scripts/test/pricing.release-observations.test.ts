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
// The reviewed fixture expanded from eight routes to 21; validate provenance for every row below.
assert.equal(routes.rows.length, 21); checks++;
for (const r of routes.rows) {
  // Expanded routes may identify their source by the verified screenshot rather than observationId.
  const id = 'observationId' in r ? r.observationId : null;
  const matched = fixture.observations.filter(row => id ? row.id === id :
    row.screenshotSha256 === r.evidenceSha256 && row.collectedAt === r.observedAt && row.brand === r.brand && row.model === r.model && row.storage === r.storage);
  assert.equal(matched.length, 1, `Exactly one preserved observation must support ${r.brand} ${r.model} ${r.storage}`);
  const o = matched[0];
  assert(!('excluded' in o), 'Excluded observations cannot supply reviewed route provenance');
  assert.equal(o.provenance.screenshotVerified, true);
  assert.equal(o.provenance.planMatched, true);
  assert.equal(o.provenance.routeComplete, true);
  assert.equal(r.evidenceSha256, o.screenshotSha256);
  assert.equal(r.observedAt, o.collectedAt);
  assert.deepEqual(r.semantics, { warrantyMode: o.route.warranty, billMode: o.route.validBill, ageMode: o.route.mobileAge });
  assert.equal(r.chargerMode, o.route.charger);
  assert.equal(r.boxMode, o.route.box);
  assert.equal(r.eSimMode, o.route.eSim);
  assert.equal(r.sPenMode, o.route.sPen); checks += 12;
}
console.log(`PASS release observation semantics and provenance ${checks} assertions`);
