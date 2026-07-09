import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diagnostics = {
  calls: true,
  touch: true,
  originalScreen: false,
  defects: ['body_scratch'],
  screenCondition: '',
  screenSpots: '',
  screenLines: '',
  screenDiscoloration: '',
  bodyScratches: '1-2 scratches',
  bodyDents: '1-2 minor dents',
  bodyPanel: '',
  bodyBent: '',
  hardware: ['fingerprint', 'face', 'battery_health'],
  accessories: ['box'],
  warranty: false,
  validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'Above 11 months'
};

const basePrice = 73610;
const targetPrice = 29240;

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro Max', basePrice, diagnostics);
console.log('Current Fhoneify calculated price:', price);
