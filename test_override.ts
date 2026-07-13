import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator.ts';

const basePrice = 87300; // 256GB base price

const testDiagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: ['broken_scratch_screen'], 
  screenCondition: 'Screen cracked/ glass broken',
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: ['battery_health'],
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
