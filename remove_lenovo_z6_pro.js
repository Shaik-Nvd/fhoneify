const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const deletedZ6 = await prisma.device.deleteMany({
            where: {
                model: 'Lenovo Z6 Pro'
            }
        });
        console.log(`Deleted ${deletedZ6.count} Lenovo Z6 Pro devices from DB.`);
    } catch (e) {
        console.error('Error deleting from DB:', e.message);
    }

    function removeModelFromSeed(filePath) {
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
            
            const filteredDevices = devices.filter(dev => dev.model !== 'Lenovo Z6 Pro');
            
            if (filteredDevices.length < initialCount) {
                const newContent = header + JSON.stringify(filteredDevices, null, 2) + ';\n';
                fs.writeFileSync(filePath, newContent);
                console.log(`Removed ${initialCount - filteredDevices.length} Lenovo Z6 Pro from ${path.basename(filePath)}`);
            } else {
                console.log(`No devices removed from ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    removeModelFromSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    removeModelFromSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
