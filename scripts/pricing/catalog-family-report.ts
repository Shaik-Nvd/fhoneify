import fs from 'node:fs';
import path from 'node:path';
import referenceStore from '../../server/data/reference-prices/store.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { classifyPricingFamily, pricingFamilyKey } from '../../lib/pricing/families';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';

const comparisons = JSON.parse(fs.readFileSync(path.join(__dirname, 'cashify-comparisons.json'), 'utf8'));
const observations = [...(comparisons.records ?? []), ...(comparisons.isolationCases ?? [])];
const records = (referenceStore as { records: Record<string, ReferencePriceRecord> }).records;
interface FamilyRow {
  brand: string;
  engine: string;
  family: string;
  count: number;
  fresh: number;
  examples: string[];
  ruleSource: string;
  observations: number;
  comparableObservations: number;
}

const groups = new Map<string, FamilyRow>();
const catalogKeys = new Map<string, number>();
const malformedDevices: string[] = [];
let validCatalogRows = 0;

for (const device of SEED_DEVICES) {
  if (!device.brand || !device.model || !device.storage || !Number.isFinite(device.basePrice) || device.basePrice <= 0) {
    malformedDevices.push(JSON.stringify(device));
    continue;
  }
  validCatalogRows++;
  const catalogKey = `${String(device.brand).toLowerCase()}|${String(device.model).toLowerCase()}|${String(device.storage).toLowerCase()}`;
  catalogKeys.set(catalogKey, (catalogKeys.get(catalogKey) ?? 0) + 1);
  const classified = classifyPricingFamily(device.brand, device.model);
  const brand = String(device.brand ?? 'UNKNOWN');
  const key = `${brand} | ${classified.engine} | ${classified.family}`;
  const group: FamilyRow = groups.get(key) ?? {
    brand,
    engine: classified.engine,
    family: classified.family,
    count: 0,
    fresh: 0,
    examples: [],
    ruleSource: classified.ruleSource,
    observations: 0,
    comparableObservations: 0,
  };
  group.count++;
  if (records[deviceKey(device)]?.status === 'fresh') group.fresh++;
  const example = `${device.model} ${device.storage}`;
  if (group.examples.length < 3 && !group.examples.includes(example)) group.examples.push(example);
  groups.set(key, group);
}

for (const observation of observations) {
  const familyKey = pricingFamilyKey(observation.brand, observation.model);
  for (const group of groups.values()) {
    if (`${group.engine} / ${group.family}` !== familyKey || group.brand.toLowerCase() !== String(observation.brand).toLowerCase()) continue;
    group.observations++;
    if ((observation.comparabilityStatus ?? 'COMPARABLE') === 'COMPARABLE') group.comparableObservations++;
  }
}

const output = [...groups.values()].sort((a, b) => a.engine.localeCompare(b.engine) || a.family.localeCompare(b.family) || a.brand.localeCompare(b.brand));
if (process.argv.includes('--json')) console.log(JSON.stringify(output, null, 2));
else console.table(output.map((group) => ({
  brand: group.brand,
  family: `${group.engine} / ${group.family}`,
  devices: group.count,
  fresh: group.fresh,
  examples: group.examples.join('; '),
  rule: group.ruleSource,
  realObs: group.observations,
  comparable: group.comparableObservations,
})));

console.log(`Catalog rows: ${SEED_DEVICES.length}; valid device rows: ${validCatalogRows}; brand/family rows: ${output.length}; pricing families: ${new Set(output.map((group) => `${group.engine}/${group.family}`)).size}`);
const duplicateKeys = [...catalogKeys.entries()].filter(([, count]) => count > 1);
console.log(`Unique catalog variants: ${catalogKeys.size}; duplicate identities: ${duplicateKeys.length}; malformed devices: ${malformedDevices.length}`);
if (duplicateKeys.length) console.log(`Duplicate keys: ${duplicateKeys.map(([key, count]) => `${key} (${count})`).join(', ')}`);
if (malformedDevices.length) console.log(`Malformed devices: ${malformedDevices.join(', ')}`);
