import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

let diag1 = {
  calls: true,
  touch: true,
  originalScreen: false,
  warranty: true,
  validBill: true,
  defects: [],
  hardware: ["front_camera"],
  accessories: [],
  mobileAge: 'below3'
} as unknown as DiagnosticsType;

let diag2 = {
  calls: true,
  touch: true,
  originalScreen: false,
  warranty: true,
  validBill: true,
  defects: [],
  hardware: ["front_camera"],
  accessories: [],
  mobileAge: 'above11'
} as unknown as DiagnosticsType;

let res1 = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag1);
let res2 = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag2);

console.log(`With below3: ${res1.fhoneifyPrice}`);
console.log(`With above11: ${res2.fhoneifyPrice}`);

let res3 = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32000, diag1);
let res4 = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a external", 32000, diag2);
console.log(`With base 32000, below3: ${res3.fhoneifyPrice}`);
console.log(`With base 32000, above11: ${res4.fhoneifyPrice}`);
