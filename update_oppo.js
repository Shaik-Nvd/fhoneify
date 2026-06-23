const fs = require('fs');
const path = require('path');

const input = `Sell Old OPPO A7 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old OPPO A7 (3 GB/64 GB)
Get Upto
₹2,040

Sell Old OPPO F9 Pro (6 GB/64 GB)
Get Upto
₹2,670

Sell Old OPPO F9 Pro (6 GB/128 GB)
Get Upto
₹2,970

Sell Old OPPO F9 (4 GB/64 GB)
Get Upto
₹2,640

Sell Old OPPO A3s (4 GB/64 GB)
Get Upto
₹2,120

Sell Old OPPO A3s (3 GB/32 GB)
Get Upto
₹1,930

Sell Old OPPO A3s (2 GB/16 GB)
Get Upto
₹1,740

Sell Old OPPO Find X (8 GB/256 GB)
Get Upto
₹6,970

Sell Old OPPO A5 (4 GB/64 GB)
Get Upto
₹2,690

Sell Old OPPO A5 (4 GB/32 GB)
Get Upto
₹2,460

Sell Old OPPO F7 (6 GB/128 GB)
Get Upto
₹2,600

Sell Old OPPO F7 (4 GB/64 GB)
Get Upto
₹2,380

Sell Old OPPO A83 (2 GB/16 GB)
Get Upto
₹1,360

Sell Old OPPO A83 (3 GB/32 GB)
Get Upto
₹1,440

Sell Old OPPO A83 (4 GB/64 GB)
Get Upto
₹1,670

Sell Old OPPO F5 Youth (3 GB/32 GB)
Get Upto
₹1,700

Sell Old OPPO F5 (6 GB/64 GB)
Get Upto
₹1,930

Sell Old OPPO F5 (4 GB/32 GB)
Get Upto
₹1,780

Sell Old OPPO R11 (4 GB/64 GB)
Get Upto
₹2,270

Sell Old OPPO A77 (4 GB/64 GB)
Get Upto
₹1,490

Sell Old OPPO F3 (4 GB/64 GB)
Get Upto
₹1,480

Sell Old OPPO F3 Plus (6 GB/64 GB)
Get Upto
₹2,230

Sell Old OPPO F3 Plus (4 GB/64 GB)
Get Upto
₹1,860

Sell Old OPPO A57 (3 GB/32 GB)
Get Upto
₹1,510

Sell Old OPPO F1s (3 GB/32 GB)
Get Upto
₹1,190

Sell Old OPPO F1s (4 GB/64 GB)
Get Upto
₹1,330

Sell Old OPPO F1 plus (4 GB/64 GB)
Get Upto
₹1,260

Sell Old OPPO R17 (8 GB/128 GB)
Get Upto
₹4,170

Sell Old OPPO K1 (6 GB/64 GB)
Get Upto
₹3,180

Sell Old OPPO K1 (4 GB/64 GB)
Get Upto
₹3,030

Sell Old OPPO F11 Pro (6 GB/64 GB)
Get Upto
₹4,040

Sell Old OPPO F11 Pro (6 GB/128 GB)
Get Upto
₹4,440

Sell Old OPPO A5s (3 GB/32 GB)
Get Upto
₹2,420

Sell Old OPPO A5s (2 GB/32 GB)
Get Upto
₹2,200

Sell Old OPPO A5s (4 GB/64 GB)
Get Upto
₹2,690

Sell Old OPPO A1K (2 GB/32 GB)
Get Upto
₹2,320

Sell Old OPPO F11 (4 GB/128 GB)
Get Upto
₹3,280

Sell Old OPPO F11 (6 GB/128 GB)
Get Upto
₹3,680

Sell Old OPPO Reno (8 GB/128 GB)
Get Upto
₹4,920

Sell Old OPPO Reno 10x Zoom (6 GB/128 GB)
Get Upto
₹5,490

Sell Old OPPO Reno 10x Zoom (8 GB/256 GB)
Get Upto
₹5,870

Sell Old OPPO K3 (6 GB/64 GB)
Get Upto
₹4,170

Sell Old OPPO K3 (8 GB/128 GB)
Get Upto
₹4,350

Sell Old OPPO A9 (4 GB/128 GB)
Get Upto
₹3,920

Sell Old OPPO Reno 2Z (8 GB/256 GB)
Get Upto
₹5,680

Sell Old OPPO Reno 2 (8 GB/256 GB)
Get Upto
₹5,910

Sell Old OPPO A5 2020 (6 GB/128 GB)
Get Upto
₹3,450

Sell Old OPPO A5 2020 (3 GB/64 GB)
Get Upto
₹3,030

Sell Old OPPO A5 2020 (4 GB/128 GB)
Get Upto
₹3,290

Sell Old OPPO A5 2020 (4 GB/64 GB)
Get Upto
₹3,180

Sell Old OPPO A9 2020 (8 GB/128 GB)
Get Upto
₹4,050

Sell Old OPPO A9 2020 (4 GB/128 GB)
Get Upto
₹3,820

Sell Old OPPO Reno2 F (8 GB/128 GB)
Get Upto
₹5,720

Sell Old OPPO Reno2 F (6 GB/256 GB)
Get Upto
₹5,070

Sell Old OPPO F15 (4 GB/128 GB)
Get Upto
₹4,640

Sell Old OPPO F15 (8 GB/128 GB)
Get Upto
₹4,960

Sell Old OPPO A71 2018 (3 GB/16 GB)
Get Upto
₹1,060

Sell Old OPPO A31 (4 GB/64 GB)
Get Upto
₹3,830

Sell Old OPPO A31 (6 GB/128 GB)
Get Upto
₹4,330

Sell Old OPPO A12 (3 GB/32 GB)
Get Upto
₹2,840

Sell Old OPPO A12 (4 GB/64 GB)
Get Upto
₹3,290

Sell Old OPPO A52 (6 GB/128 GB)
Get Upto
₹4,580

Sell Old OPPO A52 (4 GB/128 GB)
Get Upto
₹4,170

Sell Old OPPO A52 (8 GB/128 GB)
Get Upto
₹4,660

Sell Old OPPO Find X2 (12 GB/256 GB)
Get Upto
₹10,980

Sell Old OPPO A11K (2 GB/32 GB)
Get Upto
₹2,500

Sell Old OPPO Reno3 Pro (8 GB/128 GB)
Get Upto
₹5,720

Sell Old OPPO Reno3 Pro (8 GB/256 GB)
Get Upto
₹5,760

Sell Old OPPO Reno4 Pro (8 GB/128 GB)
Get Upto
₹6,740

Sell Old OPPO A53 (4 GB/64 GB)
Get Upto
₹4,440

Sell Old OPPO A53 (6 GB/128 GB)
Get Upto
₹5,000

Sell Old OPPO F17 Pro (8 GB/128 GB)
Get Upto
₹5,410

Sell Old OPPO F17 (6 GB/128 GB)
Get Upto
₹5,020

Sell Old OPPO F17 (8 GB/128 GB)
Get Upto
₹5,230

Sell Old OPPO A33 2020 (3 GB/32 GB)
Get Upto
₹3,140

Sell Old OPPO A15 (2 GB/32 GB)
Get Upto
₹2,990

Sell Old OPPO A15 (3 GB/32 GB)
Get Upto
₹3,310

Sell Old OPPO A15s (4 GB/128 GB)
Get Upto
₹4,090

Sell Old OPPO A15s (4 GB/64 GB)
Get Upto
₹3,510

Sell Old OPPO Reno5 Pro 5G (8 GB/128 GB)
Get Upto
₹8,990`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old OPPO ')) {
    const match = line.match(/Sell Old OPPO (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "A7"
      currentVariant = match[2].trim(); // e.g. "4 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'OPPO',
      model: 'OPPO ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'oppo');

let startId = 18000;
for (const dev of results) {
  filteredDevices.push({
    id: 'oppo_' + (startId++),
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
