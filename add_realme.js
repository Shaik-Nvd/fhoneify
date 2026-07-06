const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Realme 2 Pro
Realme C1 2019
Realme C1
Realme 2
Realme 1
Realme U1
Realme 3
Realme 3 Pro
Realme C2
Realme X
Realme 3i
Realme 5
Realme 5 Pro
Realme XT
Realme 5s
Realme X2 Pro
Realme X2
Realme 5i
Realme C3
Realme X50 Pro
Realme 6
Realme 6 Pro
Realme Narzo 10
Realme Narzo 10A
Realme X3
Realme X3 SuperZoom
Realme C11
Realme C12
Realme 6i
Realme 7 Pro
Realme C15
Realme 7
Realme Narzo 20 Pro
Realme Narzo 20
Realme Narzo 20A
Realme 7i
Realme C15 Qualcomm Edition
Realme X7
Realme X7 Pro
Realme Narzo 30A
Realme Narzo 30 Pro 5G
Realme 8
Realme 8 Pro
Realme C21
Realme C20
Realme C25
Realme X7 Max 5G
Realme C25s
Realme Narzo 30
Realme Narzo 30 5G
Realme 8 5G
Realme C11 2021
Realme GT 5G
Realme GT Master Edition
Realme C21Y
Realme 8i
Realme 8s 5G
Realme C25Y
Realme Narzo 50A
Realme Narzo 50i
Realme GT Neo 2
Realme 9i
Realme 9 Pro 5G
Realme 9 Pro Plus 5G
Realme Narzo 50
Realme C35
Realme 9 5G
Realme 9 5G Speed Edition
Realme C31
Realme GT 2
Realme GT 2 Pro
Realme 9
Realme GT Neo 3
Realme Narzo 50A Prime
Realme C30
Realme 9i 5G
Realme GT NEO 3 150W
Realme GT Neo 3T
Realme C33
Realme C30s
Realme Narzo 50 5G
Realme Narzo 50 Pro 5G
Realme Narzo 50i Prime
Realme 10 Pro 5G
Realme 10 Pro Plus 5G
Realme 10
Realme C55
Realme C33 2023
Realme Narzo N53
Realme 11 Pro 5G
Realme 11 Pro Plus 5G
Realme Narzo N55
Realme C53
Realme Narzo 60 5G
Realme Narzo 60 Pro 5G
Realme 11x 5G
Realme 11 5G
Realme Narzo 60X 5G
Realme C67 5G
Realme C51
Realme 12 Pro 5G
Realme 12 Pro Plus 5G
Realme 12 5G
Realme 12 Plus 5G
Realme 12x 5G
Realme P1 5G
Realme P1 Pro 5G
Realme Narzo 70 5G
Realme Narzo 70 Pro 5G
Realme Narzo 70X 5G
Realme GT 6T 5G
Realme Narzo N65 5G
Realme GT 6
Realme C65 5G
Realme C61
Realme Narzo N61
Realme C63
Realme C63 5G
Realme P2 Pro 5G
Realme 13 5G
Realme 13 Plus 5G
Realme 13 Pro 5G
Realme 13 Pro Plus 5G
Realme Narzo 70 Turbo 5G
Realme P1 Speed 5G
Realme 14x 5G
Realme 14 Pro 5G
Realme 14 Pro Plus 5G
Realme Narzo N63
Realme P3x 5G
Realme P3 5G
Realme P3 Pro 5G
Realme P3 Ultra 5G
Realme 14 Pro Lite 5G
Realme C75 5G
Realme Narzo 80x 5G
Realme C73 5G
Realme 14T 5G
Realme GT 7
Realme GT 7 Pro 5G
Realme GT 7T
Realme Narzo 80 Pro 5G
Realme Narzo 80 Lite 5G
Realme C71
Realme 15 5G
Realme 15 Pro 5G
Realme 15T 5G
Realme Narzo 80 Lite 4G
Realme P3 Lite 5G
Realme P4 5G
Realme P4 Pro 5G
Realme 15x 5G
Realme C85 5G
Realme GT 8 Pro
Realme 16 Pro 5G
Realme Narzo 90x 5G
Realme P4x 5G
Realme P4 Power 5G
Realme 16 Pro Plus 5G
Realme C83 5G
Realme Narzo 90 5G
Realme Narzo Power 5G
Realme P4 Lite
Realme 16 5G
Realme P4 Lite 5G
Realme Narzo 100 Lite 5G`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Realme' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `realme_batch_${index++}`,
        brand: 'Realme',
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

  console.log(`Successfully added ${newDevices.length} missing Realme models!`);
}

main();
