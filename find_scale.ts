import { calculateFhoneifyPrice, getAppleModelParams } from './lib/pricingCalculator';

const diagnostics = {
  calls: true,
  touch: false,
  originalScreen: false,
  defects: ['screen_scratch', 'body_scratch'],
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

const basePrice = 73610;
const targetPrice = 15740;

// let's test scales from 0.80 to 1.30
for (let s = 0.90; s <= 1.20; s += 0.01) {
  // monkey patch getAppleModelParams
  const originalGetAppleModelParams = getAppleModelParams;
  const modDiagnostics = { ...diagnostics };
  
  const rawCalculated = basePrice 
    * 1.0 
    * 1.0 
    * 0.50 
    * 1.0 
    * 1.0
    * (1 - Math.min(0.43 * s, 1)) 
    * (1 - Math.min(0.25 * s, 1));

  let upliftPercent = 1.06;
  if (rawCalculated <= 20000) {
    upliftPercent = 1.08;
  } else if (rawCalculated <= 50000) {
    upliftPercent = 1.06;
  }

  const calculated = (rawCalculated * upliftPercent) + 380;
  console.log(`Scale: ${s.toFixed(2)}, Price: ${Math.round(calculated)}`);
}
