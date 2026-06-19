const fs = require('fs');

const content = fs.readFileSync('server/seed_devices.ts', 'utf8');
const models = new Set();
const regex = /"brand":\s*"Samsung",\s*"model":\s*"([^"]+)"/g;

let match;
while ((match = regex.exec(content)) !== null) {
  models.add(match[1]);
}

const arr = Array.from(models).sort();
console.log(`Found ${arr.length} Samsung models.`);
arr.forEach(m => {
  const filename = m.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
  console.log(`${m} -> ${filename}`);
});
