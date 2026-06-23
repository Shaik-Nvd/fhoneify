const fs = require('fs');
const path = require('path');

const input = `Sell Old Honor 8X (6 GB/64 GB)
Get Upto
₹2,450

Sell Old Honor 8X (4 GB/64 GB)
Get Upto
₹2,150

Sell Old Honor 8X (6 GB/128 GB)
Get Upto
₹2,560

Sell Old Honor Play (4 GB/64 GB)
Get Upto
₹2,040

Sell Old Honor Play (6 GB/64 GB)
Get Upto
₹2,110

Sell Old Honor 9N (3 GB/32 GB)
Get Upto
₹1,860

Sell Old Honor 9N (4 GB/64 GB)
Get Upto
₹2,010

Sell Old Honor 9N (4 GB/128 GB)
Get Upto
₹2,300

Sell Old Honor 10 (6 GB/128 GB)
Get Upto
₹2,520

Sell Old Honor 7A (3 GB/32 GB)
Get Upto
₹1,640

Sell Old Honor 9 Lite (4 GB/64 GB)
Get Upto
₹1,860

Sell Old Honor 9 Lite (3 GB/32 GB)
Get Upto
₹1,600

Sell Old Honor 7X (4 GB/64 GB)
Get Upto
₹1,560

Sell Old Honor 7X (4 GB/32 GB)
Get Upto
₹1,360

Sell Old Honor 8C (4 GB/64 GB)
Get Upto
₹1,520

Sell Old Honor 8C (4 GB/32 GB)
Get Upto
₹1,410

Sell Old Honor 20i (4 GB/128 GB)
Get Upto
₹2,480

Sell Old Honor 20 (6 GB/128 GB)
Get Upto
₹2,750

Sell Old Honor 9x Pro (6 GB/256 GB)
Get Upto
₹3,160

Sell Old Honor 9A (3 GB/64 GB)
Get Upto
₹2,080

Sell Old Honor 200 5G (8 GB/256 GB)
Get Upto
₹12,050

Sell Old Honor 200 5G (12 GB/512 GB)
Get Upto
₹14,410

Sell Old Honor 200 Pro 5G (12 GB/512 GB)
Get Upto
₹21,020

Sell Old Honor 200 Lite 5G (8 GB/256 GB)
Get Upto
₹8,120

Sell Old Honor 90 (12 GB/512 GB)
Get Upto
₹12,350

Sell Old Honor 90 (8 GB/256 GB)
Get Upto
₹10,390

Sell Old Honor 90 (12 GB/256 GB)
Get Upto
₹11,470`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Honor ')) {
    const match = line.match(/Sell Old Honor (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "8X"
      currentVariant = match[2].trim(); // e.g. "6 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Honor',
      model: 'Honor ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'honor');

let startId = 10000;
for (const dev of results) {
  filteredDevices.push({
    id: 'honor_' + (startId++),
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
