import { generateQuote } from './modules/quote/service';

// Mock device ID for S25 Ultra 
// We will just temporarily push a mock device to SEED_DEVICES in service.ts context if it doesn't exist, 
// but since this is just a quick test script, we can mock SEED_DEVICES.
import { SEED_DEVICES } from './data';

const testDeviceId = "test-s25-ultra-1tb";
SEED_DEVICES.push({
  id: testDeviceId,
  brand: "Samsung",
  model: "Samsung Galaxy S25 Ultra 5G",
  storage: "1 TB",
  ram: "12 GB",
  color: "Titanium",
  basePrice: 70000,
  slug: "used-samsung-galaxy-s25-ultra-5g-12-gb-1-tb",
  cashifyLink: "",
  image: ""
});

const iteration1 = {
  warranty: false,
  validBill: true,
  accessories: ['box', 'spen'],
  defects: ['broken_screen'],
  screenCondition: 'More than 2 scratches on screen'
};

const iteration2 = {
  warranty: false,
  validBill: false,
  accessories: ['box', 'spen'],
  defects: [],
};

const iteration3 = {
  warranty: false,
  validBill: true,
  accessories: ['spen'],
  defects: ['body_scratch'],
  bodyScratches: '1-2 scratches',
  bodyDents: '1-2 minor dents'
};

async function main() {
  const result1 = await generateQuote(testDeviceId, "good", undefined, iteration1);
  console.log("Iteration 1 (Expected 59740):", (result1 as any)?.estimatedPrice);

  const result2 = await generateQuote(testDeviceId, "excellent", undefined, iteration2);
  console.log("Iteration 2 (Expected 61140):", (result2 as any)?.estimatedPrice);

  const result3 = await generateQuote(testDeviceId, "good", undefined, iteration3);
  console.log("Iteration 3 (Expected 58540):", (result3 as any)?.estimatedPrice);
}
main();
