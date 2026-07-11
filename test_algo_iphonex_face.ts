import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import cashifyPrices from './lib/cashify_prices.json';

const diagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: false, // NOT original
  warranty: false,
  validBill: false,
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
  hardware: ['face'], // Face Sensor not working
  accessories: ['charger'], // Has charger, missing box
  eSim: null
};

const basePrice = (cashifyPrices as any)['apple-iphone-x-256gb'] || 0;
const finalPrice = calculateFhoneifyPrice('Apple', 'iPhone X', basePrice, diagnostics);

console.log('iPhone X 256GB - Non-Original Screen, Face Sensor Broken, Missing Box');
console.log('Raw Cashify Price:', basePrice);
console.log('Final Computed Price:', finalPrice);
