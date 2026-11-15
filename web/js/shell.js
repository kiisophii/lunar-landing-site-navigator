// shell.js — page chrome for the 3-column layout (design spec v65 §3.1–3.3, 3.7, 3.10, 6): header, intro, panel folding,
// sort help, layer/camera toolbar, mean-map layers (948 m whole-Moon grid), click-to-place points, add-site drawer,
// scroll hint, About routing. Loaded BEFORE app.js (so the intro can count real data requests). No numbers computed here.
import { t, getLang } from './i18n.js';
import { addStrings } from './ui_shared.js';
import { enhanceSelect, autoEnhance } from './ui_select.js';
// ?gv= (shared camera) is read here, before app.js rewrites the address bar, so the late-loading globe still gets it
window.__llsnGV = new URLSearchParams(location.search).get('gv');

// sort = text-button dropdown (Chaei #8); every other select = the one box dropdown (Chaei #12)
enhanceSelect(document.getElementById('sort'), { variant: 'text', align: 'left' });
autoEnhance(document.body);

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

// ------------------------------------------------------------ I. intro (first visit, ≤ 3 s, real progress)
(function intro() {
  const el = $('#ls-intro');
  const q = new URLSearchParams(location.search);
  let seen = false; try { seen = localStorage.getItem('ls.introSeen') === '1'; } catch (e) { /* storage blocked */ }
  if (seen || reduced() || q.has('sites') || q.has('nointro') || location.hash) return;
  try { localStorage.setItem('ls.introSeen', '1'); } catch (e) { /* ignore */ }
  // real progress: completed data/ requests of the first load (sites, ephemeris, horizon index, 33 horizons)
  let done = 0, expect = 37, ready = false;
  const orig = window.fetch.bind(window);
  window.fetch = (...a) => {
    const p = orig(...a);
    const u = String(a[0]?.url || a[0]);
    if (/data\/(sites|ephem|horizon)/.test(u)) p.then(r => { done++; if (/sites\.json/.test(u)) r.clone().json().then(j => { expect = 4 + j.length; }).catch(() => {}); }).catch(() => { done++; });
    return p;
  };
  el.hidden = false;
  el.innerHTML = `<div class="stars"></div><button type="button" class="skip">${t('introSkip')} ⏩</button>
    <div class="moon"><svg class="lander" viewBox="0 0 34 30" aria-hidden="true"><path d="M10 4h14l3 10H7z M7 14h20v4H7z M9 18l-5 10M25 18l5 10M3 28h4M27 28h4M17 18v4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div>
    <div class="bar"><i></i></div>
    <div class="word"><b>LUNA SIGHT</b><span>Lunar Landing Site Navigator</span></div>
    <div class="pct num">${t('introLoading')} 000%</div><div class="clock num">T+ 00:00.00</div>`;
  const t0 = performance.now();
  let raf = 0, finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf); window.fetch = orig;
    el.classList.add('done'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 400);
    window.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Escape') finish(); };
  el.addEventListener('click', finish);
  window.addEventListener('keydown', onKey);
  window.addEventListener('llsn:ready', () => { ready = true; });
  window.addEventListener('llsn:loadfail', finish);
  const tick = () => {
    const ms = performance.now() - t0;
    const pct = ready ? 100 : Math.min(99, Math.round((done / expect) * 100));
    el.querySelector('.bar i').style.width = pct + '%';
    el.querySelector('.clock').textContent = `T+ ${String(Math.floor(ms / 60000)).padStart(2, '0')}:${(ms / 1000 % 60).toFixed(2).padStart(5, '0')}`;
    if (ready || ms > 2100) { el.classList.add('touch'); el.querySelector('.pct').textContent = ready ? t('introTouch') : `${t('introLoading')} ${String(pct).padStart(3, '0')}%`; }
    else el.querySelector('.pct').textContent = `${t('introLoading')} ${String(pct).padStart(3, '0')}%`;
    if (ms > 3000 || (ready && ms > 1600)) { finish(); return; }          // never longer than 3 s
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
})();

// ------------------------------------------------------------ header background on scroll, scroll hint
const head = $('.ls-head'), hint = $('.ls-scrollhint');   // the pill was removed (5-1); hint may be null
function onScroll() {
  const y = window.scrollY;
  head.classList.toggle('scrolled', y > 40 || document.body.classList.contains('on-about'));
  const gone = y > 40 || document.body.classList.contains('on-about');
  hint?.classList.toggle('gone', gone);
  if (hint) hint.tabIndex = gone ? -1 : 0;
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
const CHEV = up => `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${up ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function foldLabel(b, open) {
  const left = b.dataset.fold === 'ls-cond';
  if (left) { b.innerHTML = CHEV(open); b.setAttribute('aria-label', t(open ? 'collapse' : 'expand')); return; }
  b.textContent = open ? (left ? '‹' : '›') : (left ? '›' : `‹ ${t('openTray')}`);
  b.classList.toggle('wide', !open && !left);
  b.setAttribute('aria-label', t(open ? (left ? 'collapse' : 'collapseTray') : (left ? 'expand' : 'openTray')));
}
// The tray has no fold button any more (Chaei #18): it is sized to its content and always open.
document.querySelectorAll('.ls-fold').forEach(b => b.addEventListener('click', () => {
  const box = document.getElementById(b.dataset.fold);
  const phone = window.matchMedia('(max-width: 899px)').matches && box.id === 'ls-cond';
  const open = phone ? !box.classList.contains('unfolded') : box.classList.contains('folded');
  if (phone) box.classList.toggle('unfolded', open); else box.classList.toggle('folded', !open);
  if (box.id === 'ls-cond' && b.dataset.userClick === '1') {
    if (open) requestAnimationFrame(() => box.querySelector('.ls-foldable input, .ls-foldable .dd-btn, .ls-foldable select')?.focus());
    else b.focus();
  }
  delete b.dataset.userClick;
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
// hover / focus name tag = the button's short name (Chaei #21); the long explanation stays for screen readers
function showTip(b) { tip.textContent = t(b.dataset.i18nAria || b.dataset.tip); tip.hidden = false; tip.style.left = `${b.offsetLeft + b.offsetWidth / 2}px`; }
function describeToolbar() {
  tb.querySelectorAll('button[data-tip]').forEach((b, k) => {
    let d = document.getElementById(`tbd-${k}`);
    if (!d) { d = document.createElement('span'); d.id = `tbd-${k}`; d.className = 'sr'; tb.append(d); b.setAttribute('aria-describedby', d.id); }
    d.textContent = t(b.dataset.tip);
  });
}
describeToolbar();
window.addEventListener('llsn:lang', describeToolbar);
window.addEventListener('llsn:ready', describeToolbar);

// ------------------------------------------------------------ short status toast (Chaei #35) + new tray column flash (#20)
let toastT = 0;
export function toast(msg) {
  const el = document.getElementById('ls-toast'); if (!el) return;
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800);
}
window.addEventListener('llsn:toast', e => toast(e.detail?.text || t(e.detail?.key || '')));
let lastPins = null;
window.addEventListener('llsn:pins', e => {
  const now = (e.detail?.pins || []).map(p => p.id);
  if (lastPins) {
    const site = id => LL().state?.sites?.find(s => s.id === id);
    const nm = id => { const s = site(id); return s ? (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name) : id; };
    const added = now.filter(id => !lastPins.includes(id)), removed = lastPins.filter(id => !now.includes(id));
    if (added.length === 1) toast(fill(t('toastPinned'), { n: nm(added[0]) }));
    else if (removed.length === 1 && !added.length) toast(fill(t('toastUnpinned'), { n: nm(removed[0]) }));
    if (added.length) setTimeout(() => flashColumns(added), 350);
  }
  lastPins = now;
});
function flashColumns(ids) {
  for (const id of ids) {
    const th = document.querySelector(`#tray-body th[data-id="${CSS.escape(id)}"]`); if (!th) continue;
    const k = th.cellIndex, tbl = th.closest('table');
    for (const row of tbl.rows) row.cells[k]?.classList.add('col-flash');
    setTimeout(() => tbl.querySelectorAll('.col-flash').forEach(c => c.classList.remove('col-flash')), 700);
  }
}

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
let layer = 'light', layerNoted = false;
// a long-term (time-independent) layer is on and the user moves the time: say so once, offer Sunlight (Chaei #22)
window.addEventListener('llsn:time', () => {
  if (layer === 'light' || layerNoted) return;
  layerNoted = true;
  const n = document.getElementById('ls-layernote'); if (!n) return;
  n.querySelector('.ln-txt').textContent = t('layerStatic');
  const b = n.querySelector('.ln-btn'); b.textContent = t('layerToLight');
  b.onclick = () => { n.hidden = true; setLayer('light'); };
  n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 6000);
});
async function setLayer(k) {
  layerNoted = false; const ln = document.getElementById('ls-layernote'); if (ln && k === 'light') ln.hidden = true;
  tb.classList.toggle('time-off', k !== 'light');                // the time block folds for time-independent layers
  if (k === 'relief') {                                            // terrain shading only: neutral grey over the LOLA hillshade
    layer = k; tb.querySelectorAll('button[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layer === k)));
    const g0 = LL().globe; if (!g0) return;
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 2; const c2 = cv.getContext('2d'); c2.fillStyle = '#9a9aa0'; c2.fillRect(0, 0, 4, 2);
    await g0.setColorMap(cv, { flat: true });
    const leg = $('#map-legend'); leg.hidden = false;
    leg.innerHTML = `<div>${esc(t('lgRelief'))}</div><div class="muted" style="margin-top:3px">${esc(t('lgReliefNote'))}</div>`;
    return;
  }
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

// ------------------------------------------------------------ three screens (Chaei #26): page indicator on the right edge
(() => {
  const nav = document.getElementById('ls-pages'); if (!nav) return;
  let railTimer;
  const reveal = () => { nav.classList.add('revealed'); clearTimeout(railTimer); railTimer = setTimeout(() => nav.classList.remove('revealed'), 1800); };
  window.addEventListener('scroll', reveal, { passive: true });
  const targets = { map: () => document.querySelector('.ls-screen'), cmp: () => document.getElementById('ls-compare'), brief: () => document.getElementById('ls-brief') };
  nav.addEventListener('click', e => {
    const a = e.target.closest('a[data-page]'); if (!a) return;
    e.preventDefault();
    const el = targets[a.dataset.page]();
    if (a.dataset.page === 'map') window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); else el?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  });
  const mark = () => {
    const y = window.scrollY + window.innerHeight * 0.4;
    let cur = 'map';
    for (const k of ['cmp', 'brief']) { const el = targets[k](); if (el && el.getBoundingClientRect().top + window.scrollY <= y) cur = k; }
    nav.querySelectorAll('a').forEach(a => { if (a.dataset.page === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  };
  window.addEventListener('scroll', mark, { passive: true }); window.addEventListener('resize', mark); mark();
})();

// ------------------------------------------------------------ detailed comparison table (Chaei #27): arrow buttons + drag to scroll columns
(() => {
  const host = document.querySelector('#ls-compare .cmp-dyn'); if (!host) return;
  const arrows = () => {
    const wrap = host.querySelector('.big-cmp'); if (!wrap || wrap.classList.contains('synced-comparison') || wrap.querySelector('.cmp-arrows')) return;
    const sc = wrap.querySelector('.cmp-scroll'); if (!sc) return;
    wrap.insertAdjacentHTML('afterbegin', `<div class="cmp-arrows"><button type="button" class="ls-btn" data-dir="-1" aria-label="${t('colPrev')}">‹</button><button type="button" class="ls-btn" data-dir="1" aria-label="${t('colNext')}">›</button></div>`);
    const upd = () => {
      const [a, b] = wrap.querySelectorAll('.cmp-arrows button');
      a.disabled = sc.scrollLeft <= 1; b.disabled = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
      wrap.querySelector('.cmp-arrows').hidden = sc.scrollWidth <= sc.clientWidth + 1;
    };
    wrap.querySelector('.cmp-arrows').addEventListener('click', e => {
      const b = e.target.closest('button[data-dir]'); if (!b) return;
      const col = sc.querySelector('thead th:not(.lbl)')?.getBoundingClientRect().width || 178;
      sc.scrollBy({ left: Number(b.dataset.dir) * col, behavior: 'smooth' });
    });
    sc.addEventListener('scroll', upd, { passive: true }); new ResizeObserver(upd).observe(sc); upd();
    // mouse drag (touch already scrolls natively); clicks on buttons/links still work
    let d = null;
    sc.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a, [role=button], input, select')) return; d = { x: e.clientX, l: sc.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 3) { d.moved = true; sc.classList.add('dragging'); } sc.scrollLeft = d.l - dx; });
    window.addEventListener('pointerup', () => { if (d) { sc.classList.remove('dragging'); d = null; } });
  };
  new MutationObserver(arrows).observe(host, { childList: true, subtree: true }); arrows();
})();
addStrings({ colPrev: 'Previous columns', colNext: 'Next columns', pgCmp: 'Compare' }, { colPrev: '이전 열', colNext: '다음 열', pgCmp: '비교' });

// ------------------------------------------------------------ bottom toolbar time parts (the copy's bar): ticks, UTC chip, speed stepper
(() => {
  const H0 = Date.UTC(2026, 0, 1), d = i => new Date(H0 + i * 3600e3);
  const p2 = n => String(n).padStart(2, '0');
  const md = i => { const x = d(i); return `${p2(x.getUTCMonth() + 1)}.${p2(x.getUTCDate())}`; };
  const ticks = () => {
    const w = LL().window, el = document.getElementById('tl-ticks'); if (!w || !el) return;
    const span = w.i1 - w.i0 || 1, days = Math.floor(span / 24);
    let html = '';
    for (let dd = 0; dd <= days; dd++) { const f = (dd * 24) / span; html += `<i class="tk${dd % 7 === 0 ? ' big' : ''}" style="left:${(f * 100).toFixed(2)}%"></i>`; }
    html += [0, 0.5, 1].map(f => `<span class="lb" style="left:${f * 100}%">${md(Math.round(w.i0 + span * f))}</span>`).join('');
    el.innerHTML = html;
    const per = document.getElementById('tray-period');
    if (per) { const a = d(w.i0), b = d(w.i1); per.textContent = `${a.toISOString().slice(0, 10)} – ${p2(b.getUTCMonth() + 1)}-${p2(b.getUTCDate())} · UTC · ${(Math.round(w.days * 10) / 10)}${getLang() === 'ko' ? '일' : ' d'}`; }
  };
  const chip = e => { const i = e?.detail?.i ?? LL().time; if (i == null) return; const x = d(Math.floor(i)); const el = document.getElementById('utc-val'); if (el) el.textContent = `${md(i)} ${p2(x.getUTCHours())}h`; };
  window.addEventListener('llsn:window', ticks); window.addEventListener('llsn:time', chip); window.addEventListener('llsn:ready', () => { ticks(); chip(); });
  popover($('#utc-chip'), $('#utc-pop'));
  // speed: ‹ 6h/s › stepper over the native select (app.js keeps reading #speed)
  const sel = document.getElementById('speed'), val = document.getElementById('speed-val');
  const show = () => { val.textContent = sel.options[sel.selectedIndex]?.textContent || ''; };
  document.querySelector('.tb-speed')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-sp]'); if (!b) return;
    sel.selectedIndex = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + Number(b.dataset.sp)));
    sel.dispatchEvent(new Event('change', { bubbles: true })); show();
  });
  show();
  // tray top: n / 10, description per view
  const trayInfo = () => {
    const n = document.getElementById('tray-n'); if (n) n.textContent = (LL().pins?.() || []).length;
    const v = document.querySelector('#tray-view [aria-pressed="true"]')?.dataset.v || 'table';
    const desc = document.getElementById('tray-desc'); if (desc) desc.textContent = v === 'table' ? t('trayDescTable') : '';
  };
  ['llsn:pins', 'llsn:ready', 'llsn:lang'].forEach(ev => window.addEventListener(ev, trayInfo));
  document.getElementById('tray-view')?.addEventListener('click', () => setTimeout(trayInfo, 0));
  window.addEventListener('llsn:lang', ticks);
})();

// ------------------------------------------------------------ (1) folded summary card (the copy): folds when a site is added to the comparison
(() => {
  const box = document.getElementById('ls-cond'), sum = document.getElementById('c1-sum'), fb = box?.querySelector('.ls-fold'); if (!box || !sum || !fb) return;
  const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  const fillS = () => {
    const w = LL().window; if (!w) return;
    const x = new Date(Date.UTC(2026, 0, 1) + w.i0 * 3600e3);
    const day = getLang() === 'ko' ? `${x.getUTCMonth() + 1}월 ${x.getUTCDate()}일` : `${MON.en[x.getUTCMonth()]} ${x.getUTCDate()}`;
    const per = document.getElementById('c1-period'); const pt = per?.options[per.selectedIndex]?.textContent || '';
    void pt; const days = Math.round(w.days * 10) / 10;
    document.getElementById('c1-sum-1').textContent = `${fill(t('c1Landing'), { d: day })} · ${days}${getLang() === 'ko' ? '일' : ' d'}`;
    const on = [...document.querySelectorAll('#llsn-filters .fc-val')].filter(o => !o.classList.contains('unset') && o.dataset.k)
      .map(o => `${o.closest('.fc-cell').querySelector('.fc-lbl').textContent} ${o.textContent}`);
    document.getElementById('c1-sum-2').innerHTML = (on.length ? on : [t('c1NoCond')]).map(c => `<i>${c.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</i>`).join('') + `<button type="button" class="c1-add">${t('c1AddCond')}</button>`;
  };
  const sync = () => { const folded = box.classList.contains('folded'); sum.hidden = !folded; if (folded) fillS(); };
  new MutationObserver(sync).observe(box, { attributes: true, attributeFilter: ['class'] });
  sum.addEventListener('click', e => { if (e.target.closest('.c1-add')) fb.click(); });
  foldLabel(fb, !box.classList.contains('folded'));
  // first view: when sites are already in the comparison, start with the conditions folded (the copy)
  window.addEventListener('llsn:ready', () => setTimeout(() => {
    if ((LL().pins?.() || []).length && !box.classList.contains('folded') && !window.matchMedia('(max-width: 1099px)').matches) fb.click();
  }, 0), { once: true });
  ['llsn:window', 'llsn:filter', 'llsn:lang'].forEach(ev => window.addEventListener(ev, () => { if (!sum.hidden) fillS(); }));
  let last = null;
  window.addEventListener('llsn:pins', e => {
    const n = (e.detail?.pins || []).length;
    if (last != null && n > last && !box.classList.contains('folded') && !window.matchMedia('(max-width: 1099px)').matches) fb.click();
    last = n;
  });
  sync();
})();

// time label follows the handle (the calculation time is always on screen while the time block is open)
(() => {
  const nd = document.getElementById('scrub-needle'), lab = document.getElementById('utc-chip'); if (!nd || !lab) return;
  const place = () => { lab.style.left = nd.style.left || '0%'; };
  new MutationObserver(place).observe(nd, { attributes: true, attributeFilter: ['style'] }); place();
})();

document.getElementById('sp-btn')?.addEventListener('click', () => document.querySelector('.ls-toolbar [data-view="south"]')?.click());

// relay pill tooltip follows the language
(() => { const rp = document.querySelector('.relay-pill'); if (!rp) return; const set = () => { rp.title = t('relayPillTip'); };
  ['llsn:ready', 'llsn:lang'].forEach(ev => window.addEventListener(ev, set)); set(); })();

// a real click / key press on the conditions toggle (not the automatic fold) moves focus as in the copy
document.querySelectorAll('.ls-fold[data-fold="ls-cond"]').forEach(b => b.addEventListener('pointerdown', () => { b.dataset.userClick = '1'; }, true));
document.querySelectorAll('.ls-fold[data-fold="ls-cond"]').forEach(b => b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') b.dataset.userClick = '1'; }, true));
document.getElementById('c1-sum')?.addEventListener('pointerdown', () => { const b = document.querySelector('.ls-fold[data-fold="ls-cond"]'); if (b) b.dataset.userClick = '1'; }, true);

// time display info (5-5): the ephemeris note lives in the i button next to the time
(() => { const b = document.getElementById('hud-i'); if (!b) return; const set = () => { b.title = t('hudSrc'); b.setAttribute('aria-label', t('hudSrc')); };
  ['llsn:ready', 'llsn:lang'].forEach(ev => window.addEventListener(ev, set)); set(); })();

// Export PDF (5-9): the browser's print dialog; @media print in layout.css lays out the comparison, details and sources
(() => { const b = document.getElementById('pdf-btn'); if (!b) return;
  const set = () => { b.title = t('exportPdfTip'); }; ['llsn:ready', 'llsn:lang'].forEach(ev => window.addEventListener(ev, set)); set();
  b.addEventListener('click', () => window.print()); })();
