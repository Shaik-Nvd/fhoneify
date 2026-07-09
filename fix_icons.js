const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const imagesDir = path.join(__dirname, 'public', 'images', 'models');
    if (!fs.existsSync(imagesDir)) return;

    const files = fs.readdirSync(imagesDir);
    const devices = await prisma.device.findMany();

    // Get unique model names
    const uniqueModels = [...new Set(devices.map(d => d.model))];
    let fixedCount = 0;

    for (const model of uniqueModels) {
        const baseName = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const expectedName = `${baseName}.png`;
        const expectedPath = path.join(imagesDir, expectedName);

        if (!fs.existsSync(expectedPath)) {
            // Find a matching file in the directory
            // It should start with baseName and end with .jpg or .png
            // Sometimes there's an extra hyphen, so check baseName + '-' or exactly baseName + '.jpg'
            const match = files.find(f => {
                if (f === expectedName) return true;
                if (f === `${baseName}.jpg`) return true;
                if (f.startsWith(`${baseName}-`) && (f.endsWith('.jpg') || f.endsWith('.png'))) return true;
                return false;
            });

            if (match) {
                fs.copyFileSync(path.join(imagesDir, match), expectedPath);
                console.log(`Fixed: ${match} -> ${expectedName}`);
                fixedCount++;
            } else {
                console.log(`Missing: ${expectedName} (No matching source found)`);
            }
        }
    }
    
    console.log(`Total fixed icons: ${fixedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
