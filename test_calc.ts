import { calculateFhoneifyPrice } from "./lib/pricingCalculator";
const diagnostics = {
  calls: true,
  touch: true,
  originalScreen: false,
  warranty: true,
  mobileAge: 'Below 3 months',
  validBill: true,
  screenCondition: 'More than 2 scratches on screen',
  defects: ['screen_scratch'],
  hardware: ['face', 'battery_health'],
  accessories: ['box']
};
console.log(calculateFhoneifyPrice('Apple', 'iPhone 15 Pro Max (8 GB/1 TB)', 79070, diagnostics as any));
