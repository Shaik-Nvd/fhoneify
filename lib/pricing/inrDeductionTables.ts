/**
 * Fixed-₹ condition tables for the Xiaomi / Redmi / POCO engine
 * (lib/pricing/inrDeductions.ts).
 *
 * Every ₹ value not pinned by Cashify evidence is the existing percentage
 * rule (GRANULAR_CONDITION_PENALTIES, COMMON_FUNCTIONAL_PENALTIES, the 0.81
 * local-display retention) taken at the group's anchor price, so relative
 * weights between answers stay what they were - no new penalty is invented.
 * Values pinned by evidence override that and cite it.
 */
import { COMMON_BONUSES, COMMON_FUNCTIONAL_PENALTIES, GRANULAR_CONDITION_PENALTIES } from '../pricingCalculator';
import { CASHIFY_CALIBRATION } from './calibration';
import type { InrDeductionConfig, InrGroupTable } from './inrDeductions';

const roundTo10 = (value: number) => Math.round(value / 10) * 10;

/** The percentage rules expressed in ₹ at `anchor` (a typical Get Upto for
 * the group). */
export function tableFromPercentRules(label: string, anchor: number): InrGroupTable {
  const s = GRANULAR_CONDITION_PENALTIES.screen;
  const b = GRANULAR_CONDITION_PENALTIES.body;
  const at = (share: number) => roundTo10(share * anchor);
  const localDisplay = 1 - CASHIFY_CALIBRATION.localDisplay.androidRetention;
  return {
    label,
    // The heaviest screen charge the percentage model could stack on an
    // intact-glass phone: local display + visible lines.
    screenReplacement: at(localDisplay + s.lines),
    screen: {
      localDisplay: at(localDisplay),
      cracked: at(s.cracked),
      chipped: at(s.chipped),
      scratchesHeavy: at(s.scratchesHeavy),
      scratchesLight: at(s.scratchesLight),
      spotsHeavy: at(s.spotsHeavy),
      spotsLight: at(s.spotsLight),
      lines: at(s.lines),
      fadedEdges: at(s.fadedEdges),
      discolorationMajor: at(s.discolorationMajor),
      discolorationMinor: at(s.discolorationMinor),
    },
    body: {
      scratchesHeavy: at(b.scratchesHeavy),
      scratchesLight: at(b.scratchesLight),
      dentsMajor: at(b.dentsMajor),
      dentsMinor: at(b.dentsMinor),
      panelMissing: at(b.panelMissing),
      panelCracked: at(b.panelCracked),
      bent: at(b.bent),
      looseScreen: at(b.looseScreen),
    },
    functional: Object.fromEntries(Object.entries(COMMON_FUNCTIONAL_PENALTIES).map(([fault, share]) => [fault, at(share)])),
    functionalDefault: at(0.1),
    box: COMMON_BONUSES.box,
  };
}

/**
 * PROVISIONAL until calibrated against the owner's 2026-10-01 captures
 * (clean + warranty No per model). `enabled: false` keeps Xiaomi on the
 * percentage model until scripts/calibrate-pricing.ts passes.
 *
 * Built lazily: pricingCalculator.ts imports this module and this module
 * reads pricingCalculator's constants, so nothing may run at import time.
 */
let xiaomiConfig: InrDeductionConfig | null = null;
export function xiaomiInrDeductions(): InrDeductionConfig {
  return (xiaomiConfig ??= buildXiaomiConfig());
}

const buildXiaomiConfig = (): InrDeductionConfig => ({
  version: 'xiaomi-inr/provisional',
  enabled: false,
  groups: {
    budget: tableFromPercentRules('Budget (Get Upto <= ₹15k)', 10000),
    midrange: tableFromPercentRules('Mid-range (₹15k-30k)', 22000),
    upper: tableFromPercentRules('Upper mid-range (₹30k-45k)', 37000),
    flagship: tableFromPercentRules('Flagship (> ₹45k)', 60000),
  },
  modelGroups: {},
  tierGroups: [
    { maxReference: 15000, group: 'budget' },
    { maxReference: 30000, group: 'midrange' },
    { maxReference: 45000, group: 'upper' },
    { maxReference: null, group: 'flagship' },
  ],
  warrantyRetention: {},
  roundTo: 10,
});
