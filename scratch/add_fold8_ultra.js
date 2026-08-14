const fs = require('fs');

// 1. Update seed_devices.ts
let seed = fs.readFileSync('lib/seed_devices.ts', 'utf-8');
const endBracketPos = seed.lastIndexOf('];');
if (endBracketPos !== -1) {
    const newDevice = `  {
    brand: 'Samsung',
    name: 'Samsung Galaxy Z Fold 8 Ultra',
    image: '/images/samsung-galaxy-z-fold-8-ultra.png',
    variants: [
      { storage: '12 GB/256 GB' },
      { storage: '12 GB/512 GB' },
      { storage: '16 GB/1 TB' }
    ]
  },
`;
    seed = seed.slice(0, endBracketPos) + newDevice + seed.slice(endBracketPos);
    fs.writeFileSync('lib/seed_devices.ts', seed);
    console.log('Updated seed_devices.ts');
}

// 2. Update cashify_prices.json
let prices = JSON.parse(fs.readFileSync('lib/cashify_prices.json', 'utf-8'));
prices['Samsung Galaxy Z Fold 8 Ultra'] = {
  '12 GB/256 GB': 120000,
  '12 GB/512 GB': 127000,
  '16 GB/1 TB': 140000
};
fs.writeFileSync('lib/cashify_prices.json', JSON.stringify(prices, null, 2));
console.log('Updated cashify_prices.json');
