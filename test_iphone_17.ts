import { calculateFhoneifyPrice, getAppleModelParams } from './lib/pricingCalculator';

const diagnostics = {
  calls: true, touch: true, originalScreen: true,
  warranty: true, bill: true,
  eSim: 'Single eSIM',
  defects: ['screen_scratch'],
  screenCondition: 'Screen cracked/ glass broken',
  hardware: ['battery_health'],
  accessories: ['box']
};

const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 17', 65000, diagnostics);
console.log('Fhoneify Price:', p);
