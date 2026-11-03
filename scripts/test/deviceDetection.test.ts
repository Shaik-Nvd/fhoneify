import assert from 'node:assert/strict';
import { detectDeviceFromInput } from '../../lib/deviceDetection';

// Test 1: High-entropy hint for OnePlus Nord AC2001
const oneplusTest = detectDeviceFromInput({ clientHintsModel: 'AC2001' });
assert.ok(oneplusTest, 'OnePlus Nord AC2001 should be detected');
assert.equal(oneplusTest.brand, 'OnePlus');
assert.equal(oneplusTest.model, 'OnePlus Nord');
assert.equal(oneplusTest.storage, '8 GB/128 GB');
console.log('PASS: AC2001 -> OnePlus Nord (8 GB/128 GB)');

// Test 2: Android User-Agent with AC2001
const uaTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 12; AC2001 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36'
});
assert.ok(uaTest, 'Android UA AC2001 should be detected');
assert.equal(uaTest.brand, 'OnePlus');
assert.equal(uaTest.model, 'OnePlus Nord');
console.log('PASS: Android UA AC2001 -> OnePlus Nord');

// Test 3: Samsung Galaxy S23 Ultra dual-SIM suffix (SM-S918B/DS)
const samsungTest = detectDeviceFromInput({ clientHintsModel: 'SM-S918B/DS' });
assert.ok(samsungTest, 'SM-S918B/DS should be normalized and detected');
assert.equal(samsungTest.brand, 'Samsung');
assert.equal(samsungTest.model, 'Samsung Galaxy S23 Ultra 5G');
console.log('PASS: SM-S918B/DS -> Samsung Galaxy S23 Ultra 5G');

// Test 3b: Samsung Galaxy A14 5G hardware code (SM-A146B)
const samsungA14Test = detectDeviceFromInput({ clientHintsModel: 'SM-A146B' });
assert.ok(samsungA14Test, 'SM-A146B should be normalized and detected as Galaxy A14 5G');
assert.equal(samsungA14Test.brand, 'Samsung');
assert.equal(samsungA14Test.model, 'Samsung Galaxy A14 5G');
console.log('PASS: SM-A146B -> Samsung Galaxy A14 5G');

// Test 4: Frozen Android 10 User-Agent with Adreno 620 GPU Renderer (OnePlus Nord)
const frozenUATest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  webglRenderer: 'ANGLE (Qualcomm, Adreno (TM) 620, OpenGL ES 3.2)',
});
assert.ok(frozenUATest, 'Frozen Android Chrome with Adreno 620 should resolve to OnePlus Nord');
assert.equal(frozenUATest.brand, 'OnePlus');
assert.equal(frozenUATest.model, 'OnePlus Nord');
console.log('PASS: Frozen Android UA + Adreno 620 -> OnePlus Nord');

// Test 5: Frozen Android 10 User-Agent with Adreno 740 GPU Renderer (Samsung Galaxy S23 Ultra)
const s23GpuTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  webglRenderer: 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)',
});
assert.ok(s23GpuTest, 'Frozen Android Chrome with Adreno 740 should resolve to S23 Ultra');
assert.equal(s23GpuTest.brand, 'Samsung');
assert.equal(s23GpuTest.model, 'Samsung Galaxy S23 Ultra 5G');
console.log('PASS: Frozen Android UA + Adreno 740 -> Samsung Galaxy S23 Ultra 5G');

// Test 5b: Frozen Android 10 User-Agent with Mali-G57 GPU Renderer (Samsung Galaxy A14 5G)
const a14GpuTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  webglRenderer: 'Mali-G57 MC2',
});
assert.ok(a14GpuTest, 'Frozen Android Chrome with Mali-G57 should resolve to Samsung Galaxy A14 5G');
assert.equal(a14GpuTest.brand, 'Samsung');
assert.equal(a14GpuTest.model, 'Samsung Galaxy A14 5G');
console.log('PASS: Frozen Android UA + Mali-G57 -> Samsung Galaxy A14 5G');

// Test 6: iPhone 15 Pro resolution with A17 GPU renderer
const iphoneTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  screen: { width: 393, height: 852, devicePixelRatio: 3 },
  webglRenderer: 'Apple A17 Pro GPU',
});
assert.ok(iphoneTest, 'iPhone 15 Pro should be detected');
assert.equal(iphoneTest.brand, 'Apple');
assert.equal(iphoneTest.model, 'Apple iPhone 15 Pro');
console.log('PASS: iPhone 15 Pro detected');

// Test 7: iPhone 13 (390 x 844) with Apple A15 GPU
const iphone13Test = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  screen: { width: 390, height: 844, devicePixelRatio: 3 },
  webglRenderer: 'Apple A15 GPU',
});
assert.ok(iphone13Test, 'iPhone 13 should be detected');
assert.equal(iphone13Test.brand, 'Apple');
assert.equal(iphone13Test.model, 'Apple iPhone 13');
console.log('PASS: iPhone 13 detected');

// Test 8: Desktop browser returns null
const desktopTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
assert.equal(desktopTest, null, 'Desktop Windows should not detect a smartphone');
console.log('PASS: Desktop returns null');

console.log('\nAll 10 device detection tests passed successfully.');
