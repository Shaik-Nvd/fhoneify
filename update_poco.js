const fs = require('fs');
const path = require('path');

const input = `Sell Old POCO F1 (6 GB/128 GB)
Get Upto
₹3,260

Sell Old POCO F1 (6 GB/64 GB)
Get Upto
₹2,970

Sell Old POCO F1 (8 GB/256 GB)
Get Upto
₹3,600

Sell Old POCO X2 (6 GB/64 GB)
Get Upto
₹4,210

Sell Old POCO X2 (8 GB/256 GB)
Get Upto
₹4,750

Sell Old POCO X2 (6 GB/128 GB)
Get Upto
₹4,520

Sell Old POCO M2 Pro (4 GB/64 GB)
Get Upto
₹4,280

Sell Old POCO M2 Pro (6 GB/64 GB)
Get Upto
₹4,750

Sell Old POCO M2 Pro (6 GB/128 GB)
Get Upto
₹4,920

Sell Old POCO M2 (8 GB/128 GB)
Get Upto
₹4,350

Sell Old POCO M2 (6 GB/64 GB)
Get Upto
₹3,850

Sell Old POCO M2 (6 GB/128 GB)
Get Upto
₹4,200

Sell Old POCO C3 (4 GB/64 GB)
Get Upto
₹3,290

Sell Old POCO C3 (3 GB/32 GB)
Get Upto
₹3,050

Sell Old POCO X3 (8 GB/128 GB)
Get Upto
₹5,130

Sell Old POCO X3 (6 GB/64 GB)
Get Upto
₹4,600

Sell Old POCO X3 (6 GB/128 GB)
Get Upto
₹4,820

Sell Old POCO M3 (6 GB/128 GB)
Get Upto
₹4,720

Sell Old POCO M3 (6 GB/64 GB)
Get Upto
₹4,320

Sell Old POCO M3 (4 GB/64 GB)
Get Upto
₹4,090

Sell Old POCO X3 Pro (8 GB/128 GB)
Get Upto
₹5,330

Sell Old POCO X3 Pro (6 GB/128 GB)
Get Upto
₹4,960

Sell Old POCO M3 Pro 5G (4 GB/64 GB)
Get Upto
₹5,650

Sell Old POCO M3 Pro 5G (6 GB/128 GB)
Get Upto
₹6,400

Sell Old POCO F3 GT (6 GB/128 GB)
Get Upto
₹7,880

Sell Old POCO F3 GT (8 GB/128 GB)
Get Upto
₹8,140

Sell Old POCO F3 GT (8 GB/256 GB)
Get Upto
₹8,520

Sell Old POCO M2 Reloaded (4 GB/64 GB)
Get Upto
₹3,030

Sell Old POCO C31 (4 GB/64 GB)
Get Upto
₹3,510

Sell Old POCO C31 (3 GB/32 GB)
Get Upto
₹3,200

Sell Old POCO M4 Pro 5G (6 GB/128 GB)
Get Upto
₹6,800

Sell Old POCO M4 Pro 5G (8 GB/128 GB)
Get Upto
₹6,890

Sell Old POCO M4 Pro 5G (4 GB/64 GB)
Get Upto
₹6,210

Sell Old POCO M4 Pro (8 GB/128 GB)
Get Upto
₹5,110

Sell Old POCO M4 Pro (6 GB/128 GB)
Get Upto
₹4,960

Sell Old POCO M4 Pro (6 GB/64 GB)
Get Upto
₹4,540

Sell Old POCO X4 Pro 5G (8 GB/128 GB)
Get Upto
₹7,850

Sell Old POCO X4 Pro 5G (6 GB/128 GB)
Get Upto
₹7,340

Sell Old POCO X4 Pro 5G (6 GB/64 GB)
Get Upto
₹6,720

Sell Old POCO M4 5G (4 GB/64 GB)
Get Upto
₹5,460

Sell Old POCO M4 5G (6 GB/128 GB)
Get Upto
₹5,840

Sell Old POCO F4 5G (8 GB/128 GB)
Get Upto
₹7,270

Sell Old POCO F4 5G (6 GB/128 GB)
Get Upto
₹7,040

Sell Old POCO F4 5G (12 GB/256 GB)
Get Upto
₹7,720

Sell Old POCO M5 (4 GB/64 GB)
Get Upto
₹3,900

Sell Old POCO M5 (6 GB/128 GB)
Get Upto
₹4,090

Sell Old POCO X5 Pro 5G (6 GB/128 GB)
Get Upto
₹10,540

Sell Old POCO X5 Pro 5G (8 GB/256 GB)
Get Upto
₹11,190

Sell Old POCO C50 (2 GB/32 GB)
Get Upto
₹4,250

Sell Old POCO C50 (3 GB/32 GB)
Get Upto
₹4,660

Sell Old POCO C55 (6 GB/128 GB)
Get Upto
₹5,050

Sell Old POCO C55 (4 GB/64 GB)
Get Upto
₹4,400

Sell Old POCO X5 5G (6 GB/128 GB)
Get Upto
₹9,510

Sell Old POCO X5 5G (8 GB/256 GB)
Get Upto
₹10,050

Sell Old POCO C51 (6 GB/128 GB)
Get Upto
₹4,700

Sell Old POCO C51 (4 GB/64 GB)
Get Upto
₹4,360

Sell Old POCO F5 5G (12 GB/256 GB)
Get Upto
₹13,230

Sell Old POCO F5 5G (8 GB/256 GB)
Get Upto
₹12,250

Sell Old POCO M6 Pro 5G (6 GB/128 GB)
Get Upto
₹7,940

Sell Old POCO M6 Pro 5G (8 GB/256 GB)
Get Upto
₹8,330

Sell Old POCO M6 Pro 5G (4 GB/128 GB)
Get Upto
₹7,400

Sell Old POCO M6 Pro 5G (4 GB/64 GB)
Get Upto
₹6,220

Sell Old POCO C65 (8 GB/256 GB)
Get Upto
₹5,350

Sell Old POCO C65 (4 GB/128 GB)
Get Upto
₹4,580

Sell Old POCO C65 (6 GB/128 GB)
Get Upto
₹4,950

Sell Old POCO X6 5G (8 GB/256 GB)
Get Upto
₹10,680

Sell Old POCO X6 5G (12 GB/256 GB)
Get Upto
₹11,090

Sell Old POCO X6 5G (12 GB/512 GB)
Get Upto
₹12,590

Sell Old POCO X6 Pro 5G (8 GB/256 GB)
Get Upto
₹14,210

Sell Old POCO X6 Pro 5G (12 GB/512 GB)
Get Upto
₹14,670

Sell Old POCO M6 5G (4 GB/64 GB)
Get Upto
₹5,100

Sell Old POCO M6 5G (6 GB/128 GB)
Get Upto
₹5,930

Sell Old POCO M6 5G (4 GB/128 GB)
Get Upto
₹5,440

Sell Old POCO M6 5G (8 GB/256 GB)
Get Upto
₹6,320

Sell Old POCO C61 (6 GB/128 GB)
Get Upto
₹4,750

Sell Old POCO C61 (4 GB/64 GB)
Get Upto
₹4,450

Sell Old POCO F6 5G (12 GB/512 GB)
Get Upto
₹14,990

Sell Old POCO F6 5G (8 GB/256 GB)
Get Upto
₹13,720

Sell Old POCO F6 5G (12 GB/256 GB)
Get Upto
₹14,410

Sell Old POCO X6 Neo 5G (12 GB/256 GB)
Get Upto
₹8,780

Sell Old POCO X6 Neo 5G (8 GB/128 GB)
Get Upto
₹8,440

Sell Old POCO X7 5G (8 GB/256 GB)
Get Upto
₹12,000

Sell Old POCO X7 5G (8 GB/128 GB)
Get Upto
₹11,500

Sell Old POCO M7 Pro 5G (6 GB/128 GB)
Get Upto
₹8,370

Sell Old POCO M7 Pro 5G (8 GB/256 GB)
Get Upto
₹8,950

Sell Old POCO C75 5G (4 GB/64 GB)
Get Upto
₹5,190

Sell Old POCO C75 5G (4 GB/128 GB)
Get Upto
₹5,700

Sell Old POCO X7 Pro 5G (12 GB/256 GB)
Get Upto
₹16,010

Sell Old POCO X7 Pro 5G (8 GB/256 GB)
Get Upto
₹14,290

Sell Old POCO M6 Plus 5G (8 GB/128 GB)
Get Upto
₹6,750

Sell Old POCO M6 Plus 5G (6 GB/128 GB)
Get Upto
₹6,400

Sell Old POCO M7 5G (8 GB/128 GB)
Get Upto
₹6,550

Sell Old POCO M7 5G (6 GB/128 GB)
Get Upto
₹6,100

Sell Old POCO C71 (4 GB/64 GB)
Get Upto
₹3,930

Sell Old POCO C71 (6 GB/128 GB)
Get Upto
₹4,180

Sell Old POCO F7 5G (12 GB/512 GB)
Get Upto
₹20,850

Sell Old POCO F7 5G (12 GB/256 GB)
Get Upto
₹20,500

Sell Old POCO M7 Plus 5G (4 GB/128 GB)
Get Upto
₹7,850

Sell Old POCO M7 Plus 5G (6 GB/128 GB)
Get Upto
₹8,750

Sell Old POCO M7 Plus 5G (8 GB/128 GB)
Get Upto
₹9,250

Sell Old POCO C85 5G (4 GB/128 GB)
Get Upto
₹7,340

Sell Old POCO C85 5G (8 GB/128 GB)
Get Upto
₹9,300

Sell Old POCO C85 5G (6 GB/128 GB)
Get Upto
₹7,910

Sell Old POCO M8 5G (6 GB/128 GB)
Get Upto
₹13,000

Sell Old POCO M8 5G (8 GB/256 GB)
Get Upto
₹15,500

Sell Old POCO M8 5G (8 GB/128 GB)
Get Upto
₹14,000

Sell Old POCO C85x (4 GB/128 GB)
Get Upto
₹8,010

Sell Old POCO C85x (4 GB/64 GB)
Get Upto
₹7,450

Sell Old POCO X8 Pro (12 GB/256 GB)
Get Upto
₹23,400

Sell Old POCO X8 Pro (8 GB/256 GB)
Get Upto
₹21,400`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old POCO ')) {
    const match = line.match(/Sell Old POCO (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "F1"
      currentVariant = match[2].trim(); // e.g. "6 GB/128 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'POCO',
      model: 'POCO ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'poco');

let startId = 19000;
for (const dev of results) {
  filteredDevices.push({
    id: 'poco_' + (startId++),
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
