import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

const diagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: false,
  validBill: true,
  mobileAge: 'above11',
  defects: [],
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: [],
  accessories: ['box', 'bill'], // Box is included
  eSim: 'Single eSIM'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro', 70300, diagnostics);
console.log('Flawless Fhoneify:', price);

diagnostics.hardware = ['battery_health'];
const price2 = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro', 70300, diagnostics);
console.log('Battery Fhoneify:', price2);
