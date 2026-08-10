import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

let diag = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: true,
  validBill: false,
  defects: ["screen_scratch"],
  screenCondition: "More than 2 scratches on screen",
  hardware: ["battery_service"],
  accessories: ["box"],
  mobileAge: 'below3'
} as unknown as DiagnosticsType;

let res = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag);
console.log(`With basePrice 32500 and mobileAge below3: ${res.fhoneifyPrice}`);

res = calculateFhoneifyPrice("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32000, diag);
console.log(`With basePrice 32000 and mobileAge below3: ${res.fhoneifyPrice}`);
