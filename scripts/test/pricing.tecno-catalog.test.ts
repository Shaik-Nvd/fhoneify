import assert from 'node:assert/strict';
import pending from '../pricing/fixtures/tecno-pending.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
assert.equal(pending.length,15);
for(const expected of pending) {
 const d=SEED_DEVICES.find(d=>d.brand===expected.brand&&d.model===expected.model&&d.storage===expected.storage);
 assert(d,expected.model+' '+expected.storage);assert.equal(d.referencePriceStatus,'pending');assert.equal(d.basePrice,undefined);
 assert.match(d.cashifyLink!,/^https:\/\/www\.cashify\.in\//);assert.equal(d.cashifyLink,expected.cashifyLink);
}
console.log('PASS all 15 pending Tecno rows carry their exact checkpoint Cashify URL and no invented reference');
