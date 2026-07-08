const fs = require('fs');
const path = require('path');

const modelsToRemove = [
    'Asus ZenFone 5Z',
    'Asus ZenFone Max Pro M2',
    'Asus Zenfone Max Pro M1',
    'Asus ROG Phone ZS600KL'
];

function removeModelsFromSeed(filePath) {
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
        
        const filteredDevices = devices.filter(dev => {
            if (!dev || !dev.model) return true;
            if (modelsToRemove.includes(dev.model)) {
                return false;
            }
            if (modelsToRemove.some(m => m.toLowerCase() === dev.model.toLowerCase())) {
                return false;
            }
            return true;
        });
        
        if (filteredDevices.length < initialCount) {
            const newContent = header + JSON.stringify(filteredDevices, null, 2) + ';\n';
            fs.writeFileSync(filePath, newContent);
            console.log(`Removed ${initialCount - filteredDevices.length} records from ${path.basename(filePath)}`);
        } else {
            console.log(`Models not found in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error('Error parsing', filePath, e.message);
    }
}

removeModelsFromSeed(path.join(__dirname, 'lib', 'seed_devices.ts'));
removeModelsFromSeed(path.join(__dirname, 'server', 'seed_devices.ts'));
