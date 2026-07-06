import fs from 'fs';
import { SEED_DEVICES } from './lib/seed_devices.ts';

function buildPriceMap(pricesFile) {
  const prices = JSON.parse(fs.readFileSync(pricesFile, 'utf8'));
  const priceMap = {};
  
  prices.forEach(item => {
    let cleanName = item.model.replace('Sell Old ', '');
    const storageMatch = cleanName.match(/ \((.*?)\)/);
    let storageStr = '';
    if (storageMatch) {
      storageStr = storageMatch[1];
      cleanName = cleanName.replace(/ \((.*?)\)/, '');
    }
    
    const modelKey = cleanName.trim().toLowerCase();
    
    let r = '', s = '';
    if (storageStr.includes('/')) {
      const parts = storageStr.split('/');
      r = parts[0].replace(/ /g, '').trim().toLowerCase();
      s = parts[1].replace(/ /g, '').trim().toLowerCase();
    } else {
      s = storageStr.replace(/ /g, '').trim().toLowerCase();
    }
    
    const fullKey = modelKey + '|' + r + '|' + s;
    priceMap[fullKey] = item.price;
  });
  
  return priceMap;
}

const allPriceMaps = { 
  ...buildPriceMap('Samsung/samsung_prices.json'), 
  ...buildPriceMap('xiaomi/xiaomi_prices.json') 
};

let updatedCount = 0;

for (const device of SEED_DEVICES) {
  if (device.brand === 'Samsung' || device.brand === 'Xiaomi' || device.brand === 'Redmi' || device.brand === 'Poco' || device.brand === 'Apple') {
    const modelKey = device.model.toLowerCase().trim();
    
    let devRam = (device.ram || '').toLowerCase().trim();
    let devStorage = (device.storage || '').toLowerCase().trim();
    
    if (devStorage.includes('/')) {
      const parts = devStorage.split('/');
      devRam = parts[0].replace(/ /g, '').trim();
      devStorage = parts[1].replace(/ /g, '').trim();
    } else {
      devRam = devRam.replace(/ /g, '').trim();
      devStorage = devStorage.replace(/ /g, '').trim();
    }
    
    let fullKey = modelKey + '|' + devRam + '|' + devStorage;
    let newPrice = allPriceMaps[fullKey];
    
    if (newPrice === undefined) {
       let modelKeyNoBrand = modelKey.replace(device.brand.toLowerCase() + ' ', '').trim();
       let fullKeyNoBrand = modelKeyNoBrand + '|' + devRam + '|' + devStorage;
       newPrice = allPriceMaps[fullKeyNoBrand];
    }
    
    if (newPrice === undefined) {
       const modelKeyWithBrand = (device.brand.toLowerCase() + ' ' + modelKey).trim();
       let fullKeyWithBrand = modelKeyWithBrand + '|' + devRam + '|' + devStorage;
       newPrice = allPriceMaps[fullKeyWithBrand];
    }

    if (newPrice !== undefined && device.basePrice !== newPrice) {
      console.log(`Updating ${device.model} (${device.storage}) to ${newPrice}`);
      device.basePrice = newPrice;
      updatedCount++;
    }
  }
}

const newContent = 'export const SEED_DEVICES = ' + JSON.stringify(SEED_DEVICES, null, 2) + ';\n';
fs.writeFileSync('lib/seed_devices.ts', newContent);
fs.writeFileSync('server/seed_devices.ts', newContent);

console.log('Updated ' + updatedCount + ' prices using EXACT MATCH ONLY.');
