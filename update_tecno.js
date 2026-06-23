const fs = require('fs');
const path = require('path');

const input = `Sell Old Tecno Spark 4 (4 GB/64 GB)
Get Upto
₹1,970

Sell Old Tecno Spark 4 (3 GB/32 GB)
Get Upto
₹1,790

Sell Old Tecno Camon 12 Air (3 GB/32 GB)
Get Upto
₹2,010

Sell Old Tecno Camon 12 Air (4 GB/64 GB)
Get Upto
₹2,140

Sell Old Tecno Camon 15 Pro (6 GB/128 GB)
Get Upto
₹3,280

Sell Old Tecno Camon 15 (4 GB/64 GB)
Get Upto
₹2,410

Sell Old Tecno Spark 5 (2 GB/32 GB)
Get Upto
₹1,930

Sell Old Tecno Spark 6 Air (3 GB/64 GB)
Get Upto
₹2,010

Sell Old Tecno Spark 6 Air (3 GB/32 GB)
Get Upto
₹1,840

Sell Old Tecno Spark 6 Air (2 GB/32 GB)
Get Upto
₹1,670

Sell Old Tecno Spark 5 Pro (4 GB/64 GB)
Get Upto
₹2,390

Sell Old Tecno Spark Power 2 (4 GB/64 GB)
Get Upto
₹2,270

Sell Old Tecno Spark Power 2 Air (3 GB/32 GB)
Get Upto
₹2,110

Sell Old Tecno Camon 16 (4 GB/64 GB)
Get Upto
₹2,670

Sell Old Tecno POVA (6 GB/128 GB)
Get Upto
₹2,760

Sell Old Tecno POVA (4 GB/64 GB)
Get Upto
₹2,630

Sell Old Tecno Camon 16 Premier (8 GB/128 GB)
Get Upto
₹3,850

Sell Old Tecno Spark 7 Pro (4 GB/64 GB)
Get Upto
₹2,540

Sell Old Tecno Spark 7 Pro (6 GB/64 GB)
Get Upto
₹2,940

Sell Old Tecno Camon 17 (6 GB/128 GB)
Get Upto
₹3,360

Sell Old Tecno Camon 17 Pro (6 GB/128 GB)
Get Upto
₹4,170

Sell Old Tecno POVA 2 (6 GB/128 GB)
Get Upto
₹3,070

Sell Old Tecno POVA 2 (4 GB/64 GB)
Get Upto
₹2,900

Sell Old Tecno Spark 8 (2 GB/64 GB)
Get Upto
₹2,200

Sell Old Tecno Spark 8T (4 GB/64 GB)
Get Upto
₹2,730

Sell Old Tecno Camon 18 (4 GB/128 GB)
Get Upto
₹3,410

Sell Old Tecno Spark 8 Pro (4 GB/64 GB)
Get Upto
₹2,900

Sell Old Tecno Spark 8C (3 GB/64 GB)
Get Upto
₹2,820

Sell Old Tecno Pova 5G (8 GB/128 GB)
Get Upto
₹4,660

Sell Old Tecno Pova Neo (6 GB/128 GB)
Get Upto
₹2,950

Sell Old Tecno Phantom X (8 GB/256 GB)
Get Upto
₹5,230

Sell Old Tecno POVA 3 (4 GB/64 GB)
Get Upto
₹3,330

Sell Old Tecno POVA 3 (6 GB/128 GB)
Get Upto
₹3,480

Sell Old Tecno Spark 8P (4 GB/64 GB)
Get Upto
₹2,820

Sell Old Tecno Spark 9 (6 GB/128 GB)
Get Upto
₹2,900

Sell Old Tecno Spark 9 (4 GB/64 GB)
Get Upto
₹2,640

Sell Old Tecno Camon 19 (6 GB/128 GB)
Get Upto
₹3,650

Sell Old Tecno Camon 19 Neo (6 GB/128 GB)
Get Upto
₹3,520

Sell Old Tecno Camon 19 Pro 5G (8 GB/128 GB)
Get Upto
₹8,150

Sell Old Tecno Camon 19 Pro 5G (8 GB/256 GB)
Get Upto
₹8,580

Sell Old Tecno Camon 20 (8 GB/256 GB)
Get Upto
₹6,850

Sell Old Tecno Camon 20 Premier 5G (16 GB/512 GB)
Get Upto
₹9,800

Sell Old Tecno Camon 20 Premier 5G (8 GB/512 GB)
Get Upto
₹9,000

Sell Old Tecno Camon 20 Pro 5G (8 GB/128 GB)
Get Upto
₹8,720

Sell Old Tecno Camon 20 Pro 5G (8 GB/256 GB)
Get Upto
₹9,500

Sell Old Tecno Phantom V Fold 5G (12 GB/512 GB)
Get Upto
₹20,500

Sell Old Tecno Phantom V Fold 5G (12 GB/256 GB)
Get Upto
₹16,660

Sell Old Tecno Phantom X2 5G (8 GB/256 GB)
Get Upto
₹12,500

Sell Old Tecno Phantom X2 Pro 5G (12 GB/256 GB)
Get Upto
₹14,200

Sell Old Tecno Pova 4 (8 GB/128 GB)
Get Upto
₹3,780

Sell Old Tecno Spark 10 5G (8 GB/256 GB)
Get Upto
₹7,350

Sell Old Tecno Spark 10 5G (4 GB/64 GB)
Get Upto
₹5,680

Sell Old Tecno Spark 10 5G (8 GB/128 GB)
Get Upto
₹6,200

Sell Old Tecno Spark 7P (4 GB/128 GB)
Get Upto
₹2,720

Sell Old Tecno Spark Go 2023 (4 GB/64 GB)
Get Upto
₹3,720

Sell Old Tecno Spark GO 3 (4 GB/64 GB)
Get Upto
₹5,880

Sell Old Tecno Camon 30 5G (8 GB/256 GB)
Get Upto
₹12,400

Sell Old Tecno Camon 30 Premier 5G (12 GB/512 GB)
Get Upto
₹14,500

Sell Old Tecno Pova 7 5G (8 GB/128 GB)
Get Upto
₹7,450

Sell Old Tecno Pova 7 5G (8 GB/256 GB)
Get Upto
₹8,400

Sell Old Tecno Pova 7 Pro 5G (8 GB/256 GB)
Get Upto
₹10,500

Sell Old Tecno Pova 7 Pro 5G (8 GB/128 GB)
Get Upto
₹10,000

Sell Old Tecno Pova Curve 5G (6 GB/128 GB)
Get Upto
₹8,330

Sell Old Tecno Pova Curve 5G (8 GB/128 GB)
Get Upto
₹10,000

Sell Old Tecno Pova Curve 5G (8 GB/256 GB)
Get Upto
₹11,000

Sell Old Tecno Spark 30C 5G (4 GB/128 GB)
Get Upto
₹5,990

Sell Old Tecno Spark 30C 5G (4 GB/64 GB)
Get Upto
₹5,390

Sell Old Tecno Camon 20s Pro 5G (8 GB/128 GB)
Get Upto
₹8,820`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l);

const results = [];
let currentModelName = '';
let currentVariant = '';
let expectsPrice = false;

for (const line of lines) {
  if (line.startsWith('Sell Old Tecno ')) {
    const match = line.match(/Sell Old Tecno (.*?) \((.*?)\)/i);
    if (match) {
      currentModelName = match[1].trim(); // e.g. "Spark 4"
      currentVariant = match[2].trim(); // e.g. "4 GB/64 GB"
    }
  } else if (line === 'Get Upto') {
    expectsPrice = true;
  } else if (expectsPrice && line.startsWith('₹')) {
    const priceStr = line.replace('₹', '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    results.push({
      brand: 'Tecno',
      model: 'Tecno ' + currentModelName,
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

const filteredDevices = existingDevices.filter(d => d.brand.toLowerCase() !== 'tecno');

let startId = 21000;
for (const dev of results) {
  filteredDevices.push({
    id: 'tecno_' + (startId++),
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
