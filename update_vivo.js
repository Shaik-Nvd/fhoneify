const fs = require('fs');
const path = require('path');

const input = `Sell Old Vivo V9 Pro (6 GB/64 GB)
Get Upto
₹3,120

Sell Old Vivo V9 Pro (4 GB/64 GB)
Get Upto
₹2,970

Sell Old Vivo V11 Pro (6 GB/64 GB)
Get Upto
₹3,600

Sell Old Vivo V11 (6 GB/64 GB)
Get Upto
₹3,110

Sell Old Vivo Y83 Pro (4 GB/64 GB)
Get Upto
₹2,650

Sell Old Vivo NEX (8 GB/128 GB)
Get Upto
₹4,490

Sell Old Vivo Y71i (2 GB/16 GB)
Get Upto
₹1,340

Sell Old Vivo Y81 (3 GB/32 GB)
Get Upto
₹1,830

Sell Old Vivo Y81 (4 GB/32 GB)
Get Upto
₹2,140

Sell Old Vivo Y83 (4 GB/32 GB)
Get Upto
₹2,260

Sell Old Vivo V9 Youth (4 GB/32 GB)
Get Upto
₹2,150

Sell Old Vivo Y71 (4 GB/32 GB)
Get Upto
₹1,720

Sell Old Vivo Y71 (3 GB/16 GB)
Get Upto
₹1,380

Sell Old Vivo Y71 (3 GB/32 GB)
Get Upto
₹1,490

Sell Old Vivo Y53i (2 GB/16 GB)
Get Upto
₹970

Sell Old Vivo X21 (6 GB/128 GB)
Get Upto
₹3,640

Sell Old Vivo V9 (4 GB/64 GB)
Get Upto
₹2,640

Sell Old Vivo V7 (4 GB/32 GB)
Get Upto
₹2,080

Sell Old Vivo V7 Plus (4 GB/64 GB)
Get Upto
₹2,150

Sell Old Vivo Y69 (3 GB/32 GB)
Get Upto
₹1,530

Sell Old Vivo X9 (4 GB/128 GB)
Get Upto
₹2,400

Sell Old Vivo X9 (4 GB/64 GB)
Get Upto
₹2,250

Sell Old Vivo X9s (4 GB/64 GB)
Get Upto
₹2,330

Sell Old Vivo X9s Plus (4 GB/64 GB)
Get Upto
₹2,550

Sell Old Vivo Y55s (3 GB/16 GB)
Get Upto
₹1,050

Sell Old Vivo Y66 (3 GB/32 GB)
Get Upto
₹1,490

Sell Old Vivo V5 Plus (4 GB/64 GB)
Get Upto
₹2,170

Sell Old Vivo V5 Plus (4 GB/32 GB)
Get Upto
₹1,930

Sell Old Vivo V5 (4 GB/32 GB)
Get Upto
₹1,480

Sell Old Vivo Y95 (4 GB/64 GB)
Get Upto
₹2,960

Sell Old Vivo Y93 (4 GB/32 GB)
Get Upto
₹2,420

Sell Old Vivo Y93 (3 GB/64 GB)
Get Upto
₹2,500

Sell Old Vivo Y81i (2 GB/16 GB)
Get Upto
₹1,340

Sell Old Vivo Z10 (4 GB/32 GB)
Get Upto
₹2,500

Sell Old Vivo Y91 (3 GB/32 GB)
Get Upto
₹2,270

Sell Old Vivo Y91 (2 GB/32 GB)
Get Upto
₹2,050

Sell Old Vivo V15 Pro (6 GB/128 GB)
Get Upto
₹4,570

Sell Old Vivo V15 Pro (8 GB/128 GB)
Get Upto
₹4,800

Sell Old Vivo Y91i (2 GB/32 GB)
Get Upto
₹1,750

Sell Old Vivo Y91i (3 GB/32 GB)
Get Upto
₹1,900

Sell Old Vivo Y91i (2 GB/16 GB)
Get Upto
₹1,570

Sell Old Vivo V15 (6 GB/128 GB)
Get Upto
₹4,460

Sell Old Vivo V15 (6 GB/64 GB)
Get Upto
₹4,240

Sell Old Vivo Y17 (4 GB/128 GB)
Get Upto
₹4,500

Sell Old Vivo Y15 2019 (4 GB/64 GB)
Get Upto
₹3,610

Sell Old Vivo Y12 (3 GB/64 GB)
Get Upto
₹3,480

Sell Old Vivo Y12 (4 GB/32 GB)
Get Upto
₹3,710

Sell Old Vivo Z1 Pro (6 GB/128 GB)
Get Upto
₹3,600

Sell Old Vivo Z1 Pro (8 GB/128 GB)
Get Upto
₹3,940

Sell Old Vivo Z1 Pro (4 GB/64 GB)
Get Upto
₹3,390

Sell Old Vivo Z1 Pro (6 GB/64 GB)
Get Upto
₹3,450

Sell Old Vivo S1 (6 GB/128 GB)
Get Upto
₹4,140

Sell Old Vivo S1 (6 GB/64 GB)
Get Upto
₹4,010

Sell Old Vivo S1 (4 GB/128 GB)
Get Upto
₹4,000

Sell Old Vivo Y90 (2 GB/16 GB)
Get Upto
₹1,980

Sell Old Vivo Z1x (4 GB/128 GB)
Get Upto
₹3,750

Sell Old Vivo Z1x (8 GB/128 GB)
Get Upto
₹4,320

Sell Old Vivo Z1x (6 GB/128 GB)
Get Upto
₹4,090

Sell Old Vivo Z1x (6 GB/64 GB)
Get Upto
₹4,010

Sell Old Vivo V17 Pro (8 GB/128 GB)
Get Upto
₹5,550

Sell Old Vivo U10 (3 GB/32 GB)
Get Upto
₹2,820

Sell Old Vivo U10 (4 GB/64 GB)
Get Upto
₹3,260

Sell Old Vivo U10 (3 GB/64 GB)
Get Upto
₹3,040

Sell Old Vivo Y19 (4 GB/128 GB)
Get Upto
₹4,240

Sell Old Vivo U20 (4 GB/64 GB)
Get Upto
₹3,470

Sell Old Vivo U20 (8 GB/128 GB)
Get Upto
₹3,820

Sell Old Vivo U20 (6 GB/64 GB)
Get Upto
₹3,560

Sell Old Vivo V17 (8 GB/128 GB)
Get Upto
₹5,380

Sell Old Vivo S1 Pro (8 GB/128 GB)
Get Upto
₹4,810

Sell Old Vivo Y11 2019 (3 GB/32 GB)
Get Upto
₹2,800

Sell Old Vivo V19 (8 GB/128 GB)
Get Upto
₹5,640

Sell Old Vivo V19 (8 GB/256 GB)
Get Upto
₹6,070

Sell Old Vivo Y50 (8 GB/128 GB)
Get Upto
₹5,170

Sell Old Vivo Y30 (6 GB/128 GB)
Get Upto
₹4,770

Sell Old Vivo Y30 (4 GB/128 GB)
Get Upto
₹4,620

Sell Old Vivo V50e (8 GB/256 GB)
Get Upto
₹19,040`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Vivo ')) {
    const match = line.match(/Sell Old Vivo (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "V9 Pro"
      currentVariant = match[2].trim(); // e.g. "6 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Vivo',
      model: 'Vivo ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'vivo');

let startId = 22000;
for (const dev of results) {
  filteredDevices.push({
    id: 'vivo_' + (startId++),
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
