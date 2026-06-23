const fs = require('fs');
const path = require('path');

const input = `Sell Old Nothing Phone 1 (8 GB/128 GB)
Get Upto
₹12,430

Sell Old Nothing Phone 1 (8 GB/256 GB)
Get Upto
₹13,030

Sell Old Nothing Phone 1 (12 GB/256 GB)
Get Upto
₹13,380

Sell Old Nothing Phone 2 (8 GB/128 GB)
Get Upto
₹18,990

Sell Old Nothing Phone 2 (12 GB/256 GB)
Get Upto
₹19,660

Sell Old Nothing Phone 2 (12 GB/512 GB)
Get Upto
₹20,160

Sell Old Nothing Phone 2a 5G (12 GB/256 GB)
Get Upto
₹16,360

Sell Old Nothing Phone 2a 5G (8 GB/128 GB)
Get Upto
₹15,210

Sell Old Nothing Phone 2a 5G (8 GB/256 GB)
Get Upto
₹15,670

Sell Old CMF by Nothing Phone 1 (6 GB/128 GB)
Get Upto
₹9,890

Sell Old CMF by Nothing Phone 1 (8 GB/128 GB)
Get Upto
₹10,940

Sell Old Nothing Phone 2a Plus (12 GB/256 GB)
Get Upto
₹17,310

Sell Old Nothing Phone 2a Plus (8 GB/256 GB)
Get Upto
₹16,760

Sell Old Nothing Phone 3a (8 GB/128 GB)
Get Upto
₹18,010

Sell Old Nothing Phone 3a (8 GB/256 GB)
Get Upto
₹19,530

Sell Old Nothing Phone 3a Pro (12 GB/256 GB)
Get Upto
₹22,500

Sell Old Nothing Phone 3a Pro (8 GB/256 GB)
Get Upto
₹21,690

Sell Old Nothing Phone 3a Pro (8 GB/128 GB)
Get Upto
₹20,400

Sell Old CMF by Nothing Phone 2 Pro 5G (8 GB/128 GB)
Get Upto
₹12,700

Sell Old CMF by Nothing Phone 2 Pro 5G (8 GB/256 GB)
Get Upto
₹14,100

Sell Old Nothing Phone 3 (12 GB/256 GB)
Get Upto
₹32,000

Sell Old Nothing Phone 3 (16 GB/512 GB)
Get Upto
₹32,400

Sell Old Nothing Phone 3a Lite (8 GB/128 GB)
Get Upto
₹14,000

Sell Old Nothing Phone 3a Lite (8 GB/256 GB)
Get Upto
₹15,000

Sell Old Nothing Phone 4a (8 GB/256 GB)
Get Upto
₹24,300

Sell Old Nothing Phone 4a (12 GB/256 GB)
Get Upto
₹25,600

Sell Old Nothing Phone 4a (8 GB/128 GB)
Get Upto
₹22,500

Sell Old Nothing Phone 4a Pro (8 GB/128 GB)
Get Upto
₹27,400

Sell Old Nothing Phone 4a Pro (12 GB/256 GB)
Get Upto
₹31,200

Sell Old Nothing Phone 4a Pro (8 GB/256 GB)
Get Upto
₹29,000`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old ')) {
    const match = line.match(/Sell Old (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Nothing Phone 1" or "CMF by Nothing Phone 1"
      currentVariant = match[2].trim(); // e.g. "8 GB/128 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Nothing',
      model: currentModelName, // already has "Nothing" or "CMF by Nothing" in it
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'nothing');

let startId = 17000;
for (const dev of results) {
  filteredDevices.push({
    id: 'nothing_' + (startId++),
    brand: dev.brand,
    model: dev.model,
    storage: dev.storage,
    color: 'White', // default color for Nothing
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
