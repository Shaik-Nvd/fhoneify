const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawList = `iQOO 3
iQOO 7 5G
iQOO 7 Legend 5G
iQOO Z3 5G
iQOO Z5 5G
iQOO 9 5G
iQOO 9 Pro 5G
iQOO 9 SE 5G
iQOO Z6 Pro 5G
iQOO Z6 5G
iQOO Z6
iQOO Neo 6 5G
iQOO 9T 5G
iQOO 3 5G
iQOO Z6 Lite 5G
iQOO 11 5G
iQOO Neo 7 5G
iQOO Z7 5G
iQOO Z7s 5G
iQOO Neo 7 Pro 5G
iQOO Z7 Pro 5G
iQOO 12 5G
iQOO Neo 9 Pro 5G
iQOO Z9 5G
iQOO Z9x 5G
iQOO Z9 Lite 5G
iQOO Z9s 5G
iQOO Z9s Pro 5G
iQOO 13 5G
iQOO Neo 10R 5G
iQOO Z10 5G
iQOO Z10x 5G
iQOO Neo 10
iQOO Z10 Lite 5G
iQOO Z10R 5G
iQOO 15 5G
iQOO 15R
iQOO Z11x 5G`;

async function main() {
  const uniqueModels = [...new Set(rawList.split('\n').map(m => m.trim()).filter(Boolean))];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingDevices = await prisma.device.findMany({
    where: { brand: 'iQOO' }
  });
  const existingNames = new Set(existingDevices.map(d => d.model.toLowerCase()));

  const newDevices = [];
  let index = 1;
  for (const model of uniqueModels) {
    if (!existingNames.has(model.toLowerCase())) {
      newDevices.push({
        id: `iqoo_batch_${index++}`,
        brand: 'iQOO',
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

  console.log(`Successfully added ${newDevices.length} missing iQOO models!`);
}

main();
