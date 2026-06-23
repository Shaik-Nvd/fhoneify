const fs = require('fs');
const path = require('path');

const input = `Sell Old iQOO 3 (8 GB/256 GB)
Get Upto
₹6,320

Sell Old iQOO 3 (8 GB/128 GB)
Get Upto
₹6,100

Sell Old iQOO 7 5G (12 GB/256 GB)
Get Upto
₹9,280

Sell Old iQOO 7 5G (8 GB/256 GB)
Get Upto
₹9,010

Sell Old iQOO 7 5G (8 GB/128 GB)
Get Upto
₹8,900

Sell Old iQOO 7 Legend 5G (12 GB/256 GB)
Get Upto
₹10,910

Sell Old iQOO 7 Legend 5G (8 GB/128 GB)
Get Upto
₹10,750

Sell Old iQOO Z3 5G (6 GB/128 GB)
Get Upto
₹7,080

Sell Old iQOO Z3 5G (8 GB/128 GB)
Get Upto
₹7,660

Sell Old iQOO Z3 5G (8 GB/256 GB)
Get Upto
₹7,840

Sell Old iQOO Z5 5G (8 GB/128 GB)
Get Upto
₹7,310

Sell Old iQOO Z5 5G (12 GB/256 GB)
Get Upto
₹7,760

Sell Old iQOO 9 5G (8 GB/128 GB)
Get Upto
₹10,720

Sell Old iQOO 9 5G (12 GB/256 GB)
Get Upto
₹11,280

Sell Old iQOO 9 Pro 5G (12 GB/256 GB)
Get Upto
₹16,210

Sell Old iQOO 9 Pro 5G (8 GB/256 GB)
Get Upto
₹15,830

Sell Old iQOO 9 SE 5G (8 GB/128 GB)
Get Upto
₹10,600

Sell Old iQOO 9 SE 5G (12 GB/256 GB)
Get Upto
₹10,870

Sell Old iQOO Z6 Pro 5G (8 GB/128 GB)
Get Upto
₹7,880

Sell Old iQOO Z6 Pro 5G (6 GB/128 GB)
Get Upto
₹7,540

Sell Old iQOO Z6 Pro 5G (12 GB/256 GB)
Get Upto
₹8,290

Sell Old iQOO Z6 5G (8 GB/128 GB)
Get Upto
₹7,720

Sell Old iQOO Z6 5G (4 GB/128 GB)
Get Upto
₹7,010

Sell Old iQOO Z6 5G (6 GB/128 GB)
Get Upto
₹7,310

Sell Old iQOO Z6 (4 GB/128 GB)
Get Upto
₹5,230

Sell Old iQOO Z6 (6 GB/128 GB)
Get Upto
₹5,720

Sell Old iQOO Z6 (8 GB/128 GB)
Get Upto
₹6,100

Sell Old iQOO Neo 6 5G (8 GB/128 GB)
Get Upto
₹9,870

Sell Old iQOO Neo 6 5G (12 GB/256 GB)
Get Upto
₹10,220

Sell Old iQOO 9T 5G (8 GB/128 GB)
Get Upto
₹13,970

Sell Old iQOO 9T 5G (12 GB/256 GB)
Get Upto
₹15,150

Sell Old iQOO 3 5G (12 GB/256 GB)
Get Upto
₹7,120

Sell Old iQOO Z6 Lite 5G (4 GB/64 GB)
Get Upto
₹5,570

Sell Old iQOO Z6 Lite 5G (6 GB/128 GB)
Get Upto
₹6,480

Sell Old iQOO 11 5G (16 GB/256 GB)
Get Upto
₹18,020

Sell Old iQOO 11 5G (8 GB/256 GB)
Get Upto
₹17,650

Sell Old iQOO Neo 7 5G (8 GB/128 GB)
Get Upto
₹11,000

Sell Old iQOO Neo 7 5G (12 GB/256 GB)
Get Upto
₹11,440

Sell Old iQOO Z7 5G (8 GB/128 GB)
Get Upto
₹9,280

Sell Old iQOO Z7 5G (6 GB/128 GB)
Get Upto
₹8,350

Sell Old iQOO Z7s 5G (8 GB/128 GB)
Get Upto
₹8,220

Sell Old iQOO Z7s 5G (6 GB/128 GB)
Get Upto
₹7,540

Sell Old iQOO Neo 7 Pro 5G (8 GB/128 GB)
Get Upto
₹16,460

Sell Old iQOO Neo 7 Pro 5G (12 GB/256 GB)
Get Upto
₹16,950

Sell Old iQOO Z7 Pro 5G (8 GB/256 GB)
Get Upto
₹14,640

Sell Old iQOO Z7 Pro 5G (8 GB/128 GB)
Get Upto
₹12,480

Sell Old iQOO Neo 9 Pro 5G (12 GB/256 GB)
Get Upto
₹20,140

Sell Old iQOO Neo 9 Pro 5G (8 GB/256 GB)
Get Upto
₹19,060

Sell Old iQOO Neo 9 Pro 5G (8 GB/128 GB)
Get Upto
₹17,050

Sell Old iQOO Z9 5G (8 GB/256 GB)
Get Upto
₹8,070

Sell Old iQOO Z9 5G (8 GB/128 GB)
Get Upto
₹7,570

Sell Old iQOO Z9 Lite 5G (4 GB/128 GB)
Get Upto
₹7,060

Sell Old iQOO Z9 Lite 5G (6 GB/128 GB)
Get Upto
₹7,600

Sell Old iQOO Z9s 5G (8 GB/256 GB)
Get Upto
₹12,500

Sell Old iQOO Z9s 5G (8 GB/128 GB)
Get Upto
₹12,100

Sell Old iQOO Z9s Pro 5G (8 GB/128 GB)
Get Upto
₹12,890

Sell Old iQOO Z9s Pro 5G (8 GB/256 GB)
Get Upto
₹13,130

Sell Old iQOO Z9s Pro 5G (12 GB/256 GB)
Get Upto
₹13,920

Sell Old iQOO Neo 10R 5G (12 GB/256 GB)
Get Upto
₹19,500

Sell Old iQOO Neo 10R 5G (8 GB/128 GB)
Get Upto
₹17,000

Sell Old iQOO Neo 10R 5G (8 GB/256 GB)
Get Upto
₹19,320

Sell Old iQOO Z10 5G (8 GB/256 GB)
Get Upto
₹16,400

Sell Old iQOO Z10 5G (8 GB/128 GB)
Get Upto
₹15,900

Sell Old iQOO Z10 5G (12 GB/256 GB)
Get Upto
₹18,000`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old iQOO ')) {
    const match = line.match(/Sell Old iQOO (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "3"
      currentVariant = match[2].trim(); // e.g. "8 GB/256 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'iQOO',
      model: 'iQOO ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'iqoo');

let startId = 12000;
for (const dev of results) {
  filteredDevices.push({
    id: 'iqoo_' + (startId++),
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
