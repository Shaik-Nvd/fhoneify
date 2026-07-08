const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const deletedA6 = await prisma.device.deleteMany({
            where: {
                model: 'Lenovo A6 Note',
                storage: {
                    contains: '64 GB'
                }
            }
        });
        console.log(`Deleted ${deletedA6.count} Lenovo A6 Note (64 GB) devices from DB.`);
        
        const deletedA5 = await prisma.device.deleteMany({
            where: {
                model: 'Lenovo A5'
            }
        });
        console.log(`Deleted ${deletedA5.count} Lenovo A5 devices from DB.`);
    } catch (e) {
        console.error('Error deleting from DB:', e.message);
    }

    function removeVariantFromSeed(filePath) {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf-8');
        
        let header = '';
        if (content.startsWith('// @ts-nocheck\nexport const SEED_DEVICES: any[] = ')) {
            header = '// @ts-nocheck\nexport const SEED_DEVICES: any[] = ';
        } else if (content.startsWith('export const SEED_DEVICES = ')) {
            header = 'export const SEED_DEVICES = ';
        } else {
            console.log('Unknown header in', filePath);
            return;
        }
        
        let jsonStr = content.slice(header.length).trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        
        try {
            const devices = JSON.parse(jsonStr);
            const initialCount = devices.length;
            
            const filteredDevices = devices.filter(dev => {
                if (dev.model === 'Lenovo A6 Note' && dev.storage && dev.storage.includes('64 GB')) {
                    return false; // exclude A6 Note 64GB
                }
                if (dev.model === 'Lenovo A5') {
                    return false; // exclude A5 entirely
                }
                return true;
            });
            
            if (filteredDevices.length < initialCount) {
                const newContent = header + JSON.stringify(filteredDevices, null, 2) + ';\n';
                fs.writeFileSync(filePath, newContent);
                console.log(`Removed ${initialCount - filteredDevices.length} devices from ${path.basename(filePath)}`);
            } else {
                console.log(`No devices removed from ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    removeVariantFromSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    removeVariantFromSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
