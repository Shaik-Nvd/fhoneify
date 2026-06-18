const fs = require('fs');
const file = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
let content = fs.readFileSync(file, 'utf8');

// For iPhone SE 2020
content = content.replace(/"model": "Apple iPhone SE 2020",\s*"storage": "64GB",([\s\S]*?)"basePrice": 0/g, '"model": "Apple iPhone SE 2020",\n    "storage": "64GB",$1"basePrice": 10500');
content = content.replace(/"model": "Apple iPhone SE 2020",\s*"storage": "128GB",([\s\S]*?)"basePrice": 0/g, '"model": "Apple iPhone SE 2020",\n    "storage": "128GB",$1"basePrice": 11500');
content = content.replace(/"model": "Apple iPhone SE 2020",\s*"storage": "256GB",([\s\S]*?)"basePrice": 0/g, '"model": "Apple iPhone SE 2020",\n    "storage": "256GB",$1"basePrice": 13500');

// Fix all remaining basePrice: 0 to 10000 just in case
content = content.replace(/"basePrice": 0/g, '"basePrice": 10000');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed prices in seed_devices.ts');
