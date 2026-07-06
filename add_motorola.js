const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Motorola One Power
Motorola Moto E5 Plus
Motorola Moto G6 Plus
Motorola Moto E5
Motorola Moto Z2 Force
Motorola Moto G6
Motorola Moto G6 Play
Motorola Moto G7 Power
Motorola Moto G7
Motorola Moto One
Motorola One Vision
Motorola One Action
Motorola Moto E6s
Motorola One Macro
Motorola Moto Edge Plus
Motorola Moto G8 Power Lite
Motorola Moto Razr
Motorola One Fusion Plus
Motorola Moto G9
Motorola Moto E7 Plus
Motorola Moto Razr 5G
Motorola Moto G9 Power
Motorola Moto G 5G
Motorola Moto G30
Motorola Moto G10 Power
Motorola Moto E7 Power
Motorola Moto G60
Motorola Moto Edge 20 Pro
Motorola Moto G40 Fusion
Motorola Moto Edge 20 Fusion
Motorola Moto Edge 20
Motorola Moto G31
Motorola Moto G51 5G
Motorola Moto E40
Motorola Moto Edge 30 Pro
Motorola Moto Edge 30
Motorola Moto G52
Motorola Moto G71 5G
Motorola Moto G82 5G
Motorola Moto G22
Motorola Moto G42
Motorola Moto G32
Motorola Moto Edge 30 Fusion
Motorola Moto Edge 30 Ultra
Motorola Moto G72
Motorola Moto G62 5G
Motorola Moto E32s
Motorola Moto E13
Motorola Moto G8 Plus
Motorola Moto e32
Motorola Moto G73 5G
Motorola Moto e22s
Motorola Moto G13
Motorola Moto Edge 40
Motorola Moto Razr 40 Ultra
Motorola Moto G14
Motorola Moto G54 5G
Motorola Moto G84 5G
Motorola Moto Edge 40 Neo
Motorola Moto G34 5G
Motorola Moto G64 5G
Motorola Moto Edge 50 Pro
Motorola Moto Edge 50 Fusion
Motorola Moto G04
Motorola Moto G24 Power
Motorola Moto G85 5G
Motorola Moto Edge 50 Ultra
Motorola Moto Razr 50 Ultra
Motorola Moto Edge 50
Motorola Moto G04s
Motorola Moto G45 5G
Motorola Moto Razr 50
Motorola Moto Edge 50 Neo
Motorola Moto G35 5G
Motorola Moto G05
Motorola Moto Edge 60 Pro
Motorola Moto Edge 60 Fusion
Motorola Moto Razr 60
Motorola Moto Edge 60 Stylus
Motorola Moto Edge 60
Motorola Moto G96 5G
Motorola Moto G86 Power 5G
Motorola Moto Razr 60 Ultra
Motorola Moto Edge 70
Motorola Moto G57 Power 5G
Motorola Moto G06 Power
Motorola Moto Signature
Motorola Moto G67 Power 5G
Motorola Moto Edge 70 Fusion`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Motorola' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `motorola_batch_${index++}`,
        brand: 'Motorola',
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

  console.log(`Successfully added ${newDevices.length} missing Motorola models!`);
}

main();
