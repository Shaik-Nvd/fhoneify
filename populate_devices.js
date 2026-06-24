const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'images', 'models');
const seedFile = path.join(__dirname, 'lib', 'seed_devices.ts');

const allImages = fs.readdirSync(modelsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

const brandMappings = {
  'poco': 'POCO',
  'xiaomi': 'Xiaomi',
  'redmi': 'Xiaomi', // usually redmi goes under Xiaomi
  'mi': 'Xiaomi',
  'vivo': 'Vivo',
  'oppo': 'Oppo',
  'realme': 'Realme',
  'nothing': 'Nothing',
  'iqoo': 'iQOO',
  'tecno': 'Tecno',
  'infinix': 'Infinix',
  'lg': 'LG',
  'google': 'Google',
  'asus': 'Asus',
  'rog': 'Asus',
  'honor': 'Honor',
  'nokia': 'Nokia',
  'lenovo': 'Lenovo',
  'motorola': 'Motorola',
  'moto': 'Motorola',
  'oneplus': 'OnePlus'
};

let seedContent = fs.readFileSync(seedFile, 'utf8');
const match = seedContent.match(/export const SEED_DEVICES = \[([\s\S]*?)\];/);
if (!match) throw new Error("Could not parse SEED_DEVICES");

const devicesStr = match[1];
const existingDevices = eval(`[${devicesStr}]`);

let startId = 10000;
let addedCount = 0;

for (const image of allImages) {
  // image e.g., poco-x3-pro.png
  const nameWithoutExt = image.replace(/\.[^/.]+$/, ""); // poco-x3-pro
  
  // try to guess the brand
  let brand = '';
  for (const [key, value] of Object.entries(brandMappings)) {
    if (nameWithoutExt.startsWith(key + '-')) {
      brand = value;
      break;
    }
  }
  
  if (!brand && nameWithoutExt.startsWith('poco')) brand = 'POCO';
  
  // If we can't figure out the brand, maybe skip or just use the first word
  if (!brand) {
    const firstWord = nameWithoutExt.split('-')[0];
    const found = Object.keys(brandMappings).find(k => k === firstWord);
    if (found) brand = brandMappings[found];
    else continue; // skip unknown
  }
  
  // Create a display model name, e.g. poco-x3-pro -> POCO X3 Pro
  let modelWords = nameWithoutExt.split('-');
  
  // Capitalize words
  let displayModel = modelWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  // Special casing for POCO
  if (displayModel.toLowerCase().startsWith('poco ')) {
    displayModel = 'POCO ' + displayModel.substring(5);
  }

  // Check if device already exists
  const exists = existingDevices.some(d => 
    d.brand === brand && 
    d.model.toLowerCase() === displayModel.toLowerCase()
  );
  
  if (!exists) {
    existingDevices.push({
      id: brand.toLowerCase() + '_' + (startId++),
      brand: brand,
      model: displayModel,
      storage: '128GB', // default fallback
      ram: '8GB',
      color: 'Midnight',
      basePrice: 5000 // default price
    });
    addedCount++;
  }
}

const newSeedContent = `export const SEED_DEVICES = ${JSON.stringify(existingDevices, null, 2)};\n`;
fs.writeFileSync(seedFile, newSeedContent);

console.log(`Successfully added ${addedCount} missing devices from images into seed_devices.ts`);
