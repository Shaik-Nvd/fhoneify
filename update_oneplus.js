const fs = require('fs');
const path = require('path');

const input = `  ⟶  One Plus 9 Pro
       ✓  Sell Old OnePlus 9 Pro 5G (12 GB/256 GB)  →  ₹13,360
       ✓  Sell Old OnePlus 9 Pro 5G (8 GB/128 GB)  →  ₹12,150
  ⟶  OnePlus 6T
       ✓  Sell Old OnePlus 6T (6 GB/128 GB)  →  ₹5,050
       ✓  Sell Old OnePlus 6T (8 GB/128 GB)  →  ₹5,600
       ✓  Sell Old OnePlus 6T (8 GB/256 GB)  →  ₹5,720
  ⟶  OnePlus 6
       ✓  Sell Old OnePlus 6 (8 GB/128 GB)  →  ₹4,130
       ✓  Sell Old OnePlus 6 (6 GB/64 GB)  →  ₹3,940
       ✓  Sell Old OnePlus 6 (8 GB/256 GB)  →  ₹4,240
  ⟶  OnePlus 5T
       ✓  Sell Old OnePlus 5T (8 GB/128 GB)  →  ₹2,930
       ✓  Sell Old OnePlus 5T (6 GB/64 GB)  →  ₹2,570
  ⟶  OnePlus 5
       ✓  Sell Old OnePlus 5 (6 GB/64 GB)  →  ₹2,420
       ✓  Sell Old OnePlus 5 (8 GB/128 GB)  →  ₹2,780
  ⟶  OnePlus 3T
       ✓  Sell Old Oneplus 3T (6 GB/128 GB)  →  ₹2,040
       ✓  Sell Old OnePlus 3T (6 GB/64 GB)  →  ₹1,860
  ⟶  OnePlus 3
       ✓  Sell Old OnePlus 3 (6 GB/64 GB)  →  ₹1,700
  ⟶  OnePlus 6T McLaren
       ✓  Sell Old OnePlus 6T McLaren (10 GB/256 GB)  →  ₹5,790
  ⟶  OnePlus 7
       ✓  Sell Old OnePlus 7 (6 GB/128 GB)  →  ₹5,670
       ✓  Sell Old OnePlus 7 (8 GB/256 GB)  →  ₹6,210
  ⟶  OnePlus 7 Pro
       ✓  Sell Old OnePlus 7 Pro (8 GB/256 GB)  →  ₹8,070
       ✓  Sell Old OnePlus 7 Pro (6 GB/128 GB)  →  ₹7,500
       ✓  Sell Old OnePlus 7 Pro (12 GB/256 GB)  →  ₹8,140
  ⟶  OnePlus 7T
       ✓  Sell Old OnePlus 7T (8 GB/256 GB)  →  ₹6,890
       ✓  Sell Old OnePlus 7T (8 GB/128 GB)  →  ₹6,490
  ⟶  OnePlus 7T Pro
       ✓  Sell Old Oneplus 7T Pro (8 GB/256 GB)  →  ₹8,280
       ✓  Sell Old OnePlus 7T Pro (12 GB/256 GB)  →  ₹8,630
  ⟶  OnePlus 8
       ✓  Sell Old OnePlus 8 (8 GB/128 GB)  →  ₹10,270
       ✓  Sell Old OnePlus 8 (6 GB/128 GB)  →  ₹9,660
       ✓  Sell Old OnePlus 8 (12 GB/256 GB)  →  ₹10,450
  ⟶  OnePlus 8 Pro
       ✓  Sell Old OnePlus 8 Pro (12 GB/256 GB)  →  ₹12,420
       ✓  Sell Old OnePlus 8 Pro (8 GB/128 GB)  →  ₹11,930
  ⟶  OnePlus 7T Pro McLaren Edition
       ✓  Sell Old OnePlus 7T Pro McLaren Edition (12 GB/256 GB)  →  ₹9,090
  ⟶  OnePlus Nord
       ✓  Sell Old OnePlus Nord (12 GB/256 GB)  →  ₹8,930
       ✓  Sell Old OnePlus Nord (6 GB/64 GB)  →  ₹6,890
  ⟶  OnePlus 8T
       ✓  Sell Old OnePlus 8T (12 GB/256 GB)  →  ₹10,260
       ✓  Sell Old OnePlus 8T (8 GB/128 GB)  →  ₹9,770
  ⟶  OnePlus 9 5G
       ✓  Sell Old OnePlus 9 5G (12 GB/256 GB)  →  ₹10,220
       ✓  Sell Old OnePlus 9 5G (8 GB/128 GB)  →  ₹9,930
  ⟶  OnePlus 9R 5G
       ✓  Sell Old OnePlus 9R 5G (12 GB/256 GB)  →  ₹10,160
       ✓  Sell Old OnePlus 9R 5G (8 GB/128 GB)  →  ₹9,360
  ⟶  OnePlus 9 Pro 5G
       ✗  Not found
  ⟶  OnePlus Nord CE 5G
       ✓  Sell Old OnePlus Nord CE 5G (12 GB/256 GB)  →  ₹8,000
       ✓  Sell Old OnePlus Nord CE 5G (6 GB/128 GB)  →  ₹7,260
       ✓  Sell Old OnePlus Nord CE 5G (8 GB/128 GB)  →  ₹7,590
  ⟶  OnePlus Nord 2 5G
       ✓  Sell Old OnePlus Nord 2 5G (6 GB/128 GB)  →  ₹8,420
       ✓  Sell Old OnePlus Nord 2 5G (12 GB/256 GB)  →  ₹9,920
       ✓  Sell Old OnePlus Nord 2 5G (8 GB/128 GB)  →  ₹9,350
  ⟶  OnePlus 9RT 5G
       ✓  Sell Old OnePlus 9RT 5G (8 GB/128 GB)  →  ₹10,220
       ✓  Sell Old OnePlus 9RT 5G (12 GB/256 GB)  →  ₹11,490
  ⟶  OnePlus Nord CE 2 5G
       ✓  Sell Old OnePlus Nord CE 2 5G (6 GB/128 GB)  →  ₹8,710
       ✓  Sell Old OnePlus Nord CE 2 5G (8 GB/128 GB)  →  ₹9,010
  ⟶  OnePlus 10 Pro 5G
       ✓  Sell Old OnePlus 10 Pro 5G (8 GB/128 GB)  →  ₹14,150
       ✓  Sell Old OnePlus 10 Pro 5G (12 GB/256 GB)  →  ₹15,170
  ⟶  OnePlus Nord CE 2 Lite 5G
       ✓  Sell Old OnePlus Nord CE 2 Lite 5G (8 GB/128 GB)  →  ₹7,990
  ⟶  OnePlus 10R 5G
       ✓  Sell Old OnePlus 10R 5G (8 GB/128 GB)  →  ₹10,030
       ✓  Sell Old OnePlus 10R 5G (12 GB/256 GB)  →  ₹10,730
  ⟶  OnePlus Nord 2T 5G
       ✓  Sell Old OnePlus Nord 2T 5G (8 GB/128 GB)  →  ₹9,380
       ✓  Sell Old OnePlus Nord 2T 5G (12 GB/256 GB)  →  ₹10,050
  ⟶  OnePlus 10T 5G
       ✓  Sell Old OnePlus 10T 5G (8 GB/128 GB)  →  ₹14,230
       ✓  Sell Old OnePlus 10T 5G (16 GB/256 GB)  →  ₹15,710
       ✓  Sell Old OnePlus 10T 5G (12 GB/256 GB)  →  ₹14,530
  ⟶  OnePlus 11 5G
       ✓  Sell Old OnePlus 11 5G (16 GB/256 GB)  →  ₹24,750
       ✓  Sell Old OnePlus 11 5G (8 GB/128 GB)  →  ₹23,580
  ⟶  Oneplus 11 5G Marble Edition
       ✓  Sell Old Oneplus 11 5G Marble Edition (16 GB/256 GB)  →  ₹26,630
  ⟶  OnePlus 11R 5G
       ✓  Sell Old OnePlus 11R 5G (16 GB/256 GB)  →  ₹21,490
       ✓  Sell Old OnePlus 11R 5G (8 GB/128 GB)  →  ₹20,470
       ✓  Sell Old Oneplus 11R 5G (18 GB/512 GB)  →  ₹22,060
  ⟶  OnePlus Nord CE 3 Lite 5G
       ✓  Sell Old OnePlus Nord CE 3 Lite 5G (8 GB/128 GB)  →  ₹11,740
       ✓  Sell Old OnePlus Nord CE 3 Lite 5G (8 GB/256 GB)  →  ₹12,460
  ⟶  OnePlus Nord 3 5G
       ✓  Sell Old OnePlus Nord 3 5G (16 GB/256 GB)  →  ₹15,220
       ✓  Sell Old OnePlus Nord 3 5G (8 GB/128 GB)  →  ₹14,700
  ⟶  OnePlus Nord CE 3 5G
       ✓  Sell Old OnePlus Nord CE 3 5G (8 GB/128 GB)  →  ₹13,630
       ✓  Sell Old OnePlus Nord CE 3 5G (12 GB/256 GB)  →  ₹14,210
  ⟶  Oneplus Open
       ✓  Sell Old Oneplus Open (16 GB/512 GB)  →  ₹54,320
  ⟶  OnePlus 12
       ✓  Sell Old OnePlus 12 (12 GB/256 GB)  →  ₹34,630
       ✓  Sell Old OnePlus 12 (16 GB/512 GB)  →  ₹37,600
  ⟶  OnePlus 12R
       ✓  Sell Old OnePlus 12R (8 GB/128 GB)  →  ₹24,200
       ✓  Sell Old OnePlus 12R (8 GB/256 GB)  →  ₹25,580
       ✓  Sell Old OnePlus 12R (16 GB/256 GB)  →  ₹26,420
  ⟶  OnePlus Nord CE4 5G
       ✓  Sell Old Oneplus Nord CE4 5G (8 GB/128 GB)  →  ₹13,920
       ✓  Sell Old Oneplus Nord CE4 5G (8 GB/256 GB)  →  ₹15,550
  ⟶  OnePlus Nord CE4 Lite 5G
       ✓  Sell Old OnePlus Nord CE4 Lite 5G (8 GB/128 GB)  →  ₹13,050
       ✓  Sell Old OnePlus Nord CE4 Lite 5G (8 GB/256 GB)  →  ₹13,810
  ⟶  OnePlus Nord 4
       ✓  Sell Old OnePlus Nord 4 (8 GB/256 GB)  →  ₹19,950
       ✓  Sell Old OnePlus Nord 4 (8 GB/128 GB)  →  ₹17,770
       ✓  Sell Old OnePlus Nord 4 (12 GB/256 GB)  →  ₹20,400
  ⟶  OnePlus 13
       ✓  Sell Old OnePlus 13 (24 GB/1 TB)  →  ₹50,500
       ✓  Sell Old OnePlus 13 (16 GB/512 GB)  →  ₹46,680
       ✓  Sell Old OnePlus 13 (12 GB/256 GB)  →  ₹43,630
  ⟶  OnePlus 13R
       ✓  Sell Old OnePlus 13R (16 GB/512 GB)  →  ₹29,800
       ✓  Sell Old OnePlus 13R (12 GB/256 GB)  →  ₹28,890
  ⟶  OnePlus 13s
       ✓  Sell Old OnePlus 13s (12 GB/512 GB)  →  ₹37,500
       ✓  Sell Old OnePlus 13s (12 GB/256 GB)  →  ₹35,440
  ⟶  OnePlus Nord 5
       ✓  Sell Old OnePlus Nord 5 (12 GB/512 GB)  →  ₹26,000
       ✓  Sell Old OnePlus Nord 5 (12 GB/256 GB)  →  ₹24,820
       ✓  Sell Old OnePlus Nord 5 (8 GB/256 GB)  →  ₹23,000
  ⟶  OnePlus Nord CE 5
       ✓  Sell Old OnePlus Nord CE 5 (8 GB/128 GB)  →  ₹17,210
       ✓  Sell Old OnePlus Nord CE 5 (12 GB/256 GB)  →  ₹19,000
       ✓  Sell Old OnePlus Nord CE 5 (8 GB/256 GB)  →  ₹18,430
  ⟶  OnePlus 15
       ✓  Sell Old OnePlus 15 (12 GB/256 GB)  →  ₹54,480
       ✓  Sell Old OnePlus 15 (16 GB/512 GB)  →  ₹57,000
  ⟶  OnePlus 15R
       ✓  Sell Old Oneplus 15R (12 GB/512 GB)  →  ₹36,300
       ✓  Sell Old Oneplus 15R (12 GB/256 GB)  →  ₹34,610
  ⟶  OnePlus Nord 6 5G
       ✓  Sell Old OnePlus Nord 6 5G (8 GB/256 GB)  →  ₹26,500
       ✓  Sell Old OnePlus Nord 6 5G (12 GB/256 GB)  →  ₹28,500
  ⟶  OnePlus Nord CE 2 Lite 5G (6 GB/128 GB)
       ✓  Sell Old OnePlus Nord CE 2 Lite 5G (6 GB/128 GB)  →  ₹7,720`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModel = '';

for (const line of lines) {
  if (line.startsWith('⟶')) {
    currentModel = line.replace('⟶', '').trim();
  } else if (line.startsWith('✓')) {
    const match = line.match(/Sell Old (.*?) \((.*?)\)\s+→\s+₹([\d,]+)/i);
    if (match) {
      let fullModel = match[1].trim(); // e.g. "OnePlus 9 Pro 5G"
      const variant = match[2].trim(); // e.g. "12 GB/256 GB"
      const priceStr = match[3].replace(/,/g, '');
      const price = parseInt(priceStr, 10);
      
      // Clean up the fullModel if it contains "OnePlus" to ensure consistent casing
      // Wait, we'll just use the fullModel from the regex since it's cleaner.
      
      results.push({
        brand: 'OnePlus',
        model: fullModel,
        storage: variant,
        basePrice: price
      });
    }
  }
}

const seedDevicesFile = path.join(__dirname, 'lib', 'seed_devices.ts');
let seedContent = fs.readFileSync(seedDevicesFile, 'utf8');

// The file exports SEED_DEVICES array.
// Find the array content
const match = seedContent.match(/export const SEED_DEVICES = \[([\s\S]*?)\];/);
if (!match) throw new Error("Could not parse SEED_DEVICES");

const devicesStr = match[1];
const existingDevices = eval(`[${devicesStr}]`);

// We want to replace the existing OnePlus devices with the new ones.
const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'oneplus');

let startId = 7000; // Let's use 7000 for new OnePlus devices
for (const dev of results) {
  filteredDevices.push({
    id: 'oneplus_' + (startId++),
    brand: dev.brand,
    model: dev.model,
    storage: dev.storage,
    color: 'Midnight',
    basePrice: dev.basePrice
  });
}

const newSeedContent = `export const SEED_DEVICES = ${JSON.stringify(filteredDevices, null, 2)};\n`;
fs.writeFileSync(seedDevicesFile, newSeedContent);

// Also update cashify_prices.json
const cashifyFile = path.join(__dirname, 'lib', 'cashify_prices.json');
let cashifyPrices = {};
if (fs.existsSync(cashifyFile)) {
  cashifyPrices = JSON.parse(fs.readFileSync(cashifyFile, 'utf8'));
}

for (const dev of results) {
  const lookupKey = (dev.model + '-' + dev.storage).toLowerCase().replace(/[^a-z0-9]/g, '-');
  cashifyPrices[lookupKey] = dev.basePrice;
}

fs.writeFileSync(cashifyFile, JSON.stringify(cashifyPrices, null, 2));

console.log('Updated lib/seed_devices.ts and lib/cashify_prices.json with ' + results.length + ' variants.');
