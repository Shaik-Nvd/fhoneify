const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const devices = await prisma.device.findMany({
            where: { brand: 'Nokia' }
        });
        
        let updateCount = 0;
        for (const dev of devices) {
            // Check if storage doesn't already contain '/'
            if (!dev.storage.includes('/')) {
                // Formatting ram: 4GB -> 4 GB
                let displayRam = dev.ram;
                if (displayRam.endsWith('GB') && !displayRam.endsWith(' GB')) {
                    displayRam = displayRam.replace('GB', ' GB');
                }
                const newStorage = `${displayRam}/${dev.storage}`;
                
                await prisma.device.update({
                    where: { id: dev.id },
                    data: { storage: newStorage }
                });
                updateCount++;
            }
        }
        console.log(`Updated ${updateCount} Nokia devices in DB.`);
    } catch (e) {
        console.error('Error updating DB:', e.message);
    }

    function fixSeed(filePath) {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf-8');
        let header = '';
        if (content.startsWith('// @ts-nocheck\nexport const SEED_DEVICES: any[] = ')) {
            header = '// @ts-nocheck\nexport const SEED_DEVICES: any[] = ';
        } else if (content.startsWith('export const SEED_DEVICES = ')) {
            header = 'export const SEED_DEVICES = ';
        } else return;
        
        let jsonStr = content.slice(header.length).trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        
        try {
            const devices = JSON.parse(jsonStr);
            let updated = 0;
            for (const dev of devices) {
                if (dev.brand === 'Nokia' && dev.storage && !dev.storage.includes('/')) {
                    let displayRam = dev.ram;
                    if (displayRam.endsWith('GB') && !displayRam.endsWith(' GB')) {
                        displayRam = displayRam.replace('GB', ' GB');
                    }
                    dev.storage = `${displayRam}/${dev.storage}`;
                    updated++;
                }
            }
            if (updated > 0) {
                const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
                fs.writeFileSync(filePath, newContent);
                console.log(`Updated ${updated} items in ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    fixSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    fixSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().then(() => console.log('Done.')).catch(console.error).finally(() => prisma.$disconnect());
