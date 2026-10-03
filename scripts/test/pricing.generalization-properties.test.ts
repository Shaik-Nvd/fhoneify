/**
 * Catalog-wide internal safety properties under every Cashify questionnaire
 * regime. These prove internal consistency only - they are not Cashify parity
 * evidence. Offline: checked-in catalog + reference snapshots, no database.
 *
 *   npm run test:pricing:generalization-properties
 */
import referenceStore from '../../server/data/reference-prices/store.json';
import snapshot from '../../lib/cashify_prices.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { applyCompetitorUplift, type DiagnosticsType } from '../../lib/pricingCalculator';
import { computeFhoneifyGetUpto, materializedSnapshotKey, maxPlausiblePrice, priceDevice, resolveReference } from '../../lib/pricing/engine';
import { pricingFamilyKey } from '../../lib/pricing/families';
import type { QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';

const records = (referenceStore as { records: Record<string, ReferencePriceRecord> }).records;

const REGIMES: Record<string, QuestionnaireSemantics> = {
  UNKNOWN: { warrantyMode: 'UNKNOWN', billMode: 'UNKNOWN', ageMode: 'UNKNOWN' },
  ASKED: { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'ASKED' },
  ASKED_NO_AGE: { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' },
  NOT_ASKED: { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' },
};

const base = (o: Partial<DiagnosticsType> = {}): DiagnosticsType => ({
  calls: true, touch: true, originalScreen: true, defects: [],
  screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  hardware: [], accessories: ['box'], warranty: false, validBill: true, eSim: null, mobileAge: 'above11',
  ...o,
});

// Severity ladders: each step must never price above the previous one.
const LADDERS: Record<string, Partial<DiagnosticsType>[]> = {
  screenScratch: [{}, { defects: ['screen_scratch'], screenCondition: '1-2 scratches on screen' }, { defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' }, { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' }],
  // The relative order of a bezel chip and heavy scratches is not established,
  // so the chip is only checked against clean and a cracked display.
  screenChip: [{}, { defects: ['screen_scratch'], screenCondition: 'Chipped/cracked outside display area' }, { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' }],
  spots: [{}, { defects: ['screen_spot'], screenSpots: '1-2 minor spots on screen' }, { defects: ['screen_spot'], screenSpots: '3 or more minor spots on screen' }, { defects: ['screen_spot'], screenSpots: 'Large/ heavy visible spots on screen' }],
  lines: [{}, { defects: ['screen_spot'], screenLines: 'Display faded along edges' }, { defects: ['screen_spot'], screenLines: 'Visible line(s) on display' }],
  discoloration: [{}, { defects: ['screen_spot'], screenDiscoloration: 'Minor Discoloration' }, { defects: ['screen_spot'], screenDiscoloration: 'Major Discoloration' }],
  bodyScratches: [{}, { defects: ['body_scratch'], bodyScratches: '1-2 scratches' }, { defects: ['body_scratch'], bodyScratches: 'More than 2 scratches' }],
  dents: [{}, { defects: ['body_scratch'], bodyDents: '1-2 minor dents' }, { defects: ['body_scratch'], bodyDents: 'Major dent(s) or more than 2' }],
  panel: [{}, { defects: ['panel_missing'], bodyPanel: 'Cracked/ broken side or back panel' }, { defects: ['panel_missing'], bodyPanel: 'Missing side or back panel' }],
  bent: [{ bodyBent: 'Phone not bent' }, { defects: ['panel_missing'], bodyBent: 'Loose screen (Gap in screen and body)' }, { defects: ['panel_missing'], bodyBent: 'Bent/ curved panel' }],
  display: [{}, { originalScreen: false }],
  touch: [{}, { touch: false }],
  ageInWarranty: [{ warranty: true, mobileAge: 'below3' }, { warranty: true, mobileAge: '3to6' }, { warranty: true, mobileAge: '6to11' }, { warranty: false, mobileAge: 'above11' }],
  bill: [{ warranty: true, mobileAge: 'below3', validBill: true }, { warranty: true, mobileAge: 'below3', validBill: false }],
  billOld: [{ validBill: true }, { validBill: false }],
  box: [{ accessories: ['box'] }, { accessories: [] }],
};

const HARDWARE = ['fingerprint', 'battery_service', 'battery_health', 'front_camera', 'back_camera', 'wifi', 'speaker', 'audio_receiver', 'charging', 'microphone', 'face', 'volume', 'power', 'camera_glass', 'bluetooth', 'silent', 'vibrator', 'proximity'];

// Damage added on top of an already damaged phone must never raise its price.
const ADDITIONS: Partial<DiagnosticsType>[] = [
  { originalScreen: false }, { touch: false },
  { screenCondition: 'More than 2 scratches on screen' }, { screenCondition: 'Screen cracked/ glass broken' },
  { screenLines: 'Visible line(s) on display' }, { bodyScratches: 'More than 2 scratches' }, { bodyDents: 'Major dent(s) or more than 2' },
  { bodyPanel: 'Missing side or back panel' }, { bodyBent: 'Bent/ curved panel' }, { hardware: ['speaker'] }, { hardware: ['back_camera'] },
  { calls: false },
];
const merge = (a: Partial<DiagnosticsType>, b: Partial<DiagnosticsType>): Partial<DiagnosticsType> => ({
  ...a, ...b,
  defects: [...new Set([...(a.defects ?? []), ...(b.defects ?? [])])],
  hardware: [...new Set([...(a.hardware ?? []), ...(b.hardware ?? [])])],
});
const DAMAGED_STARTS: Partial<DiagnosticsType>[] = [
  {}, { screenCondition: '1-2 scratches on screen' }, { bodyScratches: '1-2 scratches' }, { hardware: ['battery_health'] },
  { originalScreen: false, bodyScratches: 'More than 2 scratches' }, { touch: false, hardware: ['wifi'] },
  { screenCondition: 'Screen cracked/ glass broken', bodyDents: 'Major dent(s) or more than 2', hardware: ['speaker', 'back_camera'] },
];

type Failure = { invariant: string; device: string; regime: string; detail: string };
const failures: Failure[] = [];
const invariantCounts = new Map<string, number>();
const check = (invariant: string, ok: boolean, device: string, regime: string, detail: () => string) => {
  invariantCounts.set(invariant, (invariantCounts.get(invariant) ?? 0) + 1);
  if (!ok) failures.push({ invariant, device, regime, detail: detail() });
};

const upliftIndependent = (reference: number, eq: number) => {
  const tier = reference <= 20000 ? 0.08 : reference <= 50000 ? 0.06 : 0.04;
  return Math.max(Math.round(eq + Math.min(eq * tier, 2000)), 100);
};

let devices = 0;
let pendingDevices = 0;
let quotes = 0;
const families = new Set<string>();

for (const device of SEED_DEVICES as any[]) {
  if (!device.brand || !device.model || !device.storage) continue;
  const name = `${device.brand} | ${device.model} | ${device.storage}`;
  const ref = resolveReference({ device, repositoryRecord: records[deviceKey(device)] ?? null, snapshot: snapshot as Record<string, number>, now: new Date('2026-09-24T12:00:00+05:30') });
  if (device.referencePriceStatus === 'pending') {
    pendingDevices++;
    check('pending catalog entries stay unpriced', !ref && device.basePrice === undefined &&
      (snapshot as Record<string, number>)[materializedSnapshotKey(device.model, device.storage)] === undefined,
      name, '-', () => 'pending entry acquired an unverified reference or base price');
    continue;
  }
  if (!ref) { failures.push({ invariant: 'catalog entry resolves to a reference', device: name, regime: '-', detail: 'no reference, snapshot or basePrice' }); continue; }
  devices++;
  families.add(pricingFamilyKey(device.brand, device.model));
  const reference = ref.cashifyGetUptoReference;

  check('Get Upto = reference + capped 8/6/4% uplift, no deductions', computeFhoneifyGetUpto(reference) === upliftIndependent(reference, reference), name, '-', () => `${computeFhoneifyGetUpto(reference)}`);

  for (const [regimeName, semantics] of Object.entries(REGIMES)) {
    const price = (o: Partial<DiagnosticsType>) => {
      quotes++;
      try {
        const { cashifyConditionEquivalent: eq, fhoneifyPrice: fp } = priceDevice(device.brand, device.model, reference, base(o), semantics);
        check('finite non-negative integer prices', Number.isInteger(eq) && eq >= 0 && Number.isInteger(fp) && fp >= 100, name, regimeName, () => `${eq}/${fp}`);
        check('uplift unchanged (final = equivalent + capped 8/6/4%)', fp === applyCompetitorUplift(reference, eq) && fp === upliftIndependent(reference, eq), name, regimeName, () => `${fp}`);
        check('never above the methodology ceiling', fp <= maxPlausiblePrice(reference), name, regimeName, () => `${fp}`);
        return eq;
      } catch (err: any) {
        failures.push({ invariant: 'priceDevice never throws for UI-shaped answers', device: name, regime: regimeName, detail: `${JSON.stringify(o)}: ${err.message}` });
        return NaN;
      }
    };

    for (const [ladder, steps] of Object.entries(LADDERS)) {
      const values = steps.map(price);
      for (let i = 1; i < values.length; i++) {
        check(`severity ladder: ${ladder}`, values[i] <= values[i - 1], name, regimeName, () => `${JSON.stringify(steps[i])}: ${values[i]} > ${values[i - 1]}`);
      }
    }

    const clean = price({});
    for (const hw of HARDWARE) {
      const one = price({ hardware: [hw] });
      check('a functional fault never raises the price', one <= clean, name, regimeName, () => `${hw}: ${one} > ${clean}`);
      const two = price({ hardware: [hw, 'speaker'] });
      check('a second functional fault never raises the price', two <= one, name, regimeName, () => `${hw}+speaker: ${two} > ${one}`);
    }

    for (const start of DAMAGED_STARTS) {
      const before = price(start);
      for (const add of ADDITIONS) {
        // Replacing an already-given single-choice answer is a different
        // (possibly lighter) answer, not damage "added to" it.
        if (Object.keys(add).some((k) => k !== 'hardware' && (start as any)[k] !== undefined)) continue;
        const after = price(merge(start, add));
        check(add.calls === false ? 'no-calls (fixed scrap price) never beats the same phone with calls working' : 'adding damage never raises the price', after <= before, name, regimeName, () => `${JSON.stringify(start)} + ${JSON.stringify(add)}: ${after} > ${before}`);
      }
    }

    const severe = price({ screenCondition: 'Screen cracked/ glass broken', bodyDents: 'Major dent(s) or more than 2', bodyPanel: 'Missing side or back panel', hardware: ['speaker', 'back_camera', 'wifi'], accessories: [] });
    const light = price({ screenCondition: '1-2 scratches on screen', bodyScratches: '1-2 scratches' });
    check('severe damage never beats light damage', severe <= light, name, regimeName, () => `${severe} > ${light}`);

    if (semantics.warrantyMode === 'NOT_ASKED') {
      const variants = [{ warranty: true, mobileAge: 'below3', validBill: true }, { warranty: false, mobileAge: 'above11', validBill: false }, { warranty: null, mobileAge: null, validBill: null }].map((v) => price(v as any));
      check('NOT_ASKED: warranty/age/bill answers cannot move the price', variants.every((v) => v === variants[0]), name, regimeName, () => variants.join(' / '));
    } else {
      const young = price({ warranty: true, mobileAge: 'below3', validBill: true });
      const old = price({ warranty: false, mobileAge: 'above11', validBill: true });
      check('ASKED/UNKNOWN: out of warranty never beats in warranty', old <= young, name, regimeName, () => `${old} > ${young}`);
      const noBill = price({ warranty: true, mobileAge: 'below3', validBill: false });
      const missingBill = price({ warranty: true, mobileAge: 'below3', validBill: null });
      check('ASKED/UNKNOWN: a missing bill answer is not priced as "No"', noBill >= young || missingBill > noBill, name, regimeName, () => `missing ${missingBill}, no ${noBill}, yes ${young}`);
      const missingWarranty = price({ warranty: null, mobileAge: null, validBill: true });
      check('ASKED/UNKNOWN: a missing warranty answer is not priced as "No"', missingWarranty >= old, name, regimeName, () => `${missingWarranty} < ${old}`);
      const oldNoBill = price({ warranty: false, mobileAge: 'above11', validBill: false });
      check('no bill never pays more than a valid bill (out of warranty)', oldNoBill <= old, name, regimeName, () => `${oldNoBill} > ${old}`);
    }
  }
}

// The flat no-calls scrap price is a deliberate, still-unvalidated policy
// (docs/PRICING_CONDITION_ENGINE.md, EXTERNAL VALIDATION REQUIRED): reported,
// not failing, until Cashify evidence decides it.
const KNOWN_POLICY = /^no-calls/;
const blocking = failures.filter((f) => !KNOWN_POLICY.test(f.invariant));
const byInvariant = new Map<string, Failure[]>();
for (const f of failures) byInvariant.set(f.invariant, [...(byInvariant.get(f.invariant) ?? []), f]);
console.log(JSON.stringify({
  devicesTested: devices,
  familiesTested: families.size,
  regimes: Object.keys(REGIMES),
  quotesTested: quotes,
  invariants: Object.fromEntries([...invariantCounts.entries()].map(([k, n]) => [k, { checks: n, failures: byInvariant.get(k)?.length ?? 0 }])),
  blockingFailures: blocking.length,
  knownPolicyReports: failures.length - blocking.length,
  failureSummary: [...byInvariant.entries()].map(([invariant, list]) => ({ invariant, count: list.length, devices: new Set(list.map((f) => f.device)).size, examples: list.slice(0, 3) })),
}, null, 2));

if (blocking.length) {
  console.log(`\nFAIL: ${blocking.length} blocking property failure(s)`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS: ${devices} priced devices, ${pendingDevices} verified unpriced pending entries, ${quotes} quotes, ${families.size} families, ${invariantCounts.size} invariants (${failures.length - blocking.length} known-policy no-calls reports)`);
}
