import assert from 'node:assert/strict';
import { calculateApplePrice, type DiagnosticsType, applyCompetitorUplift } from '../../lib/pricingCalculator';
import { SEED_DEVICES } from '../../lib/seed_devices';

const clean: DiagnosticsType = { calls:true,touch:true,originalScreen:true,defects:[],hardware:[],accessories:['box','charger'],warranty:false,validBill:true,mobileAge:'above11',eSim:'Single eSIM',screenCondition:null,screenSpots:null,screenLines:null,screenDiscoloration:null,bodyScratches:null,bodyDents:null,bodyPanel:null,bodyBent:null };
const names=new Set(['Apple iPhone X','Apple iPhone XR','Apple iPhone XS','Apple iPhone 11','Apple iPhone 12','Apple iPhone 12 Pro Max','Apple iPhone 13']);
const changes: Partial<DiagnosticsType>[] = [
 {screenCondition:'1-2 scratches on screen'}, {screenCondition:'More than 2 scratches on screen'},
 {screenCondition:'Screen cracked/ glass broken'}, {screenCondition:'Chipped/cracked outside display area'},
 {screenSpots:'Large/ heavy visible spots on screen'}, {screenSpots:'1-2 minor spots on screen'},
 {screenLines:'Visible line(s) on display'}, {screenLines:'Display faded along edges'},
 {screenDiscoloration:'Major Discoloration'}, {screenDiscoloration:'Minor Discoloration'},
 {bodyScratches:'More than 2 scratches'}, {bodyScratches:'1-2 scratches'},
 {bodyDents:'Major dent(s) or more than 2'}, {bodyDents:'1-2 minor dents'},
 {bodyPanel:'Cracked/ broken side or back panel'}, {bodyPanel:'Missing side or back panel'},
 {bodyBent:'Bent/ curved panel'}, {bodyBent:'Loose screen (Gap in screen and body)'},
];
// Direct Cashify controls, independent of runtime coefficients: these models
// explicitly quote the same price for 1-2 body scratches as for flawless body.
const neutralLightBody = new Set(['Apple iPhone X', 'Apple iPhone XS', 'Apple iPhone 11', 'Apple iPhone 12 Pro Max', 'Apple iPhone 13']);
let checks=0;
const devices=[...new Map((SEED_DEVICES as any[]).filter(d=>names.has(d.model)).map(d=>[d.model+'|'+d.storage,d])).values()];
for(const d of devices) for(const factor of [.8,1,1.2]) {
 const reference=Math.round(d.basePrice*factor);
 const quote=(answers:DiagnosticsType)=>calculateApplePrice(d.model,reference,answers,undefined,d.storage,{catalogStorage:d.storage});
 const base=quote(clean);
 assert.equal(quote({...clean,screenCondition:'No scratches on screen',screenSpots:'No spots on screen',bodyBent:'Phone not bent',bodyPanel:'No defect on side or back panel'}).cashifyConditionEquivalent,base.cashifyConditionEquivalent,'no-damage answers preserve clean quote');checks++;
 for(const change of changes){const damaged=quote({...clean,...change});
  if(change.bodyScratches==='1-2 scratches' && neutralLightBody.has(d.model)) assert.equal(damaged.cashifyConditionEquivalent,base.cashifyConditionEquivalent,'measured zero-change body control must remain neutral');
  else assert(damaged.cashifyConditionEquivalent<base.cashifyConditionEquivalent,`${d.model} ${d.storage} ${JSON.stringify(change)} is ignored at ${reference}`);checks++;}
 assert.equal(quote({...clean,screenSpots:'1-2 minor spots on screen',screenCondition:'No scratches on screen',bodyBent:'Phone not bent'}).cashifyConditionEquivalent,quote({...clean,screenSpots:'1-2 minor spots on screen'}).cashifyConditionEquivalent,'clean labels alongside damage must not add another screen repair');checks++;
 const cracked={...clean,screenCondition:'Screen cracked/ glass broken'};
 const two=quote({...cracked,bodyPanel:'Cracked/ broken side or back panel'});
 assert(two.cashifyConditionEquivalent<=quote(cracked).cashifyConditionEquivalent,'adding body damage must not increase value');
 assert(quote({...cracked,touch:false}).cashifyConditionEquivalent<=quote(cracked).cashifyConditionEquivalent,'failed touch must not increase cracked phone value');checks+=2;
}
for(const [reference,condition,expected]of [[10000,10000,10800],[30000,10000,11800],[50000,50000,52000],[100000,100000,102000]]){assert.equal(applyCompetitorUplift(reference,condition),expected);checks++;}
console.log(`${checks} legacy physical-input and uplift checks passed across ${devices.length} variants and three reference prices`);
