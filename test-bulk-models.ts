import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';
import fs from 'fs';

async function testScenario(modelName: string, storage: string, scenarioName: string, diagnostics: DiagnosticsType) {
  const device = SEED_DEVICES.find(d => d.model === modelName && d.storage === storage);
  if (!device) {
    console.log(`Device not found in SEED_DEVICES: ${modelName} ${storage}`);
    return null;
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
    return {
      model: modelName,
      scenario: scenarioName,
      localPrice,
      cashifyPrice: cashifyRes.price,
      difference: localPrice - (cashifyRes.price || 0)
    };
  } catch(e: any) {
    console.log('Cashify Scraping Failed or Device Not Listed:', e.message);
    return {
      model: modelName,
      scenario: scenarioName,
      localPrice,
      cashifyPrice: 'N/A',
      difference: 'N/A'
    };
  }
}

async function runAllTests() {
  const modelsToTest = [
    { name: 'Apple iPhone 11 Pro', storage: '64GB' },
    { name: 'Apple iPhone 11 Pro Max', storage: '64GB' },
    { name: 'Apple iPhone 12 Pro', storage: '128GB' },
    { name: 'Apple iPhone 12 Pro Max', storage: '128GB' },
    { name: 'Apple iPhone 13 Pro', storage: '128GB' },
    { name: 'Apple iPhone 13 Pro Max', storage: '128GB' },
    { name: 'Apple iPhone 14 Pro', storage: '128GB' },
    { name: 'Apple iPhone 14 Pro Max', storage: '128GB' },
    { name: 'Apple iPhone 14 Plus', storage: '128GB' },
    { name: 'Apple iPhone 15 Pro', storage: '128GB' },
    { name: 'Apple iPhone 15 Pro Max', storage: '256GB' },
    { name: 'Apple iPhone 15 Plus', storage: '128GB' },
    { name: 'Apple iPhone 16 Plus', storage: '128GB' },
    { name: 'Apple iPhone 16 Pro', storage: '128GB' },
    { name: 'Apple iPhone 16 Pro Max', storage: '256GB' },
    { name: 'Apple iPhone Air', storage: '128GB' },
    { name: 'Apple iPhone 17 Pro', storage: '128GB' },
    { name: 'Apple iPhone 17 Pro Max', storage: '256GB' },
    { name: 'Apple iPhone 17e', storage: '128GB' },
  ];

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

  const results = [];

  for (const m of modelsToTest) {
    const r1 = await testScenario(m.name, m.storage, 'Flawless', flawless);
    if (r1) results.push(r1);
    
    // To speed up testing and avoid bans, we will test Minor and Major for every second model 
    // or just all of them if the connection holds. Let's do all of them for complete report.
    const r2 = await testScenario(m.name, m.storage, 'Minor Body Defects', minorDefects);
    if (r2) results.push(r2);

    const r3 = await testScenario(m.name, m.storage, 'Major Defects', majorDefects);
    if (r3) results.push(r3);
  }

  console.log("\nTESTS COMPLETE. Generating markdown report...");
  
  let markdown = `# iPhone Bulk Pricing Test Report\n\n`;
  markdown += `| Model | Scenario | Our Price | Cashify Price | Difference |\n`;
  markdown += `|-------|----------|-----------|---------------|------------|\n`;
  
  for (const r of results) {
    markdown += `| ${r.model} | ${r.scenario} | ₹${Math.round(r.localPrice)} | ${r.cashifyPrice === 'N/A' ? 'N/A' : '₹' + r.cashifyPrice} | ${r.difference === 'N/A' ? 'N/A' : '₹' + Math.round(r.difference)} |\n`;
  }

  fs.writeFileSync('C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\d2a07608-096a-49bc-986d-65f7fa943d0a\\test_report.md', markdown);
  console.log("Report saved to artifacts directory.");
}

runAllTests();
