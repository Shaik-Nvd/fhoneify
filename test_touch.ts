import { calculateFhoneifyPrice } from './lib/pricingCalculator';
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 17 Pro Max', 123000, {
  calls: true, touch: true, originalScreen: true,
  warranty: false, validBill: false,
  eSim: 'Single eSIM',
  defects: ['screen_scratch'],
  screenCondition: 'More than 2 scratches on screen',
  hardware: [],
  accessories: ['box']
});
console.log('Fhoneify Final Quote (Screen Scratch):', p);
