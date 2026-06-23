const fs = require('fs');
const path = require('path');

const input = `Sell Old Xiaomi Redmi Note 6 Pro (4 GB/64 GB)
Get Upto
₹2,840

Sell Old Xiaomi Redmi Note 6 Pro (6 GB/64 GB)
Get Upto
₹3,070

Sell Old Xiaomi Mi A2 (4 GB/64 GB)
Get Upto
₹2,500

Sell Old Xiaomi Mi A2 (6 GB/128 GB)
Get Upto
₹2,850

Sell Old Xiaomi Redmi 6 (3 GB/32 GB)
Get Upto
₹1,740

Sell Old Xiaomi Redmi 6 (3 GB/64 GB)
Get Upto
₹1,820

Sell Old Xiaomi Redmi 6 pro (3 GB/32 GB)
Get Upto
₹2,160

Sell Old Xiaomi Redmi 6 pro (4 GB/64 GB)
Get Upto
₹2,280

Sell Old Xiaomi Redmi 6A (2 GB/16 GB)
Get Upto
₹1,410

Sell Old Xiaomi Redmi 6A (2 GB/32 GB)
Get Upto
₹1,510

Sell Old Xiaomi Redmi Y2 (4 GB/64 GB)
Get Upto
₹2,200

Sell Old Xiaomi Redmi Y2 (3 GB/32 GB)
Get Upto
₹2,120

Sell Old Xiaomi Redmi 5 (3 GB/32 GB)
Get Upto
₹1,700

Sell Old Xiaomi Redmi 5 (4 GB/64 GB)
Get Upto
₹2,010

Sell Old Xiaomi Redmi 5 (2 GB/16 GB)
Get Upto
₹1,590

Sell Old Xiaomi Redmi Note 5 Pro (6 GB/64 GB)
Get Upto
₹2,650

Sell Old Xiaomi Redmi Note 5 Pro (4 GB/64 GB)
Get Upto
₹2,500

Sell Old Xiaomi Redmi Note 5 (3 GB/32 GB)
Get Upto
₹1,780

Sell Old Xiaomi Redmi Note 5 (4 GB/64 GB)
Get Upto
₹2,080

Sell Old Xiaomi Redmi 5A (3 GB/32 GB)
Get Upto
₹1,290

Sell Old Xiaomi Redmi 5A (2 GB/16 GB)
Get Upto
₹1,140

Sell Old Xiaomi Redmi Y1 (3 GB/32 GB)
Get Upto
₹1,230

Sell Old Xiaomi Redmi Y1 (4 GB/64 GB)
Get Upto
₹1,380

Sell Old Xiaomi Redmi Y1 Lite (2 GB/16 GB)
Get Upto
₹980

Sell Old Xiaomi Mi Mix 2 (6 GB/128 GB)
Get Upto
₹2,830

Sell Old Xiaomi Mi Max 2 (4 GB/32 GB)
Get Upto
₹1,680

Sell Old Xiaomi Mi Max 2 (4 GB/64 GB)
Get Upto
₹1,810

Sell Old Xiaomi Mi Max 2 (4 GB/128 GB)
Get Upto
₹2,220

Sell Old Xiaomi Redmi Note 7 (4 GB/64 GB)
Get Upto
₹3,030

Sell Old Xiaomi Redmi Note 7 (3 GB/32 GB)
Get Upto
₹2,470

Sell Old Xiaomi Redmi Note 7 Pro (6 GB/128 GB)
Get Upto
₹4,090

Sell Old Xiaomi Redmi Note 7 Pro (6 GB/64 GB)
Get Upto
₹3,820

Sell Old Xiaomi Redmi Note 7 Pro (4 GB/64 GB)
Get Upto
₹3,760

Sell Old Xiaomi Redmi Go (1 GB/8 GB)
Get Upto
₹830

Sell Old Xiaomi Redmi Go (1 GB/16 GB)
Get Upto
₹1,040

Sell Old Xiaomi Redmi 7 (2 GB/16 GB)
Get Upto
₹2,350

Sell Old Xiaomi Redmi 7 (3 GB/32 GB)
Get Upto
₹2,570

Sell Old Xiaomi Redmi 7 (3 GB/64 GB)
Get Upto
₹2,690

Sell Old Xiaomi Redmi 7 (2 GB/32 GB)
Get Upto
₹2,500

Sell Old Xiaomi Redmi Note 7S (4 GB/64 GB)
Get Upto
₹3,450

Sell Old Xiaomi Redmi Note 7S (3 GB/32 GB)
Get Upto
₹3,290

Sell Old Xiaomi Redmi Y3 (3 GB/32 GB)
Get Upto
₹2,350

Sell Old Xiaomi Redmi Y3 (4 GB/64 GB)
Get Upto
₹2,500

Sell Old Xiaomi Black Shark 2 (12 GB/256 GB)
Get Upto
₹5,910

Sell Old Xiaomi Black Shark 2 (6 GB/128 GB)
Get Upto
₹4,920

Sell Old Xiaomi Redmi K20 (6 GB/128 GB)
Get Upto
₹4,960

Sell Old Xiaomi Redmi K20 (6 GB/64 GB)
Get Upto
₹4,620

Sell Old Xiaomi Redmi K20 Pro (6 GB/128 GB)
Get Upto
₹5,720

Sell Old Xiaomi Redmi K20 Pro (8 GB/256 GB)
Get Upto
₹6,120

Sell Old Xiaomi Redmi 7A (3 GB/32 GB)
Get Upto
₹1,720

Sell Old Xiaomi Redmi 7A (2 GB/16 GB)
Get Upto
₹1,440

Sell Old Xiaomi Redmi 7A (2 GB/32 GB)
Get Upto
₹1,590

Sell Old Xiaomi Mi A3 (4 GB/64 GB)
Get Upto
₹3,710

Sell Old Xiaomi Mi A3 (6 GB/128 GB)
Get Upto
₹4,130

Sell Old Xiaomi Redmi 8A (2 GB/32 GB)
Get Upto
₹2,250

Sell Old Xiaomi Redmi 8A (3 GB/32 GB)
Get Upto
₹2,460

Sell Old Xiaomi Redmi 8 (4 GB/64 GB)
Get Upto
₹3,370

Sell Old Xiaomi Redmi Note 8 (4 GB/64 GB)
Get Upto
₹3,790

Sell Old Xiaomi Redmi Note 8 (6 GB/128 GB)
Get Upto
₹4,050

Sell Old Xiaomi Redmi Note 8 (3 GB/32 GB)
Get Upto
₹3,560

Sell Old Xiaomi Redmi Note 8 Pro (6 GB/128 GB)
Get Upto
₹4,510

Sell Old Xiaomi Redmi Note 8 Pro (6 GB/64 GB)
Get Upto
₹4,240

Sell Old Xiaomi Redmi Note 8 Pro (8 GB/128 GB)
Get Upto
₹4,750

Sell Old Xiaomi Redmi Note 9 Pro (4 GB/128 GB)
Get Upto
₹4,760

Sell Old Xiaomi Redmi Note 9 Pro (4 GB/64 GB)
Get Upto
₹4,360

Sell Old Xiaomi Redmi Note 9 Pro (6 GB/128 GB)
Get Upto
₹5,010

Sell Old Xiaomi Redmi 8A Dual (3 GB/32 GB)
Get Upto
₹2,800

Sell Old Xiaomi Redmi 8A Dual (2 GB/32 GB)
Get Upto
₹2,700

Sell Old Xiaomi Redmi 8A Dual (3 GB/64 GB)
Get Upto
₹2,990

Sell Old Xiaomi Redmi Note 9 Pro Max (6 GB/128 GB)
Get Upto
₹5,170

Sell Old Xiaomi Redmi Note 9 Pro Max (8 GB/128 GB)
Get Upto
₹5,460

Sell Old Xiaomi Redmi Note 9 Pro Max (6 GB/64 GB)
Get Upto
₹4,740

Sell Old Xiaomi Redmi Note 9 (4 GB/64 GB)
Get Upto
₹4,170

Sell Old Xiaomi Redmi Note 9 (4 GB/128 GB)
Get Upto
₹4,390

Sell Old Xiaomi Redmi Note 9 (6 GB/128 GB)
Get Upto
₹4,630

Sell Old Xiaomi Redmi 9 Prime (4 GB/128 GB)
Get Upto
₹3,790

Sell Old Xiaomi Redmi 9 Prime (4 GB/64 GB)
Get Upto
₹3,490

Sell Old Xiaomi Redmi 9 (4 GB/64 GB)
Get Upto
₹3,120

Sell Old Xiaomi Redmi 9 (4 GB/128 GB)
Get Upto
₹3,400

Sell Old Xiaomi Redmi 9A (2 GB/32 GB)
Get Upto
₹2,730

Sell Old Xiaomi Redmi 9A (3 GB/32 GB)
Get Upto
₹2,950

Sell Old Xiaomi Redmi 9i (4 GB/64 GB)
Get Upto
₹3,070

Sell Old Xiaomi Redmi 9i (4 GB/128 GB)
Get Upto
₹3,290

Sell Old Xiaomi Mi 10T (8 GB/128 GB)
Get Upto
₹7,580

Sell Old Xiaomi Mi 10T (6 GB/128 GB)
Get Upto
₹7,260

Sell Old Xiaomi Mi 10T Pro (8 GB/128 GB)
Get Upto
₹7,760

Sell Old Xiaomi Mi 10i (6 GB/64 GB)
Get Upto
₹6,730

Sell Old Xiaomi Mi 10i (6 GB/128 GB)
Get Upto
₹7,230

Sell Old Xiaomi Mi 10i (8 GB/128 GB)
Get Upto
₹7,410

Sell Old Xiaomi Redmi 9 Power (4 GB/64 GB)
Get Upto
₹3,560

Sell Old Xiaomi Redmi 9 Power (4 GB/128 GB)
Get Upto
₹3,750

Sell Old Xiaomi Redmi 9 Power (6 GB/128 GB)
Get Upto
₹4,010

Sell Old Xiaomi Redmi Note 10 (4 GB/64 GB)
Get Upto
₹4,160

Sell Old Xiaomi Redmi Note 10 (6 GB/128 GB)
Get Upto
₹4,530

Sell Old Xiaomi Redmi Note 10 Pro (6 GB/64 GB)
Get Upto
₹4,540

Sell Old Xiaomi Redmi Note 10 Pro (6 GB/128 GB)
Get Upto
₹5,190

Sell Old Xiaomi Redmi Note 10 Pro (8 GB/128 GB)
Get Upto
₹5,690

Sell Old Xiaomi Redmi Note 10 Pro Max (6 GB/128 GB)
Get Upto
₹5,420

Sell Old Xiaomi Redmi Note 10 Pro Max (6 GB/64 GB)
Get Upto
₹5,000

Sell Old Xiaomi Redmi Note 10 Pro Max (8 GB/128 GB)
Get Upto
₹5,980

Sell Old Xiaomi Mi 11X Pro (8 GB/256 GB)
Get Upto
₹8,180

Sell Old Xiaomi Mi 11X Pro (8 GB/128 GB)
Get Upto
₹7,610

Sell Old Xiaomi Mi 11 Ultra (12 GB/256 GB)
Get Upto
₹17,300

Sell Old Xiaomi Mi 11X (6 GB/128 GB)
Get Upto
₹7,460

Sell Old Xiaomi Mi 11X (8 GB/128 GB)
Get Upto
₹8,100

Sell Old Xiaomi Mi 11 Lite (6 GB/128 GB)
Get Upto
₹5,650

Sell Old Xiaomi Mi 11 Lite (8 GB/128 GB)
Get Upto
₹6,070`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Xiaomi ')) {
    const match = line.match(/Sell Old Xiaomi (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Redmi Note 6 Pro"
      currentVariant = match[2].trim(); // e.g. "4 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Xiaomi',
      model: 'Xiaomi ' + currentModelName,
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

// Remove any existing Xiaomi devices (including the temporary "Under Construction")
const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'xiaomi');

let startId = 32000;
for (const dev of results) {
  filteredDevices.push({
    id: 'xiaomi_' + (startId++),
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
