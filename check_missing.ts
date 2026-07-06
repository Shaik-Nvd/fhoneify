import fs from 'fs';
import { SEED_DEVICES } from './lib/seed_devices.ts';

function buildGroupedModels(pricesFile) {
  const prices = JSON.parse(fs.readFileSync(pricesFile, 'utf8'));
  const grouped = {};
  prices.forEach(item => {
    let cleanName = item.model.replace('Sell Old ', '');
    const storageMatch = cleanName.match(/ \((.*?)\)/);
    if (storageMatch) cleanName = cleanName.replace(/ \((.*?)\)/, '');
    grouped[cleanName.trim().toLowerCase()] = true;
  });
  return grouped;
}

const allJsonModels = { 
  ...buildGroupedModels('Samsung/samsung_prices.json'), 
  ...buildGroupedModels('xiaomi/xiaomi_prices.json') 
};

const missing = new Set();
for (const device of SEED_DEVICES) {
  if (['Samsung', 'Xiaomi', 'Redmi', 'Poco'].includes(device.brand)) {
    const modelKey = device.model.toLowerCase().trim();
    if (!allJsonModels[modelKey] && 
        !allJsonModels[modelKey.replace(device.brand.toLowerCase() + ' ', '').trim()] && 
        !allJsonModels[(device.brand.toLowerCase() + ' ' + modelKey).trim()]) {
      missing.add(device.model);
    }
  }
}

console.log('MISSING_MODELS_START');
Array.from(missing).forEach(m => console.log(m));
console.log('MISSING_MODELS_END');
