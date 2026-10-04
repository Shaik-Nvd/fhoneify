import { SEED_DEVICES } from '../seed_devices';

export interface CatalogDevice {
  id: string;
  brand: string;
  model: string;
  storage: string;
  basePrice?: number;
}

const normalizePart = (value: unknown) => String(value ?? '').trim().toLowerCase();

const lookupKey = (brand: unknown, model: unknown, storage: unknown) =>
  `${normalizePart(brand)}|${normalizePart(model)}|${normalizePart(storage)}`;

let defaultIndex: Map<string, CatalogDevice> | null = null;

function buildIndex(devices: CatalogDevice[]): Map<string, CatalogDevice> {
  const index = new Map<string, CatalogDevice>();
  for (const device of devices) {
    const key = lookupKey(device.brand, device.model, device.storage);
    // First entry wins, matching the quote page's `allDevices.find(...)`.
    if (!index.has(key)) index.set(key, device);
  }
  return index;
}

/** Resolves the brand/model/storage the quote page submits to the catalog
 * device it was selected from (lib/seed_devices.ts - the same catalog the
 * page renders). Case/whitespace-insensitive only; never fuzzy. */
export function findCatalogDevice(
  brand: string,
  model: string,
  storage: string,
  devices?: CatalogDevice[]
): CatalogDevice | null {
  const index = devices
    ? buildIndex(devices)
    : (defaultIndex ??= buildIndex(SEED_DEVICES as CatalogDevice[]));
  return index.get(lookupKey(brand, model, storage)) ?? null;
}

/** Device-ID endpoints use the same exact variant identity as the quote page. */
export function findCatalogDeviceById(id: string): CatalogDevice | null {
  return (SEED_DEVICES as CatalogDevice[]).find(device => device.id === id) ?? null;
}
