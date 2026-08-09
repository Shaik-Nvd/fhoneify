import * as fs from 'fs';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

// Constants
const BOX_BONUS = 380;
const FLOOR = 100;

interface TestCase {
    basePrice: number;
    case1Expected: number;
    case2Expected: number;
    case3Expected: number;
}

const data: Record<string, TestCase> = {
    "Nothing 1": { basePrice: 13900, case1Expected: 4040, case2Expected: 9200, case3Expected: 10630 },
    "Nothing 2": { basePrice: 20730, case1Expected: 5110, case2Expected: 11080, case3Expected: 12830 },
    "Nothing 2a": { basePrice: 17710, case1Expected: 4100, case2Expected: 8670, case3Expected: 10420 },
    "CMF": { basePrice: 11430, case1Expected: 2640, case2Expected: 4950, case3Expected: 6030 },
    "Nothing 2a Plus": { basePrice: 18260, case1Expected: 4220, case2Expected: 9110, case3Expected: 10870 },
    "Nothing 3a": { basePrice: 20810, case1Expected: 4580, case2Expected: 9760, case3Expected: 11810 },
    "Nothing 3": { basePrice: 32550, case1Expected: 10650, case2Expected: 17400, case3Expected: 20210 },
    "Nothing 3a Pro": { basePrice: 22710, case1Expected: 5000, case2Expected: 11200, case3Expected: 13250 },
    "Nothing 4a": { basePrice: 27000, case1Expected: 7850, case2Expected: 14450, case3Expected: 16500 },
    "Nothing 4a Pro": { basePrice: 32500, case1Expected: 12010, case2Expected: 18610, case3Expected: 20660 }
};

for (const [model, cases] of Object.entries(data)) {
    console.log(`\nTesting ${model}...`);

    let diag1 = {
      calls: true,
      touch: false,
      originalScreen: true,
      warranty: true,
      validBill: true,
      defects: ["screen_scratch"],
      screenCondition: "1-2 scratches on screen",
      hardware: ["back_camera"],
      accessories: ["box", "charger"]
    } as unknown as DiagnosticsType;
    let res1 = calculateFhoneifyPrice("Nothing", model, cases.basePrice, diag1);
    console.log(`Case 1 - Expected: ${cases.case1Expected}, Got: ${res1.fhoneifyPrice}`);

    let diag2 = {
      calls: true,
      touch: true,
      originalScreen: false,
      warranty: true,
      validBill: true,
      defects: [],
      screenCondition: null,
      hardware: ["front_camera"],
      accessories: ["box"]
    } as unknown as DiagnosticsType;
    let res2 = calculateFhoneifyPrice("Nothing", model, cases.basePrice, diag2);
    console.log(`Case 2 - Expected: ${cases.case2Expected}, Got: ${res2.fhoneifyPrice}`);

    let diag3 = {
      calls: true,
      touch: true,
      originalScreen: true,
      warranty: true,
      validBill: false,
      defects: ["screen_scratch"],
      screenCondition: "More than 2 scratches on screen",
      hardware: ["battery_health"], 
      accessories: ["box", "charger"]
    } as unknown as DiagnosticsType;
    let res3 = calculateFhoneifyPrice("Nothing", model, cases.basePrice, diag3);
    console.log(`Case 3 - Expected: ${cases.case3Expected}, Got: ${res3.fhoneifyPrice}`);
}
