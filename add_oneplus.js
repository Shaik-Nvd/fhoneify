const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `OnePlus 6T
OnePlus 6
OnePlus 5T
OnePlus 5
OnePlus 3T
OnePlus 3
OnePlus 6T McLaren
OnePlus 7
OnePlus 7 Pro
OnePlus 7T
OnePlus 7T Pro
OnePlus 8
OnePlus 8 Pro
OnePlus 7T Pro McLaren Edition
OnePlus Nord
OnePlus 8T
OnePlus 9 5G
OnePlus 9R 5G
OnePlus 9 Pro 5G
OnePlus Nord CE 5G
OnePlus Nord 2 5G
OnePlus 9RT 5G
OnePlus Nord CE 2 5G
OnePlus 10 Pro 5G
OnePlus Nord CE 2 Lite 5G
OnePlus 10R 5G
OnePlus Nord 2T 5G
OnePlus 10T 5G
OnePlus 11 5G
Oneplus 11 5G Marble Edition
OnePlus 11R 5G
OnePlus Nord CE 3 Lite 5G
OnePlus Nord 3 5G
OnePlus Nord CE 3 5G
Oneplus Open
OnePlus 12
OnePlus 12R
OnePlus Nord CE4 5G
OnePlus Nord CE4 Lite 5G
OnePlus Nord 4
OnePlus 13
OnePlus 13R
OnePlus 13s
OnePlus Nord 5
OnePlus Nord CE 5
OnePlus 15
OnePlus 15R
OnePlus Nord 6 5G
OnePlus Nord CE 6 5G
OnePlus Nord CE 6 Lite 5G`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'OnePlus' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `oneplus_batch_${index++}`,
        brand: 'OnePlus',
        model: model,
        storage: '4 GB/64 GB',
        ram: '4GB',
        color: 'Midnight',
        basePrice: 5000
      });
    }
  }

  if (newDevices.length === 0) {
    console.log("No missing devices to add!");
    return;
  }

  // 2. Insert into DB
  for (const d of newDevices) {
    const { basePrice, ...dbData } = d;
    await prisma.device.create({ data: { ...dbData, id: crypto.randomUUID() } });
  }

  // 3. Append to lib/seed_devices.ts
  const libPath = 'c:/Users/Mubeen_Taj/Downloads/Fhone/lib/seed_devices.ts';
  let libContent = fs.readFileSync(libPath, 'utf-8');
  libContent = libContent.replace(/];\s*$/, '');
  
  const entries = newDevices.map(d => 
    `,\n  {\n    "id": "${d.id}",\n    "brand": "${d.brand}",\n    "model": "${d.model}",\n    "storage": "${d.storage}",\n    "ram": "${d.ram}",\n    "color": "${d.color}",\n    "basePrice": ${d.basePrice}\n  }`
  ).join('');

  fs.writeFileSync(libPath, libContent + entries + '\n];\n');

  // 4. Append to server/seed_devices.ts
  const srvPath = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
  if (fs.existsSync(srvPath)) {
    let srvContent = fs.readFileSync(srvPath, 'utf-8');
    srvContent = srvContent.replace(/];\s*$/, '');
    fs.writeFileSync(srvPath, srvContent + entries + '\n];\n');
  }

  console.log(`Successfully added ${newDevices.length} missing OnePlus models!`);
}

main();
