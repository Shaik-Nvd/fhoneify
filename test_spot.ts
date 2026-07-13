import { calculateFhoneifyPrice } from './lib/pricingCalculator';
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 17 Pro Max', 123000, {
  calls: true, touch: true, originalScreen: true,
  warranty: true, validBill: false,
  eSim: 'Single eSIM',
  defects: ['screen_spot'],
  screenCondition: 'Dead Spot/Visible line and Discoloration on screen',
  hardware: [],
  accessories: ['box']
});
console.log('Fhoneify Final Quote:', p);
