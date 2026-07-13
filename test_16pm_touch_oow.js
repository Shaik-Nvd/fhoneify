const { calculateFhoneifyPrice } = require('./lib/pricingCalculator.js');
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 87300, {
  calls: true, touch: false, originalScreen: true,
  warranty: false, validBill: false,
  eSim: 'Single eSIM',
  mobileAge: 'above11', // When it's out of warranty, it's effectively above 11 months
  defects: ['screen_scratch'],
  screenCondition: 'Screen cracked/ glass broken',
  hardware: [],
  accessories: []
});
console.log('Fhoneify Final Quote (assuming 87300 base):', p);
