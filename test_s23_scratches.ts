import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

const diag: Partial<DiagnosticsType> = {
  calls: true,
  touch: true,
  originalScreen: true,
  accessories: [],
  defects: ['broken_screen'],
  screenCondition: 'More than 2 scratches on screen',
  hardware: ['battery_service']
};

const price = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S23 Ultra 5G', 37040, diag as DiagnosticsType);
console.log('Price with scratches and battery faulty:', Math.round(price));
