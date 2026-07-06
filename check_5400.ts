import fs from 'fs';
import { SEED_DEVICES } from './lib/seed_devices.ts';

let samsungs = SEED_DEVICES.filter(d => d.brand === 'Samsung' && d.basePrice === 5400);
console.log('5400:', samsungs.map(d => d.model + ' (' + d.storage + ')'));
