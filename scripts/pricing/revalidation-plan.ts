/** Release evidence revalidation plan (run before the 16 Oct 2026 expiry).
 *
 * Freezes the ACTUAL service's predictions for every verified release route:
 * the clean control plus each measured single condition, at the Get Upto you
 * pass in (normally the current production reference from a read-only check).
 * Commit the output BEFORE any Cashify attempt; score observations against it
 * with the acceptance rule in docs/RELEASE_REVALIDATION_PROCEDURE.md.
 * No database, network or Cashify access.
 *
 *   npx tsx scripts/pricing/revalidation-plan.ts --references refs.json [--at ISO] [--out plan.json]
 *   refs.json: { "<deviceKey>": <current Get Upto>, ... }  (missing keys use the calibration Get Upto)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import routeFixture from './fixtures/release-route-evidence-2026-10-02.json';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { RC_ALLOWLIST } from '../../lib/pricing/releaseCandidate';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { workbookStorageIdentity } from '../../lib/pricing/teamWorkbookCandidate';
import { deviceKey } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const refs: Record<string, number> = arg('--references') ? JSON.parse(fs.readFileSync(arg('--references')!, 'utf8')) : {};
// Evaluate as if the evidence were current: the plan is about prices, not about today's expiry.
const at = new Date(arg('--at') ?? '2026-10-03T12:00:00Z');
const routes = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-02.json');
const CLEAN = { calls: true, touch: true, originalScreen: true, defects: [] as string[], screenCondition: null as string | null, screenSpots: null as string | null,
  screenLines: null as string | null, screenDiscoloration: null, bodyScratches: null as string | null, bodyDents: null as string | null, bodyPanel: null, bodyBent: null,
  hardware: [] as string[], accessories: [] as string[], warranty: null as boolean | null, validBill: null as boolean | null, eSim: null, mobileAge: null };
const COMPONENT: Record<string, Partial<typeof CLEAN> & { collector: Record<string, string> }> = {
  screen_heavy: { defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen', collector: { screenCondition: 'scratch_gt2' } },
  glass_cracked: { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken', collector: { screenCondition: 'cracked' } },
  display_lines: { defects: ['screen_spot'], screenLines: 'Visible line(s) on display', collector: { screenLines: 'visible_lines' } },
  display_spots: { defects: ['screen_spot'], screenSpots: 'Large/ heavy visible spots on screen', collector: { screenSpots: 'heavy' } },
  body_heavy: { defects: ['body_scratch'], bodyScratches: 'More than 2 scratches', collector: { bodyScratches: 'scratch_gt2' } },
  body_dents: { defects: ['body_scratch'], bodyDents: 'Major dent(s) or more than 2', collector: { bodyDents: 'major' } },
};

async function main() {
  const cases: any[] = [];
  for (const route of routes) {
    const device = findCatalogDevice(route.brand, route.model, route.brand === 'Apple' ? route.storage.replace(/\s+GB/g, 'GB') : route.storage);
    if (!device) throw new Error(`Catalog missing ${route.model}`);
    const spec = RC_ALLOWLIST.find(s => s.brand === device.brand && s.model === device.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(device.storage));
    const calibration = spec?.validatedGetUpto ?? route.baselineGetUpto ?? null;
    const key = deviceKey(device), reference = refs[key] ?? calibration;
    const components = spec ? ('componentCosts' in spec ? Object.keys(spec.componentCosts) : ['screen_heavy', 'glass_cracked']) : ['body_heavy', 'body_dents'];
    const profiles = new InMemoryQuestionnaireProfileStore();
    profiles.profiles.set(questionnaireModelKey(device), { brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device), ...route.semantics,
      questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'revalidation-plan', observedAt: at.toISOString() });
    const record = { ...device, deviceKey: key, source: 'cashify', currentPrice: reference, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at.toISOString(),
      lastAttemptedAt: at.toISOString(), lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: at.toISOString(), updatedAt: at.toISOString() } as any;
    const service = createPricingService({ repository: { async get() { return record; }, async listAll() { return [record]; }, async upsert() { throw new Error('read only'); },
      async appendHistory() {}, async getHistory() { return []; } }, questionnaireStore: profiles, now: () => at, pricingMode: 'release-candidate',
      releaseRouteEvidence: routes.map(r => r === route ? { ...r, observedAt: at.toISOString() } : r), catalog: [device], snapshot: {},
      signingSecret: 'revalidation-plan-signing-key-not-a-production-secret', tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
      logger: { info() {}, warn() {}, error() {} } });
    const base = { ...CLEAN, accessories: route.chargerMode === 'ASKED' ? ['box', 'charger'] : ['box'],
      warranty: route.semantics.warrantyMode === 'ASKED' ? false : null, validBill: route.semantics.billMode === 'ASKED' ? true : null };
    for (const [label, extra] of [['clean', null], ...components.map(c => [c, COMPONENT[c]] as const)] as const) {
      const { collector, ...diag } = (extra ?? { collector: {} }) as any;
      const r = await service.quote({ ...device, diagnostics: { ...base, ...diag } });
      cases.push({ id: `REVAL_${device.model.replace(/[^A-Za-z0-9]+/g, '')}_${label}`.toUpperCase(), deviceKey: key, brand: device.brand, model: device.model, storage: device.storage,
        route: { ...route.semantics, box: route.boxMode, charger: route.chargerMode, sPen: route.sPenMode, eSim: route.eSimMode },
        condition: label, collectorChanges: collector ?? {}, calibrationGetUpto: calibration, getUpto: reference,
        prediction: r.ok ? r.internal.cashifyConditionEquivalent : null, decision: r.ok ? (r.internal.releaseCandidate?.kind === 'VERIFIED' ? 'CANDIDATE' : 'ACCESSORY') : r.code,
        scoreOnlyIfCapturedGetUptoEquals: reference });
    }
  }
  const body = { version: 'release-revalidation-plan/1', pricingVersion: RELEASE_CANDIDATE_PRICING_VERSION, routeEvidence: routeFixture.version, generatedFor: at.toISOString(),
    acceptance: 'See docs/RELEASE_REVALIDATION_PROCEDURE.md. Clean must equal the prediction; each damaged case within ±3% and never overpay by more than 3%; every route-trace mode must match.',
    cases };
  const text = JSON.stringify(body, null, 2) + '\n';
  const out = arg('--out'); if (out) fs.writeFileSync(out, text);
  console.log(JSON.stringify({ cases: cases.length, unscorable: cases.filter(c => c.prediction == null).map(c => `${c.id}:${c.decision}`),
    sha256: crypto.createHash('sha256').update(text).digest('hex') }, null, 1));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
