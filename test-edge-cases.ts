import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';
import puppeteer from 'puppeteer';
import fs from 'fs';

const basePrice = 44000;
const brand = 'Apple';
const modelName = 'Apple iPhone 17e';
const storage = '256GB';

const scenarios: {name: string, diag: DiagnosticsType}[] = [
  {
    name: 'Flawless',
    diag: { calls: true, touch: true, originalScreen: true, warranty: true, validBill: true, mobileAge: 'below3', defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger', 'bill'], eSim: 'Dual eSIM' }
  },
  {
    name: 'Broken Screen',
    diag: { calls: true, touch: true, originalScreen: true, warranty: true, validBill: true, mobileAge: '6to11', defects: ['broken_screen'], screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger', 'bill'], eSim: 'Dual eSIM' }
  },
  {
    name: 'Non Original Screen',
    diag: { calls: true, touch: true, originalScreen: false, warranty: false, validBill: false, mobileAge: 'above11', defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: [], eSim: 'Dual eSIM' }
  },
  {
    name: 'Battery Service',
    diag: { calls: true, touch: true, originalScreen: true, warranty: true, validBill: true, mobileAge: '6to11', defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: ['battery_service'], accessories: ['box', 'charger', 'bill'], eSim: 'Dual eSIM' }
  },
  {
    name: 'Body Scratches',
    diag: { calls: true, touch: true, originalScreen: true, warranty: true, validBill: true, mobileAge: '3to6', defects: ['body_scratch'], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: '1-2 scratches', bodyDents: 'No dents', bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger', 'bill'], eSim: 'Dual eSIM' }
  },
  {
    name: 'Panel Missing',
    diag: { calls: true, touch: true, originalScreen: true, warranty: false, validBill: true, mobileAge: 'above11', defects: ['panel_missing'], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: 'Device panel missing/broken', bodyBent: null, hardware: [], accessories: ['box'], eSim: 'Dual eSIM' }
  },
  {
    name: 'Camera & WiFi Broken',
    diag: { calls: true, touch: true, originalScreen: true, warranty: false, validBill: false, mobileAge: 'above11', defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: ['front_camera', 'back_camera', 'wifi'], accessories: [], eSim: 'Dual eSIM' }
  },
  {
    name: 'Screen Spots',
    diag: { calls: true, touch: true, originalScreen: true, warranty: false, validBill: false, mobileAge: 'above11', defects: ['screen_spot'], screenCondition: null, screenSpots: '3 or more minor spots on screen', screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: [], eSim: 'Dual eSIM' }
  },
  {
    name: 'Touch Issue',
    diag: { calls: true, touch: false, originalScreen: true, warranty: false, validBill: false, mobileAge: 'above11', defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: [], eSim: 'Dual eSIM' }
  },
  {
    name: 'Heavy Damage',
    diag: { calls: false, touch: false, originalScreen: false, warranty: false, validBill: false, mobileAge: 'above11', defects: ['broken_screen', 'panel_missing'], screenCondition: 'Screen cracked/ glass broken', screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: 'Device panel missing/broken', bodyBent: null, hardware: ['battery_service', 'face'], accessories: [], eSim: 'Dual eSIM' }
  }
];

async function run() {
  let md = "# iPhone 17e Edge Case Report\\n\\n";
  md += "| Scenario | Fhoneify Price | Cashify Price | Diff |\\n";
  md += "|----------|----------------|---------------|------|\\n";

  for (const s of scenarios) {
    const fhPrice = calculateFhoneifyPrice('Apple', 'Apple iPhone 17e', 44000, s.diag);
    console.log(`Running ${s.name} on Cashify...`);
    let cashifyPrice = 0;
    try {
      const res = await scrapeCashifyPrice({brand: 'Apple', model: 'Apple iPhone 17e', storage: '256GB', answers: s.diag});
      cashifyPrice = res.price || 0;
    } catch(e: any) {
      console.log(`Failed to scrape: ${e.message}`);
    }
    const diff = fhPrice - cashifyPrice;
    md += `| ${s.name} | ₹${Math.round(fhPrice)} | ₹${cashifyPrice} | ₹${Math.round(diff)} |\\n`;
    console.log(`${s.name} -> Fhoneify: ₹${Math.round(fhPrice)} | Cashify: ₹${cashifyPrice} | Diff: ₹${Math.round(diff)}`);
  }

  fs.writeFileSync('edge_case_report.md', md);
  console.log("Done.");
}

run();
