const fs = require('fs');
const path = require('path');

const input = `Sell Old LG W10 (3 GB/32 GB)
Get Upto
₹2,190

Sell Old LG G8s ThinQ (6 GB/128 GB)
Get Upto
₹4,370

Sell Old LG G8X ThinQ (6 GB/128 GB)
Get Upto
₹4,540

Sell Old LG Q60 (3 GB/64 GB)
Get Upto
₹2,710`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old LG ')) {
    const match = line.match(/Sell Old LG (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "W10"
      currentVariant = match[2].trim(); // e.g. "3 GB/32 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'LG',
      model: 'LG ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'lg');

let startId = 14000;
for (const dev of results) {
  filteredDevices.push({
    id: 'lg_' + (startId++),
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
