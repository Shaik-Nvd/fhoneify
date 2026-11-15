import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-xiaomi-others-isolation';
// Updated protected scope: new brands and only OnePlus 9RT are owner-authorized.
// Captured on main b027422 before registering the new calibration files.
assert.deepEqual(protectedPriceFingerprint(),{count:24096,sha256:'23adabaa1fe0487bd9e4494b1bcb2c2a88465573597925ecba806d2d6c5dad3b'});
console.log('PASS 24096 protected-brand prices unchanged from main b027422');
