import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const diagnostics = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: [],
  screenCondition: 'flawless',
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: 'flawless',
  bodyDents: 'flawless',
  bodyPanel: 'flawless',
  bodyBent: 'flawless',
  hardware: [],
  accessories: ['box', 'charger'],
  warranty: false,
  validBill: true,
  eSim: null,
  mobileAge: 'above11' as any
};

const price = calculateFhoneifyPrice(102000, 'Apple', 'Apple iPhone 17 Pro', diagnostics);
console.log('Price:', price);
