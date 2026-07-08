const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'Google', 'google_prices.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Build a map of "Google " + modelName + " " + storage to link
const linkMap = {};
for (const item of data) {
    const match = item.model.match(/Sell Old Google (.*?) \((.*?)\)/i);
    if (match) {
        const modelName = 'Google ' + match[1].trim();
        const variant = match[2].trim();
        const key = (modelName + '||' + variant).toLowerCase();
        linkMap[key] = item.link;
    }
}

function processSeedFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // We need to parse SEED_DEVICES, update it, and write it back.
    const prefix = 'export const SEED_DEVICES = ';
    if (!content.startsWith(prefix)) return;
    
    let jsonStr = content.slice(prefix.length).trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
    
    try {
        const devices = JSON.parse(jsonStr);
        let updatedCount = 0;
        
        for (const device of devices) {
            if (device.brand === 'Google') {
                const key = (device.model + '||' + device.storage).toLowerCase();
                if (linkMap[key]) {
                    device.cashifyLink = linkMap[key];
                    updatedCount++;
                }
            }
        }
        
        const newContent = prefix + JSON.stringify(devices, null, 2) + ';\n';
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${updatedCount} devices with cashifyLink in ${filePath}`);
    } catch (e) {
        console.error('Error parsing', filePath, e);
    }
}

processSeedFile(path.join(__dirname, 'lib', 'seed_devices.ts'));
processSeedFile(path.join(__dirname, 'server', 'seed_devices.ts'));
