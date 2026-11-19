import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-oppo-infinix-isolation';
// Captured from main a9c1c8e before Oppo/Infinix registration. Every brand except Oppo and Infinix is protected.
// 19 Nov 2026: three iPhone storages Cashify does not list (7 Plus 64/512 GB, X 128 GB) were removed
// from the catalog; exactly their 36 rows left the fingerprint and no other price changed.
// 19 Nov 2026 (later): 30 variants Cashify no longer buys and one empty catalog row were removed;
// exactly their rows left the fingerprint and no other price changed (diffed row by row).
// 19 Nov 2026 (later): 22 variants Cashify no longer buys and one empty catalog row were removed;
// exactly their rows left the fingerprint and no other price changed (diffed row by row).
assert.deepEqual(protectedPriceFingerprint(),{count:25572,sha256:'cbc19d095536f44cbec077ca90bf6119300edf7a4c20a43e08ec8423f346aea6'});
console.log('PASS 25572 protected-brand prices unchanged from main a9c1c8e apart from removed catalog rows');
