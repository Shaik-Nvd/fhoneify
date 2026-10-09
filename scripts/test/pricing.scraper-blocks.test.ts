import assert from 'node:assert/strict';
import * as guard from '../../server/modules/quote/cashifyFinalPriceGuard';
assert.equal(guard.parseFinalSellingPrice('Verify you are human\nSelling price ₹12,340'),null,'Challenge page must never yield a usable Selling price');
assert.equal(guard.parseFinalSellingPrice('Session expired. Sign in to continue.\nSelling price ₹12,340'),null);
assert.equal(guard.parseFinalSellingPrice('Too many requests\nSelling price ₹12,340'),null);
assert.equal(guard.parseFinalSellingPrice('Selling price ₹12,340\nSell Now'),12340);
assert.equal(guard.parseFinalSellingPrice('Selling price ₹12,340\nThis site is protected by reCAPTCHA. Privacy Policy and Terms of Service apply.'),12340,'Ordinary reCAPTCHA legal copy is not a challenge');
console.log('PASS late challenge, expired login and rate-limit pages never produce Selling prices');
const block=(guard as any).cashifyResponseBlockReason;
assert.equal(typeof block,'function','Same-site response classifier is required');
for(const status of [401,403,429])for(const resource of ['document','xhr','fetch'])assert(block('https://www.cashify.in/quote',status,resource));
assert.equal(block('https://other.example/quote',403,'xhr'),null);
assert.equal(block('https://cashify.in.other.example/quote',403,'xhr'),null);
assert.equal(block('https://www.cashify.in/image',403,'image'),null);
assert.equal(block('https://www.cashify.in/quote',200,'xhr'),null);
console.log('PASS Cashify navigation/API blocks classified; unrelated hosts and image errors do not stop collection');
async function responseWiring(){
 const install=(guard as any).installCashifyCollectionGuards;
 assert.equal(typeof install,'function','Production response listener and request guard must be testable together');
 let listener:any,handler:any;
 const page={on(event:string,fn:any){assert.equal(event,'response');listener=fn;},async route(pattern:string,fn:any){assert.equal(pattern,'**/*');handler=fn;}};
 const monitor=await install(page);
 function response(url:string,status:number,type:string){listener({url:()=>url,status:()=>status,request:()=>({resourceType:()=>type})});}
 function request(type:string){let outcome='unhandled';handler({request:()=>({resourceType:()=>type}),abort(){outcome='aborted';},continue(){outcome='continued';}});return outcome;}
 assert.equal(request('xhr'),'continued');response('https://analytics.example/count',403,'xhr');assert.equal(request('xhr'),'continued');
 response('https://www.cashify.in/quote',429,'xhr');assert(monitor.reason);assert.equal(request('xhr'),'aborted');assert.equal(request('document'),'aborted');
 response('https://www.cashify.in/quote',200,'xhr');assert.equal(request('fetch'),'aborted','Successful response must not clear the campaign block');
 console.log('PASS production listener blocks later requests after a late API response; block remains sticky');
}
responseWiring().catch(e=>{console.error(e);process.exitCode=1;});
