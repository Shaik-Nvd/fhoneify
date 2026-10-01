import assert from 'node:assert/strict';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { resolveReference } from '../../lib/pricing/engine';
import { loadRefreshCatalog } from '../../lib/referencePricing/catalog';
import { deviceKey } from '../../lib/referencePricing/types';
import { xiaomiInrDeductions } from '../../lib/pricing/inrDeductionTables';

const names = [
  'Xiaomi Redmi Note 11', 'Xiaomi Redmi Note 11 Pro', 'Xiaomi Redmi Note 11 SE',
  'Xiaomi Redmi Note 12', 'Xiaomi Redmi Note 14 SE 5G', 'Xiaomi Redmi Note 15 SE 5G',
  'Xiaomi Redmi Note 17 5G', 'Xiaomi Redmi Note 17 Pro 5G',
];
const added = SEED_DEVICES.filter(d => names.includes(d.model));
assert.equal(added.length, 15);
assert.deepEqual(new Set(added.map(d => d.model)), new Set(names));
assert.equal(new Set(added.map(d => d.id)).size, added.length);
assert.equal(new Set(added.map(deviceKey)).size, added.length);
const refresh = loadRefreshCatalog();
const inr = xiaomiInrDeductions();
for (const device of added) {
  assert.equal(device.brand, 'Xiaomi');
  assert.equal(device.ram, device.storage.split('/')[0]);
  assert.equal(device.referencePriceStatus, 'pending');
  assert.equal(device.basePrice, undefined, `${device.model}: invented base price`);
  assert.match(device.cashifyLink, /^https:\/\/www\.cashify\.in\/sell-old-mobile-phone\/used-xiaomi-redmi-note-/);
  assert.deepEqual(findCatalogDevice(device.brand, device.model, device.storage), device);
  assert.equal(resolveReference({ device, snapshot: {} }), null, `${device.model}: unverified price fallback`);
  assert.equal(refresh.entries.filter(entry => deviceKey(entry.device) === deviceKey(device)).length, 1);
  assert.equal(refresh.entries.find(entry => deviceKey(entry.device) === deviceKey(device))?.cashifyLink, device.cashifyLink);
  assert.equal(inr.modelGroups[device.model], undefined, `${device.model}: INR model activated`);
}
assert.equal(SEED_DEVICES.some(d => d.model === 'Xiaomi Redmi Note 11' && d.storage === '4 GB/128 GB'), false);
assert.equal(SEED_DEVICES.some(d => d.model === 'Xiaomi Redmi Note 12' && d.storage === '6 GB/128 GB' && d.cashifyLink.includes('5g')), false);
console.log('15 pending Redmi variants: exact identity, unique IDs, refresh links, no invented price or INR activation');
