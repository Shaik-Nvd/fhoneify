import { calculateFhoneifyPrice } from './lib/pricingCalculator';

const bools = [true, false];
const defectsOpts = [
  ['screen_scratch', 'screen_spot'],
  ['screen_scratch'],
  ['screen_spot'],
  [],
  ['screen_scratch', 'screen_spot', 'body_scratch'],
];
const hardwareOpts = [
  [],
  ['battery_service'],
  ['wifi'],
];
const ageOpts = [
  '0-3 months',
  '3-6 months',
  '6-11 months',
  'Above 11 months',
  null
];
const baseOpts = [53150, 51250];

for (let basePrice of baseOpts) {
  for (let calls of bools) {
    for (let warranty of bools) {
      for (let originalScreen of bools) {
        for (let touch of bools) {
          for (let defects of defectsOpts) {
            for (let hardware of hardwareOpts) {
              for (let mobileAge of ageOpts) {
                let diag = {
                  calls,
                  warranty,
                  originalScreen,
                  touch,
                  screenCondition: defects.includes('screen_scratch') ? 'screen_scratch' : null,
                  defects,
                  hardware,
                  mobileAge,
                  accessories: ['box', 'charger']
                };
                const price = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy Z Flip7 FE 5G', basePrice, diag as any);
                if (Math.abs(price - 13286) < 1000) {
                  console.log("CLOSE MATCH:", price, JSON.stringify(diag));
                }
              }
            }
          }
        }
      }
    }
  }
}
