import { calculateFhoneifyPrice } from './lib/pricingCalculator';
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 14 Pro Max', 48230, {
  calls: true, touch: false, originalScreen: true,
  warranty: false, validBill: false,
  eSim: 'Single eSIM',
  defects: ['screen_scratch'],
  screenCondition: 'Screen cracked/ glass broken',
  hardware: [],
  accessories: ['box']
});
console.log('Fhoneify Final Quote:', p);
