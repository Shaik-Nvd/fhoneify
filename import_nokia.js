const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pricesPath = path.join(__dirname, 'nokia', 'nokia_prices.json');
    
    console.log('Reading JSON...');
    const pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
    const newDevices = [];
    const regex = /^Sell Old (.+?) \((.+?)\/(.+?)\)$/i;

    console.log(`Processing ${pricesData.length} items...`);
    
    for (let i = 0; i < pricesData.length; i++) {
        const item = pricesData[i];
        const match = item.model.match(regex);
        if (match) {
            let modelName = match[1].trim();
            let ram = match[2].trim();
            let storage = match[3].trim();
            
            if (ram.includes(' GB')) ram = ram.replace(' GB', 'GB');
            
            const dbDevice = {
                brand: 'Nokia',
                model: modelName,
                storage: storage,
                ram: ram,
                color: 'Default'
            };

            try {
                // Check if exists
                const existing = await prisma.device.findFirst({
                    where: { model: dbDevice.model, storage: dbDevice.storage, ram: dbDevice.ram }
                });
                
                let created = existing;
                if (!existing) {
                    created = await prisma.device.create({ data: dbDevice });
                }
                
                newDevices.push({
                    ...dbDevice,
                    id: created.id,
                    basePrice: item.price,
                    cashifyLink: item.link
                });
            } catch (e) {
                console.error(`Error adding ${modelName}:`, e.message);
            }
        }
    }

    console.log(`Prepared ${newDevices.length} devices for seed files.`);

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
            for (const newDev of newDevices) {
                const idx = devices.findIndex(d => d.model === newDev.model && d.storage === newDev.storage);
                if (idx === -1) {
                    devices.push(newDev);
                } else {
                    devices[idx].basePrice = newDev.basePrice;
                    devices[idx].cashifyLink = newDev.cashifyLink;
                }
            }
            const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${path.basename(filePath)}`);
        } catch (e) {
            console.error('Error parsing', filePath, e.message);
        }
    }

    addModelsToSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
    addModelsToSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
}

main().then(() => console.log('Done.')).catch(console.error).finally(() => prisma.$disconnect());
