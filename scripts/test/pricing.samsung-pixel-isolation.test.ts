import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-oppo-infinix-isolation';
// Captured from main a9c1c8e before Oppo/Infinix registration. Every brand except Oppo and Infinix is protected.
assert.deepEqual(protectedPriceFingerprint(),{count:25884,sha256:'a2789f1c8cc10442aa582df132d675cc2decae0a9a994d26bd2a824ea9a8c3ed'});
console.log('PASS 25884 protected-brand prices unchanged from main a9c1c8e');
