import config from './lib/pricingConfig.json';
import cashifyPrices from './lib/cashify_prices.json';

const baseMarketPrice = (cashifyPrices as any)['apple-iphone-15-128gb'] || 40322;
let upliftedBasePrice = baseMarketPrice;
if (baseMarketPrice <= 20000) upliftedBasePrice *= 1.08;
else if (baseMarketPrice <= 50000) upliftedBasePrice *= 1.06;
else upliftedBasePrice *= 1.04;
const realStartPrice = Math.round(upliftedBasePrice);
console.log('Base Market Price for iPhone 15 (128GB): ₹' + baseMarketPrice);
console.log('Fhone Internal Starting Base Price: ₹' + realStartPrice);

// Test 1
const calc1 = realStartPrice * config.ageBonus['3to6'] * config.multipliers.touch_no * (1 - config.defects_screen_body.screen_scratch);
console.log('\nTest 1:');
console.log('Inputs: Age 3-6 Months, Touch Not Working, Scratches on Screen');
console.log('Fhone Final Price: ₹' + Math.max(Math.round(calc1), 1200));

// Test 2
const calc2 = realStartPrice * config.ageBonus['below3'] * (1 - config.defects_functional.fingerprint - config.defects_functional.front_camera) + config.bonuses.box;
console.log('\nTest 2:');
console.log('Inputs: Age Below 3 Months, FaceID Not Working, Front Camera Not Working, Original Box Available');
console.log('Fhone Final Price: ₹' + Math.max(Math.round(calc2), 1200));

// Test 3
const calc3 = realStartPrice * config.ageBonus['above11'] * config.multipliers.calls_no;
console.log('\nTest 3:');
console.log('Inputs: Age Above 11 Months, Cannot Make/Receive Calls (Dead Phone)');
console.log('Fhone Final Price: ₹' + Math.max(Math.round(calc3), 1200));
