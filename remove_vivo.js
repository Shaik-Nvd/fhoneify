const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const deletedVivo = await prisma.device.deleteMany({
            where: {
                brand: {
                    equals: 'Vivo',
                    mode: 'insensitive'
                }
            }
        });
        console.log(`Deleted ${deletedVivo.count} Vivo devices from DB.`);
    } catch (e) {
        console.error('Error deleting from DB:', e);
    }

    // Also remove from seed_devices.ts
    function removeBrandFromSeed(filePath) {
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
            const originalLength = devices.length;
            const filteredDevices = devices.filter(d => d.brand.toLowerCase() !== 'vivo');
            
            if (filteredDevices.length < originalLength) {
                const newContent = header + JSON.stringify(filteredDevices, null, 2) + ';\n';
                fs.writeFileSync(filePath, newContent);
                console.log(`Removed ${originalLength - filteredDevices.length} Vivo devices from ${path.basename(filePath)}`);
            } else {
                console.log(`No Vivo devices found in ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    removeBrandFromSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    removeBrandFromSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
