const fs = require('fs');
let seedContent = fs.readFileSync('server/seed_devices.ts', 'utf8');

let jsonStr = seedContent.replace('export const SEED_DEVICES = ', '').trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

let data;
try {
    data = eval(`(${jsonStr})`);
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

const xiaomi = data.filter(d => d.brand === 'Xiaomi');
const weirdStorage = xiaomi.filter(d => ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB'].includes(d.storage));

weirdStorage.forEach(d => {
    console.log(`${d.model} - Storage: ${d.storage}, RAM: ${d.ram}`);
});
console.log(`Total weird: ${weirdStorage.length}`);
