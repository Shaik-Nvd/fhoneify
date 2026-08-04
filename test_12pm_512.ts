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
  hardware: ['battery_service'],
  accessories: ['box'],
  warranty: false,
  validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'above11' // default for out of warranty
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 12 Pro Max', 27620, diagnostics);
console.log('Calculated Price:', Math.round(price));
