import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-oppo-infinix-isolation';
// Captured from main a9c1c8e before Oppo/Infinix registration. Every brand except Oppo and Infinix is protected.
// 19 Nov 2026: three iPhone storages Cashify does not list (7 Plus 64/512 GB, X 128 GB) were removed
// from the catalog; exactly their 36 rows left the fingerprint and no other price changed.
// 19 Nov 2026 (later): 30 variants Cashify no longer buys and one empty catalog row were removed;
// exactly their rows left the fingerprint and no other price changed (diffed row by row).
// 19 Nov 2026 (later): 22 variants Cashify no longer buys and one empty catalog row were removed;
// exactly their rows left the fingerprint and no other price changed (diffed row by row).
// 21 Nov 2026: Tecno moved to measured rules and left the protected set (68 rows); 205 variants from the
// owner's missing-models audit were added (McLaren as its original row). A row-by-row diff against main a7c0554 shows no other price changed.
// 22 Nov 2026: deep audit. Unmeasured Android models moved to the cross-brand generic rules and percentage-type
// measured rules now scale with the reference; ROG Phone II 8/128 and CMF Phone 2 Pro 8/128 were restored.
// Row-by-row diff against main 10b1919: Apple, Nothing, Nokia, Honor, Asus and Lenovo unchanged.
assert.deepEqual(protectedPriceFingerprint(),{count:27240,sha256:'b0cbe70f6be1d391325c798da8d3c32f0e47d534994c1d5d3e46d2b5998c1d3c'});
console.log('PASS 27240 protected-brand prices unchanged from main a9c1c8e apart from removed catalog rows');
