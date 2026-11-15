// intro.js — first-visit intro (Chaei's copy, frames in docs/design_sync/shots/intro/, spec in
// docs/design_sync/채이사본_동기화_로켓모션.md §4). Drawn from scratch from the frames; no practice code.
//   T+ 0–9.6 s   white Moon disc, thin loading bar under it with a small lander riding the bar (orange flame),
//                "nnn%" under the bar end, "LOADING nnn%" bottom right, T+ mission clock bottom left, SKIP top right.
//                The bar follows the copy's timing (40 % at 2.25 s, 50 % at 3.06 s, 97 % at 9.25 s) and holds at
//                99 % until the app's data is ready.
//   T+ 9.6 s     DESCENT INITIATED: the lander lifts off the bar end, the bar closes to the centre, the wordmark
//                letters appear dim one by one and light up while the lander arcs over the Moon.
//   T+ ~13.2 s   final descent onto the top of the Moon with an ALT readout counting down, then TOUCHDOWN.
//   (Frames exist for T+ 2.25, 2.52, 2.74, 3.06, 9.25, 9.65, 9.78 and 14.39 s; the 9.8–14.4 s flight is interpolated.)
// Never blocks the app: SKIP / Esc / click end it, a load failure or any error ends it, and it gives up after 25 s.
// Not shown with reduced motion, on repeat visits, with ?nointro, ?sites=… or a #hash. Wordmark is text (exception ①).
import { t } from './i18n.js';

const BASE_H = 900;                                   // the frames are 1440 x 900; everything scales with the height
const PCT = [[0.45, 0], [2.25, 40], [2.52, 47], [2.74, 48], [3.06, 50], [9.25, 97], [9.55, 100]];
// wordmark letter centres (px from the middle at 1440 x 900) and caps 41 px tall, measured on the copy's frame;
// the copy's wordmark is an extended face, so each Oxanium letter is widened instead of using a logo image
const WORD = [['L', -214.5], ['U', -158.5], ['N', -99.5], ['A', -39], ['S', 31], ['I', 66.5], ['G', 105.5], ['H', 164], ['T', 217]];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const easeOut = k => 1 - (1 - k) ** 3, easeInOut = k => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const pad = (n, w) => String(n).padStart(w, '0');
function pctAt(T) {
  if (T <= PCT[0][0]) return 0;
  for (let k = 1; k < PCT.length; k++) if (T <= PCT[k][0]) { const [t0, v0] = PCT[k - 1], [t1, v1] = PCT[k]; return v0 + (v1 - v0) * (T - t0) / (t1 - t0); }
  return 100;
}

export function runIntro() {
  const el = document.getElementById('ls-intro');
  if (!el) return;
  const q = new URLSearchParams(location.search);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let seen = false; try { seen = localStorage.getItem('ls.introSeen') === '1'; } catch (e) { /* storage blocked */ }
  if (seen || reduced || q.has('sites') || q.has('nointro') || location.hash) return;
  try { localStorage.setItem('ls.introSeen', '1'); } catch (e) { /* ignore */ }

  let frozen = null, ready = false, finished = false, raf = 0, D = null, held = 0, touch = null;
  const W = () => window.innerWidth, H = () => window.innerHeight;
  const mono = "ui-monospace, 'SF Mono', 'JetBrains Mono', Consolas, 'Liberation Mono', monospace";   // single quotes: used inside style=""
  const lab = 'position:absolute;font:500 calc(11.5px * var(--is)) ' + mono + ';letter-spacing:.12em;color:#8e8e8e;white-space:nowrap;';
  el.hidden = false;
  el.setAttribute('role', 'presentation');
  el.innerHTML = `<svg class="itr-svg" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block"></svg>
    <div class="itr-word" aria-hidden="true" style="position:absolute;left:50%;width:0;height:0;font:500 calc(57px * var(--is)) Oxanium, var(--font-num, sans-serif);line-height:1">${WORD.map(([c, dx]) => `<span style="position:absolute;top:0;left:calc(${dx}px * var(--is));transform:translateX(-50%) scaleX(1.5);color:#fff;opacity:0">${c}</span>`).join('')}</div>
    <div class="itr-pct" aria-hidden="true" style="${lab}font-size:calc(11px * var(--is));color:#7c7c7c"></div>
    <div class="itr-clock" aria-hidden="true" style="${lab}left:24px;bottom:22px"></div>
    <div class="itr-stat" aria-hidden="true" style="${lab}right:24px;bottom:22px"></div>
    <button type="button" class="itr-skip" aria-label="Skip intro" style="position:absolute;top:24px;right:24px;height:31px;padding:0 12px;background:#000;border:1px solid #3a3a3a;border-radius:0;color:#c8c8c8;font:600 11px ${mono};letter-spacing:.12em;display:inline-flex;align-items:center;gap:8px;cursor:pointer;opacity:.45">${t('introSkip')}<svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true"><path d="M0 0l5 4.5L0 9zM5.5 0l5 4.5-5 4.5z" fill="currentColor"/></svg></button>`;
  el.style.opacity = '1';
  const svg = el.querySelector('.itr-svg'), word = el.querySelector('.itr-word'), letters = [...word.children];
  const pctEl = el.querySelector('.itr-pct'), clock = el.querySelector('.itr-clock'), stat = el.querySelector('.itr-stat'), skip = el.querySelector('.itr-skip');
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
  let G = null;

  // geometry at the current size: centre (W/2, H/2), scale s = H / 900 (moon r 117, centre 72 above the middle)
  function layout() {
    const w = W(), h = H(), s = Math.min(h / BASE_H, w / 1100);
    el.style.setProperty('--is', Math.max(0.8, s).toFixed(3));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
    const cx = w / 2, cy = h / 2;
    let x = 5; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const stars = mk('g', {});
    for (let k = 0; k < Math.round(w * h / 9000); k++) mk('circle', { cx: (rnd() * w).toFixed(1), cy: (rnd() * h).toFixed(1), r: rnd() > 0.92 ? 0.8 : 0.5, fill: '#fff', opacity: (0.12 + rnd() * 0.35).toFixed(2) }, stars);
    const M = { x: cx, y: cy - 72 * s, r: 117 * s };
    const bar = { x0: cx - 187 * s, x1: cx + 187 * s, y: cy + 136 * s };
    const moon = mk('circle', { cx: M.x, cy: M.y, r: M.r, fill: '#ececec', opacity: 0 });
    const track = mk('line', { x1: bar.x0, x2: bar.x1, y1: bar.y, y2: bar.y, stroke: '#2a2a2a', 'stroke-width': 1, opacity: 0 });
    const fill = mk('line', { x1: bar.x0, x2: bar.x0, y1: bar.y, y2: bar.y, stroke: '#f2f2f2', 'stroke-width': 1.6 * s, 'stroke-linecap': 'butt', opacity: 0 });
    const trail = mk('polyline', { points: '', fill: 'none', stroke: '#b4b4b4', 'stroke-width': 5 * s, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round', opacity: 0.8 });
    // lander: 12 px white block, legs for the touchdown, orange flame and a short grey exhaust behind it
    const L = mk('g', { opacity: 0 });
    const exh = mk('rect', { x: -48 * s, y: -1.4 * s, width: 30 * s, height: 2.8 * s, fill: '#6b6b6b', opacity: 0.8 }, L);
    const flame = mk('rect', { x: -21 * s, y: -2 * s, width: 15 * s, height: 4 * s, rx: 2 * s, fill: '#f0a630' }, L);
    const legs = mk('path', { d: `M${-5 * s} ${-3 * s} L${-13 * s} ${-8 * s} M${-5 * s} ${3 * s} L${-13 * s} ${8 * s}`, stroke: '#fff', 'stroke-width': 1.6 * s, fill: 'none', opacity: 0 }, L);
    mk('rect', { x: -6 * s, y: -6 * s, width: 12 * s, height: 12 * s, fill: '#f4f4f4' }, L);
    word.style.top = `${bar.y - 0.5 * 58 * Math.max(0.8, s)}px`;
    pctEl.style.left = 'auto'; pctEl.style.right = `${w - bar.x1}px`; pctEl.style.top = `${bar.y + 14 * s}px`;
    G = { s, M, bar, moon, track, fill, trail, L, exh, flame, legs, pts: [] };
  }

  // flight after lift-off (u = seconds since descent start): fast climb up the right side, an arc over the Moon,
  // then a slow vertical descent onto the top (touchdown at u = 4.4)
  function flight(u) {
    const { s, M, bar } = G;
    const top = { x: M.x, y: M.y - M.r - 13 * s };
    const P0 = { x: bar.x1 + 4 * s, y: bar.y }, P1 = { x: M.x + 212 * s, y: M.y - 33 * s };
    if (u < 0.35) { const k = easeOut(u / 0.35); return { x: lerp(P0.x, P1.x, k) + Math.sin(k * Math.PI) * 30 * s, y: lerp(P0.y, P1.y, k), legs: 0 }; }
    const a0 = Math.atan2(P1.y - M.y, P1.x - M.x), r0 = Math.hypot(P1.x - M.x, P1.y - M.y), r1 = M.r + 70 * s;
    if (u < 3.4) { const k = easeInOut((u - 0.35) / 3.05), a = lerp(a0, -Math.PI / 2, k), r = lerp(r0, r1, k);
      return { x: M.x + r * Math.cos(a), y: M.y + r * Math.sin(a), legs: 0 }; }
    const k = easeOut(clamp((u - 3.4) / 1.0));
    return { x: top.x, y: lerp(M.y - r1, top.y, k), rot: -90, legs: ramp(u, 3.5, 3.9), alt: 1 - k };
  }

  const finish = () => {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey); window.removeEventListener('resize', layout);
    el.classList.add('done'); el.style.transition = 'opacity .4s'; el.style.opacity = '0';
    setTimeout(() => { el.hidden = true; el.innerHTML = ''; el.classList.remove('done'); el.style.opacity = ''; el.style.transition = ''; }, 420);
  };
  const onKey = e => { if (e.key === 'Escape') finish(); };
  el.addEventListener('click', finish);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  window.addEventListener('llsn:ready', () => { ready = true; }, { once: true });
  window.addEventListener('llsn:loadfail', finish, { once: true });
  setTimeout(finish, 25000);                                             // never longer than 25 s

  const t0 = performance.now();
  function frame(now) {
    if (finished) return;
    try {
      const T = frozen ?? (now - t0) / 1000 - held;
      const { s, bar, M } = G;
      const cs = Math.round(T * 100);
      clock.textContent = `T+ ${pad(Math.floor(cs / 6000), 2)}:${pad(Math.floor(cs / 100) % 60, 2)}.${pad(cs % 100, 2)}`;
      skip.style.opacity = (0.45 + 0.55 * ramp(T, 3.1, 4.2)).toFixed(2);
      const on = ramp(T, 0.25, 0.7);
      G.moon.setAttribute('opacity', on); G.track.setAttribute('opacity', on);
      let pct = pctAt(T);
      if (pct > 99 && !ready && D === null) { pct = 99; held += Math.min(0.1, (now - (G.last || now)) / 1000); }  // hold at 99 % until the data is in
      G.last = now;
      if (D === null && pct >= 100) D = Math.min(T, PCT[PCT.length - 1][0]);
      if (D === null) {
        const p = Math.floor(pct), fx = lerp(bar.x0, bar.x1, pct / 100);
        G.fill.setAttribute('x2', fx); G.fill.setAttribute('opacity', on);
        G.L.setAttribute('opacity', ramp(T, 0.5, 0.9)); G.L.setAttribute('transform', `translate(${fx} ${bar.y})`);
        G.flame.setAttribute('opacity', (0.75 + 0.25 * Math.sin(T * 40)).toFixed(2));
        pctEl.textContent = `${pad(p, 3)}%`; pctEl.style.opacity = on;
        stat.textContent = `${t('introLoading')} ${pad(p, 3)}%`; stat.style.opacity = on; stat.style.color = '#8e8e8e';
      } else {
        const u = T - D;
        // the bar closes to the centre and its label fades
        const half = (bar.x1 - bar.x0) / 2 * (1 - ramp(u, 0, 0.42) ** 1.3), c = (bar.x0 + bar.x1) / 2;
        G.fill.setAttribute('x1', c - half); G.fill.setAttribute('x2', c + half); G.track.setAttribute('opacity', 1 - ramp(u, 0, 0.2));
        pctEl.textContent = '100%'; pctEl.style.opacity = (1 - ramp(u, 0, 0.15)).toFixed(2);
        const pos = v => (v < 0.12 ? { x: bar.x1 + 4 * s, y: bar.y - 30 * s * (v / 0.12) ** 2, rot: -65 * (v / 0.12), legs: 0 } : flight(v - 0.12));
        const f = pos(u);
        if (f.rot === undefined) { const b = pos(Math.max(0, u - 0.03)); f.rot = Math.atan2(f.y - b.y, f.x - b.x) * 180 / Math.PI; }
        // grey exhaust trail = where the lander was over the last 0.45 s
        const pts = []; for (let k = 10; k >= 0; k--) { const b = pos(Math.max(0, u - 0.045 * k)); pts.push(`${b.x.toFixed(1)},${b.y.toFixed(1)}`); }
        G.trail.setAttribute('points', pts.join(' '));
        G.trail.setAttribute('opacity', (0.8 * (1 - ramp(u, 3.3, 4.0))).toFixed(2));
        G.L.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${(f.rot ?? -90).toFixed(1)})`);
        G.legs.setAttribute('opacity', (f.legs || (u > 4.5 ? 1 : 0)).toFixed(2));
        const landed = u >= 4.52;
        G.flame.setAttribute('opacity', landed ? 0 : (0.7 + 0.3 * Math.sin(T * 40)).toFixed(2)); G.exh.setAttribute('opacity', landed ? 0 : (u < 0.5 ? 0.8 : 0.35));
        if (landed) G.L.setAttribute('transform', `translate(${M.x.toFixed(1)} ${(M.y - M.r - 13 * s).toFixed(1)}) rotate(-90)`);
        // wordmark: letters appear dim one by one, then light up in the same order
        letters.forEach((sp, i) => { const dim = ramp(u, 0.1 + 0.07 * i, 0.22 + 0.07 * i), lit = ramp(u, 1.2 + 0.32 * i, 1.55 + 0.32 * i);
          sp.style.opacity = (0.28 * dim + 0.72 * lit).toFixed(3); });
        if (landed && touch === null) touch = T;
        if (touch !== null) { stat.textContent = t('introTouch'); stat.style.color = '#e8b04a'; }
        else if (u >= 3.52) { stat.textContent = `ALT ${pad(Math.max(0, Math.round(240 * (f.alt ?? 0))), 3)} M`; stat.style.color = '#8e8e8e'; }
        else { stat.textContent = 'DESCENT INITIATED'; stat.style.color = '#8e8e8e'; }
        if (touch !== null && T - touch > 0.9) { finish(); return; }
      }
    } catch (e) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  try { layout(); raf = requestAnimationFrame(frame); } catch (e) { finish(); }
  // test hooks: jump the intro clock or hold it at a time (seconds) to compare frames at the copy's timestamps
  window.__introFreeze = sec => { ready = true; frozen = sec; if (sec < PCT[PCT.length - 1][0]) D = null; touch = null; };
  window.__introSeek = sec => { if (!finished) { ready = true; held = (performance.now() - t0) / 1000 - sec; if (sec < PCT[PCT.length - 1][0]) D = null; } };
}
