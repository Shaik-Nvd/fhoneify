import { calculateFhoneifyPrice } from './lib/temp_calc5.ts';

const basePrice = 93500; // 1TB Base price

for (let age of ['above11']) {
  for (let screen of ['More than 2 scratches']) {
    for (let battery of ['battery_service']) {
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
      console.log(`With Override: ${price}`);
    }
  }
}
