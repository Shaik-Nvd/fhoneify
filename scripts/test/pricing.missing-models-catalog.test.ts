import assert from 'node:assert/strict';
import added from '../pricing/fixtures/missing-models-pending.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { BRANDS } from '../../lib/brands';
// 21 Nov 2026: phones Cashify buys that the catalog lacked (owner's all-brand audit), each added at the
// exact Cashify variant page that showed a "Get Upto" price. No reference is invented: the refresh prices them.
assert.equal(added.length,204);
// OnePlus 7T Pro McLaren 12/256 is restored as its original priced row (oneplus_7030), with its Cashify link.
for(const expected of added) {
 const rows=SEED_DEVICES.filter(d=>d.brand===expected.brand&&d.model===expected.model&&d.storage===expected.storage);
 assert.equal(rows.length,1,expected.model+' '+expected.storage);const d=rows[0];
 assert.equal(d.referencePriceStatus,'pending');assert.equal(d.basePrice,undefined);
 assert.equal(d.cashifyLink,expected.cashifyLink);assert.match(d.cashifyLink!,/^https:\/\/www\.cashify\.in\/sell-old-mobile-phone\/used-[a-z0-9-]+-\d+-gb-\d+-(gb|tb)$/);
}
assert(BRANDS.includes('Ai+'),'Ai+ is a selectable brand');
assert(!SEED_DEVICES.some(d=>/iPhone Duo/i.test(d.model)),'iPhone Duo (unreleased placeholder on Cashify) is not quoted');
const ids=SEED_DEVICES.map(d=>d.id);assert.equal(new Set(ids).size+1,ids.length,'only the known duplicate id xiaomi_redmi_turbo_5_8_256 repeats');
console.log('PASS 204 missing-model rows are reference-pending with exact Cashify variant links');
