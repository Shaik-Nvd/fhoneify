import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { SEED_DEVICES } from '../../lib/seed_devices';

const missing = [
  ['OnePlus 13s', '16 GB/512 GB'],
  ['OnePlus N6', '4 GB/128 GB'], ['OnePlus N6', '6 GB/128 GB'],
  ['OnePlus N6 Lite', '4 GB/64 GB'], ['OnePlus N6x', '4 GB/64 GB'],
  ['OnePlus Nord CE 6 5G', '8 GB/128 GB'], ['OnePlus Nord CE 6 5G', '8 GB/256 GB'],
  ['OnePlus Nord CE 6 Lite 5G', '6 GB/128 GB'],
  ['OnePlus Nord CE 6 Lite 5G', '8 GB/128 GB'], ['OnePlus Nord CE 6 Lite 5G', '8 GB/256 GB'],
];
const devices = SEED_DEVICES.filter(d => d.brand === 'OnePlus');
assert.equal(devices.length, 116);
for (const [model, storage] of missing) {
  const found = devices.filter(d => d.model === model && d.storage === storage);
  assert.equal(found.length, 1, `${model} ${storage} must be unique`);
  assert.equal(found[0].referencePriceStatus, 'pending');
  assert.equal(found[0].basePrice, undefined);
  assert.ok(found[0].cashifyLink.startsWith('https://www.cashify.in/sell-old-mobile-phone/used-oneplus-'));
}
const uncovered = devices.find(d => d.model === 'OnePlus 9RT 5G' && d.storage === '12 GB/256 GB');
assert.equal(uncovered?.id, 'oneplus_7046');
assert.equal(uncovered?.basePrice, 11490);
const source = readFileSync(new URL('../../app/quote/page.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('quote.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'getFunctionalProblems') expression = node.initializer;
  ts.forEachChild(node, visit);
}
visit(parsed);
assert.ok(expression, 'real UI functional-option builder must exist');
const js = ts.transpileModule(`var options = ${expression.getText(parsed)};`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { React: { createElement: () => null }, FaceIdIcon: () => null, options: undefined as unknown };
vm.runInNewContext(js, context);
const options = context.options as (brand: string, model: string) => Array<{ id: string }>;
for (const model of ['Oneplus Open', 'OnePlus Open']) {
  const ids = options('OnePlus', model).map(o => o.id);
  assert.ok(ids.includes('outer_screen'));
  assert.ok(ids.includes('hinge'));
}
for (const [brand, model] of [['OnePlus', 'OnePlus 13'], ['Samsung', 'Samsung Galaxy Z Fold 6']]) {
  assert.ok(!options(brand, model).some(o => o.id === 'outer_screen'));
}
console.log('OnePlus catalog and Open UI regressions passed');
