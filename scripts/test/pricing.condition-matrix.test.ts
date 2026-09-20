/**
 * Cross-brand condition matrix. These assertions protect ordering and field
 * wiring, not one day's market price: every scenario uses the same reference
 * price for a device and checks that additional damage cannot improve it.
 */
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice, COMMON_FUNCTIONAL_PENALTIES, DiagnosticsType } from '../../lib/pricingCalculator';
import { warrantyVoidedByDiagnostics } from '../../lib/pricing/diagnostics';

const devices = [
  { category: 'Apple flagship', brand: 'Apple', model: 'Apple iPhone 16 Pro Max', base: 100000 },
  { category: 'Samsung flagship', brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra 5G', base: 55000 },
  { category: 'Samsung slab holdout', brand: 'Samsung', model: 'Samsung Galaxy S23 5G', base: 35000 },
  { category: 'Samsung midrange', brand: 'Samsung', model: 'Samsung Galaxy A14 5G', base: 15000 },
  { category: 'Samsung foldable', brand: 'Samsung', model: 'Samsung Galaxy Z Fold 7', base: 80000 },
  { category: 'OnePlus flagship', brand: 'OnePlus', model: 'OnePlus 12', base: 45000 },
  { category: 'OnePlus midrange', brand: 'OnePlus', model: 'Oneplus Nord CE4 5G', base: 20000 },
  { category: 'Oppo', brand: 'Oppo', model: 'OPPO Reno11 5G', base: 25000 },
  { category: 'Vivo', brand: 'Vivo', model: 'Vivo X100', base: 40000 },
  { category: 'Xiaomi/Redmi', brand: 'Xiaomi', model: 'Xiaomi Redmi Note 13 5G', base: 15000 },
  { category: 'Realme', brand: 'Realme', model: 'Realme GT 5G', base: 20000 },
];

function answers(overrides: Partial<DiagnosticsType> = {}): DiagnosticsType {
  return {
    calls: true,
    touch: true,
    originalScreen: true,
    defects: [],
    screenCondition: null,
    screenSpots: null,
    screenLines: null,
    screenDiscoloration: null,
    bodyScratches: 'No scratches',
    bodyDents: 'No dents',
    bodyPanel: 'No defect on side or back panel',
    bodyBent: 'Phone not bent',
    hardware: [],
    accessories: ['box', 'bill', 'charger', 'spen'],
    warranty: true,
    validBill: true,
    eSim: null,
    mobileAge: 'below3',
    ...overrides,
  };
}

const profiles: Record<string, DiagnosticsType> = {
  perfect: answers(),
  oldPerfect: answers({ warranty: false, validBill: false, mobileAge: 'above11' }),
  minorScratches: answers({ defects: ['screen_scratch'], screenCondition: '1-2 scratches on screen' }),
  dents: answers({ defects: ['body_scratch'], bodyDents: 'Major dent(s) or more than 2' }),
  crackedScreen: answers({ defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' }),
  nonOriginalScreen: answers({ originalScreen: false }),
  deadTouch: answers({ touch: false }),
  spotsAndLines: answers({ defects: ['screen_spot'], screenSpots: 'Large/ heavy visible spots on screen', screenLines: 'Visible line(s) on display', screenDiscoloration: 'Major Discoloration' }),
  bentFrame: answers({ defects: ['panel_missing'], bodyPanel: 'No defect on side or back panel', bodyBent: 'Bent/ curved panel' }),
  cameraFault: answers({ hardware: ['back_camera'] }),
  singleFunctional: answers({ hardware: ['speaker'] }),
  multipleFunctional: answers({ hardware: ['speaker', 'microphone', 'charging', 'wifi'] }),
  missingAccessories: answers({ accessories: [] }),
  severe: answers({
    touch: false,
    originalScreen: false,
    defects: ['screen_scratch', 'screen_spot', 'body_scratch', 'panel_missing'],
    screenCondition: 'Screen cracked/ glass broken',
    screenSpots: 'Large/ heavy visible spots on screen',
    screenLines: 'Visible line(s) on display',
    screenDiscoloration: 'Major Discoloration',
    bodyScratches: 'More than 2 scratches',
    bodyDents: 'Major dent(s) or more than 2',
    bodyPanel: 'Missing side or back panel',
    bodyBent: 'Bent/ curved panel',
    hardware: ['back_camera', 'speaker', 'microphone', 'charging', 'wifi'],
    accessories: [],
    warranty: false,
    validBill: false,
    mobileAge: 'above11',
  }),
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`  FAIL  ${name}: ${error.message}`);
    failed++;
  }
}

for (const device of devices) {
  test(device.category, () => {
    const prices = Object.fromEntries(Object.entries(profiles).map(([name, diagnostics]) => [
      name,
      calculateFhoneifyPrice(device.brand, device.model, device.base, diagnostics).cashifyBasePrice,
    ])) as Record<string, number>;

    for (const scenario of ['minorScratches', 'dents', 'crackedScreen', 'nonOriginalScreen', 'deadTouch', 'spotsAndLines', 'bentFrame', 'cameraFault', 'singleFunctional', 'multipleFunctional', 'missingAccessories']) {
      assert.ok(prices[scenario] < prices.perfect, `${scenario} must be below perfect (${prices[scenario]} >= ${prices.perfect})`);
    }
    assert.ok(prices.crackedScreen < prices.minorScratches, 'cracked screen must cost more than minor scratches');
    assert.ok(prices.multipleFunctional < prices.singleFunctional, 'multiple functional faults must cost more than one');
    assert.ok(prices.severe < prices.crackedScreen, 'severe multi-damage must be below cracked screen alone');
    assert.ok(prices.severe < prices.bentFrame, 'severe multi-damage must be below a bent frame alone');
    assert.ok(prices.oldPerfect > 0, 'old but perfect scenario must still produce a positive quote');
    assert.ok(prices.oldPerfect <= prices.perfect, `older/out-of-warranty must not exceed younger/in-warranty (${prices.oldPerfect} > ${prices.perfect})`);
    const warrantyLost = calculateFhoneifyPrice(device.brand, device.model, device.base, answers({ warranty: false, validBill: true, mobileAge: 'below3' })).cashifyBasePrice;
    assert.ok(warrantyLost <= prices.perfect, `losing warranty must not increase payout (${warrantyLost} > ${prices.perfect})`);
  });
}

test('iPhone 15 Pro age/warranty ordering cannot invert', () => {
  const young = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro', 64800, answers({ mobileAge: 'below3', warranty: true })).cashifyBasePrice;
  const old = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro', 64800, answers({ mobileAge: 'above11', warranty: false })).cashifyBasePrice;
  assert.ok(young >= old, `young/in-warranty quote must be at least old/out-of-warranty (${young} < ${old})`);
});

test('warranty invalidation uses current UI fields', () => {
  assert.equal(warrantyVoidedByDiagnostics(answers({ screenLines: 'Visible line(s) on display' })), true);
  assert.equal(warrantyVoidedByDiagnostics(answers({ screenDiscoloration: 'Major Discoloration' })), true);
  assert.equal(warrantyVoidedByDiagnostics(answers({ bodyBent: 'Bent/ curved panel' })), true);
  assert.equal(warrantyVoidedByDiagnostics(answers({ screenCondition: '1-2 scratches on screen' })), false);
  assert.equal(warrantyVoidedByDiagnostics(answers({ bodyBent: 'Phone not bent' })), false);
  assert.equal(warrantyVoidedByDiagnostics(answers()), false);
});

test('every functional id exposed by the quote page has a deduction', () => {
  const device = { brand: 'Realme', model: 'Realme GT 5G', base: 20000 };
  const perfect = calculateFhoneifyPrice(device.brand, device.model, device.base, answers()).cashifyBasePrice;
  for (const hardware of Object.keys(COMMON_FUNCTIONAL_PENALTIES)) {
    const damaged = calculateFhoneifyPrice(device.brand, device.model, device.base, answers({ hardware: [hardware] })).cashifyBasePrice;
    assert.ok(damaged < perfect, `${hardware} must reduce the Cashify-equivalent quote`);
  }
});

test('a Face ID fault cannot increase the iPhone 14 quote', () => {
  const perfect = calculateFhoneifyPrice('Apple', 'Apple iPhone 14', 30000, answers()).cashifyBasePrice;
  const damaged = calculateFhoneifyPrice('Apple', 'Apple iPhone 14', 30000, answers({ hardware: ['face'] })).cashifyBasePrice;
  assert.ok(damaged < perfect, `Face ID fault must reduce the quote (${damaged} >= ${perfect})`);
});

test('current granular fields work without legacy defect ids', () => {
  const device = { brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra 5G', base: 55000 };
  const perfect = calculateFhoneifyPrice(device.brand, device.model, device.base, answers()).cashifyBasePrice;
  const granular: Partial<DiagnosticsType>[] = [
    { screenCondition: 'Screen cracked/ glass broken' },
    { screenSpots: '1-2 minor spots on screen' },
    { screenLines: 'Visible line(s) on display' },
    { screenDiscoloration: 'Minor Discoloration' },
    { bodyScratches: '1-2 scratches' },
    { bodyDents: '1-2 minor dents' },
    { bodyPanel: 'Cracked/ broken side or back panel' },
    { bodyBent: 'Bent/ curved panel' },
  ];
  for (const fields of granular) {
    const damaged = calculateFhoneifyPrice(device.brand, device.model, device.base, answers(fields)).cashifyBasePrice;
    assert.ok(damaged < perfect, `${JSON.stringify(fields)} must reduce the Cashify-equivalent quote`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
