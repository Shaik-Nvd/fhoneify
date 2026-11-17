import assert from 'node:assert/strict';
import {protectedPriceFingerprint} from '../pricing-evidence/check-poco-motorola-isolation';
// Captured from current main cfb6de9 before POCO/Motorola registration and Nokia refit.
// This round protects Xiaomi and Nokia except 8.1, as well as the earlier brands.
assert.deepEqual(protectedPriceFingerprint(),{count:26496,sha256:'7132e1890bc52eacea0d79e2dfef17eac19b26c4dbe9a6af0a8fd8a641d87ddc'});
console.log('PASS 26496 protected-brand prices unchanged from main cfb6de9');
