const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const phones = [
  { model: 'Samsung Galaxy Z Flip7 FE 5G', ram: '8 GB', storage: '256 GB', price: 53150 },
];

async function main() {
    const newDevices = [];
    const dbDevices = [];

    for (const item of phones) {
        const formattedStorage = `${item.ram}/${item.storage}`;
        const id = crypto.randomUUID();
        
        const dbDevice = {
            id,
            brand: 'Samsung',
            model: item.model,
            storage: formattedStorage,
            ram: item.ram,
            color: 'Default'
        };
        dbDevices.push(dbDevice);
        
        newDevices.push({
            ...dbDevice,
            basePrice: item.price
        });
    }

    try {
        console.log(`Inserting ${dbDevices.length} items into DB...`);
        await prisma.device.createMany({
            data: dbDevices,
            skipDuplicates: true
        });
        console.log('Insert complete.');
    } catch (e) {
        console.error('DB Insert Error:', e.message);
    }

    function addModelsToSeed(filePath) {
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
            let addedCount = 0;
            let updatedCount = 0;
            for (const newDev of newDevices) {
                const idx = devices.findIndex(d => d.model === newDev.model && d.storage === newDev.storage);
                if (idx === -1) {
                    devices.push(newDev);
                    addedCount++;
                } else {
                    devices[idx].basePrice = newDev.basePrice;
                    updatedCount++;
                }
            }
            
            const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Added ${addedCount}, Updated ${updatedCount} Samsung devices in ${path.basename(filePath)}`);
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    addModelsToSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    addModelsToSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
