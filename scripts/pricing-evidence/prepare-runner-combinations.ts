import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { evaluateRunner, modelKey } from '../../lib/pricing/cashifyRunnerModel/model';

/** Future observations are scored against these frozen rules BEFORE any refit. */
const cases: [string, object][] = [
  ['Age above 11 + cracked glass', { mobileAge: 'above11', screenCondition: 'Screen cracked/ glass broken' }],
  ['Non-original screen + cracked glass', { originalScreen: false, screenCondition: 'Screen cracked/ glass broken' }],
  ['Touch No + cracked glass', { touch: false, screenCondition: 'Screen cracked/ glass broken' }],
  ['Heavy spots + visible lines', { screenSpots: 'Large/ heavy visible spots on screen', screenLines: 'Visible line(s) on display' }],
  ['Body scratches + major dents', { bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2' }],
  ['Panel cracked + bent', { bodyPanel: 'Cracked/ broken side or back panel', bodyBent: 'Bent/ curved panel' }],
  ['Cracked glass + panel cracked', { screenCondition: 'Screen cracked/ glass broken', bodyPanel: 'Cracked/ broken side or back panel' }],
  ['Front + back camera', { hardware: ['front_camera', 'back_camera'] }],
  ['Wi-Fi + Bluetooth', { hardware: ['wifi', 'bluetooth'] }],
  ['Fingerprint + Wi-Fi', { hardware: ['fingerprint', 'wifi'] }],
  ['Missing box + age above 11', { accessories: ['charger'], mobileAge: 'above11' }],
  ['Warranty No + below 3', { warranty: false, mobileAge: 'below3' }],
  ['Warranty No + age 3 to 6', { warranty: false, mobileAge: '3to6' }],
  ['Warranty No + age 6 to 11', { warranty: false, mobileAge: '6to11' }],
  ['Warranty No + above 11', { warranty: false, mobileAge: 'above11' }],
  ['Five independent faults', { screenCondition: 'Screen cracked/ glass broken', bodyDents: 'Major dent(s) or more than 2', hardware: ['back_camera', 'battery_service', 'wifi'] }],
  ['Calls No + back camera', { calls: false, hardware: ['back_camera'] }],
  ['Missing charger + old age', { accessories: ['box'], mobileAge: 'above11' }],
  ['Missing panel + touch No', { bodyPanel: 'Missing side or back panel', touch: false }],
  ['Chipped glass + heavy spots', { screenCondition: 'Chipped/cracked outside display area', screenSpots: 'Large/ heavy visible spots on screen' }],
  ['Back camera + battery', { hardware: ['back_camera', 'battery_service'] }],
  ['Touch No + heavy spots', { touch: false, screenSpots: 'Large/ heavy visible spots on screen' }],
  ['Non-original screen + visible lines', { originalScreen: false, screenLines: 'Visible line(s) on display' }],
  ['Missing box and charger + Wi-Fi', { accessories: [], hardware: ['wifi'] }],
  ['Panel cracked + age 6 to 11', { bodyPanel: 'Cracked/ broken side or back panel', mobileAge: '6to11' }],
];
const variants = [
  ['Nothing', 'Nothing Phone 1', '8 GB/128 GB', 'P1'], ['Nothing', 'Nothing Phone 2a 5G', '8 GB/128 GB', 'A'], ['Nothing', 'Nothing Phone 3a', '8 GB/128 GB', 'B'],
  ['OnePlus', 'OnePlus 8', '8 GB/128 GB', 'old/no age'], ['OnePlus', 'OnePlus 12R', '8 GB/128 GB', 'middle'], ['OnePlus', 'OnePlus 13', '12 GB/256 GB', 'new'],
];
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6) ?? 'release-test-logs/android/frozen-combinations-v2';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync('docs/next-quotes', { recursive: true });
const modelBytes = fs.readFileSync('lib/pricing/cashifyRunnerModel/model.ts');
const modelHash = createHash('sha256').update(modelBytes).digest('hex');
if (fs.existsSync(`${out}/model.ts.txt`) && !fs.readFileSync(`${out}/model.ts.txt`).equals(modelBytes)) throw new Error('Frozen model implementation differs; version the collection before regenerating');
fs.writeFileSync(`${out}/model.ts.txt`, modelBytes);
for (const brand of ['Nothing', 'OnePlus']) {
  const name = `calibration.${brand.toLowerCase()}.json`;
  const bytes = fs.readFileSync(`lib/pricing/cashifyRunnerModel/${name}`);
  if (!fs.existsSync(`${out}/${name}`)) fs.writeFileSync(`${out}/${name}`, bytes);
  else if (!fs.readFileSync(`${out}/${name}`).equals(bytes)) throw new Error('Frozen collection rules already differ; preserve and version the existing collection');
  const calibration = JSON.parse(bytes.toString('utf8'));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const privateDir = `data/pricing-evidence/${brand === 'Nothing' ? 'nothing-2026-11-08' : 'oneplus-2026-11-09'}`;
  const ms = fs.readFileSync(`${privateDir}/measurements.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const predictions: any[] = [];
  const doc = [`# ${brand} combination collection`, '', `Frozen calibration SHA-256: \`${hash}\`.`, `Frozen model implementation SHA-256: \`${modelHash}\`.`, '',
    'Collect the following planned combinations on each listed variant. These are synthetic plans, not Cashify observations. Keep a flawless control before and after each session; record the full offered/selected answer path, base, Selling, fees, timestamp and the session reference. An unavailable question stays unavailable. Do not invent a selection to follow this list.', '',
    'The age/warranty rows deliberately test branch interactions. Phone 1 and older OnePlus models do not ask age/warranty: record those rows as not applicable, not as measured zero deductions. A variant without a charger question likewise marks charger-only rows unavailable.', '',
    'Private frozen predictions are under release-test-logs/android/frozen-combinations-v2. They use the earlier session reference only for planning. Re-score the same frozen parameters at the new explicitly observed reference before comparing; do not refit first. Only independently collected combinations can change support from inferred to measured.', '',
    '| Variant | Profile |', '|---|---|', ...variants.filter(v => v[0] === brand).map(v => `| ${v[1]} ${v[2]} | ${v[3]} |`), '',
    '| ID | Planned answers changed from flawless |', '|---|---|', ...cases.map(([label], i) => `| C${String(i + 1).padStart(2, '0')} | ${label} |`), '',
    'Keep all unlisted answers at the actual flawless control values. Collect another flawless retest after any suspicious result. A failed quote, unavailable question and genuine no-offer are separate outcomes.', ''];
  for (const [, model, storage] of variants.filter(v => v[0] === brand)) {
    const baseline = ms.find(m => m.model.toLowerCase() === model.toLowerCase() && m.storage === storage && m.caseId === 'baseline');
    if (!baseline) throw new Error(`Missing collection baseline: ${model} ${storage}`);
    cases.forEach(([label, changes], i) => {
      const diagnostics = { ...clean, ...baseline.diagnostics, ...changes };
      predictions.push({ brand, model, storage, caseId: `C${String(i + 1).padStart(2, '0')}`, label, reference: baseline.reference,
        diagnostics, expected: evaluateRunner(calibration.profiles[modelKey(model)], baseline.reference, diagnostics, storage), status: 'planned-not-observed', calibrationSha256: hash });
    });
  }
  if (brand === 'OnePlus') {
    doc.push('Extra cheap-display cap probe: OnePlus 6 6 GB/64 GB, cracked glass + heavy spots. Capture a clean control and all fees. This distinguishes overlapping display repair from a summed display charge.', '');
    const baseline = ms.find(m => m.model === 'OnePlus 6' && m.storage === '6 GB/64 GB' && m.caseId === 'baseline');
    if (baseline) { const diagnostics = { ...baseline.diagnostics, screenCondition: 'Screen cracked/ glass broken', screenSpots: 'Large/ heavy visible spots on screen' };
      predictions.push({ brand, model: baseline.model, storage: baseline.storage, caseId: 'CAP01', reference: baseline.reference, diagnostics,
        expected: evaluateRunner(calibration.profiles[modelKey(baseline.model)], baseline.reference, diagnostics, baseline.storage), status: 'planned-not-observed', calibrationSha256: hash }); }
  }
  fs.writeFileSync(`${out}/${brand.toLowerCase()}-predictions.jsonl`, predictions.map(p => JSON.stringify(p)).join('\n') + '\n');
  fs.writeFileSync(`docs/next-quotes/${brand.toLowerCase()}-combinations.md`, doc.join('\n'));
  console.log(`${brand}: ${predictions.length} planned combinations; no observations or support promoted`);
}
