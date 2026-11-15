import asyncio,json,subprocess
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('docs/design_sync/about_chaei48');OUT.mkdir(parents=True,exist_ok=True)
BASE=subprocess.check_output(['git','show','6056b17:web/css/about_layout.css']).decode('utf-8')
async def main():
 results=[]
 async with async_playwright() as p:
  for width in (1440,1280,390):
   for lang in ('en','ko'):
    browser=await p.chromium.launch();page=await browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    await page.route('**/css/about_layout.css',lambda route:route.fulfill(body=BASE,content_type='text/css'))
    await page.goto('http://127.0.0.1:8021/#about');await page.wait_for_selector('#about-more');await page.wait_for_timeout(300)
    if lang=='ko':await page.locator('[data-lang="ko"]').click();await page.wait_for_timeout(200)
    before_text=await page.locator('#view-about').inner_text();before_hero=await page.locator('.ab-hero').bounding_box()
    await page.unroute('**/css/about_layout.css');await page.reload();await page.wait_for_selector('#about-more');await page.wait_for_timeout(300)
    assert before_text==await page.locator('#view-about').inner_text()
    hero=await page.locator('.ab-hero').bounding_box();assert hero['height']==before_hero['height']
    data=await page.evaluate('''()=>{const root=document.querySelector('#view-about'),sc=document.querySelector('#abScroll'),title=root.querySelector('.abh-text'),sec=root.querySelector('.ab-sec');const style=e=>getComputedStyle(e),rect=e=>e.getBoundingClientRect();return {gutter:style(sc).paddingLeft,heroX:rect(title).left,bodyX:rect(sec).left,cols:style(sec).gridTemplateColumns,headings:[...root.querySelectorAll('.ab-sec h2')].map(e=>({size:style(e).fontSize,weight:style(e).fontWeight,line:style(e).lineHeight,margin:style(e).margin})),cards:[...root.querySelectorAll('.ab-steps,.ab-cards,.ab-trust')].map(g=>[...g.children].map(e=>({y:rect(e).top,h:rect(e).height,pY:e.querySelector('p')?rect(e.querySelector('p')).top:null}))),overflow:document.documentElement.scrollWidth>innerWidth||sc.scrollWidth>sc.clientWidth,borders:[...root.querySelectorAll('.ab-hero,.ab-sec:not(#about-why),.ls-panel,.ab-trust>div,details')].map(e=>({color:style(e).borderBottomColor,width:style(e).borderBottomWidth,top:style(e).borderTopColor}))}}''')
    assert data['heroX']==data['bodyX'],data
    assert data['gutter']==f'{round(width*.04)}px',data
    assert all(h==dict(size='30px',weight='600',line='44px',margin='0px') for h in data['headings']),data
    for cards in data['cards']:
     for a in cards:
      for b in cards:
       if abs(a['y']-b['y'])<1:
        assert abs(a['h']-b['h'])<1,cards
        if a['pY'] is not None and b['pY'] is not None:assert abs(a['pY']-b['pY'])<1,cards
    assert not data['overflow'],data
    assert all((b['color'] if b['width']!='0px' else b['top'])=='rgba(255, 255, 255, 0.08)' for b in data['borders']),data['borders']
    await page.screenshot(path=str(OUT/f'top_{width}_{lang}.png'))
    await page.evaluate("()=>{const s=document.querySelector('#abScroll');s.scrollTop=document.querySelector('#about-steps').offsetTop-s.offsetTop}")
    await page.screenshot(path=str(OUT/f'cards_{width}_{lang}.png'))
    await page.locator('#about-more details').evaluate_all('(es)=>es.forEach(e=>e.open=true)')
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.querySelector("#abScroll").scrollWidth<=document.querySelector("#abScroll").clientWidth')
    assert not errors,errors
    results.append(dict(width=width,lang=lang,errors=errors,hero_height=hero['height'],copy_unchanged=True,**data));print(width,lang,'PASS',flush=True)
    await browser.close()
 (OUT/'checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
asyncio.run(main())
