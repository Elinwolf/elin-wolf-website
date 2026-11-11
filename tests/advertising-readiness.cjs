// Run with Node and Playwright installed. All network requests are intercepted.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
 const browser = await chromium.launch();
 let checks = 0;
 try {
 for (const width of [320,390,1440]) {
  for (const file of ['index.html','services.html','privacy.html']) {
   const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   let submissions=0, response={success:true}, httpStatus=200;
   await page.route('**/*', async route => {
    const url=new URL(route.request().url());
    if(url.hostname==='formsubmit.co') { submissions++; if(response==='network-error') return route.abort(); if(response==='malformed') return route.fulfill({status:200,contentType:'application/json',body:'not json'}); return route.fulfill({status:httpStatus,contentType:'application/json',body:JSON.stringify(response)}); }
    if(url.hostname!=='local.test') return route.abort();
    const target=path.join(root,url.pathname==='/'?'index.html':url.pathname);
    if(!fs.existsSync(target)) return route.fulfill({status:404,body:''});
    const ext=path.extname(target);
    return route.fulfill({body:fs.readFileSync(target),contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp'})[ext]||'application/octet-stream'});
   });
   const load=async()=>{await page.goto('http://local.test/'+file);if(await page.locator('#consent-panel').isVisible())await page.locator('[data-consent-accept]').click();await page.evaluate(()=>{window.events=[];window.gtag=(...args)=>window.events.push(args)});};
   await load();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
   if(file==='privacy.html'){assert.equal(await page.locator('h1').textContent(),'Privacy policy');await page.screenshot({path:`/tmp/ads-privacy-${width}.png`});await page.close();continue;}
   const select=page.locator('select[name=type]');
   assert.equal(await select.inputValue(),'');assert.equal(await select.evaluate(e=>e.checkValidity()),false);checks++;
   if(file==='services.html') {
    for(const link of await page.locator('[data-event-type]').all()) {
     await link.focus();await page.keyboard.press('Enter');
     assert.equal(await select.inputValue(),await link.getAttribute('data-event-type'));
     assert.ok(await page.locator('#contact').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom-1));checks++;
    }
   }
   await page.locator('footer a[href="#contact"]').click();assert.equal(await select.inputValue(),'');checks++;
   const fill=async type=>{await page.locator('[name=name]').fill('Test Name');await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Simulated inquiry only');if(type)await select.selectOption(type);};
   await fill();await page.locator('button[type=submit]').click();assert.equal(submissions,0);checks++;
   for(const [type,expected] of [['Wedding','wedding'],['Corporate Event','corporate'],['Proposal','proposal'],['Private Event','private_event'],['Other','other']]) {
    await load();await fill(type);const before=submissions;
    await page.evaluate(()=>{const f=document.querySelector('form');f.requestSubmit();f.requestSubmit()});
    await page.waitForFunction(()=>document.querySelector('button[type=submit]').textContent==='Inquiry Sent');
    assert.equal(submissions,before+1);assert.deepEqual(await page.evaluate(()=>events),[['event','generate_lead',{event_type:expected}]]);checks++;
   }
   for(const result of [false,'false',null,{},'network-error','malformed']) {
    await load();await fill('Proposal');response=['network-error','malformed'].includes(result)?result:result===null?null:{success:result};
    await page.locator('button[type=submit]').click();await page.locator('.form-error').waitFor();assert.deepEqual(await page.evaluate(()=>events),[]);checks++;
   }
   response={success:true};httpStatus=500;await page.locator('button[type=submit]').click();await page.locator('.form-error').waitFor();assert.deepEqual(await page.evaluate(()=>events),[]);checks++;
   httpStatus=200;response={success:'true'};await page.locator('button[type=submit]').click();await page.locator('.form-success').waitFor();assert.equal(await page.evaluate(()=>events.length),1);checks++;
   await load();await fill('Corporate Event');await page.evaluate(()=>window.gtag=()=>{throw Error('Analytics unavailable')});await page.locator('button[type=submit]').click();await page.locator('.form-success').waitFor();checks++;
   await page.locator('#contact').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/ads-${file}-${width}.png`});
   await page.close();
   const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:900}});
   await nojs.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='local.test')return route.abort();
    const target=path.join(root,url.pathname);
    return route.fulfill({body:fs.readFileSync(target),contentType:target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':'application/octet-stream'});
   });
   await nojs.goto('http://local.test/'+file);
   assert.equal(await nojs.locator('select').inputValue(),'');
   assert.equal(await nojs.locator('select').getAttribute('required'),'');checks++;
   await nojs.close();
  }
 }
 console.log(`PASS: ${checks} checks; 320, 390, 1440px; network fully mocked; no real inquiries or analytics sent.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
