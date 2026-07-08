const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(__dirname, 'motorola', 'motorola_prices.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const results = [];
  let index = 1;
  
  for (const item of data) {
    // Sell Old Motorola One Power (4 GB/64 GB)
    const match = item.model.match(/Sell Old (.*?) \((.*?)\/(.*?)\)/i);
    let modelName, ramStr, storageStr;
    if (match) {
        modelName = match[1].trim();
        ramStr = match[2].trim();
        const actualStorage = match[3].trim();
        storageStr = `${ramStr}/${actualStorage}`;
    } else {
        modelName = item.model.replace('Sell Old ', '').trim();
        ramStr = 'Unknown';
        storageStr = 'Unknown';
    }

    results.push({
        id: 'motorola_batch_' + (index++),
        brand: 'Motorola',
        model: modelName,
        storage: storageStr,
        ram: ramStr,
        color: 'Default',
        basePrice: parseInt(item.price) || 0,
        cashifyLink: item.link
    });
  }

  console.log(`Parsed ${results.length} devices from JSON.`);

  // 1. Insert into DB
  for (const d of results) {
    const { basePrice, cashifyLink, ...dbData } = d;
    await prisma.device.create({ 
      data: { ...dbData, id: crypto.randomUUID() } 
    });
  }
  console.log('Inserted into Prisma.');

  // 2. Append to seed_devices.ts
  function appendToSeed(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/];\s*$/, '');
    
    const entries = results.map(d => 
      `,\n  {\n    "id": "${d.id}",\n    "brand": "${d.brand}",\n    "model": "${d.model}",\n    "storage": "${d.storage}",\n    "ram": "${d.ram}",\n    "color": "${d.color}",\n    "basePrice": ${d.basePrice},\n    "cashifyLink": "${d.cashifyLink}"\n  }`
    ).join('');

    fs.writeFileSync(filePath, content + entries + '\n];\n');
  }

  appendToSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
  appendToSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
  console.log('Appended to seed_devices files.');

  // 3. Copy icons
  const iconsDir = path.join(__dirname, 'motorola', 'motorola_icons');
  const targetDir = path.join(__dirname, 'public', 'images', 'models');
  if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(iconsDir)) {
    const files = fs.readdirSync(iconsDir);
    let copied = 0;
    for (const file of files) {
      if (file.endsWith('.png') || file.endsWith('.jpg')) {
        fs.copyFileSync(path.join(iconsDir, file), path.join(targetDir, file));
        copied++;
      }
    }
    console.log(`Copied ${copied} icons to public/images/models.`);
  } else {
    console.log('No motorola_icons directory found.');
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
