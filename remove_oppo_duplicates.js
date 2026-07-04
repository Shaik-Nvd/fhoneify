const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib', 'seed_devices.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Extract the array using regex or eval. 
// Since it's a TS file with `export const SEED_DEVICES = [...]`, we can parse it carefully.
// The easiest way is to use a regex to find all objects and remove the duplicate OPPO F1 plus.
// Let's just remove the block for OPPO F1 plus with null basePrice.

const blockToRemove = `  {
    "id": "oppo_custom_177612",
    "brand": "OPPO",
    "model": "OPPO F1 plus",
    "storage": "64GB",
    "ram": "4GB",
    "color": "Midnight",
    "basePrice": null
  }
,
`;

if (content.includes(blockToRemove)) {
  content = content.replace(blockToRemove, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Removed OPPO F1 plus duplicate.');
} else {
  // Let's do a more robust regex replacement for OPPO F1 plus
  console.log('Block not found exactly. Trying regex.');
  const regex = /\s*{\s*"id":\s*"[^"]+",\s*"brand":\s*"OPPO",\s*"model":\s*"OPPO F1 plus",\s*"storage":\s*"64GB",\s*"ram":\s*"[^"]+",\s*"color":\s*"[^"]+",\s*"basePrice":\s*null\s*},?/g;
  content = content.replace(regex, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Removed OPPO F1 plus duplicate via regex.');
}

// Let's also remove OPPO F1s duplicate if it has null basePrice
const regexF1s = /\s*{\s*"id":\s*"[^"]+",\s*"brand":\s*"OPPO",\s*"model":\s*"OPPO F1s",\s*"storage":\s*"[^"]+",\s*"ram":\s*"[^"]+",\s*"color":\s*"[^"]+",\s*"basePrice":\s*null\s*},?/g;
content = content.replace(regexF1s, '');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed OPPO F1s duplicates via regex.');

