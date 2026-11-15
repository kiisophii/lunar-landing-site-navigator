// date_slip.js — "What if the landing slips 1 or 2 weeks?" (card 19 data, Dongju).
// Reads web/data/date_slip/<ID>.json (contract section 16): for every landing day 2026-01-01 … 2027-12-31,
// metrics over the first 14 days on the surface, and the change after a +7 d / +14 d slip.
// Top: table for the focused site. Bottom: all sites ranked by the worst extra darkness after a 14-day slip.
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, fmtHours, LLSN } from './ui_shared.js';

addStrings({
  dsTitle: 'What if the landing slips 1 or 2 weeks?', dsAria: 'Landing-date slip summary',
  dsWhy: 'Every landing day in 2026–2027 is compared with the same site landed 7 or 14 days later. Values cover the first 14 days on the surface (hourly, real terrain horizon).',
  dsMetric: 'Metric', dsTypical: 'typical change', dsWorst: 'worst change', dsWorse: 'days that get worse',
  dsSun: 'Sunlight', dsEarth: 'Direct-to-Earth', dsBoth: 'Sun + Earth together', dsDark: 'Longest shadow',
  dsBest: 'Highest Sun + Earth day: {d} (both {b}, longest dark {h})', dsWorstDay: 'Lowest Sun + Earth day: {d} (both {b}, longest dark {h})',
  dsRankTitle: 'All sites: worst extra darkness after a 14-day slip', dsRankHint: 'Shorter bar = more slip-tolerant. Click a bar to compare that site.',
  dsFull: '{n} sites where a 14-day slip can turn the whole first two weeks into night (+{h} h or more):',
  dsCustom: 'The date-slip table is available for catalogue sites; for your own points use the landing-date scan above.',
  dsNone: 'No slip table for this site (no real terrain horizon yet).', dsLoading: 'Loading slip tables…',
  dsNote: 'pp = percentage points. Typical = median of |change| over all landing days; worst = most unfavourable change, with its dates. Landing at 00:00 UTC; geometry only.',
}, {
  dsTitle: '착륙이 1~2주 밀리면?', dsAria: '착륙일 지연 요약',
  dsWhy: '2026–2027년의 모든 착륙일을 7일 또는 14일 늦게 착륙한 경우와 비교한다. 값은 착륙 후 첫 14일 동안이다 (1시간 간격, 실제 지형 지평선).',
  dsMetric: '지표', dsTypical: '보통 변화', dsWorst: '최악 변화', dsWorse: '나빠지는 날 비율',
  dsSun: '햇빛', dsEarth: '직접 교신', dsBoth: '해·지구 동시', dsDark: '최장 그늘',
  dsBest: '해·지구 동시 비율이 가장 높은 날: {d} (둘 다 {b}, 최장 그늘 {h})', dsWorstDay: '해·지구 동시 비율이 가장 낮은 날: {d} (둘 다 {b}, 최장 그늘 {h})',
  dsRankTitle: '모든 착륙지: 14일 밀렸을 때 최장 그늘이 최대 얼마나 늘어나나', dsRankHint: '막대가 짧을수록 지연에 강하다. 막대를 누르면 그 착륙지를 비교에 넣는다.',
  dsFull: '14일 밀리면 첫 2주 전체가 밤이 될 수 있는 착륙지 {n}곳 (+{h} h 이상):',
  dsCustom: '지연 표는 목록 착륙지에만 있다. 내 착륙 지점은 위의 착륙 날짜 훑어보기를 쓰면 된다.',
  dsNone: '이 착륙지는 지연 표가 없다 (실제 지형 지평선이 아직 없음).', dsLoading: '지연 표 불러오는 중…',
  dsNote: 'pp = 퍼센트포인트. 보통 변화 = 모든 착륙일의 |변화| 중앙값, 최악 변화 = 가장 불리한 변화와 그 날짜. 00:00 UTC 착륙, 기하만.',
});

const ROWS = [['sun_frac', 'dsSun', 'sun'], ['earth_frac', 'dsEarth', 'earth'], ['both_frac', 'dsBoth', 'both'], ['longest_dark_h', 'dsDark', 'dark']];
const cache = new Map();
let sec, tableEl, daysEl, rankEl, rankFull, siteEl, all = null;
const FULL_NIGHT_H = 330;

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pct = f => `${Math.round(f * 100)}%`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// sites computed in the browser (custom points, group "custom") have no precomputed slip table: never request one
const isCustom = s => !s || s.group === 'custom' || String(s.id).startsWith('USER_');

function load(id) {
  if (String(id).startsWith('USER_')) return Promise.resolve(null);
  if (!cache.has(id)) cache.set(id, fetch(`data/date_slip/${id}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(id);
}

function init() {
  sec = document.getElementById('llsn-slip');
  if (!sec) { sec = document.createElement('section'); sec.id = 'llsn-slip'; sec.className = 'panel'; document.getElementById('llsn-dates')?.after(sec); }
  sec.dataset.i18nAria = 'dsAria';
  sec.innerHTML = `
    <h2><span data-i18n="dsTitle"></span> <span class="ds-site muted"></span></h2>
    <p data-i18n="dsWhy" style="margin:0 0 .6em"></p>
    <div class="ds-table"></div>
    <div class="ds-days num"></div>
    <h3 data-i18n="dsRankTitle"></h3>
    <p class="hint" data-i18n="dsRankHint"></p>
    <div class="ds-rank"></div>
    <div class="ds-rank-full"></div>
    <p class="hint" data-i18n="dsNote"></p>`;
  const st = document.createElement('style');
  st.dataset.owner = 'date_slip.js';
  st.textContent = `
    #llsn-slip .ds-site { font-weight: 400; font-size: .95rem; }
    #llsn-slip .ds-table { overflow-x: auto; }
    #llsn-slip table { border-collapse: collapse; width: 100%; font-size: .9rem; }
    #llsn-slip th, #llsn-slip td { padding: .35em .6em; border-bottom: 1px solid var(--border); text-align: right; white-space: nowrap; }
    #llsn-slip th:first-child, #llsn-slip td:first-child { text-align: left; }
    #llsn-slip thead th { color: var(--muted); font-weight: 600; font-size: .8rem; }
    #llsn-slip td.sun:first-child { color: var(--sun); } #llsn-slip td.earth:first-child { color: var(--earth); } #llsn-slip td.both:first-child { color: var(--relay); }
    #llsn-slip td .when { display: block; color: var(--muted); font-size: .72rem; }
    #llsn-slip .bad { color: var(--warn); font-weight: 700; }
    #llsn-slip .ds-days p { margin: .3em 0; font-size: .9rem; }
    #llsn-slip h3 { margin: 1em 0 .2em; font-size: 1rem; }
    #llsn-slip .ds-rank { display: grid; grid-template-columns: minmax(8em, 14em) 1fr; gap: 2px .6em; font-size: .82rem; }
    #llsn-slip .ds-rank button { all: unset; display: contents; cursor: pointer; }
    #llsn-slip .ds-rank .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #llsn-slip .ds-rank .bar { position: relative; height: 1.25em; }
    #llsn-slip .ds-rank .bar i { position: absolute; left: 0; top: 15%; bottom: 15%; background: var(--off); border-radius: 3px; }
    #llsn-slip .ds-rank .bar b { position: absolute; top: 0; font-weight: 600; font-family: var(--font-num); }
    #llsn-slip .ds-rank .is-focus .nm { font-weight: 700; } #llsn-slip .ds-rank .is-focus .bar i { background: var(--relay); }
    #llsn-slip .ds-rank button:focus-visible .nm { outline: 2px solid var(--text); }
    #llsn-slip .ds-full { margin: .6em 0 0; font-size: .85rem; line-height: 1.9; }
    #llsn-slip .ds-chip { font: inherit; font-size: .78rem; padding: .05em .55em; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; }
    #llsn-slip .ds-chip.is-focus { border-color: var(--relay); color: var(--relay); font-weight: 700; }`;
  document.head.appendChild(st);
  tableEl = sec.querySelector('.ds-table'); daysEl = sec.querySelector('.ds-days'); rankEl = sec.querySelector('.ds-rank'); rankFull = sec.querySelector('.ds-rank-full'); siteEl = sec.querySelector('.ds-site');
  translate(sec);
  rankFull.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b && typeof LLSN().pick === 'function') LLSN().pick(b.dataset.id); });
  rankEl.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b && typeof LLSN().pick === 'function') LLSN().pick(b.dataset.id); });
  window.addEventListener('llsn:focus', render);
  window.addEventListener('llsn:lang', () => { translate(sec); render(); });
  // the ranking needs every site's file (≈ 1.4 MB): load when the panel comes near the screen
  // (or after 6 s at the latest: hidden tabs never report an intersection)
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadAll(); }, { rootMargin: '600px' });
  io.observe(sec);
  setTimeout(loadAll, 6000);
  render();
}

let loading = false;
async function loadAll() {
  if (loading) return;
  loading = true;
  rankEl.textContent = t('dsLoading');
  const ids = LLSN().state.sites.filter(s => !isCustom(s)).map(s => s.id);
  const got = await Promise.all(ids.map(id => load(id)));
  all = got.filter(Boolean);
  render();
}

function cellPP(s, frac) {
  const v = s.worst_change;
  const txt = frac ? `${v > 0 ? '+' : ''}${v.toFixed(1)} pp` : `${v > 0 ? '+' : ''}${Math.round(v)} h`;
  const bad = frac ? v <= -50 : v >= 168;
  return `<span class="${bad ? 'bad' : ''}">${txt}</span><span class="when">${s.worst_from} → ${s.worst_to}</span>`;
}

async function render() {
  const site = getFocus(); if (!site) return;
  siteEl.textContent = `· ${siteName(site)}`;
  const d = await load(site.id);
  if (getFocus()?.id !== site.id) return;
  if (!d) { tableEl.innerHTML = `<p class="note">${t(isCustom(site) ? 'dsCustom' : 'dsNone')}</p>`; daysEl.innerHTML = ''; }
  else {
    const head = `<thead><tr><th>${t('dsMetric')}</th><th>+7 d · ${t('dsTypical')}</th><th>+7 d · ${t('dsWorst')}</th>
      <th>+14 d · ${t('dsTypical')}</th><th>+14 d · ${t('dsWorst')}</th><th>+14 d · ${t('dsWorse')}</th></tr></thead>`;
    const body = ROWS.map(([k, lbl, cls]) => {
      const a = d.slip['+7d'][k], b = d.slip['+14d'][k], frac = k !== 'longest_dark_h';
      const typ = s => (frac ? `${s.median_abs_change.toFixed(1)} pp` : `${Math.round(s.median_abs_change)} h`);
      return `<tr><td class="${cls}">${t(lbl)}</td><td>${typ(a)}</td><td>${cellPP(a, frac)}</td><td>${typ(b)}</td><td>${cellPP(b, frac)}</td><td>${pct(b.share_of_days_worse)}</td></tr>`;
    }).join('');
    tableEl.innerHTML = `<table>${head}<tbody>${body}</tbody></table>`;
    const day = (key, o) => fill(t(key), { d: o.landing, b: pct(o.both_frac), h: fmtHours(o.longest_dark_h) });
    daysEl.innerHTML = `<p>▲ ${day('dsBest', d.best)}</p><p>▼ ${day('dsWorstDay', d.worst)}</p>`;
  }
  if (!all) return;
  const st = LLSN().state;
  const rows = all.map(x => ({ id: x.id, h: x.slip['+14d'].longest_dark_h.worst_change })).sort((a, b) => a.h - b.h || a.id.localeCompare(b.id));
  const max = Math.max(336, ...rows.map(r => r.h));
  // sites where a 14-day slip can turn the whole stay into night (>= 330 h) are grouped into one line
  const full = rows.filter(r => r.h >= FULL_NIGHT_H), part = rows.filter(r => r.h < FULL_NIGHT_H);
  const fullLine = full.length ? `<p class="ds-full">${fill(t('dsFull'), { n: full.length, h: FULL_NIGHT_H })} ${full.map(r => {
    const s = st.sites.find(x => x.id === r.id);
    return `<button type="button" class="ds-chip${r.id === site.id ? ' is-focus' : ''}" data-id="${esc(r.id)}">${esc(s ? siteName(s) : r.id)} +${r.h} h</button>`;
  }).join(' ')}</p>` : '';
  rankEl.innerHTML = part.map(r => {
    const s = st.sites.find(x => x.id === r.id), w = (82 * r.h / max).toFixed(1);   // leave room for the label after the bar
    return `<button type="button" data-id="${esc(r.id)}" class="${r.id === site.id ? 'is-focus' : ''}" aria-label="${esc(s ? siteName(s) : r.id)}: +${r.h} h">
      <span class="nm">${esc(s ? siteName(s) : r.id)}</span>
      <span class="bar"><i style="width:${w}%"></i><b style="left:calc(${w}% + .4em)">+${r.h} h</b></span></button>`;
  }).join('');
  rankFull.innerHTML = fullLine;
}

whenReady(init);
