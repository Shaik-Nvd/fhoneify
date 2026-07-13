import { calculateFhoneifyPrice } from './lib/temp_calc5.ts';

const basePrice = 87300;

for (let age of ['above11']) {
  for (let screen of ['More than 2 scratches', '1-2 scratches', 'No scratches', null]) {
    for (let battery of ['battery_health', 'battery_service', null]) {
      const diagnostics = {
        calls: true,
        touch: true,
        originalScreen: true,
        defects: screen ? ['screen_scratch'] : [],
        screenCondition: screen,
        hardware: battery ? [battery] : [],
        accessories: ['box'],
        warranty: true,
        validBill: true,
        eSim: 'Single eSIM',
        mobileAge: age,
      };
      const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', basePrice, diagnostics as any);
      console.log(`${screen} | ${battery} | ${age} => ${price.toFixed(2)}`);
    }
  }
}
