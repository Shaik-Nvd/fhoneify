import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

const diag: Partial<DiagnosticsType> = {
  calls: false,
  touch: true,
  originalScreen: false,
  accessories: ['box', 'spen'],
  defects: [],
  screenCondition: 'flawless',
  hardware: [],
  warranty: true,
  eSim: 'Single eSIM',
};

const result = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S23 Ultra 5G', 37040, diag as any);
console.log('Resulting price:', result);
