// globe_app.js — integrator glue between the page (app.js events) and the whole-Moon 3D globe (globe3d.js).
// Loaded first from modules.json. globe3d.js (and three.js from the CDN) is imported dynamically, so if WebGL or the
// CDN is unavailable the rest of the page keeps working and the globe panel shows a short message instead.
//
//   app selected time  ('llsn:time')            -> globe.setTime(i)       real Sun lighting, Sun/Earth markers
//   picker / card click, focus ('llsn:focus')   -> globe.focusSite(id)    fly there
//   globe marker click ('siteclick')            -> LLSN.pick(id)          comparison card + horizon panorama + period table
//   language ('llsn:lang')                      -> globe.setLang()
// The display exaggeration stays at ×3 (team decision 11/14); globe3d.js shows the persistent note.
import { addStrings, whenReady, translate, LLSN, mapSiteColors } from './ui_shared.js';
import { t, getLang } from './i18n.js';

addStrings({
  glTitle: '3D Moon — zoom in for more terrain detail',
  glWhole: 'Whole Moon', glSouth: 'South pole', glFocus: 'Focused site',
  glZoomIn: 'Zoom in', glZoomOut: 'Zoom out', glViews: 'Globe views',
  glLoading: 'Loading 3D Moon…', glTiles: 'Loading terrain', glFail: '3D view unavailable in this browser (WebGL). All numbers below still work.',
  glWheel: 'Ctrl + scroll to zoom', glWheelMac: '⌘ + scroll to zoom',
  glToAnalysis: 'Analysis window ↓',
  glHint: 'Drag = move · right-drag or Shift-drag = rotate & tilt · wheel / pinch = zoom (click the globe first) · click a site marker to analyze it below. ' +
    'Lighting and shadows use the selected time. Sun/Earth icons are enlarged. Terrain: LOLA LDEM_64 (1 km) everywhere, SLDEM2015 / PGDA patches (to 34–67 m) around catalogue sites.',
}, {
  glTitle: '3D 달 — 확대할수록 지형이 자세해진다',
  glWhole: '달 전체', glSouth: '남극', glFocus: '선택한 착륙지',
  glZoomIn: '확대', glZoomOut: '축소', glViews: '지구본 보기',
  glLoading: '3D 달 불러오는 중…', glTiles: '지형 불러오는 중', glFail: '이 브라우저에서는 3D 보기를 쓸 수 없다(WebGL). 아래 수치는 그대로 쓸 수 있다.',
  glWheel: 'Ctrl + 스크롤로 확대', glWheelMac: '⌘ + 스크롤로 확대',
  glToAnalysis: '분석 기간 ↓',
  glHint: '드래그 = 이동 · 오른쪽 드래그 또는 Shift 드래그 = 회전·기울이기 · 휠/핀치 = 확대 (먼저 지구본 클릭) · 착륙지 표시를 누르면 아래에서 분석. ' +
    '빛과 그림자는 선택한 시각 기준. 해·지구 아이콘은 크게 그림. 지형: 전체 LOLA LDEM_64(1 km), 착륙지 주변은 SLDEM2015 / PGDA(34–67 m).',
});

const $ = s => document.querySelector(s);
const sec = $('#llsn-globe');
const stage = $('#globe-stage');
let g = null;
let lastFly = { id: null, t: 0 };

function siteById(id) { return LLSN().state?.sites.find(s => s.id === id); }

/** Fly to a site (deduplicated: a click and the focus event it causes start only one flight). */
const GV_HOLD = (window.__llsnGV || new URLSearchParams(location.search).get('gv')) ? performance.now() + 4000 : 0;   // ?gv=: ignore automatic focus flights while the page starts
function flySite(id, force = false) {
  if (!g || !id || !siteById(id)) return;
  if (!force && performance.now() < GV_HOLD) return;
  const now = performance.now();
  if (!force && lastFly.id === id && now - lastFly.t < 2500) return;
  lastFly = { id, t: now };
  g.focusSite(id, { range: 45, tilt: 55 });
}

function initialView(focus) {
  const p = window.__llsnGV ?? new URLSearchParams(location.search).get('gv');      // ?gv=lat,lon,range,tilt,heading (read only; captured by shell.js)
  if (p) {
    const [lat, lon, range, tilt, heading] = p.split(',').map(Number);
    if ([lat, lon, range].every(isFinite)) return { lat, lon, range, tilt: tilt || 0, heading: heading || 0 };
  }
  const s = siteById(focus);
  return { lat: s ? Math.max(-30, Math.min(30, s.lat)) : 10, lon: s ? s.lon : 20, range: 6500, tilt: 0, heading: 0 };
}

// ------------------------------------------------------------ progress (light, never blocks the page)
const prog = stage.querySelector('.gl-progress');
function showProgress(text) {
  prog.hidden = !text;
  if (text) prog.querySelector('.txt').textContent = text;
}

let hintTimer = 0, hintLast = 0;
function wheelHint() {
  const now = performance.now();
  if (now - hintLast < 4000) return;
  hintLast = now;
  const h = stage.querySelector('.gl-hint');
  h.textContent = t(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'glWheelMac' : 'glWheel'); h.hidden = false;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { h.hidden = true; }, 2200);
}

// ------------------------------------------------------------ mirrored time strip under the globe
function wireTimeStrip() {
  if (!$('#gl-slider')) return;              // 3-column layout: one scrubber in the comparison tray (app.js)
  const sl = $('#gl-slider'), lab = $('#gl-time'), play = $('#gl-play'), mainPlay = $('#play'), mainSl = $('#slider');
  const syncRange = () => { sl.min = mainSl.min; sl.max = mainSl.max; sl.step = mainSl.step; sl.value = mainSl.value; };
  const syncPlay = () => { play.textContent = mainPlay.textContent; play.setAttribute('aria-pressed', mainPlay.getAttribute('aria-pressed') || 'false'); };
  syncRange(); syncPlay();
  lab.textContent = $('#time-label').textContent;
  sl.addEventListener('input', () => (LLSN().setTimeSoon || LLSN().setTime)(Number(sl.value)));
  play.addEventListener('click', () => mainPlay.click());
  new MutationObserver(syncPlay).observe(mainPlay, { attributes: true, childList: true, characterData: true, subtree: true });
  window.addEventListener('llsn:window', syncRange);
  window.addEventListener('llsn:time', e => {
    if (document.activeElement !== sl) sl.value = e.detail.i;
    lab.textContent = $('#time-label').textContent;
  });
  window.addEventListener('llsn:lang', syncPlay);
}

// ------------------------------------------------------------ boot
async function start() {
  translate(sec);
  wireTimeStrip();
  showProgress(t('glLoading'));
  const st = LLSN().state;
  const focus = LLSN().focus;
  let createGlobe;
  try {
    ({ createGlobe } = await import('./globe3d.js'));
    g = await createGlobe(stage, {
      base: st.base || 'data/',
      hour: LLSN().now(),
      sites: st.sites, ephem: st.ephem, ephemMeta: st.ephemMeta,
      lang: getLang(),
      wheelNeedsFocus: true, wheelNeedsCtrl: true,
      hud: false,
      // site names stay clear of the floating panels (3-column layout): px covered at the left / right / top of the stage
      // map area = between the left panel and the tray (desktop layout); chips stay inside it, the 3D centre sits in its middle
      chipInsets: () => {
        const st = stage.getBoundingClientRect(), L = document.querySelector('.ls-left')?.getBoundingClientRect(), T = document.querySelector('.ls-tray')?.getBoundingClientRect();
        if (window.innerWidth < 1100 || !L || !T) return {};
        return { left: Math.max(0, L.right + 20 - st.left), right: Math.max(0, st.right - T.left + 20), top: 64 - st.top, bottom: 20 };
      },
      centerShift: w => {
        if (window.innerWidth < 1100) return 0;
        const L = document.querySelector('.ls-left')?.getBoundingClientRect(), T = document.querySelector('.ls-tray')?.getBoundingClientRect();
        if (!L || !T) return 0;
        const cx = (L.right + 20 + T.left - 20) / 2;
        return w / 2 - cx;
      },
      labelBlockers: () => ['.map-legend:not([hidden])', '.ls-hud #hud-1', '.ls-hud #hud-2', '#globe-stage .g3-note', '.ls-minimap', '#sp-btn', '#globe-stage .gl-zoom']
        .map(sel => document.querySelector(sel)).filter(e => e && e.offsetParent !== null).map(e => e.getBoundingClientRect()).filter(r => r.width && r.height),
      labelInsets: () => {
        const st = stage.getBoundingClientRect(), r = sel => document.querySelector(sel)?.getBoundingClientRect();
        const L = r('.ls-left'), T = r('.ls-tray'), H = r('.ls-head');
        const over = b => b && b.width && b.top < st.bottom && b.bottom > st.top && b.left < st.right && b.right > st.left;
        return { left: over(L) && L.left < st.left + st.width / 2 ? L.right - st.left : 0,
                 right: over(T) && T.right > st.left + st.width / 2 ? st.right - T.left : 0,
                 top: H ? Math.max(0, H.bottom - st.top) : 0 };
      },                 // layout HUD lines live in index.html (.ls-hud); the ×3 note stays
      // off-screen Sun/Earth chips never cover these (all other page UI is outside the globe stage)
      avoid: ['#globe-stage .gl-zoom', '#globe-stage .gl-progress', '#globe-stage .gl-hint', '#globe-stage .g3-site',
        '.ls-head', '.ls-left', '.ls-tray', '.ls-minimap', '.ls-toolbar', '.ls-hud .hud-t', '#hud-1', '#sp-btn', '#map-legend', '#globe-stage .g3-note', '.ls-drawer:not([hidden])'],
      view: initialView(focus),
    });
  } catch (e) {
    console.warn('globe3d unavailable:', e);
    showProgress('');
    stage.classList.add('failed');
    stage.querySelector('.gl-hint').textContent = t('glFail');
    stage.querySelector('.gl-hint').hidden = false;
    return;
  }
  window.LLSN.globe = g;
  stage.classList.add('ready');
  window.dispatchEvent(new CustomEvent('llsn:globe', { detail: { globe: g } }));

  // app -> globe
  window.addEventListener('llsn:time', e => g.setTime(e.detail.i));
  window.addEventListener('llsn:focus', e => flySite(e.detail.id));
  window.addEventListener('llsn:lang', () => { g.setLang(getLang()); translate(sec); });
  ['#pk-list', '#pk-pinned'].forEach(sel => $(sel)?.addEventListener('click', e => { const b = e.target.closest('.pk-item'); if (b) flySite(b.dataset.id, true); }));
  $('#cards')?.addEventListener('click', e => {
    if (e.target.closest('.rm')) return;
    const c = e.target.closest('.card[data-id]'); if (c) flySite(c.dataset.id, true);
  });
  $('#cards')?.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-id]')) flySite(e.target.dataset.id, true);
  });

  // globe -> app (globe3d already flies to the clicked marker)
  g.on('siteclick', s => { lastFly = { id: s.id, t: performance.now() }; LLSN().pick?.(s.id); });
  g.on('wheelhint', wheelHint);

  // view buttons + zoom buttons
  // the camera buttons live in the bottom toolbar (outside this section): listen on the document
  document.addEventListener('click', e => {
    const v = e.target.closest('.ls-toolbar [data-view], .gl-views [data-view]')?.dataset.view; if (!v) return;
    if (v === 'whole') { const c = g.getView(); g.flyTo({ lat: Math.max(-30, Math.min(30, c.lat)), lon: c.lon, range: 6500, tilt: 0, heading: 0 }); }
    else if (v === 'south') g.flyTo({ lat: -89, lon: 0, range: 420, tilt: 35, heading: 0 });
    else if (v === 'focus') flySite(LLSN().focus, true);
  });
  // 18-1: the dock's − / + buttons zoom by the same step as the keyboard + / − keys
  document.addEventListener('click', e => {
    const z = e.target.closest?.('.ls-toolbar [data-zoom]')?.dataset.zoom; if (!z) return;
    const v = g.getView();
    g.flyTo({ range: Math.max(0.3, Math.min(25000, v.range * (z === 'in' ? 0.8 : 1.25))) }, 180);
  });
  stage.querySelector('.gl-zoom')?.addEventListener('click', e => {
    const z = e.target.closest('button')?.dataset.zoom; if (!z) return;
    const v = g.getView();
    g.flyTo({ range: Math.max(0.3, Math.min(25000, v.range * (z === 'in' ? 0.5 : 2))) }, 500);
  });

  // light progress indicator while tiles stream in
  setInterval(() => {
    const n = g.stats.pending || 0;
    showProgress(n ? `${t('glTiles')} · ${n}` : '');
  }, 250);
}

whenReady(start);

// Comparison labels keep their numbered list colours; other labels/dots share the minimap palette.
function markPinnedLabels() {
  const L = window.LLSN || {}, colors = mapSiteColors();
  document.querySelectorAll('#globe-stage .g3-site').forEach(b => {
    const id = b.dataset.siteId, n = id ? L.pinNo?.(id) : null;
    const color = colors.get(id);
    b.toggleAttribute('data-map-color', !!color);
    if (color) b.style.setProperty('--map-site-color', color); else b.style.removeProperty('--map-site-color');
    if (n) { b.dataset.n = n; b.style.setProperty('--sc', `var(--c${n})`); } else { delete b.dataset.n; b.style.removeProperty('--sc'); }
  });
}
['llsn:pins', 'llsn:globe', 'llsn:ready', 'llsn:sites', 'llsn:sort', 'llsn:window', 'llsn:lang', 'llsn:relay'].forEach(ev => window.addEventListener(ev, () => setTimeout(markPinnedLabels, 0)));
