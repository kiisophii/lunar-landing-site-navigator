// app.js — page wiring (integrator). Owns: site picker (pins + ranking), focused-site analysis panel, comparison cards
// of the pinned sites, selected time + scrubber, analysis period, play, #about hash route.
// Three separate states (never mixed): LLSN.focus = the ONE site analysed in the right panel / globe / tabs;
// pins = sites the user keeps at the top of the list and compares side by side (pin order kept);
// rank = order of the unpinned sites, by rankKey(metrics) of the current analysis period.
// Feature modules (web/js/modules.json) are imported after 'llsn:ready' and listen to these events:
//   'llsn:ready'   detail: { state }                         after data is loaded
//   'llsn:time'    detail: { i, date }                       selected time changed (slider, play, time inputs)
//   'llsn:window'  detail: LLSN.window                       analysis period changed (period results recomputed)
//   'llsn:focus'   detail: { id }                            focused site changed (ui_shared.setFocus)
//   'llsn:filter'  detail: { pass }                          filters changed (filters.js)
//   'llsn:lang'    detail: { lang }                          language toggled
// LLSN.window = { i0, i1, hours, days, clipped, mode, metrics: Map(id -> core.metrics) }.
// The period results depend ONLY on [i0, i1]: the selected time and the play speed never change them.
import * as core from './core.js';
import { t, applyI18n, setLang, getLang } from './i18n.js';
import { initAbout } from './about.js';
import { setFocus } from './ui_shared.js';

const $ = sel => document.querySelector(sel);
const params = new URLSearchParams(location.search);
if (params.get('tv') === '1') document.documentElement.classList.add('tv');

const DEFAULT_CMP = ['APOLLO17', 'SHACKLETON_RIM', 'CHANGE4'];
const GROUPS = ['apollo', 'luna', 'change', 'chandrayaan', 'slim', 'clps', 'artemis3_region', 'polar_peak', 'future', 'custom'];

let now = 0;                   // selected time (hour index, fractional)
let i0 = 0, i1 = 0;            // analysis period (inclusive hour indices)
let periodDays = 30;
let playing = false, timer = null;
let pins = [];                 // pinned site ids, in pin order (comparison cards)
let requestedPins = new Set(); // pins asked for at load that may arrive later (custom points)
let query = '', group = 'all';

// ------------------------------------------------------------ formatting
const byId = id => core.state.sites.find(s => s.id === id);
const nameOf = s => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name);
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fmtHours(h) {
  if (h === null || h === undefined || !isFinite(h)) return null;
  if (h < 48) return `${h.toFixed(1)} ${t('h')}`;
  const d = Math.floor(h / 24), r = Math.round(h - d * 24);
  return `${d} ${t('d')} ${r} ${t('h')}`;
}
const fmtDeg = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}°`;
const fmtUTC = i => core.hourToDate(i).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const isoDay = i => core.hourToDate(i).toISOString().slice(0, 10);
const dayStart = i => Math.floor(i / 24) * 24;
const fmtDaysShort = d => (Math.abs(d - Math.round(d)) < 0.05 ? String(Math.round(d)) : d.toFixed(1));
const coordText = s => `${Math.abs(s.lat).toFixed(3)}°${s.lat >= 0 ? 'N' : 'S'}, ${Math.abs(s.lon).toFixed(3)}°${s.lon >= 0 ? 'E' : 'W'}`;

function siteTags(s, withFilter = true) {
  const out = [];
  const hz = core.state.horizons.get(s.id);
  if (hz && hz.browser) out.push(`<span class="tag" title="${esc(t('browserTerrainTip'))}">${t('browserTerrain')}</span>`);
  if (core.horizonMock(s)) out.push(`<span class="tag warn">${t('mockTerrain')}</span>`);
  else if (core.terrainPending(s)) out.push(`<span class="tag warn" title="${esc(t('terrainPendingTip'))}">${t('terrainPending')}</span>`);
  if (s.coord_quality && s.coord_quality !== 'primary') out.push(`<span class="tag">${esc(s.coord_quality)}</span>`);
  const pass = window.LLSN.filterPass;
  if (withFilter && pass && !pass.has(s.id)) out.push(`<span class="tag warn">${t('filteredOut')}</span>`);
  return out.join('');
}

// ------------------------------------------------------------ sorting (team decision 11/14: the user chooses the sort)
/** Sort options for the unpinned sites. Each sorts by ONE metric of the current analysis period; no weighted formula.
 *  key(m) -> number, dir -1 = descending, +1 = ascending; 'name' sorts alphabetically. */
export const SORTS = {
  both:  { key: m => m.both_frac,      dir: -1, frac: true },   // default: Sun up AND Earth visible
  sun:   { key: m => m.sun_frac,       dir: -1, frac: true },
  earth: { key: m => m.earth_frac,     dir: -1, frac: true },
  dark:  { key: m => m.longest_dark_h, dir: +1, frac: false },  // shortest longest-darkness first
  name:  { key: m => m.both_frac,      dir: 0,  frac: true },   // alphabetical; the bar still shows Sun + Earth
};
let sortMode = 'both';
/** Value of the selected sort metric for a site's period metrics (null when not computed). */
export function rankKey(m, mode = sortMode) {
  const v = m ? SORTS[mode].key(m) : null;
  return Number.isFinite(v) ? v : null;
}
function saveSort() { try { localStorage.setItem('llsn.sort', sortMode); } catch (e) { /* ignore */ } }

// ------------------------------------------------------------ picker
function fillGroups() {
  const sel = $('#pk-group'), present = new Set(core.state.sites.map(s => s.group));
  sel.innerHTML = `<option value="all">${t('pkAll')}</option>` +
    GROUPS.filter(g => present.has(g)).map(g => `<option value="${g}">${t('g_' + g)}</option>`).join('');
  sel.value = group;
}

function matches(s) {
  if (group !== 'all' && s.group !== group) return false;
  if (!query) return true;
  const hay = `${s.name} ${s.name_ko || ''} ${s.short || ''} ${s.id} ${t('g_' + s.group)} ${s.note || ''}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function itemHTML(s, pinned) {
  const w = window.LLSN.window, m = w?.metrics.get(s.id), so = SORTS[sortMode];
  const k = rankKey(m);
  const bar = k === null ? 0 : so.frac ? k * 100 : Math.min(100, 100 * k / Math.max(1, w.hours));
  const val = k === null ? '—' : so.frac ? Math.round(k * 100) + '%' : fmtHours(k);
  const focus = s.id === window.LLSN.focus;
  return `<li class="pk-row${pinned ? ' pinned' : ''}${focus ? ' focus' : ''}">
    <button type="button" class="pk-item" data-id="${s.id}"${focus ? ' aria-current="true"' : ''}>
      <span class="pk-name">${esc(nameOf(s))}</span>
      <span class="pk-meta">${t('g_' + s.group)} · ${coordText(s)}</span>
      <span class="pk-tags">${siteTags(s)}</span>
      <span class="pk-rank pk-rank-${sortMode}" title="${esc(t('rkVal_' + sortMode))}"><span class="pk-bar"><i style="width:${bar.toFixed(1)}%"></i></span><span class="num">${val}</span></span>
    </button>
    <button type="button" class="pk-pin" data-id="${s.id}" aria-pressed="${pinned}" aria-label="${esc(t(pinned ? 'unpin' : 'pin'))}: ${esc(nameOf(s))}"
      title="${esc(t(pinned ? 'unpin' : 'pinHint'))}">${pinned ? '★' : '☆'}</button></li>`;
}

function renderPicker() {
  const pass = window.LLSN.filterPass, w = window.LLSN.window;
  const pinned = pins.map(byId).filter(s => s && matches(s));
  const rest = core.state.sites.filter(s => !pins.includes(s.id) && matches(s) && (!pass || pass.has(s.id)));
  const dir = SORTS[sortMode].dir, byName = (a, b) => nameOf(a).localeCompare(nameOf(b));
  const key = s => rankKey(w?.metrics.get(s.id));
  rest.sort((a, b) => {
    if (!dir) return byName(a, b);
    const ka = key(a), kb = key(b);
    if (ka === null || kb === null) return (ka === null) - (kb === null) || byName(a, b);   // not computed -> last
    return dir * (ka - kb) || byName(a, b);
  });
  let html = '';
  if (pinned.length) html += `<li class="pk-sec" role="presentation">${t('pinned')} · ${pinned.length}</li>` + pinned.map(s => itemHTML(s, true)).join('');
  if (rest.length) html += `<li class="pk-sec" role="presentation">${t('allSites')}</li>` + rest.map(s => itemHTML(s, false)).join('');
  $('#pk-list').innerHTML = html || `<li class="muted pk-none">${t('pkNoneCustom')}</li>`;
  $('#pk-count').textContent = `${pinned.length + rest.length} ${t('pkOf')} ${core.state.sites.length} ${t('pkShown')}`;
}

/** Select = focus only (right panel, globe, tabs). Never pins. Used by the list, the globe and other modules. */
function pick(id) {
  if (!byId(id)) return;
  setFocus(id);
  saveURL();
}

function savePins() { try { localStorage.setItem('llsn.pins', pins.join(',')); } catch (e) { /* ignore */ } }

function pin(id) {
  if (!byId(id) || pins.includes(id)) return;
  pins.push(id);
  savePins(); buildCards(); renderPicker(); renderFocusPin(); saveURL();
  window.dispatchEvent(new CustomEvent('llsn:pins', { detail: { pins: pins.slice() } }));
}

function unpin(id) {
  if (!pins.includes(id)) return;
  pins = pins.filter(x => x !== id);
  requestedPins.delete(id);
  savePins(); buildCards(); renderPicker(); renderFocusPin(); saveURL();
  window.dispatchEvent(new CustomEvent('llsn:pins', { detail: { pins: pins.slice() } }));
}
const togglePin = id => (pins.includes(id) ? unpin(id) : pin(id));

// ------------------------------------------------------------ comparison cards
function cardHTML(s) {
  return `<article class="card" data-id="${s.id}" tabindex="0">
    <header class="card-head">
      <div><h3 class="site-name">${esc(nameOf(s))}</h3><p class="coords">${t('g_' + s.group)} · ${coordText(s)}</p>
        <p class="tags v-tags">${siteTags(s)}</p></div>
      <button type="button" class="rm" aria-label="${esc(t('unpin'))}" title="${esc(t('unpin'))}">×</button>
    </header>
    <div class="blk instant">
      <h4><span>${t('instTitle')}</span> <span class="num v-time"></span></h4>
      <div class="big sun"><span class="label">${t('sunEl')}</span><span class="value v-sunel"></span><span class="sub v-sunaz"></span></div>
      <div class="row">
        <div class="big sun"><span class="label v-sunlbl"></span><span class="value v-sunt"></span></div>
        <div class="big earth"><span class="label v-earthlbl"></span><span class="value v-eartht"></span></div>
      </div>
      <div class="chips"><span class="chip v-sunchip"></span><span class="chip v-earthchip"></span></div>
      <p class="small v-earthel"></p>
    </div>
    <div class="blk period">
      <h4><span>${t('perTitle')}</span> <span class="num v-range"></span></h4>
      <div class="pgrid">
        <div class="pm sun"><span class="label">${t('perSun')}</span><span class="value v-psun"></span><span class="sub v-psund"></span></div>
        <div class="pm earth"><span class="label">${t('perEarth')}</span><span class="value v-pearth"></span><span class="sub v-pearthd"></span></div>
        <div class="pm both"><span class="label">${t('perBoth')}</span><span class="value v-pboth"></span><span class="sub v-pbothd"></span></div>
        <div class="pm dark"><span class="label">${t('perDark')}</span><span class="value v-pdark"></span><span class="sub v-pdarkd"></span></div>
      </div>
    </div>
    <p class="focus-note">${t('cmpFocus')}</p>
  </article>`;
}

function buildCards() {
  const cards = pins.map(byId).filter(Boolean);
  $('#cards').innerHTML = cards.map(cardHTML).join('') +
    (cards.length < 2 ? `<div class="card empty"><p>${t('cmpEmpty')}</p></div>` : '');
  markFocus();
  renderPeriodCards();
  renderInstant();
}

function markFocus() {
  const f = window.LLSN.focus;
  document.querySelectorAll('#cards .card[data-id]').forEach(c => c.classList.toggle('is-focus', c.dataset.id === f));
}

function setDur(node, h) {
  const txt = fmtHours(h);
  node.classList.toggle('na', txt === null);
  node.textContent = txt ?? t('notInWindow');
}

/** core.untilX scans hour by hour to the next flip (up to 5 years when Earth never sets). While the selected time
 *  stays before that flip and in the same state, the flip time is unchanged, so remember its absolute hour per site
 *  and kind. Exact: core.js bisects inside the hour of the flip independently of the start time. */
const flipCache = new WeakMap();        // site object -> Map(kind -> { from, at })  (at = Infinity for "none")
function untilCached(fn, kind, s, i) {
  let m = flipCache.get(s); if (!m) flipCache.set(s, m = new Map());
  const c = m.get(kind);
  if (c && i >= c.from && i < c.at - 1e-6) return c.at === Infinity ? null : c.at - i;
  const h = fn(s, i);
  if (h === null) m.set(kind, { from: i, at: Infinity });
  else if (h > 0) m.set(kind, { from: i, at: i + h });
  return h;
}

/** Instant values of one site at the selected time, written into the nodes found by `q(name)`. */
function fillInstant(s, q) {
  const sun = core.sunAzEl(s, now), earth = core.earthAzEl(s, now);
  const lit = core.sunlit(s, now), eUp = core.earthVisible(s, now);
  q('time').textContent = fmtUTC(now);
  q('sunel').textContent = fmtDeg(sun.el);
  q('sunaz').textContent = `${t('az')} ${sun.az.toFixed(0)}° · ${t('sunVis')} ${Math.round(core.sunVisibleFraction(s, now) * 100)}%`;
  q('sunlbl').textContent = t(lit ? 'untilSunset' : 'untilSunrise');
  setDur(q('sunt'), lit ? untilCached(core.untilSunset, 'set', s, now) : untilCached(core.untilSunrise, 'rise', s, now));
  q('earthlbl').textContent = t(eUp ? 'untilEarthset' : 'untilEarthrise');
  setDur(q('eartht'), eUp ? untilCached(core.untilEarthset, 'eset', s, now) : untilCached(core.untilEarthrise, 'erise', s, now));
  const sc = q('sunchip'), ec = q('earthchip');
  sc.textContent = (lit ? '☀ ' : '◐ ') + t(lit ? 'sunlit' : 'dark');
  sc.classList.toggle('on', lit); sc.classList.toggle('sun', lit); sc.classList.toggle('off', !lit);
  ec.textContent = (eUp ? '● ' : '○ ') + t(eUp ? 'earthUp' : 'earthDown');
  ec.classList.toggle('on', eUp); ec.classList.toggle('earth', eUp); ec.classList.toggle('off', !eUp);
  q('earthel').textContent = `${t('earthEl')} ${fmtDeg(earth.el)} · ${t('az')} ${earth.az.toFixed(0)}°`;
}

/** Period values of one site (from LLSN.window; changes only with the period). */
function fillPeriod(s, w, q) {
  const m = w.metrics.get(s.id); if (!m) return;
  q('range').textContent = `${isoDay(w.i0)} → ${isoDay(w.i1)} · ${fmtDaysShort(w.days)} ${t('days')}`;
  const put = (k, frac) => {
    q(`p${k}`).textContent = `${Math.round(frac * 100)}%`;
    q(`p${k}d`).textContent = `${(frac * w.days).toFixed(1)} ${t('dOf')} ${fmtDaysShort(w.days)} ${t('days')}`;
  };
  put('sun', m.sun_frac); put('earth', m.earth_frac); put('both', m.both_frac);
  q('pdark').textContent = fmtHours(m.longest_dark_h) ?? '—';
  q('pdarkd').textContent = `${(m.longest_dark_h / 24).toFixed(1)} ${t('days')}`;
}

const focusSite = () => byId(window.LLSN.focus) || core.state.sites[0];
const anQ = k => document.getElementById('an-' + k);

/** Right panel header: focused site's name (from the data, never hardcoded), group, coordinates, tags, pin state. */
function renderFocusHead() {
  const s = focusSite(); if (!s) return;
  $('#an-name').textContent = nameOf(s);
  $('#an-meta').textContent = `${t('g_' + s.group)} · ${coordText(s)}`;
  $('#an-tags').innerHTML = siteTags(s);
  renderFocusPin();
}
function renderFocusPin() {
  const s = focusSite(); if (!s) return;
  const on = pins.includes(s.id), b = $('#an-pin');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = (on ? '★ ' : '☆ ') + t(on ? 'anPinned' : 'pin');
  b.title = t(on ? 'unpin' : 'pinHint');
}

/** Instant values at the selected time (cheap; runs every animation frame for the focused + pinned sites). */
function renderInstant() {
  $('#time-label').textContent = fmtUTC(now);
  const f = focusSite(); if (f) fillInstant(f, anQ);
  for (const el of document.querySelectorAll('#cards .card[data-id]')) fillInstant(byId(el.dataset.id), k => el.querySelector('.v-' + k));
}

function renderPeriodCards() {
  const w = window.LLSN.window; if (!w) return;
  const f = focusSite(); if (f) fillPeriod(f, w, anQ);
  for (const el of document.querySelectorAll('#cards .card[data-id]')) {
    fillPeriod(byId(el.dataset.id), w, k => el.querySelector('.v-' + k));
    el.querySelector('.v-tags').innerHTML = siteTags(byId(el.dataset.id));
  }
}

// ------------------------------------------------------------ time + period
/** Recompute the period results for every site. Called only when the period start or length changes. */
function setPeriod(start, days) {
  const [a, b] = core.hourRange();
  periodDays = Math.max(1, Math.round(days));
  i0 = Math.min(Math.max(dayStart(start), a), b);
  const want = i0 + periodDays * 24 - 1;
  i1 = Math.min(b, want);
  const metrics = new Map();
  for (const s of core.state.sites) metrics.set(s.id, core.metrics(s, i0, i1));
  const hours = i1 - i0 + 1;
  window.LLSN.window = { i0, i1, hours, days: hours / 24, clipped: want > b, mode: String(periodDays), metrics };
  const sl = $('#slider');
  sl.min = i0; sl.max = i1;
  $('#scrub-start').textContent = isoDay(i0); $('#scrub-end').textContent = isoDay(i1);
  $('#t-date').value = isoDay(i0);
  $('#t-days').value = periodDays;
  document.querySelectorAll('#t-period button').forEach(btn => btn.setAttribute('aria-pressed', String(Number(btn.dataset.days) === periodDays)));
  $('#period-label').textContent = `${t('periodIs')} ${isoDay(i0)} → ${isoDay(i1)} (${fmtDaysShort(hours / 24)} ${t('days')})` +
    (want > b ? ` · ${t('clipped')}` : '');
  renderPeriodCards();
  renderPicker();                                          // ranking uses the period metrics
  window.dispatchEvent(new CustomEvent('llsn:window', { detail: window.LLSN.window }));
  setTime(Math.min(Math.max(now, i0), i1));
  saveURL();
}

export function setTime(i) {
  now = Math.min(Math.max(i, i0), i1);
  $('#slider').value = now;
  $('#slider').setAttribute('aria-valuetext', fmtUTC(now));
  placeTip();
  const tod = now - dayStart(now), hh = Math.floor(tod), mm = Math.round((tod - hh) * 60);
  if (document.activeElement !== $('#t-tod')) $('#t-tod').value = `${String(hh + (mm === 60 ? 1 : 0)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
  renderInstant();
  window.dispatchEvent(new CustomEvent('llsn:time', { detail: { i: now, date: core.hourToDate(now) } }));
}

/** Slider drags fire 'input' several times per frame: apply only the latest value once per animation frame. */
let pendingTime = null;
function setTimeSoon(i) {
  if (pendingTime === null) requestAnimationFrame(() => { const x = pendingTime; pendingTime = null; setTime(x); });
  pendingTime = i;
}

function setPlaying(on) {
  playing = on;
  const b = $('#play');
  b.textContent = on ? '❚❚' : '▶';
  b.setAttribute('aria-label', t(on ? 'pause' : 'play'));
  b.setAttribute('aria-pressed', String(on));
  clearInterval(timer);
  if (on) {
    if (now >= i1) setTime(i0);                            // at the end: start the period again
    timer = setInterval(() => {
      const step = Number($('#speed').value);              // hours per frame — only the animation speed
      if (now + step >= i1) { setTime(i1); setPlaying(false); return; }   // stop at the end of the period
      setTime(now + step);
    }, 100);
  }
}

// ------------------------------------------------------------ scrubber (selected time inside the period)
// Drag start pauses; release stays paused; Play resumes from the current position. Keyboard: ←/→ 1 h, Shift 1 day,
// PageUp/PageDown 1 day, Home/End = period start/end. Only the selected time moves: period % never change here.
let dragging = false;
function placeTip() {
  const tip = $('#scrub-tip'); if (!tip || tip.hidden) return;
  const f = i1 > i0 ? (now - i0) / (i1 - i0) : 0;
  tip.textContent = fmtUTC(now);
  tip.style.left = `calc(${(f * 100).toFixed(3)}% + ${(8 - 16 * f).toFixed(1)}px)`;   // follows the thumb centre
}
function showTip(on) { $('#scrub-tip').hidden = !on; placeTip(); }
function wireScrubber() {
  const sl = $('#slider');
  sl.addEventListener('pointerdown', () => { dragging = true; if (playing) setPlaying(false); showTip(true); });
  const end = () => { if (!dragging) return; dragging = false; showTip(false); };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  sl.addEventListener('input', e => { if (playing) setPlaying(false); setTimeSoon(Number(e.target.value)); });
  sl.addEventListener('keydown', e => {
    const day = 24;
    let to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = now + (e.shiftKey ? day : 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = now - (e.shiftKey ? day : 1);
    else if (e.key === 'PageUp') to = now + day;
    else if (e.key === 'PageDown') to = now - day;
    else if (e.key === 'Home') to = i0;
    else if (e.key === 'End') to = i1;
    if (to === null) return;
    e.preventDefault();
    if (playing) setPlaying(false);
    setTime(to);
    showTip(true);
  });
  sl.addEventListener('blur', () => { if (!dragging) showTip(false); });
}

// ------------------------------------------------------------ URL state (shareable links for the TV)
let urlTimer = null;
function saveURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const p = new URLSearchParams(location.search);
    p.set('sites', pins.join(','));
    if (window.LLSN.focus) p.set('focus', window.LLSN.focus);
    p.set('d', isoDay(i0)); p.set('p', String(periodDays));
    const user = core.state.sites.filter(s => s.group === 'custom' && s.user);
    if (user.length) p.set('u', user.map(s => `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`).join(';')); else p.delete('u');
    p.delete('t');
    history.replaceState(null, '', `${location.pathname}?${p.toString().replace(/%2C/g, ',')}${location.hash}`);
  }, 300);
}

// ------------------------------------------------------------ detail tabs
const TABS = ['horizon', 'dates', 'relay', 'korea', 'story', 'compare'];
function selectTab(name, focusTab = false) {
  if (!TABS.includes(name)) name = 'horizon';
  for (const k of TABS) {
    const tab = $('#tab-' + k), panel = document.getElementById(tab.getAttribute('aria-controls'));
    const on = k === name;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
    if (on && focusTab) tab.focus();
  }
  try { localStorage.setItem('llsn.tab', name); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event('resize'));               // canvases inside the shown panel re-measure
}
function wireTabs() {
  const list = $('#tabs');
  list.addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) selectTab(b.id.slice(4)); });
  list.addEventListener('keydown', e => {
    const cur = TABS.indexOf(document.activeElement?.id?.slice(4)); if (cur < 0) return;
    const to = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    selectTab(TABS[(to + TABS.length) % TABS.length], true);
  });
  let saved = null; try { saved = localStorage.getItem('llsn.tab'); } catch (e) { /* ignore */ }
  selectTab(params.get('tab') || saved || 'horizon');
}

// ------------------------------------------------------------ #about hash route (same page: pins, time and language stay)
function route() {
  const about = location.hash === '#about';
  $('#viewer').hidden = about;
  $('#about').hidden = !about;
  $('#nav-about').setAttribute('aria-current', about ? 'page' : 'false');
  $('#nav-viewer').setAttribute('aria-current', about ? 'false' : 'page');
  document.body.classList.toggle('route-about', about);
  if (about) window.scrollTo(0, 0);
  else window.dispatchEvent(new Event('resize'));          // the globe re-measures after being hidden
}

// ------------------------------------------------------------ boot
function relabel() {
  applyI18n();
  $('#lang').value = getLang();
  fillGroups();
  renderPicker();
  buildCards();
  renderFocusHead();
  renderPeriodCards();
  renderInstant();
  setPlaying(playing);
  setPeriodLabelsOnly();
}
function setPeriodLabelsOnly() {
  const w = window.LLSN.window; if (!w) return;
  $('#period-label').textContent = `${t('periodIs')} ${isoDay(w.i0)} → ${isoDay(w.i1)} (${fmtDaysShort(w.days)} ${t('days')})` +
    (w.clipped ? ` · ${t('clipped')}` : '');
}

async function main() {
  applyI18n();
  $('#lang').value = getLang();
  $('#lang').addEventListener('change', e => setLang(e.target.value));
  window.addEventListener('llsn:lang', relabel);
  window.addEventListener('hashchange', route);
  route();
  // the desktop viewer fills the window below the header: keep --hdr equal to the header (+ mock banner) height
  const hdr = () => document.documentElement.style.setProperty('--hdr',
    `${$('header.top').offsetHeight + ($('.mock-banner').offsetHeight ? $('.mock-banner').offsetHeight + 16 : 0)}px`);
  new ResizeObserver(hdr).observe($('header.top'));
  new ResizeObserver(hdr).observe($('.mock-banner'));
  initAbout();
  try {
    await core.loadData('data/');
  } catch (e) {
    $('#cards').innerHTML = `<p class="error">${t('error')}: ${esc(e.message)}</p>`;
    $('#an-name').textContent = `${t('error')}: ${e.message}`;
    throw e;
  }
  document.body.classList.toggle('is-mock', core.state.mock);

  // initial state from the URL: ?sites=A,B,C&focus=A&d=YYYY-MM-DD&p=30 (old ?t=<hour|ISO> still works)
  // pins: ?sites=A,B,C (shared link) > saved pins > default; focus: ?focus=ID > first pin
  const ids = new Set(core.state.sites.map(s => s.id));
  let saved = null; try { saved = localStorage.getItem('llsn.pins'); } catch (e) { /* ignore */ }
  const want = (params.has('sites') ? params.get('sites') : (saved ?? DEFAULT_CMP.join(','))).split(',').filter(Boolean);
  requestedPins = new Set(want.filter(id => !ids.has(id)));           // custom points arrive later via addSite
  pins = [...new Set(want.filter(id => ids.has(id)))];
  const focus0 = ids.has(params.get('focus')) ? params.get('focus') : (pins[0] || core.state.sites[0].id);
  const [a, b] = core.hourRange();
  let start, t0;
  const tp = params.get('t'), dp = params.get('d');
  if (tp) t0 = isNaN(tp) ? core.dateToHour(new Date(tp)) : Number(tp);
  else if (dp) t0 = core.dateToHour(new Date(dp + 'T00:00:00Z')) + 12;
  else t0 = Math.floor(core.dateToHour(new Date()));       // default: today, current UTC hour
  if (!isFinite(t0)) t0 = 0;
  t0 = Math.min(Math.max(t0, a), b);
  start = dayStart(t0);
  const p0 = Number(params.get('p')); periodDays = p0 > 0 ? p0 : 30;

  window.LLSN.now = () => now;
  window.LLSN.setTime = setTime;
  window.LLSN.setTimeSoon = setTimeSoon;
  window.LLSN.pick = pick;                                 // globe marker click -> focus (select only, never pins)
  window.LLSN.pin = pin; window.LLSN.unpin = unpin;
  window.LLSN.pins = () => pins.slice();
  window.LLSN.compare = () => pins.slice();                // old name kept for modules
  window.LLSN.rankKey = rankKey;
  window.LLSN.sortMode = () => sortMode;
  try { const sv = localStorage.getItem('llsn.sort'); if (sv && SORTS[sv]) sortMode = sv; } catch (e) { /* ignore */ }
  window.LLSN.initialParams = new URLSearchParams(params);       // URL at page load (before saveURL rewrites it)
  /** Start the analysis period on day `startHour` (hour index), keeping the time of day; `days` = period length. */
  window.LLSN.setPeriod = (startHour, days = periodDays) => { now = dayStart(startHour) + (now - dayStart(now)); setPeriod(startHour, days); };
  /** Add (or replace) a site computed in the browser (custom_site.js): joins the picker, cards, tables and filters. */
  window.LLSN.addSite = (site, horizon, { focus = true } = {}) => {
    const k = core.state.sites.findIndex(x => x.id === site.id);
    if (k >= 0) core.state.sites[k] = site; else core.state.sites.push(site);
    core.state.horizons.set(site.id, horizon);
    const w = window.LLSN.window;
    if (w) w.metrics.set(site.id, core.metrics(site, w.i0, w.i1));
    fillGroups();
    if (focus || requestedPins.has(site.id)) { requestedPins.delete(site.id); if (!pins.includes(site.id)) { pins.push(site.id); savePins(); } }
    buildCards(); renderPicker();
    if (focus) pick(site.id);
    window.dispatchEvent(new CustomEvent('llsn:sites', { detail: { id: site.id } }));
    if (w) window.dispatchEvent(new CustomEvent('llsn:window', { detail: w }));
    saveURL();
  };
  window.LLSN.focus = focus0;
  fillGroups();
  now = t0;
  setPeriod(start, periodDays);
  buildCards();
  renderPicker();
  renderFocusHead();
  setTime(t0);
  setPlaying(false);
  wireScrubber();
  wireTabs();

  // picker: item = select (focus); star = pin/unpin
  $('#pk-q').addEventListener('input', e => { query = e.target.value.trim(); renderPicker(); });
  $('#pk-group').addEventListener('change', e => { group = e.target.value; renderPicker(); });
  $('#pk-sort').value = sortMode;
  $('#pk-sort').addEventListener('change', e => { if (SORTS[e.target.value]) { sortMode = e.target.value; saveSort(); renderPicker(); } });
  $('#pk-list').addEventListener('click', e => {
    const p = e.target.closest('.pk-pin'); if (p) { togglePin(p.dataset.id); return; }
    const b2 = e.target.closest('.pk-item'); if (b2) pick(b2.dataset.id);
  });
  $('#rk-btn').addEventListener('click', e => {
    const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
    e.currentTarget.setAttribute('aria-expanded', String(open)); $('#rk-info').hidden = !open;
  });
  $('#an-pin').addEventListener('click', () => togglePin(focusSite().id));
  // cards of the pinned sites: click = focus, × = unpin
  $('#cards').addEventListener('click', e => {
    const rm = e.target.closest('.rm');
    if (rm) { e.stopPropagation(); unpin(rm.closest('.card').dataset.id); return; }
    const c = e.target.closest('.card[data-id]'); if (c) setFocus(c.dataset.id);
  }, true);
  $('#cards').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-id]')) { e.preventDefault(); setFocus(e.target.dataset.id); }
  });
  window.addEventListener('llsn:focus', () => { markFocus(); renderPicker(); renderFocusHead(); renderPeriodCards(); renderInstant(); saveURL(); });
  window.addEventListener('llsn:filter', () => { renderPicker(); renderPeriodCards(); renderFocusHead(); });

  // time + period controls
  $('#t-date').addEventListener('change', e => {
    if (!e.target.value) return;
    const d = core.dateToHour(new Date(e.target.value + 'T00:00:00Z'));
    if (!isFinite(d)) return;
    now = d + (now - dayStart(now));                       // keep the time of day
    setPeriod(d, periodDays);
  });
  $('#t-tod').addEventListener('change', e => {
    const [hh, mm] = (e.target.value || '0:0').split(':').map(Number);
    setTime(dayStart(now) + hh + (mm || 0) / 60);
  });
  $('#t-period').addEventListener('click', e => { const b2 = e.target.closest('button'); if (b2) setPeriod(i0, Number(b2.dataset.days)); });
  $('#t-days').addEventListener('change', e => { const v = Number(e.target.value); if (v > 0) setPeriod(i0, v); });
  $('#play').addEventListener('click', () => setPlaying(!playing));

  window.dispatchEvent(new CustomEvent('llsn:ready', { detail: { state: core.state } }));
  loadExtraModules();
}

async function loadExtraModules() {
  try {
    const list = await (await fetch('js/modules.json', { cache: 'no-cache' })).json();
    for (const m of list) import(`./${m}`).catch(e => console.error('module failed:', m, e));
  } catch (e) { /* no extra modules */ }
}

main();
