const { calculateFhoneifyPrice } = require('./lib/pricingCalculator.js');
const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 87300, {
  calls: true, touch: false, originalScreen: true,
  warranty: true, validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'below3', // Assuming below 3 months for max warranty, since it just says "Mobile Under Warranty"
  defects: ['broken_screen'],
  screenCondition: 'Screen cracked/ glass broken',
  hardware: ['face', 'battery_service'],
  accessories: ['box']
});
console.log('Fhoneify Final Quote (assuming 87300 base):', p);
