const fs = require('fs');
const path = require('path');

function fixSeed(filePath) {
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
        let updated = 0;
        for (const dev of devices) {
            if (dev.brand === 'Nokia' && dev.storage && !dev.storage.includes('/')) {
                let displayRam = dev.ram;
                if (displayRam.endsWith('GB') && !displayRam.endsWith(' GB')) {
                    displayRam = displayRam.replace('GB', ' GB');
                }
                dev.storage = `${displayRam}/${dev.storage}`;
                updated++;
            }
        }
        if (updated > 0) {
            const newContent = header + JSON.stringify(devices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${updated} items in ${path.basename(filePath)}`);
        } else {
            console.log(`No items needed updating in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error('Error parsing', filePath, e.message);
    }
}

fixSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
fixSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
console.log('Done.');
