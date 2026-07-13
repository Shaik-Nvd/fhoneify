const { calculateFhoneifyPrice } = require('./lib/pricingCalculator.js');
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 87300, {
  calls: true, touch: true, originalScreen: true,
  warranty: true, validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'above11',
  defects: [],
  screenCondition: null,
  hardware: ['battery_service'],
  accessories: ['box']
});
console.log('Fhoneify Final Quote (assuming 95000 base):', p);
