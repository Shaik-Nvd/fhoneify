import nothing from './calibration.nothing.json';
import oneplus from './calibration.oneplus.json';
import { evaluateRunner, modelKey, storageKey, type RunnerCalibration } from './model';
import type { DiagnosticsType } from '../../pricingCalculator';

const calibrations = [nothing, oneplus] as RunnerCalibration[];
export function runnerScope(model: string, _storage?: string | null) {
  return calibrations.map(c => c.profiles[modelKey(model)]).find(Boolean) ?? null;
}
export function runnerAsksAge(model: string) { return runnerScope(model)?.hasAge ?? false; }
export function runnerOffersCharger(model: string, storage?: string | null) {
  const profile = runnerScope(model);
  if (!profile) return false;
  const variant = profile.variants[storageKey(storage)];
  return variant ? variant.accessories.includes('charger') : Object.values(profile.variants).every(v => v.accessories.includes('charger'));
}
export function runnerQuote(model: string, storage: string | null | undefined, reference: number, diagnostics: DiagnosticsType) {
  const profile = runnerScope(model, storage);
  return profile ? evaluateRunner(profile, reference, diagnostics, storage) : null;
}
