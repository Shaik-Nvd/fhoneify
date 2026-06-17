const fs = require('fs');

const file = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
let content = fs.readFileSync(file, 'utf8');

const updates = [
  { storage: '16GB', ram: '1GB', price: 2200 },
  { storage: '32GB', ram: '1GB', price: 0 }, // not provided, but fix RAM
  { storage: '64GB', ram: '1GB', price: 2500 },
  { storage: '128GB', ram: '1GB', price: 2760 }
];

updates.forEach(u => {
  const regex = new RegExp(`{\\s*["']id["']:\\s*['"][^'"]+['"],\\s*["']brand["']:\\s*['"]Apple['"],\\s*["']model["']:\\s*['"]Apple iPhone 6 Plus['"],\\s*["']storage["']:\\s*['"]${u.storage}['"],\\s*["']ram["']:\\s*['"][^'"]+['"],\\s*["']color["']:\\s*['"][^'"]+['"],\\s*["']basePrice["']:\\s*\\d+\\s*}`, 'g');
  
  content = content.replace(regex, (match) => {
    let replaced = match.replace(/"ram":\s*"\w+"/, `"ram": "${u.ram}"`);
    if (u.price > 0) {
      replaced = replaced.replace(/"basePrice":\s*\d+/, `"basePrice": ${u.price}`);
    }
    return replaced;
  });
});

fs.writeFileSync(file, content, 'utf8');
console.log('Finished updating iPhone 6 Plus.');
