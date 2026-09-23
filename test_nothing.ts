import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

// Polyfill minimal test cases
const cases = [
  {
    name: "Nothing Phone 1 (12 GB/256 GB)",
    basePrice: 13900,
    expectedPrice: 4040,
    diag: {
      calls: true,
      touch: false,
      originalScreen: true,
      warranty: true,
      validBill: true,
      defects: ["screen_scratch"],
      screenCondition: "1-2 scratches on screen",
      hardware: ["back_camera"],
      accessories: ["box", "charger"]
    }
  }
];

const ages = ["below3", "3to6", "6to11", "above11"];

cases.forEach((c) => {
  console.log(`\nTesting ${c.name}`);
  ages.forEach(age => {
      const diag = {...c.diag, mobileAge: age} as unknown as DiagnosticsType;
      const result = calculateFhoneifyPrice("Nothing", c.name, c.basePrice, diag);
      console.log(`Age ${age} - Expected: ${c.expectedPrice}, Got: ${result.fhoneifyPrice}, CashifyBase: ${result.cashifyConditionEquivalent}`);
  })
});
