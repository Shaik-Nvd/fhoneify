const fs = require('fs');
const code = fs.readFileSync('lib/seed_devices.ts', 'utf8');
const regex = /"Apple iPhone 16 Pro Max"[\s\S]*?"storage":\s*"256GB"[\s\S]*?"basePrice":\s*(\d+)/;
const match = code.match(regex);
console.log('Base Price 16 Pro Max 256GB:', match ? match[1] : 'not found');
