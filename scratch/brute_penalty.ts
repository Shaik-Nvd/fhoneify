import { calculateFhoneifyPrice } from '../lib/pricingCalculator';

const basePrice = 57000;

const target = 28305;
const cashifyBase = target / 1.04;

const ages = [0.98, 0.93, 0.90, 0.7966, 0.724, 0.65];
const boxes = [0, 380, 570, 190];

for (const ageMult of ages) {
  for (const box of boxes) {
    const raw = cashifyBase - box;
    const oneMinusPen = raw / (57000 * ageMult);
    const pen = 1 - oneMinusPen;
    if (pen > 0 && pen < 1) {
       console.log(`Age: ${ageMult}, BoxBonus: ${box} -> Required Total Penalty: ${pen}`);
    }
  }
}
