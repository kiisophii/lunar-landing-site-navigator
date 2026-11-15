"""Compare presentation results with a Git reference, sharing unchanged scientific data.
Run at repository root: python verification/sitecheck_preservation.py [base-ref]
Requires Playwright + Chromium. No production files are written.
"""
import contextlib,functools,http.server,json,subprocess,sys,tempfile,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();WEB=ROOT/'web';REF=sys.argv[1] if len(sys.argv)>1 else 'c42c515'
FILES=['js/brief.js','css/site_check.css','js/relay_panel.js','js/korea_panel.js','js/horizon_chart.js','js/local_map.js','js/date_slip.js','js/seasons.js']
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'application/javascript'}
 overlay=None
 def log_message(self,*args):pass
 def translate_path(self,path):
  actual=Path(super().translate_path(path))
  if self.overlay:
   replacement=self.overlay/actual.relative_to(WEB)
   if replacement.is_file():return str(replacement)
  return str(actual)
@contextlib.contextmanager
def server(overlay=None):
 cls=type('OverlayHandler',(Handler,),{'overlay':overlay})
 s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(cls,directory=str(WEB)))
 t=threading.Thread(target=s.serve_forever,daemon=True);t.start()
 try:yield f'http://127.0.0.1:{s.server_port}'
 finally:s.shutdown();s.server_close()
SNAP='''()=>{const r=document.querySelector('#ls-brief'),L=window.LLSN;return {window:{i0:L.window.i0,i1:L.window.i1,metrics:[...L.window.metrics]},now:L.now(),focus:L.focus,results:[...r.querySelectorAll('.ls-detail')].map(c=>({id:c.id,values:[...c.querySelectorAll('td,.sc-kv b,.det-kv b,.kpi .value,.kpi .sub,.brow .v,.hz-read')].map(e=>e.textContent.trim().replaceAll('DSN_34m','DSN 34m').replaceAll('KDSA_35m','KDSA 35m')),tables:c.querySelectorAll('table').length,canvases:c.querySelectorAll('canvas').length,controls:[...c.querySelectorAll('input,select,button[data-h],button[data-ex],button[data-z3stay]')].map(e=>({tag:e.tagName,cls:e.className,value:e.value,pressed:e.getAttribute('aria-pressed')}))})),chips:[...r.querySelectorAll('.sc-chip')].map(e=>[e.dataset.chip,e.getAttribute('aria-pressed')]),links:[...r.querySelectorAll('a[href^="http"]')].map(e=>e.href)}}'''
def snapshot(browser,url,site,lang):
 p=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce');errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 p.goto(url+'/?lang='+lang+'&sites=SHACKLETON_RIM,ARTEMIS_HAWORTH,APOLLO17&pn=1,2,3&focus='+site+'&d=2026-11-15&p=29.5&t=7645&open=time,near,date,relay,gs,hz,terrain,access,history,routes,seasons',wait_until='networkidle')
 p.locator('#ls-intro').wait_for(state='hidden',timeout=40000);p.wait_for_timeout(800)
 p.wait_for_function("document.querySelector('#blk-time .sc-raw') && document.querySelector('#blk-date .z3-day')", timeout=30000)
 original=p.evaluate(SNAP)
 # Keep original selection for equality; then exercise all available features at both revisions.
 for key in ['access','routes']:
  chip=p.locator(f'.sc-chip[data-chip="{key}"]')
  if chip.count() and chip.is_visible() and chip.get_attribute('aria-pressed')!='true' and not chip.is_disabled():chip.click()
 p.wait_for_timeout(300)
 expanded=p.evaluate(SNAP)
 p.locator('#blk-time .sc-raw > summary').click()
 p.locator('#blk-time .sc-mv').click()
 p.locator('.z3-day').fill('2026-11-18');p.locator('.z3-day').dispatch_event('change');p.locator('[data-z3stay="0"]').click()
 if p.locator('#blk-relay').get_attribute('aria-hidden')=='false':p.locator('.rl-h [data-h="30"]').click()
 p.locator('.hz-scale [data-ex="3"]').click();p.wait_for_timeout(500)
 changed=p.evaluate(SNAP)
 p.close();return {'initial':original,'expanded':expanded,'changed':changed,'errors':errors}
reports=[]
with tempfile.TemporaryDirectory(prefix='sitecheck-reference-') as tmp:
 overlay=Path(tmp)
 for f in FILES:
  dest=overlay/f;dest.parent.mkdir(parents=True,exist_ok=True)
  dest.write_bytes(subprocess.check_output(['git','show',REF+':web/'+f]))
 with server(overlay) as baseline,server() as current,sync_playwright() as pw:
  b=pw.chromium.launch(headless=True)
  for site in (sys.argv[2:] or ['SHACKLETON_RIM','ARTEMIS_HAWORTH','APOLLO17']):
   for lang in ['en','ko']:
    old=snapshot(b,baseline,site,lang);new=snapshot(b,current,site,lang);checks={}
    for stage in ['initial','expanded','changed']:
     a=old[stage];c=new[stage]
     checks[stage+'_sources_preserved']=set(a.pop('links'))<=set(c.pop('links'))
     checks[stage+'_equal']=a==c
     if a!=c:
      for key in a:
       if a[key]!=c[key]:print('DIFFERENCE',site,lang,stage,key,flush=True)
    checks['errors_zero']=not old['errors'] and not new['errors']
    reports.append({'site':site,'lang':lang,'checks':checks,'cells':sum(len(c['values']) for c in new['initial']['results']),'errors_before':old['errors'],'errors_after':new['errors']})
    print(site,lang,checks,flush=True)
  b.close()
out=ROOT/'docs/design_sync/sitecheck_reader/preservation.json';out.write_text(json.dumps({'reference':REF,'reports':reports},indent=2),encoding='utf8')
assert all(all(r['checks'].values()) for r in reports),'preservation mismatch'
