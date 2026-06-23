const fs = require('fs');
const path = require('path');

const input = `Sell Old Asus ROG Phone II ZS660KL (8 GB/128 GB)
Get Upto
₹7,020

Sell Old Asus ROG Phone II ZS660KL (12 GB/512 GB)
Get Upto
₹7,450

Sell Old Asus ROG Phone 3 (8 GB/128 GB)
Get Upto
₹8,380

Sell Old Asus ROG Phone 3 (12 GB/128 GB)
Get Upto
₹8,820

Sell Old Asus ROG Phone 3 (12 GB/256 GB)
Get Upto
₹9,320

Sell Old Asus 8z (8 GB/128 GB)
Get Upto
₹7,330`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Asus ')) {
    const match = line.match(/Sell Old Asus (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "ROG Phone II ZS660KL"
      currentVariant = match[2].trim(); // e.g. "8 GB/128 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Asus',
      model: 'Asus ' + currentModelName,
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

// Remove existing Asus devices to prevent duplicates
const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'asus');

let startId = 8000;
for (const dev of results) {
  filteredDevices.push({
    id: 'asus_' + (startId++),
    brand: dev.brand,
    model: dev.model,
    storage: dev.storage,
    color: 'Midnight',
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
