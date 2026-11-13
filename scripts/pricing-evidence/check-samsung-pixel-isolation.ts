import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { priceDevice } from '../../lib/pricing/engine';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const changes=[{}, {calls:false}, {mobileAge:'above11',warranty:false}, {hardware:['back_camera']}, {screenCondition:'Screen cracked/ glass broken'}, {accessories:[]}];
const digest=createHash('sha256');let count=0;
for(const device of SEED_DEVICES.filter(d=>!['Samsung','Google'].includes(d.brand)))for(const reference of [20000,50000])for(const edit of changes) {
  let result:unknown;try {const q=priceDevice(device.brand,device.model,reference,{...clean,...edit},undefined,device.storage);result=[q.cashifyConditionEquivalent,q.fhoneifyPrice];}
  catch(error:any){result=[error.name,error.reason??error.message];}
  digest.update(JSON.stringify([device.id,reference,edit,result])+'\n');count++;
}
const result={count,sha256:digest.digest('hex')};const file='release-test-logs/samsung-pixel/protected-prices.json';
if(process.argv.includes('--capture')){fs.writeFileSync(file,JSON.stringify(result));console.log('Captured protected baseline',result);}
else {const baseline=JSON.parse(fs.readFileSync(file,'utf8'));if(JSON.stringify(result)!==JSON.stringify(baseline))throw new Error('Protected brand quote fingerprint changed');console.log('PASS protected brands unchanged',result);}
