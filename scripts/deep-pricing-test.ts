import fs from 'fs';
import path from 'path';
import { calculateFhoneifyPrice, DiagnosticsType } from '../lib/pricingCalculator';
import { scrapeCashifyPrice } from '../server/modules/quote/cashifyScraper';
import { SEED_DEVICES } from '../lib/seed_devices';

let cashifyBasePrices: Record<string, number> = {};
try {
  const dataPath = path.join(__dirname, '../server/data/cashify_prices.json');
  if (fs.existsSync(dataPath)) {
    cashifyBasePrices = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load cashify_prices.json", err);
}

const DEVICES_TO_TEST = [
  { brand: 'Apple', model: 'Apple iPhone 15 Pro Max', storage: '256 GB' },
  { brand: 'Samsung', model: 'Samsung Galaxy S23 Ultra 5G', storage: '256 GB' },
  { brand: 'OnePlus', model: 'OnePlus 11 5G', storage: '128 GB' },
  { brand: 'Vivo', model: 'Vivo X90 Pro', storage: '256 GB' },
  { brand: 'Nothing', model: 'Nothing Phone 2', storage: '128 GB' },
];

const SCENARIOS = [
  {
    name: 'Flawless',
    diagnostics: {
      calls: true, touch: true, originalScreen: true,
      defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
      bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
      hardware: [], accessories: ['box', 'bill', 'charger'],
      warranty: true, validBill: true, mobileAge: 'below3', eSim: null
    },
    cashifyAnswers: {
      calls: true, touch: true, originalScreen: true, warranty: true, validBill: true,
      defects: [], hardware: [], accessories: ['box', 'bill', 'charger']
    }
  },
  {
    name: 'Minor Wear',
    diagnostics: {
      calls: true, touch: true, originalScreen: true,
      defects: ['body_scratch'], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
      bodyScratches: '1-2 scratches', bodyDents: null, bodyPanel: null, bodyBent: null,
      hardware: [], accessories: [],
      warranty: false, validBill: false, mobileAge: 'above11', eSim: null
    },
    cashifyAnswers: {
      calls: true, touch: true, originalScreen: true, warranty: false, validBill: false,
      defects: ['body_scratch'], hardware: [], accessories: []
    }
  },
  {
    name: 'Broken Screen',
    diagnostics: {
      calls: true, touch: true, originalScreen: false,
      defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null,
      bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
      hardware: [], accessories: [],
      warranty: false, validBill: false, mobileAge: 'above11', eSim: null
    },
    cashifyAnswers: {
      calls: true, touch: true, originalScreen: false, warranty: false, validBill: false,
      defects: ['broken_screen'], hardware: [], accessories: []
    }
  },
  {
    name: 'Hardware Issues',
    diagnostics: {
      calls: true, touch: true, originalScreen: true,
      defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
      bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
      hardware: ['battery_service', 'camera_glass'], accessories: [],
      warranty: false, validBill: false, mobileAge: 'above11', eSim: null
    },
    cashifyAnswers: {
      calls: true, touch: true, originalScreen: true, warranty: false, validBill: false,
      defects: [], hardware: ['battery_service', 'camera_glass'], accessories: []
    }
  },
  {
    name: 'Dead / Poor',
    diagnostics: {
      calls: false, touch: false, originalScreen: false,
      defects: ['screen_scratch', 'body_scratch', 'panel_missing'], screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null,
      bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2', bodyPanel: 'Cracked/ broken side or back panel', bodyBent: null,
      hardware: ['wifi', 'front_camera'], accessories: [],
      warranty: false, validBill: false, mobileAge: 'above11', eSim: null
    },
    cashifyAnswers: {
      calls: false, touch: false, originalScreen: false, warranty: false, validBill: false,
      defects: ['broken_screen', 'body_dent', 'body_scratch'], hardware: ['wifi', 'front_camera'], accessories: []
    }
  }
];

async function main() {
  console.log('Starting Deep Pricing Test...');
  const results = [];

  for (const device of DEVICES_TO_TEST) {
    const seedDevice = SEED_DEVICES.find(d => d.brand === device.brand && d.model === device.model && d.storage.replace(' ', '') === device.storage.replace(' ', ''));
    
    if (!seedDevice) {
      console.error(`Could not find device ${device.model} in seed_devices.ts`);
      continue;
    }

    const lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const basePrice = cashifyBasePrices[lookupKey] || seedDevice.basePrice || 1000;

    for (const scenario of SCENARIOS) {
      console.log(`\nTesting ${device.model} | Scenario: ${scenario.name}`);
      
      const fhoneifyPrice = calculateFhoneifyPrice(device.brand, device.model, basePrice, scenario.diagnostics as DiagnosticsType);
      console.log(`Fhoneify Price: ₹${fhoneifyPrice}`);

      let cashifyPrice = 0;
      
      try {
        const cashifyResult = await scrapeCashifyPrice({
          brand: device.brand,
          model: device.model,
          storage: device.storage,
          answers: scenario.cashifyAnswers
        });
        
        if (cashifyResult.success && typeof cashifyResult.price === 'number') {
          cashifyPrice = cashifyResult.price;
        } else if (cashifyResult.price) {
          cashifyPrice = parseInt(String(cashifyResult.price).replace(/[^0-9]/g, ''), 10) || 0;
        }
        console.log(`Cashify Price: ₹${cashifyPrice}`);
      } catch (err: any) {
        console.error(`Failed to scrape Cashify: ${err.message}`);
      }

      let delta = 0;
      let deltaPercent = 0;
      if (cashifyPrice > 0) {
        delta = fhoneifyPrice - cashifyPrice;
        deltaPercent = (delta / cashifyPrice) * 100;
      }

      results.push({
        Brand: device.brand,
        Model: device.model,
        Storage: device.storage,
        Scenario: scenario.name,
        FhoneifyPrice: fhoneifyPrice,
        CashifyPrice: cashifyPrice,
        Delta: delta,
        DeltaPercent: deltaPercent.toFixed(2) + '%'
      });
    }
  }

  const csvHeader = 'Brand,Model,Storage,Scenario,FhoneifyPrice,CashifyPrice,Delta,DeltaPercent\n';
  const csvRows = results.map(r => `${r.Brand},${r.Model},${r.Storage},${r.Scenario},${r.FhoneifyPrice},${r.CashifyPrice},${r.Delta},${r.DeltaPercent}`).join('\n');
  
  const csvPath = path.join(__dirname, '../pricing_comparison_results.csv');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  
  console.log(`\nTest complete! Results saved to ${csvPath}`);
}

main().catch(console.error);
