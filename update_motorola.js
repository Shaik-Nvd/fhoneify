const fs = require('fs');
const path = require('path');

const input = `Sell Old Motorola One Power (4 GB/64 GB)
Get Upto
₹2,270

Sell Old Motorola Moto G6 Plus (6 GB/64 GB)
Get Upto
₹1,970

Sell Old Motorola Moto Z2 Force (6 GB/64 GB)
Get Upto
₹1,670

Sell Old Motorola Moto G6 (3 GB/32 GB)
Get Upto
₹1,210

Sell Old Motorola Moto G6 (4 GB/64 GB)
Get Upto
₹1,690

Sell Old Motorola Moto G7 Power (4 GB/64 GB)
Get Upto
₹1,970

Sell Old Motorola Moto G7 (4 GB/64 GB)
Get Upto
₹1,740

Sell Old Motorola Moto One (4 GB/64 GB)
Get Upto
₹1,970

Sell Old Motorola One Vision (4 GB/128 GB)
Get Upto
₹2,270

Sell Old Motorola One Action (4 GB/128 GB)
Get Upto
₹2,540

Sell Old Motorola Moto E6s (4 GB/64 GB)
Get Upto
₹2,080

Sell Old Motorola One Macro (4 GB/64 GB)
Get Upto
₹2,040

Sell Old Motorola Moto Edge Plus (12 GB/256 GB)
Get Upto
₹8,180

Sell Old Motorola Moto G8 Power Lite (4 GB/64 GB)
Get Upto
₹2,760

Sell Old Motorola Moto Razr (6 GB/128 GB)
Get Upto
₹9,660

Sell Old Motorola One Fusion Plus (6 GB/128 GB)
Get Upto
₹4,510

Sell Old Motorola Moto G9 (4 GB/64 GB)
Get Upto
₹2,760

Sell Old Motorola Moto E7 Plus (4 GB/64 GB)
Get Upto
₹2,800

Sell Old Motorola Moto Razr 5G (8 GB/256 GB)
Get Upto
₹12,870

Sell Old Motorola Moto G9 Power (4 GB/64 GB)
Get Upto
₹2,840

Sell Old Motorola Moto G 5G (6 GB/128 GB)
Get Upto
₹4,960

Sell Old Motorola Moto G30 (4 GB/64 GB)
Get Upto
₹3,180

Sell Old Motorola Moto G10 Power (4 GB/64 GB)
Get Upto
₹3,030

Sell Old Motorola Moto E7 Power (2 GB/32 GB)
Get Upto
₹2,230

Sell Old Motorola Moto E7 Power (4 GB/64 GB)
Get Upto
₹2,710

Sell Old Motorola Moto G60 (6 GB/128 GB)
Get Upto
₹5,180

Sell Old Motorola Moto Edge 20 Pro (8 GB/128 GB)
Get Upto
₹7,800

Sell Old Motorola Moto G40 Fusion (4 GB/64 GB)
Get Upto
₹4,050

Sell Old Motorola Moto G40 Fusion (6 GB/128 GB)
Get Upto
₹4,880

Sell Old Motorola Moto Edge 20 Fusion (8 GB/128 GB)
Get Upto
₹6,890

Sell Old Motorola Moto Edge 20 Fusion (6 GB/128 GB)
Get Upto
₹6,550

Sell Old Motorola Moto Edge 20 (8 GB/128 GB)
Get Upto
₹6,930

Sell Old Motorola Moto G31 (4 GB/64 GB)
Get Upto
₹3,670

Sell Old Motorola Moto G31 (6 GB/128 GB)
Get Upto
₹4,050

Sell Old Motorola Moto G51 5G (4 GB/64 GB)
Get Upto
₹5,340

Sell Old Motorola Moto E40 (4 GB/64 GB)
Get Upto
₹3,590

Sell Old Motorola Moto Edge 30 Pro (8 GB/128 GB)
Get Upto
₹9,320

Sell Old Motorola Moto Edge 30 (6 GB/128 GB)
Get Upto
₹8,600

Sell Old Motorola Moto Edge 30 (8 GB/128 GB)
Get Upto
₹8,940

Sell Old Motorola Moto G52 (6 GB/128 GB)
Get Upto
₹4,670

Sell Old Motorola Moto G52 (4 GB/64 GB)
Get Upto
₹3,980

Sell Old Motorola Moto G71 5G (6 GB/128 GB)
Get Upto
₹6,480

Sell Old Motorola Moto G82 5G (8 GB/128 GB)
Get Upto
₹7,910

Sell Old Motorola Moto G82 5G (6 GB/128 GB)
Get Upto
₹7,160

Sell Old Motorola Moto G22 (4 GB/64 GB)
Get Upto
₹3,750

Sell Old Motorola Moto G42 (4 GB/64 GB)
Get Upto
₹3,520

Sell Old Motorola Moto G32 (8 GB/128 GB)
Get Upto
₹4,580

Sell Old Motorola Moto G32 (4 GB/64 GB)
Get Upto
₹4,170

Sell Old Motorola Moto Edge 30 Fusion (8 GB/128 GB)
Get Upto
₹10,150

Sell Old Motorola Moto Edge 30 Ultra (12 GB/256 GB)
Get Upto
₹13,100

Sell Old Motorola Moto Edge 30 Ultra (8 GB/128 GB)
Get Upto
₹12,500

Sell Old Motorola Moto G72 (6 GB/128 GB)
Get Upto
₹5,110

Sell Old Motorola Moto G62 5G (8 GB/128 GB)
Get Upto
₹6,830

Sell Old Motorola Moto G62 5G (6 GB/128 GB)
Get Upto
₹6,360

Sell Old Motorola Moto e32s (4 GB/64 GB)
Get Upto
₹2,990

Sell Old Motorola Moto e32s (3 GB/32 GB)
Get Upto
₹2,690

Sell Old Motorola Moto E13 (2 GB/64 GB)
Get Upto
₹3,830

Sell Old Motorola Moto E13 (8 GB/128 GB)
Get Upto
₹4,270

Sell Old Motorola Moto E13 (4 GB/64 GB)
Get Upto
₹4,070

Sell Old Motorola Moto e32 (4 GB/64 GB)
Get Upto
₹3,220

Sell Old Motorola Moto G73 5G (8 GB/128 GB)
Get Upto
₹7,270

Sell Old Motorola Moto e22s (4 GB/64 GB)
Get Upto
₹3,200

Sell Old Motorola Moto Edge 50 Fusion (8 GB/128 GB)
Get Upto
₹13,960

Sell Old Motorola Moto Edge 50 Fusion (12 GB/256 GB)
Get Upto
₹15,070`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Motorola ')) {
    const match = line.match(/Sell Old Motorola (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "One Power"
      currentVariant = match[2].trim(); // e.g. "4 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Motorola',
      model: 'Motorola ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'motorola');

let startId = 15000;
for (const dev of results) {
  filteredDevices.push({
    id: 'motorola_' + (startId++),
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
