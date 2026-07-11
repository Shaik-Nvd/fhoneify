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
  hardware: ['battery_health'],
  accessories: ['box'], // Only box selected in screenshot
  eSim: 'Single eSIM'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro Max', 79070, diagnostics);
console.log('Fhoneify Price:', price);
