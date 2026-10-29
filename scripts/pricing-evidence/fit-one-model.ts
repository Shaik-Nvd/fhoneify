/**
 * Fit one model alone (template priors, no sibling passes) and print its in-sample error; for diagnosing a single model's fit.
 *
 *   npx tsx scripts/pricing-evidence/fit-one-model.ts "iPhone XS Max"
 */
import { hasUnknownInput, loadMeasurements, modelSemantics, toDiagnostics } from './evidenceLib';
import { fitModel } from './fitCalibration';
import { evaluateAppleEvidence } from '../../lib/pricing/appleCashifyModel/model';

const model = process.argv[2];
const all = loadMeasurements();
const ms = all.filter(m => !hasUnknownInput(m));
const { profile } = fitModel(model, ms, modelSemantics(all));
const errs = ms.filter(m => m.model_key === model && m.base != null).map(m => {
  const o = evaluateAppleEvidence(profile, m.variant_get_upto, toDiagnostics(m, 'none'), m.storage_gb);
  return o.kind === 'PRICE' ? o.price - m.base! : null;
}).filter((e): e is number => e != null);
const abs = errs.map(Math.abs);
console.log(model, 'n', abs.length, 'MAE', Math.round(abs.reduce((a, b) => a + b, 0) / abs.length), 'within20', abs.filter(e => e <= 20).length);
console.log(Object.entries(profile.codes ?? {}).filter(([c]) => ['F03', 'F06', 'F08', 'F17', 'F18'].includes(c)).map(([c, v]) => `${c}=${Math.round(v.kind === 'pct' ? v.value * 10000 : v.value)}${v.kind === 'pct' ? 'bp' : ''}`).join(' '),
  'box', Math.round(profile.boxNo.base), 'charger', Math.round(profile.chargerNo?.base ?? -1));
