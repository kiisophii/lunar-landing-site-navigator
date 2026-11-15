// seasons.js — "Seasons 2026–2030" for the focused site (challenge text: "lunar day and seasons").
// Reads web/data/monthly/<ID>.json (contract section 17, written by pipeline/seasons.mjs with the actual core.js):
// 60 calendar months of sunlight %, Earth-visible % and longest darkness, plus the same metrics over one lunar day
// (709 h) centred on each month and the Sun's selenographic latitude. Top: Sun % and Earth % per month;
// middle: longest darkness per calendar month; bottom: the Sun's latitude (the season itself).
// Clicking a month starts the analysis period at that month (LLSN.setPeriod). Custom points: no file, no request.
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, LLSN } from './ui_shared.js';
import { iconSvg } from './icons.js';

addStrings({
  snTitle: 'Seasons 2026–2030', snAria: 'Monthly sunlight, Earth visibility and darkness for the focused site, 2026–2030',
  snWhy: 'How the same site changes over the year. One bar per month; at the poles the season matters more than the landing day.',
  snInfo: 'Why does the Moon have seasons?',
  snInfoText: 'The Moon’s spin axis is tilted only about 1.54° from the ecliptic pole, so over one seasonal cycle the Sun moves only about 1.5° north and south of the lunar equator (bottom strip; up to ±1.59° in 2026–2030 with libration). At the equator this changes almost nothing. Near the south pole the Sun always skims the horizon, so those 1.5° decide whether a crater rim or ridge is lit or shadowed: southern summer (Sun south of the equator) brings long daylight, southern winter long nights. The lunar seasonal cycle is about 346.6 days (the eclipse year), so good months come about 19 days earlier each calendar year.',
  snModeLun: 'Per lunar day', snModeCal: 'Per calendar month', snMode: 'Values',
  snModeHint: 'Per lunar day = 709 h (29.5 days) centered on each month: removes the wobble from months being 28–31 days long. Per calendar month = exactly that month (UTC).',
  snSun: 'Sunlight', snEarth: 'Earth visible', snDark: 'Longest shadow in the month', snLat: 'Sun’s latitude on the Moon',
  snSouth: 'Sun south (southern summer)', snNorth: 'Sun north (southern winter)',
  snRange: 'Sunlight {a}–{b} (best {bm}, worst {wm}). Months with the Sun south vs north: {d}.',
  snFlat: 'Seasonal change in sunlight is under {pp} percentage points here: no real season at this latitude.',
  snDarkRange: 'Longest shadow per month: {a}–{b}.',
  snClick: 'Click a month (or ←/→ then Enter) to start the analysis period there.',
  snCustom: 'Seasons are available for catalogue sites only (precomputed from the site’s terrain horizon).',
  snNone: 'No seasonal data for this site (no real terrain horizon yet).', snLoading: 'Loading…',
  snNote: 'Hourly samples, real LOLA horizon, geometry only (no atmosphere). Sunlit = ≥ 50 % of the solar disc above the horizon; Earth = Earth center above it.',
  snReadout: '{m}: Sunlight {s} · Earth {e} · longest darkness {d} · Sun latitude {l}',
}, {
  snTitle: '계절 2026–2030', snAria: '선택한 착륙지의 월별 햇빛, 지구 보임, 어둠 (2026–2030)',
  snWhy: '같은 착륙지가 1년 동안 어떻게 바뀌는지. 막대 하나가 한 달이다. 극지에서는 착륙일보다 계절이 더 중요하다.',
  snInfo: '달에도 계절이 있나?',
  snInfoText: '달의 자전축은 황도의 극에서 약 1.54°만 기울어 있다. 그래서 계절 주기 동안 태양은 달 적도에서 남북으로 1.5° 정도만 움직인다 (맨 아래 띠; 2026–2030년에는 칭동 때문에 최대 ±1.59°). 적도에서는 거의 차이가 없다. 남극 근처에서는 태양이 늘 지평선을 스치듯 지나가서, 이 1.5°가 크레이터 가장자리나 능선이 빛을 받느냐 그림자에 드느냐를 가른다. 남반구 여름(태양이 적도 남쪽)에는 낮이 길고, 겨울에는 밤이 길다. 달의 계절 주기는 약 346.6일(식년)이라 좋은 달이 해마다 달력에서 약 19일씩 앞당겨진다.',
  snModeLun: '달의 하루 기준', snModeCal: '달력 월 기준', snMode: '값',
  snModeHint: '달의 하루 기준 = 그 달 가운데를 중심으로 709시간(29.5일): 달력의 한 달이 28–31일이라 생기는 출렁임을 없앤다. 달력 월 기준 = 그 달(UTC) 그대로.',
  snSun: '햇빛', snEarth: '지구 보임', snDark: '그 달의 최장 그늘', snLat: '달에서 본 태양의 위도',
  snSouth: '태양이 남쪽 (남반구 여름)', snNorth: '태양이 북쪽 (남반구 겨울)',
  snRange: '햇빛 {a}–{b} (가장 좋은 달 {bm}, 가장 나쁜 달 {wm}). 태양이 남쪽인 달과 북쪽인 달의 차이: {d}.',
  snFlat: '여기는 계절에 따른 햇빛 변화가 {pp}퍼센트포인트 미만이다: 이 위도에서는 사실상 계절이 없다.',
  snDarkRange: '한 달 안의 최장 그늘: {a}–{b}.',
  snClick: '달을 누르면(또는 ←/→ 후 Enter) 분석 기간이 그 달부터 시작한다.',
  snCustom: '계절 그래프는 목록 착륙지에만 있다 (착륙지 지형 지평선으로 미리 계산함).',
  snNone: '이 착륙지는 계절 자료가 없다 (실제 지형 지평선이 아직 없음).', snLoading: '불러오는 중…',
  snNote: '1시간 간격, 실제 LOLA 지평선, 기하만 계산 (대기 없음). 햇빛 = 태양 원반의 50 % 이상이 지평선 위, 지구 = 지구 중심이 지평선 위.',
  snReadout: '{m}: 햇빛 {s} · 지구 {e} · 최장 그늘 {d} · 태양 위도 {l}',
});

const W = 720, PL = 40, PR = 8, H1 = 120, GAP = 14, H2 = 54, H3 = 34, TOP = 6, AXIS = 16;
const Y1 = TOP, Y2 = Y1 + H1 + GAP, Y3 = Y2 + H2 + GAP, HT = Y3 + H3 + AXIS;
const cache = new Map();
let sec, svg, readout, sumEl, siteEl, noteEl, modeSel, data = null, cursor = -1, mode = 'lun';

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pct = f => `${(f * 100).toFixed(1)}%`;
const hrs = h => `${h} h`;
const deg = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}°`;
const isCustom = s => !s || s.group === 'custom' || String(s.id).startsWith('USER_');
const T0 = Date.UTC(2026, 0, 1);

function load(id) {
  if (String(id).startsWith('USER_')) return Promise.resolve(null);
  if (!cache.has(id)) cache.set(id, fetch(`data/monthly/${id}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(id);
}

function init() {
  sec = document.getElementById('llsn-seasons');
  if (!sec) {
    sec = document.createElement('section'); sec.id = 'llsn-seasons'; sec.className = 'panel';
    const after = document.getElementById('llsn-slip') || document.getElementById('llsn-dates');
    if (after) after.after(sec); else document.querySelector('main')?.appendChild(sec);
  }
  sec.dataset.i18nAria = 'snAria';
  sec.innerHTML = `
    <h2><span data-i18n="snTitle"></span> <span class="sn-site muted"></span></h2>
    <p data-i18n="snWhy" style="margin:0 0 .4em"></p>
    <details class="sn-info"><summary>${iconSvg('info', { size: 14 })} <span data-i18n="snInfo"></span></summary><p data-i18n="snInfoText"></p></details>
    <div class="sn-body">
      <div class="sn-ctl"><label><span data-i18n="snMode"></span>
        <select class="sn-mode"><option value="lun" data-i18n="snModeLun"></option><option value="cal" data-i18n="snModeCal"></option></select></label>
        <span class="sn-legend"><i class="sw sun"></i><span data-i18n="snSun"></span> <i class="sw earth"></i><span data-i18n="snEarth"></span>
        <i class="sw dark"></i><span data-i18n="snDark"></span></span></div>
      <p class="hint" data-i18n="snModeHint"></p>
      <svg class="sn-svg" viewBox="0 0 ${W} ${HT}" role="img" tabindex="0"></svg>
      <p class="sn-readout num" aria-live="polite"></p>
      <div class="sn-sum"></div>
      <p class="hint" data-i18n="snClick"></p>
    </div>
    <p class="note sn-note" hidden></p>
    <p class="hint" data-i18n="snNote"></p>`;
  const st = document.createElement('style');
  st.dataset.owner = 'seasons.js';
  st.textContent = `
    #llsn-seasons .sn-site { font-weight: 400; font-size: .95rem; }
    #llsn-seasons .sn-info { margin: 0 0 .6em; font-size: .9rem; }
    #llsn-seasons .sn-info summary { cursor: pointer; color: var(--muted); width: fit-content; }
    #llsn-seasons .sn-info p { margin: .4em 0 0; max-width: 60em; }
    #llsn-seasons .sn-ctl { display: flex; flex-wrap: wrap; gap: .4em 1.2em; align-items: center; font-size: .85rem; }
    #llsn-seasons .sn-ctl select { margin-left: .4em; }
    #llsn-seasons .sn-legend { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .3em; color: var(--muted); }
    #llsn-seasons .sw { display: inline-block; width: .9em; height: .9em; border-radius: 2px; margin-left: .6em; vertical-align: -.1em; }
    #llsn-seasons .sw.sun { background: var(--sun); } #llsn-seasons .sw.earth { background: var(--earth); } #llsn-seasons .sw.dark { background: var(--off); }
    #llsn-seasons .sn-svg { width: 100%; height: auto; display: block; margin-top: .3em; }
    #llsn-seasons .sn-svg:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
    #llsn-seasons .sn-svg text { font-size: 10px; fill: var(--muted); font-family: var(--font-num); }
    #llsn-seasons .sn-svg .lbl { font-family: var(--font); font-size: 11px; }
    #llsn-seasons .sn-svg .yr { fill: var(--text); font-weight: 600; }
    #llsn-seasons .sn-svg .grid { stroke: var(--border); stroke-width: 1; }
    #llsn-seasons .sn-svg .hit { fill: transparent; cursor: pointer; }
    #llsn-seasons .sn-svg .cur { fill: var(--text); opacity: .08; }
    #llsn-seasons .sn-readout { min-height: 1.4em; margin: .2em 0; font-size: .85rem; }
    #llsn-seasons .sn-sum p { margin: .25em 0; font-size: .9rem; }`;
  document.head.appendChild(st);
  svg = sec.querySelector('.sn-svg'); readout = sec.querySelector('.sn-readout'); sumEl = sec.querySelector('.sn-sum');
  siteEl = sec.querySelector('.sn-site'); noteEl = sec.querySelector('.sn-note'); modeSel = sec.querySelector('.sn-mode');
  translate(sec);
  modeSel.addEventListener('change', () => { mode = modeSel.value; draw(); });
  svg.addEventListener('mousemove', e => { const k = monthAt(e); if (k >= 0 && k !== cursor) { cursor = k; draw(); } });
  svg.addEventListener('mouseleave', () => { cursor = -1; draw(); });
  svg.addEventListener('click', e => { const k = monthAt(e); if (k >= 0) startPeriod(k); });
  svg.addEventListener('keydown', e => {
    if (!data) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { cursor = Math.min(59, Math.max(0, (cursor < 0 ? 0 : cursor) + (e.key === 'ArrowRight' ? 1 : -1))); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && cursor >= 0) startPeriod(cursor);
  });
  window.addEventListener('llsn:focus', render);
  window.addEventListener('llsn:lang', () => { translate(sec); render(); });
  render();
}

const bw = () => (W - PL - PR) / 60;
function monthAt(e) {
  const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width;
  const k = Math.floor((x - PL) / bw());
  return data && k >= 0 && k < 60 ? k : -1;
}

function startPeriod(k) {
  const [y, m] = data.months[k].split('-').map(Number);
  const start = (Date.UTC(y, m - 1, 1) - T0) / 3600e3, days = data.series.hours[k] / 24;
  if (typeof LLSN().setPeriod === 'function') LLSN().setPeriod(start, days);
}

async function render() {
  const site = getFocus(); if (!site) return;
  siteEl.textContent = `· ${siteName(site)}`;
  const body = sec.querySelector('.sn-body');
  if (isCustom(site)) { data = null; body.hidden = true; noteEl.hidden = false; noteEl.textContent = t('snCustom'); return; }
  noteEl.hidden = false; noteEl.textContent = t('snLoading');
  const d = await load(site.id);
  if (getFocus()?.id !== site.id) return;
  if (!d) { data = null; body.hidden = true; noteEl.textContent = t('snNone'); return; }
  data = d; body.hidden = false; noteEl.hidden = true;
  draw();
}

function vals() {
  const src = mode === 'lun' ? data.lunation : data.series;
  return { sun: src.sun_frac, earth: src.earth_frac };
}

function draw() {
  if (!data) return;
  const { sun, earth } = vals(), dark = data.series.longest_dark_h;
  const lat = data.subsolar_lat_deg.min.map((a, k) => (a + data.subsolar_lat_deg.max[k]) / 2);
  const b = bw(), x = k => PL + k * b;
  const y1 = f => Y1 + H1 * (1 - f);
  const dmax = Math.max(744, ...dark);
  const LMAX = 1.7, y3 = v => Y3 + H3 / 2 - (v / LMAX) * (H3 / 2);
  let g = '';
  // grid + axis labels
  for (const f of [0, .5, 1]) g += `<line class="grid" x1="${PL}" x2="${W - PR}" y1="${y1(f)}" y2="${y1(f)}"/><text x="${PL - 4}" y="${y1(f) + 3}" text-anchor="end">${f * 100}%</text>`;
  g += `<line class="grid" x1="${PL}" x2="${W - PR}" y1="${Y2 + H2}" y2="${Y2 + H2}"/><text x="${PL - 4}" y="${Y2 + 8}" text-anchor="end">${dmax} h</text><text x="${PL - 4}" y="${Y2 + H2}" text-anchor="end">0</text>`;
  g += `<line class="grid" x1="${PL}" x2="${W - PR}" y1="${y3(0)}" y2="${y3(0)}"/><text x="${PL - 4}" y="${y3(1.5) + 3}" text-anchor="end">+1.5°</text><text x="${PL - 4}" y="${y3(-1.5) + 3}" text-anchor="end">−1.5°</text>`;
  // season shading in the latitude strip: Sun south (southern summer) above-sun colour, north = off
  for (let k = 0; k < 60; k++) {
    if (Math.abs(lat[k]) >= 1) g += `<rect x="${x(k)}" y="${Y3}" width="${b}" height="${H3}" fill="var(${lat[k] < 0 ? '--sun' : '--off'})" opacity=".18"/>`;
  }
  // year separators + labels
  for (let yr = 0; yr < 5; yr++) {
    const xx = x(yr * 12);
    if (yr) g += `<line class="grid" x1="${xx}" x2="${xx}" y1="${Y1}" y2="${Y3 + H3}" stroke-dasharray="2 3"/>`;
    g += `<text class="yr" x="${xx + 6 * b}" y="${HT - 3}" text-anchor="middle">${2026 + yr}</text>`;
  }
  if (cursor >= 0) g += `<rect class="cur" x="${x(cursor)}" y="${Y1}" width="${b}" height="${Y3 + H3 - Y1}"/>`;
  // sunlight bars, Earth line
  for (let k = 0; k < 60; k++) g += `<rect x="${x(k) + b * .12}" y="${y1(sun[k])}" width="${b * .76}" height="${H1 * sun[k]}" fill="var(--sun)"/>`;
  g += `<polyline points="${earth.map((v, k) => `${(x(k) + b / 2).toFixed(1)},${y1(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--earth)" stroke-width="2.2" stroke-linejoin="round"/>`;
  for (let k = 0; k < 60; k++) g += `<circle cx="${x(k) + b / 2}" cy="${y1(earth[k])}" r="1.8" fill="var(--earth)"/>`;
  // longest darkness
  for (let k = 0; k < 60; k++) { const h = H2 * dark[k] / dmax; g += `<rect x="${x(k) + b * .12}" y="${Y2 + H2 - h}" width="${b * .76}" height="${h}" fill="var(--off)"/>`; }
  // Sun latitude line
  g += `<polyline points="${lat.map((v, k) => `${(x(k) + b / 2).toFixed(1)},${y3(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--sun)" stroke-width="1.6"/>`;
  g += `<text class="lbl" x="${PL + 2}" y="${Y2 - 3}" text-anchor="start">${t('snDark')}</text><text class="lbl" x="${PL + 2}" y="${Y3 - 3}" text-anchor="start">${t('snLat')} · <tspan style="fill:var(--sun)">■</tspan> ${t('snSouth')}</text>`;
  for (let k = 0; k < 60; k++) g += `<rect class="hit" x="${x(k)}" y="${Y1}" width="${b}" height="${Y3 + H3 - Y1}"><title>${data.months[k]}</title></rect>`;
  svg.innerHTML = g;
  svg.setAttribute('aria-label', `${t('snTitle')}: ${siteName(getFocus())}`);

  const k = cursor >= 0 ? cursor : -1;
  readout.textContent = k < 0 ? '' : fill(t('snReadout'), { m: data.months[k], s: pct(sun[k]), e: pct(earth[k]), d: hrs(dark[k]), l: deg(lat[k]) });

  // summary from the same numbers as docs/seasons.md (lunation series for the season, calendar months for best/worst)
  const L = data.lunation.sun_frac, C = data.series.sun_frac;
  const south = [], north = [];
  lat.forEach((v, j) => { if (v <= -1) south.push(L[j]); else if (v >= 1) north.push(L[j]); });
  const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
  const dS = (mean(south) - mean(north)) * 100;
  const src = mode === 'lun' ? L : C;
  let kb = 0, kw = 0; src.forEach((v, j) => { if (v > src[kb]) kb = j; if (v < src[kw]) kw = j; });
  const span = (Math.max(...L) - Math.min(...L)) * 100;
  let html = `<p>${fill(t('snRange'), { a: pct(src[kw]), b: pct(src[kb]), bm: data.months[kb], wm: data.months[kw], d: `${dS >= 0 ? '+' : '−'}${Math.abs(dS).toFixed(1)} pp` })}</p>`;
  if (span < 2) html += `<p>${fill(t('snFlat'), { pp: 2 })}</p>`;
  html += `<p>${fill(t('snDarkRange'), { a: hrs(Math.min(...dark)), b: hrs(Math.max(...dark)) })}</p>`;
  sumEl.innerHTML = html;
}

whenReady(init);
