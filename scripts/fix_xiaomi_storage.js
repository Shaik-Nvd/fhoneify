const fs = require('fs');

const seedPath = 'server/seed_devices.ts';
let seedContent = fs.readFileSync(seedPath, 'utf8');

let jsonStr = seedContent.replace('export const SEED_DEVICES = ', '').trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

let data;
try {
    data = eval(`(${jsonStr})`);
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

const badStorageSizes = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB'];

const initialLength = data.length;

data = data.filter(d => {
    if (d.brand === 'Xiaomi' && badStorageSizes.includes(d.storage)) {
        if (d.model === 'Redmi Go') {
            return true; // Keep Redmi Go 8GB
        }
        return false; // Filter out others
    }
    return true;
});

console.log(`Filtered out ${initialLength - data.length} bad Xiaomi storage variants.`);

fs.writeFileSync(seedPath, 'export const SEED_DEVICES = ' + JSON.stringify(data, null, 2) + ';\n');
