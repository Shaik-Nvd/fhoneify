import { calculateFhoneifyPrice } from "./lib/pricingCalculator";
const diagnostics: any = {
  calls: true,
  touch: true,
  originalScreen: false,
  warranty: false,
  mobileAge: 'Above 11 months',
  validBill: true,
  screenCondition: 'More than 2 scratches on screen',
  defects: ['screen_scratch'],
  hardware: ['face', 'battery_health'],
  accessories: ['box']
};
console.log(calculateFhoneifyPrice('Apple', 'iPhone 16 Pro Max (8 GB/1 TB)', 93500, diagnostics));
