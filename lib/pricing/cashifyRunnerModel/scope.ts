/** Questionnaire metadata only. Browser code never imports repair parameters. */
import scopes from './scope.json';
interface Scope { hasAge: boolean; variants: Record<string, { accessories: string[] }> }
const key = (model: string) => String(model ?? '').toLowerCase().replace(/cmf by nothing/g, 'cmf').replace(/nothing\s+/g, '').replace(/[^a-z0-9]/g, '');
export function runnerScope(model: string, _storage?: string | null): Scope | null { return (scopes as Record<string, Scope>)[key(model)] ?? null; }
export function runnerAsksAge(model: string) { return runnerScope(model)?.hasAge ?? false; }
export function runnerOffersCharger(model: string, storage?: string | null) {
  const profile = runnerScope(model); if (!profile) return false;
  const variant = profile.variants[String(storage ?? '').toLowerCase().replace(/\s/g, '')];
  return variant ? variant.accessories.includes('charger') : Object.values(profile.variants).every(v => v.accessories.includes('charger'));
}
