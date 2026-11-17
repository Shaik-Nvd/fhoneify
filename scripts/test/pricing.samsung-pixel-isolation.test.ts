import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-poco-motorola-isolation';
// Captured from current main cfb6de9 before POCO/Motorola registration and Nokia refit.
// This round protects Xiaomi and Nokia except 8.1, as well as the earlier brands.
// Re-captured after merging the runner age-order guard (older never pays more): it changes 6 of the
// 26,496 fingerprinted prices, all at the synthetic 20,000 reference (Pixel 9 Pro XL 256/512, Galaxy S25
// Edge 512, above-11 and cracked-screen rows); no price at a real catalog reference changed.
assert.deepEqual(protectedPriceFingerprint(),{count:26496,sha256:'d64a9108008d0468840beba027d69743960437b2aa88da63cde53b5fe28412ff'});
console.log('PASS 26496 protected-brand prices unchanged from main cfb6de9 apart from the reviewed age-order guard');
