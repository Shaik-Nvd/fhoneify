import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import cashifyPrices from './lib/cashify_prices.json';

const diagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: false,
  validBill: true,
  mobileAge: 'above11',
  defects: [], // No defects
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: [],
  accessories: [], // No accessories
  eSim: null
};

const basePrice = (cashifyPrices as any)['apple-iphone-x-256gb'] || 0;
const rawBasePrice = basePrice;
const finalPrice = calculateFhoneifyPrice('Apple', 'iPhone X', rawBasePrice, diagnostics);

console.log('iPhone X 256GB (Flawless, No accessories)');
console.log('Raw Cashify Price:', rawBasePrice);
console.log('Final Computed Price:', finalPrice);
