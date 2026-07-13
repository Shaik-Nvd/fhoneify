const { calculateFhoneifyPrice } = require('./lib/temp_calc7.js');
calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 87300, {
  calls: true, touch: false, originalScreen: true,
  warranty: true, validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'below3',
  defects: ['screen_scratch'],
  screenCondition: 'Screen cracked/ glass broken',
  hardware: ['face', 'battery_service'],
  accessories: ['box']
});
