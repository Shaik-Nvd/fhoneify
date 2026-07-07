import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';

const brand = 'Apple';
const modelName = 'Apple iPhone 17e';
const storage = '256GB';

const device = SEED_DEVICES.find(d => d.model === modelName && d.storage === storage);
const basePrice = device?.basePrice || 107500;

const flawless: DiagnosticsType = {
  calls: true, touch: true, originalScreen: true,
  warranty: true, validBill: true, mobileAge: '6to11',
  defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  hardware: [], accessories: ['box', 'charger'], eSim: 'Dual eSIM'
};

const minorDefects: DiagnosticsType = {
  calls: true, touch: true, originalScreen: true,
  warranty: false, validBill: true, mobileAge: 'above11',
  defects: ['body_scratch'], 
  screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: '1-2 scratches', bodyDents: 'No dents', bodyPanel: null, bodyBent: null,
  hardware: [], accessories: ['box'], eSim: 'Dual eSIM'
};

const majorDefects: DiagnosticsType = {
  calls: true, touch: true, originalScreen: false,
  warranty: false, validBill: false, mobileAge: 'above11',
  defects: ['broken_screen', 'hardware'],
  screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  hardware: ['battery_service', 'face'], accessories: [], eSim: 'Dual eSIM'
};

import { scrapeCashifyPrice } from './lib/cashifyScraper';

const userDefects: DiagnosticsType = {
  calls: true, touch: true, originalScreen: true,
  warranty: true, validBill: true, mobileAge: 'above11',
  defects: ['broken_screen'],
  screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  hardware: ['battery_service'], accessories: ['box'], eSim: 'Dual eSIM'
};

console.log("Base Price:", basePrice);
console.log("Fhoneify User Scenario:", calculateFhoneifyPrice('Apple', modelName, basePrice, userDefects));

