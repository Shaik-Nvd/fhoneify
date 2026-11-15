import assert from 'node:assert/strict';
import { SEED_DEVICES } from '../../lib/seed_devices';
for(const [model,storage]of [['Xiaomi Black Shark 2','6 GB/128 GB'],['Xiaomi Redmi Note 11','6 GB/64 GB'],['Nokia G42 5G','4 GB/128 GB']]) {
 const d=SEED_DEVICES.find(d=>d.model===model&&d.storage===storage);assert(d,`${model} ${storage}`);assert.equal(d.referencePriceStatus,'pending');assert.equal(d.basePrice,undefined);
}
console.log('PASS new measured catalog identities remain reference pending');
