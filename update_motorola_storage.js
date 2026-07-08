const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Update Prisma
    const devices = await prisma.device.findMany({
        where: { brand: { equals: 'Motorola', mode: 'insensitive' } }
    });
    
    let updated = 0;
    for (const d of devices) {
        if (!d.storage.includes('/')) {
            // It's just e.g. "64 GB", change it to "RAM/Storage"
            const newStorage = `${d.ram}/${d.storage}`;
            await prisma.device.update({
                where: { id: d.id },
                data: { storage: newStorage }
            });
            updated++;
        }
    }
    console.log(`Updated ${updated} Motorola devices in DB.`);
    
    // 2. Update seed_devices.ts
    function updateSeed(filePath) {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf-8');
        
        const prefix = 'export const SEED_DEVICES = ';
        if (!content.startsWith(prefix)) return;
        
        let jsonStr = content.slice(prefix.length).trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        
        try {
            const devices = JSON.parse(jsonStr);
            let changed = 0;
            devices.forEach(dev => {
                if (dev.brand && dev.brand.toLowerCase() === 'motorola') {
                    if (typeof dev.storage === 'string' && !dev.storage.includes('/')) {
                        dev.storage = `${dev.ram}/${dev.storage}`;
                        changed++;
                    }
                }
            });
            
            const newContent = prefix + JSON.stringify(devices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${changed} Motorola devices in ${path.basename(filePath)}`);
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }
    
    updateSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    updateSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
