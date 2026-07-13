const fs = require('fs');
const devices = fs.readFileSync('lib/seed_devices.ts', 'utf8');
const match = devices.match(/14 Pro Max.*?(?:\n.*?){0,5}basePrice":\s*(\d+)/gs);
console.log(match);
