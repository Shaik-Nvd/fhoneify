import assert from 'node:assert/strict';
import { evaluateRunner, evaluateDeduction, type RunnerProfile } from '../../lib/pricing/cashifyRunnerModel/model';
import {runnerScope} from '../../lib/pricing/cashifyRunnerModel';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { InspectionRequiredError } from '../../lib/pricing/inspectionRequired';
const fixed=(value:number)=>({form:'fixed' as const,value,support:2,residual:0});
const profile:RunnerProfile={brand:'Samsung',model:'Synthetic Samsung',hasAge:false,
  variants:{'8gb/128gb':{accessories:['box','charger','spen'],scrap:800,conditionFloor:0}},
  rules:{'spots:1':fixed(9600),'lines:1':fixed(1000),'screen-combination:color:0+lines:1':fixed(1800),
    'hardware:face':fixed(0),box:fixed(500),charger:fixed(400),spen:fixed(700),both:fixed(1300)},noOffer:{'color:0':['8gb/128gb']}};
const quote=(edit:object)=>evaluateRunner(profile,10000,{...clean,...edit},'8 GB/128 GB');
assert.equal(quote({screenSpots:'3 or more minor spots on screen'}).price,400,'condition quote may be below calls-only scrap');
assert.equal(quote({calls:false}).price,800,'calls retains its own measured scrap');
assert.throws(()=>quote({screenDiscoloration:'Major Discoloration'}),InspectionRequiredError);
assert.equal(quote({screenDiscoloration:'Major Discoloration',screenLines:'Display faded along edges'}).price,8200,'measured display-group repair overrides individual no-offer');
assert.equal(quote({accessories:[]}).price,8700,'all three missing uses measured value');
assert.equal(quote({accessories:['spen']}).price,9500,'two of three missing stays inferred, not measured all-missing');
assert.equal(quote({accessories:['spen']}).support,'inferred','partial accessory combination has no joint measurement');
const partial=quote({accessories:['spen']});
assert.equal(partial.breakdown.reduce((sum,row)=>sum+row.amount,0),10000-partial.price,'accessory overlap credit reconciles the breakdown');
assert.equal(quote({hardware:['face']}).price,10000,'measured face-zero remains zero');
for(const model of ['Samsung Galaxy A35 5G','Google Pixel 11']) {
  const measured=runnerScope(model)!;const wifi=measured.rules['hardware:wifi'],camera=measured.rules['hardware:front_camera'];
  assert.equal(wifi.form,'pct');assert.equal(camera.form,'fixed');
  for(const multiplier of [.9,1.1]) {
    const moved=20000*multiplier;
    assert.equal(evaluateDeduction(wifi,moved,''),wifi.value*moved,`${model} percentage follows current reference`);
    assert.equal(evaluateDeduction(camera,moved,''),camera.value,`${model} camera repair stays fixed`);
  }
}
console.log('PASS Samsung no-offer, measured display group, independent condition floor, S Pen and zero face');
