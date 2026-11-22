import { NextResponse } from 'next/server';
import { SEED_DEVICES } from '@/lib/seed_devices';

// Built once at build time: the phone search on the home page needs only
// brand, model and storages, not the 800 KB device catalog. No prices here.
export const dynamic = 'force-static';

type Row = { brand?: unknown; model?: unknown; storage?: unknown };

function storageSize(s: string) {
  const parse = (v: string) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return -1;
    if (v.includes('TB')) return n * 1024;
    if (v.includes('MB')) return n / 1024;
    return n;
  };
  if (s.includes('/')) {
    const [ram, rom] = s.split('/');
    return { ram: parse(ram), rom: parse(rom) };
  }
  return { ram: 0, rom: parse(s) };
}

/** Same order as the quote page's storage step: by storage, then RAM. */
function byStorage(a: string, b: string) {
  const x = storageSize(a);
  const y = storageSize(b);
  return x.rom !== y.rom ? x.rom - y.rom : x.ram - y.ram;
}

export function GET() {
  const models = new Map<string, { brand: string; model: string; storages: Set<string> }>();
  for (const row of SEED_DEVICES as Row[]) {
    const brand = typeof row.brand === 'string' ? row.brand : '';
    const model = typeof row.model === 'string' ? row.model : '';
    const storage = typeof row.storage === 'string' ? row.storage : '';
    if (!brand || !model || !storage) continue;
    const key = `${brand}|${model}`;
    if (!models.has(key)) models.set(key, { brand, model, storages: new Set() });
    models.get(key)!.storages.add(storage);
  }
  const rows = Array.from(models.values()).map((m) => [m.brand, m.model, Array.from(m.storages).sort(byStorage)]);
  return NextResponse.json({ v: 1, models: rows });
}
