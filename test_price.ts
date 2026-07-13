import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diag = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: ['screen_scratch'],
  screenCondition: 'More than 2 scratches on screen',
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: 'flawless',
  bodyDents: 'flawless',
  bodyPanel: 'flawless',
  bodyBent: 'flawless',
  hardware: ['battery_health'],
  accessories: ['box'],
  warranty: false,
  validBill: false,
  eSim: 'Single eSIM',
  mobileAge: 'above11'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 93500, diag as any);
console.log('Price:', price);
