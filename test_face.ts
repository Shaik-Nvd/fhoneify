import { calculateFhoneifyPrice } from './lib/pricingCalculator';
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 17 Pro Max', 123000, {
  calls: true, touch: true, originalScreen: false,
  warranty: true, validBill: false,
  eSim: 'Single eSIM',
  defects: [],
  screenCondition: null,
  hardware: ['face'],
  accessories: ['box']
});
console.log('Fhoneify Final Quote:', p);
