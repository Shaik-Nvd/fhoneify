import { validateXiaomiOthers } from './validate-xiaomi-others';
export async function validateTecno() {
 return validateXiaomiOthers('Tecno',{dir:'data/pricing-evidence/tecno-2026-11-21',replayControls:true});
}
if(require.main===module)validateTecno().then(s=>{console.log(JSON.stringify({brand:s.brand,replay:s.replay,refusals:s.refusals.length,noOffer:s.noOffer,holdout:s.holdout,gates:s.gates}));if(!Object.values(s.gates).filter(g=>g!==null).every(Boolean))process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
