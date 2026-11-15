// local_map.js — "How much does the exact spot matter?" (card 18 data, Jiyong).
// Shows web/data/local250/<ID>.json (41 x 41 nodes, 250 m apart, ±5 km; sites in local250/index.json, contract section 22) and falls
// back to web/data/local/<ID>.json (21 x 21 nodes, 1 km apart, ±10 km; every catalogue site, section 15) via values.localGrid.
// Each node = its own LOLA horizon + 2026-2030 hourly metrics (contract section 15). Colour = the chosen metric.
// Hover/arrow keys = readout; click/Enter = put that point into "Your own landing point" (custom_site.js).
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, fmtHours, LLSN } from './ui_shared.js';
import { localGrid, spacingText } from './values.js';

// Every catalogue site has a local grid (card 20, PR #26): build the list from sites.json, not a hard-coded subset (issue #43).
// Browser-computed custom points have no grid file.
const catalogueIds = () => (LLSN().state?.sites || []).filter(s => s.group !== 'custom' && !s.user).map(s => s.id);
let IDS = [];

addStrings({
  lmTitle: 'How much does the exact spot matter?', lmAria: 'Local map of sunlight and Earth visibility around a south-polar site',
  lmWhy: 'Moving a few hundred meters on a polar ridge can change everything. Each square is a real location {s} from its neighbours, with its own LOLA terrain horizon (2026–2030, hourly).',
  lmSite: 'Area', lmMetric: 'Show', lmSun: 'Sunlight', lmEarth: 'Direct-to-Earth', lmBoth: 'Sun + Earth together', lmDark: 'Longest shadow',
  lmCentre: 'catalogue point', lmAt: 'Point', lmEast: 'east', lmNorth: 'north', lmHeight: 'height',
  lmSpread: 'Within {r} km of the catalogue point: {lo} – {hi}',
  lmPair: 'Biggest jump between neighbours ({s} apart): {a} → {b} ({m}).',
  lmScaleNote: 'Percent scales are fixed at 0–100 % for every site, so maps can be compared.',
  lmClick: 'Click a square (or arrows + Enter) to send that location to "Your own landing point".',
  lmNote: 'Sampled points, not area averages · observer 2 m · Earth center above the horizon · geometry only (no power or radio model).', lmRes: 'Grid: {n} × {n} nodes, {s} apart, ±{r} km', lmRes250: '250 m grid', lmRes1k: '1 km grid', lmResFall: '250 m file unavailable — 1 km grid shown',
  lmLoading: 'Loading local map…', lmFail: 'Local map could not be loaded.',
  lmNoGrid: 'No local map for the focused site (your own point) — showing {s}. Local maps exist for all catalogue sites.',
}, {
  lmTitle: '정확한 위치가 얼마나 중요할까?', lmAria: '남극 착륙지 주변의 햇빛·지구 가시성 지도',
  lmWhy: '극지 능선에서는 수백 m만 옮겨도 결과가 완전히 달라질 수 있다. 칸 하나가 {s} 간격의 실제 지점이고, 지점마다 LOLA 지형 지평선을 따로 계산했다 (2026–2030, 1시간 간격).',
  lmSite: '지역', lmMetric: '보기', lmSun: '햇빛', lmEarth: '직접 교신', lmBoth: '해·지구 동시', lmDark: '최장 그늘',
  lmCentre: '목록 좌표', lmAt: '지점', lmEast: '동', lmNorth: '북', lmHeight: '높이',
  lmSpread: '목록 좌표에서 {r} km 안: {lo} – {hi}',
  lmPair: '이웃한 두 칸({s})의 가장 큰 차이: {a} → {b} ({m}).',
  lmScaleNote: '비율 색 범위는 모든 착륙지에서 0–100 %로 같아서 지도끼리 비교할 수 있다.',
  lmClick: '칸을 누르면(또는 화살표 + Enter) 그 위치가 "내 착륙 지점"에 들어간다.',
  lmNote: '면적 평균이 아니라 표본 지점 · 관측자 2 m · 지구 중심이 지평선 위 · 기하만 (전력·전파 모델 없음).', lmRes: '격자: {n} × {n} 지점, {s} 간격, ±{r} km', lmRes250: '250 m 격자', lmRes1k: '1 km 격자', lmResFall: '250 m 파일을 못 불러와 1 km 격자로 표시',
  lmLoading: '국지 지도 불러오는 중…', lmFail: '국지 지도를 불러오지 못했다.',
  lmNoGrid: '선택한 곳(직접 넣은 지점)에는 국지 지도가 없어서 {s}을(를) 보여 준다. 국지 지도는 목록의 모든 착륙지에 있다.',
});

const METRICS = [
  { key: 'both_frac', label: 'lmBoth', col: '--relay', frac: true },
  { key: 'sun_frac', label: 'lmSun', col: '--sun', frac: true },
  { key: 'earth_frac', label: 'lmEarth', col: '--earth', frac: true },
  { key: 'longest_dark_h', label: 'lmDark', col: '--text', frac: false },
];
let sec, svg, siteSel, readout, statsEl, noteEl, grid = null, metric = METRICS[0], cursor = -1, siteId = null;

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pct = f => `${(f * 100).toFixed(f > 0 && f < 0.001 ? 2 : 1)}%`;
const fmt = (m, v) => (m.frac ? pct(v) : fmtHours(v));

let LG = null;                               // {data, dir, spacing_m, half_km, fine, fellBack, ms} from values.localGrid
async function load(id) {
  const g = await localGrid(id); if (!g) throw new Error('no grid');
  return g;
}

function init() {
  sec = document.getElementById('llsn-local');
  if (!sec) { sec = document.createElement('section'); sec.id = 'llsn-local'; sec.className = 'panel'; document.getElementById('llsn-horizon')?.after(sec); }
  sec.dataset.i18nAria = 'lmAria';
  sec.innerHTML = `
    <h2 data-i18n="lmTitle"></h2>
    <p class="lm-why" style="margin:0 0 .6em"></p>
    <div class="ctl lm-ctl">
      <label><span data-i18n="lmSite"></span> <select class="lm-site"></select></label>
      <span class="lm-seg" role="group" data-i18n-aria="lmMetric">${METRICS.map((m, k) =>
        `<button type="button" data-k="${k}" data-i18n="${m.label}" aria-pressed="${k === 0}"></button>`).join('')}</span>
    </div>
    <p class="hint lm-nogrid" hidden></p>
    <div class="lm-wrap">
      <svg class="lm-map" viewBox="0 0 230 230" tabindex="0" role="img"></svg>
      <div class="lm-side">
        <p class="lm-read num" aria-live="polite"></p>
        <div class="lm-stats num"></div>
        <div class="lm-scale"></div>
        <p class="hint lm-res" style="margin:.5em 0 0"></p>
      </div>
    </div>
    <p class="hint"><span data-i18n="lmClick"></span> <span data-i18n="lmScaleNote"></span> <span data-i18n="lmNote"></span></p>`;
  const st = document.createElement('style');
  st.dataset.owner = 'local_map.js';
  st.textContent = `
    #llsn-local .lm-ctl { display: flex; flex-wrap: wrap; gap: .5em 1.2em; align-items: center; }
    #llsn-local select { font: inherit; }
    #llsn-local .lm-seg { display: inline-flex; flex-wrap: wrap; gap: .3em; }
    #llsn-local .lm-seg button { font: inherit; font-size: .85rem; padding: .25em .7em; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; }
    #llsn-local .lm-seg button[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }
    #llsn-local .lm-wrap { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 1em 1.5em; align-items: start; margin-top: .7em; }
    @media (max-width: 720px) { #llsn-local .lm-wrap { grid-template-columns: 1fr; } }
    #llsn-local .lm-map { width: 100%; aspect-ratio: 1; display: block; cursor: crosshair; touch-action: none; }
    #llsn-local .lm-map:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; border-radius: 6px; }
    #llsn-local .lm-read { min-height: 3.6em; margin: 0 0 .6em; font-size: .92rem; line-height: 1.5; }
    #llsn-local .lm-read b.sun { color: var(--sun); } #llsn-local .lm-read b.earth { color: var(--earth); } #llsn-local .lm-read b.both { color: var(--relay); }
    #llsn-local .lm-stats p { margin: .2em 0; font-size: .88rem; }
    #llsn-local .lm-scale { display: flex; align-items: center; gap: .5em; margin-top: .6em; font-size: .8rem; color: var(--muted); }
    #llsn-local .lm-scale i { flex: 0 0 140px; height: 10px; border-radius: 3px; border: 1px solid var(--border); }`;
  document.head.appendChild(st);
  svg = sec.querySelector('svg'); siteSel = sec.querySelector('.lm-site'); readout = sec.querySelector('.lm-read');
  statsEl = sec.querySelector('.lm-stats'); noteEl = sec.querySelector('.lm-nogrid');
  translate(sec);
  fillSites();
  siteSel.addEventListener('change', () => show(siteSel.value, false));
  sec.querySelectorAll('.lm-seg button').forEach(b => b.addEventListener('click', () => {
    metric = METRICS[Number(b.dataset.k)];
    sec.querySelectorAll('.lm-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  svg.addEventListener('pointermove', e => { const k = nodeAt(e); if (k !== cursor) { cursor = k; drawCursor(); } });
  svg.addEventListener('pointerleave', () => { cursor = -1; drawCursor(); });
  svg.addEventListener('click', e => { const k = nodeAt(e); if (k >= 0) send(k); });
  svg.addEventListener('keydown', e => {
    if (!grid) return;
    const n = grid.grid.cols, k0 = cursor < 0 ? (n * n - 1) / 2 : cursor;
    const r = Math.floor(k0 / n), c = k0 % n;
    const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] }[e.key];
    if (mv) { e.preventDefault(); cursor = Math.min(n - 1, Math.max(0, r + mv[0])) * n + Math.min(n - 1, Math.max(0, c + mv[1])); drawCursor(); }
    else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) { e.preventDefault(); send(cursor); }
  });
  window.addEventListener('llsn:focus', () => follow());
  window.addEventListener('llsn:lang', () => { translate(sec); fillSites(); draw(); });
  follow();
}

function fillSites() {
  const st = LLSN().state;
  IDS = catalogueIds();
  siteSel.innerHTML = IDS.map(id => {
    const s = st.sites.find(x => x.id === id);
    return `<option value="${id}">${s ? siteName(s) : id}</option>`;
  }).join('');
  if (siteId) siteSel.value = siteId;
}

/** Follow the focused site when it has a local map; otherwise keep the current area (Malapert by default). */
function follow() {
  const f = getFocus();
  if (f && IDS.includes(f.id)) show(f.id, false);
  else show(siteId || IDS[0], true, f);
}

async function show(id, fallback, focus) {
  siteId = id; siteSel.value = id;
  const s = LLSN().state.sites.find(x => x.id === id);
  noteEl.hidden = !(fallback && focus);
  if (fallback && focus) noteEl.textContent = fill(t('lmNoGrid'), { s: s ? siteName(s) : id });
  readout.textContent = t('lmLoading');
  try { LG = await load(id); grid = LG.data; }
  catch (e) { grid = null; LG = null; readout.textContent = t('lmFail'); svg.innerHTML = ''; statsEl.innerHTML = ''; return; }
  if (siteId !== id) return;
  cursor = -1;
  draw();
}

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const GAP = 0.6, PAD = 10;                   // margin; cell pitch P = 210 / cols so 21 or 41 columns fill the same 230-unit box
let P = 10;

function range() {
  const v = grid.points.map(p => p[metric.key]);
  return metric.frac ? [0, 1] : [0, Math.max(1, ...v)];
}
function shade(v, lo, hi) {
  const f = Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)));
  return metric.key === 'longest_dark_h' ? 1 - f : f;         // dark hours: fewer = brighter
}

function draw() {
  if (!grid) return;
  const n = grid.grid.cols, col = css(metric.col), bg = css('--surface-2') || '#222';
  P = 210 / n;
  const [lo, hi] = range();
  let out = `<rect x="0" y="0" width="230" height="230" fill="${bg}" rx="4"/>`;
  const gp = n > 30 ? GAP / 2 : GAP;
  grid.points.forEach((p, k) => {
    const r = Math.floor(k / n), c = k % n;                      // row 0 = south
    const x = PAD + c * P, y = PAD + (n - 1 - r) * P;
    const a = shade(p[metric.key], lo, hi);
    out += `<rect x="${x + gp / 2}" y="${y + gp / 2}" width="${P - gp}" height="${P - gp}" fill="${col}" fill-opacity="${(0.06 + 0.94 * a).toFixed(3)}"/>`;
  });
  const cx = PAD + (n - 1) / 2 * P + P / 2;
  out += `<circle cx="${cx}" cy="${cx}" r="3.2" fill="none" stroke="${css('--bg')}" stroke-width="2.2"/><circle cx="${cx}" cy="${cx}" r="3.2" fill="none" stroke="${css('--text')}" stroke-width="1.1"/>`;
  out += `<text x="${PAD + n * P / 2}" y="7" text-anchor="middle" font-size="6" fill="${css('--muted')}">N ↑ · ${spacingText(LG.spacing_m)} · ${LG.fine ? t('lmRes250') : LG.fellBack ? t('lmResFall') : t('lmRes1k')}</text>`;
  out += `<g class="lm-cur"></g>`;
  svg.innerHTML = out;
  const s = LLSN().state.sites.find(x => x.id === grid.id);
  svg.setAttribute('aria-label', `${t('lmTitle')} — ${s ? siteName(s) : grid.id}, ${t(metric.label)}`);
  sec.querySelector('.lm-scale').innerHTML = `<b style="color:var(--text);font-weight:600">${t(metric.label)} ${metric.frac ? '(%)' : `(${t('h')})`}</b> <span>${fmt(metric, metric.key === 'longest_dark_h' ? hi : lo)}</span>
    <i style="background:linear-gradient(90deg, color-mix(in srgb, ${col} 6%, ${bg}), ${col})"></i><span>${fmt(metric, metric.key === 'longest_dark_h' ? lo : hi)}</span>`;
  stats();
  drawCursor();
  resText();
}
function resText() {
  const el = sec.querySelector('.lm-res'); if (!el || !LG) return;
  const sp = spacingText(LG.spacing_m);
  el.textContent = fill(t('lmRes'), { n: grid.grid.cols, s: sp, r: LG.half_km, d: LG.dir }) + (LG.fellBack ? ` · ${t('lmResFall')}` : '');
  const why = sec.querySelector('.lm-why'); if (why) why.textContent = fill(t('lmWhy'), { s: sp });
}

function stats() {
  const n = grid.grid.cols, c0 = (n - 1) / 2, sp = grid.grid.spacing_m / 1000;
  const lines = [1, 3, 5, 10].filter(r => r <= LG.half_km).map(r => {
    const v = grid.points.filter((p, k) => Math.hypot(k % n - c0, Math.floor(k / n) - c0) * sp <= r + 1e-9).map(p => p[metric.key]);
    return `<p>${fill(t('lmSpread'), { r, lo: fmt(metric, Math.min(...v)), hi: fmt(metric, Math.max(...v)) })}</p>`;
  });
  // biggest neighbour jump (4-neighbours) for the chosen metric
  let best = null;
  grid.points.forEach((p, k) => {
    const r = Math.floor(k / n), c = k % n;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (r + dr >= n || c + dc >= n) continue;
      const q = grid.points[(r + dr) * n + c + dc], d = Math.abs(p[metric.key] - q[metric.key]);
      if (!best || d > best.d) best = { d, p, q };
    }
  });
  if (best) {
    const [a, b] = best.p[metric.key] <= best.q[metric.key] ? [best.p, best.q] : [best.q, best.p];
    const pos = p => `(${p.e_m / 1000}, ${p.n_m / 1000}) km ${fmt(metric, p[metric.key])}`;
    lines.push(`<p>${fill(t('lmPair'), { a: pos(a), b: pos(b), m: t(metric.label), s: spacingText(grid.grid.spacing_m) })}</p>`);
  }
  statsEl.innerHTML = lines.join('');
}

function nodeAt(e) {
  if (!grid) return -1;
  const r = svg.getBoundingClientRect(), n = grid.grid.cols;
  const x = (e.clientX - r.left) / r.width * 230, y = (e.clientY - r.top) / r.height * 230;
  const c = Math.floor((x - PAD) / P), row = n - 1 - Math.floor((y - PAD) / P);
  return c >= 0 && c < n && row >= 0 && row < n ? row * n + c : -1;
}

function drawCursor() {
  if (!grid) return;
  const g = svg.querySelector('.lm-cur'), n = grid.grid.cols;
  const k = cursor >= 0 ? cursor : (n * n - 1) / 2;
  const p = grid.points[k], r = Math.floor(k / n), c = k % n;
  if (g) g.innerHTML = cursor >= 0 ? `<rect x="${PAD + c * P}" y="${PAD + (n - 1 - r) * P}" width="${P}" height="${P}" fill="none" stroke="${css('--text')}" stroke-width="1.4"/>` : '';
  const where = cursor >= 0 ? `${p.e_m / 1000} km ${t('lmEast')}, ${p.n_m / 1000} km ${t('lmNorth')}` : t('lmCentre');
  readout.innerHTML = `${t('lmAt')}: ${where} · ${Math.abs(p.lat).toFixed(4)}°${p.lat < 0 ? 'S' : 'N'} ${Math.abs(p.lon).toFixed(4)}°${p.lon < 0 ? 'W' : 'E'} · ${t('lmHeight')} ${Math.round(p.h0_m)} m<br>` +
    `<b class="sun">${t('lmSun')} ${pct(p.sun_frac)}</b> · <b class="earth">${t('lmEarth')} ${pct(p.earth_frac)}</b> · ` +
    `<b class="both">${t('lmBoth')} ${pct(p.both_frac)}</b> · ${t('lmDark')} ${fmtHours(p.longest_dark_h)}`;
}

function send(k) {
  const p = grid.points[k];
  if (typeof LLSN().pickPoint === 'function') {
    LLSN().pickPoint(p.lat, p.lon);
    document.getElementById('llsn-custom')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

whenReady(init);
