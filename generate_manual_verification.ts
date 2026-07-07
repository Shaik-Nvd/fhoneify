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

const allDevices = SEED_DEVICES.filter(d => ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Vivo', 'OPPO', 'POCO'].includes(d.brand));

async function run() {
  let md = "# 10 Models - Manual Cashify Verification List\\n\\n";
  md += "Please click the **Cashify Link**, select the exact storage variant, and input the listed defects/age to see if the final Cashify quote matches Fhoneify's prediction.\\n\\n";
  md += "| # | Device (Storage) | Age to Select | Defects to Select | Cashify Link | Fhoneify Predicted Price |\\n";
  md += "|---|------------------|---------------|-------------------|--------------|--------------------------|\\n";

  for (let i = 1; i <= 10; i++) {
    const device = randomChoice(allDevices);
    
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
    if (!diag.calls) defectStr.push("No Calls (Device not switching on)");
    if (!diag.touch) defectStr.push("No Touch (Touch not working)");
    if (!diag.originalScreen) defectStr.push("Screen Replaced");
    if (diag.defects.includes('broken_screen')) defectStr.push("Broken Screen (" + diag.screenCondition + ")");
    if (diag.defects.includes('screen_spot')) defectStr.push("Screen Spots (" + diag.screenSpots + ")");
    if (diag.defects.includes('body_scratch')) defectStr.push("Body Scratches (" + diag.bodyScratches + ", " + diag.bodyDents + ")");
    if (diag.defects.includes('panel_missing')) defectStr.push("Panel Missing");
    if (diag.hardware.length > 0) defectStr.push(`Hardware Issues: ${diag.hardware.join(', ')}`);
    if (diag.accessories.length > 0) defectStr.push(`Accessories Available: ${diag.accessories.join(', ')}`);
    else defectStr.push("No Accessories");
    
    const defectSummary = defectStr.length > 0 ? defectStr.join('<br>') : 'Flawless';
    
    const fhoneifyPrice = calculateFhoneifyPrice(device.brand, device.model, device.basePrice, diag);
    
    // Build Cashify link
    const cleanModel = device.model.toLowerCase().startsWith(device.brand.toLowerCase())
      ? device.model.substring(device.brand.length).trim()
      : device.model;
    const cleanModelSlug = cleanModel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = `used-${device.brand.toLowerCase()}-${cleanModelSlug}`;
    const link = `[Link](https://www.cashify.in/sell-old-mobile-phone/${slug})`;

    const ageMap: any = {
      'below3': 'Below 3 months',
      '3to6': '3-6 months',
      '6to11': '6-11 months',
      'above11': 'Above 11 months'
    };

    md += `| ${i} | **${device.model}**<br>${device.storage} | ${ageMap[diag.mobileAge]} | ${defectSummary} | ${link} | **₹${Math.round(fhoneifyPrice)}** |\\n`;
  }

  const artifactPath = "C:\\\\Users\\\\Mubeen_Taj\\\\.gemini\\\\antigravity\\\\brain\\\\d2a07608-096a-49bc-986d-65f7fa943d0a\\\\manual_verification_list.md";
  fs.writeFileSync(artifactPath, md);
  console.log("Artifact created");
}

run();
