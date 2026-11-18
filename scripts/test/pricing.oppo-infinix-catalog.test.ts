import assert from 'node:assert/strict';
import pending from '../pricing/fixtures/oppo-infinix-pending.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
assert.equal(pending.length,30);
for(const expected of pending) {
 const d=SEED_DEVICES.find(d=>d.brand===expected.brand&&d.model===expected.model&&d.storage===expected.storage);
 assert(d,expected.model+' '+expected.storage);assert.equal(d.referencePriceStatus,'pending');assert.equal(d.basePrice,undefined);
 assert.match(d.cashifyLink!,/^https:\/\/www\.cashify\.in\//);assert.equal(d.cashifyLink,expected.cashifyLink);
}
console.log('PASS all 30 pending Oppo/Infinix rows carry their exact checkpoint Cashify URL and no invented reference');
