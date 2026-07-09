import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diagnostics = {
  calls: true,
  touch: false,
  originalScreen: false,
  defects: ['broken_screen', 'body_scratch'],
  screenCondition: 'Screen cracked/ glass broken',
  screenSpots: '',
  screenLines: '',
  screenDiscoloration: '',
  bodyScratches: '1-2 scratches',
  bodyDents: '1-2 minor dents',
  bodyPanel: '',
  bodyBent: '',
  hardware: ['front_camera', 'face', 'battery_health'],
  accessories: ['box'],
  warranty: false,
  validBill: true,
  eSim: 'Single eSIM',
  mobileAge: 'Above 11 months'
};

const price = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro Max', 73610, diagnostics);
console.log('Final Calculated Price:', price);
