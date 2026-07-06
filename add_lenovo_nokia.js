const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const rawLenovoList = `Lenovo K9 Note
Lenovo A5
Lenovo A6 Note
Lenovo K10 Note
Lenovo K10 Plus
Lenovo Z6 Pro`;

const rawNokiaList = `Nokia 2.1
Nokia 5.1
Nokia 6.1 Plus
Nokia 5.1 Plus
Nokia 3.1
Nokia 6.1
Nokia 8 Sirocco
Nokia 7 Plus
Nokia 2
Nokia 7
Nokia 8
Nokia 5
Nokia 3
Nokia 3.1 Plus
Nokia 8.1
Nokia 7.1
Nokia 3.2
Nokia 4.2
Nokia 2.2
Nokia 7.2
Nokia 6.2
Nokia 2.3
Nokia 5.3
Nokia C3 2020
Nokia 2.4
Nokia 3.4
Nokia 5.4
Nokia G20
Nokia C20 Plus
Nokia C01 Plus
Nokia G10
Nokia C30
Nokia XR20
Nokia G21
Nokia C21 Plus
Nokia G60 5G
Nokia C12
Nokia X30 5G
Nokia C12 Pro
Nokia C31
Nokia C32
Nokia C22
Nokia G42 5G
Nokia G11 Plus`;

async function main() {
  const newDevices = [];
  
  // 1. Fetch existing models to prevent true duplicates if case mismatched
  const existingLenovo = await prisma.device.findMany({ where: { brand: 'Lenovo' } });
  const existingLenovoNames = new Set(existingLenovo.map(d => d.model.toLowerCase()));

  const uniqueLenovo = [...new Set(rawLenovoList.split('\n').map(m => m.trim()).filter(Boolean))];
  let indexL = 1;
  for (const model of uniqueLenovo) {
    if (!existingLenovoNames.has(model.toLowerCase())) {
      newDevices.push({ id: `lenovo_batch_${indexL++}`, brand: 'Lenovo', model: model, storage: '4 GB/64 GB', ram: '4GB', color: 'Midnight', basePrice: 5000 });
    }
  }

  const existingNokia = await prisma.device.findMany({ where: { brand: 'Nokia' } });
  const existingNokiaNames = new Set(existingNokia.map(d => d.model.toLowerCase()));

  const uniqueNokia = [...new Set(rawNokiaList.split('\n').map(m => m.trim()).filter(Boolean))];
  let indexN = 1;
  for (const model of uniqueNokia) {
    if (!existingNokiaNames.has(model.toLowerCase())) {
      newDevices.push({ id: `nokia_batch_${indexN++}`, brand: 'Nokia', model: model, storage: '4 GB/64 GB', ram: '4GB', color: 'Midnight', basePrice: 5000 });
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

  console.log(`Successfully added ${newDevices.length} missing models!`);
}

main();
