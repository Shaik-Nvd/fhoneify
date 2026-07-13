import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const booleans = [true, false];
for (const calls of booleans) {
  for (const touch of booleans) {
    for (const originalScreen of booleans) {
      for (const eSim of ['Single eSIM', 'Dual eSIM']) {
        const p = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 93500, {
          calls, touch, originalScreen,
          defects: ['screen_scratch'],
          screenCondition: 'More than 2 scratches on screen',
          screenSpots: null, screenLines: null, screenDiscoloration: null,
          bodyScratches: 'flawless', bodyDents: 'flawless', bodyPanel: 'flawless', bodyBent: 'flawless',
          hardware: ['battery_health'],
          accessories: ['box'],
          warranty: false, validBill: false, eSim, mobileAge: 'above11'
        } as any);
        if (p === 27907 || (p > 27000 && p < 28000)) {
          console.log({ calls, touch, originalScreen, eSim, price: p });
        }
      }
    }
  }
}
