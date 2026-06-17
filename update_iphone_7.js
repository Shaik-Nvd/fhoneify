const fs = require('fs');

const file = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
let content = fs.readFileSync(file, 'utf8');

const updates = [
  { model: 'Apple iPhone 7', storage: '32GB', price: 4430 },
  { model: 'Apple iPhone 7', storage: '128GB', price: 4660 },
  { model: 'Apple iPhone 7', storage: '256GB', price: 4770 },
  { model: 'Apple iPhone 7 Plus', storage: '32GB', price: 5190 },
  { model: 'Apple iPhone 7 Plus', storage: '128GB', price: 5590 },
  { model: 'Apple iPhone 7 Plus', storage: '256GB', price: 6100 }
];

updates.forEach(u => {
  const regex = new RegExp(`{\\s*["']id["']:\\s*['"][^'"]+['"],\\s*["']brand["']:\\s*['"]Apple['"],\\s*["']model["']:\\s*['"]${u.model}['"],\\s*["']storage["']:\\s*['"]${u.storage}['"],\\s*["']ram["']:\\s*['"][^'"]+['"],\\s*["']color["']:\\s*['"][^'"]+['"],\\s*["']basePrice["']:\\s*\\d+\\s*}`, 'g');
  
  content = content.replace(regex, (match) => {
    return match.replace(/"basePrice":\s*\d+/, `"basePrice": ${u.price}`);
  });
});

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
