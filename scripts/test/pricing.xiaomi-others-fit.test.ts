import assert from 'node:assert/strict';
import { fitCalibration } from '../pricing-evidence/fit-cashify-runner-calibration';
import { diagnosticsForLabel } from '../pricing-evidence/import-cashify-runner-data';
const make=(caseId:string,label:string,base:number|null,status='quoted')=>({brand:'Nokia',model:'Nokia C12',storage:'2 GB/64 GB',caseId,label,base,reference:5000,status,primary:true,hasAge:false,complete:true,offeredAccessories:['box','charger'],observedAt:'2026-11-11T00:00:00Z',diagnostics:diagnosticsForLabel(label,['box','charger'],false)} as any);
const c=fitCalibration([make('baseline','Flawless',5000),make('calls','Cannot make/receive calls',300),make('front','Front Camera not working',null,'no_offer')],'Nokia' as any);
const p=Object.values(c.profiles)[0];assert.deepEqual(p.noOffer?.['hardware:front_camera'],['2gb/64gb']);
console.log('PASS new-brand fitter preserves measured refusals');

const dated=fitCalibration([make('baseline','Flawless',5000),make('calls','Cannot make/receive calls',300),{...make('front','Front Camera not working',4000),observedAt:'2026-11-12T00:00:00Z'}],'Nokia' as any);
assert.deepEqual(Object.values(dated.profiles)[0].rules['hardware:front_camera'].observedDates,['2026-11-12']);
