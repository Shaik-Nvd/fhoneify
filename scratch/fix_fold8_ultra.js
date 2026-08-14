const fs = require('fs');

let seed = fs.readFileSync('lib/seed_devices.ts', 'utf-8');

// Remove the bad object
const badStart = seed.indexOf("brand: 'Samsung',\n    name: 'Samsung Galaxy Z Fold 8 Ultra',");
if (badStart !== -1) {
    const objectStart = seed.lastIndexOf('{', badStart);
    const objectEnd = seed.indexOf('},', objectStart) + 2;
    seed = seed.slice(0, objectStart) + seed.slice(objectEnd);
}

// Ensure no syntax issues if I messed up commas. Wait, earlier I had `},` so it should be fine.

// Append correct objects
const endBracketPos = seed.lastIndexOf('];');
if (endBracketPos !== -1) {
    const newDevices = `  {
    "id": "samsung_z_fold8_ultra_1",
    "brand": "Samsung",
    "model": "Samsung Galaxy Z Fold 8 Ultra",
    "storage": "12 GB/256 GB",
    "ram": "12 GB",
    "color": "Default",
    "basePrice": 120000
  },
  {
    "id": "samsung_z_fold8_ultra_2",
    "brand": "Samsung",
    "model": "Samsung Galaxy Z Fold 8 Ultra",
    "storage": "12 GB/512 GB",
    "ram": "12 GB",
    "color": "Default",
    "basePrice": 127000
  },
  {
    "id": "samsung_z_fold8_ultra_3",
    "brand": "Samsung",
    "model": "Samsung Galaxy Z Fold 8 Ultra",
    "storage": "16 GB/1 TB",
    "ram": "16 GB",
    "color": "Default",
    "basePrice": 140000
  }
`;
    seed = seed.slice(0, endBracketPos) + newDevices + seed.slice(endBracketPos);
    fs.writeFileSync('lib/seed_devices.ts', seed);
    console.log('Fixed seed_devices.ts');
}
