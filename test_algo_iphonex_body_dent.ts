import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import cashifyPrices from './lib/cashify_prices.json';

const diagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: false,
  validBill: false,
  mobileAge: 'above11',
  defects: ['body_scratch'], 
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: 'No scratches',
  bodyDents: 'Major dent(s) or more than 2',
  bodyPanel: null,
  bodyBent: null,
  hardware: [], 
  accessories: ['box', 'charger'], // Assume all accessories
  eSim: null
};

const basePrice = (cashifyPrices as any)['apple-iphone-x-256gb'] || 0;
const finalPrice = calculateFhoneifyPrice('Apple', 'iPhone X', basePrice, diagnostics);

console.log('iPhone X 256GB - Body Dents (Major dents, no scratches), All Accessories');
console.log('Raw Cashify Price:', basePrice);
console.log('Final Computed Price:', finalPrice);
