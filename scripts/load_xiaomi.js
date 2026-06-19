const fs = require('fs');

const raw = fs.readFileSync('scripts/xiaomi_raw.txt', 'utf8');
const lines = raw.split('\n').map(l => l.trim()).filter(l => l);

const newDevices = [];
let idCounter = 1000;

for (const line of lines) {
    const match = line.match(/^(Xiaomi .*?) \((.*?)\) [:=] Cashify price : Rs. ([\d,]+)$/i);
    if (match) {
        let fullName = match[1].trim();
        const storageRam = match[2].trim(); // e.g. "128 GB" or "6 GB/128 GB"
        const priceStr = match[3].trim().replace(/,/g, '');
        const price = parseInt(priceStr, 10);
        
        let model = fullName;
        if (model.toLowerCase().startsWith('xiaomi ')) {
            model = model.substring(7).trim(); // remove 'Xiaomi ' prefix
        }

        let ram = '4GB';
        let storage = '64GB';
        if (storageRam.includes('/')) {
            const parts = storageRam.split('/');
            ram = parts[0].replace(' ', ''); // e.g. "6GB"
            storage = parts[1].replace(' ', ''); // e.g. "128GB"
        } else {
            storage = storageRam.replace(' ', ''); // e.g. "128GB"
            if (storage === '128GB' || storage === '256GB') ram = '8GB';
            else if (storage === '64GB') ram = '6GB';
            else if (storage === '32GB') ram = '3GB';
            else if (storage === '16GB') ram = '2GB';
        }

        newDevices.push({
            id: 'x_' + (idCounter++),
            brand: 'Xiaomi',
            model: model,
            storage: storage,
            ram: ram,
            color: 'Black',
            basePrice: price
        });
    } else {
        console.log("Could not parse line:", line);
    }
}

const seedContent = fs.readFileSync('server/seed_devices.ts', 'utf8');
let jsonStr = seedContent.replace('export const SEED_DEVICES = ', '').trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

let data;
try {
    data = eval(`(${jsonStr})`);
} catch (e) {
    console.error("Failed to parse seed_devices", e);
    process.exit(1);
}

data = data.filter(d => d.brand !== 'Xiaomi');
data.push(...newDevices);

console.log(`Added ${newDevices.length} Xiaomi devices. Total devices: ${data.length}`);

fs.writeFileSync('server/seed_devices.ts', 'export const SEED_DEVICES = ' + JSON.stringify(data, null, 2) + ';\n');
