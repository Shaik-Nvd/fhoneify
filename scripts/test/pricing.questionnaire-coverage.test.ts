/**
 * Questionnaire coverage (2026-09-24).
 *
 * QA reported that most models never get asked the warranty or GST-bill
 * questions in the quote flow (app/quote/page.tsx), because the eligibility
 * gate there used to be a hand-maintained allowlist of "recent" models,
 * unrelated to what the pricing engine (lib/pricingCalculator.ts) actually
 * reads. When a question is skipped, the UI silently sends a default
 * (warranty=false, validBill=false, mobileAge='above11'), which can change
 * the price without the customer ever being asked.
 *
 * This suite verifies, for every device in the catalog, that whichever
 * inputs the ACTIVE pricing path is empirically sensitive to are exactly
 * the inputs lib/pricing/questionnaire.ts (and therefore app/quote/page.tsx,
 * which calls the same function) asks for.
 *
 * Run: npm run test:pricing:questionnaire   (no database needed)
 */
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice, DiagnosticsType } from '../../lib/pricingCalculator';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { questionnaireFor } from '../../lib/pricing/questionnaire';
import { SEED_DEVICES } from '../../lib/seed_devices';
import type { CatalogDevice } from '../../lib/pricing/catalog';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

const REFERENCE = 30000;

function priceOf(brand: string, model: string, diagnostics: DiagnosticsType): number {
  return calculateFhoneifyPrice(brand, model, REFERENCE, diagnostics).fhoneifyPrice;
}

/**
 * Does this device's active pricing path change when `warranty` is
 * answered false instead of true, all else held at the perfect baseline?
 */
function dependsOnWarranty(brand: string, model: string): boolean {
  const base: DiagnosticsType = { ...PERFECT_CONDITION_DIAGNOSTICS, warranty: true };
  const flipped: DiagnosticsType = { ...base, warranty: false };
  return priceOf(brand, model, base) !== priceOf(brand, model, flipped);
}

/**
 * Does this device's active pricing path change when `validBill` is
 * answered false instead of true? The 'bill' accessory is stripped from
 * both sides so the accessory shortcut (`accessories.includes('bill')`)
 * cannot mask the validBill flag itself.
 */
function dependsOnBill(brand: string, model: string): boolean {
  const accessories = PERFECT_CONDITION_DIAGNOSTICS.accessories.filter((a) => a !== 'bill');
  const base: DiagnosticsType = { ...PERFECT_CONDITION_DIAGNOSTICS, warranty: true, validBill: true, accessories };
  const flipped: DiagnosticsType = { ...base, validBill: false };
  return priceOf(brand, model, base) !== priceOf(brand, model, flipped);
}

/**
 * Does this device's active pricing path change across the age brackets the
 * UI actually offers ('below3' / '3to6' / '6to11' / 'above11')? Checked both
 * with warranty true and warranty false, since some brands (Apple, Xiaomi,
 * OnePlus) treat mobileAge === 'above11' as forcing out-of-warranty pricing
 * even when warranty === true.
 */
function dependsOnAge(brand: string, model: string): boolean {
  const ages = ['below3', '3to6', '6to11', 'above11'];
  for (const warranty of [true, false]) {
    const prices = ages.map((mobileAge) =>
      priceOf(brand, model, { ...PERFECT_CONDITION_DIAGNOSTICS, warranty, mobileAge })
    );
    if (new Set(prices).size > 1) return true;
  }
  return false;
}

interface Mismatch {
  brand: string;
  model: string;
  field: 'warranty' | 'validBill' | 'mobileAge';
}

function auditCatalog(devices: CatalogDevice[]) {
  const seen = new Set<string>();
  const mismatches: Mismatch[] = [];
  let checked = 0;

  for (const device of devices) {
    const key = `${device.brand}|${device.model}`;
    if (seen.has(key)) continue; // storage does not affect any of these branches
    seen.add(key);
    checked++;

    const elig = questionnaireFor(device);

    if (dependsOnWarranty(device.brand, device.model) && !elig.asksWarranty) {
      mismatches.push({ brand: device.brand, model: device.model, field: 'warranty' });
    }
    if (dependsOnBill(device.brand, device.model) && !elig.asksBill) {
      mismatches.push({ brand: device.brand, model: device.model, field: 'validBill' });
    }
    if (dependsOnAge(device.brand, device.model) && !elig.asksAge) {
      mismatches.push({ brand: device.brand, model: device.model, field: 'mobileAge' });
    }
  }

  return { checked, mismatches };
}

function run() {
  console.log('\nSuite Q - Questionnaire coverage\n');

  const devices = SEED_DEVICES as CatalogDevice[];

  test('every catalog device: engine dependency on warranty/bill/age is a subset of what the UI asks', () => {
    const { checked, mismatches } = auditCatalog(devices);
    assert.ok(checked > 1000, `checked only ${checked} distinct brand/model pairs`);
    if (mismatches.length > 0) {
      const byBrand = new Map<string, number>();
      for (const m of mismatches) byBrand.set(m.brand, (byBrand.get(m.brand) ?? 0) + 1);
      const summary = [...byBrand.entries()].map(([b, n]) => `${b}: ${n}`).join(', ');
      const examples = mismatches.slice(0, 10).map((m) => `${m.brand} ${m.model} (${m.field})`).join('; ');
      assert.fail(`${mismatches.length} mismatches - ${summary} - e.g. ${examples}`);
    }
  });

  test("Samsung Galaxy A57 5G: engine is warranty/bill sensitive, so the UI must ask both", () => {
    const device = devices.find((d) => d.brand === 'Samsung' && d.model === 'Samsung Galaxy A57 5G');
    assert.ok(device, 'Samsung Galaxy A57 5G missing from catalog');
    assert.ok(dependsOnWarranty(device!.brand, device!.model), 'engine should be warranty-sensitive');
    assert.ok(dependsOnBill(device!.brand, device!.model), 'engine should be bill-sensitive');
    const elig = questionnaireFor(device!);
    assert.equal(elig.asksWarranty, true, 'A57 5G must ask warranty');
    assert.equal(elig.asksBill, true, 'A57 5G must ask GST bill');
  });

  test('Vivo X200 FE: engine is warranty/bill/age sensitive, so the UI must ask all three', () => {
    const device = devices.find((d) => d.brand === 'Vivo' && d.model === 'Vivo X200 FE');
    assert.ok(device, 'Vivo X200 FE missing from catalog');
    assert.ok(dependsOnWarranty(device!.brand, device!.model), 'engine should be warranty-sensitive');
    assert.ok(dependsOnBill(device!.brand, device!.model), 'engine should be bill-sensitive');
    assert.ok(dependsOnAge(device!.brand, device!.model), 'engine should be age-sensitive (non-fold Vivo)');
    const elig = questionnaireFor(device!);
    assert.equal(elig.asksWarranty, true, 'X200 FE must ask warranty');
    assert.equal(elig.asksBill, true, 'X200 FE must ask GST bill');
    assert.equal(elig.asksAge, true, 'X200 FE must ask mobile age');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
