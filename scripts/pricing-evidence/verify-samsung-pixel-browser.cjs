/** Local browser + read-only fixture controller; no auth or lead submission. */
const fs=require('fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const web=process.env.RUNNER_QA_WEB_URL||'http://localhost:3311';
const api=process.env.RUNNER_QA_API_URL||'http://127.0.0.1:5311';
let browser;
(async()=>{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[],flows=[];page.on('pageerror',e=>errors.push(e.message));
  const assets='docs/pricing-handbook/assets/samsung-pixel-local-qa';fs.mkdirSync(assets,{recursive:true});
  const shot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${assets}/${name}.png`,fullPage:true});};
  for(const[brand,model,storage,name]of [
    ['Samsung','Samsung Galaxy A35 5G','8 GB/128 GB','samsung-a35'],
    ['Samsung','Samsung Galaxy S25 Ultra 5G','256 GB','samsung-s25-ultra'],
    ['Samsung','Samsung Galaxy Z Fold6 5G','12 GB/256 GB','samsung-fold6'],
    ['Google','Google Pixel 11','12 GB/256 GB','pixel11'],
    ['Google','Google Pixel 9 Pro Fold','16 GB/256 GB','pixel9-fold'],
  ]) {
    console.log(`Checking ${brand} ${model} ${storage}`);
    await page.goto(web);await page.evaluate(()=>sessionStorage.clear());
    const quoteResponse=page.waitForResponse(r=>r.url().includes('/api/quote/price')&&r.request().method()==='POST');
    await page.goto(`${web}/quote?${new URLSearchParams({brand,model,storage,step:'2'})}`,{waitUntil:'networkidle'});
    const initial=await(await quoteResponse).json();assert(initial.success,JSON.stringify(initial));const q=initial.data;
    assert(q.pricingVersion.includes('cashify-runner-rules-v4'));
    const priceText='\u20b9'+q.startingPrice.toLocaleString('en-IN');await page.getByText(priceText,{exact:true}).waitFor();
    await page.reload({waitUntil:'networkidle'});await page.getByText(priceText,{exact:true}).waitFor();await shot(name+'-reload');
    await page.getByRole('button',{name:'Get Exact Value'}).click();
    const yes=page.getByRole('button',{name:'Yes',exact:true});const count=await yes.count();assert([3,5].includes(count));for(const button of await yes.all())await button.click();
    await page.getByRole('button',{name:'Continue'}).click();
    await page.waitForURL(url=>url.searchParams.get('step')==='4');
    await page.getByRole('button',{name:'Continue'}).click();
    await page.waitForURL(url=>url.searchParams.get('step')==='7');
    if(name.includes('fold')) {
      assert.equal(await page.getByRole('button',{name:/Outer screen damaged/}).count(),1);
      assert.equal(await page.getByRole('button',{name:/Hinge damaged/}).count(),1);await shot(name+'-fold-options');
    }
    assert.equal(await page.getByRole('button',{name:'S-Pen not working / missing',exact:false}).count(),0,'unmeasured stylus hardware fault is not invented');
    await page.getByRole('button',{name:'WiFi not working',exact:false}).click();await page.getByRole('button',{name:'Continue'}).click();
    const spen=page.getByRole('button',{name:'Original S Pen',exact:false});
    if(name==='samsung-s25-ultra')assert.equal(await spen.count(),1);
    for(const label of ['Original Box with same IMEI','Original Charger','Original S Pen']) {const button=page.getByRole('button',{name:label,exact:false});if(await button.count())await button.click();}
    await shot(name+'-accessories');await page.getByRole('button',{name:'Continue'}).click();
    let age=null;
    if(await page.getByRole('button',{name:'Above 11 months',exact:true}).count()) {
      await page.getByRole('button',{name:'Above 11 months',exact:true}).click();age='above11';
      await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('fhoneify-quote-session')||'{}').answers?.mobileAge==='above11');
      await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Continue'}).click();
    }
    await page.getByRole('heading',{name:'Login/Signup',exact:true}).waitFor();await shot(name+'-login-boundary');
    const answers=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fhoneify-quote-session')).answers);
    assert(answers.hardware.includes('wifi'));if(age)assert.equal(answers.mobileAge,age);
    const priced=await page.request.post(`${api}/api/quote/price`,{data:{brand,model,storage,diagnostics:answers}});const payload=await priced.json();
    assert(payload.success,JSON.stringify(payload));assert(payload.data.quoteToken&&payload.data.fhoneifyPrice>0);
    flows.push({brand,model,storage,getUpto:q.startingPrice,priceFromUiAnswers:payload.data.fhoneifyPrice,initialQuestions:count,age,loginBoundary:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('release-test-logs/samsung-pixel/browser-summary.json',JSON.stringify({flows,pageErrors:errors,basis:'built local frontend + production price controller with injected read-only references, unreachable database',otpLeadAndAuthenticatedFinalScreen:'not tested'},null,2));
  console.log(`PASS ${flows.length} browser flows: Get Upto/reload, measured accessories/fold options, age persistence, API quotes, login boundary; no OTP/leads`);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
