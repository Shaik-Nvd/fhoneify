const fs = require('fs');
const file = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
let content = fs.readFileSync(file, 'utf8');

// Match all basePrice: 0 objects
const regex = /{\s*"id":\s*"[^"]+",\s*"brand":\s*"[^"]+",\s*"model":\s*"([^"]+)",\s*"storage":\s*"([^"]+)",[\s\S]*?"basePrice":\s*0\s*}/g;

let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`${match[1]} - ${match[2]}`);
}
