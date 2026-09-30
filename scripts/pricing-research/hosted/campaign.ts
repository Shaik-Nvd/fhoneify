/**
 * Hosted campaign queue: a deterministic FILTER + ORDER of Claude's committed
 * cashify-design/2 plan. It never regenerates the sample, never edits answer
 * vectors, and never includes held-out VALIDATION devices. Blocks are kept
 * whole so every deduction keeps its own opening/closing baselines.
 */
import crypto from 'node:crypto';
import type { Plan } from '../../research-design/plan';
import type { PlannedBlock, PlannedDevice, PlannedExperiment } from '../../research-design/design';
import { createCashifyUrlResolver, loadCashifyUrlDictionary } from '../../../lib/referencePricing/sources/cashifyUrlResolver';
import { materializedSnapshotKey } from '../../../lib/pricing/engine';

export const CAMPAIGN_ID = 'cashify-hosted-2026-10';
export const GLOBAL_CAP = 1500;
export const STAGE_CAPS: Record<1 | 2 | 3, number> = { 1: 100, 2: 500, 3: 1500 };

/** Owner priority. Redmi/Mi/POCO are catalogued under brand "Xiaomi" or "POCO"; classify by model name. */
export type PriorityGroup = 'apple' | 'samsung' | 'oneplus' | 'xiaomi_mi' | 'redmi';
export const GROUP_ORDER: PriorityGroup[] = ['apple', 'samsung', 'oneplus', 'xiaomi_mi', 'redmi'];

export function priorityGroup(device: { brand: string; model: string }): PriorityGroup | null {
  const brand = device.brand.trim().toLowerCase();
  const model = device.model.trim().toLowerCase();
  if (brand === 'apple') return 'apple';
  if (brand === 'samsung') return 'samsung';
  if (brand === 'oneplus') return 'oneplus';
  if (brand === 'redmi') return 'redmi';
  if (brand === 'xiaomi' || brand === 'mi') {
    if (/\bredmi\b/.test(model)) return 'redmi';
    if (/\bpoco\b/.test(model)) return null; // POCO is deliberately not prioritised
    return 'xiaomi_mi';
  }
  return null;
}

/**
 * Stage 1 verifies hosted collection on four brands and four price bands with
 * complete 25-experiment core blocks (exactly 100 attempts). Chosen from
 * training devices whose Cashify page the weekly refresh verified as fresh/exact.
 */
export const STAGE1_BLOCKS = [
  '167obut:blk1', // Apple iPhone 14 256GB, CORE, B4
  '0abbfp9:blk1', // Samsung Galaxy S25 Edge 12/256, CORE, B5
  '0zt9sxs:blk1', // OnePlus 9 5G 8/128, CORE, B2
  '0xhkdbp:blk1', // Xiaomi Mi A2 4/64, CORE, B1
];

export interface QueueEntry {
  seq: number;
  blockId: string;
  deviceKey: string;
  group: PriorityGroup;
  role: 'ANCHOR' | 'CORE';
  brand: string;
  model: string;
  ram: string | null;
  storage: string;
  priceBand: string;
  getUptoOffline: number | null;
  cashifyUrl: string;
  urlTier: 'catalog' | 'dictionary' | 'generated';
  referenceVerifiedAt: string | null;
  experimentIds: string[];
  attempts: number;
  /** sha256 of the block's canonical planned experiments; the runner refuses a drifted plan. */
  experimentsSha256: string;
}

export interface CampaignQueue {
  campaignId: string;
  planVersion: string;
  globalCap: number;
  stageCaps: typeof STAGE_CAPS;
  stage1Blocks: string[];
  entries: QueueEntry[];
}

export function canonicalBlockHash(experiments: PlannedExperiment[]): string {
  const canonical = experiments.map((e) => ({
    experimentId: e.experimentId, blockId: e.blockId, deviceKey: e.deviceKey, order: e.order, kinds: e.kinds,
    changes: e.changes, forceCheckboxes: e.forceCheckboxes, baselineExperimentId: e.baselineExperimentId,
    referenceExperimentIds: e.referenceExperimentIds, requiresRuntimeConfirmation: e.requiresRuntimeConfirmation,
    answers: Object.keys(e.answers).sort().map((k) => [k, e.answers[k]]),
  }));
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function blockExperiments(plan: Plan, block: PlannedBlock): PlannedExperiment[] {
  const byId = new Map(plan.experiments.map((e) => [e.experimentId, e]));
  const experiments = block.experimentIds.map((id) => byId.get(id));
  if (experiments.some((e) => !e || e.blockId !== block.blockId)) throw new Error(`block ${block.blockId} references a missing experiment`);
  const sorted = (experiments as PlannedExperiment[]).slice().sort((a, b) => a.order - b.order);
  if (!sorted[0].kinds.includes('BASELINE_OPEN') || !sorted[sorted.length - 1].kinds.includes('BASELINE_CLOSE')) {
    throw new Error(`block ${block.blockId} is not bracketed by opening and closing baselines`);
  }
  return sorted;
}

/** Spread a group's devices over price bands: cheapest, dearest, next cheapest, ... */
function spreadByPrice(devices: PlannedDevice[]): PlannedDevice[] {
  const sorted = devices.slice().sort((a, b) =>
    (a.getUpto ?? Number.MAX_SAFE_INTEGER) - (b.getUpto ?? Number.MAX_SAFE_INTEGER) || a.deviceKey.localeCompare(b.deviceKey));
  const priced = sorted.filter((d) => d.getUpto != null);
  const out: PlannedDevice[] = [];
  for (let lo = 0, hi = priced.length - 1; lo <= hi; lo++, hi--) {
    out.push(priced[lo]);
    if (hi !== lo) out.push(priced[hi]);
  }
  return [...out, ...sorted.filter((d) => d.getUpto == null)]; // unpriced last
}

export function buildCampaignQueue(plan: Plan, options: {
  referenceMeta: Record<string, { status?: string; lastVerifiedAt?: string; matchConfidence?: string }>;
  curatedLinks?: Map<string, string>;
  dictionary?: Record<string, string>;
}): CampaignQueue {
  const resolve = createCashifyUrlResolver({ curatedLinks: options.curatedLinks ?? new Map(),
    dictionary: options.dictionary ?? loadCashifyUrlDictionary() });
  const eligible = plan.devices.filter((d) => d.role !== 'VALIDATION' && priorityGroup(d) !== null);
  const blocksByDevice = new Map<string, PlannedBlock[]>();
  for (const block of plan.blocks) {
    if (block.role === 'VALIDATION') continue;
    blocksByDevice.set(block.deviceKey, [...(blocksByDevice.get(block.deviceKey) ?? []), block]);
  }
  const ordered: PlannedBlock[] = [];
  const seen = new Set<string>();
  const push = (block: PlannedBlock) => { if (!seen.has(block.blockId)) { seen.add(block.blockId); ordered.push(block); } };
  const blockById = new Map(plan.blocks.map((b) => [b.blockId, b]));
  for (const id of STAGE1_BLOCKS) {
    const block = blockById.get(id);
    if (!block) throw new Error(`stage-1 block ${id} is not in the plan`);
    push(block);
  }
  // A model's storage-contrast variant is a separate device key; keep it next to its model.
  const modelBlocks = (d: PlannedDevice) => eligible.filter((x) => x.modelKey === d.modelKey)
    .sort((a, b) => (a.variantRole === 'REPRESENTATIVE' ? 0 : 1) - (b.variantRole === 'REPRESENTATIVE' ? 0 : 1))
    .flatMap((x) => (blocksByDevice.get(x.deviceKey) ?? []).slice().sort((a, b) => a.blockId.localeCompare(b.blockId)));
  const representative = (d: PlannedDevice) => d.variantRole === 'REPRESENTATIVE';
  // Depth first: every anchor block of the priority groups, in owner priority order.
  for (const group of GROUP_ORDER) {
    for (const d of spreadByPrice(eligible.filter((x) => x.role === 'ANCHOR' && representative(x) && priorityGroup(x) === group))) {
      modelBlocks(d).forEach(push);
    }
  }
  // Then core models, round-robin across groups so lower-priority brands are not starved.
  const queues = GROUP_ORDER.map((group) =>
    spreadByPrice(eligible.filter((x) => x.role === 'CORE' && representative(x) && priorityGroup(x) === group)));
  while (queues.some((q) => q.length)) for (const q of queues) { const d = q.shift(); if (d) modelBlocks(d).forEach(push); }

  const deviceByKey = new Map(plan.devices.map((d) => [d.deviceKey, d]));
  const entries = ordered.map((block, index): QueueEntry => {
    const device = deviceByKey.get(block.deviceKey);
    const group = device ? priorityGroup(device) : null;
    if (!device || !group || device.role === 'VALIDATION' || block.role === 'VALIDATION') {
      throw new Error(`block ${block.blockId} is not an eligible training block`);
    }
    const experiments = blockExperiments(plan, block);
    if (experiments.some((e) => e.blind || e.role === 'VALIDATION' || e.deviceKey !== device.deviceKey)) {
      throw new Error(`block ${block.blockId} contains held-out or foreign experiments`);
    }
    const url = resolve({ brand: device.brand, model: device.model, storage: device.storage });
    const meta = options.referenceMeta[materializedSnapshotKey(device.model, device.storage)];
    return {
      seq: index + 1, blockId: block.blockId, deviceKey: device.deviceKey, group, role: device.role as 'ANCHOR' | 'CORE',
      brand: device.brand, model: device.model, ram: device.ram, storage: device.storage,
      priceBand: device.strata.priceBand, getUptoOffline: device.getUpto,
      cashifyUrl: device.cashifyLink ?? url.url, urlTier: device.cashifyLink ? 'catalog' : url.tier,
      referenceVerifiedAt: meta?.status === 'fresh' && meta.matchConfidence === 'exact' ? meta.lastVerifiedAt ?? null : null,
      experimentIds: experiments.map((e) => e.experimentId), attempts: experiments.length,
      experimentsSha256: canonicalBlockHash(experiments),
    };
  });
  // Unverified Cashify pages go last: they are the pilot's main source of wasted attempts.
  const verified = entries.filter((e) => e.referenceVerifiedAt || STAGE1_BLOCKS.includes(e.blockId));
  const unverified = entries.filter((e) => !verified.includes(e));
  const final = [...verified, ...unverified].map((e, i) => ({ ...e, seq: i + 1 }));
  const stage1 = final.slice(0, STAGE1_BLOCKS.length);
  if (stage1.some((e, i) => e.blockId !== STAGE1_BLOCKS[i] || !e.referenceVerifiedAt) ||
    stage1.reduce((n, e) => n + e.attempts, 0) > STAGE_CAPS[1] ||
    new Set(stage1.map((e) => e.group)).size < 4) {
    throw new Error('stage-1 blocks must be reference-verified, span four priority groups and fit 100 attempts');
  }
  return { campaignId: CAMPAIGN_ID, planVersion: plan.planVersion, globalCap: GLOBAL_CAP, stageCaps: STAGE_CAPS,
    stage1Blocks: STAGE1_BLOCKS, entries: final };
}

export function queueSha256(queue: CampaignQueue): string {
  return crypto.createHash('sha256').update(JSON.stringify(queue)).digest('hex');
}
