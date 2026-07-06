const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Vivo V9 Pro
Vivo V11 Pro
Vivo V11
Vivo Y83 Pro
Vivo NEX
Vivo Y71i
Vivo Y81
Vivo Y83
Vivo V9 Youth
Vivo Y71
Vivo Y53i
Vivo X21
Vivo V9
Vivo V7
Vivo V7 Plus
Vivo Y69
Vivo Y55s
Vivo Y66
Vivo V5 Plus
Vivo V5
Vivo Y55L
Vivo Y53
Vivo Y31L
Vivo Y21L
Vivo Y21
Vivo V3
Vivo V3 Max
Vivo Y51L
Vivo Y95
Vivo Y93
Vivo Y81i
Vivo Z10
Vivo Y91
Vivo V15 Pro
Vivo Y91i
Vivo V15
Vivo Y17
Vivo Y15 2019
Vivo Y12
Vivo Z1 Pro
Vivo S1
Vivo Y90
Vivo Z1x
Vivo V17 Pro
Vivo U10
Vivo Y19
Vivo U20
Vivo V17
Vivo S1 Pro
Vivo Y11 2019
Vivo V19
Vivo Y50
Vivo Y30
Vivo X50
Vivo X50 Pro
Vivo V20
Vivo Y20i
Vivo Y20
Vivo V20 SE
Vivo V20 Pro
Vivo Y51 2020
Vivo Y20G
Vivo V20 2021
Vivo Y51A
Vivo Y20A
Vivo Y31 2021
Vivo X60
Vivo X60 Pro
Vivo X60 Pro Plus
Vivo V21 5G
Vivo V21e 5G
Vivo Y73
Vivo Y72 5G
Vivo Y12s
Vivo Y1s
Vivo Y53s
Vivo Y12G
Vivo Y33s
Vivo Y21 2021
Vivo X70 Pro
Vivo Y3s 2021
Vivo Y20T
Vivo V23 5G
Vivo V23 Pro
Vivo Y21T
Vivo T1 5G
Vivo V23e 5G
Vivo Y75 5G
Vivo Y21e
Vivo Y21a
Vivo Y33T
Vivo Y15s 2021
Vivo Y21G
Vivo X70 Pro Plus
Vivo X80
Vivo X80 Pro
Vivo T1 Pro 5G
Vivo T1
Vivo Y75
Vivo Y01
Vivo T1x
Vivo V25 Pro 5G
Vivo Y22 2022
Vivo V25 5G
Vivo Y16
Vivo Y35
Vivo Y02
Vivo Y100 5G
Vivo Y56 5G
Vivo V27 Pro
Vivo V27
Vivo Y01a
Vivo X90
Vivo X90 Pro
Vivo Y100A 5G
Vivo Y02T
Vivo T2 5G
Vivo T2x 5G
Vivo V29e
Vivo Y27
Vivo Y36
Vivo V29
Vivo V29 Pro
Vivo T2 Pro 5G
Vivo Y17S
Vivo Y200 5G
Vivo Y28 5G
Vivo X100
Vivo X100 Pro
Vivo V30
Vivo V30 Pro
Vivo Y200e 5G
Vivo T3x 5G
Vivo T3 5G
Vivo V30e
Vivo Y18
Vivo Y18e
Vivo Y200 Pro 5G
Vivo X Fold 3 Pro
Vivo T3 Lite 5G
Vivo Y28s 5G
Vivo Y18i
Vivo Y28e 5G
Vivo V40
Vivo V50 Elite
Vivo V40 Pro
Vivo Y58 5G
Vivo T3 Pro 5G
Vivo V40e
Vivo T3 Ultra
Vivo Y18T
Vivo X200
Vivo X200 Pro
Vivo Y300 5G
Vivo Y300 Plus 5G
Vivo Y29 5G
Vivo V50
Vivo T4X 5G
Vivo V50e
Vivo T4 5G
Vivo T4 Ultra 5G
Vivo Y19 5G
Vivo Y19e
Vivo Y39 5G
Vivo T4 Lite 5G
Vivo Y400 Pro 5G
Vivo X200 FE
Vivo Y400 5G
Vivo T4R 5G
Vivo V60
Vivo X Fold 5
Vivo T4 Pro 5G
Vivo Y31 5G
Vivo V60e
Vivo Y31 Pro 5G
Vivo Y19s 5G
Vivo X300
Vivo X300 Pro
Vivo V70
Vivo V70 Elite
Vivo X200T
Vivo Y51 Pro 5G
Vivo V70 FE
Vivo T5x 5G
Vivo Y11 5G
Vivo Y21 5G
Vivo X300 FE
Vivo X300 Ultra
Vivo Y05`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Vivo' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `vivo_batch_${index++}`,
        brand: 'Vivo',
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

  console.log(`Successfully added ${newDevices.length} missing Vivo models!`);
}

main();
