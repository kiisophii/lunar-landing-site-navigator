// ui_shared.js — small helpers shared by the phase-3 UI modules (horizon_chart, window_metrics, filters).
// Not listed in modules.json: it is imported by those modules.
//
// Shared state on window.LLSN (in addition to core.js / app.js):
//   LLSN.focus          id of the focused site (horizon chart, highlighted card)   event 'llsn:focus'  { id }
//   LLSN.window         { i0, i1, hours, days, clipped, mode, metrics: Map(id -> metrics) }  event 'llsn:window'
//   LLSN.filterPass     Set of site ids passing the filters (null = no filter)     event 'llsn:filter' { pass }
import { STR, t } from './i18n.js';

export const LLSN = () => window.LLSN || {};

/** Evenly space candidate hues through the available arcs. Reserve yellow (Sun),
 * green/teal (relay) and light blue (Earth); comparison colours remain the list's tokens. */
export function candidateMapColors(ordered, pins, comparisonColors) {
  const pinned = new Map(pins.map(p => [p.id, p.n]));
  const rest = ordered.filter(s => !pinned.has(s.id));
  const arcs = [[260, 360], [0, 22], [58, 145], [220, 260]];
  const span = arcs.reduce((sum, [a, b]) => sum + b - a, 0);
  const colors = new Map();
  rest.forEach((s, i) => {
    let distance = (i + 0.5) * span / rest.length;
    for (const [a, b] of arcs) {
      if (distance < b - a) {
        colors.set(s.id, `hsl(${(a + distance).toFixed(3)} 72% 76%)`);
        break;
      }
      distance -= b - a;
    }
  });
  for (const [id, n] of pinned) colors.set(id, comparisonColors[n] || '#EDEDED');
  return colors;
}

/** One mapping for the 3D labels and canvas minimap, in the current candidate-list order. */
export function mapSiteColors() {
  const L = LLSN(), css = getComputedStyle(document.documentElement);
  const pins = L.pins?.() || [];
  const comparisonColors = Object.fromEntries(pins.map(p => [p.n, css.getPropertyValue(`--c${p.n}`).trim()]));
  return candidateMapColors(L.sortedSites?.() || L.state?.sites || [], pins, comparisonColors);
}

/** Register module strings (English + Korean) in the shared i18n table without editing i18n.js. */
export function addStrings(en, ko) {
  Object.assign(STR.en, en);
  Object.assign(STR.ko, ko);
}

/** Run fn once app.js has loaded the data (modules are imported after 'llsn:ready' has already fired). */
export function whenReady(fn) {
  if (LLSN().now && LLSN().state && LLSN().state.n) fn();
  else window.addEventListener('llsn:ready', () => fn(), { once: true });
}

/** Create (once) a <section> for a module and place it in a fixed order after the time bar. */
// Order on the page: time bar → window/metrics → filters → site cards → horizon panorama.
const ORDER = ['llsn-window', 'llsn-filters', 'llsn-horizon'];
const AFTER_CARDS = new Set(['llsn-horizon']);
export function mountSection(id, ariaKey) {
  ensureStyles();
  let sec = document.getElementById(id);
  if (sec) return sec;                         // placeholder already in index.html (fixed page order)
  sec = document.createElement('section');
  sec.id = id;
  sec.className = 'panel';
  if (ariaKey) sec.dataset.i18nAria = ariaKey;
  const main = document.querySelector('main');
  const anchor = AFTER_CARDS.has(id) ? document.getElementById('cards') : document.querySelector('.timebar');
  const rank = ORDER.indexOf(id);
  // insert after the last already-mounted section of the same group that comes before us in ORDER, else after the anchor
  let after = anchor;
  for (let k = 0; k < rank; k++) {
    const s = document.getElementById(ORDER[k]);
    if (s && AFTER_CARDS.has(ORDER[k]) === AFTER_CARDS.has(id)) after = s;
  }
  if (after && after.parentNode === main) after.after(sec); else main.prepend(sec);
  ensureStyles();
  return sec;
}

/** Translate data-i18n / aria labels inside a root (applyI18n in i18n.js handles textContent globally). */
export function translate(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  if (root.dataset && root.dataset.i18nAria) root.setAttribute('aria-label', t(root.dataset.i18nAria));
}

export function siteName(s) {
  return document.documentElement.lang === 'ko' && s.name_ko ? s.name_ko : s.name;
}

export function getFocus() {
  const st = LLSN().state;
  const id = LLSN().focus;
  return st.sites.find(s => s.id === id) || st.sites[0];
}

export function setFocus(id) {
  if (!id || LLSN().focus === id) return;
  window.LLSN.focus = id;
  document.querySelectorAll('#cards .card').forEach(c => c.classList.toggle('is-focus', c.dataset.id === id));
  window.dispatchEvent(new CustomEvent('llsn:focus', { detail: { id } }));
}

/** Hours → "5.0 h" (< 48 h) or "3 d 4 h". */
export function fmtHours(h) {
  if (h === null || h === undefined || !isFinite(h)) return '—';
  if (h < 48) return `${h.toFixed(1)} ${t('h')}`;
  const d = Math.floor(h / 24), r = Math.round(h - d * 24);
  return `${d} ${t('d')} ${r} ${t('h')}`;
}
export const fmtDeg = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}°`;

/** Whole-number percentages of parts that add up to exactly 100 (largest-remainder / Hamilton rounding).
 *  Rounding each share on its own can give 101 % (issue #44). Returns [] for an empty or zero total. */
export function roundShares(parts) {
  const tot = parts.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) return parts.map(() => 0);
  const raw = parts.map(p => (100 * p) / tot), out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((r, k) => [r - Math.floor(r), k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, k]) => { if (left > 0) { out[k]++; left--; } });
  return out;
}

/** Read a CSS custom property (theme.css may override base.css). */
export const cssVar = (name, el = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();

/** Call fn at most once per `ms`, always running the last call. */
export function throttle(fn, ms) {
  let last = 0, timer = null;
  return (...args) => {
    const wait = last + ms - Date.now();
    clearTimeout(timer);
    if (wait <= 0) { last = Date.now(); fn(...args); }
    else timer = setTimeout(() => { last = Date.now(); fn(...args); }, wait);
  };
}

let styled = false;
function ensureStyles() {
  if (styled) return; styled = true;
  // Layout only; every colour / size comes from the theme variables in base.css / theme.css.
  const css = `
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--gap); margin-top: var(--gap); }
  .panel h2 { margin: 0 0 calc(var(--gap) * .5); font-size: 1.15rem; }
  .panel .hint { color: var(--muted); font-size: .85rem; margin: .4em 0 0; }
  .panel .ctl { display: flex; flex-wrap: wrap; align-items: center; gap: .5em var(--gap); }
  .seg { display: inline-flex; border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
  .seg button { border: 0; border-radius: 0; background: transparent; padding: .3em .9em; }
  .seg button[aria-pressed="true"] { background: var(--text); color: var(--bg); font-weight: 700; }
  .panel input[type=number], .panel input[type=date] { font: inherit; color: var(--text); background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 8px; padding: .25em .5em; }
  .panel input[type=number] { width: 5em; }
  #cards .card { cursor: pointer; }
  #cards .card.is-focus { outline: 3px solid var(--text); outline-offset: 2px; }
  `;
  const st = document.createElement('style');
  st.dataset.owner = 'ui_shared.js';
  st.textContent = css;
  document.head.appendChild(st);
}

/** Graphic legend: each item = a short swatch drawn with the chart's own colour and stroke style + its name.
 *  kinds: line {c, w, dash}, bar {c, h, op}, dot {c, op}, area {c (stroke), fill}, vline {c, w}, square {c, op}, diamond {c}.
 *  Colours are CSS values (var(--sun) etc.). Labels are plain text (escaped here). */
export function legendHTML(items, cls = '') {
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sw = it => {
    const { kind, c = 'currentColor', w = 2, dash = '', h = 6, op = 1, fill = 'none' } = it;
    let g = '';
    if (kind === 'line') g = `<line x1="1" y1="6" x2="23" y2="6" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    else if (kind === 'bar') g = `<rect x="1" y="${6 - h / 2}" width="22" height="${h}" rx="1" fill="${c}" fill-opacity="${op}"/>`;
    else if (kind === 'dot') g = `<circle cx="7" cy="6" r="2.4" fill="${c}" fill-opacity="${op}"/><circle cx="16" cy="6" r="2.4" fill="${c}" fill-opacity="${op}"/>`;
    else if (kind === 'area') g = `<path d="M1 11.5V8l5-3 4 2 5-4 8 4v4.5z" fill="${fill}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`;
    else if (kind === 'vline') g = `<line x1="12" y1="0.5" x2="12" y2="11.5" stroke="${c}" stroke-width="${w}"/>`;
    else if (kind === 'square') g = `<rect x="7" y="1" width="10" height="10" rx="1.5" fill="${c}" fill-opacity="${op}"/>`;
    else if (kind === 'diamond') g = `<path d="M12 1l5 5-5 5-5-5z" fill="${c}"/>`;
    return `<svg class="lg-sw" viewBox="0 0 24 12" aria-hidden="true">${g}</svg>`;
  };
  return `<div class="lg-row ${cls}">${items.map(it => `<span>${sw(it)}${e(it.label)}</span>`).join('')}</div>`;
}
