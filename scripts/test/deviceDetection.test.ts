import assert from 'node:assert/strict';
import { detectDeviceFromInput } from '../../lib/deviceDetection';

// Test 1: Android user-agent is ignored (returns null)
const androidUaTest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 12; AC2001 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36'
});
assert.equal(androidUaTest, null, 'Android UA should return null');
console.log('PASS: Android UA returns null (Android detection disabled)');

// Test 2: Android client hints platform is ignored
const androidPlatformTest = detectDeviceFromInput({
  clientHintsPlatform: 'Android',
  clientHintsModel: 'SM-S918B'
});
assert.equal(androidPlatformTest, null, 'Android platform hint should return null');
console.log('PASS: Android platform hint returns null');

// Test 3: Frozen Android 10 User-Agent with GPU Renderer returns null
const frozenUATest = detectDeviceFromInput({
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  webglRenderer: 'ANGLE (Qualcomm, Adreno (TM) 620, OpenGL ES 3.2)',
});
assert.equal(frozenUATest, null, 'Frozen Android Chrome should return null');
console.log('PASS: Frozen Android UA returns null');

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
