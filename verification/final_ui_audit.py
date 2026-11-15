"""Presentation-only audit. Does not change data or scientific calculations."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8060'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'verification/final_ui')
WIDTHS = list(map(int, sys.argv[3:])) or [1920, 1440, 1280, 1100, 390]
AUDIT = '''() => {
 const visible = e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&r.bottom>64&&r.top<innerHeight&&s.visibility==='visible'&&!e.closest('.sr,.ls-skip,[hidden],[aria-hidden="true"]'); };
 const item=e=>({tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className:'svg',text:(e.innerText||e.title||e.getAttribute('aria-label')||'').slice(0,90),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height});
 return {overflow:document.documentElement.scrollWidth-innerWidth,
 small:[...document.querySelectorAll('button,input:not([type=range]),select,summary')].filter(visible).filter(e=>{let r=e.getBoundingClientRect();return r.width<23.9||r.height<23.9}).map(item),
 clipped:[...document.querySelectorAll('button,h1,h2,h3,h4,.sc-kv>span,.sc-cell .k,.sc-name')].filter(visible).filter(e=>{let s=getComputedStyle(e);return (e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX))||(e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY))}).map(item),
 outside:[...document.querySelectorAll('button,input,select,h2,h3')].filter(visible).filter(e=>{let r=e.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1}).filter(e=>!e.closest('.tbl-x,.detail-table-wrap,.mini-tbl,.tc-scroll')).map(item)};
}'''

async def case(browser, width, lang):
 folder=OUT/f'{width}_{lang}';folder.mkdir(parents=True,exist_ok=True)
 page=await browser.new_page(viewport={'width':width,'height':844 if width==390 else 900},reduced_motion='reduce')
 page.set_default_timeout(15000)
 errors=[];steps=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
 async def shot(name):
  await page.wait_for_timeout(150)
  step=await page.evaluate(AUDIT);step['stage']=name;steps.append(step)
  await page.screenshot(path=str(folder/f'{name}.jpg'),quality=78)
 try:
  await page.goto(URL+f'/?lang={lang}&sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&focus=SHACKLETON_RIM&d=2026-11-15&p=29.5&open=time,gs',wait_until='networkidle')
  await page.locator('#ls-intro').wait_for(state='hidden',timeout=30000)
  await page.evaluate('document.fonts.ready')
  await shot('home')
  await page.locator('.detail-see').first.click()
  await page.wait_for_timeout(500)
  # Open the available analysis cards using the public UI.
  for button in await page.locator('.sc-chip:not(:disabled)').all():
   if await button.is_visible() and await button.get_attribute('aria-pressed') != 'true':
    await button.click()
  await page.wait_for_timeout(1500)
  if width==390:
   height=await page.evaluate('document.documentElement.scrollHeight')
   for i,y in enumerate(range(0,int(height),650)):
    await page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',y)
    await shot(f'scroll_{i:02}')
  else:
   for selector in ['#ls-compare','.detail-charts','.detail-tl','#ls-brief']:
    await page.locator(selector).first.scroll_into_view_if_needed();await shot(selector.replace('#','').replace('.',''))
   for block in await page.locator('.ls-detail:not(.is-closed)').all():
    await block.scroll_into_view_if_needed();await shot(await block.get_attribute('id'))
  cards=await page.locator('.sc-cards > .ls-detail:not(.is-closed)').evaluate_all('(es)=>es.map(e=>({id:e.id,width:e.getBoundingClientRect().width}))')
  language=await page.locator('.lang-seg').evaluate('(e)=>{let r=e.getBoundingClientRect(),b=e.firstElementChild.getBoundingClientRect();return {top:b.top-r.top,bottom:r.bottom-b.bottom}}')
  await page.evaluate("location.hash='about'");await page.wait_for_timeout(500)
  total=await page.locator('#abScroll').evaluate('(e)=>e.scrollHeight-e.clientHeight')
  positions=range(0,int(total)+650,550) if width==390 else [0,total*.5,total]
  for i,y in enumerate(positions):
   await page.locator('#abScroll').evaluate('(e,y)=>e.scrollTo({top:y,behavior:"instant"})',y)
   await shot(f'about_{i:02}')
  result={'width':width,'lang':lang,'errors':errors,'cards':cards,'languagePadding':language,'steps':steps}
 except Exception as e:
  result={'width':width,'lang':lang,'errors':errors,'fatal':str(e),'steps':steps}
 (folder/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(width,lang,'errors',len(errors),'overflow',sum(s['overflow']>0 for s in steps),'fatal',result.get('fatal',''),flush=True)
 await page.close();return result

async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  results=[]
  for width in WIDTHS:
   for lang in ['en','ko']:results.append(await case(browser,width,lang))
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
asyncio.run(main())
