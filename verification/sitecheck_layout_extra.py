from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).resolve().parents[1]/'docs/design_sync/sitecheck_2300';results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for w,lang in [(1440,'en'),(390,'ko')]:
  p=b.new_page(viewport={'width':w,'height':900},reduced_motion='reduce');errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto('http://127.0.0.1:8021/?focus=SHACKLETON_RIM&d=2026-11-15&p=29.5&open=time,near,date,relay',wait_until='networkidle');p.locator('.sc-name').wait_for();p.locator('#ls-intro').wait_for(state='hidden');p.locator('.lang-seg [data-lang="'+lang+'"]').click();p.wait_for_timeout(1000)
  # Remove other default cards through the actual selection controls.
  for btn in p.locator('.sc-chip[aria-pressed="true"]').all():
   if btn.get_attribute('data-chip') not in ['time','near','date','relay']:btn.click()
  p.locator('#ls-brief .brief-head').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.evaluate('scrollBy(0,-80)');p.screenshot(path=str(out/f'{w}_{lang}_header.png'))
  rect=lambda s:p.locator(s).bounding_box()
  near,date,relay=rect('#blk-near'),rect('#blk-date'),rect('#blk-relay')
  if w>760:assert abs(relay['width']-near['width'])<1 and abs(relay['x']-near['x'])<1
  p.locator('[data-chip="date"]').click()
  assert p.locator('#blk-date').get_attribute('aria-hidden')=='true'
  if w>760:assert abs(rect('#blk-near')['y']-rect('#blk-relay')['y'])<1
  p.locator('#blk-near').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.evaluate('scrollBy(0,-80)');p.screenshot(path=str(out/f'{w}_{lang}_reflow.png'))
  assert p.evaluate('document.documentElement.scrollWidth==document.documentElement.clientWidth')
  assert not errors
  results.append({'width':w,'lang':lang,'odd_half_width':w>760,'reflow':True,'errors':errors,'fonts':p.evaluate("({geist:document.fonts.check('13px Geist'),body:getComputedStyle(document.querySelector('#blk-near p')).fontFamily})")})
  p.close()
 b.close()
(out/'extra_checks.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf8');print(results)
