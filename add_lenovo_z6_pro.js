const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const dbDevice = {
        brand: 'Lenovo',
        model: 'Lenovo Z6 Pro',
        storage: '8 GB/128 GB',
        ram: '8GB',
        color: 'Midnight'
    };

    const seedDevice = {
        ...dbDevice,
        basePrice: 5260
    };

    try {
        const added = await prisma.device.create({
            data: dbDevice
        });
        console.log(`Added Lenovo Z6 Pro (8 GB/128 GB) to DB with ID: ${added.id}`);
        // We will also use this ID for the seed files so it matches
        seedDevice.id = added.id;
    } catch (e) {
        console.error('Error adding to DB:', e.message);
        seedDevice.id = 'lenovo_z6_pro_8gb'; // fallback ID
    }

    function addModelToSeed(filePath) {
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
            // check if it already exists to avoid duplicates
            if (!devices.find(d => d.model === seedDevice.model && d.storage === seedDevice.storage)) {
                devices.push(seedDevice);
                const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
                fs.writeFileSync(filePath, newContent);
                console.log(`Added Lenovo Z6 Pro to ${path.basename(filePath)}`);
            } else {
                console.log(`Lenovo Z6 Pro already exists in ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    addModelToSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    addModelToSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
