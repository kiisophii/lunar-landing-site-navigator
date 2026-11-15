import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':900});errors=[]
  pg.on('response',lambda r:print(r.status,r.url,flush=True) if r.status>=400 else None)
  pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  await pg.add_init_script("sessionStorage.setItem('ls-intro-played','1')");await pg.goto('http://127.0.0.1:8021/?nointro=1');await pg.wait_for_selector('.sc-pick [data-chip]',state='attached')
  await pg.wait_for_selector('.alt-needle',state='attached')
  await pg.evaluate('()=>LLSN.setTime(LLSN.window.i0+100)');await pg.wait_for_timeout(250)
  needle=await pg.locator('#ls-compare .alt-needle').first.evaluate('e=>({x:+e.getAttribute("x1"),expected:+e.dataset.x0+100.5/+e.dataset.n*+e.dataset.w})');assert abs(needle['x']-needle['expected'])<.01,needle
  # A test-only pending user point verifies data absence without running a DEM computation.
  await pg.evaluate("()=>LLSN.addSite({id:'USER_QA_PENDING',name:'QA pending point',name_ko:'검증용 대기 지점',lat:1,lon:1,user:true,group:'custom'}, {flat:true,pending:true,h0_m:0,mask:Array(720).fill(0),az_step_deg:.5,dem_sources:[]})")
  await pg.wait_for_timeout(1200)
  available=await pg.locator('.sc-pick [data-chip]').evaluate_all('(es)=>es.map(e=>e.dataset.chip)');assert available==['gs'],available
  await pg.locator('.sc-hidden-toggle').click();assert await pg.locator('#sc-unavailable .sc-chip').count()==10
  await pg.locator('[data-chip="gs"]').click();assert await pg.locator('#blk-gs').is_visible()
  assert not errors,errors
  Path('docs/design_sync/detail_visibility/pending_check.json').write_text(json.dumps(dict(needle=needle,available=available,unavailable=10,errors=errors),indent=2),encoding='utf-8');print('pending and time alignment PASS');await b.close()
asyncio.run(main())
