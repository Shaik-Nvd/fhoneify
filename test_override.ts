import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator.ts';

const basePrice = 87300; // 256GB base price

const testDiagnostics: DiagnosticsType = {
  calls: false,
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
  hardware: ['face'],
  accessories: ['box'],
  warranty: true,
  validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'above11'
};

const price = calculateFhoneifyPrice(
  'Apple',
  'Apple iPhone 16 Pro Max',
  basePrice,
  testDiagnostics
);

console.log("Calculated Fhoneify Price for 256GB with NEW COMBINATION:", price);
