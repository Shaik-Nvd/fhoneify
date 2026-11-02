/**
 * Fit the Apple Cashify-model calibration from every usable measurement and (optionally) write it.
 *
 *   npx tsx scripts/pricing-evidence/fit-calibration.ts            # print the fit report only
 *   npx tsx scripts/pricing-evidence/fit-calibration.ts --write    # also write calibration.json
 *
 * The committed calibration.json is produced from ALL data. The honest accuracy figures come from
 * validate-evidence-engine.ts, which refits on training partitions only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { EVIDENCE_DIR, hasUnknownInput, loadMeasurements } from './evidenceLib';
import { fitCalibration } from './fitCalibration';

const write = process.argv.includes('--write');
if (write && !fs.existsSync(path.join(EVIDENCE_DIR, 'measurements-2026-10-30.jsonl'))) {
  throw new Error('Full iPhone refit requires the owner-supplied private final measurements. Existing calibration was not changed. See docs/pricing-handbook/README.md.');
}
const ms = loadMeasurements().filter(m => !hasUnknownInput(m));
const { calibration, reports } = fitCalibration(ms, 'data/pricing-evidence/measurements.jsonl + measurements-2026-10-28.jsonl + live-check-2026-10-28.jsonl + measurements-2026-10-30.jsonl; duplicate measurement IDs counted once (' + ms.length + ' usable measurements)');
for (const r of reports) {
  console.log(`\n${r.modelKey}: rows=${r.rows} used=${r.used} rmse=₹${r.rmse.toFixed(0)} max=₹${r.maxAbs.toFixed(0)} floor=${r.floor ? r.floor.basis + ':' + r.floor.value : '-'}`);
  console.log('  ' + Object.entries(r.params).map(([k, v]) => `${k}=${Math.abs(v.value) < 5 ? v.value.toFixed(4) : v.value.toFixed(0)}${v.support === 'measured' ? '' : '?'}[${v.shapes}]`).join('  '));
}
fs.writeFileSync(path.join(EVIDENCE_DIR, 'fit_report.json'), JSON.stringify(reports, null, 1) + '\n');
if (write) {
  const out = path.resolve(__dirname, '../../lib/pricing/appleCashifyModel/calibration.json');
  fs.writeFileSync(out, JSON.stringify(calibration, null, 1) + '\n');
  console.log('\nwrote', out);
}
