// Actual Google SDK; only the public SDK download reaches Google.
// All collection, FormSubmit and other external requests are intercepted locally.
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const crypto=require('crypto');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const id='G-BD74DCQGRV';
let sdkBody,checks=0;
(async()=>{const browser=await chromium.launch();try{
for(const advertising of (process.env.SDK_MEASUREMENT_ONLY?[true]:[false,true]))for(const width of [320,390,1440].filter(w=>!process.env.SDK_WIDTH||w===Number(process.env.SDK_WIDTH)).slice(0,process.env.SDK_SMOKE?1:3))for(const file of ['index.html','services.html','privacy.html'].slice(0,process.env.SDK_SMOKE?1:3)){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 let blockedRequests=[],externalAttempts=[],collectionRequests=[],hits=[],posts=0,fail=false,holdForm=false,releaseForm,holdSdk=false,releaseSdk,loads=0;
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js'&&url.searchParams.get('id')===id){
   loads++;if(!sdkBody){const response=await route.fetch();assert.equal(response.status(),200);sdkBody=await response.body();}
   if(holdSdk)await new Promise(resolve=>releaseSdk=resolve);
   return route.fulfill({contentType:'application/javascript',body:sdkBody}).catch(()=>{});
  }
  if(url.hostname!=='elinwolf.com'&&url.hostname!=='formsubmit.co')externalAttempts.push({url:req.url(),auditStartedAt:req.timing().startTime});
  if(url.hostname!=='elinwolf.com'&&url.pathname.endsWith('/collect')){
   collectionRequests.push({url:req.url(),auditStartedAt:req.timing().startTime});
   const body=req.postData()||'';
   // GA may put event parameters in a URL, body, or newline-separated event batch.
   for(const line of body.split('\n')){
    const p=new URLSearchParams(url.search);for(const[k,v]of new URLSearchParams(line))p.set(k,v);
    if(p.has('en'))hits.push({ ...Object.fromEntries(p), auditStartedAt: req.timing().startTime });
   }
   return route.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}});
  }
  if(url.hostname==='formsubmit.co'){
   posts++;if(holdForm)await new Promise(resolve=>releaseForm=resolve);
   return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify({success:!fail})});
  }
  if(url.hostname==='elinwolf.com'){
   const f=path.join(root,url.pathname==='/'?'index.html':url.pathname);
   if(fs.existsSync(f))return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'});
  }
  blockedRequests.push(req.url());return route.abort();
 });
 const p=await context.newPage();await p.addInitScript(()=>document.addEventListener('click',event=>{if(event.target.matches('[data-consent-reject]'))window.withdrawalAt=Date.now()},true));const pageUrl='https://elinwolf.com/'+file+(advertising?'?gclid=LOCAL_INTERCEPTED_TEST&utm_source=google&utm_medium=cpc':'');const load=()=>p.goto(pageUrl);
 const settings=async()=>{await p.locator('[data-consent-settings]').focus();await p.keyboard.press('Enter');};
 const accept=async()=>{if(!await p.locator('#consent-panel').isVisible())await settings();await p.locator('[data-consent-advertising]').setChecked(advertising);await p.locator('[data-consent-accept]').click();};
 const reject=async()=>{await settings();await p.locator('[data-consent-reject]').click();return p.evaluate(()=>window.withdrawalAt);};
 const frame=()=>p.frames().find(f=>f.url().endsWith('/analytics-frame.html'));
 const ready=async()=>{await p.waitForFunction(()=>!!document.querySelector('#consented-analytics')?.contentWindow.google_tag_manager);};
 const fill=async()=>{await p.locator('[name=name]').fill('SENSITIVE_TEST_NAME');await p.locator('[name=email]').fill('private-test@example.com');await p.locator('[name=message]').fill('SENSITIVE_TEST_MESSAGE');await p.locator('select').selectOption('Corporate Event');};
 const leads=()=>hits.filter(h=>h.en==='generate_lead');
 await load();await p.waitForTimeout(100);assert.equal(loads,0);assert.equal(hits.length,0);checks+=2;
 await accept();await ready();await p.waitForTimeout(2500);
 if(!hits.some(h=>h.en==='page_view'))console.log('Missing page view diagnostics',blockedRequests);
 assert.equal(hits.filter(h=>h.en==='page_view').length,1);assert.equal(hits[0].dl,pageUrl);assert.equal(hits[0].npa,'1');assert.equal(hits[0].gcs,advertising?'G111':'G101');checks+=4;
 // Queue an SDK event, retain a delayed timer, and install an unload transport attempt.
 await frame().evaluate(()=>{
  gtag('event','scroll',{percent_scrolled:90});
  setTimeout(()=>gtag('event','delayed_after_withdrawal'),1800);
  addEventListener('pagehide',()=>navigator.sendBeacon('https://www.google-analytics.com/g/collect?en=unload_probe',''));
 });
 if(file!=='privacy.html')await p.locator('[name=message]').fill('Keep my inquiry draft');
 const withdrawnAt=await reject();const afterWithdrawal=hits.length;
 assert.equal(await p.locator('#consented-analytics').count(),0);checks++;
 await p.evaluate(()=>window.gtag('event','parent_after_withdrawal'));
 await p.waitForTimeout(4000);assert.equal(externalAttempts.filter(h=>h.auditStartedAt>=withdrawnAt).length,0,'No collection during or after withdrawal');checks++;assert.equal(hits.length,afterWithdrawal);assert.equal((await context.cookies()).filter(c=>c.name.startsWith('_ga')).length,0);checks+=2;
 if(file!=='privacy.html'){assert.equal(await p.locator('[name=message]').inputValue(),'Keep my inquiry draft');checks++;}
 await accept();await ready();await p.waitForTimeout(2500);
 assert.equal(hits.length,afterWithdrawal,JSON.stringify(hits.map(h=>({en:h.en,dl:h.dl,dr:h.dr}))));assert.equal(loads,2);checks+=2;
 // A fresh consenting inquiry must still work, with exactly one safe category event.
 if(file!=='privacy.html'){
  await fill();fail=true;await p.locator('button[type=submit]').click();await p.locator('.form-error').waitFor();await p.waitForTimeout(2300);assert.equal(leads().length,0);checks++;
  fail=false;await p.evaluate(()=>{const f=document.querySelector('form');f.requestSubmit();f.requestSubmit()});await p.locator('.form-success').waitFor();await p.waitForTimeout(2500);
  assert.equal(leads().length,1);assert.equal(leads()[0]['ep.event_type'],'corporate');assert.equal(posts,2);assert.equal(JSON.stringify(hits).includes('SENSITIVE_TEST'),false);assert.equal(JSON.stringify(hits).includes('private-test'),false);checks+=5;
 }
 await reject();const beforeNavigation=hits.length;const beforeLoads=loads;
 await p.goto('https://elinwolf.com/services.html');await p.waitForTimeout(1000);assert.equal(loads,beforeLoads);assert.equal(hits.length,beforeNavigation);checks+=2;
 await fill();await p.locator('button[type=submit]').click();await p.locator('.form-success').waitFor();assert.equal(hits.length,beforeNavigation);checks++;
 // Reaccept with a submission in flight, then withdraw before FormSubmit confirms.
 await load();await accept();await ready();if(file!=='privacy.html'){
  await fill();holdForm=true;await p.locator('button[type=submit]').click();await p.waitForTimeout(50);
  await reject();const beforeLead=leads().length;releaseForm();holdForm=false;await p.locator('.form-success').waitFor();await p.waitForTimeout(2500);assert.equal(leads().length,beforeLead);checks++;
 }else await reject();
 // Withdraw before the SDK finishes loading; that old instance must never send later.
 holdSdk=true;await accept();await p.waitForTimeout(100);assert.ok(releaseSdk);await reject();const beforeLate=hits.length;releaseSdk();holdSdk=false;await p.waitForTimeout(2500);assert.equal(hits.length,beforeLate);checks++;
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
 if(advertising){
  await accept();await ready();await p.waitForTimeout(2500);
  const consent=await frame().evaluate(()=>Array.from(dataLayer).filter(c=>c[0]==='consent'&&c[1]==='update').at(-1)[2]);
  assert.deepEqual(consent,{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'denied'});checks++;
  await frame().evaluate(()=>{gtag('event','queued_before_ad_withdrawal');setTimeout(()=>gtag('event','delayed_ad_event'),1800);addEventListener('pagehide',()=>navigator.sendBeacon('https://www.google-analytics.com/g/collect?en=ad_unload_probe',''));});
  await context.addCookies([{name:'_gcl_au',value:'test-only',domain:'elinwolf.com',path:'/'}]);
  await settings();await p.locator('[data-consent-advertising]').uncheck();
  await p.evaluate(()=>document.querySelector('[data-consent-accept]').addEventListener('click',()=>window.downgradeAt=Date.now(),{once:true,capture:true}));
  await p.locator('[data-consent-accept]').click();await ready();await p.waitForTimeout(4000);
  const downgradeAt=await p.evaluate(()=>window.downgradeAt);
  assert.equal(externalAttempts.filter(h=>h.auditStartedAt>=downgradeAt).length,0,'No buffered traffic from withdrawn advertising runtime');checks++;
  assert.equal((await context.cookies()).some(c=>c.name.startsWith('_gcl')),false);checks++;
  const downgraded=await frame().evaluate(()=>Array.from(dataLayer).filter(c=>c[0]==='consent'&&c[1]==='update').at(-1)[2]);
  assert.equal(downgraded.ad_storage,'denied');assert.equal(downgraded.ad_user_data,'denied');assert.equal(downgraded.ad_personalization,'denied');checks+=3;
  await p.evaluate(()=>gtag('event','analytics_after_downgrade'));await p.waitForTimeout(6000);
  assert.equal(hits.filter(h=>h.en==='analytics_after_downgrade').length,1);assert.equal(hits.at(-1).gcs,'G101');checks+=2;
  await accept();await ready();await p.evaluate(()=>gtag('event','measurement_reaccepted'));await p.waitForTimeout(6000);
  assert.equal(hits.filter(h=>h.en==='measurement_reaccepted').length,1);assert.equal(hits.at(-1).gcs,'G111');assert.equal(hits.at(-1).npa,'1');checks+=3;
 }
 console.log('PASS actual SDK',advertising?'measurement':'analytics',width,file);
 await context.close();
}
console.log('SDK SHA256',crypto.createHash('sha256').update(sdkBody).digest('hex'));
console.log(`PASS: ${checks} actual-SDK assertions; all collection requests intercepted; no real inquiries.`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
