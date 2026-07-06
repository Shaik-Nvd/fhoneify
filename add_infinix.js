const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Infinix Hot S3X
Infinix Note 5 Stylus
Infinix Hot 7 Pro
Infinix Smart 3 Plus
Infinix Note 5
Infinix S4
Infinix Smart 2
Infinix Hot S3
Infinix Note 4
Infinix Zero 5 Pro
Infinix Hot 6 Pro
Infinix Hot 7
Infinix Hot 8
Infinix S5
Infinix S5 Pro
Infinix S5 Lite
Infinix Hot 9 Pro
Infinix Note 7
Infinix Smart HD 2021
Infinix Hot 10
Infinix Zero 8i
Infinix Smart 5
Infinix Hot 10 Play
Infinix Hot 10s
Infinix Note 10
Infinix Note 10 Pro
Infinix Hot 11
Infinix Hot 11S
Infinix Note 11S
Infinix Note 11
Infinix Zero 5G
Infinix Smart 4 Plus
Infinix HOT 12 Play
Infinix Hot 9
Infinix Note 11s Free Fire Edition
Infinix Hot 11 2022
Infinix Smart 4
Infinix Note 12 Turbo
Infinix Note 12
Infinix Note 12 Pro 4G
Infinix Note 12 Pro 5G
Infinix Hot 12
Infinix Smart 6
Infinix Note 12 5G
Infinix Smart 6 Plus
Infinix Hot 12 Pro
Infinix Smart 6 HD
Infinix Zero Ultra
Infinix Zero 20
Infinix Hot 20 5G
Infinix Hot 20 Play
Infinix Note 12i
Infinix Smart 7
Infinix Zero 5G 2023
Infinix Zero 5G 2023 Turbo
Infinix Smart 7 HD
Infinix Hot 30i
Infinix GT 10 Pro
Infinix Note 30 5G
Infinix Hot 30 5G
Infinix Smart 8 HD
Infinix Smart 8
Infinix Note 40 Pro 5G
Infinix GT 20 Pro
Infinix Hot 40i
Infinix Note 40 5G
Infinix Note 40 Pro Plus 5G
Infinix Zero Flip 5G
Infinix Note 40X 5G
Infinix Zero 40 5G
Infinix Hot 50 5G
Infinix Note 50X 5G
Infinix Hot 60i 5G
Infinix Hot 60 5G Plus
Infinix Smart 9 HD
Infinix Smart 10`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Infinix' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `infinix_batch_${index++}`,
        brand: 'Infinix',
        model: model,
        storage: '64 GB',
        ram: '4GB',
        color: 'Black',
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

  console.log(`Successfully added ${newDevices.length} missing Infinix models!`);
}

main();
