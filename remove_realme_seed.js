const fs = require('fs');

const brandLower = 'realme';

function processSeedFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const prefix = 'export const SEED_DEVICES = ';
    if (!content.startsWith(prefix)) return;
    
    let jsonStr = content.slice(prefix.length).trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
    
    try {
        const devices = JSON.parse(jsonStr);
        const originalLength = devices.length;
        
        const filtered = devices.filter(device => {
            if (!device || !device.brand) return true; // keep devices with no brand if any
            return device.brand.toLowerCase() !== brandLower;
        });
        
        const newContent = prefix + JSON.stringify(filtered, null, 2) + ';\n';
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed ${originalLength - filtered.length} Realme devices from ${filePath}`);
    } catch (e) {
        console.error('Error parsing', filePath, e.message);
    }
}

processSeedFile('c:/Users/Mubeen_Taj/Downloads/Fhone/lib/seed_devices.ts');
processSeedFile('c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts');
