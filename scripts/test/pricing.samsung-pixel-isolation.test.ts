import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-samsung-pixel-isolation';
// Captured on main8bcf2fd before Samsung/Google registration. Synthetic inputs,
// all other catalog brands, six conditions and two references per device.
assert.deepEqual(protectedPriceFingerprint(),{count:22932,sha256:'336d2d931c7cad44f0d9e83eaa84bff021d17881271cbc319734b7a613b56d01'});
console.log('PASS 22932 protected-brand quotes unchanged from main8bcf2fd');
