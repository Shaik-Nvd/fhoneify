import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diagnostics: any = {
  calls: true,
  touch: true,
  originalScreen: false,
  defects: ['screen_scratch'],
  screenCondition: 'scratches',
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: ['battery_health'],
  accessories: ['box'],
  warranty: false,
  validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'above11'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 93500, diagnostics);
console.log('Calculated Price:', price);
