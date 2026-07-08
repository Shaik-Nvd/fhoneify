const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brandLower = 'motorola';
  const brandLower2 = 'motorolla'; // just in case
  
  // 1. Delete from Prisma
  const devices = await prisma.device.findMany({ 
    where: { 
      brand: { in: ['Motorola', 'Motorolla', 'motorola', 'motorolla'], mode: 'insensitive' }
    } 
  });
  console.log(`Found ${devices.length} Motorola devices in DB.`);
  
  for (const device of devices) {
    await prisma.quote.deleteMany({ where: { deviceId: device.id } });
    await prisma.inventoryItem.deleteMany({ where: { deviceId: device.id } });
  }
  
  const res = await prisma.device.deleteMany({ 
    where: { brand: { in: ['Motorola', 'Motorolla', 'motorola', 'motorolla'], mode: 'insensitive' } }
  });
  console.log(`Deleted ${res.count} Motorola devices from DB.`);

  // 2. Remove from seed_devices.ts
  function processSeedFile(filePath) {
      if (!fs.existsSync(filePath)) return;
      let content = fs.readFileSync(filePath, 'utf-8');
      
      const prefix = 'export const SEED_DEVICES = ';
      if (!content.startsWith(prefix)) return;
      
      let jsonStr = content.slice(prefix.length).trim();
      if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
      
      try {
          const devices = JSON.parse(jsonStr);
          const originalLength = devices.length;
          
          const filtered = devices.filter(device => {
              if (!device || !device.brand) return true;
              const brand = device.brand.toLowerCase();
              return brand !== brandLower && brand !== brandLower2;
          });
          
          const newContent = prefix + JSON.stringify(filtered, null, 2) + ';\n';
          fs.writeFileSync(filePath, newContent);
          console.log(`Removed ${originalLength - filtered.length} Motorola devices from ${filePath}`);
      } catch (e) {
          console.error('Error parsing', filePath, e.message);
      }
  }

  processSeedFile('c:/Users/Mubeen_Taj/Downloads/Fhone/lib/seed_devices.ts');
  processSeedFile('c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts');
}

main().catch(console.error).finally(() => prisma.$disconnect());
