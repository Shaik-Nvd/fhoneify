/** Questionnaire metadata only. Browser code never imports repair parameters. */
import scopes from './scope.json';
import type { DiagnosticsType } from '../../pricingCalculator';
interface Scope { hasAge: boolean; variants: Record<string, { accessories: string[] }>; hardware?:string[] }
const key = (model: string) => String(model ?? '').toLowerCase().replace(/cmf by nothing/g, 'cmf').replace(/nothing\s+/g, '').replace(/[^a-z0-9]/g, '');
export function runnerScope(model: string, _storage?: string | null): Scope | null { return (scopes as Record<string, Scope>)[key(model)] ?? null; }
export function runnerAsksAge(model: string) { return runnerScope(model)?.hasAge ?? false; }
export function runnerSupportsHardware(model:string,code:string) { return runnerScope(model)?.hardware?.includes(code)??false; }
/** Questionnaire branch metadata only; no browser pricing execution. */
export function runnerSkipsAge(d:Pick<DiagnosticsType,'calls'|'touch'|'originalScreen'|'warranty'|'validBill'|'screenCondition'|'bodyPanel'|'bodyBent'>) {
  const label=(s:string|null)=>String(s??'').toLowerCase().trim();
  return d.calls===false||d.touch===false||d.originalScreen===false||d.warranty===false||d.validBill===false||
    label(d.screenCondition).startsWith('screen cracked')||/^(?:cracked|missing)/.test(label(d.bodyPanel))||label(d.bodyBent).startsWith('bent/');
}
export function runnerOffersCharger(model: string, storage?: string | null) {
  return runnerOffersAccessory(model,storage,'charger');
}
export function runnerOffersAccessory(model: string, storage: string | null | undefined, accessory: string) {
  const profile = runnerScope(model); if (!profile) return false;
  const variant = profile.variants[String(storage ?? '').toLowerCase().replace(/\s/g, '')];
  return variant ? variant.accessories.includes(accessory) : Object.values(profile.variants).every(v => v.accessories.includes(accessory));
}
