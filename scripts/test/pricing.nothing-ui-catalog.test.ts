import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEED_DEVICES } from '../../lib/seed_devices';

const devices = SEED_DEVICES.filter((device) => device.brand === 'Nothing');
assert.equal(devices.length, 34, 'Nothing catalog must contain exactly the 34 measured variants');
assert.ok(!devices.some((device) => device.id === '11111111-2222-3333-4444-555555555555'));
for (const [model, storage] of [
  ['Nothing Phone 4a', '6 GB/128 GB'],
  ['Nothing Phone 4b', '6 GB/128 GB'],
  ['Nothing Phone 4b', '8 GB/128 GB'],
]) {
  const matches = devices.filter((device) => device.model === model && device.storage === storage);
  assert.equal(matches.length, 1, `${model} ${storage} must resolve uniquely`);
  assert.equal(matches[0].referencePriceStatus, 'pending');
  assert.equal(matches[0].basePrice, undefined, 'pending variants must not invent a reference');
  assert.ok(matches[0].cashifyLink.endsWith(storage.startsWith('6') ? '-6-gb-128-gb' : '-8-gb-128-gb'));
}
assert.ok(devices.every((device) => !device.cashifyLink.includes('phoe')));
const page = readFileSync(new URL('../../app/quote/page.tsx', import.meta.url), 'utf8');
assert.ok(page.includes('runnerOffersCharger(model, storage)'));
assert.ok(page.includes('hasChargerInBox(selectedBrand, selectedModel, selectedStorage)'));
assert.ok(page.includes('runnerAsksAge(selectedModel)'));
assert.ok(page.includes('const hasFingerprint = !isApple ||'));
assert.ok(!/from ['\"][^'\"]*(?:pricingCalculator|pricing\/engine|cashify_prices)/.test(page));
console.log('Nothing catalog and quote UI regressions passed');
