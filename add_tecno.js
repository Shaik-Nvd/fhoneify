const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `Tecno Spark 4
Tecno Camon 15 Pro
Tecno Camon 15
Tecno Spark Power 2 Air
Tecno Camon 16
Tecno POVA
Tecno Camon 16 Premier
Tecno Spark 7 Pro
Tecno Camon 17
Tecno Camon 17 Pro
Tecno POVA 2
Tecno Spark 8
Tecno Spark 8T
Tecno Camon 18
Tecno Spark 8 Pro
Tecno Spark 8C
Tecno Pova 5G
Tecno Pova Neo
Tecno Phantom X
Tecno Pova 3
Tecno Spark 8P
Tecno Spark 9
Tecno Camon 19
Tecno Camon 19 Neo
Tecno Camon 19 Pro 5G
Tecno Camon 20
Tecno Camon 20 Premier 5G
Tecno Camon 20 Pro 5G
Tecno Phantom V Fold 5G
Tecno Phantom X2 5G
Tecno Phantom X2 Pro 5G
Tecno Pova 4
Tecno Spark 10 5G
Tecno Spark 7P
Tecno Spark Go 2023
Tecno Spark GO 3
Tecno Camon 30 5G
Tecno Camon 30 Premier 5G
Tecno Pova 7 5G
Tecno Pova 7 Pro 5G
Tecno Pova Curve 5G
Tecno Spark 30C 5G
Tecno Camon 20s Pro 5G
Tecno Phantom V Flip2 5G
Tecno Phantom V Fold2 5G
Tecno Pova Slim 5G
Tecno Spark Go 5G
Tecno Phantom V Flip 5G
Tecno Pova 6 Pro 5G
Tecno Pova 6 Neo 5G
Tecno Spark 20 Pro 5G
Tecno Pova 5 Pro
Tecno POP X
Tecno Pova Curve 2 5G`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'Tecno' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `tecno_batch_${index++}`,
        brand: 'Tecno',
        model: model,
        storage: '128 GB',
        ram: '8GB',
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

  console.log(`Successfully added ${newDevices.length} missing Tecno models!`);
}

main();
