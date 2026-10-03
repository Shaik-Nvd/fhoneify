/**
 * Calibration harness: prices the Cashify benchmark cases through the real
 * quote service (createPricingService -> priceDevice -> calculateFhoneifyPrice,
 * the same path as POST /api/quote/price) and compares Fhoneify's Cashify
 * condition equivalent with Cashify's Selling price.
 *
 *   npx tsx scripts/calibrate-pricing.ts [--fixture <file>] [--tolerance 3]
 *
 * Exits 1 when any gated case is outside the tolerance or cannot be priced.
 * No database: references come from the fixture via an in-memory repository.
 * Owner decision 2026-10-01: the engine's Cashify equivalent must match
 * Cashify; the displayed value keeps the existing uplift and ₹99 fee, so it
 * is printed for information only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPricingService } from '../lib/pricing/pricingService';
import { customerPayout } from '../lib/pricing/payout';
import { deviceKey, type ReferencePriceRecord } from '../lib/referencePricing/types';
import { COMBOS } from './pricing/benchmark-combos';

interface Case { model: string; storage: string; combo: 0 | 1 | 2; cashifyBase: number | null; target: number | null; fhoneifyNow?: number }
interface Fixture { references: Record<string, { getUpto: number | null }>; cases: Case[] }

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const fixturePath = resolve(arg('--fixture', 'scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json'));
const tolerancePct = Number(arg('--tolerance', '3'));
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const BRAND = 'Xiaomi';

class FixtureRepository {
  records = new Map<string, ReferencePriceRecord>();
  constructor() {
    const at = new Date().toISOString();
    for (const [id, ref] of Object.entries(fixture.references)) {
      if (!ref.getUpto) continue;
      const [model, storage] = id.split('|');
      const key = deviceKey({ brand: BRAND, model, storage });
      this.records.set(key, {
        deviceKey: key, brand: BRAND, model, storage, source: 'cashify', currentPrice: ref.getUpto,
        matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at,
        lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: at, updatedAt: at,
      });
    }
  }
  async get(key: string) { return this.records.get(key) ?? null; }
  async listAll() { return [...this.records.values()]; }
  async upsert(): Promise<never> { throw new Error('read-only'); }
}

async function main() {
  const repository = new FixtureRepository();
  const service = createPricingService({
    repository: repository as any,
    signingSecret: 'calibration-harness-'.padEnd(32, 'x'),
    tokenTtlSeconds: 600,
    // Strict: a case must never silently fall back to the stale catalog basePrice.
    strictReferenceMode: true,
    referenceLookupTimeoutMs: 1000,
    logger: { info() {}, warn() {}, error() {} },
    snapshot: {},
  });

  const rows: string[][] = [];
  const gatedErrors: number[] = [];
  let failures = 0;
  for (const c of fixture.cases) {
    const q = await service.quote({ brand: BRAND, model: c.model, storage: c.storage, diagnostics: COMBOS[c.combo] });
    const label = `${c.model} (${c.storage})`;
    if (!q.ok) {
      const gated = c.target != null;
      if (gated) failures++;
      rows.push([label, `C${c.combo}`, '-', String(c.target ?? '-'), '-', '-', `${q.code}${gated ? '' : ' (not gated)'}`, '-']);
      continue;
    }
    const eq = q.internal.cashifyConditionEquivalent;
    const displayed = customerPayout(q.fhoneifyPrice, false).payout;
    if (c.target == null) {
      rows.push([label, `C${c.combo}`, String(eq), '-', '-', '-', 'no target', String(displayed)]);
      continue;
    }
    const diff = eq - c.target;
    const pct = (diff / c.target) * 100;
    const ok = Math.abs(pct) <= tolerancePct;
    if (!ok) failures++;
    gatedErrors.push(Math.abs(pct));
    rows.push([label, `C${c.combo}`, String(eq), String(c.target), (diff >= 0 ? '+' : '') + diff, (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%', ok ? 'ok' : 'FAIL', String(displayed)]);
  }

  const header = ['Model (variant)', 'combo', 'Fhoneify eq', 'Cashify target', 'diff ₹', 'diff %', 'status', 'displayed'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((v, i) => (i === 0 ? v.padEnd(widths[i]) : v.padStart(widths[i]))).join('  ');
  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  rows.forEach((r) => console.log(line(r)));
  const max = gatedErrors.length ? Math.max(...gatedErrors) : NaN;
  const mean = gatedErrors.length ? gatedErrors.reduce((a, b) => a + b, 0) / gatedErrors.length : NaN;
  console.log(`\npriced ${gatedErrors.length} gated cases; max |err| ${max.toFixed(2)}%, mean |err| ${mean.toFixed(2)}%; tolerance ±${tolerancePct}%; ${failures} failing`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
