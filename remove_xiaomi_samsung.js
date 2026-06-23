const fs = require('fs');
const path = require('path');

const seedDevicesFile = path.join(__dirname, 'lib', 'seed_devices.ts');
let seedContent = fs.readFileSync(seedDevicesFile, 'utf8');

const match = seedContent.match(/export const SEED_DEVICES = \[([\s\S]*?)\];/);
if (!match) throw new Error("Could not parse SEED_DEVICES");

const devicesStr = match[1];
const existingDevices = eval(`[${devicesStr}]`);

// Filter out Xiaomi and Samsung
const filteredDevices = existingDevices.filter(d => {
  const b = d.brand.toLowerCase();
  return b !== 'xiaomi' && b !== 'samsung';
});

// Add "Under Construction" for both
let startId = 30000;
filteredDevices.push({
  id: 'xiaomi_' + (startId++),
  brand: 'Xiaomi',
  model: 'Under Construction',
  storage: 'Coming Soon',
  color: 'N/A',
  basePrice: 1000
});

filteredDevices.push({
  id: 'samsung_' + (startId++),
  brand: 'Samsung',
  model: 'Under Construction',
  storage: 'Coming Soon',
  color: 'N/A',
  basePrice: 1000
});

const newSeedContent = `export const SEED_DEVICES = ${JSON.stringify(filteredDevices, null, 2)};\n`;
fs.writeFileSync(seedDevicesFile, newSeedContent);

// Remove from cashify_prices.json
const cashifyFile = path.join(__dirname, 'lib', 'cashify_prices.json');
let cashifyPrices = {};
if (fs.existsSync(cashifyFile)) {
  cashifyPrices = JSON.parse(fs.readFileSync(cashifyFile, 'utf8'));
}

// Just write the new prices over for "under construction", though they might not be selected anyway.
cashifyPrices['under-construction-coming-soon'] = 1000;

fs.writeFileSync(cashifyFile, JSON.stringify(cashifyPrices, null, 2));

console.log('Removed all Xiaomi and Samsung models and added "Under Construction".');
