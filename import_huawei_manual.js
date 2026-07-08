const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const huaweiDevices = [
    {
        model: "Huawei P30 Pro",
        storage: "8 GB/256 GB",
        ram: "8 GB",
        basePrice: 7780,
        cashifyLink: "https://www.cashify.in/sell-old-mobile-phone/used-huawei-p30-pro-8-gb-256-gb"
    },
    {
        model: "Huawei P30 Lite",
        storage: "6 GB/128 GB",
        ram: "6 GB",
        basePrice: 4080,
        cashifyLink: "https://www.cashify.in/sell-old-mobile-phone/used-huawei-p30-lite-6-gb-128-gb"
    },
    {
        model: "Huawei Mate 20 Pro",
        storage: "6 GB/128 GB",
        ram: "6 GB",
        basePrice: 4370,
        cashifyLink: "https://www.cashify.in/sell-old-mobile-phone/used-huawei-mate-20-pro-6-gb-128-gb"
    },
    {
        model: "Huawei P20 Pro",
        storage: "6 GB/128 GB",
        ram: "6 GB",
        basePrice: 3670,
        cashifyLink: "https://www.cashify.in/sell-old-mobile-phone/used-huawei-p20-pro-6-gb-128-gb"
    },
    {
        model: "Huawei Mate 30 Pro",
        storage: "8 GB/256 GB",
        ram: "8 GB",
        basePrice: 8210,
        cashifyLink: "https://www.cashify.in/sell-old-mobile-phone/used-huawei-mate-30-pro-8-gb-256-gb"
    }
];

async function main() {
    console.log('Importing 5 Huawei models...');
    
    const importedModels = [];

    for (const device of huaweiDevices) {
        const id = crypto.randomUUID();
        
        // 1. Insert into DB
        try {
            await prisma.device.create({
                data: {
                    id,
                    brand: 'Huawei',
                    model: device.model,
                    storage: device.storage,
                    ram: device.ram,
                    color: 'Default',
                    basePrice: device.basePrice
                }
            });
            console.log(`Inserted ${device.model} into DB`);
        } catch (e) {
            console.error(`Failed to insert ${device.model} into DB:`, e.message);
        }

        // Add to imported list for seed_devices
        importedModels.push({
            id,
            brand: 'Huawei',
            model: device.model,
            storage: device.storage,
            ram: device.ram,
            color: 'Default',
            basePrice: device.basePrice,
            cashifyLink: device.cashifyLink
        });
    }

    // 2. Add to seed_devices.ts
    function updateSeedDevices(filePath) {
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
            devices.push(...importedModels);
            
            const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Added ${importedModels.length} Huawei models to ${path.basename(filePath)}`);
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    updateSeedDevices(path.join(__dirname, 'lib', 'seed_devices.ts'));
    updateSeedDevices(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
