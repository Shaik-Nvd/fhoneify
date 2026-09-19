/**
 * Pricing engine regression / golden tests.
 *
 * Purpose: freeze the EXISTING Fhoneify pricing behavior (per
 * PRODUCTION_READINESS_AUDIT.md / the pricing-preservation mandate) so any
 * future change to lib/pricingCalculator.ts is caught immediately if it
 * silently alters a quote.
 *
 * These are golden values captured from the current, already-verified
 * implementation - they are NOT independently derived from a spec. If a
 * test here fails after a change, that means the change altered pricing
 * behavior. That is not automatically wrong, but per the pricing-freeze
 * rule it must be a deliberate, reviewed business decision, not an
 * accidental side effect of a refactor - do not just update the expected
 * value to make the test pass without understanding why the output moved.
 *
 * Run: npm run test:pricing
 * No test framework dependency is required - this uses node:assert and
 * exits non-zero on failure so it works in CI without adding Jest/Vitest.
 */
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';

type DiagOverrides = Record<string, unknown>;

function diag(overrides: DiagOverrides = {}) {
  return {
    calls: true, touch: true, originalScreen: true,
    defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
    bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
    hardware: [], accessories: ['box', 'bill'],
    warranty: true, validBill: true, eSim: null, mobileAge: 'below3',
    ...overrides,
  } as any;
}

interface GoldenCase {
  name: string;
  brand: string;
  model: string;
  basePrice: number;
  diagnostics: ReturnType<typeof diag>;
  expected: { cashifyBasePrice: number; fhoneifyPrice: number };
}

// Golden values captured from lib/pricingCalculator.ts as of the competitor-
// uplift floor-bug fix (commit eefac53). Covers every brand branch
// (Apple/Samsung/Xiaomi/Vivo/Oppo/OnePlus/Nothing/generic-fallback),
// flagship/mid/budget/old devices, perfect vs. worst-case diagnostics,
// scrap-value floor, tier boundaries (₹20,000 / ₹50,000), an unknown brand,
// and a zero base price.
const GOLDEN_CASES: GoldenCase[] = [
  { name: 'apple_17_pro_max_perfect_high_tier', brand: 'Apple', model: 'iPhone 17 Pro Max', basePrice: 120000, diagnostics: diag(), expected: { cashifyBasePrice: 117980, fhoneifyPrice: 119980 } },
  { name: 'apple_17_pro_max_worst_case', brand: 'Apple', model: 'iPhone 17 Pro Max', basePrice: 120000, diagnostics: diag({ calls: false, touch: false, originalScreen: false, warranty: false, validBill: false, accessories: [], defects: ['broken_screen', 'body_scratch', 'panel_missing'], bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2', hardware: ['battery_service', 'fingerprint'], mobileAge: 'above11' }), expected: { cashifyBasePrice: 1200, fhoneifyPrice: 1248 } },
  { name: 'apple_14_perfect_mid_tier', brand: 'Apple', model: 'iPhone 14', basePrice: 22000, diagnostics: diag(), expected: { cashifyBasePrice: 14224, fhoneifyPrice: 15077 } },
  { name: 'apple_14_no_bill_no_warranty', brand: 'Apple', model: 'iPhone 14', basePrice: 22000, diagnostics: diag({ warranty: false, validBill: false, mobileAge: 'above11' }), expected: { cashifyBasePrice: 16872, fhoneifyPrice: 17884 } },
  { name: 'apple_11_budget_tier', brand: 'Apple', model: 'iPhone 11', basePrice: 9000, diagnostics: diag(), expected: { cashifyBasePrice: 8119, fhoneifyPrice: 8769 } },
  { name: 'apple_se2020_old_device', brand: 'Apple', model: 'iPhone SE (2020)', basePrice: 5000, diagnostics: diag(), expected: { cashifyBasePrice: 4679, fhoneifyPrice: 5053 } },
  { name: 'apple_scrap_value', brand: 'Apple', model: 'iPhone 14', basePrice: 22000, diagnostics: diag({ calls: false, touch: false, originalScreen: false, warranty: false, validBill: false, defects: ['broken_screen', 'body_scratch', 'panel_missing'], bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2', hardware: ['battery_service', 'fingerprint', 'back_camera', 'wifi'], mobileAge: 'above11' }), expected: { cashifyBasePrice: 1200, fhoneifyPrice: 1272 } },

  { name: 'samsung_s24_ultra_perfect', brand: 'Samsung', model: 'Galaxy S24 Ultra', basePrice: 55000, diagnostics: diag(), expected: { cashifyBasePrice: 54280, fhoneifyPrice: 56280 } },
  // These two values intentionally changed when the already-defined shared
  // functional map was reconnected; both faults previously had a ₹0 effect.
  { name: 'samsung_s24_ultra_spen_missing', brand: 'Samsung', model: 'Galaxy S24 Ultra', basePrice: 55000, diagnostics: diag({ hardware: ['s_pen'] }), expected: { cashifyBasePrice: 49106, fhoneifyPrice: 51070 } },
  { name: 'samsung_fold_hinge_defect', brand: 'Samsung', model: 'Galaxy Z Fold 6', basePrice: 60000, diagnostics: diag({ hardware: ['hinge'] }), expected: { cashifyBasePrice: 46244, fhoneifyPrice: 48094 } },
  { name: 'samsung_budget_perfect', brand: 'Samsung', model: 'Galaxy M14', basePrice: 6000, diagnostics: diag(), expected: { cashifyBasePrice: 6260, fhoneifyPrice: 6761 } },

  { name: 'xiaomi_redmi_note13_perfect', brand: 'Xiaomi', model: 'Redmi Note 13', basePrice: 15000, diagnostics: diag(), expected: { cashifyBasePrice: 15380, fhoneifyPrice: 16610 } },
  { name: 'xiaomi_redmi_note13_worst', brand: 'Xiaomi', model: 'Redmi Note 13', basePrice: 15000, diagnostics: diag({ calls: false, touch: false, warranty: false, validBill: false, mobileAge: 'above11' }), expected: { cashifyBasePrice: 1200, fhoneifyPrice: 1296 } },

  { name: 'vivo_x100_perfect', brand: 'Vivo', model: 'Vivo X100', basePrice: 40000, diagnostics: diag(), expected: { cashifyBasePrice: 40380, fhoneifyPrice: 42380 } },
  { name: 'vivo_x_fold_perfect', brand: 'Vivo', model: 'Vivo X Fold 5', basePrice: 70000, diagnostics: diag(), expected: { cashifyBasePrice: 68980, fhoneifyPrice: 70980 } },

  { name: 'oppo_reno11_perfect', brand: 'Oppo', model: 'Reno 11', basePrice: 16000, diagnostics: diag(), expected: { cashifyBasePrice: 16060, fhoneifyPrice: 17345 } },

  { name: 'oneplus_12_perfect', brand: 'OnePlus', model: 'OnePlus 12', basePrice: 45000, diagnostics: diag(), expected: { cashifyBasePrice: 44480, fhoneifyPrice: 46480 } },
  { name: 'oneplus_nord_perfect', brand: 'OnePlus', model: 'OnePlus Nord CE4', basePrice: 12000, diagnostics: diag(), expected: { cashifyBasePrice: 12140, fhoneifyPrice: 13111 } },

  { name: 'nothing_phone2_perfect', brand: 'Nothing', model: 'Phone 2', basePrice: 17000, diagnostics: diag(), expected: { cashifyBasePrice: 17040, fhoneifyPrice: 18403 } },

  { name: 'realme_gt5_perfect', brand: 'Realme', model: 'Realme GT 5', basePrice: 28000, diagnostics: diag(), expected: { cashifyBasePrice: 26980, fhoneifyPrice: 28599 } },
  { name: 'motorola_edge_perfect', brand: 'Motorola', model: 'Edge 50', basePrice: 18000, diagnostics: diag(), expected: { cashifyBasePrice: 17480, fhoneifyPrice: 18878 } },
  { name: 'google_pixel_perfect', brand: 'Google', model: 'Pixel 8', basePrice: 35000, diagnostics: diag(), expected: { cashifyBasePrice: 33630, fhoneifyPrice: 35630 } },

  { name: 'boundary_base_exactly_20000', brand: 'Xiaomi', model: 'Redmi Note 13', basePrice: 20000, diagnostics: diag(), expected: { cashifyBasePrice: 20380, fhoneifyPrice: 22010 } },
  { name: 'boundary_base_exactly_50000', brand: 'Vivo', model: 'Vivo X100', basePrice: 50000, diagnostics: diag(), expected: { cashifyBasePrice: 50380, fhoneifyPrice: 52380 } },
  { name: 'boundary_low_value_device', brand: 'Realme', model: 'Realme GT 5', basePrice: 1300, diagnostics: diag({ calls: false, touch: false, warranty: false, validBill: false, mobileAge: 'above11' }), expected: { cashifyBasePrice: 200, fhoneifyPrice: 216 } },

  { name: 'unknown_brand_falls_to_generic', brand: 'UnknownBrandXYZ', model: 'Some Model 9000', basePrice: 10000, diagnostics: diag(), expected: { cashifyBasePrice: 9880, fhoneifyPrice: 10670 } },
  { name: 'zero_base_price', brand: 'Apple', model: 'iPhone 14', basePrice: 0, diagnostics: diag(), expected: { cashifyBasePrice: 0, fhoneifyPrice: 0 } },
];

let passed = 0;
let failed = 0;

console.log(`Running ${GOLDEN_CASES.length} pricing golden-regression cases...\n`);

for (const c of GOLDEN_CASES) {
  try {
    const result = calculateFhoneifyPrice(c.brand, c.model, c.basePrice, c.diagnostics);
    assert.equal(result.cashifyBasePrice, c.expected.cashifyBasePrice, `${c.name}: cashifyBasePrice mismatch`);
    assert.equal(result.fhoneifyPrice, c.expected.fhoneifyPrice, `${c.name}: fhoneifyPrice mismatch`);
    console.log(`  PASS  ${c.name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${c.name}: ${err.message}`);
    failed++;
  }
}

// Invariant checks: the 4%/6%/8% competitor-uplift tiers and the ₹2,000 cap
// must hold for every case with a non-trivial depreciated price, regardless
// of golden-value drift. This is the specific rule from
// PRODUCTION_READINESS_AUDIT.md / the business pricing spec.
console.log(`\nChecking uplift invariants (4%/6%/8% tiers, capped at ₹2,000)...\n`);
let invariantFailed = 0;
for (const c of GOLDEN_CASES) {
  const result = calculateFhoneifyPrice(c.brand, c.model, c.basePrice, c.diagnostics);
  const { cashifyBasePrice: dep, fhoneifyPrice: final } = result;
  if (dep <= 0) continue; // zero/scrap-floor cases have no meaningful percentage
  const delta = final - dep;
  const tier = c.basePrice <= 20000 ? 0.08 : c.basePrice <= 50000 ? 0.06 : 0.04;
  const pct = delta / dep;
  try {
    assert.ok(delta >= 0, `${c.name}: fhoneifyPrice is below cashifyBasePrice`);
    assert.ok(delta <= 2000, `${c.name}: uplift exceeds ₹2,000 cap (delta=${delta})`);
    // Small tolerance for integer-rupee rounding on the final Math.round().
    assert.ok(pct <= tier + 0.001, `${c.name}: uplift ${(pct * 100).toFixed(2)}% exceeds ${(tier * 100)}% tier`);
  } catch (err: any) {
    console.log(`  FAIL  ${err.message}`);
    invariantFailed++;
    continue;
  }
}
if (invariantFailed === 0) {
  console.log(`  PASS  all ${GOLDEN_CASES.length} cases respect the uplift tier/cap invariants`);
}

console.log(`\n${passed}/${GOLDEN_CASES.length} golden cases passed, ${invariantFailed === 0 ? 'all' : GOLDEN_CASES.length - invariantFailed} invariant checks passed.`);

if (failed > 0 || invariantFailed > 0) {
  console.error(`\nFAILED: ${failed} golden mismatch(es), ${invariantFailed} invariant violation(s).`);
  process.exit(1);
} else {
  console.log('\nAll pricing regression tests passed.');
}
