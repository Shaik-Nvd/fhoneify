const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Xiaomi Redmi Note 6 Pro
Xiaomi Mi A2
Xiaomi Redmi 6
Xiaomi Redmi 6 pro
Xiaomi Redmi 6A
Xiaomi Redmi Y2
Xiaomi Redmi 5
Xiaomi Redmi Note 5 Pro
Xiaomi Redmi Note 5
Xiaomi Redmi 5A
Xiaomi Redmi Y1
Redmi Y1 Lite
Mi Mix 2
Xiaomi Mi Max 2
Xiaomi Redmi 4A
Redmi 3S Prime
Xiaomi Redmi 3S
Xiaomi Mi Max
Xiaomi Mi 5
Xiaomi Redmi Note 3
Xiaomi Redmi Note 7
Xiaomi Redmi Note 7 Pro
Xiaomi Redmi Go
Xiaomi Redmi 7
Xiaomi Redmi Note 7S
Xiaomi Redmi Y3
Xiaomi Black Shark 2
Xiaomi Redmi K20
Xiaomi Redmi K20 Pro
Xiaomi Redmi 7A
Xiaomi Mi A3
Xiaomi Redmi 8A
Redmi 8
Xiaomi Redmi Note 8
Xiaomi Redmi Note 8 Pro
Xiaomi Redmi Note 9 Pro
Xiaomi Redmi 8A Dual
Xiaomi Redmi Note 9 Pro Max
Xiaomi Redmi Note 9
Xiaomi Redmi 9 Prime
Xiaomi Redmi 9
Xiaomi Redmi 9A
Xiaomi Redmi 9i
Xiaomi Mi 10T
Mi 10T Pro
Xiaomi Mi 10i
Xiaomi Redmi 9 Power
Xiaomi Redmi Note 10
Xiaomi Redmi Note 10 Pro
Xiaomi Redmi Note 10 Pro Max
Xiaomi Mi 11X Pro
Mi 11 Ultra
Xiaomi Mi 11X
Xiaomi Mi 11 Lite
Xiaomi Redmi Note 10s
Xiaomi Redmi Note 10T 5G
Xiaomi Mi 10
Xiaomi Redmi 10 Prime
Xiaomi 11 Lite NE 5G
Xiaomi Redmi Note 10 Lite
Xiaomi Redmi Note 11T 5G
Xiaomi Redmi 9 Activ
Xiaomi 11i 5G
Xiaomi 11i HyperCharge 5G
Xiaomi 11T Pro 5G
Xiaomi Redmi Note 11
Xiaomi Redmi Note 11S
Xiaomi Redmi Note 11 Pro Plus 5G
Xiaomi Redmi Note 11 Pro
Xiaomi Redmi 10
Xiaomi 12 Pro 5G
Xiaomi Redmi 10 Prime 2022
Xiaomi Redmi 10A
Xiaomi Redmi K50i 5G
Xiaomi Redmi 11 Prime 5G
Redmi 10 Power
Redmi Note 11SE
Xiaomi Redmi 11 Prime
Xiaomi Redmi A1 Plus
Xiaomi Redmi Note 12 Pro Plus 5G
Xiaomi Redmi Note 12 5G
Xiaomi Redmi Note 12 Pro 5G
13 Pro 5G
Xiaomi Redmi Note 12
Xiaomi Redmi A2 Plus
Xiaomi Redmi A2
Xiaomi Redmi 12 5G
Xiaomi Redmi 12C
Xiaomi Redmi 12
Xiaomi Redmi 13C
Xiaomi Redmi 13C 5G
Xiaomi Redmi Note 13 5G
Xiaomi Redmi Note 13 Pro 5G
Xiaomi Redmi Note 13 Pro Plus 5G
Xiaomi Redmi A3
14
14 Ultra
Redmi A1
Xiaomi 14 CIVI
Xiaomi Redmi A3x
Xiaomi Redmi 13 5G
Xiaomi Redmi Note 14 5G
Xiaomi Redmi Note 14 Pro 5G
Xiaomi Redmi Note 14 Pro Plus 5G
Xiaomi Redmi 14C 5G
Xiaomi Redmi A4 5G
Xiaomi Redmi A5
15
15 Ultra
Xiaomi Redmi 15 5G
Redmi Note 14 SE 5G
Xiaomi Redmi 15C 5G
Xiaomi Redmi Note 15 5G
Xiaomi Redmi Note 15 Pro 5G
Xiaomi Redmi Note 15 Pro Plus 5G
17 Ultra
Xiaomi 17
Xiaomi Redmi 15A 5G
Xiaomi Redmi A7 Pro 5G
Xiaomi 17T`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Xiaomi' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `xiaomi_batch_${index++}`,
        brand: 'Xiaomi',
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

  console.log(`Successfully added ${newDevices.length} missing Xiaomi models!`);
}

main();
