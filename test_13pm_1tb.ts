import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diagnostics = {
  calls: true,
  touch: true,
  originalScreen: false,
  defects: [],
  screenCondition: null,
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
  validBill: null,
  eSim: 'Single eSIM',
  mobileAge: 'above11'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 13 Pro Max', 39620, diagnostics);
console.log('Calculated Price:', price);
