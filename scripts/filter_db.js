const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function updateSeed() {
    const content = fs.readFileSync('server/seed_devices.ts', 'utf8');
    let jsonStr = content.replace('export const SEED_DEVICES = ', '').trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
    
    // We can evaluate it to get the array safely
    let data;
    try {
        data = eval(`(${jsonStr})`);
    } catch (e) {
        console.error("Eval failed", e);
        return;
    }

    const filtered = data.filter(d => d.brand === 'Apple' || d.brand === 'Samsung');
    console.log(`Seed file: filtered from ${data.length} to ${filtered.length} devices.`);
    fs.writeFileSync('server/seed_devices.ts', 'export const SEED_DEVICES = ' + JSON.stringify(filtered, null, 2) + ';\n');
}

async function updateDb() {
    const prisma = new PrismaClient();
    try {
        const res = await prisma.device.deleteMany({
            where: {
                brand: {
                    notIn: ['Apple', 'Samsung']
                }
            }
        });
        console.log(`Live DB: deleted ${res.count} non-Apple/Samsung devices.`);
    } catch (e) {
        console.error("DB Update failed", e);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await updateSeed();
    await updateDb();
}

main();
