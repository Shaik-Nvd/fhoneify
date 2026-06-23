const fs = require('fs');
const path = require('path');

const input = `Sell Old Realme 2 Pro (6 GB/64 GB)
Get Upto
₹2,700

Sell Old Realme 2 Pro (4 GB/64 GB)
Get Upto
₹2,470

Sell Old Realme 2 Pro (8 GB/128 GB)
Get Upto
₹2,940

Sell Old Realme C1 2019 (3 GB/32 GB)
Get Upto
₹2,010

Sell Old Realme C1 2019 (2 GB/32 GB)
Get Upto
₹1,820

Sell Old Realme C1 (2 GB/16 GB)
Get Upto
₹1,740

Sell Old Realme 2 (3 GB/32 GB)
Get Upto
₹2,080

Sell Old Realme 2 (4 GB/64 GB)
Get Upto
₹2,670

Sell Old Realme 1 (6 GB/128 GB)
Get Upto
₹2,960

Sell Old Realme 1 (3 GB/32 GB)
Get Upto
₹2,010

Sell Old Realme 1 (4 GB/64 GB)
Get Upto
₹2,240

Sell Old Realme U1 (4 GB/64 GB)
Get Upto
₹2,630

Sell Old Realme U1 (3 GB/64 GB)
Get Upto
₹2,360

Sell Old Realme U1 (3 GB/32 GB)
Get Upto
₹2,240

Sell Old Realme 3 (3 GB/32 GB)
Get Upto
₹2,320

Sell Old Realme 3 (4 GB/64 GB)
Get Upto
₹2,860

Sell Old Realme 3 (3 GB/64 GB)
Get Upto
₹2,630

Sell Old Realme 3 Pro (4 GB/64 GB)
Get Upto
₹3,290

Sell Old Realme 3 Pro (6 GB/128 GB)
Get Upto
₹3,820

Sell Old Realme 3 Pro (6 GB/64 GB)
Get Upto
₹3,480

Sell Old Realme C2 (2 GB/32 GB)
Get Upto
₹2,200

Sell Old Realme C2 (3 GB/32 GB)
Get Upto
₹2,310

Sell Old Realme C2 (2 GB/16 GB)
Get Upto
₹2,010

Sell Old Realme X (8 GB/128 GB)
Get Upto
₹5,130

Sell Old Realme X (4 GB/128 GB)
Get Upto
₹4,710

Sell Old Realme 3i (3 GB/32 GB)
Get Upto
₹2,360

Sell Old Realme 3i (4 GB/64 GB)
Get Upto
₹2,780

Sell Old Realme 5 (3 GB/32 GB)
Get Upto
₹2,800

Sell Old Realme 5 (4 GB/64 GB)
Get Upto
₹3,180

Sell Old Realme 5 (4 GB/128 GB)
Get Upto
₹3,510

Sell Old Realme 5 Pro (8 GB/128 GB)
Get Upto
₹4,060

Sell Old Realme 5 Pro (6 GB/64 GB)
Get Upto
₹3,820

Sell Old Realme 5 Pro (4 GB/64 GB)
Get Upto
₹3,660

Sell Old Realme XT (6 GB/64 GB)
Get Upto
₹4,580

Sell Old Realme XT (8 GB/128 GB)
Get Upto
₹4,960

Sell Old Realme XT (4 GB/64 GB)
Get Upto
₹4,290

Sell Old Realme 5s (4 GB/64 GB)
Get Upto
₹3,130

Sell Old Realme 5s (4 GB/128 GB)
Get Upto
₹3,520

Sell Old Realme X2 Pro (12 GB/256 GB)
Get Upto
₹5,480

Sell Old Realme X2 Pro (8 GB/128 GB)
Get Upto
₹5,170

Sell Old Realme X2 Pro (6 GB/64 GB)
Get Upto
₹4,750

Sell Old Realme X2 (8 GB/256 GB)
Get Upto
₹5,260

Sell Old Realme X2 (8 GB/128 GB)
Get Upto
₹5,020

Sell Old Realme X2 (6 GB/128 GB)
Get Upto
₹4,600

Sell Old Realme X2 (4 GB/64 GB)
Get Upto
₹4,140

Sell Old Realme 5i (4 GB/64 GB)
Get Upto
₹3,780

Sell Old Realme 5i (4 GB/128 GB)
Get Upto
₹4,010

Sell Old Realme C3 (3 GB/32 GB)
Get Upto
₹3,140

Sell Old Realme C3 (4 GB/64 GB)
Get Upto
₹3,450

Sell Old Realme X50 Pro (6 GB/128 GB)
Get Upto
₹6,640

Sell Old Realme X50 Pro (8 GB/128 GB)
Get Upto
₹6,880

Sell Old Realme X50 Pro (12 GB/256 GB)
Get Upto
₹7,410

Sell Old Realme 6 (8 GB/128 GB)
Get Upto
₹5,020

Sell Old Realme 6 (6 GB/64 GB)
Get Upto
₹4,630

Sell Old Realme 6 (4 GB/64 GB)
Get Upto
₹4,190

Sell Old Realme 6 (6 GB/128 GB)
Get Upto
₹4,850

Sell Old Realme 6 Pro (6 GB/128 GB)
Get Upto
₹4,950

Sell Old Realme 6 Pro (8 GB/128 GB)
Get Upto
₹5,130

Sell Old Realme 6 Pro (6 GB/64 GB)
Get Upto
₹4,520

Sell Old Realme Narzo 10 (4 GB/128 GB)
Get Upto
₹3,850

Sell Old Realme Narzo 10A (3 GB/32 GB)
Get Upto
₹3,240

Sell Old Realme Narzo 10A (4 GB/64 GB)
Get Upto
₹3,510

Sell Old Realme X3 (6 GB/128 GB)
Get Upto
₹5,410

Sell Old Realme X3 (8 GB/128 GB)
Get Upto
₹5,830

Sell Old Realme X3 SuperZoom (8 GB/256 GB)
Get Upto
₹5,760

Sell Old Realme X3 SuperZoom (8 GB/128 GB)
Get Upto
₹5,260

Sell Old Realme X3 SuperZoom (12 GB/256 GB)
Get Upto
₹5,990

Sell Old Realme C11 (2 GB/32 GB)
Get Upto
₹2,770

Sell Old Realme C12 (3 GB/32 GB)
Get Upto
₹3,150

Sell Old Realme C12 (4 GB/64 GB)
Get Upto
₹3,590

Sell Old Realme 6i (4 GB/64 GB)
Get Upto
₹4,010

Sell Old Realme 6i (6 GB/64 GB)
Get Upto
₹4,480

Sell Old Realme 7 Pro (8 GB/128 GB)
Get Upto
₹5,680

Sell Old Realme 7 Pro (6 GB/128 GB)
Get Upto
₹5,380

Sell Old Realme C15 (3 GB/64 GB)
Get Upto
₹3,480

Sell Old Realme C15 (3 GB/32 GB)
Get Upto
₹3,130

Sell Old Realme C15 (4 GB/64 GB)
Get Upto
₹3,790

Sell Old Realme 7 (8 GB/128 GB)
Get Upto
₹5,230

Sell Old Realme 7 (6 GB/64 GB)
Get Upto
₹4,580

Sell Old Realme Narzo 20 Pro (8 GB/128 GB)
Get Upto
₹4,670

Sell Old Realme Narzo 20 Pro (6 GB/64 GB)
Get Upto
₹4,200

Sell Old Realme Narzo 20 (4 GB/64 GB)
Get Upto
₹4,090

Sell Old Realme Narzo 20 (4 GB/128 GB)
Get Upto
₹4,390

Sell Old Realme Narzo 20A (4 GB/64 GB)
Get Upto
₹3,750

Sell Old Realme Narzo 20A (3 GB/32 GB)
Get Upto
₹3,320

Sell Old Realme 7i (4 GB/64 GB)
Get Upto
₹3,820

Sell Old Realme 7i (4 GB/128 GB)
Get Upto
₹4,450

Sell Old Realme C15 Qualcomm Edition (3 GB/32 GB)
Get Upto
₹3,130

Sell Old Realme C15 Qualcomm Edition (4 GB/64 GB)
Get Upto
₹3,400

Sell Old Realme X7 (8 GB/128 GB)
Get Upto
₹7,420

Sell Old Realme X7 (6 GB/128 GB)
Get Upto
₹7,120

Sell Old Realme X7 Pro (8 GB/128 GB)
Get Upto
₹7,690

Sell Old Realme Narzo 30A (3 GB/32 GB)
Get Upto
₹3,480

Sell Old Realme Narzo 30A (4 GB/64 GB)
Get Upto
₹3,940

Sell Old Realme Narzo 30 Pro 5G (6 GB/64 GB)
Get Upto
₹6,550

Sell Old Realme Narzo 30 Pro 5G (8 GB/128 GB)
Get Upto
₹6,910

Sell Old Realme 8 (6 GB/128 GB)
Get Upto
₹5,380

Sell Old Realme 8 (8 GB/128 GB)
Get Upto
₹5,800

Sell Old Realme 8 (4 GB/128 GB)
Get Upto
₹5,140

Sell Old Realme 8 Pro (8 GB/128 GB)
Get Upto
₹6,290

Sell Old Realme 8 Pro (6 GB/128 GB)
Get Upto
₹5,900

Sell Old Realme C21 (3 GB/32 GB)
Get Upto
₹3,200

Sell Old Realme C21 (4 GB/64 GB)
Get Upto
₹3,400

Sell Old Realme C20 (2 GB/32 GB)
Get Upto
₹2,630

Sell Old Realme C25 (4 GB/128 GB)
Get Upto
₹3,670

Sell Old Realme C25 (4 GB/64 GB)
Get Upto
₹3,400

Sell Old Realme X7 Max 5G (12 GB/256 GB)
Get Upto
₹8,670

Sell Old Realme X7 Max 5G (8 GB/128 GB)
Get Upto
₹8,140

Sell Old Realme C25s (4 GB/128 GB)
Get Upto
₹4,060

Sell Old Realme C25s (4 GB/64 GB)
Get Upto
₹3,750`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Realme ')) {
    const match = line.match(/Sell Old Realme (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "2 Pro"
      currentVariant = match[2].trim(); // e.g. "6 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Realme',
      model: 'Realme ' + currentModelName,
      storage: currentVariant,
      basePrice: price
    });
    
    expectsPrice = false;
  }
}

const seedDevicesFile = path.join(__dirname, 'lib', 'seed_devices.ts');
let seedContent = fs.readFileSync(seedDevicesFile, 'utf8');

const match = seedContent.match(/export const SEED_DEVICES = \[([\s\S]*?)\];/);
if (!match) throw new Error("Could not parse SEED_DEVICES");

const devicesStr = match[1];
const existingDevices = eval(`[${devicesStr}]`);

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'realme');

let startId = 20000;
for (const dev of results) {
  filteredDevices.push({
    id: 'realme_' + (startId++),
    brand: dev.brand,
    model: dev.model,
    storage: dev.storage,
    color: 'Midnight', // default color
    basePrice: dev.basePrice
  });
}

const newSeedContent = `export const SEED_DEVICES = ${JSON.stringify(filteredDevices, null, 2)};\n`;
fs.writeFileSync(seedDevicesFile, newSeedContent);

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
