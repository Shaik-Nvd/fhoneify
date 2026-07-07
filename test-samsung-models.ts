import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';
import fs from 'fs';

async function testScenario(modelName: string, storage: string, scenarioName: string, diagnostics: DiagnosticsType) {
  const device = Object.values(SEED_DEVICES).find(d => d.model === modelName && d.storage === storage);
  if (!device) {
    console.log(`Device not found in SEED_DEVICES: ${modelName} ${storage}`);
    return null;
  }
  
  const basePrice = device.basePrice;
  const localPrice = calculateFhoneifyPrice('Samsung', modelName, basePrice, diagnostics);
  
  console.log(`\n--- Testing ${modelName} (${storage}) - ${scenarioName} ---`);
  console.log(`Base Price: ₹${basePrice}`);
  console.log(`Our Local Calculated Price: ₹${localPrice}`);
  
  try {
    const cashifyRes = await scrapeCashifyPrice({
      brand: 'Samsung',
      model: modelName,
      storage: storage,
      answers: diagnostics
    });
    
    if (cashifyRes.success) {
      console.log(`Cashify AI Price: ₹${cashifyRes.price}`);
      console.log(`Difference: ₹${localPrice - (cashifyRes.price || 0)}`);
      return {
        model: modelName,
        scenario: scenarioName,
        localPrice,
        cashifyPrice: cashifyRes.price,
        difference: localPrice - (cashifyRes.price || 0)
      };
    } else {
      console.log('Failed to scrape Cashify AI Price');
    }
  } catch(e: any) {
    console.log(`Error scraping: ${e.message}`);
  }
  return {
    model: modelName,
    scenario: scenarioName,
    localPrice,
    cashifyPrice: 'N/A',
    difference: 'N/A'
  };
};

async function runAllTests() {
  const modelsToTest = [
    { name: 'Samsung Galaxy S22 Ultra 5G', storage: '12 GB/256 GB', basePrice: 38160 },
    { name: 'Samsung Galaxy S23 5G', storage: '8 GB/128 GB', basePrice: 28000 },
    { name: 'Samsung Galaxy S23 Ultra 5G', storage: '12 GB/256 GB', basePrice: 37040 },
    { name: 'Samsung Galaxy S24 Ultra 5G', storage: '12 GB/256 GB', basePrice: 61820 },
    { name: 'Samsung Galaxy Z Fold4 5G', storage: '12 GB/256 GB', basePrice: 35000 },
    { name: 'Samsung Galaxy Z Fold5', storage: '12 GB/256 GB', basePrice: 50000 },
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
    hardware: ['battery_service', 'fingerprint'], accessories: [], eSim: 'Dual eSIM'
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
