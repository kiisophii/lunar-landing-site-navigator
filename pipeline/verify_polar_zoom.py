import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page(viewport={'width':768,'height':900},reduced_motion='reduce')
  await pg.goto('http://127.0.0.1:8021/');await pg.wait_for_selector('.g3-cluster');await pg.wait_for_timeout(700)
  await pg.locator('.mm-exp').click();await pg.set_viewport_size({'width':390,'height':900});await pg.wait_for_timeout(400)
  ball=await pg.locator('.mm-ball').bounding_box();side=await pg.locator('.mm-side').bounding_box();assert ball['x']+ball['width']<=side['x'],(ball,side)
  await pg.set_viewport_size({'width':1440,'height':900});await pg.wait_for_timeout(400);await pg.locator('.mm-exp').click();await pg.wait_for_timeout(400)
  r=await pg.locator('#ls-minimap').bounding_box();assert r['width']==128 and r['height']==164,r
  results=[]
  for distance in (6000,300):
   await pg.evaluate('(range)=>LLSN.globe.setView({lat:-89,lon:0,range,tilt:0})',distance);await pg.wait_for_timeout(1500)
   clusters=await pg.locator('.g3-cluster').evaluate_all('(es)=>es.map(e=>({text:e.textContent,members:e.dataset.members}))')
   labels=await pg.locator('.g3-site').evaluate_all('(es)=>es.filter(e=>getComputedStyle(e).display!=="none"&&getComputedStyle(e).visibility!=="hidden").map(e=>({id:e.dataset.siteId,dot:e.classList.contains("g3-dotonly")}))')
   results.append(dict(range=distance,clusters=clusters,visible=labels));print(distance,len(clusters),len(labels),flush=True)
   await pg.screenshot(path=f'docs/design_sync/mobile_polar_followup/zoom_{distance}.png')
  assert len(results[-1]['visible'])>len(results[0]['visible'])
  assert max([len(c['members'].split('|')) for c in results[0]['clusters']]+[0])>max([len(c['members'].split('|')) for c in results[-1]['clusters']]+[0])
  Path('docs/design_sync/mobile_polar_followup/zoom_resize.json').write_text(json.dumps(results,indent=2),encoding='utf-8');await b.close()
asyncio.run(main())
