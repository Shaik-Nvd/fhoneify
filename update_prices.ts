
import fs from 'fs';
import { SEED_DEVICES } from './lib/seed_devices';

const tempPrices = JSON.parse(fs.readFileSync('temp_prices.json', 'utf-8'));
const cashifyPrices = JSON.parse(fs.readFileSync('lib/cashify_prices.json', 'utf-8'));

let updatedCount = 0;

tempPrices.forEach((entry: any) => {
    if (entry.price === 'Not found') return;
    
    let rawName = entry.model.replace('Sell Old ', '').trim();
    let storageMatch = rawName.match(/\((.*?)\)/);
    let storage = storageMatch ? storageMatch[1] : '';
    let modelName = rawName.replace(/\(.*?\)/, '').trim();

    let foundDevice = SEED_DEVICES.find(d => 
        d.model.toLowerCase() === modelName.toLowerCase() && 
        d.storage.toLowerCase() === storage.toLowerCase()
    );
    
    if (foundDevice) {
        let lookupKey = \\-\\.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        if (lookupKey.includes('iphone-17e')) {
            lookupKey = lookupKey.replace('iphone-17e', 'iphone-17-e');
        } else if (lookupKey.includes('iphone-16e')) {
            lookupKey = lookupKey.replace('iphone-16e', 'iphone-16-e');
        } else if (lookupKey.includes('iphone-air')) {
            lookupKey = lookupKey.replace('iphone-air', 'iphone-17-air');
        }
        
        cashifyPrices[lookupKey] = Number(entry.price);
        updatedCount++;
    } else {
        let fallbackKey = \\-\\.toLowerCase().replace(/[^a-z0-9]/g, '-');
        cashifyPrices[fallbackKey] = Number(entry.price);
        updatedCount++;
    }
});

fs.writeFileSync('lib/cashify_prices.json', JSON.stringify(cashifyPrices, null, 2));
console.log('Updated', updatedCount, 'prices');

