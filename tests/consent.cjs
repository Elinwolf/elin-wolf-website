// All external traffic, including the Google SDK, is mocked. No real inquiries.
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const key='elinwolf.analytics-consent.v1';
const id='G-BD74DCQGRV';let checks=0;
// Contract double, not Google's real SDK: captures queue order and honors the disable flag.
const sdk=`(()=>{
 window.mockCommands=[];window.parent.mockCommands=window.mockCommands;
 const send=(name,params)=>{if(window['ga-disable-${id}'])return;document.cookie='_ga=mock; path=/';fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify({name,params})});};
 const process=args=>{const a=Array.from(args);window.mockCommands.push(a);if(a[0]==='config'&&a[2]?.send_page_view!==false)send('page_view',{});if(a[0]==='event')send(a[1],a[2]);};
 const q=window.dataLayer;const pending=q.slice();q.push=function(...items){items.forEach(process);return Array.prototype.push.apply(this,items)};pending.forEach(process);
 window.parent.mockAutoEvent=()=>send('user_engagement',{});
})();`;
(async()=>{const browser=await chromium.launch();try{
for(const width of [320,390,1440])for(const file of ['index.html','services.html','privacy.html']){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 let hits=[],loads=0,posts=0,fail=false,hold=false,release;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='www.googletagmanager.com'){loads++;return route.fulfill({contentType:'application/javascript',body:sdk});}
  if(u.hostname==='www.google-analytics.com'){hits.push(JSON.parse(route.request().postData()));return route.fulfill({body:''});}
  if(u.hostname==='formsubmit.co'){posts++;if(hold)await new Promise(r=>release=r);return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify({success:!fail})});}
  if(u.hostname!=='local.test')return route.abort();
  const f=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(f))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'});
 });
 const p=await context.newPage();const load=()=>p.goto('http://local.test/'+file);
 const open=async()=>{await p.locator('[data-consent-settings]').focus();await p.keyboard.press('Enter');};
 const fill=async()=>{await p.locator('[name=name]').fill('Not sent to Analytics');await p.locator('[name=email]').fill('private@example.com');await p.locator('[name=message]').fill('Private inquiry text');await p.locator('select').selectOption('Proposal');};
 const submit=async()=>{await fill();await p.locator('button[type=submit]').click();await p.locator(fail?'.form-error':'.form-success').waitFor();};
 await context.addCookies([{name:'_ga',value:'old',domain:'local.test',path:'/'}]);
 await load();assert.equal(loads,0);assert.equal(hits.length,0);assert.equal((await context.cookies()).some(c=>c.name==='_ga'),false);checks+=3;
 await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#consent-panel')),true);checks++;
 const choices=await p.locator('.consent-actions button').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})));
 assert.deepEqual(choices[0],choices[1]);assert.ok(choices[0].h>=44);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks+=3;
 await p.locator('img').first().waitFor({state:'attached',timeout:1000}).catch(()=>{});
 await p.screenshot({path:`/tmp/consent-${file}-${width}.png`});
 await p.locator('[data-consent-close]').click();assert.equal(loads,0);checks++;
 if(file!=='privacy.html'){await submit();assert.equal(hits.length,0);checks++;}
 await open();assert.equal(await p.locator('[data-consent-reject]').evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Enter');checks++;
 await load();assert.equal(await p.locator('#consent-panel').isVisible(),false);assert.equal(loads,0);checks+=2;
 if(file!=='privacy.html'){fail=true;await submit();assert.equal(hits.length,0);fail=false;await p.locator('button[type=submit]').click();await p.locator('.form-success').waitFor();assert.equal(hits.length,0);checks+=2;}
 await open();await p.locator('[data-consent-accept]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>window.mockCommands?.some(c=>c[0]==='config'));
 assert.equal(loads,1);await p.waitForTimeout(30);assert.equal(hits.filter(h=>h.name==='page_view').length,1);assert.equal(hits.filter(h=>h.name==='generate_lead').length,0);checks+=3;
 const states=await p.evaluate(()=>mockCommands.filter(c=>c[0]==='consent').map(c=>c[2]));
 assert.equal(states[0].analytics_storage,'denied');assert.equal(states.at(-1).analytics_storage,'granted');for(const s of states)for(const k of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(s[k],'denied');checks++;
 await open();await p.locator('[data-consent-accept]').click();await p.waitForTimeout(30);assert.equal(loads,1);assert.equal(hits.filter(h=>h.name==='page_view').length,1);checks++;
 await load();await p.waitForFunction(()=>window.mockCommands?.some(c=>c[0]==='config'));
 if(file!=='privacy.html'){await submit();await p.waitForTimeout(30);const leads=hits.filter(h=>h.name==='generate_lead');assert.deepEqual(leads,[{name:'generate_lead',params:{event_type:'proposal'}}]);checks++;}
 if(file!=='privacy.html'){
  await load();await p.waitForFunction(()=>window.mockCommands?.length);fail=true;const countBeforeFailure=hits.filter(h=>h.name==='generate_lead').length;await submit();await p.waitForTimeout(30);assert.equal(hits.filter(h=>h.name==='generate_lead').length,countBeforeFailure);checks++;fail=false;
 }
 // Withdrawal must not erase unsent form text, and stops SDK automatic hits as well.
 if(file!=='privacy.html')await p.locator('[name=message]').fill('Keep my draft');
 await open();await p.keyboard.press('Enter');const count=hits.length;
 await p.evaluate(()=>window.mockAutoEvent());await p.waitForTimeout(30);assert.equal(hits.length,count);assert.equal((await context.cookies()).some(c=>c.name.startsWith('_ga')),false);checks+=2;
 if(file!=='privacy.html'){assert.equal(await p.locator('[name=message]').inputValue(),'Keep my draft');checks++;}
 await load();const previousLoads=loads;assert.equal(await p.evaluate(()=>window['ga-disable-G-BD74DCQGRV']),true);checks++;
 if(file!=='privacy.html'){await submit();assert.equal(hits.length,count);assert.equal(loads,previousLoads);checks+=2;}
 // Reaccept on the same document and preserve one-loader behavior.
 await open();await p.locator('[data-consent-accept]').click();await p.waitForFunction(()=>window.mockCommands?.length);
 await open();await p.keyboard.press('Enter');const before=hits.length;
 await open();await p.locator('[data-consent-accept]').click();await p.waitForTimeout(30);assert.equal(hits.length,before);checks++;
 // Cross-tab withdrawal applies without navigation.
 const other=await context.newPage();await other.goto('http://local.test/privacy.html');await other.evaluate(k=>localStorage.setItem(k,'rejected'),key);await p.waitForFunction(()=>window['ga-disable-G-BD74DCQGRV']===true);checks++;
 // An in-flight inquiry cannot regain consent by withdrawing and reaccepting.
 if(file!=='privacy.html'){
  await load();await open();await p.locator('[data-consent-accept]').click();await fill();hold=true;
  await p.locator('button[type=submit]').click();await p.waitForTimeout(50);await open();await p.keyboard.press('Enter');await open();await p.locator('[data-consent-accept]').click();
  const leadCount=hits.filter(h=>h.name==='generate_lead').length;release();hold=false;await p.locator('.form-success').waitFor();await p.waitForTimeout(30);assert.equal(hits.filter(h=>h.name==='generate_lead').length,leadCount);checks++;
 }
 await open();await p.keyboard.press('Escape');assert.equal(await p.locator('#consent-panel').isVisible(),false);assert.equal(await p.locator('[data-consent-settings]').evaluate(e=>e===document.activeElement),true);checks+=2;
 // Missing/corrupt choices fail closed, including no-JavaScript visits.
 await p.evaluate(k=>localStorage.setItem(k,'invalid'),key);const beforeInvalid=loads;await load();assert.equal(loads,beforeInvalid);assert.equal(await p.locator('#consent-panel').isVisible(),true);checks+=2;
 const nojs=await context.newPage();await nojs.route('**/*.js',r=>r.abort());await nojs.goto('http://local.test/'+file);assert.equal(loads,beforeInvalid);assert.equal(await nojs.locator('[data-consent-settings]').isVisible(),false);checks+=2;await nojs.close();
 // Storage errors must not prevent either a current-page choice or form operation.
 const blocked=await context.newPage();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')}});
 await blocked.goto('http://local.test/'+file);assert.equal(loads,beforeInvalid);await blocked.locator('[data-consent-accept]').click();await blocked.waitForFunction(()=>window.mockCommands?.length);assert.equal(await blocked.evaluate(()=>window.elinConsent.snapshot()!==null),true);checks+=2;
 await blocked.close();
 // New measurement purpose: old preferences never silently opt in.
 await other.close();await p.evaluate(k=>localStorage.setItem(k,'accepted'),key);await load();await p.waitForFunction(()=>window.mockCommands?.length);
 await open();assert.equal(await p.locator('[data-consent-advertising]').isChecked(),false);checks++;
 const oldRevision=await p.evaluate(()=>elinConsent.snapshot());
 await p.locator('[data-consent-advertising]').focus();await p.keyboard.press('Space');
 await p.locator('[data-consent-accept]').focus();await p.keyboard.press('Enter');
 await p.waitForFunction(()=>mockCommands.some(c=>c[0]==='consent'&&c[1]==='update'&&c[2].ad_user_data==='granted'));
 let granted=await p.evaluate(()=>mockCommands.find(c=>c[0]==='consent'&&c[1]==='update')[2]);
 assert.deepEqual(granted,{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'denied'});checks++;
 assert.equal(await p.evaluate(t=>elinConsent.allows(t),oldRevision),false);checks++;
 const config=await p.evaluate(()=>mockCommands.find(c=>c[0]==='config')[2]);assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);checks+=2;
 await load();await p.waitForFunction(()=>window.mockCommands?.length);await open();assert.equal(await p.locator('[data-consent-advertising]').isChecked(),true);checks++;
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
 await p.screenshot({path:`/tmp/measurement-${file}-${width}.png`});
 await context.addCookies([{name:'_gcl_au',value:'test',domain:'local.test',path:'/'}]);
 const peer=await context.newPage();await peer.goto('http://local.test/privacy.html');await peer.locator('[data-consent-settings]').click();await peer.locator('[data-consent-advertising]').uncheck();await peer.locator('[data-consent-accept]').click();
 await p.waitForFunction(()=>mockCommands.some(c=>c[0]==='consent'&&c[1]==='update'&&c[2].ad_user_data==='denied'));
 assert.equal(await p.locator('[data-consent-advertising]').isChecked(),false);assert.equal((await context.cookies()).some(c=>c.name.startsWith('_gcl')),false);checks+=2;
 assert.equal(await p.evaluate(()=>elinConsent.snapshot()!==null),true);checks++;
 await peer.close();

 await context.close();
}
console.log(`PASS: ${checks} consent checks at 320, 390, 1440px; SDK and all network traffic mocked.`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
