import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import { SEED_DEVICES } from './lib/seed_devices';
import fs from 'fs';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBoolean(prob: number = 0.5): boolean {
  return Math.random() < prob;
}

const ages = ['below3', '3to6', '6to11', 'above11'];
const screenSpotsOptions = [null, '3 or more minor spots on screen', 'Large/ heavy visible spots on screen'];
const bodyScratchesOptions = [null, '1-2 scratches', '3 or more scratches'];
const bodyDentsOptions = [null, 'No dents', '1-2 dents', '3 or more dents'];
const possibleHardware = ['front_camera', 'back_camera', 'volume_button', 'fingerprint', 'wifi', 'battery_service', 'speaker', 'power_button', 'charging_port', 'face', 'vibrator'];

// Target Apple iPhone models
const targetModels = [
  'Apple iPhone 11', 'Apple iPhone 12', 'Apple iPhone 13', 
  'Apple iPhone 14', 'Apple iPhone 15', 'Apple iPhone 16', 
  'Apple iPhone 17', 'Apple iPhone 17e', 'Apple iPhone 17 Air'
];

async function run() {
  let md = "# Apple Models - Benchmark Report\\n\\n";
  md += "| Model | Storage | Defect Profile | Fhoneify Price | Cashify Price | Diff |\\n";
  md += "|-------|---------|----------------|----------------|---------------|------|\\n";

  for (const modelName of targetModels) {
    // Find a random storage variant for this model
    const variants = SEED_DEVICES.filter(d => d.model === modelName);
    if (variants.length === 0) {
      console.log(`Model ${modelName} not found in seed devices, skipping.`);
      continue;
    }
    const device = randomChoice(variants);

    // Build a random diagnostic profile
    const diag: DiagnosticsType = {
      calls: randomBoolean(0.95),
      touch: randomBoolean(0.90),
      originalScreen: randomBoolean(0.85),
      warranty: randomBoolean(0.3),
      validBill: randomBoolean(0.6),
      mobileAge: randomChoice(ages),
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
      eSim: 'Dual eSIM'
    };

    if (!diag.originalScreen) diag.defects.push('screen_replaced');
    if (randomBoolean(0.3)) {
      diag.defects.push('broken_screen');
      diag.screenCondition = randomChoice(['Scratches on screen', 'Screen cracked/ glass broken']);
    }
    if (randomBoolean(0.1)) {
      diag.defects.push('screen_spot');
      diag.screenSpots = randomChoice(screenSpotsOptions);
    }
    if (randomBoolean(0.4)) {
      diag.defects.push('body_scratch');
      diag.bodyScratches = randomChoice(bodyScratchesOptions);
      diag.bodyDents = randomChoice(bodyDentsOptions);
    }
    if (randomBoolean(0.1)) {
      diag.defects.push('panel_missing');
      diag.bodyPanel = 'Device panel missing/broken';
    }
    
    // Random hardware issues
    if (randomBoolean(0.3)) {
      const numHw = Math.floor(Math.random() * 3) + 1; // 1 to 3 hardware issues
      for (let h = 0; h < numHw; h++) {
        const hw = randomChoice(possibleHardware);
        if (!diag.hardware.includes(hw)) diag.hardware.push(hw);
      }
    }

    // Accessories
    if (randomBoolean(0.8)) diag.accessories.push('box');
    if (randomBoolean(0.8)) diag.accessories.push('charger');
    if (diag.validBill) diag.accessories.push('bill');

    let defectStr = [];
    if (!diag.calls) defectStr.push("No Calls");
    if (!diag.touch) defectStr.push("No Touch");
    if (!diag.originalScreen) defectStr.push("Screen Replaced");
    if (diag.defects.includes('broken_screen')) defectStr.push("Broken Screen");
    if (diag.defects.includes('screen_spot')) defectStr.push("Screen Spots");
    if (diag.defects.includes('body_scratch')) defectStr.push("Body Scratches");
    if (diag.defects.includes('panel_missing')) defectStr.push("Panel Missing");
    if (diag.hardware.length > 0) defectStr.push(`HW: ${diag.hardware.join(',')}`);
    if (diag.accessories.length > 0) defectStr.push(`Acc: ${diag.accessories.join(',')}`);
    else defectStr.push("No Accessories");
    
    const defectSummary = defectStr.length > 0 ? defectStr.join('<br>') : 'Flawless';
    
    const fhPrice = calculateFhoneifyPrice(device.brand, device.model, device.basePrice, diag);
    
    console.log(`Scraping ${device.model} (${device.storage}) ...`);
    let cashifyPrice = 0;
    try {
      const res = await scrapeCashifyPrice({brand: device.brand, model: device.model, storage: device.storage, answers: diag});
      cashifyPrice = res.price || 0;
    } catch(e: any) {
      console.log(`Failed to scrape ${device.model}: ${e.message}`);
    }

    const diff = fhPrice - cashifyPrice;
    md += `| ${device.model} | ${device.storage} | ${defectSummary} | ₹${Math.round(fhPrice)} | ₹${cashifyPrice} | ₹${Math.round(diff)} |\\n`;
    console.log(`--> Fhoneify: ₹${Math.round(fhPrice)} | Cashify: ₹${cashifyPrice} | Diff: ₹${Math.round(diff)}`);
    
    // Save partial progress
    fs.writeFileSync('C:\\\\Users\\\\Mubeen_Taj\\\\.gemini\\\\antigravity\\\\brain\\\\d2a07608-096a-49bc-986d-65f7fa943d0a\\\\apple_benchmark_report.md', md);
  }

  console.log("Done.");
}

run();
