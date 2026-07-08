const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pricesPath = path.join(__dirname, 'poco', 'poco_prices.json');
    const iconsSource = path.join(__dirname, 'poco', 'poco_icons');
    const iconsDest = path.join(__dirname, 'public', 'images', 'models');
    
    // Copy icons
    if (fs.existsSync(iconsSource)) {
        const files = fs.readdirSync(iconsSource);
        let copiedCount = 0;
        for (const file of files) {
            fs.copyFileSync(path.join(iconsSource, file), path.join(iconsDest, file));
            copiedCount++;
        }
        console.log(`Copied ${copiedCount} icons to public/images/models`);
    }

    console.log('Reading JSON...');
    const pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
    const newDevices = [];
    const dbDevices = [];
    const regex = /^Sell Old (.+?) \((.+?)\/(.+?)\)$/i;

    for (const item of pricesData) {
        const match = item.model.match(regex);
        if (match) {
            let modelName = match[1].trim();
            let ram = match[2].trim();
            let storage = match[3].trim();
            
            let displayRam = ram;
            if (displayRam.endsWith('GB') && !displayRam.endsWith(' GB')) {
                displayRam = displayRam.replace('GB', ' GB');
            } else if (!displayRam.endsWith('GB') && !displayRam.endsWith('MB')) {
                if (displayRam.includes('GB')) {
                    displayRam = displayRam.replace('GB', ' GB');
                }
            }
            
            const formattedStorage = `${displayRam}/${storage}`;
            const id = crypto.randomUUID();
            
            const dbDevice = {
                id,
                brand: 'POCO',
                model: modelName,
                storage: formattedStorage,
                ram: displayRam,
                color: 'Default'
            };
            dbDevices.push(dbDevice);
            
            newDevices.push({
                ...dbDevice,
                basePrice: item.price,
                cashifyLink: item.link
            });
        }
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
