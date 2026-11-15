from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
OUT=Path('docs/design_sync/sitecheck_reader'); reports=[]
SCAN='''()=>{let root=document.querySelector('#ls-brief');let visible=e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden],.is-closed')};let scrollAncestor=e=>{for(let x=e.parentElement;x&&x!==root;x=x.parentElement){if(['auto','scroll'].includes(getComputedStyle(x).overflowX)&&x.scrollWidth>x.clientWidth+1)return true}return false};let info=e=>({tag:e.tagName,cls:String(e.className),text:(e.innerText||'').slice(0,80),width:e.getBoundingClientRect().width});return {overflow:document.documentElement.scrollWidth-innerWidth,root:{x:root.getBoundingClientRect().x,width:root.getBoundingClientRect().width},cards:[...root.querySelectorAll('.ls-detail')].filter(visible).map(e=>({id:e.id,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().top+scrollY,w:e.getBoundingClientRect().width})),outside:[...root.querySelectorAll('button,select,input,p,h3,h4,canvas,svg,table')].filter(visible).filter(e=>!scrollAncestor(e)).filter(e=>{let r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).map(info),clipped:[...root.querySelectorAll('button,h3,h4,label,.sc-kv > span')].filter(visible).filter(e=>{let s=getComputedStyle(e);return (e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX))||(e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY))}).map(info)}}'''
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True)
 for lang in ['en','ko']:
  p=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce'); errors=[];p.set_default_timeout(20000)
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  p.goto('http://127.0.0.1:8060/?lang='+lang+'&sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&focus=SHACKLETON_RIM&d=2026-11-15&p=29.5&t=7645&open=time,near,date,relay,gs,hz,terrain,access,history,routes,seasons',wait_until='networkidle')
  p.locator('#ls-intro').wait_for(state='hidden',timeout=40000);p.evaluate('document.fonts.ready');p.wait_for_timeout(1000)
  p.locator('.detail-see').first.click();p.wait_for_timeout(600)
  for key in ['access','routes']:
   chip=p.locator(f'.sc-chip[data-chip="{key}"]')
   if chip.get_attribute('aria-pressed')!='true':chip.click()
  for width in [1920,1500,1499,1440,1280,1100,1099,768,390]:
   p.set_viewport_size({'width':width,'height':844 if width==390 else 900});p.wait_for_timeout(400)
   r=p.evaluate(SCAN);r.update(width=width,lang=lang)
   p.locator('#ls-brief').evaluate('(e)=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"})')
   p.screenshot(path=str(OUT/'after'/f'{lang}-{width}-overview.png'))
   if width==390:
    frames=[]
    for card in ['time','near','date','relay','gs','hz','terrain','access','history','routes','seasons']:
     e=p.locator('#blk-'+card);box=e.bounding_box()
     if not box:continue
     top=e.evaluate('(e)=>e.getBoundingClientRect().top+scrollY')
     for offset in range(0,int(box['height']),700):
      p.evaluate('(y)=>window.scrollTo({top:y-55,behavior:"instant"})',top+offset)
      a=p.evaluate(SCAN)
      if a['overflow'] or a['outside'] or a['clipped']:frames.append({'card':card,'offset':offset,'overflow':a['overflow'],'outside':a['outside'],'clipped':a['clipped']})
     # Card bottoms include assumptions/sources and all newly added functionality.
     p.screenshot(path=str(OUT/'after'/f'{lang}-390-{card}-end.png'))
    r['scroll_issues']=frames
   reports.append(r);print(lang,width,'overflow',r['overflow'],'outside',len(r['outside']),'clipped',len(r['clipped']),flush=True)
  # Actual existing controls and method disclosure; no event-handler replacements.
  checks={}
  p.set_viewport_size({'width':1280,'height':900})
  p.locator('#blk-time .sc-mv').click();checks['method_open']=p.locator('#mv-time').is_visible()
  p.locator('#blk-time .sc-mv').click();checks['method_closed']=not p.locator('#mv-time').is_visible()
  p.locator('#blk-time .sc-raw > summary').click();checks['raw_open']=p.locator('#blk-time .sc-raw').get_attribute('open') is not None
  p.locator('#blk-time .sc-raw > summary').click()
  p.locator('.rl-h [data-h="30"]').click();p.wait_for_timeout(500);checks['tower_height']=p.evaluate('LLSN.relayHeight')==30
  p.locator('.rl-h [data-h="15"]').click()
  p.locator('.hz-scale [data-ex="3"]').click();checks['horizon_scale']=p.locator('.hz-scale [data-ex="3"]').get_attribute('aria-pressed')=='true'
  p.locator('.hz-scale [data-ex="1"]').click()
  p.locator('.z3-day').fill('2026-11-18');p.locator('.z3-day').dispatch_event('change');p.wait_for_timeout(300);checks['date_changed']=p.locator('.z3-day').input_value()=='2026-11-18'
  p.locator('[data-z3stay="0"]').click();checks['stay_changed']=p.locator('[data-z3stay="0"]').get_attribute('aria-pressed')=='true'
  p.locator('.lm-seg button').nth(1).click();checks['map_metric']=p.locator('.lm-seg button').nth(1).get_attribute('aria-pressed')=='true'
  # Remove near and verify that date/relay flow into the same row (no empty grid cell).
  p.locator('[data-chip="near"]').click();p.wait_for_timeout(200)
  positions=p.evaluate(SCAN)['cards'];a={c['id']:c for c in positions};checks['no_empty_slot']=abs(a['blk-date']['y']-a['blk-relay']['y'])<1
  p.locator('[data-chip="near"]').click()
  # Read all existing method bodies and disclosures to catch developer text even when folded.
  txt=p.locator('#ls-brief').text_content()
  bad=[line for line in txt.splitlines() if re.search(r'(?:web/data/|data/(?:detail|windows|local|terrain|horizon|relay|monthly|uncertainty)|pipeline/|--budget-json|tx_power_w|JSON\.stringify|integrator re-check|member check pending|reference_only)',line)]
  checks['no_developer_text']=not bad
  (OUT/f'{lang}-checks.json').write_text(json.dumps({'checks':checks,'bad_text':bad,'errors':errors},ensure_ascii=False,indent=2),encoding='utf8')
  print(lang,checks,'errors',len(errors),flush=True);p.close()
 b.close()
(OUT/'layout-audit.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf8')

for r in reports:
 assert r['overflow']==0 and not r['outside'] and not r['clipped'] and not r.get('scroll_issues'), r
 assert r['root']['width'] <= 1392.1 and r['root']['x'] >= 23.9, r['root']
 assert abs(r['root']['x'] - (r['width'] - r['root']['x'] - r['root']['width'])) < 1, r['root']
 cards={c['id']:c for c in r['cards']}
 if r['width']>=1100:
  assert abs(cards['blk-near']['y']-cards['blk-date']['y'])<1
  assert abs(cards['blk-relay']['y']-cards['blk-gs']['y'])<1
  assert abs(cards['blk-time']['w']-(2*cards['blk-hz']['w']+16))<1
 else:
  assert max(c['x'] for c in r['cards'])-min(c['x'] for c in r['cards'])<1
for lang in ['en','ko']:
 r=json.loads((OUT/f'{lang}-checks.json').read_text(encoding='utf8'))
 assert all(r['checks'].values()) and not r['errors'],r
