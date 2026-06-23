const fs = require('fs');
const path = require('path');

const input = `Sell Old Infinix Hot 7 Pro (6 GB/64 GB)
Get Upto
₹2,040

Sell Old Infinix Zero 5 Pro (6 GB/128 GB)
Get Upto
₹2,240

Sell Old Infinix Hot 8 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old Infinix S5 (4 GB/64 GB)
Get Upto
₹1,990

Sell Old Infinix S5 Pro (4 GB/64 GB)
Get Upto
₹2,560

Sell Old Infinix Hot 9 Pro (4 GB/64 GB)
Get Upto
₹2,820

Sell Old Infinix Note 7 (4 GB/64 GB)
Get Upto
₹2,790

Sell Old Infinix Smart HD 2021 (2 GB/32 GB)
Get Upto
₹1,780

Sell Old Infinix Hot 10 (4 GB/64 GB)
Get Upto
₹2,910

Sell Old Infinix Hot 10 (6 GB/128 GB)
Get Upto
₹3,520

Sell Old Infinix Zero 8i (8 GB/128 GB)
Get Upto
₹3,930

Sell Old Infinix Smart 5 (2 GB/32 GB)
Get Upto
₹2,130

Sell Old Infinix Hot 10 Play (3 GB/32 GB)
Get Upto
₹2,480

Sell Old Infinix Hot 10 Play (4 GB/64 GB)
Get Upto
₹2,910

Sell Old Infinix Hot 10s (6 GB/64 GB)
Get Upto
₹2,970

Sell Old Infinix Hot 10s (4 GB/64 GB)
Get Upto
₹2,750

Sell Old Infinix Note 10 (6 GB/128 GB)
Get Upto
₹3,120

Sell Old Infinix Note 10 (4 GB/64 GB)
Get Upto
₹2,860

Sell Old Infinix Note 10 Pro (8 GB/256 GB)
Get Upto
₹4,210

Sell Old Infinix Hot 11 (4 GB/64 GB)
Get Upto
₹2,930

Sell Old Infinix Hot 11S (4 GB/64 GB)
Get Upto
₹3,150

Sell Old Infinix Hot 11S (4 GB/128 GB)
Get Upto
₹3,300

Sell Old Infinix Note 11s (6 GB/64 GB)
Get Upto
₹3,190

Sell Old Infinix Note 11s (8 GB/128 GB)
Get Upto
₹3,400

Sell Old Infinix Note 11 (6 GB/128 GB)
Get Upto
₹3,560

Sell Old Infinix Note 11 (4 GB/64 GB)
Get Upto
₹3,190

Sell Old Infinix Zero 5G (8 GB/128 GB)
Get Upto
₹5,420

Sell Old Infinix Smart 4 Plus (3 GB/32 GB)
Get Upto
₹2,150

Sell Old Infinix HOT 12 Play (4 GB/64 GB)
Get Upto
₹3,500

Sell Old Infinix Hot 9 (4 GB/64 GB)
Get Upto
₹2,600

Sell Old Infinix Note 11s Free Fire Edition (8 GB/128 GB)
Get Upto
₹3,900

Sell Old Infinix Hot 11 2022 (4 GB/64 GB)
Get Upto
₹2,670

Sell Old Infinix Note 12 Turbo (8 GB/128 GB)
Get Upto
₹3,790

Sell Old Infinix Note 12 (6 GB/128 GB)
Get Upto
₹4,240

Sell Old Infinix Note 12 (4 GB/64 GB)
Get Upto
₹4,050

Sell Old Infinix Note 12 Pro 4G (8 GB/256 GB)
Get Upto
₹4,820

Sell Old Infinix Note 12 Pro 5G (8 GB/128 GB)
Get Upto
₹5,900

Sell Old Infinix Hot 12 (4 GB/64 GB)
Get Upto
₹3,260

Sell Old Infinix Smart 6 (2 GB/64 GB)
Get Upto
₹2,360

Sell Old Infinix Note 12 5G (6 GB/64 GB)
Get Upto
₹4,200

Sell Old Infinix Smart 6 Plus (3 GB/64 GB)
Get Upto
₹2,390

Sell Old Infinix Hot 12 Pro (8 GB/128 GB)
Get Upto
₹3,530

Sell Old Infinix Hot 12 Pro (6 GB/64 GB)
Get Upto
₹3,190

Sell Old Infinix Smart 6 HD (2 GB/32 GB)
Get Upto
₹2,080

Sell Old Infinix Zero Ultra (8 GB/256 GB)
Get Upto
₹8,540

Sell Old Infinix Zero 20 (8 GB/128 GB)
Get Upto
₹4,490

Sell Old Infinix Hot 20 5G (4 GB/64 GB)
Get Upto
₹4,080

Sell Old Infinix Hot 20 5G (6 GB/128 GB)
Get Upto
₹4,380

Sell Old Infinix Hot 20 Play (4 GB/64 GB)
Get Upto
₹2,890

Sell Old Infinix Note 12i (4 GB/64 GB)
Get Upto
₹2,890

Sell Old Infinix Smart 7 (4 GB/64 GB)
Get Upto
₹2,080

Sell Old Infinix Smart 7 (4 GB/128 GB)
Get Upto
₹2,300

Sell Old Infinix Zero 5G 2023 (8 GB/128 GB)
Get Upto
₹5,420

Sell Old Infinix Zero 5G 2023 Turbo (8 GB/256 GB)
Get Upto
₹5,940

Sell Old Infinix Smart 7 HD (2 GB/64 GB)
Get Upto
₹1,850

Sell Old Infinix Hot 30i (8 GB/128 GB)
Get Upto
₹4,870

Sell Old Infinix Hot 30i (4 GB/64 GB)
Get Upto
₹3,260

Sell Old Infinix GT 10 Pro (8 GB/256 GB)
Get Upto
₹9,210

Sell Old Infinix Note 30 5G (8 GB/256 GB)
Get Upto
₹7,700

Sell Old Infinix Note 30 5G (4 GB/128 GB)
Get Upto
₹6,100

Sell Old Infinix Hot 30 5G (8 GB/128 GB)
Get Upto
₹6,190

Sell Old Infinix Hot 30 5G (4 GB/128 GB)
Get Upto
₹5,150`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Infinix ')) {
    const match = line.match(/Sell Old Infinix (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Hot 7 Pro"
      currentVariant = match[2].trim(); // e.g. "6 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Infinix',
      model: 'Infinix ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'infinix');

let startId = 11000;
for (const dev of results) {
  filteredDevices.push({
    id: 'infinix_' + (startId++),
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
