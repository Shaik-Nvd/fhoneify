import { validateXiaomiOthers } from './validate-xiaomi-others';
export async function validateOppoInfinix(brand:'Oppo'|'Infinix') {
 if(!['Oppo','Infinix'].includes(brand))throw new Error('Expected Oppo or Infinix');
 return validateXiaomiOthers(brand,{dir:'data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-18',replayControls:true});
}
if(require.main===module)validateOppoInfinix(process.argv[2] as any).then(s=>{console.log(JSON.stringify({brand:s.brand,replay:s.replay,refusals:s.refusals.length,noOffer:s.noOffer,holdout:s.holdout,gates:s.gates}));if(!Object.values(s.gates).filter(g=>g!==null).every(Boolean))process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
