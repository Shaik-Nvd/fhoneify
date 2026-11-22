import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateRunner } from '../pricing-evidence/validate-cashify-runner';
import { fitCalibration } from '../pricing-evidence/fit-cashify-runner-calibration';

(async () => {
  for (const brand of ['Nothing', 'OnePlus'] as const) {
    const dir = `data/pricing-evidence/${brand === 'Nothing' ? 'nothing-2026-11-08' : 'oneplus-2026-11-09'}`;
    const input = `${dir}/measurements.jsonl`;
    if (!fs.existsSync(input)) { console.log(`SKIP ${brand}: private owner-supplied runner evidence absent`); continue; }
    const rows = fs.readFileSync(input, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const fitted = fitCalibration(rows, brand);
    const stored = JSON.parse(fs.readFileSync(`lib/pricing/cashifyRunnerModel/calibration.${brand.toLowerCase()}.json`, 'utf8'));
    // OnePlus 9RT 5G was replaced by the owner-approved 16 Nov rerun (mergeOnePlus9RT, oneplus-2026-11-16 corpus),
    // which changes the stored sourceHash; every other profile must reproduce from this corpus exactly.
    if (brand === 'OnePlus') { delete fitted.profiles.oneplus9rt5g; delete stored.profiles.oneplus9rt5g; delete (fitted as any).sourceHash; delete stored.sourceHash; }
    assert.deepEqual(fitted, stored, 'calibration must be reproducibly derived from observations');
    // The OnePlus service validation predates the approved 9RT rerun (its pending 9RT cases now have a
    // measured profile); OnePlus replay is covered by pricing.all-corpora-replay.test.ts.
    if (brand === 'OnePlus') { console.log('PASS OnePlus calibration reproduces from its corpus (9RT rerun excluded)'); continue; }
    const result = await validateRunner(brand, input, `${dir}/validation`);
    assert.equal(result.pricedInput, brand === 'Nothing' ? 1671 : 5539);
    assert.equal(result.pending, brand === 'Nothing' ? 0 : 28);
    assert(result.gates.replay, `${brand} service reconciliation gate`);
    assert(result.gates.leaveOneStorageOut, `${brand} storage holdout gate`);
    console.log(`PASS ${brand}: ${result.pricedInput} service rows, holdout ${(result.leaveOneStorageOut.within20! * 100).toFixed(2)}% within INR20 (conditional on frozen rule structure)`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
