import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';

async function testScenario(modelName: string, storage: string, scenarioName: string, diagnostics: DiagnosticsType) {
  const device = SEED_DEVICES.find(d => d.model === modelName && d.storage === storage);
  if (!device) {
    console.log(`Device not found: ${modelName} ${storage}`);
    return;
  }
  
  const basePrice = device.basePrice;
  
  const localPrice = calculateFhoneifyPrice('Apple', modelName, basePrice, diagnostics);
  
  console.log(`\n--- Testing ${modelName} (${storage}) - ${scenarioName} ---`);
  console.log(`Base Price: ₹${basePrice}`);
  console.log(`Our Local Calculated Price: ₹${localPrice}`);
  
  try {
    const cashifyRes = await scrapeCashifyPrice({
      brand: 'Apple',
      model: modelName,
      storage: storage,
      answers: diagnostics
    });
    console.log(`Cashify AI Price: ₹${cashifyRes.price}`);
    console.log(`Difference: ₹${localPrice - (cashifyRes.price || 0)}`);
  } catch(e: any) {
    console.log('Cashify Scraping Failed:', e.message);
  }
}

async function runAllTests() {
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

  await testScenario('Apple iPhone 14 Pro', '128GB', 'Flawless', flawless);
  await testScenario('Apple iPhone 14 Pro', '128GB', 'Minor Body Defects', minorDefects);
  await testScenario('Apple iPhone 14 Pro', '128GB', 'Major Defects', majorDefects);
  
  await testScenario('Apple iPhone 15 Pro Max', '256GB', 'Minor Body Defects', minorDefects);
  console.log("TESTS COMPLETE");
}

runAllTests();
