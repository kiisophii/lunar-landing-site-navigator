// custom_site.js — user-defined landing point (challenge objective 1: "user-defined coordinates").
// Type a latitude / longitude or click the mini map; the horizon mask is computed in a Web Worker
// (custom_horizon_worker.js + hterrain.js) from web/data/hterrain/ and the point joins the comparison like any site.
//
// Other views can hand a point to this panel:
//   window.LLSN.pickPoint(lat, lon, { compute: true })      or
//   window.dispatchEvent(new CustomEvent('llsn:pickpoint', { detail: { lat, lon, compute } }))
// A 3D globe registered as window.LLSN.globe with on('pick', ({lat, lon}) => …) is hooked automatically.
import * as core from './core.js';
import { t } from './i18n.js';
import { addStrings, whenReady, translate, cssVar, setFocus, LLSN } from './ui_shared.js';

addStrings({
  cuTitle: 'Your own landing point', cuAria: 'Add a landing point by coordinates',
  cuLat: 'Latitude (°, north +)', cuLon: 'Longitude (°, east +)', cuName: 'Name (optional)', cuNamePh: 'e.g. Plan B',
  cuAdd: 'Compute horizon and compare', cuMapAria: 'Moon map: click to pick a point',
  cuMapHint: 'Click the map to pick a point (double-click to compute at once). Dots = catalogue sites, rings = your points.',
  cuBusy: 'Computing the terrain horizon in the background…', cuFetch: 'Fetching terrain tiles…',
  cuDone: 'Horizon ready', cuTiles: 'tiles', cuErr: 'Could not compute the horizon',
  cuBad: 'Latitude must be −90…90 and longitude −180…180.',
  cuRes: 'Outside available polar coverage: browser terrain from LOLA LDEM_64 at ~948 m to 150 km, then LDEM_16 (~1.9 km) to 300 km; curvature included, observer 2 m. This is coarser than the catalogue sites (5–240 m near the south pole).',
  cuErrLbl: 'Expected error of that ~948 m grid', cuErrTxt: 'against {n} south-polar catalogue horizons the mask differs by {med}° RMS (median, max {max}°); sunlight over 2026–2030 by {sun} pp (median, up to {sunmax} pp on peaks and rims). On plains a 474 m grid changes the mask by ≤ {full}°. Use it for screening, not for final siting.',
  cuName0: 'Point',
  cuResPolar: 'South-polar path (points at or south of {edge}): NASA PGDA terrain {levels}, then LDEM_64 (~948 m) to 150 km and LDEM_16 to 300 km; march starts 5 m from the observer (as the catalogue sites).',
  cuAccPolar: 'measured against the catalogue method (PGDA 5–240 m terrain, horizon.py) at {n} test points in {band}: mask {med}° RMS (median, worst {max}°); sunlight 2026–2030 differs by {sun} pp (median, up to {sunmax} pp). Target: median ≤ {tr}° and every point ≤ {tp} pp.',
  cuResNorth: 'North-polar path (points at or north of {edge}): NASA PGDA terrain {levels}, then global LOLA terrain to 300 km; march starts 5 m from the observer.',
  cuAccNorth: 'North-polar high-resolution terrain was not used for this result. This point uses global LOLA terrain; the measured north-polar accuracy does not apply.',
  cuAccNorthUnknown: 'North-polar terrain was used, but measured accuracy for this latitude band is unavailable. Treat this result as approximate.',
  cuAccNorthMeasured: 'measured against original PGDA terrain (independent full-ray reference) at {n} test points in {band}: mask {med}° RMS (median, worst {max}°); sunlight 2026–2030 differs by {sun} pp (median, up to {sunmax} pp). Target: median ≤ {tr}° and every point ≤ {tp} pp.',
  cuNorthLimit: 'This band has not met the accuracy target; treat its sunlight and terrain horizon as approximate.',
  cuKnownLimit: 'Known limit: at PEAK_NEAR_SHACKLETON (a sharp south-polar peak) the browser gives {pp} pp more sunlight than the catalogue method, over the {tp} pp target — treat sunlight on sharp peaks/rims above 85° S as approximate.',
  cuAccLbl: 'Accuracy at this point', cuLow: 'Lower accuracy here', cuOk: 'Within target',
}, {
  cuTitle: '내가 정한 착륙 지점', cuAria: '좌표로 착륙 지점 추가',
  cuLat: '위도 (°, 북 +)', cuLon: '경도 (°, 동 +)', cuName: '이름 (선택)', cuNamePh: '예: 대안 B',
  cuAdd: '지평선 계산하고 비교하기', cuMapAria: '달 지도: 눌러서 지점 고르기',
  cuMapHint: '지도를 누르면 지점이 골라진다(두 번 누르면 바로 계산). 점 = 목록 착륙지, 고리 = 내 지점.',
  cuBusy: '뒤에서 지형 지평선을 계산하는 중…', cuFetch: '지형 타일 받는 중…',
  cuDone: '지평선 계산 끝', cuTiles: '타일', cuErr: '지평선을 계산하지 못함',
  cuBad: '위도는 −90…90, 경도는 −180…180 이어야 한다.',
  cuRes: '제공되는 극지 지형 범위 밖: 브라우저 지형은 150 km까지 LOLA LDEM_64 약 948 m, 300 km까지 LDEM_16(약 1.9 km). 곡률 포함, 관측자 2 m. 목록 착륙지(남극 근처 5–240 m)보다 거칠다.',
  cuErrLbl: '그 ~948 m 격자의 예상 오차', cuErrTxt: '남극 목록 착륙지 {n}곳의 지평선과 비교하면 마스크 차이 {med}° RMS(중앙값, 최대 {max}°), 2026–2030 햇빛 비율 차이 {sun}%p(중앙값, 봉우리·능선에서는 최대 {sunmax}%p). 평지에서는 474 m 격자와의 차이가 {full}° 이하. 후보 거르기용이지 최종 착륙지 결정용이 아니다.',
  cuName0: '지점',
  cuResPolar: '남극 경로({edge} 이남 지점): 지점 근처는 NASA PGDA 지형 {levels}, 그다음 150 km까지 LDEM_64(~948 m), 300 km까지 LDEM_16. 목록 착륙지처럼 관측자 5 m 앞부터 계산.',
  cuKnownLimit: '알려진 한계: 남극의 뾰족한 봉우리인 PEAK_NEAR_SHACKLETON에서는 브라우저 햇빛 비율이 목록 착륙지 방식보다 {pp}%p 높아 목표({tp}%p)를 넘는다. 85° S 이남의 뾰족한 봉우리·테두리 햇빛은 근사값으로 봐야 한다.',
  cuAccPolar: '목록 착륙지 방식(PGDA 5–240 m 지형, horizon.py)과 {band} 시험 지점 {n}곳에서 비교: 마스크 차이 {med}° RMS(중앙값, 최악 {max}°), 2026–2030 햇빛 비율 차이 {sun}%p(중앙값, 최대 {sunmax}%p). 목표: 중앙값 ≤ {tr}°, 모든 지점 ≤ {tp}%p.',
  cuResNorth: '북극 경로({edge} 이북 지점): NASA PGDA 지형 {levels}, 그다음 300 km까지 전역 LOLA 지형. 관측자 5 m 앞부터 계산.',
  cuAccNorth: '이 계산에는 북극 고해상도 지형을 사용하지 않았다. 전역 LOLA 지형을 사용한 결과이므로 북극 고해상도 경로의 측정 정확도는 적용되지 않는다.',
  cuAccNorthUnknown: '북극 지형을 사용했지만 이 위도 구간의 정확도 측정 결과가 없다. 이 결과는 근사값으로 봐야 한다.',
  cuAccNorthMeasured: '원본 PGDA 지형(독립적인 전체 광선 기준값)과 {band} 시험 지점 {n}곳에서 비교: 마스크 차이 {med}° RMS(중앙값, 최악 {max}°), 2026–2030 햇빛 비율 차이 {sun}%p(중앙값, 최대 {sunmax}%p). 목표: 중앙값 ≤ {tr}°, 모든 지점 ≤ {tp}%p.',
  cuNorthLimit: '이 구간은 정확도 목표를 충족하지 못했다. 햇빛 비율과 지형 지평선은 근사값으로 봐야 한다.',
  cuAccLbl: '이 지점의 정확도', cuLow: '여기는 정확도 낮음', cuOk: '목표 안',
});

let sec, latIn, lonIn, nameIn, statusEl, canvas, img = null, worker = null, seq = 0, val = null;
const pending = new Map();
let picked = null;


function init() {
  sec = document.getElementById('llsn-custom');
  if (!sec) { sec = document.createElement('section'); sec.id = 'llsn-custom'; sec.className = 'panel'; document.getElementById('picker')?.after(sec); }
  sec.dataset.i18nAria = 'cuAria';
  sec.innerHTML = `
    <h2 data-i18n="cuTitle"></h2>
    <div class="cu-grid">
      <div>
        <form class="cu-form" novalidate>
          <label><span data-i18n="cuLat"></span><input class="cu-lat" type="number" step="any" min="-90" max="90" placeholder="-85.94" required></label>
          <label><span data-i18n="cuLon"></span><input class="cu-lon" type="number" step="any" min="-180" max="180" placeholder="-0.94" required></label>
          <label><span data-i18n="cuName"></span><input class="cu-name" type="text" maxlength="24" data-ph="cuNamePh"></label>
          <button type="submit" class="cu-go" data-i18n="cuAdd"></button>
        </form>
        <p class="cu-status" role="status" aria-live="polite"></p>
        <p class="hint cu-res" data-i18n="cuRes"></p>
        <p class="hint cu-err"></p>
        <p class="hint cu-respolar"></p>
        <p class="cu-acc" aria-live="polite"></p>
      </div>
      <figure class="cu-map">
        <canvas tabindex="0" role="img" data-i18n-aria="cuMapAria"></canvas>
        <figcaption class="hint" data-i18n="cuMapHint"></figcaption>
      </figure>
    </div>`;
  const st = document.createElement('style');
  st.dataset.owner = 'custom_site.js';
  st.textContent = `
    #llsn-custom .cu-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.4fr); gap: var(--gap); align-items: start; }
    @media (max-width: 760px) { #llsn-custom .cu-grid { grid-template-columns: 1fr; } }
    #llsn-custom .cu-form { display: flex; flex-wrap: wrap; gap: .5em var(--gap); align-items: end; }
    #llsn-custom .cu-form label { display: flex; flex-direction: column; gap: .2em; font-size: .85rem; color: var(--muted); }
    #llsn-custom .cu-form input { font: inherit; font-family: var(--font-num); color: var(--text); background: var(--surface-2);
      border: 1px solid var(--border); border-radius: 8px; padding: .3em .5em; width: 9em; }
    #llsn-custom .cu-form input.cu-name { font-family: var(--font); }
    #llsn-custom .cu-form input:invalid:not(:placeholder-shown) { border-color: var(--warn); }
    #llsn-custom .cu-go { background: var(--relay); color: var(--bg); border-color: var(--relay); font-weight: 700; }
    #llsn-custom .cu-go:disabled { opacity: .5; cursor: progress; }
    #llsn-custom .cu-status { min-height: 1.4em; margin: .6em 0 0; font-family: var(--font-num); font-size: .9rem; }
    #llsn-custom .cu-status.err { color: var(--warn); }
    #llsn-custom .cu-err b, #llsn-custom .cu-acc b { color: var(--text); }
    #llsn-custom .cu-acc { font-size: .85rem; color: var(--muted); margin: .4em 0 0; }
    #llsn-custom .cu-acc:empty, #llsn-custom .cu-respolar:empty { display: none; }
    #llsn-custom .cu-badge { display: inline-block; font-weight: 700; font-size: .78rem; padding: .05em .6em; margin-right: .4em;
      border-radius: 999px; border: 1px solid var(--warn); color: var(--warn); }
    #llsn-custom .cu-badge.ok { border-color: var(--relay); color: var(--relay); }
    #llsn-custom .cu-map { margin: 0; }
    #llsn-custom .cu-map canvas { display: block; width: 100%; aspect-ratio: 2 / 1; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface-2); cursor: crosshair; }
    #llsn-custom .cu-map canvas:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }`;
  document.head.appendChild(st);
  latIn = sec.querySelector('.cu-lat'); lonIn = sec.querySelector('.cu-lon'); nameIn = sec.querySelector('.cu-name');
  statusEl = sec.querySelector('.cu-status'); canvas = sec.querySelector('canvas');
  relabel();

  sec.querySelector('.cu-form').addEventListener('submit', e => { e.preventDefault(); submit(); });
  for (const inp of [latIn, lonIn]) inp.addEventListener('input', () => { picked = readInputs(); drawMap(); });
  canvas.addEventListener('click', e => { const p = mapPoint(e); setInputs(p.lat, p.lon); });
  canvas.addEventListener('dblclick', e => { const p = mapPoint(e); setInputs(p.lat, p.lon); submit(); });
  canvas.addEventListener('keydown', e => {                       // arrow keys move the picked point by 1°
    const p = readInputs() || { lat: 0, lon: 0 }, d = e.shiftKey ? 10 : 1;
    const mv = { ArrowUp: [d, 0], ArrowDown: [-d, 0], ArrowLeft: [0, -d], ArrowRight: [0, d] }[e.key];
    if (mv) { e.preventDefault(); setInputs(Math.max(-90, Math.min(90, p.lat + mv[0])), wrapLon(p.lon + mv[1])); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  new ResizeObserver(drawMap).observe(canvas);
  window.addEventListener('llsn:lang', relabel);
  window.addEventListener('llsn:sites', drawMap);
  window.addEventListener('llsn:pickpoint', e => { const d = e.detail || {}; window.LLSN.pickPoint(d.lat, d.lon, d); });
  window.LLSN.pickPoint = (lat, lon, { compute = false } = {}) => {
    if (!isFinite(lat) || !isFinite(lon)) return;
    setInputs(lat, wrapLon(lon));
    if (compute) submit();
  };
  hookGlobe();

  const im = new Image();
  im.onload = () => { img = im; drawMap(); };
  im.src = core.state.base + 'hterrain/overview.png';
  fetch(core.state.base + 'hterrain/validation.json').then(r => (r.ok ? r.json() : null)).then(v => { val = v; showErr(); }).catch(() => {});

  // restore points from the URL (?u=lat,lon;lat,lon) — recomputed, never cached
  const q = LLSN().initialParams || new URLSearchParams(location.search), u = q.get('u');
  const want = new Set((q.get('sites') || '').split(','));
  if (u) u.split(';').map(x => x.split(',').map(Number)).filter(p => p.length === 2 && p.every(isFinite))
    .slice(0, 6).reduce((pr, [la, lo]) => pr.then(() => compute(la, lo, '', id => want.has(id))), Promise.resolve())
    .then(() => { const f = q.get('focus'); if (f && f.startsWith('USER_') && core.state.sites.some(s => s.id === f)) setFocus(f); });
}

function hookGlobe() {
  const g = LLSN().globe;
  if (g && typeof g.on === 'function') { try { g.on('pick', p => p && window.LLSN.pickPoint(p.lat, p.lon)); } catch (e) { /* no pick event */ } }
  else window.addEventListener('llsn:globe', hookGlobe, { once: true });
}

function relabel() {
  translate(sec);
  nameIn.placeholder = t('cuNamePh');
  showErr();
  drawMap();
}

function showErr() {
  const el = sec.querySelector('.cu-err');
  const c = val && val.catalogue;
  if (!c) el.textContent = '';
  const fill = s => s.replace('{n}', c.n_sites).replace('{med}', c.rms_deg_median.toFixed(1)).replace('{max}', c.rms_deg_max.toFixed(1))
    .replace('{sun}', c.abs_sun_pp_median.toFixed(1)).replace('{sunmax}', Math.round(c.abs_sun_pp_max))
    .replace('{full}', (val.full_ldem64_rms_deg_max ?? 0).toFixed(2));
  if (c) el.innerHTML = `<b>${t('cuErrLbl')}:</b> ${fill(t('cuErrTxt'))}`;
  const P = val?.polar, rp = sec.querySelector('.cu-respolar');
  rp.textContent = P ? t('cuResPolar').replace('{edge}', Math.abs(P.lat_edge_deg) + '°S').replace('{levels}', P.levels.join(', ')) : '';
  if (val?.north) rp.textContent += ' ' + t('cuResNorth').replace('{edge}', val.north.lat_edge_deg + '°N').replace('{levels}', val.north.levels.join(', '));
  showAcc();
}

const BANDS = [['85-90S', -90, -85], ['80-85S', -85, -80], ['75-80S', -80, -75]];
/** Measured accuracy for a computed point: {lower, text} from hterrain/validation.json (never invented). */
function accuracyFor(lat, polar, pole) {
  if (lat >= 75) {
    if (!polar || pole !== 'north') return { lower: true, text: t('cuAccNorth') };
    const P = val?.north;
    const b = [['85-90N', 85, 90], ['80-85N', 80, 85], ['75-80N', 75, 80]].find(([, lo, hi]) => lat >= lo && lat <= hi);
    const m = b && P?.bands?.[b[0]], target = P?.target;
    if (!m || !(m.n > 0) || ![m.rms_deg_median, m.rms_deg_max, m.abs_sun_pp_median, m.abs_sun_pp_max,
      target?.rms_deg_median, target?.abs_sun_pp_per_point].every(Number.isFinite)) {
      return { lower: true, text: t('cuAccNorthUnknown') };
    }
    const lower = m.meets_target !== true || m.rms_deg_median > target.rms_deg_median || m.abs_sun_pp_max > target.abs_sun_pp_per_point;
    const text = t('cuAccNorthMeasured').replace('{n}', m.n).replace('{band}', b[0].replace('N', '°N'))
      .replace('{med}', m.rms_deg_median.toFixed(2)).replace('{max}', m.rms_deg_max.toFixed(2))
      .replace('{sun}', m.abs_sun_pp_median.toFixed(1)).replace('{sunmax}', m.abs_sun_pp_max.toFixed(1))
      .replace('{tr}', target.rms_deg_median).replace('{tp}', target.abs_sun_pp_per_point);
    return { lower, text: text + (lower ? ' ' + t('cuNorthLimit') : ''), band: b[0] };
  }
  if (!val) return null;
  const P = val.polar;
  const f1 = x => x.toFixed(x < 1 ? 2 : 1);
  if (polar && P) {
    const b = BANDS.find(([, lo, hi]) => lat >= lo && lat <= hi), m = b && P.bands[b[0]];
    if (!m) return null;
    const band = b[0].replace('S', '°S');
    const text = t('cuAccPolar').replace('{n}', m.n).replace('{band}', band).replace('{med}', f1(m.rms_deg_median))
      .replace('{max}', f1(m.rms_deg_max)).replace('{sun}', m.abs_sun_pp_median.toFixed(1)).replace('{sunmax}', m.abs_sun_pp_max.toFixed(1))
      .replace('{tr}', P.target.rms_deg_median).replace('{tp}', P.target.abs_sun_pp_per_point);
    const known = m.meets_target ? '' : ' ' + t('cuKnownLimit').replace('{pp}', '+' + m.abs_sun_pp_max.toFixed(1)).replace('{tp}', P.target.abs_sun_pp_per_point);
    return { lower: !m.meets_target, text: text + known, band: b[0] };
  }
  return null;
}
let lastAcc = null;
function showAcc() {
  const el = sec.querySelector('.cu-acc');
  if (!lastAcc) { el.textContent = ''; return; }
  const a = accuracyFor(lastAcc.lat, lastAcc.polar, lastAcc.pole);
  if (!a) { el.textContent = ''; return; }
  el.innerHTML = `<span class="cu-badge${a.lower ? '' : ' ok'}">${t(a.lower ? 'cuLow' : 'cuOk')}</span><b>${t('cuAccLbl')}:</b> ${a.text}`;
}

const wrapLon = x => ((((x + 180) % 360) + 360) % 360) - 180;
function readInputs() {
  const lat = Number(latIn.value), lon = Number(lonIn.value);
  if (latIn.value === '' || lonIn.value === '' || !(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return null;
  return { lat, lon };
}
function setInputs(lat, lon) {
  latIn.value = lat.toFixed(4); lonIn.value = lon.toFixed(4);
  picked = { lat, lon };
  statusEl.className = 'cu-status'; statusEl.textContent = '';
  drawMap();
}

function submit() {
  const p = readInputs();
  if (!p) { statusEl.className = 'cu-status err'; statusEl.textContent = t('cuBad'); return; }
  compute(p.lat, p.lon, nameIn.value.trim(), true);
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./custom_horizon_worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ev => { const job = pending.get(ev.data.id); if (job) job(ev.data); };
    worker.onerror = ev => { console.error('custom horizon worker:', ev.message); };
  }
  return worker;
}

/** Compute the horizon of (lat, lon) in the worker, then add the point as a site. */
function compute(lat, lon, label, focus) {
  const id = `USER_${lat < 0 ? 'S' : 'N'}${Math.abs(lat).toFixed(3)}_${lon < 0 ? 'W' : 'E'}${Math.abs(lon).toFixed(3)}`.replace(/\./g, 'P');
  const btn = sec.querySelector('.cu-go');
  btn.disabled = true;
  statusEl.className = 'cu-status'; statusEl.textContent = t('cuBusy');
  const jobId = ++seq;
  const base = new URL(core.state.base, location.href).href;
  return new Promise(resolve => {
    pending.set(jobId, msg => {
      if (msg.type === 'progress') return;
      pending.delete(jobId);
      btn.disabled = pending.size > 0;
      if (msg.type === 'error') {
        statusEl.className = 'cu-status err'; statusEl.textContent = `${t('cuErr')}: ${msg.message}`;
        console.warn('custom horizon failed', msg.message); resolve(null); return;
      }
      const c = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
      const site = {
        id, group: 'custom', user: true, lat, lon, elev_m: Math.round(msg.h0_m * 10) / 10,
        name: label || `Point ${c}`, name_ko: label || `내 지점 ${c}`, short: (label || c).slice(0, 14),
        source_url: '', coord_quality: 'primary',
        note: msg.polar ? `User-defined point; horizon computed in the browser from NASA PGDA ${msg.pole === 'north' ? 'north' : 'south'}-polar terrain + LOLA LDEM_64/16.`
          : 'User-defined point; horizon computed in the browser from LOLA LDEM_64 (~948 m) + LDEM_16.',
      };
      const acc = accuracyFor(lat, msg.polar, msg.pole);
      const hz = { id, lat, lon, h0_m: msg.h0_m, obs_height_m: 2, az_step_deg: 0.5, mask: msg.mask, max_range_km: 300,
        dem_sources: msg.dem_sources, mock: false, browser: true, polar: !!msg.polar, pole: msg.pole || null, accuracy: acc };
      lastAcc = { lat, polar: !!msg.polar, pole: msg.pole }; showAcc();
      window.LLSN.addSite(site, hz, { focus: typeof focus === 'function' ? focus(id) : focus });
      statusEl.className = 'cu-status';
      statusEl.textContent = `${t('cuDone')} · ${c} · h₀ ${Math.round(msg.h0_m)} m · ${(msg.ms / 1000).toFixed(1)} s · ${msg.tiles} ${t('cuTiles')}`;
      resolve(site);
    });
    getWorker().postMessage({ id: jobId, lat, lon, base });
  });
}

// ------------------------------------------------------------ mini map (equirectangular, lon −180 left, lat +90 top)
function mapPoint(e) {
  const r = canvas.getBoundingClientRect();                       // content box (inside the 1 px border)
  const x = (e.clientX - r.left - canvas.clientLeft) / canvas.clientWidth, y = (e.clientY - r.top - canvas.clientTop) / canvas.clientHeight;
  return { lat: Math.max(-90, Math.min(90, 90 - y * 180)), lon: wrapLon(-180 + x * 360) };
}

function drawMap() {
  if (!canvas) return;
  const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (img) { ctx.globalAlpha = 0.85; ctx.drawImage(img, 0, 0, W, H); ctx.globalAlpha = 1; }
  const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
  const C = { border: cssVar('--border'), text: cssVar('--text'), bg: cssVar('--bg'), sun: cssVar('--sun'),
    relay: cssVar('--relay'), earth: cssVar('--earth'), num: cssVar('--font-num') };
  ctx.strokeStyle = C.bg; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
  for (let lo = -150; lo < 180; lo += 30) { ctx.beginPath(); ctx.moveTo(X(lo), 0); ctx.lineTo(X(lo), H); ctx.stroke(); }
  for (let la = -60; la <= 60; la += 30) { ctx.beginPath(); ctx.moveTo(0, Y(la)); ctx.lineTo(W, Y(la)); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.font = `11px ${C.num}`; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
  ctx.fillText('180°W', 3, H - 14); ctx.fillText('0°', X(0) + 3, H - 14); ctx.textAlign = 'right'; ctx.fillText('180°E', W - 3, H - 14);
  ctx.textAlign = 'left';
  const focus = LLSN().focus;
  for (const s of core.state.sites) {
    const x = X(s.lon), y = Y(s.lat);
    ctx.beginPath();
    if (s.group === 'custom') { ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.strokeStyle = C.relay; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.arc(x, y, 2.5, 0, 2 * Math.PI); ctx.fillStyle = C.sun; ctx.fill(); }
    if (s.id === focus) { ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.strokeStyle = C.text; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  const p = picked || readInputs();
  if (p) {
    const x = X(p.lon), y = Y(p.lat);
    ctx.strokeStyle = C.text; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x - 3, y); ctx.moveTo(x + 3, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 10); ctx.stroke();
  }
}

whenReady(init);   // last: every const above is initialised before init runs
