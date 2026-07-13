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

for (let b = 130000; b <= 140000; b += 1000) {
  const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 17 Pro Max', b, diagnostics);
  console.log(`Base Price ${b} -> Fhoneify Price ${p}`);
}
