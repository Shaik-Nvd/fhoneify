import assert from 'node:assert/strict';
import { detectDeviceFromInput } from '../../lib/deviceDetection';

// Test 1: High-entropy hint for OnePlus Nord AC2001
const oneplusTest = detectDeviceFromInput({ clientHintsModel: 'AC2001' });
assert.ok(oneplusTest, 'OnePlus Nord AC2001 should be detected');
assert.equal(oneplusTest.brand, 'OnePlus');
assert.equal(oneplusTest.model, 'OnePlus Nord');
console.log('PASS: AC2001 -> OnePlus Nord');

// Test 2: Android User-Agent with AC2001
const uaTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 12; AC2001 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36'
});
assert.ok(uaTest, 'Android UA AC2001 should be detected');
assert.equal(uaTest.brand, 'OnePlus');
assert.equal(uaTest.model, 'OnePlus Nord');
console.log('PASS: Android UA AC2001 -> OnePlus Nord');

// Test 3: Samsung Galaxy S23 Ultra (SM-S918B)
const samsungTest = detectDeviceFromInput({ clientHintsModel: 'SM-S918B' });
assert.ok(samsungTest, 'SM-S918B should be detected');
assert.equal(samsungTest.brand, 'Samsung');
assert.equal(samsungTest.model, 'Samsung Galaxy S23 Ultra 5G');
console.log('PASS: SM-S918B -> Samsung Galaxy S23 Ultra 5G');

// Test 4: iPhone 15 Pro resolution
const iphoneTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  screen: { width: 393, height: 852, devicePixelRatio: 3 }
});
assert.ok(iphoneTest, 'iPhone 15 Pro should be detected');
assert.equal(iphoneTest.brand, 'Apple');
assert.equal(iphoneTest.model, 'Apple iPhone 15 Pro');
console.log('PASS: iPhone 15 Pro detected');

// Test 5: Unknown device returns null
const unknownTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});
assert.equal(unknownTest, null, 'Desktop Windows should not be detected as mobile phone');
console.log('PASS: Desktop returns null');

console.log('\nAll 5 device detection tests passed successfully.');
