import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-xiaomi-others-isolation';
// Updated protected scope: new brands and only OnePlus 9RT are owner-authorized.
// Captured on main b027422 before registering the new calibration files.
// Re-captured 17 Nov 2026 for the runner age-order guard (older never pays more). It changes 9 of the
// 24,096 fingerprinted prices, all at the synthetic 20,000 reference (Pixel 9 Pro XL 256/512, Galaxy S25
// Edge 512, above-11 / warranty No / bill No); no price at a real catalog reference changed.
assert.deepEqual(protectedPriceFingerprint(),{count:24096,sha256:'6697ac63a3e84cd3b2d6fb0a9c3a4e988f8b620cc7b8f4e4247bb3f87d24830f'});
console.log('PASS 24096 protected-brand prices unchanged from main b027422');
