import assert from 'node:assert/strict';
import { runnerStorageIdentity } from '../../lib/pricing/cashifyRunnerModel/identity';
import { SEED_DEVICES } from '../../lib/seed_devices';
const s25=SEED_DEVICES.find(d=>d.model==='Samsung Galaxy S25 Ultra 5G'&&d.storage==='256 GB')!;
assert(s25);assert.equal(runnerStorageIdentity(s25.storage,s25.ram),'12gb/256gb');
assert.equal(runnerStorageIdentity('12 GB/256 GB'),'12gb/256gb');
assert.notEqual(runnerStorageIdentity('256 GB','8 GB'),runnerStorageIdentity('256 GB','12 GB'));
console.log('PASS S25 Ultra storage-only catalog identity preserves RAM');
