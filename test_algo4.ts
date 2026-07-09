import { calculateFhoneifyPrice, getAppleModelParams } from './lib/pricingCalculator';

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

for (let o = 0.55; o <= 0.65; o += 0.01) {
  const rawCalculated = basePrice 
    * 1.0 
    * 1.0 
    * 1.0 
    * o 
    * 1.0
    * (1 - 0.0872) 
    * (1 - 0.327);

  let upliftPercent = 1.06;
  if (rawCalculated <= 20000) {
    upliftPercent = 1.08;
  } else if (rawCalculated <= 50000) {
    upliftPercent = 1.06;
  }

  const calculated = (rawCalculated * upliftPercent) + 380;
  console.log(`originalScreenPenalty: ${o.toFixed(2)}, Price: ${Math.round(calculated)}`);
}
