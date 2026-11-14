// globe_app.js — integrator glue between the page (app.js events) and the whole-Moon 3D globe (globe3d.js).
// Loaded first from modules.json. globe3d.js (and three.js from the CDN) is imported dynamically, so if WebGL or the
// CDN is unavailable the rest of the page keeps working and the globe panel shows a short message instead.
//
//   app selected time  ('llsn:time')            -> globe.setTime(i)       real Sun lighting, Sun/Earth markers
//   picker / card click, focus ('llsn:focus')   -> globe.focusSite(id)    fly there
//   globe marker click ('siteclick')            -> LLSN.pick(id)          comparison card + horizon panorama + period table
//   language ('llsn:lang')                      -> globe.setLang()
// The display exaggeration stays at ×3 (team decision 11/14); globe3d.js shows the persistent note.
import { addStrings, whenReady, translate, LLSN } from './ui_shared.js';
import { t, getLang } from './i18n.js';

addStrings({
  glTitle: '3D Moon — zoom in for more terrain detail',
  glWhole: 'Whole Moon', glSouth: 'South pole', glFocus: 'Focused site',
  glZoomIn: 'Zoom in', glZoomOut: 'Zoom out', glViews: 'Globe views',
  glLoading: 'Loading 3D Moon…', glTiles: 'Loading terrain', glFail: '3D view unavailable in this browser (WebGL). All numbers below still work.',
  glWheel: 'Click the globe first, then scroll to zoom (or use + / −).',
  glToAnalysis: 'Analysis window ↓',
  glHint: 'Drag = move · right-drag or Shift-drag = rotate & tilt · wheel / pinch = zoom (click the globe first) · click a site marker to analyse it below. ' +
    'Lighting and shadows use the selected time. Sun/Earth icons are enlarged. Terrain: LOLA LDEM_64 (1 km) everywhere, SLDEM2015 / PGDA patches (to 34–67 m) around catalogue sites.',
}, {
  glTitle: '3D 달 — 확대할수록 지형이 자세해진다',
  glWhole: '달 전체', glSouth: '남극', glFocus: '선택한 착륙지',
  glZoomIn: '확대', glZoomOut: '축소', glViews: '지구본 보기',
  glLoading: '3D 달 불러오는 중…', glTiles: '지형 불러오는 중', glFail: '이 브라우저에서는 3D 보기를 쓸 수 없다(WebGL). 아래 수치는 그대로 쓸 수 있다.',
  glWheel: '지구본을 먼저 클릭한 뒤 스크롤하면 확대된다 (+ / − 버튼도 가능).',
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
function flySite(id, force = false) {
  if (!g || !id || !siteById(id)) return;
  const now = performance.now();
  if (!force && lastFly.id === id && now - lastFly.t < 2500) return;
  lastFly = { id, t: now };
  g.focusSite(id, { range: 45, tilt: 55 });
}

function initialView(focus) {
  const p = new URLSearchParams(location.search).get('gv');      // ?gv=lat,lon,range,tilt,heading (read only)
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
  h.textContent = t('glWheel'); h.hidden = false;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { h.hidden = true; }, 2200);
}

// ------------------------------------------------------------ mirrored time strip under the globe
function wireTimeStrip() {
  const sl = $('#gl-slider'), lab = $('#gl-time'), play = $('#gl-play'), mainPlay = $('#play'), mainSl = $('#slider');
  if (!sl || !lab || !play) return;            // 3-column layout: the time controls live in the right panel only
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
      wheelNeedsFocus: true,
      // off-screen Sun/Earth chips never cover these (all other page UI is outside the globe stage)
      avoid: ['#globe-stage .gl-zoom', '#globe-stage .gl-progress', '#globe-stage .gl-hint', '#globe-stage .g3-site'],
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

  // app -> globe
  window.addEventListener('llsn:time', e => g.setTime(e.detail.i));
  window.addEventListener('llsn:focus', e => flySite(e.detail.id));
  window.addEventListener('llsn:lang', () => { g.setLang(getLang()); translate(sec); });
  $('#pk-list').addEventListener('click', e => { const b = e.target.closest('.pk-item'); if (b) flySite(b.dataset.id, true); });
  $('#cards').addEventListener('click', e => {
    if (e.target.closest('.rm')) return;
    const c = e.target.closest('.card[data-id]'); if (c) flySite(c.dataset.id, true);
  });
  $('#cards').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-id]')) flySite(e.target.dataset.id, true);
  });

  // globe -> app (globe3d already flies to the clicked marker)
  g.on('siteclick', s => { lastFly = { id: s.id, t: performance.now() }; LLSN().pick?.(s.id); });
  g.on('wheelhint', wheelHint);

  // view buttons + zoom buttons
  sec.querySelector('.gl-views').addEventListener('click', e => {
    const v = e.target.closest('button')?.dataset.view;
    if (v === 'whole') { const c = g.getView(); g.flyTo({ lat: Math.max(-30, Math.min(30, c.lat)), lon: c.lon, range: 6500, tilt: 0, heading: 0 }); }
    else if (v === 'south') g.flyTo({ lat: -89, lon: 0, range: 420, tilt: 35, heading: 0 });
    else if (v === 'focus') flySite(LLSN().focus, true);
  });
  stage.querySelector('.gl-zoom').addEventListener('click', e => {
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
