const fs = require('fs');
const path = require('path');

const input = `Sell Old Samsung Galaxy Note 20 (8 GB/256 GB)
Get Upto
₹9,270

Sell Old Samsung Galaxy A14 5G (4 GB/128 GB)
Get Upto
₹7,760

Sell Old Samsung Galaxy A14 5G (4 GB/64 GB)
Get Upto
₹6,980

Sell Old Samsung Galaxy A14 5G (6 GB/128 GB)
Get Upto
₹8,290

Sell Old Samsung Galaxy A14 5G (8 GB/128 GB)
Get Upto
₹8,880

Sell Old Samsung Galaxy A13 (6 GB/128 GB)
Get Upto
₹4,660

Sell Old Samsung Galaxy A13 (4 GB/64 GB)
Get Upto
₹3,750

Sell Old Samsung Galaxy A13 (4 GB/128 GB)
Get Upto
₹4,170

Sell Old Samsung Galaxy A03 (3 GB/32 GB)
Get Upto
₹2,240

Sell Old Samsung Galaxy A03 (4 GB/64 GB)
Get Upto
₹2,690

Sell Old Samsung Galaxy A03 Core (2 GB/32 GB)
Get Upto
₹2,150

Sell Old Samsung Galaxy A03s (4 GB/64 GB)
Get Upto
₹2,980

Sell Old Samsung Galaxy A03s (3 GB/32 GB)
Get Upto
₹2,150

Sell Old Samsung Galaxy A10 (2 GB/32 GB)
Get Upto
₹1,850

Sell Old Samsung Galaxy A10s (2 GB/32 GB)
Get Upto
₹1,920

Sell Old Samsung Galaxy A10s (3 GB/32 GB)
Get Upto
₹2,000

Sell Old Samsung Galaxy A12 (4 GB/64 GB)
Get Upto
₹3,500

Sell Old Samsung Galaxy A12 (6 GB/128 GB)
Get Upto
₹3,980

Sell Old Samsung Galaxy A12 (4 GB/128 GB)
Get Upto
₹3,710

Sell Old Samsung Galaxy A20 (3 GB/32 GB)
Get Upto
₹2,540

Sell Old Samsung Galaxy A20s (4 GB/64 GB)
Get Upto
₹2,730

Sell Old Samsung Galaxy A20s (3 GB/32 GB)
Get Upto
₹2,440

Sell Old Samsung Galaxy A21s (4 GB/64 GB)
Get Upto
₹3,350

Sell Old Samsung Galaxy A21s (6 GB/128 GB)
Get Upto
₹3,750

Sell Old Samsung Galaxy A21s (6 GB/64 GB)
Get Upto
₹3,580

Sell Old Samsung Galaxy A22 (6 GB/128 GB)
Get Upto
₹4,220

Sell Old Samsung Galaxy A22 (4 GB/128 GB)
Get Upto
₹3,850

Sell Old Samsung Galaxy A22 5G (6 GB/128 GB)
Get Upto
₹6,020

Sell Old Samsung Galaxy A22 5G (8 GB/128 GB)
Get Upto
₹6,520

Sell Old Samsung Galaxy A23 (8 GB/128 GB)
Get Upto
₹4,940

Sell Old Samsung Galaxy A23 (6 GB/128 GB)
Get Upto
₹4,520

Sell Old Samsung Galaxy A30 (4 GB/64 GB)
Get Upto
₹2,670

Sell Old Samsung Galaxy A30s (4 GB/64 GB)
Get Upto
₹2,570

Sell Old Samsung Galaxy A30s (4 GB/128 GB)
Get Upto
₹2,730

Sell Old Samsung Galaxy A31 (6 GB/128 GB)
Get Upto
₹3,580

Sell Old Samsung Galaxy A32 (8 GB/128 GB)
Get Upto
₹5,340

Sell Old Samsung Galaxy A32 (6 GB/128 GB)
Get Upto
₹4,810

Sell Old Samsung Galaxy A5 2017 (3 GB/32 GB)
Get Upto
₹1,080

Sell Old Samsung Galaxy A50 (4 GB/64 GB)
Get Upto
₹2,930

Sell Old Samsung Galaxy A50 (6 GB/128 GB)
Get Upto
₹3,370

Sell Old Samsung Galaxy A50 (6 GB/64 GB)
Get Upto
₹3,180

Sell Old Samsung Galaxy A50s (6 GB/128 GB)
Get Upto
₹3,000

Sell Old Samsung Galaxy A50s (4 GB/128 GB)
Get Upto
₹2,800

Sell Old Samsung Galaxy A51 (6 GB/128 GB)
Get Upto
₹3,940

Sell Old Samsung Galaxy A51 (8 GB/128 GB)
Get Upto
₹4,140

Sell Old Samsung Galaxy A52 (8 GB/128 GB)
Get Upto
₹5,790

Sell Old Samsung Galaxy A52 (6 GB/128 GB)
Get Upto
₹5,420

Sell Old Samsung Galaxy A52s 5G (6 GB/128 GB)
Get Upto
₹7,620

Sell Old Samsung Galaxy A52s 5G (8 GB/128 GB)
Get Upto
₹8,190

Sell Old Samsung Galaxy A53 5G (6 GB/128 GB)
Get Upto
₹6,780

Sell Old Samsung Galaxy A53 5G (8 GB/128 GB)
Get Upto
₹7,190

Sell Old Samsung Galaxy A53 5G (8 GB/256 GB)
Get Upto
₹7,590

Sell Old Samsung Galaxy A6 (3 GB/32 GB)
Get Upto
₹1,330

Sell Old Samsung Galaxy A6 (4 GB/32 GB)
Get Upto
₹1,460

Sell Old Samsung Galaxy A6 Plus (4 GB/32 GB)
Get Upto
₹1,640

Sell Old Samsung Galaxy A6 Plus (3 GB/32 GB)
Get Upto
₹1,510

Sell Old Samsung Galaxy A6 Plus (4 GB/64 GB)
Get Upto
₹1,820

Sell Old Samsung Galaxy A7 2017 (3 GB/32 GB)
Get Upto
₹1,410

Sell Old Samsung Galaxy A7 2018 (4 GB/64 GB)
Get Upto
₹1,820

Sell Old Samsung Galaxy A7 2018 (6 GB/128 GB)
Get Upto
₹2,150

Sell Old Samsung Galaxy A7 2018 (4 GB/128 GB)
Get Upto
₹2,010

Sell Old Samsung Galaxy A70 (6 GB/128 GB)
Get Upto
₹3,700

Sell Old Samsung Galaxy A70s (6 GB/128 GB)
Get Upto
₹3,460

Sell Old Samsung Galaxy A70s (8 GB/128 GB)
Get Upto
₹3,690

Sell Old Samsung Galaxy A71 (8 GB/128 GB)
Get Upto
₹4,430

Sell Old Samsung Galaxy A71 (6 GB/128 GB)
Get Upto
₹4,070

Sell Old Samsung Galaxy A72 (8 GB/128 GB)
Get Upto
₹6,360

Sell Old Samsung Galaxy A72 (8 GB/256 GB)
Get Upto
₹6,910

Sell Old Samsung Galaxy A73 5G (8 GB/128 GB)
Get Upto
₹8,930

Sell Old Samsung Galaxy A73 5G (8 GB/256 GB)
Get Upto
₹9,660

Sell Old Samsung Galaxy A8 Plus (6 GB/64 GB)
Get Upto
₹2,300

Sell Old Samsung Galaxy A8 Star (6 GB/64 GB)
Get Upto
₹1,780

Sell Old Samsung Galaxy A80 (8 GB/128 GB)
Get Upto
₹5,040

Sell Old Samsung Galaxy A9 2018 (8 GB/128 GB)
Get Upto
₹2,480

Sell Old Samsung Galaxy A9 2018 (6 GB/128 GB)
Get Upto
₹2,260

Sell Old Samsung Galaxy A9 Pro (4 GB/32 GB)
Get Upto
₹1,480

Sell Old Samsung Galaxy C5 Pro (4 GB/64 GB)
Get Upto
₹2,040

Sell Old Samsung Galaxy C7 Pro (4 GB/64 GB)
Get Upto
₹2,110

Sell Old Samsung Galaxy C9 Pro (6 GB/64 GB)
Get Upto
₹2,150

Sell Old Samsung Galaxy F02s (4 GB/64 GB)
Get Upto
₹2,890

Sell Old Samsung Galaxy F02s (3 GB/32 GB)
Get Upto
₹2,740

Sell Old Samsung Galaxy F12 (4 GB/128 GB)
Get Upto
₹3,650

Sell Old Samsung Galaxy F12 (4 GB/64 GB)
Get Upto
₹3,230

Sell Old Samsung Galaxy F13 (4 GB/128 GB)
Get Upto
₹4,000

Sell Old Samsung Galaxy F13 (4 GB/64 GB)
Get Upto
₹3,750

Sell Old Samsung Galaxy F22 (4 GB/64 GB)
Get Upto
₹3,500

Sell Old Samsung Galaxy F22 (6 GB/128 GB)
Get Upto
₹3,810

Sell Old Samsung Galaxy F23 5G (4 GB/128 GB)
Get Upto
₹5,890

Sell Old Samsung Galaxy F23 5G (6 GB/128 GB)
Get Upto
₹6,190

Sell Old Samsung Galaxy F41 (6 GB/64 GB)
Get Upto
₹3,220

Sell Old Samsung Galaxy F41 (6 GB/128 GB)
Get Upto
₹3,560

Sell Old Samsung Galaxy S22 Ultra 5G (12 GB/256 GB)
Get Upto
₹26,600`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Samsung ')) {
    const match = line.match(/Sell Old Samsung (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Galaxy Note 20"
      currentVariant = match[2].trim(); // e.g. "8 GB/256 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Samsung',
      model: 'Samsung ' + currentModelName,
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

// Remove any existing Samsung devices (including "Under Construction")
const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'samsung');

let startId = 31000;
for (const dev of results) {
  filteredDevices.push({
    id: 'samsung_' + (startId++),
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
