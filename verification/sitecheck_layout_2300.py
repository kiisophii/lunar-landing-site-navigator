from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path(__file__).resolve().parents[1]/'docs/design_sync/sitecheck_2300';OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for width,lang in [(1440,'en'),(1440,'ko'),(1280,'en'),(1280,'ko'),(390,'en'),(1920,'en')]:
  p=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto('http://127.0.0.1:8021/?sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&focus=SHACKLETON_RIM&d=2026-11-15&p=29.5&open=time,near,date,relay,gs,hz,terrain,access,history,routes,seasons',wait_until='networkidle')
  p.locator('.sc-name').wait_for();p.locator('#ls-intro').wait_for(state='hidden');p.locator('.lang-seg [data-lang="'+lang+'"]').click();p.evaluate('document.fonts.ready');p.wait_for_timeout(1500)
  p.locator('#ls-brief .brief-head').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.evaluate('scrollBy(0,-80)');p.screenshot(path=str(OUT/f'{width}_{lang}_top.png'))
  for key in ['near','relay','hz']:
   loc=p.locator('#blk-'+key)
   if loc.is_visible():loc.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.evaluate('scrollBy(0,-80)');p.screenshot(path=str(OUT/f'{width}_{lang}_{key}.png'))
  data=p.evaluate("""()=>{const r=e=>{let x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height}};let root=document.querySelector('#ls-brief');return {root:r(root),viewport:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,grid:getComputedStyle(root.querySelector('.sc-cards')).gridTemplateColumns,cards:[...root.querySelectorAll('.sc-cards>.ls-detail:not(.is-closed):not(.data-unavailable)')].map(e=>({id:e.id,...r(e),overflow:e.scrollWidth-e.clientWidth})),fonts:[...root.querySelectorAll('.sc-lim,.desc')].slice(0,4).map(e=>getComputedStyle(e).fontFamily)}}""")
  results.append({'width':width,'lang':lang,'errors':errors,**data})
  assert not errors,errors
  assert data['overflow']==0,data
  assert all(c['overflow']<=1 for c in data['cards']),data
  assert data['root']['w']<=1392.1,data
  assert abs(data['root']['x']-(data['viewport']-data['root']['w'])/2)<=9,data
  if width>760:
   cards={c['id']:c for c in data['cards']}
   for a,z in [('blk-near','blk-date'),('blk-relay','blk-gs')]:
    if a in cards and z in cards:assert abs(cards[a]['y']-cards[z]['y'])<1,(a,z,cards)
  p.close();print(width,lang,'PASS',flush=True)
 b.close()
(OUT/'checks.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf8')
