import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('docs/design_sync/mobile_polar_followup');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  for width in (390,768,1440,1280):
   for lang in ('en','ko'):
    browser=await p.chromium.launch();page=await browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errors=[]
    page.on('requestfailed',lambda r:print('FAILED',r.url,r.failure,flush=True));page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    await page.goto('http://127.0.0.1:8021/');await page.wait_for_selector('.g3-cluster');await page.wait_for_function('!!window.LLSN?.globe?.setView');await page.wait_for_timeout(400)
    if lang=='ko':await page.locator('[data-lang="ko"]').click();await page.wait_for_timeout(500)
    mini=await page.locator('#ls-minimap').bounding_box();globe=await page.locator('#globe-stage canvas').first.bounding_box()
    if width<900:assert mini['y']>=globe['y']+globe['height'],(mini,globe)
    await page.screenshot(path=str(OUT/f'globe_{width}_{lang}.png'))
    cluster=page.locator('.g3-cluster').first;members=(await cluster.get_attribute('data-members')).split('|')
    await cluster.click();await page.wait_for_selector('.g3-cluster-panel:not([hidden])')
    assert await page.locator('.g3-cluster-panel [data-site-id]').count()==len(members)
    await page.screenshot(path=str(OUT/f'picker_{width}_{lang}.png'))
    await page.keyboard.press('Escape');assert await page.locator('.g3-cluster-panel').is_hidden()
    await page.evaluate('''()=>{window.__picked=null;LLSN.globe.on('siteclick',s=>window.__picked=s.id);}''')
    await cluster.click();target=await page.locator('.g3-cluster-panel [data-site-id]').first.get_attribute('data-site-id')
    await page.locator('.g3-cluster-panel [data-site-id]').first.click();assert await page.evaluate('__picked')==target
    # Restore overview, then inspect the real comparison table.
    await page.wait_for_timeout(1600)
    await page.evaluate("()=>{const e=document.querySelector('#ls-compare');window.scrollTo(0,e.getBoundingClientRect().top+scrollY-60)}")
    await page.wait_for_timeout(200);await page.screenshot(path=str(OUT/f'comparison_{width}_{lang}.png'))
    cells=await page.locator('.big-cmp thead th').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
    if width<900:
     assert cells[0]['width']==64,cells
     assert cells[2]['right']<=width and cells[1]['width']>=100,cells
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    results.append(dict(width=width,lang=lang,errors=errors,overflow=False,cluster_members=len(members),picked=target,item_width=cells[0]['width'],second_candidate_right=cells[2]['right']))
    print(width,lang,'PASS',flush=True);await browser.close()
 (OUT/'checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
asyncio.run(main())

