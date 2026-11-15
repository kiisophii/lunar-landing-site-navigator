// horizon_chart.js — 360° horizon panorama for the focused site (phase 3 UI).
// Terrain mask silhouette (web/data/horizon/<ID>.json via core.horizonAt), Sun and Earth now + their tracks
// over the selected window (LLSN.window from window_metrics.js; default 30 days from the current time).
// Uses only core.js API + CSS variables. Listens: llsn:time, llsn:window, llsn:focus, llsn:lang.
import * as core from './core.js';
import { legendHTML } from './ui_shared.js';
import { t } from './i18n.js';
import { addStrings, whenReady, mountSection, translate, siteName, getFocus, setFocus, fmtDeg, cssVar, throttle, LLSN } from './ui_shared.js';

addStrings({
  hzTitle: 'Horizon panorama', hzAria: 'Horizon panorama of the focused site',
  hzSite: 'Site', hzScale: 'Vertical scale',
  hzHint: 'Angles in degrees. Azimuth runs clockwise from north (0°), through east (90°). Elevation is above the local horizontal. Pick a site above or click a card / table row to change it.', hzLgMask: 'terrain horizon mask (LOLA)', hzLgSun: 'Sun, hourly', hzLgEarth: 'Earth, hourly', hzLgHidden: 'hidden behind the terrain',
  hzFlat: 'TERRAIN PENDING — no LOLA horizon has been computed for this site yet. Sun and Earth positions are shown, but no visibility is judged (the 0° line is only a reference).',
  hzSun: 'Sun', hzEarth: 'Earth', hzMask: 'terrain mask', hzEl: 'el',
  hzVisible: 'Visible', hzPartial: 'Partly visible', hzBlocked: 'Blocked by terrain', hzBelow: 'Below horizon',
  hzDisk: 'of disk', hzTrack: 'track', hzCentre: 'centered on',
  hzTrackDays: 'Tracks', hzDays: 'days', hzAt: 'az',
  N: 'N', E: 'E', S: 'S', W: 'W',
}, {
  hzTitle: '지평선 파노라마', hzAria: '선택한 착륙지의 지평선 파노라마',
  hzSite: '착륙지', hzScale: '세로 배율',
  hzHint: '각도 단위는 °입니다. 방위는 북쪽 0°에서 동쪽 90° 방향으로 시계 방향, 고도는 지역 수평면 기준입니다. 위에서 착륙지를 고르거나 카드·표의 줄을 누르면 바뀝니다.', hzLgMask: '지형 지평선 마스크 (LOLA)', hzLgSun: '태양, 1시간마다', hzLgEarth: '지구, 1시간마다', hzLgHidden: '지형에 가려짐',
  hzFlat: '지형 계산 중 — 이 착륙지의 LOLA 지평선이 아직 없다. 태양·지구 위치는 보여 주지만 보이는지는 판정하지 않는다 (0° 선은 참고용).',
  hzSun: '해', hzEarth: '지구', hzMask: '지형 마스크', hzEl: '고도',
  hzVisible: '보임', hzPartial: '일부 보임', hzBlocked: '지형에 가려짐', hzBelow: '지평선 아래',
  hzDisk: '원반', hzTrack: '궤적', hzCentre: '가운데 방향',
  hzTrackDays: '궤적', hzDays: '일', hzAt: '방위',
  N: '북', E: '동', S: '남', W: '서',
});

let sec, canvas, ctx, readout, hoverLine, flatNote, siteSel, scaleSeg, trackNote;
let ex = 1;                       // vertical exaggeration ×1 / ×3
let track = null;                 // { key, sun:[{az,el,vis}], earth:[...], centre }
let geom = null;                  // last layout, for pointer readout

function build() {
  sec = mountSection('llsn-horizon', 'hzAria');
  sec.innerHTML = `
    <h2 data-i18n="hzTitle"></h2>
    <div class="ctl">
      <label><span data-i18n="hzSite"></span> <select class="hz-site"></select></label>
      <span><span data-i18n="hzScale"></span>
        <span class="seg hz-scale" role="group"><button type="button" data-ex="1">×1</button><button type="button" data-ex="3">×3</button></span></span>
      <span class="hz-tracknote hint" style="margin:0"></span>
    </div>
    <p class="hz-flat hint" data-i18n="hzFlat" hidden style="color:var(--warn);font-weight:700"></p>
    <div class="hz-read" aria-live="polite" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.5em var(--gap)"></div>
    <div class="hz-wrap" style="position:relative;margin-top:calc(var(--gap)*.5)">
      <canvas class="hz-canvas" role="img" style="display:block;width:100%;border-radius:8px;background:var(--bg)"></canvas>
    </div>
    <p class="hz-hover hint" aria-hidden="true">&nbsp;</p>
    <div class="hz-lg"></div><p class="hint" data-i18n="hzHint"></p>`;
  canvas = sec.querySelector('canvas'); ctx = canvas.getContext('2d');
  readout = sec.querySelector('.hz-read'); hoverLine = sec.querySelector('.hz-hover');
  flatNote = sec.querySelector('.hz-flat'); siteSel = sec.querySelector('.hz-site');
  scaleSeg = sec.querySelector('.hz-scale'); trackNote = sec.querySelector('.hz-tracknote');

  siteSel.addEventListener('change', () => setFocus(siteSel.value));
  scaleSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ex = Number(b.dataset.ex); draw(); } });
  document.getElementById('cards')?.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) setFocus(c.dataset.id); });
  canvas.addEventListener('pointermove', onHover);
  canvas.addEventListener('pointerleave', () => { hoverLine.innerHTML = '&nbsp;'; });
  { const th = throttle(draw, 50); let q = 0; new ResizeObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; th(); }); }).observe(sec.querySelector('.hz-wrap')); }   // redraw after layout, not inside the observer

  const redraw = throttle(draw, 60);
  window.addEventListener('llsn:time', redraw);
  window.addEventListener('llsn:window', () => { track = null; draw(); });
  window.addEventListener('llsn:focus', () => { track = null; fillSites(); draw(); });
  window.addEventListener('llsn:lang', () => { fillSites(); translate(sec); draw(); });

  fillSites();
  translate(sec);
  if (!LLSN().focus) setFocus(core.state.sites[0]?.id);
  draw();
}

function fillSites() {
  const f = getFocus();
  siteSel.innerHTML = core.state.sites.map(s => `<option value="${s.id}">${siteName(s)}</option>`).join('');
  if (f) siteSel.value = f.id;
}

// ------------------------------------------------------------ data for the chart
function windowRange() {
  const w = LLSN().window;
  if (w) return [w.i0, w.i1];
  const [a, b] = core.hourRange(), i0 = Math.max(a, Math.floor(LLSN().now?.() ?? 0));
  return [i0, Math.min(b, i0 + 30 * 24)];
}

/** Circular mean of azimuths (deg). */
function meanAz(list) {
  let x = 0, y = 0;
  for (const p of list) { x += Math.cos(p.az * Math.PI / 180); y += Math.sin(p.az * Math.PI / 180); }
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function computeTrack(site) {
  const [i0, i1] = windowRange();
  const key = `${site.id}|${i0}|${i1}`;
  if (track && track.key === key) return track;
  const hours = Math.max(1, i1 - i0), step = Math.max(1, Math.ceil(hours / 2400));   // ≤ ~2400 points per body
  const sun = [], earth = [];
  for (let i = Math.ceil(i0); i <= i1; i += step) {
    const s = core.sunAzEl(site, i), e = core.earthAzEl(site, i);
    sun.push({ az: s.az, el: s.el, vis: core.sunlit(site, i) });
    earth.push({ az: e.az, el: e.el, vis: e.el > core.horizonAt(site, e.az) });
  }
  // Centre the panorama on the cardinal direction nearest Earth's mean azimuth so its track is not split at the edges.
  const centre = (Math.round(meanAz(earth.length ? earth : [{ az: 180 }]) / 90) * 90) % 360;
  track = { key, sun, earth, centre, step, days: hours / 24 };
  return track;
}

// ------------------------------------------------------------ drawing
function status(site, body, i) {
  const p = body === 'sun' ? core.sunAzEl(site, i) : core.earthAzEl(site, i);
  const mask = core.horizonAt(site, p.az);
  if (core.terrainPending(site)) return { ...p, mask, vis: false, frac: null, kind: 'pending' };
  let vis, frac = null;
  if (body === 'sun') { frac = core.sunVisibleFraction(site, i); vis = frac >= core.SUNLIT_FRACTION; }
  else vis = p.el > mask;
  let kind;
  if (body === 'sun' && frac > 0 && frac < 1) kind = 'partial';
  else if (vis) kind = 'visible';
  else kind = p.el > 0 ? 'blocked' : 'below';     // above the flat horizon but behind terrain vs truly below
  return { ...p, mask, vis, frac, kind };
}

function draw() {
  if (!sec || !core.state.n) return;
  const site = getFocus(); if (!site) return;
  const i = LLSN().now?.() ?? 0;
  const tr = computeTrack(site);
  const hz = core.state.horizons.get(site.id);
  flatNote.hidden = !(hz?.flat || hz?.mask.every(v => v === 0));
  scaleSeg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.ex) === ex)));
  trackNote.textContent = `${t('hzTrackDays')}: ${tr.days.toFixed(1)} ${t('hzDays')} · ${t('hzCentre')} ${t(['N', 'E', 'S', 'W'][tr.centre / 90])}`;

  // --- layout (CSS pixels), font follows the root size so ?tv=1 scales up
  const W = canvas.parentElement.clientWidth;
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const H = Math.round(Math.min(Math.max(W * 0.3, 220), 440) + fs);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.height = H + 'px';
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const padL = fs * 3.2, padR = fs * 0.8, padT = fs * 0.9, padB = fs * 2.0;
  const pw = W - padL - padR, ph = H - padT - padB;
  // ×1 = same degrees per pixel horizontally and vertically (true angular shape), unless the box is too small
  const base = Math.max(pw / 360, ph / 150), ppd = base * ex;
  const y0 = padT + ph * 0.62;                                 // 0° elevation line
  const elTop = (y0 - padT) / ppd, elBot = -(padT + ph - y0) / ppd;
  const X = az => padL + ((((az - tr.centre + 180) % 360) + 360) % 360) / 360 * pw;
  const Y = el => y0 - el * ppd;
  geom = { padL, pw, padT, ph, centre: tr.centre, site };

  const C = {
    bg: cssVar('--bg'), text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'),
    terrain: cssVar('--surface-2'), off: cssVar('--off'), sun: cssVar('--sun'), earth: cssVar('--earth'), warn: cssVar('--warn'),
    font: cssVar('--font'), num: cssVar('--font-num'),
  };
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(padL, padT, pw, ph); ctx.clip();

  // elevation grid
  const gstep = niceStep((elTop - elBot) / 6);
  ctx.strokeStyle = C.border; ctx.lineWidth = 1;
  for (let e = Math.ceil(elBot / gstep) * gstep; e <= elTop; e += gstep) {
    ctx.setLineDash(e === 0 ? [] : [2, 4]); ctx.beginPath(); ctx.moveTo(padL, Y(e)); ctx.lineTo(padL + pw, Y(e)); ctx.stroke();
  }
  for (let a = 0; a < 360; a += 45) { ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(X(a), padT); ctx.lineTo(X(a), padT + ph); ctx.stroke(); }
  ctx.setLineDash([]);

  // terrain silhouette: fill from the bottom up to the mask, sampled every 0.25° of azimuth
  ctx.beginPath(); ctx.moveTo(padL, padT + ph);
  for (let k = 0; k <= 1440; k++) {
    const az = tr.centre - 180 + k * 0.25;
    ctx.lineTo(padL + k / 1440 * pw, Y(core.horizonAt(site, az)));
  }
  ctx.lineTo(padL + pw, padT + ph); ctx.closePath();
  ctx.fillStyle = C.terrain; ctx.fill();
  ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();

  // tracks: solid where visible, faded where hidden behind the mask
  const dot = Math.max(1.6, fs * 0.12);
  for (const [list, col] of [[tr.earth, C.earth], [tr.sun, C.sun]]) {
    for (const p of list) {
      const y = Y(p.el); if (y < padT - 4 || y > padT + ph + 4) continue;
      ctx.globalAlpha = p.vis ? 0.85 : 0.22;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p.az), y, dot, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // current Sun / Earth markers (drawn outside the clip so off-scale bodies show as edge arrows)
  const sNow = status(site, 'sun', i), eNow = status(site, 'earth', i);
  marker(sNow, C.sun, t('hzSun'), fs * 0.75);
  marker(eNow, C.earth, t('hzEarth'), fs * 0.55);

  function marker(p, col, name, r) {
    const x = X(p.az);
    let y = Y(p.el), off = 0;
    if (y < padT) { off = -1; y = padT + r; } else if (y > padT + ph) { off = 1; y = padT + ph - r; }
    ctx.lineWidth = 3;
    if (p.vis) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    else {                                                  // hidden: hollow dashed ring + cross in the warn colour
      ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.warn; ctx.beginPath();
      ctx.moveTo(x - r * .6, y - r * .6); ctx.lineTo(x + r * .6, y + r * .6); ctx.moveTo(x + r * .6, y - r * .6); ctx.lineTo(x - r * .6, y + r * .6); ctx.stroke();
    }
    if (off) {                                              // arrow towards the off-scale body
      ctx.fillStyle = col; ctx.beginPath();
      const ty = off < 0 ? padT - 2 : padT + ph + 2, d = off < 0 ? 1 : -1;
      ctx.moveTo(x, ty); ctx.lineTo(x - r * .7, ty + d * r * .9); ctx.lineTo(x + r * .7, ty + d * r * .9); ctx.fill();
    }
    const label = `${name} ${fmtDeg(p.el)}` + (p.vis ? '' : ` · ${t(p.kind === 'pending' ? 'terrainPending' : p.kind === 'blocked' ? 'hzBlocked' : 'hzBelow')}`);
    ctx.font = `700 ${fs * 0.8}px ${C.font}`;
    const tw = ctx.measureText(label).width;
    let lx = Math.min(Math.max(x + r + 4, padL), padL + pw - tw);
    if (lx < x && x + r + 4 + tw > padL + pw) lx = x - r - 4 - tw;
    const ly = off > 0 || y > padT + ph * 0.8 ? y - r - 4 : y + r + fs * 0.85;
    ctx.fillStyle = C.bg; ctx.globalAlpha = 0.7; ctx.fillRect(lx - 2, ly - fs * 0.8, tw + 4, fs * 1.0); ctx.globalAlpha = 1;
    ctx.fillStyle = p.vis ? col : C.warn; ctx.fillText(label, lx, ly);
  }

  // axes labels
  ctx.fillStyle = C.muted; ctx.font = `${fs * 0.75}px ${C.num}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let e = Math.ceil(elBot / gstep) * gstep; e <= elTop + 1e-9; e += gstep) ctx.fillText(`${Math.round(e * 10) / 10}°`, padL - 6, Y(e));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let a = 0; a < 360; a += 45) {
    const nm = names[a / 45], card = nm.length === 1;
    ctx.font = `${card ? 700 : 400} ${fs * (card ? 0.95 : 0.7)}px ${C.font}`;
    ctx.fillStyle = card ? C.text : C.muted;
    const label = card ? t(nm) : nm;
    ctx.fillText(label, X(a), padT + ph + 4);
    if (a === (tr.centre + 180) % 360) ctx.fillText(label, padL + pw, padT + ph + 4);   // same direction at the right edge
    ctx.font = `${fs * 0.6}px ${C.num}`; ctx.fillStyle = C.muted;
    ctx.fillText(`${a}°`, X(a), padT + ph + 4 + fs);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.muted; ctx.font = `${fs * 0.7}px ${C.font}`;
  ctx.fillText(`${t('hzScale')} ×${ex}`, padL + 6, padT + fs * 0.8);

  // HTML readout (accessible text, also used by screen readers)
  readout.innerHTML = readRow(sNow, 'sun') + readRow(eNow, 'earth');
  canvas.setAttribute('aria-label', `${t('hzTitle')} — ${siteName(site)}. ${plain(sNow, 'hzSun')}. ${plain(eNow, 'hzEarth')}.`);
}

function kindText(p) {
  if (p.kind === 'pending') return t('terrainPending');
  if (p.kind === 'partial') return `${t('hzPartial')} ${Math.round(p.frac * 100)}% ${t('hzDisk')}`;
  return t({ visible: 'hzVisible', blocked: 'hzBlocked', below: 'hzBelow' }[p.kind]);
}
const plain = (p, nameKey) => `${t(nameKey)} ${t('hzEl')} ${fmtDeg(p.el)}, ${t('hzAt')} ${p.az.toFixed(0)}°, ${t('hzMask')} ${p.kind === 'pending' ? '—' : fmtDeg(p.mask)}: ${kindText(p)}`;

function readRow(p, body) {
  const col = body === 'sun' ? 'var(--sun)' : 'var(--earth)';
  const ink = body === 'sun' ? 'var(--sun-ink)' : 'var(--earth-ink)';
  const chip = p.vis
    ? `<span class="chip" style="background:${col};border-color:${col};color:${ink}">${kindText(p)}</span>`
    : `<span class="chip" style="border-color:var(--warn);color:var(--warn)">✕ ${kindText(p)}</span>`;
  return `<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:.3em .8em">
    <strong style="color:${col}">${t(body === 'sun' ? 'hzSun' : 'hzEarth')}</strong>
    <span style="font-family:var(--font-num);font-size:${body === 'sun' ? '1.6rem' : '1.2rem'};font-weight:700;color:${col}">${fmtDeg(p.el)}</span>
    <span style="font-family:var(--font-num);color:var(--muted)">${t('hzAt')} ${p.az.toFixed(1)}° · ${t('hzMask')} ${p.kind === 'pending' ? '—' : fmtDeg(p.mask)}</span>
    ${chip}</div>`;
}

function onHover(e) {
  if (!geom) return;
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left;
  if (x < geom.padL || x > geom.padL + geom.pw) { hoverLine.innerHTML = '&nbsp;'; return; }
  const az = ((geom.centre - 180 + (x - geom.padL) / geom.pw * 360) % 360 + 360) % 360;
  hoverLine.textContent = `${t('hzAt')} ${az.toFixed(1)}° · ${t('hzMask')} ${core.terrainPending(geom.site) ? '—' : fmtDeg(core.horizonAt(geom.site, az))}`;
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

whenReady(build);

// graphic legend (same colours and marks as the chart): terrain fill + outline, hourly dots, faded = hidden
function hzLegend() {
  const el = document.querySelector('#llsn-horizon .hz-lg'); if (!el) return;
  el.innerHTML = legendHTML([{ kind: 'area', c: 'var(--muted)', fill: 'var(--surface-2)', label: t('hzLgMask') }, { kind: 'dot', c: 'var(--sun)', op: 0.85, label: t('hzLgSun') },
    { kind: 'dot', c: 'var(--earth)', op: 0.85, label: t('hzLgEarth') }, { kind: 'dot', c: 'var(--text)', op: 0.22, label: t('hzLgHidden') }]);
}
['llsn:ready', 'llsn:lang'].forEach(ev => window.addEventListener(ev, () => setTimeout(hzLegend, 0)));
setTimeout(hzLegend, 0);
