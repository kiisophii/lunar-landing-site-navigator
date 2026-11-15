from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
phase=sys.argv[1]; out=Path('docs/design_sync/sitecheck_reader')/phase;out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True)
 for lang in ['en','ko']:
  p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[]
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  p.goto('http://127.0.0.1:8060/?lang='+lang+'&sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&focus=SHACKLETON_RIM&d=2026-11-15&p=29.5&t=7645&open=time,near,date,relay,gs,hz,terrain,access,history,routes,seasons',wait_until='networkidle')
  p.locator('#ls-intro').wait_for(state='hidden',timeout=40000);p.evaluate('document.fonts.ready');p.wait_for_timeout(1600)
  p.locator('.detail-see').first.click();p.wait_for_timeout(1000)
  # snapshot all result cells (including folded raw tables), not developer prose
  snap=p.evaluate('''()=>{let r=document.querySelector('#ls-brief'), L=window.LLSN;return {window:{i0:L.window.i0,i1:L.window.i1,metrics:[...L.window.metrics]},now:L.now(),focus:L.focus,results:[...r.querySelectorAll('.ls-detail')].map(c=>({id:c.id,values:[...c.querySelectorAll('td,.sc-kv b,.det-kv b,.kpi .value,.kpi .sub,.brow .v,.hz-read')].map(e=>e.textContent.trim()),features:{tables:c.querySelectorAll('table').length,canvases:c.querySelectorAll('canvas').length,details:c.querySelectorAll('details').length},controls:[...c.querySelectorAll('input,select,button[data-h],button[data-ex],button[data-z3stay]')].map(e=>({tag:e.tagName,cls:e.className,value:e.value,pressed:e.getAttribute('aria-pressed')}))})),links:[...r.querySelectorAll('a[href^="http"]')].map(e=>e.href),text:r.innerText,controls:[...r.querySelectorAll('.sc-chip')].map(e=>[e.dataset.chip,e.getAttribute('aria-pressed')])}}''')
  (out/f'{lang}-snapshot.json').write_text(json.dumps(snap,ensure_ascii=False,indent=2),encoding='utf-8')
  for width in [1440,390]:
   p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.wait_for_timeout(400)
   for card in ['time','near','date','relay','gs','hz','terrain','access','history','routes','seasons']:
    loc=p.locator('#blk-'+card)
    if loc.count() and 'is-closed' not in (loc.get_attribute('class') or ''):
     loc.evaluate('(e)=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-60,behavior:"instant"})');p.wait_for_timeout(100)
     p.screenshot(path=str(out/f'{lang}-{width}-{card}.png'))
  (out/f'{lang}-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf-8')
  print(phase,lang,'errors',len(errors),flush=True);p.close()
 b.close()
