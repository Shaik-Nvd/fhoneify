const fs = require('fs');
const path = require('path');

const input = `Sell Old Nokia 6.1 Plus (4 GB/64 GB)
Get Upto
₹2,260

Sell Old Nokia 6.1 Plus (6 GB/64 GB)
Get Upto
₹2,380

Sell Old Nokia 5.1 Plus (6 GB/64 GB)
Get Upto
₹2,390

Sell Old Nokia 5.1 Plus (3 GB/32 GB)
Get Upto
₹1,750

Sell Old Nokia 5.1 Plus (4 GB/64 GB)
Get Upto
₹2,130

Sell Old Nokia 8 Sirocco (6 GB/128 GB)
Get Upto
₹3,710

Sell Old Nokia 7 Plus (4 GB/64 GB)
Get Upto
₹2,150

Sell Old Nokia 8.1 (6 GB/128 GB)
Get Upto
₹2,670

Sell Old Nokia 8.1 (4 GB/64 GB)
Get Upto
₹2,230

Sell Old Nokia 7.1 (4 GB/64 GB)
Get Upto
₹2,010

Sell Old Nokia 3.2 (2 GB/16 GB)
Get Upto
₹1,410

Sell Old Nokia 3.2 (3 GB/32 GB)
Get Upto
₹1,560

Sell Old Nokia 4.2 (3 GB/32 GB)
Get Upto
₹1,670

Sell Old Nokia 2.2 (2 GB/16 GB)
Get Upto
₹860

Sell Old Nokia 2.2 (3 GB/32 GB)
Get Upto
₹1,040

Sell Old Nokia 7.2 (6 GB/64 GB)
Get Upto
₹2,710

Sell Old Nokia 7.2 (4 GB/64 GB)
Get Upto
₹2,300

Sell Old Nokia 6.2 (4 GB/64 GB)
Get Upto
₹2,190

Sell Old Nokia 5.3 (6 GB/64 GB)
Get Upto
₹3,070

Sell Old Nokia 5.3 (4 GB/64 GB)
Get Upto
₹2,900

Sell Old Nokia 2.4 (3 GB/64 GB)
Get Upto
₹2,300

Sell Old Nokia 3.4 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old Nokia 5.4 (4 GB/64 GB)
Get Upto
₹2,640

Sell Old Nokia 5.4 (6 GB/64 GB)
Get Upto
₹3,080

Sell Old Nokia G20 (4 GB/64 GB)
Get Upto
₹2,710

Sell Old Nokia C20 Plus (3 GB/32 GB)
Get Upto
₹1,930

Sell Old Nokia C20 Plus (2 GB/32 GB)
Get Upto
₹1,670

Sell Old Nokia C01 Plus (2 GB/16 GB)
Get Upto
₹1,260

Sell Old Nokia C01 Plus (2 GB/32 GB)
Get Upto
₹1,520

Sell Old Nokia G10 (4 GB/64 GB)
Get Upto
₹2,510

Sell Old Nokia C30 (4 GB/64 GB)
Get Upto
₹2,520

Sell Old Nokia C30 (3 GB/32 GB)
Get Upto
₹2,240

Sell Old Nokia XR20 (6 GB/128 GB)
Get Upto
₹6,940

Sell Old Nokia G21 (4 GB/64 GB)
Get Upto
₹2,750

Sell Old Nokia G21 (6 GB/128 GB)
Get Upto
₹3,490

Sell Old Nokia C21 Plus (4 GB/64 GB)
Get Upto
₹2,670

Sell Old Nokia C21 Plus (3 GB/32 GB)
Get Upto
₹2,480

Sell Old Nokia G60 5G (6 GB/128 GB)
Get Upto
₹6,310

Sell Old Nokia C12 (2 GB/64 GB)
Get Upto
₹2,010

Sell Old Nokia X30 5G (8 GB/256 GB)
Get Upto
₹7,790

Sell Old Nokia C12 Pro (2 GB/64 GB)
Get Upto
₹2,110

Sell Old Nokia C12 Pro (3 GB/64 GB)
Get Upto
₹2,300

Sell Old Nokia C12 Pro (4 GB/64 GB)
Get Upto
₹2,450

Sell Old Nokia C31 (3 GB/32 GB)
Get Upto
₹2,230

Sell Old Nokia C31 (4 GB/64 GB)
Get Upto
₹2,600

Sell Old Nokia C32 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old Nokia C32 (6 GB/128 GB)
Get Upto
₹2,790

Sell Old Nokia C32 (4 GB/128 GB)
Get Upto
₹2,600

Sell Old Nokia C22 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old Nokia C22 (6 GB/64 GB)
Get Upto
₹2,960

Sell Old Nokia C22 (2 GB/64 GB)
Get Upto
₹2,130

Sell Old Nokia G42 5G (6 GB/128 GB)
Get Upto
₹4,850

Sell Old Nokia G42 5G (8 GB/256 GB)
Get Upto
₹5,230

Sell Old Nokia G42 5G (4 GB/128 GB)
Get Upto
₹3,660

Sell Old Nokia G11 Plus (4 GB/64 GB)
Get Upto
₹2,600`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Nokia ')) {
    const match = line.match(/Sell Old Nokia (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "6.1 Plus"
      currentVariant = match[2].trim(); // e.g. "4 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Nokia',
      model: 'Nokia ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'nokia');

let startId = 16000;
for (const dev of results) {
  filteredDevices.push({
    id: 'nokia_' + (startId++),
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
