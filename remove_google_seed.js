const fs = require('fs');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let prefix = 'export const SEED_DEVICES = ';
    
    if (!content.startsWith(prefix)) {
        console.log(`Unexpected format in ${filePath}`);
        return;
    }
    
    let jsonStr = content.slice(prefix.length).trim();
    if (jsonStr.endsWith(';')) {
        jsonStr = jsonStr.slice(0, -1);
    }
    
    try {
        let arr = JSON.parse(jsonStr);
        let originalLength = arr.length;
        let filtered = arr.filter(d => d.brand !== 'Google');
        
        let newContent = prefix + JSON.stringify(filtered, null, 2) + ';\n';
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed ${originalLength - filtered.length} Google devices from ${filePath}`);
    } catch (e) {
        console.error(`Error parsing JSON in ${filePath}:`, e.message);
    }
}

processFile('c:/Users/Mubeen_Taj/Downloads/Fhone/lib/seed_devices.ts');
processFile('c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts');
