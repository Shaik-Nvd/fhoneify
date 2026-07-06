const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `POCO F1
POCO X2
POCO M2 Pro
POCO M2
POCO C3
POCO X3
POCO M3
POCO X3 Pro
POCO M3 Pro 5G
POCO F3 GT
POCO M2 Reloaded
POCO C31
POCO M4 Pro 5G
POCO M4 Pro
POCO X4 Pro 5G
POCO M4 5G
POCO F4 5G
POCO M5
POCO X5 Pro 5G
POCO C50
POCO C55
POCO X5 5G
POCO C51
POCO F5 5G
POCO M6 Pro 5G
POCO C65
POCO X6 5G
POCO X6 Pro 5G
POCO M6 5G
POCO C61
POCO F6 5G
POCO X6 Neo 5G
POCO X7 5G
POCO M7 Pro 5G
POCO C75 5G
POCO X7 Pro 5G
POCO M6 Plus 5G
POCO M7 5G
POCO C71
POCO F7 5G
POCO M7 Plus 5G
POCO C85 5G
POCO M8 5G
POCO C85x
POCO X8 Pro`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'POCO' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `poco_batch_${index++}`,
        brand: 'POCO',
        model: model,
        storage: '64 GB',
        ram: '4GB',
        color: 'Yellow',
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

  console.log(`Successfully added ${newDevices.length} missing POCO models!`);
}

main();
