import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import cashifyPrices from './lib/cashify_prices.json';

const diagnostics: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: false, // Default: no warranty remaining
  validBill: false,
  mobileAge: 'above11', // Out of warranty
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
  accessories: ['box', 'charger'], // All accessories present
  eSim: null
};

const models = Object.keys(cashifyPrices).filter(k => k.includes('iphone-15'));

models.forEach(modelKey => {
  const basePrice = (cashifyPrices as any)[modelKey];
  
  // Parse model name for calculation
  let modelName = 'iPhone 15';
  if (modelKey.includes('pro-max')) modelName = 'iPhone 15 Pro Max';
  else if (modelKey.includes('pro')) modelName = 'iPhone 15 Pro';
  else if (modelKey.includes('plus')) modelName = 'iPhone 15 Plus';

  const finalPrice = calculateFhoneifyPrice('Apple', modelName, basePrice, diagnostics);
  
  // Format variant name
  let variant = modelKey.replace('apple-', '').toUpperCase();
  console.log(`${variant} : Base ${basePrice} -> Fhoneify Final Price: ${finalPrice}`);
});
