import assert from 'node:assert/strict';
import { genericQuote } from '../../lib/pricing/cashifyRunnerModel/generic';
import { priceDevice } from '../../lib/pricing/engine';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';

const newer = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'ASKED' } as any;
const older = { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' } as any;
const base = { ...clean, accessories: ['box', 'charger'], warranty: true, validBill: true, mobileAge: 'below3' } as any;
const R = 20000;
const q = (d: object, sem = newer, ref = R) => genericQuote('Vivo V30', '8 GB/128 GB', ref, { ...base, ...d }, sem).price;

// A perfect phone is the reference; every deduction comes from Cashify's cross-brand share curves.
assert.equal(q({}), R);
assert.equal(q({}, older), R);
// Regime-specific percentages measured on every Android brand.
assert.ok(Math.abs((R - q({ hardware: ['wifi'] })) / R - 0.30) < 0.02, 'newer Wi-Fi about 30%');
assert.ok(Math.abs((R - q({ hardware: ['wifi'] }, older)) / R - 0.40) < 0.02, 'older Wi-Fi about 40%');
// Deductions scale with the reference rather than staying fixed.
assert.ok(Math.abs((40000 - q({ hardware: ['wifi'] }, newer, 40000)) - 2 * (R - q({ hardware: ['wifi'] }))) <= 20);
// Age brackets: each priced, older never pays more; above 11 = warranty No.
const ages = ['below3', '3to6', '6to11', 'above11'].map(a => q({ mobileAge: a }));
assert.ok(ages[0] > ages[1] && ages[1] > ages[2] && ages[2] > ages[3], JSON.stringify(ages));
assert.equal(q({ warranty: false, mobileAge: null }), ages[3]);
// Cracked glass forces the age deduction, as on Cashify.
assert.ok(q({ screenCondition: 'Screen cracked/ glass broken', defects: ['screen_scratch'] }) < q({ screenCondition: 'More than 2 scratches on screen', defects: ['screen_scratch'] }));
// Screen faults count once; independent faults add.
const glass = R - q({ screenCondition: 'More than 2 scratches on screen', defects: ['screen_scratch'] });
const lines = R - q({ screenSpots: 'No spots on screen', screenLines: 'Visible line(s) on display', screenDiscoloration: 'No Discoloration', defects: ['screen_spot'] });
const both = R - q({ screenCondition: 'More than 2 scratches on screen', screenSpots: 'No spots on screen', screenLines: 'Visible line(s) on display', screenDiscoloration: 'No Discoloration', defects: ['screen_scratch', 'screen_spot'] });
assert.equal(both, Math.max(glass, lines));
const cam = R - q({ hardware: ['back_camera'] }), wifi = R - q({ hardware: ['wifi'] });
assert.ok(Math.abs((R - q({ hardware: ['back_camera', 'wifi'] })) - (cam + wifi)) <= 10);
// Unknown regime: priced both ways, the lower is paid.
assert.equal(q({ hardware: ['wifi'] }, { warrantyMode: 'UNKNOWN', billMode: 'UNKNOWN', ageMode: 'UNKNOWN' }), Math.min(q({ hardware: ['wifi'] }), q({ hardware: ['wifi'] }, older)));
// Missing answers fail closed (manual inspection), never a flawless quote.
assert.throws(() => q({ calls: null }), /manual inspection/i);
assert.throws(() => q({ warranty: null }), /manual inspection/i);

// Routing: unmeasured Android phones use the generic rules; measured phones and iPhones do not.
assert.equal(runnerScope('Vivo V30'), null);
assert.equal(priceDevice('Vivo', 'Vivo V30', R, { ...base, hardware: ['wifi'] }, newer, '8 GB/128 GB').cashifyConditionEquivalent, q({ hardware: ['wifi'] }));
assert.equal(priceDevice('Realme', 'Realme P4 5G', R, base, newer, '8 GB/128 GB').cashifyConditionEquivalent, R);
assert.ok(runnerScope('OPPO Reno12 Pro 5G'));
console.log('PASS generic Android rules: reference-scaled shares per regime, age brackets, combinations, fail-closed answers and routing');
