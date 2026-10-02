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

/** The percentage rules expressed in ₹ at repair-cost anchor `anchor`.
 * `touchRetention` is the brand's failed-touch retention (Xiaomi 0.4). */
export function tableFromPercentRules(label: string, anchor: number, touchRetention = 0.4): InrGroupTable {
  const s = GRANULAR_CONDITION_PENALTIES.screen;
  const b = GRANULAR_CONDITION_PENALTIES.body;
  const at = (share: number) => roundTo10(share * anchor);
  return {
    label,
    touchFailure: at(1 - touchRetention),
    screen: {
      localDisplay: at(1 - CASHIFY_CALIBRATION.localDisplay.androidRetention),
      localDisplayNotAsked: at(1 - CASHIFY_CALIBRATION.localDisplay.notAskedAndroidRetention),
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
    functionalCap: anchor,
    box: COMMON_BONUSES.box,
  };
}

/**
 * Calibrated 2026-10-01 against the Cashify benchmark
 * (scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json; fit with
 * scripts/pricing/fit-inr-tables.ts, checked with npm run pricing:calibrate).
 *
 * Each group is the old percentage rules taken at a repair-cost anchor A
 * instead of at the phone's age-adjusted price. On all nine models Cashify's
 * two condition deductions keep the old rules' ratio (0.25 A : 0.49 A,
 * observed 0.47-0.54), while A itself does not follow price: the four
 * current flagships share one anchor from ₹37k to ₹75k Get Upto.
 *
 * Only models listed in modelGroups use fixed-₹ deductions; every other
 * Xiaomi / Redmi / POCO model keeps the percentage model (no tier fallback)
 * until Cashify evidence covers it. A group serves every storage variant of
 * its models - repair cost does not depend on storage.
 *
 * Built lazily: pricingCalculator.ts imports this module and this module
 * reads pricingCalculator's constants, so nothing may run at import time.
 */
let xiaomiConfig: InrDeductionConfig | null = null;
export function xiaomiInrDeductions(): InrDeductionConfig {
  return (xiaomiConfig ??= buildXiaomiConfig());
}

/**
 * Redmi Note 10 Pro Max 6/128 (AMOLED). Verified Cashify quotes 2026-10-02
 * (scripts/pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json,
 * FM037, Get Upto ₹5,970, warranty NOT_ASKED, stable closing control):
 * clean ₹5,950, visible lines ₹2,890, heavy spots ₹2,890 - both display
 * faults cost ₹3,060, about half the phone. The percentage model took ~₹1.8k
 * and overpaid 58-68%. The anchor is fitted so lines = 0.30 A = ₹3,060; heavy
 * spots are pinned to the same observed ₹3,060.
 */
function redmiNote10ProMaxTable(): InrGroupTable {
  const table = tableFromPercentRules('Xiaomi Redmi Note 10 Pro Max', 10200);
  return { ...table, screen: { ...table.screen, lines: 3060, spotsHeavy: 3060 } };
}

const buildXiaomiConfig = (): InrDeductionConfig => ({
  version: 'xiaomi-inr/2026-10-02-note10pm-display',
  enabled: true,
  groups: {
    // One anchor for four models, 8 benchmark cases, all within ±1.8%.
    'xiaomi-flagship': tableFromPercentRules('Xiaomi 15 / 15 Ultra / 17 / 17 Ultra', 33040),
    // Single-model groups: each anchor is fitted from that model's own two
    // cases (one degree of freedom left per model). Adding 14 Ultra to the
    // flagship group puts it at -3.9%; 14 + 17T together put 17T at +4.9%.
    'xiaomi-14-ultra': tableFromPercentRules('Xiaomi 14 Ultra', 31260),
    'xiaomi-17t': tableFromPercentRules('Xiaomi 17T', 28810),
    'xiaomi-14': tableFromPercentRules('Xiaomi 14', 27000),
    'redmi-turbo-5': tableFromPercentRules('Xiaomi Redmi Turbo 5', 15350),
    // Low anchor: Cashify deducts only ₹1.5k between the two combos here.
    // Its Get Upto (₹28,100) is from 2026-09-20 and the Note out-of-warranty
    // retention (0.74) is unmeasured - recheck both first if this drifts.
    'redmi-note-15-pro-plus': tableFromPercentRules('Xiaomi Redmi Note 15 Pro Plus 5G', 6610),
    'redmi-note-10-pro-max': redmiNote10ProMaxTable(),
  },
  modelGroups: {
    'xiaomi 15': 'xiaomi-flagship',
    'xiaomi 15 ultra': 'xiaomi-flagship',
    'xiaomi 17': 'xiaomi-flagship',
    'xiaomi 17 ultra': 'xiaomi-flagship',
    'xiaomi 14 ultra': 'xiaomi-14-ultra',
    'xiaomi 17t': 'xiaomi-17t',
    'xiaomi 14': 'xiaomi-14',
    'xiaomi redmi turbo 5': 'redmi-turbo-5',
    'xiaomi redmi note 15 pro plus 5g': 'redmi-note-15-pro-plus',
    'xiaomi redmi note 10 pro max': 'redmi-note-10-pro-max',
  },
  tierGroups: [],
  // Clean, warranty No, bill, box (owner captures 2026-10-01):
  // Xiaomi 14 ₹21,380 on ₹27,400; 14 Ultra ₹29,330 on ₹37,980.
  warrantyRetention: {
    'xiaomi 14': 0.7664,
    'xiaomi 14 ultra': 0.7622,
  },
  // Mean of the two measurements above, for listed non-Note models without
  // their own capture (0.764 fits the benchmark better than the old 0.75).
  defaultWarrantyRetention: 0.764,
  roundTo: 10,
});
