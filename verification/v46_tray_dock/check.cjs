const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),cp=require('child_process'),crypto=require('crypto');
const repo=path.resolve(process.env.REPO_ROOT||path.join(__dirname,'../..')),root=path.join(repo,'web'),out=path.resolve(process.env.QA_OUT||path.join(repo,'docs/design_sync/v46_tray_dock')),cache=process.env.QA_CACHE?path.resolve(process.env.QA_CACHE):null;fs.mkdirSync(out,{recursive:true});
const baseline='758c15eec324c6428a90f888c4b21a9ab128b7e0';
const oldCss=cp.execFileSync('git',['show',baseline+':web/css/layout.css'],{cwd:repo,maxBuffer:2000000}).toString();
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root)){res.writeHead(403);return res.end();}if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');fs.stat(p,(e,s)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Content-Length':s.size});fs.createReadStream(p).pipe(res);});});
const checks=[],failures=[];let browser;
const save=()=>{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({baseline,checks:checks.length,failures},null,2));};
(async()=>{await new Promise(r=>server.listen(8789,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const state of ['before','after']){
const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requestFailures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()}));
const manifest=cache?JSON.parse(fs.readFileSync(path.join(cache,'manifest.json'),'utf8')):{};
await page.route('https://**/*',async route=>{if(!cache)return route.continue();const u=route.request().url(),headers={'access-control-allow-origin':'*'};
if(u.includes('fonts.googleapis.com/css2'))return route.fulfill({headers,contentType:'text/css',body:fs.readFileSync(path.join(cache,'google.css'),'utf8')});
if(u.includes('pretendardvariable-dynamic-subset.min.css'))return route.fulfill({headers,contentType:'text/css',body:fs.readFileSync(path.join(cache,'pretendard.css'),'utf8')});
if(manifest[u])return route.fulfill({headers,contentType:'font/woff2',body:fs.readFileSync(path.join(cache,manifest[u]))});
if(u==='https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js')return route.fulfill({headers,contentType:'application/javascript',body:fs.readFileSync(path.join(cache,'three.module.min.js'),'utf8')});
return route.continue();});
if(state==='before')await page.route('**/css/layout.css',r=>r.fulfill({contentType:'text/css',body:oldCss}));
await page.goto('http://127.0.0.1:8789/?sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&d=2026-11-14&p=29.5&t=7620',{waitUntil:'domcontentloaded',timeout:120000});
await page.locator('#tray-cat .tc-row').first().waitFor({timeout:120000});
for(const width of [1920,1440,1280,1100])for(const lang of ['en','ko']){
await page.setViewportSize({width,height:width===1920?1080:width===1440?900:800});await page.locator('.lang-seg [data-lang="'+lang+'"]').click();await page.evaluate(()=>document.fonts.ready);await page.keyboard.press('Control+Home');
const states=[];
for(const cat of ['sun','earth','relay','terrain']){await page.locator('.tc-tabs [data-c="'+cat+'"]').click();
for(const sub of await page.locator('.tc-subs button').all()){
await sub.click();await page.waitForTimeout(120);await page.locator('.tc-row').first().waitFor();
const m=await page.evaluate(()=>{const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};const q=s=>document.querySelector(s),h=q('.tc-h');
const clips=[];for(let e=h.parentElement;e;e=e.parentElement)if(['auto','scroll','hidden','clip'].includes(getComputedStyle(e).overflowX)){const r=e.getBoundingClientRect();clips.push({class:e.className,left:r.left,right:r.left+e.clientWidth});}
return{header:rect(h),title:rect(q('.tc-h h4')),subs:rect(q('.tc-subs')),clips,buttons:[...document.querySelectorAll('.tc-subs button')].map(e=>({...rect(e),font:getComputedStyle(e).fontSize,text:e.textContent})),rows:[...document.querySelectorAll('.tc-row')].map(e=>({rect:rect(e),name:rect(e.querySelector('.tc-nm')),value:rect(e.querySelector('.tc-val')),text:e.querySelector('.tc-val').textContent,fullName:e.querySelector('.tc-nm').title})),scroll:{width:q('.tc-scroll').scrollWidth,client:q('.tc-scroll').clientWidth},docWidth:document.documentElement.scrollWidth,viewport:innerWidth,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),dock:rect(q('.ls-toolbar'))};});
const subKey=await sub.getAttribute('data-s');states.push({cat,sub:subKey,metrics:m});
if(state==='after'){
if(m.docWidth>width||m.scroll.width>m.scroll.client)failures.push({width,lang,cat,sub:subKey,reason:'horizontal overflow'});
if(width<1440&&lang==='en'&&(Math.abs(m.title.y+m.title.height/2-m.subs.y-m.subs.height/2)>1||m.buttons.some(b=>b.font!=='14px'||m.clips.some(c=>b.x<c.left-.1||b.right>c.right+.1))))failures.push({width,lang,cat,sub:subKey,reason:'heading/font/clipping',metrics:m});
if(width<1440&&['dark','gap'].includes(subKey)&&['sun','earth'].includes(cat)&&m.rows.some(r=>Math.abs(r.name.y+r.name.height/2-r.value.y-r.value.height/2)>1||r.name.right>r.value.x+.1||r.rect.height>48))failures.push({width,lang,cat,sub:subKey,reason:'time value wrapped',rows:m.rows});
const before=checks.find(c=>c.state==='before'&&c.width===width&&c.lang===lang).states.find(s=>s.cat===cat&&s.sub===subKey).metrics;
if(JSON.stringify(m.rows.map(r=>r.text))!==JSON.stringify(before.rows.map(r=>r.text)))failures.push({width,lang,cat,sub:subKey,reason:'values changed'});
if(width===1440&&JSON.stringify(m)!==JSON.stringify(before))failures.push({width,lang,cat,sub:subKey,reason:'1440 changed',before,after:m});
}
}
if(cat==='earth'&&width<1440){await page.mouse.move(0,0);await page.locator('#ls-tray').screenshot({path:path.join(out,`${state}_${width}_${lang}_tray.png`)});}
}
await page.locator('.tc-tabs [data-c=sun]').click();await page.locator('.tc-subs button').first().click();await page.mouse.move(0,0);
let hash=null;if(width===1440){const png=await page.locator('#ls-tray').screenshot({path:path.join(out,`${state}_${width}_${lang}_tray.png`)});hash=crypto.createHash('sha256').update(png).digest('hex');}
await page.locator('.ls-toolbar [data-layer=earth]').click();await page.locator('.ls-toolbar.time-off').waitFor();await page.waitForTimeout(200);const folded=await page.locator('.ls-toolbar').boundingBox();
if(width===1920){await page.mouse.move(0,0);await page.locator('.ls-toolbar').screenshot({path:path.join(out,`${state}_${width}_${lang}_fold.png`)});if(state==='after'&&folded.width>=400)failures.push({width,lang,reason:'dock did not shrink',folded});}
await page.locator('.ls-toolbar [data-layer=light]').click();await page.locator('.ls-toolbar:not(.time-off)').waitFor();
if(state==='after'&&width===1440){const b=checks.find(c=>c.state==='before'&&c.width===width&&c.lang===lang);if(hash!==b.hash||JSON.stringify(folded)!==JSON.stringify(b.folded))failures.push({width,lang,reason:'1440 screenshot/fold changed',hash,before:b.hash,folded,beforeFold:b.folded});}
if(state==='after'&&errors.length)failures.push({width,lang,reason:'browser errors',errors,requestFailures});
checks.push({state,width,lang,states,hash,folded,errors:[...errors],requestFailures:[...requestFailures]});save();console.log('CHECK',state,width,lang,'fold',folded.width,'failures',failures.length);
}
await context.close();}
await browser.close();server.close();save();console.log('DONE',JSON.stringify(failures));if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);save();if(browser)await browser.close();server.close();process.exitCode=1;});
