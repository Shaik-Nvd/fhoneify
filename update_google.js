const fs = require('fs');
const path = require('path');

const input = `Sell Old Google Pixel 4A (6 GB/128 GB)
Get Upto
₹4,390

Sell Old Google Pixel 6a (6 GB/128 GB)
Get Upto
₹10,080

Sell Old Google Pixel 7 (8 GB/256 GB)
Get Upto
₹14,160

Sell Old Google Pixel 7 (8 GB/128 GB)
Get Upto
₹14,240

Sell Old Google Pixel 7 Pro (12 GB/128 GB)
Get Upto
₹18,470

Sell Old Google Pixel 7 Pro (12 GB/256 GB)
Get Upto
₹19,040

Sell Old Google Pixel 7a (8 GB/128 GB)
Get Upto
₹17,120

Sell Old Google Pixel 8 (8 GB/256 GB)
Get Upto
₹24,800

Sell Old Google Pixel 8 (8 GB/128 GB)
Get Upto
₹24,390

Sell Old Google Pixel 8 Pro (12 GB/256 GB)
Get Upto
₹33,220

Sell Old Google Pixel 8 Pro (12 GB/128 GB)
Get Upto
₹31,490

Sell Old Google Pixel 8 Pro (12 GB/512 GB)
Get Upto
₹33,790

Sell Old Google Pixel 8a (8 GB/256 GB)
Get Upto
₹23,370

Sell Old Google Pixel 8a (8 GB/128 GB)
Get Upto
₹23,080

Sell Old Google Pixel 9 (12 GB/256 GB)
Get Upto
₹37,630

Sell Old Google Pixel 9 Pro XL (16 GB/512 GB)
Get Upto
₹57,120

Sell Old Google Pixel 9 Pro XL (16 GB/256 GB)
Get Upto
₹54,620

Sell Old Google Pixel 9 Pro Fold (16 GB/256 GB)
Get Upto
₹69,510

Sell Old Google Pixel 9 Pro (16 GB/256 GB)
Get Upto
₹50,110

Sell Old Google Pixel 9a (8 GB/256 GB)
Get Upto
₹27,700

Sell Old Google Pixel 10 (12 GB/256 GB)
Get Upto
₹45,500

Sell Old Google Pixel 10 Pro (16 GB/256 GB)
Get Upto
₹64,900

Sell Old Google Pixel 10 Pro XL (16 GB/256 GB)
Get Upto
₹73,000

Sell Old Google Pixel 10 Pro Fold (16 GB/256 GB)
Get Upto
₹98,000

Sell Old Google Pixel 10a (8 GB/256 GB)
Get Upto
₹33,200`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Google ')) {
    const match = line.match(/Sell Old Google (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Pixel 4A"
      currentVariant = match[2].trim(); // e.g. "6 GB/128 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Google',
      model: 'Google ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'google');

let startId = 9000;
for (const dev of results) {
  filteredDevices.push({
    id: 'google_' + (startId++),
    brand: dev.brand,
    model: dev.model,
    storage: dev.storage,
    color: 'Obsidian', // default color
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
