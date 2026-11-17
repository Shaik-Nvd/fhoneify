import { validateXiaomiOthers } from './validate-xiaomi-others';
export async function validatePocoMotorola(brand:'POCO'|'Motorola'|'Nokia') {
 if(!['POCO','Motorola','Nokia'].includes(brand))throw new Error('Expected POCO, Motorola or Nokia');
 return validateXiaomiOthers(brand,{dir:'data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-17',replayControls:true});
}
if(require.main===module)validatePocoMotorola(process.argv[2] as any).then(s=>{console.log(JSON.stringify({brand:s.brand,replay:s.replay,refusals:s.refusals.length,noOffer:s.noOffer,holdout:s.holdout,gates:s.gates}));if(!Object.values(s.gates).filter(g=>g!==null).every(Boolean))process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
