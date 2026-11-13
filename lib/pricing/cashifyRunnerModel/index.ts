import nothing from './calibration.nothing.json';
import oneplus from './calibration.oneplus.json';
import samsung from './calibration.samsung.json';
import google from './calibration.google.json';
import { evaluateRunner, modelKey, storageKey, type RunnerCalibration } from './model';
import type { DiagnosticsType } from '../../pricingCalculator';

const calibrations = [nothing, oneplus, samsung, google] as RunnerCalibration[];
export function runnerScope(model: string, _storage?: string | null) {
  return calibrations.map(c => c.profiles[modelKey(model)]).find(Boolean) ?? null;
}
export function runnerAsksAge(model: string) { return runnerScope(model)?.hasAge ?? false; }
export function runnerOffersCharger(model: string, storage?: string | null) {
  return runnerOffersAccessory(model,storage,'charger');
}
export function runnerOffersAccessory(model: string, storage: string | null | undefined, accessory: string) {
  const profile = runnerScope(model);
  if (!profile) return false;
  const variant = profile.variants[storageKey(storage)];
  return variant ? variant.accessories.includes(accessory) : Object.values(profile.variants).every(v => v.accessories.includes(accessory));
}
export function runnerQuote(model: string, storage: string | null | undefined, reference: number, diagnostics: DiagnosticsType) {
  const profile = runnerScope(model, storage);
  return profile ? evaluateRunner(profile, reference, diagnostics, storage) : null;
}
