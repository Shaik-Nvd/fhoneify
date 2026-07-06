const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `OPPO A7
OPPO F9 Pro
OPPO F9
OPPO A3s
OPPO Find X
OPPO A5
OPPO F7
OPPO A83
OPPO F5 Youth
OPPO F5
OPPO A71
OPPO A33
OPPO R11
OPPO A77
OPPO F3
OPPO F3 Plus
OPPO A57
OPPO F1s
OPPO A37
OPPO A37f
OPPO F1 Plus
OPPO F1
OPPO R17 Pro
OPPO R17
OPPO K1
OPPO F11 Pro
OPPO A5s
OPPO A1K
OPPO F11
OPPO Reno
OPPO Reno 10x Zoom
OPPO R15 Pro
OPPO K3
OPPO A9
OPPO Reno 2Z
OPPO Reno 2
OPPO A5 2020
OPPO A9 2020
OPPO Reno2 F
OPPO F15
OPPO A71 2018
OPPO A31
OPPO A12
OPPO A52
OPPO Find X2
OPPO A11K
OPPO Reno3 Pro
OPPO Reno4 Pro
OPPO A53
OPPO F17 Pro
OPPO F17
OPPO A33 2020
OPPO A15
OPPO A15s
OPPO Reno5 Pro 5G
OPPO F19 Pro
OPPO F19 Pro Plus 5G
OPPO F19
OPPO A54
OPPO A53s 5G
OPPO A74 5G
OPPO Reno6 5G
OPPO Reno6 Pro 5G
OPPO F19s
OPPO A55
OPPO A16
OPPO A16K
OPPO Reno7 5G
OPPO Reno7 Pro 5G
Oppo A76
OPPO K10
OPPO A16e
OPPO F21 Pro
OPPO F21 Pro 5G
OPPO A96
OPPO K10 5G
OPPO Reno8 5G
OPPO Reno8 Pro 5G
OPPO A57 2022
OPPO F21s Pro
OPPO F21s Pro 5G
OPPO A77 2022
OPPO A17K
OPPO A77s
OPPO A78 5G
OPPO Reno8T 5G
OPPO Find N2 Flip 5G
OPPO F23 5G
OPPO Reno10 5G
OPPO Reno10 Pro 5G
OPPO Reno10 Pro Plus 5G
OPPO A78
OPPO Find N3 Flip 5G
OPPO A58
OPPO A38
OPPO A17
OPPO A18
OPPO A79 5G
OPPO A59 5G
OPPO Reno11 5G
OPPO Reno11 Pro 5G
OPPO F25 Pro 5G
OPPO F27 Pro Plus 5G
OPPO A3 Pro 5G
OPPO Reno12 5G
OPPO Reno12 Pro 5G
OPPO A3x 5G
OPPO K12x 5G
OPPO F27 5G
OPPO A3 5G
OPPO A3x
OPPO Find X8 5G
OPPO Find X8 Pro 5G
OPPO Reno13 5G
OPPO Reno13 Pro 5G
OPPO F29 5G
OPPO F29 Pro 5G
OPPO A5 Pro 5G
OPPO A5 5G
OPPO A5x 5G
OPPO K13 5G
OPPO K13x 5G
OPPO Reno14 5G
OPPO Reno14 Pro 5G
OPPO A5X
Oppo F31 Pro 5G
Oppo K13 Turbo Pro 5G
OPPO K13 Turbo 5G
Oppo F31 5G
Oppo F31 Pro Plus 5G
OPPO Find X9 5G
OPPO Find X9 Pro
OPPO A6x 5G
OPPO Reno15 5G
Oppo Reno15 Pro Mini 5G
OPPO Reno15 Pro 5G
OPPO A6 Pro 5G
OPPO Reno 15c 5G
OPPO K14x 5G
OPPO A6 5G
OPPO K14 5G
OPPO A6s 5G
OPPO F33 5G
OPPO F33 Pro 5G
OPPO F11 Pro Avenger Edition
OPPO Find X9s
OPPO Find X9 Ultra`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'OPPO' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `oppo_batch_${index++}`,
        brand: 'OPPO',
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

  console.log(`Successfully added ${newDevices.length} missing OPPO models!`);
}

main();
