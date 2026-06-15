/**
 * Verifies brand → model → storage cascade (same logic as app/quote/page.tsx)
 */
const SEED_DEVICES = [
  { id: 'd1', brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB' },
  { id: 'd2', brand: 'Apple', model: 'iPhone 14', storage: '128GB' },
  { id: 'd3', brand: 'Samsung', model: 'Galaxy S23 Ultra', storage: '512GB' },
  { id: 'd4', brand: 'Samsung', model: 'Galaxy A54', storage: '128GB' },
];

function normalizeDevice(raw) {
  return {
    id: String(raw.id ?? ''),
    brand: String(raw.brand ?? ''),
    model: String(raw.model ?? ''),
    storage: String(raw.storage ?? ''),
  };
}

function extractDevices(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) {
    return payload.data.map((row) => normalizeDevice(row));
  }
  return [];
}

async function main() {
  const res = await fetch('http://localhost:5000/api/quote/devices');
  const json = await res.json();
  console.log('Raw API response:', JSON.stringify(json, null, 2));

  const allDevices = extractDevices(json);
  console.log('Normalized count:', allDevices.length);

  const selectedBrand = 'Apple';
  const models = [...new Set(allDevices.filter((d) => d.brand === selectedBrand).map((d) => d.model))];
  console.log(`Models for ${selectedBrand}:`, models);
  if (models.length < 2) throw new Error('Expected 2 Apple models');

  const selectedModel = 'iPhone 15 Pro';
  const storage = [
    ...new Set(
      allDevices
        .filter((d) => d.brand === selectedBrand && d.model === selectedModel)
        .map((d) => d.storage)
    ),
  ];
  console.log(`Storage for ${selectedBrand} ${selectedModel}:`, storage);
  if (storage.length !== 1 || storage[0] !== '256GB') throw new Error('Storage mismatch');

  console.log('PASS: dropdown cascade logic works');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
