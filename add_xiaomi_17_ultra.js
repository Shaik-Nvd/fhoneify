const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const newDevice = {
    id: crypto.randomUUID(),
    brand: 'Xiaomi',
    model: 'Xiaomi 17 Ultra',
    storage: '16 GB/512 GB',
    ram: '16 GB',
    color: 'Default',
    basePrice: 77150,
    cashifyLink: 'https://www.cashify.in/sell-old-mobile-phone/used-xiaomi-17-ultra-16-gb-512-gb',
  };

  try {
    const existing = await prisma.device.findFirst({
      where: {
        brand: newDevice.brand,
        model: newDevice.model,
        storage: newDevice.storage,
      }
    });

    if (existing) {
      console.log('Already exists in DB');
    } else {
      await prisma.device.create({ 
        data: {
          id: newDevice.id,
          brand: newDevice.brand,
          model: newDevice.model,
          storage: newDevice.storage,
          ram: newDevice.ram,
          color: newDevice.color
        } 
      });
      console.log('Inserted into DB');
    }

    const seedPath = path.join(__dirname, 'lib', 'seed_devices.ts');
    let seedContent = fs.readFileSync(seedPath, 'utf8');

    if (!seedContent.includes('Xiaomi 17 Ultra') || !seedContent.includes('16 GB/512 GB')) {
      const closingBracketIndex = seedContent.lastIndexOf(']');
      if (closingBracketIndex !== -1) {
        const newEntry = `  {
    "id": "${newDevice.id}",
    "brand": "${newDevice.brand}",
    "model": "${newDevice.model}",
    "storage": "${newDevice.storage}",
    "ram": "${newDevice.ram}",
    "color": "${newDevice.color}",
    "basePrice": ${newDevice.basePrice},
    "cashifyLink": "${newDevice.cashifyLink}"
  }`;
        seedContent = seedContent.substring(0, closingBracketIndex) + ',\n' + newEntry + '\n' + seedContent.substring(closingBracketIndex);
        fs.writeFileSync(seedPath, seedContent, 'utf8');
        console.log('Added to seed_devices.ts');
      }
    } else {
      console.log('Already in seed_devices.ts');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
