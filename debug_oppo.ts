import { SEED_DEVICES } from './lib/seed_devices.ts';

const oppoDevices = SEED_DEVICES.filter(d => d.brand && d.brand.toLowerCase() === 'oppo');
const models = oppoDevices.map(d => d.model).filter(m => m.toLowerCase().includes('reno 10'));

console.log("All matching models for 'reno 10':");
models.forEach(m => {
    console.log(`"${m}"`, 'length:', m.length);
});
