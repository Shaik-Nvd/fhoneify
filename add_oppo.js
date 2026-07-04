const fs = require('fs');
const path = require('path');

const listPath = path.join(__dirname, 'oppo_list.txt');
const seedPath = path.join(__dirname, 'lib/seed_devices.ts');

const content = fs.readFileSync(listPath, 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l);

const newDevices = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].startsWith('Sell Old ')) {
    const title = lines[i].replace('Sell Old ', '');
    const match = title.match(/(.*?)\s+\((.*?)\/(.*?)\)/);
    let brand = 'OPPO';
    let model = title;
    let ram = '';
    let storage = '';
    
    if (match) {
      model = match[1].trim(); 
      ram = match[2].trim(); 
      storage = match[3].trim(); 
      
      storage = storage.replace(/\s+/g, '').toUpperCase(); 
      ram = ram.replace(/\s+/g, '').toUpperCase(); 
    }
    
    if (model.toLowerCase().startsWith('oppo ')) {
        model = 'OPPO ' + model.substring(5);
    }
    
    i++; // Get Upto
    i++; // Price line
    
    let priceStr = lines[i-1];
    let basePrice = parseInt(priceStr.replace(/[^\d]/g, ''), 10);
    
    newDevices.push({
      id: `oppo_custom_${Math.floor(Math.random() * 1000000)}`,
      brand,
      model,
      storage: storage || 'Unknown',
      ram: ram || 'Unknown',
      color: "Midnight",
      basePrice
    });
  } else {
    i++;
  }
}

let seedContent = fs.readFileSync(seedPath, 'utf8');
let added = 0;

for (const d of newDevices) {
  const regex = new RegExp(`"model":\\s*"${d.model.replace(/\s/g, '\\s+')}",\\s*"storage":\\s*"${d.storage}"`, 'i');
  if (!regex.test(seedContent)) {
    added++;
    const dStr = JSON.stringify(d, null, 2);
    const insertPos = seedContent.lastIndexOf(']');
    seedContent = seedContent.substring(0, insertPos) + ',\n  ' + dStr.split('\n').join('\n  ') + '\n' + seedContent.substring(insertPos);
  }
}

seedContent = seedContent.replace(/,\s*]/g, '\n]');
fs.writeFileSync(seedPath, seedContent);
console.log(`Added ${added} new OPPO devices.`);
