import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';
import fs from 'fs';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDiagnostics(): DiagnosticsType {
  const diag: DiagnosticsType = {
    calls: Math.random() > 0.1, // 90% chance true
    touch: Math.random() > 0.1, // 90% chance true
    originalScreen: Math.random() > 0.2, // 80% chance true
    defects: [],
    screenCondition: null,
    screenSpots: null,
    screenLines: null,
    screenDiscoloration: null,
    bodyScratches: null,
    bodyDents: null,
    bodyPanel: null,
    bodyBent: null,
    hardware: [],
    accessories: [],
    warranty: false,
    validBill: true,
    eSim: null,
    mobileAge: '3to6',
  };

  if (!diag.originalScreen) {
    diag.defects.push('changed_screen');
  }

  // Random hardware issues
  if (Math.random() > 0.8) diag.hardware.push('front_camera');
  if (Math.random() > 0.8) diag.hardware.push('back_camera');
  if (Math.random() > 0.9) diag.hardware.push('battery_service');

  // Random accessories
  if (Math.random() > 0.5) diag.accessories.push('box');
  if (Math.random() > 0.5) diag.accessories.push('charger');

  return diag;
}

async function runBenchmark() {
  const targetBrands = ['Apple', 'Samsung'];
  const testResults = [];

  for (const targetBrand of targetBrands) {
    const brandDevices = SEED_DEVICES.filter(d => d.brand && d.brand.toLowerCase() === targetBrand.toLowerCase());
    
    // Pick 5 random models
    const selectedDevices = [];
    for (let i = 0; i < 5; i++) {
      selectedDevices.push(randomChoice(brandDevices));
    }

    console.log(`\nStarting Benchmark for ${targetBrand} (5 devices)...`);

    for (const d of selectedDevices) {
      if (!d) continue;
      
      const diag = generateRandomDiagnostics();

      console.log(`\nScraping ${d.brand} ${d.model} (${d.storage}) ...`);
      try {
        const cashifyPrice = await scrapeCashifyPrice({
          brand: d.brand, 
          model: d.model, 
          storage: d.storage, 
          answers: diag
        });
        
        let fhoneifyPrice = calculateFhoneifyPrice(
          d.basePrice, 
          d.brand, 
          d.model, 
          diag
        );

        const diff = fhoneifyPrice - cashifyPrice;
        const diffPercent = ((diff / cashifyPrice) * 100).toFixed(2);
        
        console.log(`--> Fhoneify: ₹${fhoneifyPrice} | Cashify: ₹${cashifyPrice} | Diff: ₹${diff} (${diffPercent}%)`);
        
        testResults.push({
          brand: d.brand,
          model: d.model,
          storage: d.storage,
          fhoneifyPrice,
          cashifyPrice,
          diff,
          diffPercent,
          diag
        });
      } catch (err: any) {
        console.log(`--> Failed: ${err.message}`);
      }
      
      // Wait a bit to avoid getting rate limited or blocked
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Save the report
  const reportPath = 'apple-samsung-benchmark-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\nBenchmark complete. Saved results to ${reportPath}`);
}

runBenchmark();
