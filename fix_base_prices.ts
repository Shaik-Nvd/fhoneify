
import fs from 'fs';
import { calculateFhoneifyPrice, DiagnosticsType } from './lib/pricingCalculator';

const tempPrices = JSON.parse(fs.readFileSync('temp_prices.json', 'utf-8'));
const cashifyPrices = JSON.parse(fs.readFileSync('lib/cashify_prices.json', 'utf-8'));

const perfectDiagnostics: DiagnosticsType = {
    calls: true,
    touch: true,
    originalScreen: true,
    defects: [],
    screenCondition: null,
    screenSpots: null,
    screenLines: null,
    screenDiscoloration: null,
    bodyScratches: null,
    bodyDents: null,
    bodyPanel: null,
    bodyBent: null,
    hardware: [],
    accessories: ['box', 'charger', 'bill'],
    warranty: true,
    validBill: true,
    eSim: null,
    mobileAge: 'below3'
};

function findBasePrice(brand: string, model: string, targetPrice: number): number {
    let low = 0;
    let high = 500000;
    let bestBase = targetPrice;
    
    for (let i = 0; i < 60; i++) {
        let mid = (low + high) / 2;
        let res = calculateFhoneifyPrice(brand, model, mid, perfectDiagnostics);
        if (res.cashifyBasePrice === targetPrice) {
            return mid;
        } else if (res.cashifyBasePrice < targetPrice) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return Math.round((low + high) / 2);
}

let updatedCount = 0;

tempPrices.forEach((entry: any) => {
    if (entry.price === 'Not found') return;
    
    let rawName = entry.model.replace('Sell Old ', '').trim();
    let storageMatch = rawName.match(/\((.*?)\)/);
    let storage = storageMatch ? storageMatch[1] : '';
    let modelName = rawName.replace(/\(.*?\)/, '').trim();

    let targetPrice = Number(entry.price);
    
    // Brand extraction
    let brand = 'Apple';
    if (modelName.toLowerCase().includes('samsung')) brand = 'Samsung';
    else if (modelName.toLowerCase().includes('oneplus')) brand = 'OnePlus';
    else if (modelName.toLowerCase().includes('xiaomi') || modelName.toLowerCase().includes('redmi')) brand = 'Xiaomi';
    else if (modelName.toLowerCase().includes('vivo')) brand = 'Vivo';
    else if (modelName.toLowerCase().includes('oppo')) brand = 'Oppo';
    else if (modelName.toLowerCase().includes('nothing')) brand = 'Nothing';

    let requiredBasePrice = findBasePrice(brand, modelName, targetPrice);

    let lookupKey = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (lookupKey.includes('iphone-17e')) {
        lookupKey = lookupKey.replace('iphone-17e', 'iphone-17-e');
    } else if (lookupKey.includes('iphone-16e')) {
        lookupKey = lookupKey.replace('iphone-16e', 'iphone-16-e');
    } else if (lookupKey.includes('iphone-air')) {
        lookupKey = lookupKey.replace('iphone-air', 'iphone-17-air');
    }

    cashifyPrices[lookupKey] = requiredBasePrice;
    
    let storageOnly = storage.includes('/') ? storage.split('/')[1].trim() : storage.trim();
    let storageNoSpace = storageOnly.replace(/\s+/g, '');
    let oldKey = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    cashifyPrices[oldKey] = requiredBasePrice;
    updatedCount++;
});

fs.writeFileSync('lib/cashify_prices.json', JSON.stringify(cashifyPrices, null, 2));
console.log('Fixed Base Prices for', updatedCount, 'devices');

