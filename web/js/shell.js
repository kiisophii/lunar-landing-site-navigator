// shell.js — page chrome for the 3-column layout (design spec v65 §3.1–3.3, 3.7, 3.10, 6): header, intro, panel folding,
// sort help, layer/camera toolbar, mean-map layers (948 m whole-Moon grid), click-to-place points, add-site drawer,
// scroll hint, About routing. Loaded BEFORE app.js (so the intro hears the first load events). No numbers computed here.
import { t, getLang } from './i18n.js';
import { addStrings } from './ui_shared.js';

addStrings({
  skipBelow: 'Skip to the comparison', footSources: 'Sources',
  footNote: 'All times UTC. Sun and Earth disc sizes in the 3D view are enlarged for visibility; elevation axes are exaggerated.',
  verdictNote: 'Verdict badges elsewhere use published example thresholds only (longest shadow 72 h, direct link 50 % / 90 %).',
  tbAria: 'Map layers and camera',
  addT: 'Add a landing site', close: 'Close', tabCat: 'Catalogue', tabCoord: 'Coordinates',
  catSearch: 'Search by name', catAll: 'All groups', catN: '{n} sites',
  catNote: 'Values are for the ① analysis period; sites outside the conditions are dimmed.',
  pickOnMap: '⌖ Pick on the 3D Moon', coordNote: 'The point gets its own terrain horizon, computed in your browser from LOLA / PGDA terrain, then joins the list and the comparison. No flat-horizon numbers are ever shown.',
  introSkip: 'SKIP', introLoading: 'LOADING', introTouch: 'TOUCHDOWN', computing: 'Computing the terrain horizon for your point…',
  loadFail: 'Data could not be loaded.', openTray: 'Open comparison',
}, {
  skipBelow: '비교로 건너뛰기', footSources: '출처',
  footNote: '모든 시각은 UTC. 3D의 태양·지구 원반은 보기 쉽게 크게 그렸고, 고도 축은 과장했습니다.',
  verdictNote: '다른 곳의 판정 배지는 공개한 예시 기준값만 씁니다(최장 그늘 72시간, 직접 교신 50 % / 90 %).',
  tbAria: '지도 레이어와 카메라',
  addT: '착륙지 추가', close: '닫기', tabCat: '카탈로그', tabCoord: '좌표',
  catSearch: '이름으로 찾기', catAll: '모든 종류', catN: '{n}곳',
  catNote: '값은 ① 미션 조건의 분석 기간 기준이며, 조건 밖은 흐리게 보입니다.',
  pickOnMap: '⌖ 3D 달에서 찍기', coordNote: '그 지점의 지형 지평선을 LOLA / PGDA 지형으로 브라우저에서 계산한 뒤 목록과 비교에 넣습니다. 평평한 지평선 숫자는 보여 주지 않습니다.',
  introSkip: 'SKIP', introLoading: 'LOADING', introTouch: 'TOUCHDOWN', computing: '내 지점의 지형 지평선 계산 중…',
  loadFail: '자료를 불러오지 못했습니다.', openTray: '비교 열기',
});

const $ = s => document.querySelector(s);
const LL = () => window.LLSN || {};
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ I. intro (first visit; js/luna-intro.js, Chaei Oh)
// The bar follows real loading: window load + the Moon colour map (llsn:globe) + the site data (llsn:ready).
// A failed load counts as done, and each wait is capped, so the intro can never block the app.
(function intro() {
  const el = $('#ls-intro');
  const q = new URLSearchParams(location.search);
  let seen = false; try { seen = localStorage.getItem('ls.introSeen') === '1'; } catch (e) { /* storage blocked */ }
  if (!el || !window.LunaIntro || seen || q.has('sites') || q.has('nointro') || location.hash) return;
  try { localStorage.setItem('ls.introSeen', '1'); } catch (e) { /* ignore */ }
  const when = (events, capMs, failed) => new Promise(res => {
    events.forEach(ev => window.addEventListener(ev, res, { once: true }));
    setTimeout(res, capMs);
    if (failed) { const iv = setInterval(() => { if (failed()) { clearInterval(iv); res(); } }, 250); setTimeout(() => clearInterval(iv), capMs); }
  });
  const globeFailed = () => document.getElementById('globe-stage')?.classList.contains('failed');   // no WebGL: no texture event
  window.LunaIntro.mount({
    el, label: getLang() === 'ko' ? 'Luna Sight 불러오는 중' : 'Loading Luna Sight',
    waitFor: [when(['llsn:globe', 'llsn:loadfail'], 12000, globeFailed), when(['llsn:ready', 'llsn:loadfail'], 12000)],
  });
})();

// ------------------------------------------------------------ header background on scroll, scroll hint
const head = $('.ls-head'), hint = $('.ls-scrollhint');
function onScroll() {
  const y = window.scrollY;
  head.classList.toggle('scrolled', y > 40 || document.body.classList.contains('on-about'));
  const gone = y > 40 || document.body.classList.contains('on-about');
  hint.classList.toggle('gone', gone);
  hint.tabIndex = gone ? -1 : 0;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
/** Smooth scroll to a section (instant with reduced motion), then focus its heading. */
export function goTo(sel) {
  const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return;
  el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => el.focus({ preventScroll: true }), reduced() ? 0 : 450);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#ls-compare"], a[href="#ls-brief"]');
  if (a) { e.preventDefault(); goTo(a.getAttribute('href')); }
});

// ------------------------------------------------------------ panel folding
function foldLabel(b, open) {
  const left = b.dataset.fold === 'ls-cond';
  b.textContent = open ? (left ? '‹' : '›') : (left ? '›' : `‹ ${t('openTray')}`);
  b.classList.toggle('wide', !open && !left);
  b.setAttribute('aria-label', t(open ? (left ? 'collapse' : 'collapseTray') : (left ? 'expand' : 'openTray')));
}
// ~1100–1279 px: the tray starts folded so it does not cover the Moon (≥ 1280 open; < 1100 it sits below the Moon)
if (window.innerWidth >= 1100 && window.innerWidth < 1280) {
  const tr = $('#ls-tray'), b = tr.querySelector('.ls-fold');
  tr.classList.add('folded'); b.setAttribute('aria-expanded', 'false'); foldLabel(b, false);
}
document.querySelectorAll('.ls-fold').forEach(b => b.addEventListener('click', () => {
  const box = document.getElementById(b.dataset.fold);
  const phone = window.matchMedia('(max-width: 899px)').matches && box.id === 'ls-cond';
  const open = phone ? !box.classList.contains('unfolded') : box.classList.contains('folded');
  if (phone) box.classList.toggle('unfolded', open); else box.classList.toggle('folded', !open);
  b.setAttribute('aria-expanded', String(open));
  foldLabel(b, open);
  if (open && box.id === 'ls-tray') window.dispatchEvent(new Event('resize'));   // scrubber canvas re-measures
}));

// ------------------------------------------------------------ popovers (sort help; trust.js reuses closeOnOutside)
export function popover(btn, pop) {
  const set = open => { pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', e => { e.stopPropagation(); set(pop.hidden); });
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { set(false); btn.focus(); } });
  return set;
}
popover($('#sort-help-btn'), $('#sort-help'));

// ------------------------------------------------------------ C2. toolbar: layers, camera, tooltips, pick mode
const tb = $('.ls-toolbar'), tip = tb.querySelector('.tb-tip');
tb.addEventListener('pointerover', e => { const b = e.target.closest('button[data-tip]'); if (b) showTip(b); });
tb.addEventListener('focusin', e => { const b = e.target.closest('button[data-tip]'); if (b) showTip(b); });
tb.addEventListener('pointerleave', () => { tip.hidden = true; });
tb.addEventListener('focusout', () => { tip.hidden = true; });
function showTip(b) { tip.textContent = t(b.dataset.tip); tip.hidden = false; }

// 948 m whole-Moon maps (data/gmaps_ppd32, card 14); the 3.8 km set (data/gmaps) is the fallback.
// Overview first (fast), then the finest tile level from index.json whose width fits the GPU texture limit.
let gmaps = null;
async function gmapsIndex() {
  const get = dir => fetch(`data/${dir}/index.json`, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(j => (j ? { ...j, dir } : null)).catch(() => null);
  if (!gmaps) gmaps = get('gmaps_ppd32').then(j => j || get('gmaps'));
  return gmaps;
}
const stitched = new Map();
function stitch(idx, layerId) {
  const key = `${idx.dir}/${layerId}`;
  if (stitched.has(key)) return stitched.get(key);
  const g = LL().globe, mem = navigator.deviceMemory || 8;
  const cap = Math.min(g?.maxTextureSize?.() || 8192, mem < 8 ? 4096 : 8192);
  const levels = (idx.tiles?.levels || []).filter(l => l.width <= cap && l.width > (idx.overview_size?.[0] || 0));
  const L = levels[levels.length - 1];
  if (!L) { stitched.set(key, Promise.resolve(null)); return stitched.get(key); }
  const p = (async () => {
    const cv = document.createElement('canvas'); cv.width = L.width; cv.height = L.height;
    const c2 = cv.getContext('2d'), S = idx.tiles.size, jobs = [];
    for (let y = 0; y < L.ny; y++) for (let x = 0; x < L.nx; x++) {
      const url = `data/${idx.dir}/` + idx.tiles.url.replace('{layer}', layerId).replace('{z}', L.z).replace('{x}', x).replace('{y}', y);
      jobs.push(new Promise((res, rej) => { const im = new Image(); im.onload = () => { c2.drawImage(im, x * S, y * S); res(); }; im.onerror = rej; im.src = url; }));
    }
    await Promise.all(jobs);
    return { canvas: cv, level: L };
  })().catch(() => null);
  stitched.set(key, p);
  return p;
}
let layer = 'light';
async function setLayer(k) {
  const g = LL().globe; if (!g) return;
  layer = k;
  tb.querySelectorAll('button[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layer === k)));
  const leg = $('#map-legend');
  if (k === 'light') { leg.hidden = true; await g.setColorMap(null); return; }
  const idx = await gmapsIndex();
  const L = idx?.layers?.find(x => x.id === k);
  if (!L) { leg.hidden = true; return; }
  await g.setColorMap(`data/${idx.dir}/${L.overview}`, { flat: true });
  const stops = L.colormap.map(([v, c]) => `${c} ${v * 100}%`).join(', ');
  const kmpx = lv => (2 * Math.PI * 1737.4 / lv).toFixed(2);
  const draw = lvl => {
    leg.hidden = false;
    leg.innerHTML = `<div>${esc(t(k === 'sun' ? 'legendMean' : 'legendEarth'))} <span class="chip-st long">${esc(t('chipLong'))}</span></div>
      <div class="bar" style="background:linear-gradient(90deg, ${stops})"></div><div class="ends"><span>0%</span><span>50%</span><span>100%</span></div>
      <div class="muted" style="margin-top:3px">${esc(L.definition)} · ${esc(fill(t('gmRes'), { c: idx.grid_res_km, d: kmpx(lvl) }))} · ${esc(idx.dem_sources?.map(d => d.name).join(' + ') || '')}</div>`;
  };
  draw(idx.overview_size?.[0] || 4096);
  const st = await stitch(idx, k);
  if (st && layer === k) { await g.setColorMap(st.canvas, { flat: true }); draw(st.level.width); }
}
addStrings({ gmRes: 'computed on a {c} km grid, shown at {d} km/px' }, { gmRes: '{c} km 격자로 계산, 화면은 {d} km/px' });
addStrings({ chipLong: 'long-term 2026–2030' }, { chipLong: '장기 평균 2026–2030' });
tb.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.layer) setLayer(b.dataset.layer);
  if (b.dataset.tool === 'pick') setPick(b.getAttribute('aria-pressed') !== 'true');
});
window.addEventListener('llsn:lang', () => { if (layer !== 'light') setLayer(layer); });

let picking = false;
function setPick(on) {
  picking = on;
  tb.querySelector('[data-tool="pick"]').setAttribute('aria-pressed', String(on));
  $('#ls-pickbar').hidden = !on;
  $('.ls-screen').classList.toggle('picking', on);
}
$('#pick-cancel').addEventListener('click', () => setPick(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && picking) setPick(false); });
// a click (not a drag) on the globe while picking → custom point (custom_site.js computes the horizon in a Worker)
let down = null;
const stage = $('#globe-stage');
stage.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
stage.addEventListener('pointerup', e => {
  if (!picking || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const g = LL().globe; if (!g?.screenToLatLon) return;
  const ll = g.screenToLatLon(e.clientX, e.clientY); if (!ll) return;
  setPick(false);
  showComputing();
  LL().pickPoint?.(Math.round(ll.lat * 1e4) / 1e4, Math.round(ll.lon * 1e4) / 1e4, { compute: true });
}, true);
function showComputing() {
  const bar = $('#ls-pickbar');
  bar.hidden = false; bar.firstElementChild.textContent = t('computing');
  bar.querySelector('#pick-cancel').hidden = true;
  const st = document.querySelector('#llsn-custom .cu-status');
  const stop = () => { bar.hidden = true; bar.firstElementChild.textContent = t('pickOn'); bar.querySelector('#pick-cancel').hidden = false; };
  if (!st) { setTimeout(stop, 4000); return; }
  const mo = new MutationObserver(() => { if (!/…|\.\.\./.test(st.textContent)) { stop(); mo.disconnect(); } });
  mo.observe(st, { childList: true, characterData: true, subtree: true });
  setTimeout(() => { mo.disconnect(); stop(); }, 120000);
}

// ------------------------------------------------------------ 3.10 add-site drawer
const drawer = $('#ls-add');
drawer.innerHTML = `
  <div class="ls-card-head"><h2 id="add-h">${esc(t('addT'))}</h2><button type="button" class="ls-icon add-x" aria-label="${esc(t('close'))}">×</button></div>
  <div class="ls-tabs" role="tablist"><button type="button" role="tab" data-tab="cat" aria-selected="true">${esc(t('tabCat'))}</button><button type="button" role="tab" data-tab="coord" aria-selected="false">${esc(t('tabCoord'))}</button></div>
  <div class="tab-cat" role="tabpanel">
    <div style="display:flex;gap:6px"><input type="search" class="cat-q" style="flex:1" aria-label="${esc(t('catSearch'))}" placeholder="${esc(t('catSearch'))}"><select class="cat-g" aria-label="group"></select></div>
    <p class="lsn-note cat-n"></p><ul class="add-list"></ul><p class="lsn-note">${esc(t('catNote'))}</p>
  </div>
  <div class="tab-coord" role="tabpanel" hidden>
    <p class="lsn-note">${esc(t('coordNote'))}</p>
    <button type="button" class="ls-btn add-pick" style="margin:8px 0">${esc(t('pickOnMap'))}</button>
    <section id="llsn-custom" class="panel"></section>
  </div>`;
let lastOpener = null;
function openDrawer(tab = 'cat') {
  lastOpener = document.activeElement;
  drawer.hidden = false; selectTab(tab); renderCat();
  (tab === 'cat' ? drawer.querySelector('.cat-q') : drawer.querySelector('#llsn-custom input'))?.focus();
}
function closeDrawer() { drawer.hidden = true; lastOpener?.focus?.(); }
function selectTab(k) {
  drawer.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
  drawer.querySelector('.tab-cat').hidden = k !== 'cat'; drawer.querySelector('.tab-coord').hidden = k !== 'coord';
}
drawer.addEventListener('click', e => {
  if (e.target.closest('.add-x')) closeDrawer();
  const tbn = e.target.closest('[role=tab]'); if (tbn) selectTab(tbn.dataset.tab);
  if (e.target.closest('.add-pick')) { closeDrawer(); setPick(true); }
  const pb = e.target.closest('.add-pin'); if (pb) { LL().togglePin?.(pb.dataset.id); renderCat(); }
  const go = e.target.closest('.add-go'); if (go) { LL().pick?.(go.dataset.id); }
});
drawer.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
$('#add-open').addEventListener('click', () => openDrawer('cat'));
drawer.querySelector('.cat-q').addEventListener('input', renderCat);
drawer.querySelector('.cat-g').addEventListener('change', renderCat);
const pctTxt = f => (f == null || !isFinite(f) ? '—' : `${Math.round(f * 100)}%`);
function renderCat() {
  const st = LL().state, w = LL().window; if (!st || !w || drawer.hidden) return;
  const gsel = drawer.querySelector('.cat-g');
  const groups = [...new Set(st.sites.map(s => s.group))];
  if (gsel.options.length !== groups.length + 1) {
    const v = gsel.value;
    gsel.innerHTML = `<option value="all">${esc(t('catAll'))}</option>` + groups.map(g => `<option value="${g}">${esc(t('g_' + g))}</option>`).join('');
    gsel.value = v || 'all';
  }
  const q = drawer.querySelector('.cat-q').value.trim().toLowerCase(), g = gsel.value;
  const name = s => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name);
  const list = st.sites.filter(s => (g === 'all' || s.group === g) && (!q || `${s.name} ${s.name_ko || ''} ${s.short || ''} ${s.id}`.toLowerCase().includes(q)));
  const pass = LL().filterPass;
  drawer.querySelector('.cat-n').textContent = fill(t('catN'), { n: list.length });
  drawer.querySelector('.add-list').innerHTML = list.map(s => {
    const m = w.metrics.get(s.id), n = LL().pinNo?.(s.id);
    return `<li class="${pass && !pass.has(s.id) ? 'out' : ''}"><button type="button" class="ls-link add-go" data-id="${s.id}" style="text-align:left;color:var(--text);text-decoration:none">
      ${n ? `<span class="pin-no">#${n}</span>` : ''}${esc(name(s))}<br><small class="muted">${esc(t('g_' + s.group))}</small></button>
      <span class="num"><span class="v sun">☼ ${m && !m.pending ? pctTxt(m.sun_frac) : '—'}</span> <span class="v earth">◍ ${m && !m.pending ? pctTxt(m.earth_frac) : '—'}</span></span>
      <button type="button" class="ls-icon add-pin" data-id="${s.id}" aria-pressed="${!!n}" aria-label="${esc(t(n ? 'unpin' : 'pin'))}" style="${n ? 'background:var(--text);color:var(--bg)' : ''}">${n ? '✓' : '+'}</button></li>`;
  }).join('');
}
['llsn:window', 'llsn:pins', 'llsn:filter', 'llsn:lang', 'llsn:sites'].forEach(ev => window.addEventListener(ev, renderCat));
window.LLSN = window.LLSN || {};

// ------------------------------------------------------------ About routing (#about, #about-*)
let aboutLoaded = false;
async function route() {
  const on = /^#about/.test(location.hash);
  const wasOn = document.body.classList.contains('on-about');
  document.body.classList.toggle('on-about', on);
  $('#view-about').hidden = !on;
  if (on) {
    if (!aboutLoaded) { aboutLoaded = true; await import('./about.js').catch(e => console.error('about failed', e)); }
    window.dispatchEvent(new CustomEvent('llsn:about'));
    const target = location.hash.length > 6 ? document.getElementById(location.hash.slice(1)) : null;
    if (target) { target.closest('details')?.setAttribute('open', ''); target.scrollIntoView(); } else window.scrollTo(0, 0);
    $('#view-about h1')?.focus({ preventScroll: true });
  } else if (wasOn) {
    const foot = $('.ls-foot'); if (foot && foot.parentNode !== document.body) $('#view-about').after(foot);   // about.js docks it in #abScroll
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));          // the globe canvas was hidden: let it re-measure
  }
  onScroll();
}
window.addEventListener('hashchange', route);
route();
// core.js replaces window.LLSN when it loads (after this module), so publish the helpers again once data is ready
const publish = () => { window.LLSN.openAdd = openDrawer; window.LLSN.goTo = goTo; };
publish();
window.addEventListener('llsn:ready', publish);

// ------------------------------------------------------------ version in the footer
fetch('version.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { $('#ls-ver').textContent = `v${j.v}`; }).catch(() => {});
