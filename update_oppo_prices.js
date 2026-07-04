const fs = require('fs');
const path = require('path');

const listPath = path.join(__dirname, 'oppo_list.txt');
const cashifyFile = path.join(__dirname, 'lib/cashify_prices.json');

const content = fs.readFileSync(listPath, 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l);

let cashifyPrices = {};
try {
  cashifyPrices = JSON.parse(fs.readFileSync(cashifyFile, 'utf8'));
} catch(e) {}

let updated = 0;
let i = 0;
while (i < lines.length) {
  if (lines[i].startsWith('Sell Old ')) {
    const title = lines[i].replace('Sell Old ', '');
    const match = title.match(/(.*?)\s+\((.*?)\/(.*?)\)/);
    let model = title;
    let storage = '';
    
    if (match) {
      model = match[1].trim(); 
      storage = match[3].trim().replace(/\s+/g, '').toUpperCase(); 
    }
    
    if (model.toLowerCase().startsWith('oppo ')) {
        model = 'OPPO ' + model.substring(5);
    }
    
    i++; // Move to Get Upto
    i++; // Move to Price line
    
    if (i < lines.length) {
      let priceStr = lines[i];
      let digits = priceStr.replace(/[^\d]/g, '');
      let cashifyPrice = parseInt(digits, 10);
      
      if (!isNaN(cashifyPrice)) {
        let lookupKey = `${model}-${storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // We do NOT reverse engineer! 
        // The text file contains Cashify's prices. 
        // Our algorithm applies ON TOP of Cashify's prices!
        cashifyPrices[lookupKey] = cashifyPrice;
        updated++;
      }
    }
    i++; // Move to next
  } else {
    i++;
  }
}

fs.writeFileSync(cashifyFile, JSON.stringify(cashifyPrices, null, 2));
console.log(`Updated ${updated} OPPO prices in cashify_prices.json with RAW Cashify prices!`);
