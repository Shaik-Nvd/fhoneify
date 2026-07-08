const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({ where: { brand: 'Google' } });
  console.log(`Found ${devices.length} Google devices.`);
  
  for (const device of devices) {
    await prisma.quote.deleteMany({ where: { deviceId: device.id } });
    await prisma.inventoryItem.deleteMany({ where: { deviceId: device.id } });
  }
  
  const res = await prisma.device.deleteMany({ where: { brand: 'Google' } });
  console.log(`Deleted ${res.count} Google devices.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
