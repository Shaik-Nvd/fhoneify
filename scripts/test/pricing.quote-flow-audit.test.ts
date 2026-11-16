import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Guards for the final audit of 16 Nov 2026.
 * 1. Un-ticking a physical defect must withdraw its detail answers: the server prices those fields on
 *    their own, so a leftover "Screen cracked" lowered the price of a phone the customer said was fine.
 * 2. Customer-typed lead text must reach the admin inspection report escaped, and the report renderer
 *    must run without scripts or network.
 * 3. A price check is not a pickup and must not be listed as one in the customer's profile.
 */
const lf = (path: string) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const page = lf('app/quote/page.tsx');

const details = page.slice(page.indexOf('const DEFECT_DETAIL_ANSWERS'), page.indexOf('const emptyDiagnostics'));
const expected: Record<string, string[]> = {
  screen_scratch: ['screenCondition'],
  screen_spot: ['screenSpots', 'screenLines', 'screenDiscoloration'],
  body_scratch: ['bodyScratches', 'bodyDents'],
  panel_missing: ['bodyPanel', 'bodyBent'],
};
for (const [defect, fields] of Object.entries(expected)) {
  const line = details.split('\n').find(l => l.trim().startsWith(`${defect}:`)) ?? '';
  for (const field of fields) assert.ok(line.includes(`'${field}'`), `${defect} withdraws ${field}`);
  // Every detail field the page writes must belong to exactly this map, so a new question cannot be left behind.
}
const written = [...page.matchAll(/setDiagnostics\(\{ \.\.\.diagnostics, (\w+): opt\.id \}\)/g)].map(m => m[1]);
const covered = new Set(Object.values(expected).flat());
for (const field of written) if (/^(screen|body)/.test(field)) assert.ok(covered.has(field), `${field} is withdrawn with its defect`);
const toggle = page.slice(page.indexOf('const toggleArrayItem'), page.indexOf('const getFunctionalProblems'));
assert.match(toggle, /key === 'defects' && arr\.includes\(val\)/, 'withdrawal happens when a defect is un-ticked');
assert.match(toggle, /DEFECT_DETAIL_ANSWERS\[val\]/, 'toggle uses the defect detail map');
assert.match(page, /warranty: true, mobileAge: diagnostics\.warranty === false \? null : diagnostics\.mobileAge/, 'warranty Yes drops the age pre-filled by warranty No');

const admin = lf('server/modules/admin/controller.ts');
const template = admin.slice(admin.indexOf('const htmlContent'), admin.indexOf('const browser = await getBrowser()'));
assert.ok(template.length > 5000, 'report template located');
const raw = [...template.matchAll(/>[^<`]*\$\{((?:lead|answers)\.[^}]*|deviceDisplayName|hw\.label[^}]*|ageMap[^}]*|\[lead[^}]*)\}/g)]
  .map(m => m[1]).filter(expr => !expr.includes('? `')).filter(expr => !/===|!==|\? '/.test(expr) || /lead\.|answers\.\w+ \|\|/.test(expr));
assert.deepEqual(raw, [], `unescaped customer text in the report: ${raw.join(' | ')}`);
assert.ok((template.match(/\$\{esc\(/g) ?? []).length >= 20, 'customer text goes through esc()');
assert.match(admin, /function esc\(value: unknown\): string \{\s*return String\(value \?\? ''\)\.replace\(\/\[&<>"'`\]\/g/, 'esc() escapes markup characters');
assert.match(admin, /newContext\(\{ javaScriptEnabled: false \}\)/, 'report renders with scripts disabled');
assert.match(admin, /context\.route\('\*\*\/\*', \(route: any\) => route\.abort\(\)\)/, 'report renders with network blocked');
assert.match(admin, /finally \{\s*await context\.close\(\)/, 'report page is always released');

const service = lf('server/modules/quote/service.ts');
const pickups = service.slice(service.indexOf('export async function getCustomerPickups'));
assert.match(pickups.slice(0, 1200), /NOT: \{ status: 'price checked' \}/, 'price checks are not listed as pickups');

console.log('PASS quote-flow audit guards: defect withdrawal, report escaping, price checks not pickups');
