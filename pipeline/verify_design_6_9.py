"""Browser checks for bundles 6/9. Start the static web server with JS MIME types.
Usage: python pipeline/verify_design_6_9.py http://127.0.0.1:8020
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/design_sync/jiyong_6_9'
URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8020').rstrip('/')
QUERY = '/?nointro&sites=ARTEMIS_HAWORTH,APOLLO17,PEAK_NEAR_SHACKLETON&d=2026-11-14&p=29.5'

def run():
    OUT.mkdir(exist_ok=True)
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width, height in [(1920,1080),(1440,900),(1280,800),(1100,800),(390,844)]:
            page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce')
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(URL+QUERY,wait_until='domcontentloaded')
            page.wait_for_selector('.cmp-detail-table .r-slope .val',timeout=60000)
            page.wait_for_selector('.tl-svg',timeout=30000)
            page.locator('#ls-compare').evaluate('(e)=>e.scrollIntoView({block:"start"})')
            page.wait_for_timeout(300)
            assert page.locator('.cmp-detail-table thead th[data-id]').count()==3
            assert page.locator('.cmp-detail-table .r-relay .best').count()==0
            assert page.locator('#ls-compare .dial-card').count()==0
            assert page.locator('#ls-compare > details').is_hidden()
            assert page.locator('.r-slope td').nth(1).inner_text()=='Data needed'
            axes=page.locator('.r-plots td svg').evaluate_all('(es)=>es.map(e=>[...e.querySelectorAll("text")].map(t=>t.textContent))')
            assert axes[0]==axes[1]==axes[2], axes
            geometry=page.evaluate('''() => ({title:document.querySelector('#cmp-h').getBoundingClientRect().top,
                tableWidth:document.querySelector('.cmp-detail-table').getBoundingClientRect().width,
                pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
                background:getComputedStyle(document.querySelector('.ls-below')).backgroundColor})''')
            assert geometry['title']>=64, geometry
            assert not geometry['pageOverflow'],geometry
            assert geometry['background']=='rgb(2, 3, 6)',geometry
            if width==1440: assert abs(geometry['tableWidth']-1148)<1,geometry
            if width==1100: assert geometry['tableWidth']<=1025,geometry
            page.screenshot(path=str(OUT/f'comparison_{width}.png'))
            help_button=page.locator('.measure-help summary').first
            help_button.click()
            assert page.locator('.measure-help').first.get_attribute('open') is not None
            help_button.press('Escape')
            assert page.locator('.measure-help').first.get_attribute('open') is None
            # Shared chart keyboard reading.
            page.locator('.r-plots td').first.focus()
            assert page.locator('.cmp-tooltip').is_visible()
            assert 'UTC' in page.locator('.cmp-tooltip').inner_text()
            page.locator('#cmp-h').click()
            # Lane-aware timeline readings, including the narrow ground-station band.
            timeline=page.locator('.tl-svg')
            timeline.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            box=timeline.bounding_box()
            view=timeline.evaluate('(e)=>({w:e.viewBox.baseVal.width,h:e.viewBox.baseVal.height,lw:+e.querySelector(".tl-needle").dataset.lw})')
            page.mouse.move(box['x']+(view['lw']+25)/view['w']*box['width'],box['y']+55/view['h']*box['height'])
            page.wait_for_function('document.querySelector(".cmp-tooltip").textContent.includes("Yeoju ground station")')
            assert 'UTC' in page.locator('.cmp-tooltip').inner_text()
            # Map and details actions retain the selected site.
            page.locator('[data-map="ARTEMIS_HAWORTH"]').click()
            page.wait_for_timeout(150)
            assert page.evaluate('scrollY')<10
            page.locator('#ls-compare').evaluate('(e)=>e.scrollIntoView()')
            page.locator('.cmp-detail[data-why="APOLLO17"]').click()
            page.wait_for_timeout(150)
            assert page.evaluate('window.LLSN.focus')=='APOLLO17'
            # Return, unpin a middle candidate, and verify contiguous numbering.
            page.locator('#ls-compare').evaluate('(e)=>e.scrollIntoView()')
            page.locator('.cmp-detail-table .unpin[data-id="APOLLO17"]').click()
            assert page.locator('.cmp-detail-table thead .pin-no').all_text_contents()==['#1','#2']
            # Language switch also updates the new table and labels.
            page.locator('[data-lang="ko"]').first.click()
            assert page.locator('#cmp-h').inner_text()=='상세 비교'
            assert '지도에서 보기' in page.locator('.cmp-detail-table').inner_text()
            page.locator('#ls-compare').evaluate('(e)=>e.scrollIntoView()')
            page.screenshot(path=str(OUT/f'comparison_{width}_ko.png'))
            assert not errors,errors
            results.append({'width':width,'height':height,'geometry':geometry,'shared_axes':axes[0],'page_errors':errors,'checks':'table, missing slope, no relay winner, shared scale, chart focus, KDSA lane hover, popover Escape, map/details actions, unpin numbering, Korean, overflow, hidden legacy all-sites table'})
            page.close()
        page=browser.new_page(viewport={'width':1440,'height':900})
        page.goto(URL+'/?nointro&sites=APOLLO11,APOLLO17&d=2026-11-14&p=14',wait_until='domcontentloaded')
        page.wait_for_selector('.cmp-detail-table .r-earth .val',timeout=60000)
        assert page.locator('.cmp-detail-table .r-earth td.best').count()==0,'Tied Earth values must not be highlighted'
        page.locator('#ls-compare').evaluate('(e)=>e.scrollIntoView({behavior:"instant"})')
        page.wait_for_timeout(100)
        assert 'revealed' in page.locator('#ls-pages').get_attribute('class')
        page.wait_for_timeout(2000)
        assert 'revealed' not in page.locator('#ls-pages').get_attribute('class')
        page.locator('#ls-pages a').nth(1).focus()
        page.wait_for_function('getComputedStyle(document.querySelectorAll("#ls-pages a > span")[1]).opacity === "1"')
        assert page.locator('#ls-pages a > span').nth(1).evaluate('(e)=>getComputedStyle(e).opacity')=='1'
        results.append({'ties':'pass','rail_auto_hide':'pass','rail_keyboard_reveal':'pass'})
        browser.close()
    (OUT/'checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results,indent=2))

if __name__=='__main__':run()
