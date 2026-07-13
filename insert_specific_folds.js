const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const phones = [
  { model: 'Samsung Galaxy Fold', ram: '12 GB', storage: '512 GB', price: 12990 },
  { model: 'Samsung Galaxy Z Fold2 5G', ram: '12 GB', storage: '256 GB', price: 17300 },
  { model: 'Samsung Galaxy Z Fold6 5G', ram: '12 GB', storage: '256 GB', price: 69580 },
  { model: 'Samsung Galaxy Z Fold6 5G', ram: '12 GB', storage: '512 GB', price: 70370 },
  { model: 'Samsung Galaxy Z Fold6 5G', ram: '12 GB', storage: '1 TB', price: 73870 },
  { model: 'Samsung Galaxy Z Fold4', ram: '12 GB', storage: '256 GB', price: 28690 },
  { model: 'Samsung Galaxy Z Fold4', ram: '12 GB', storage: '512 GB', price: 30120 },
  { model: 'Samsung Galaxy Z Fold5', ram: '12 GB', storage: '1 TB', price: 54770 },
  { model: 'Samsung Galaxy Z Fold4', ram: '12 GB', storage: '1 TB', price: 32990 },
  { model: 'Samsung Galaxy Z Fold5', ram: '12 GB', storage: '256 GB', price: 50160 },
  { model: 'Samsung Galaxy Z Fold5', ram: '12 GB', storage: '512 GB', price: 50590 }
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
