import fs from 'fs';
import { SEED_DEVICES } from './lib/seed_devices.ts';

function buildGroupedModels(pricesFile, brandFallback) {
  const prices = JSON.parse(fs.readFileSync(pricesFile, 'utf8'));
  const grouped = {};
  
  prices.forEach(item => {
    let cleanName = item.model.replace('Sell Old ', '');
    const storageMatch = cleanName.match(/ \((.*?)\)/);
    let storageStr = '';
    if (storageMatch) {
      storageStr = storageMatch[1];
      cleanName = cleanName.replace(/ \((.*?)\)/, '');
    }
    
    const modelKey = cleanName.trim();
    if (!grouped[modelKey]) {
      grouped[modelKey] = [];
    }
    
    let r = '', s = '';
    if (storageStr.includes('/')) {
      const parts = storageStr.split('/');
      r = parts[0].trim();
      s = parts[1].trim();
    } else {
      s = storageStr.trim();
    }
    
    grouped[modelKey].push({
      ram: r,
      storage: s,
      price: item.price
    });
  });
  
  return grouped;
}

const samsungGroups = buildGroupedModels('Samsung/samsung_prices.json', 'Samsung');
const xiaomiGroups = buildGroupedModels('xiaomi/xiaomi_prices.json', 'Xiaomi');
const allGroups = { ...samsungGroups, ...xiaomiGroups };

// Normalize keys to lowercase for matching
const normalizedGroups = {};
for (const [k, v] of Object.entries(allGroups)) {
  normalizedGroups[k.toLowerCase()] = v;
}

const newSeedDevices = [];

// Track models we have already processed so we don't duplicate them
const processedModels = new Set();
let idCounter = 100000;

for (const device of SEED_DEVICES) {
  if (['Samsung', 'Xiaomi', 'Redmi', 'Poco'].includes(device.brand)) {
    const modelKey = device.model.toLowerCase().trim();
    
    let matchedGroup = normalizedGroups[modelKey];
    if (!matchedGroup) {
      matchedGroup = normalizedGroups[modelKey.replace(device.brand.toLowerCase() + ' ', '').trim()];
    }
    if (!matchedGroup) {
      matchedGroup = normalizedGroups[(device.brand.toLowerCase() + ' ' + modelKey).trim()];
    }
    
    if (matchedGroup) {
      if (!processedModels.has(modelKey)) {
        processedModels.add(modelKey);
        // Add all real variants
        for (const variant of matchedGroup) {
          const combinedStorage = variant.ram ? `${variant.ram}/${variant.storage}` : variant.storage;
          newSeedDevices.push({
            id: `${device.brand.toLowerCase()}_${idCounter++}`,
            brand: device.brand,
            model: device.model, // keep original casing
            storage: combinedStorage,
            color: 'Midnight',
            basePrice: variant.price
          });
        }
      }
    } else {
      // Model not in JSON, keep original fake variants
      newSeedDevices.push(device);
    }
  } else {
    // Other brands (Apple, etc), keep original
    newSeedDevices.push(device);
  }
}

const newContent = 'export const SEED_DEVICES = ' + JSON.stringify(newSeedDevices, null, 2) + ';\n';
fs.writeFileSync('lib/seed_devices.ts', newContent);
fs.writeFileSync('server/seed_devices.ts', newContent);

console.log('Successfully rebuilt variants for all matched models!');
