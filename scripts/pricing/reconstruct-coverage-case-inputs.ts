/**
 * Reconstructs the 150 stable workbook case identities and answer-intent
 * classes from the saved checkpoint result. This is explicitly a reconstructed
 * input set: it does not replace the missing original canonical workbook
 * register or restore free-form tester answers.
 */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(__dirname, '../..');
const project = path.resolve(root, '..', '..', '..');
const gap = JSON.parse(fs.readFileSync(path.join(project, 'scratch/coverage-expansion/gap-after.json'), 'utf8'));
const saved = JSON.parse(fs.readFileSync(path.join(root, 'scripts/pricing/fixtures/release-saved-production-inputs-2026-10-02.json'), 'utf8'));

const intentByCondition: Record<string, any> = {
  clean: {},
  screen_heavy: { screenCondition: 'more_than_2_scratches' },
  glass_cracked: { screenCondition: 'cracked' },
  display_lines: { screenLines: 'visible' },
  display_spots: { screenSpots: 'large_heavy' },
  display_discoloration: { screenDiscoloration: 'major' },
  body_heavy: { bodyScratches: 'more_than_2' },
  body_dents: { bodyDents: 'major_or_more_than_2' },
  charging: { hardwareFaults: ['hw_charging'] },
  back_camera: { hardwareFaults: ['hw_back_camera'] },
  touch: { touch: { intent: 'no' } },
  original_screen: { originalScreen: { intent: 'no' } },
};
function answerIntent(condition: string) {
  if (condition.startsWith('combined:')) {
    const components = condition.slice('combined:'.length).split('+');
    return Object.assign({}, ...components.map(c => intentByCondition[c] ?? {}));
  }
  return intentByCondition[condition] ?? {};
}
const input = gap.cases.map((c: any) => {
  const d = saved.rows.find((x: any) => x.deviceId === c.deviceId);
  if (!d) throw new Error(`No saved production row for ${c.deviceId}`);
  const [brandKey] = d.expectedKey.split('|');
  const brand = ({ apple: 'Apple', samsung: 'Samsung', oneplus: 'OnePlus', xiaomi: 'Xiaomi' } as any)[brandKey] ?? brandKey;
  const fullIdentity = c.variant.slice(brand.length + 1);
  const storageMatch = fullIdentity.match(/(\d+\s*GB(?:\/\d+\s*GB)?)$/i);
  if (!storageMatch) throw new Error(`Cannot split model/storage identity: ${c.variant}`);
  const storage = storageMatch[1];
  const model = fullIdentity.slice(0, -storage.length).trim();
  return {
    caseId: c.caseId, deviceId: c.deviceId, brand, model,
    variant: storage, conditionText: c.conditionText,
    testerObservation: c.tester ? { finalSellingPrice: c.tester.price, getUpto: c.tester.getUpto, preservedRaw: true } : null,
    questionnaireIntent: answerIntent(c.condition),
    reconstruction: { sourceCaseId: c.caseId, sourceConditionClass: c.condition, sourceArtifact: 'scratch/coverage-expansion/gap-after.json', syntheticInputsSeparateFromObservations: true },
  };
});
if (input.length !== 150 || new Set(input.map((x: any) => x.caseId)).size !== 150) throw new Error('Expected 150 unique canonical case identities');
const out = path.join(root, 'scratch/coverage-expansion/reconstructed-case-register.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(input, null, 2) + '\n');
console.log(JSON.stringify({ rows: input.length, uniqueCases: new Set(input.map((x: any) => x.caseId)).size, output: out,
  warning: 'Reconstructed from saved replay labels. Restore original canonical workbook register to reproduce raw answer provenance independently.' }, null, 2));
