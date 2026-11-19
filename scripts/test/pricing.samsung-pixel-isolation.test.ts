import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-oppo-infinix-isolation';
// Captured from main a9c1c8e before Oppo/Infinix registration. Every brand except Oppo and Infinix is protected.
// 19 Nov 2026: three iPhone storages Cashify does not list (7 Plus 64/512 GB, X 128 GB) were removed
// from the catalog; exactly their 36 rows left the fingerprint and no other price changed.
assert.deepEqual(protectedPriceFingerprint(),{count:25848,sha256:'9db8c154ff0d2f35d6e7d65188a9d4847d66e6e2e45d9d09f146236bb73aee0c'});
console.log('PASS 25848 protected-brand prices unchanged from main a9c1c8e apart from the removed iPhone rows');
