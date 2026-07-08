const fs = require('fs');

let content = fs.readFileSync('lib/seed_devices.ts', 'utf-8');
let header = '';
if (content.startsWith('// @ts-nocheck\nexport const SEED_DEVICES: any[] = ')) {
    header = '// @ts-nocheck\nexport const SEED_DEVICES: any[] = ';
} else if (content.startsWith('export const SEED_DEVICES = ')) {
    header = 'export const SEED_DEVICES = ';
}

let jsonStr = content.slice(header.length).trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

try {
    const devices = JSON.parse(jsonStr);
    const honorModels = [...new Set(devices.filter(d => d.brand === 'Honor').map(d => d.model))];
    console.log(JSON.stringify(honorModels.sort(), null, 2));
} catch (e) {
    console.error('Parse error:', e);
}
