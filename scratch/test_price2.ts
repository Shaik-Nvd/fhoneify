import { calculateFhoneifyPrice } from '../lib/pricingCalculator';

const diagnostics: any = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: true,
  validBill: true,
  defects: ['body_scratch'],
  accessories: ['box'],
  mobileAge: '3to6',
  hardware: []
};

const price = calculateFhoneifyPrice('Xiaomi', 'Xiaomi 17 Ultra', 77150, diagnostics);
console.log('Algorithm output: ' + JSON.stringify(price, null, 2));
