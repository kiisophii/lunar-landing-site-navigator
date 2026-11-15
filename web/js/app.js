// app.js — page wiring (integrator). 3-column layout (design spec v65): full-screen 3D Moon, left panel
// (① mission conditions, ② site list with sort / pin / relay assumption), right comparison tray (selected time,
// scrubber + speed + play). The comparison tables, the decision brief and About live in their own modules.
// Feature modules (web/js/modules.json) are imported after 'llsn:ready' and listen to these events:
//   'llsn:ready'   detail: { state }                         after data is loaded
//   'llsn:time'    detail: { i, date }                       selected time changed (scrubber, play, time inputs)
//   'llsn:window'  detail: LLSN.window                       analysis period changed (period results recomputed)
//   'llsn:focus'   detail: { id }                            focused site changed (ui_shared.setFocus)
//   'llsn:filter'  detail: { pass }                          filters changed (filters.js)
//   'llsn:lang'    detail: { lang }                          language toggled
//   'llsn:pins'    detail: { pins: [{id, n}] }               pinned (compared) sites changed — no limit, stable #numbers
//   'llsn:relay'   detail: { on }                            "assume a relay tower" switched
// LLSN.window = { i0, i1, hours, days, clipped, mode, metrics: Map(id -> core.metrics) }.
// The period results depend ONLY on [i0, i1]: the selected time and the play speed never change them.
import * as core from './core.js';
import { t, applyI18n, toggleLang, getLang } from './i18n.js';
import { setFocus, addStrings } from './ui_shared.js';
import { relayPeriod, relayPeek, hourBits, TOWER_H } from './values.js';
import { iconSvg } from './icons.js';

addStrings({
  appName: 'Luna Sight', appSub: 'Lunar Landing Site Navigator', toAbout: 'About this tool',
  langAria: 'Language', c1: 'Mission conditions', c1Date: 'Landing date (UTC)', c1Period: 'Operations period',
  p7: '7 days', p295: 'Lunar day (29.5 d)', p90: '90 days', p365: '1 year', pCustom: '{d} days',
  c1Clipped: 'Computed only to 2030-12-31 (end of the ephemeris)', collapse: 'Collapse panel', expand: 'Expand panel',
  c1Expand: 'Expand', c1Landing: '{d} landing', c1NoCond: 'No conditions · all sites', c2: 'Candidates', c2All: 'All', relayPillTip: 'Assumption: a 15 m mast near the site, adding the hours the Earth is visible through it. Geometry only; signal strength is not included.', rlTower: 'Tower', rlKm: 'tower {k} km', c1AddCond: '+ Condition', c2Count: '{n}', c2Desc: 'Sites that meet every mission condition. Press + to add one to the comparison.', comparing: 'Comparing', otherCand: 'Other candidates', pinnedEmpty: 'No sites in the comparison yet.', pinMax: 'Up to 10 sites can be compared', pinNoTip: 'Comparison number (colour in the comparison)', c2Pinned: '· comparing {n}', c2Pass: '{n} meet all ① conditions',
  sortBy: 'Sort by', sortPre: 'Sort: ', s_both: 'Sun + Earth', s_sun: 'Sunlight', s_earth: 'Earth view', s_dark: 'Longest dark', s_name: 'Name',
  relayAssume: 'Relay tower', relayTowerH: 'Assumed · 15 m tower', relayTag: 'with tower', relayNone: 'no tower calc.', relayLoading: 'loading towers…',
  relayHint: '{h} m towers (up to 3) from data/relay — geometric line of sight only',
  sortHelpT: 'Sort order', sortHelp1: '', sortHelp2: 'Sites are ordered by one value only. There is no hidden weighting.',
  sortHelpBoth: 'Sun + Earth together: share of the period that is sunlit AND sees the Earth.',
  sortHelpSun: 'Sunlight: share of hours with ≥ 50 % of the solar disc above the local terrain horizon.',
  sortHelpEarth: 'Direct-to-Earth: share of hours with the Earth center above the terrain horizon (direct-to-Earth geometry).',
  sortHelpDark: 'Shortest longest-shadow: the longest continuous stretch without sunlight, shortest first.',
  sortHelp3: 'Pinned sites stay on top in the order you pinned them. The rank (1.) and ★ only show the position for the chosen sort.',
  more: 'Show {n} more', less: 'Show fewer', addSite: 'Add a site',
  pin: 'Pin to compare', unpin: 'Unpin', outside: 'outside ①', pendingShort: 'terrain pending',
  noneMatch: 'No site meets all conditions.', resetCond: 'Reset conditions',
  tDateAria: 'Selected date (UTC)', tTimeAria: 'Selected time of day (UTC)', trayCmpH: 'Compare candidates', trayMore: 'Detailed comparison', speedUp: 'Faster playback', speedDown: 'Slower playback', trayDescTable: '▲ = best among the compared sites.', tray: 'Comparison', trayEmpty: 'Pin sites in Candidates to compare them here', trayView: 'View', tv_table: 'Table', tv_dial: 'Lunar-day clock', tv_alt: 'Sun & Earth elevation',
  selTimeUTC: 'Selected time (UTC)', speedAria: 'Playback speed (animation only)', speedNote: 'speed changes the animation only',
  play: 'Play', pause: 'Pause', scrubAria: 'Selected time within the period. Arrow keys = 1 hour, Shift + arrow = 1 day.',
  scrubFor: 'Bands: {s} · top band = sunlit, bottom band = Earth in view', details: 'See details below ↓', collapseTray: 'Collapse tray',
  periodIs: 'Period', days: 'days', pinnedFull: '', scrollHint: 'Compare in detail', pagesAria: 'Screens', pgMap: 'Map', pgCmp: 'Detailed comparison', pgBrief: 'Site checks', expH: 'Export this analysis', expLead: 'Save the current conditions, candidates, and comparison as a file.', expPdf: 'PDF report', expPdfSub: 'For print and sharing',
  hudLine1: 'Earth-set edge (Earth-visibility limit) · LROC color · LOLA terrain',
  exportPdf: 'Export PDF', exportPdfTip: 'Print or save this comparison as a PDF (browser print dialog)', hudLine2: '{t}', hudSrc: 'Sun and Earth positions: JPL DE440s ephemeris (selected time, UTC)', pickOn: 'Click the Moon to place a point · Esc to cancel', cancel: 'Cancel',
  spBtn: 'South Pole', tb_relief: 'Terrain relief (LOLA)', tbt_relief: 'LOLA terrain shading with a fixed light from the north-west. No data values and no time dependence.', lgRelief: 'Terrain relief, LOLA', lgReliefNote: 'shading only, fixed light from the north-west; no values', tb_elev: 'Elevation (LOLA)', tbt_elev: 'LOLA terrain height in colour, over the same fixed-light terrain shading. No time dependence.', lgElev: 'Elevation (LOLA)', lgElevNote: 'true height above 1737.4 km (3D shape ×{x} for display only) · colours clamp at the ends · data range {a} … {b} km · fixed light from the north-west', tb_light: 'Sunlight now', tb_mean: 'Mean sunlight 2026–2030', tb_earthmap: 'Mean Earth visibility 2026–2030', tb_focus: 'Zoom to the focused site',
  tb_whole: 'Whole Moon', tb_south: 'South pole', tb_pick: 'Place a point on the Moon',
  tbt_light: 'Shadows for the Sun direction at the selected time (not necessarily the real current time).',
  tbt_mean: 'Mean visible fraction of the solar disc over 2026–2030 on a 948 m whole-Moon grid (data/gmaps_ppd32). Long-term average, not this period.',
  tbt_earthmap: 'Share of 2026–2030 with the Earth center above the terrain horizon, 948 m grid (data/gmaps_ppd32). Long-term average.',
  tbt_pick: 'Click the Moon: the point gets its own terrain horizon (computed in your browser) and joins the list.',
  toastPinned: 'Pinned to compare · {n}', toastUnpinned: 'Removed from comparison · {n}', toastCopied: 'Link copied', layerStatic: 'This map is a 2026–2030 average, so it does not change with time.', layerToLight: 'Switch to Sunlight now',
  legendMean: 'Mean sunlight 2026–2030', legendEarth: 'Mean Earth visibility 2026–2030', rankLbl: 'rank', rankTip: 'Position in the current sort (not the pin number)',
}, {
  appName: 'Luna Sight', appSub: 'Lunar Landing Site Navigator', toAbout: '이 도구 소개',
  langAria: '언어', c1: '미션 조건', c1Date: '착륙 날짜 (UTC)', c1Period: '운용 기간',
  p7: '7일', p295: '달의 하루 (29.5일)', p90: '90일', p365: '1년', pCustom: '{d}일',
  c1Clipped: '2030-12-31까지만 계산됨 (천체력 끝)', collapse: '패널 접기', expand: '패널 펼치기',
  c1Expand: '펼치기', c1Landing: '{d} 착륙', c1NoCond: '조건 없음 · 모든 착륙지', c2: '후보지', c2All: '전체', relayPillTip: '가정: 착륙지 근처 15 m 탑을 세워 그 탑을 거쳐 지구가 보이는 시간을 더합니다. 기하만 보며 신호 세기는 포함하지 않습니다.', rlTower: '탑', rlKm: '탑 {k} km', c1AddCond: '+ 조건', c2Count: '{n}곳', c2Desc: '모든 미션 조건을 만족하는 착륙지입니다. + 를 누르면 비교에 넣습니다.', comparing: '비교 중', otherCand: '다른 후보', pinnedEmpty: '아직 비교 중인 곳이 없습니다.', pinMax: '최대 10곳까지 비교할 수 있습니다', pinNoTip: '비교 번호 (비교에서 쓰는 색)', c2Pinned: '· 비교 {n}곳', c2Pass: '{n}곳이 ① 조건을 모두 만족',
  sortBy: '정렬 기준', sortPre: '정렬: ', s_both: '해+지구 동시', s_sun: '일조율', s_earth: '지구 가시율', s_dark: '가장 긴 그늘 짧은 순', s_name: '이름순',
  relayAssume: '중계탑', relayTowerH: '가정 · 15 m 탑', relayTag: '탑 포함', relayNone: '탑 계산 없음', relayLoading: '탑 자료 불러오는 중…',
  relayHint: '{h} m 탑(최대 3기), data/relay · 기하학적 가시성만',
  sortHelpT: '정렬 기준', sortHelp1: '', sortHelp2: '한 가지 기준으로만 줄 세웁니다. 숨은 가중치는 없습니다.',
  sortHelpBoth: '해+지구 동시: 기간 중 햇빛이 있고 동시에 지구가 보이는 시간 비율.',
  sortHelpSun: '일조율: 태양 원반의 50 % 이상이 지형 지평선 위에 있는 시간 비율.',
  sortHelpEarth: '지구 가시율: 지구 중심이 지형 지평선 위에 있는 시간 비율(직접 교신 기하).',
  sortHelpDark: '가장 긴 그늘 짧은 순: 햇빛 없이 이어지는 가장 긴 시간이 짧은 곳부터.',
  sortHelp3: '고정한 곳은 기준과 상관없이 맨 위(고정한 순서대로). 순위(1.)와 ★는 지금 기준에서의 순서일 뿐.',
  more: '{n}곳 더 보기', less: '접기', addSite: '착륙지 추가',
  pin: '비교에 고정', unpin: '고정 해제', outside: '조건 밖', pendingShort: '지형 계산 전',
  noneMatch: '조건을 모두 만족하는 곳이 없습니다.', resetCond: '조건 초기화',
  tDateAria: '선택 날짜 (UTC)', tTimeAria: '선택 시각 (UTC)', trayCmpH: '후보 비교', trayMore: '상세 비교', speedUp: '더 빠르게', speedDown: '더 느리게', trayDescTable: '▲ = 비교한 곳 중 가장 좋은 값.', tray: '비교', trayEmpty: '후보지에서 핀을 누르면 여기서 비교합니다', trayView: '비교 보기', tv_table: '표', tv_dial: '달의 하루 시계', tv_alt: '태양·지구 고도',
  selTimeUTC: '선택 시간 (UTC)', speedAria: '재생 속도 (애니메이션만)', speedNote: '속도는 애니메이션만 바꿈',
  play: '재생', pause: '일시정지', scrubAria: '기간 안의 선택 시각. 화살표 = 1시간, Shift + 화살표 = 1일.',
  scrubFor: '띠: {s} · 위 띠 = 햇빛, 아래 띠 = 지구 보임', details: '아래 상세 보기 ↓', collapseTray: '비교 접기',
  periodIs: '기간', days: '일', scrollHint: '상세 비교 보기', pagesAria: '화면', pgMap: '지도', pgCmp: '상세 비교', pgBrief: '착륙지 검증', expH: '이 분석 내보내기', expLead: '지금 조건, 후보, 비교를 파일로 저장합니다.', expPdf: 'PDF 보고서', expPdfSub: '인쇄·공유용',
  hudLine1: '지구가 지는 경계 · LROC 컬러 · LOLA 지형',
  exportPdf: 'PDF로 내보내기', exportPdfTip: '이 비교를 인쇄하거나 PDF로 저장합니다 (브라우저 인쇄 창)', hudLine2: '{t}', hudSrc: '태양·지구 위치: JPL DE440s 천체력 (선택 시각, UTC)', pickOn: '달을 눌러 지점을 고르세요 · Esc 취소', cancel: '취소',
  spBtn: '남극', tb_relief: '지형 음영 (LOLA)', tbt_relief: 'LOLA 지형 음영, 북서쪽 고정 조명. 값이 없고 시간에 따라 바뀌지 않습니다.', lgRelief: '지형 음영, LOLA', lgReliefNote: '음영만 표시, 북서쪽 고정 조명; 값 없음', tb_elev: '고도 (LOLA)', tbt_elev: 'LOLA 지형 높이를 색으로, 같은 고정 조명 지형 음영 위에 표시. 시간에 따라 바뀌지 않습니다.', lgElev: '고도 (LOLA)', lgElevNote: '기준 반지름 1737.4 km 대비 실제 높이 (3D 모양만 ×{x} 과장) · 양 끝 밖은 끝 색 · 자료 범위 {a} … {b} km · 북서쪽 고정 조명', tb_light: '선택 시각의 햇빛', tb_mean: '평균 일조 2026–2030', tb_earthmap: '평균 지구 가시 2026–2030', tb_focus: '보고 있는 착륙지로 확대',
  tb_whole: '달 전체', tb_south: '남극', tb_pick: '달에서 지점 찍기',
  tbt_light: '선택 시각의 태양 방향으로 그림자. 실제 현재 시각이 아닐 수 있음.',
  tbt_mean: '태양 원반이 보이는 시간 비율, 달 전체 2026–2030 평균, 948 m 격자(data/gmaps_ppd32). 이 기간 값이 아닌 장기 평균.',
  tbt_earthmap: '지구 중심이 지형 지평선 위에 있는 시간 비율, 2026–2030, 948 m 격자(data/gmaps_ppd32). 장기 평균.',
  tbt_pick: '달을 누르면 그 지점의 지형 지평선을 브라우저에서 계산해 목록에 넣습니다.',
  toastPinned: '비교에 고정 · {n}', toastUnpinned: '비교에서 뺌 · {n}', toastCopied: '링크를 복사했습니다', layerStatic: '이 지도는 2026–2030 평균이라 시간에 따라 바뀌지 않습니다.', layerToLight: '지금 일조로 바꾸기', legendMean: '평균 일조 2026–2030', legendEarth: '평균 지구 가시 2026–2030', rankLbl: '순위', rankTip: '지금 정렬 기준에서의 순서 (고정 번호 아님)',
});

const $ = sel => document.querySelector(sel);
const params = new URLSearchParams(location.search);
if (params.get('tv') === '1') document.documentElement.classList.add('tv');

const DEFAULT_PINS = ['SHACKLETON_RIM', 'ARTEMIS_HAWORTH', 'APOLLO17'];   // first visit only (team choice 11/14); a comparison, not a recommendation
const PERIODS = [['7', 'p7'], ['29.5', 'p295'], ['90', 'p90'], ['365', 'p365']];
const SORTS = ['both', 'sun', 'earth', 'dark'];   // 17-3: 'Name' removed (the copy's list)
const LIST_FIRST = 12;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ls.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ls.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};

let now = 0;                   // selected time (hour index, fractional)
let i0 = 0, i1 = 0;            // analysis period (inclusive hour indices)
let periodDays = 29.5;
let playing = false, raf = 0, lastTs = 0;
let pins = [];                 // [{id, n}] in pin order; n = stable display number (#1, #2, …), never reused while pinned
let sortKey = 'both', relayOn = false, showAll = true;   // the whole list scrolls inside the panel (no 'Show n more')

// ------------------------------------------------------------ formatting
const byId = id => core.state.sites.find(s => s.id === id);
const nameOf = s => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name);
/** Short name for the one-line list rows (full name on hover): catalogue 'short', KR without the group prefix / note. */
const rowName = s => (getLang() === 'ko' && s.name_ko ? s.name_ko.replace(/^아르테미스 후보:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') : (s.short || s.name));
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Selected time: EN 'Nov 15, 2026 · 04:00 UTC', KR '2026-11-15 04:00 UTC'. */
const fmtUTC = i => { const d = core.hourToDate(i), iso = d.toISOString();
  return getLang() === 'ko' ? iso.replace('T', ' ').slice(0, 16) + ' UTC' : `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${iso.slice(11, 16)} UTC`; };
const isoDay = i => core.hourToDate(i).toISOString().slice(0, 10);
const dayStart = i => Math.floor(i / 24) * 24;
const fmtDaysShort = d => (Math.abs(d - Math.round(d)) < 0.05 ? String(Math.round(d)) : d.toFixed(1));
const pctHTML = f => (f == null || !isFinite(f) ? '<span class="na">—</span>' : `${Math.round(f * 100)}<small>%</small>`);
export const SUN_ICON = iconSvg('sun', { size: 14 });
export const EARTH_ICON = iconSvg('earth', { size: 14 });
const ADD_ICON = iconSvg('pin-add', { size: 20, cls: 'pk-ic' });
const REM_ICON = iconSvg('pin-remove-filled', { size: 20, cls: 'pk-ic' });
export const PIN_ICON = iconSvg('pin', { size: 14 });

// ------------------------------------------------------------ pins (no limit; stable numbers)
const pinOf = id => pins.find(p => p.id === id);
function nextNumber() { return pins.length + 1; }
function renumber() { pins.forEach((p, k) => { p.n = k + 1; }); }   // 01, 02, … in comparison order (the copy)
function savePins() { store.set('pins', pins); }
function pinsChanged() {
  renumber(); savePins(); renderList(); saveURL();
  window.dispatchEvent(new CustomEvent('llsn:pins', { detail: { pins: pins.slice() } }));
}
export const PIN_MAX = 10;             // the copy compares up to 10 sites (colours 01-10)
function pin(id) {
  if (!byId(id) || pinOf(id)) return;
  if (pins.length >= PIN_MAX) { window.dispatchEvent(new CustomEvent('llsn:toast', { detail: { key: 'pinMax' } })); return; }
  pins.push({ id, n: nextNumber() }); pinsChanged();
}
function unpin(id) { if (!pinOf(id)) return; pins = pins.filter(p => p.id !== id); pinsChanged(); }
const togglePin = id => (pinOf(id) ? unpin(id) : pin(id));
/** Globe marker click / list click: focus the site (3D flies there, brief follows). Pinning is the pin button. */
function pick(id) { if (!byId(id)) return; setFocus(id); saveURL(); }

// ------------------------------------------------------------ ② site list
function metricsOf(id) { return window.LLSN.window?.metrics.get(id); }
/** Communication share shown on cards and used by the Earth sort: tower-included when the relay switch is on. */
export function linkShare(id) {
  const m = metricsOf(id);
  if (!m || m.pending) return { v: null, pending: !!m?.pending };
  if (!relayOn) return { v: m.earth_frac };
  const r = relayPeek(id, i0, i1);
  if (r === undefined) return { v: m.earth_frac, loading: true };
  if (r.state !== 'ok') return { v: m.earth_frac, noTower: true };
  return { v: r.pct, tower: true };
}
function sortValue(s) {
  const m = metricsOf(s.id);
  if (sortKey === 'name') return nameOf(s).toLowerCase();
  if (!m || m.pending) return null;
  if (sortKey === 'sun') return -m.sun_frac;
  if (sortKey === 'earth') { const l = linkShare(s.id).v; return l == null ? null : -l; }
  if (sortKey === 'dark') return m.longest_dark_h;
  return -m.both_frac;
}
/** All sites in the chosen order (no pins applied): rank = index + 1. Pending sites go last. */
export function sortedSites() {
  const arr = core.state.sites.map(s => ({ s, v: sortValue(s) }));
  arr.sort((a, b) => {
    if (a.v === null && b.v === null) return nameOf(a.s).localeCompare(nameOf(b.s));
    if (a.v === null) return 1; if (b.v === null) return -1;
    if (sortKey === 'name') return a.v.localeCompare(b.v);
    return a.v - b.v || nameOf(a.s).localeCompare(nameOf(b.s));
  });
  return arr.map(x => x.s);
}

function siteTags(s) {
  const out = [];
  const hz = core.state.horizons.get(s.id);
  if (s.user) out.push(`<span class="tag user">${t('g_custom')}</span>`);
  if (hz && hz.browser && hz.accuracy && hz.accuracy.lower) out.push(`<span class="tag warn" title="${esc(hz.accuracy.text || '')}">${t('lowerAccuracy')}</span>`);
  if (core.horizonMock(s)) out.push(`<span class="tag warn">${t('mockTerrain')}</span>`);
  else if (core.terrainPending(s)) out.push(`<span class="tag warn" title="${esc(t('terrainPendingTip'))}">${t('pendingShort')}</span>`);
  const pass = window.LLSN.filterPass;
  if (pass && !pass.has(s.id)) out.push(`<span class="tag">${t('outside')}</span>`);
  return out.join('');
}

/** Relay switch on: one line under rows that have tower data — direct % → with tower %, nearest tower km (data/relay). */
function relayLine(s, m) {
  if (!relayOn || !m || m.pending) return '';
  const r = relayPeek(s.id, i0, i1); if (!r || r.state !== 'ok' || !r.total) return '';
  const d = Math.round((r.direct / r.total) * 100), w = Math.round(((r.direct + r.via) / r.total) * 100);
  return `<span class="pk-relay">${iconSvg('relay-tower', { size: 14 })}<b>${t('rlTower')}</b><span class="num">${d}% → <em>${w}%</em></span>${r.distKm != null ? `<span>· ${fill(t('rlKm'), { k: r.distKm.toFixed(1) })}</span>` : ''}</span>`;
}
function rowHTML(s, rank) {
  const p = pinOf(s.id), m = metricsOf(s.id), focus = window.LLSN.focus === s.id;
  const pass = window.LLSN.filterPass, out = pass && !pass.has(s.id);
  const L = linkShare(s.id);
  const sunV = m && !m.pending ? pctHTML(m.sun_frac) : '<span class="na">—</span>';
  const earthV = L.v == null ? '<span class="na">—</span>' : pctHTML(L.v);
  const tower = relayOn ? (L.tower ? `<span class="tag relay">${t('relayTag')}</span>` : L.noTower ? `<span class="tag">${t('relayNone')}</span>` : L.loading ? `<span class="tag">…</span>` : '') : '';
  const chip = p ? `<span class="pk-chip num on" style="--sc:var(--c${p.n})" title="${esc(t('pinNoTip'))}">${String(p.n).padStart(2, '0')}</span>`
    : `<span class="pk-chip num" title="${esc(t('rankTip'))}"><span class="sr">${t('rankLbl')} </span>${rank}</span>`;
  return `<li class="pk-row${p ? ' pinned' : ''}${focus ? ' focus' : ''}${out ? ' out' : ''}" data-id="${s.id}"${p ? ` style="--sc:var(--c${p.n})"` : ''}>
    ${chip}
    <button type="button" class="pk-item" data-id="${s.id}" aria-current="${focus}">
      <span class="pk-main"><span class="pk-name"><span class="nm" title="${esc(nameOf(s))}">${esc(rowName(s))}</span>${rank === 1 && sortKey !== 'name' ? ` <span class="star" aria-label="1st">${iconSvg('star', { size: 12 })}</span>` : ''}</span>
        <span class="pk-grp">${t('g_' + s.group)}${siteTags(s)}${relayOn && !L.tower ? tower : ''}</span></span>
      <span class="pk-vals num"><span class="v sun" title="${esc(t('perSun'))}">${SUN_ICON}<span class="n">${sunV}</span></span><i class="pk-div" aria-hidden="true"></i><span class="v earth" title="${esc(t(relayOn ? 'relayTag' : 'perEarth'))}">${EARTH_ICON}<span class="n">${earthV}</span></span></span>
    </button>
    <button type="button" class="pk-pin" data-id="${s.id}" aria-pressed="${!!p}" aria-label="${esc(t(p ? 'unpin' : 'pin'))}: ${esc(nameOf(s))}" title="${esc(t(p ? 'unpin' : 'pin'))}">${p ? REM_ICON : ADD_ICON}</button>
    ${relayLine(s, m)}
  </li>`;
}

/** Date box shows 'Nov 14, 2026' (the copy); the native date input stays underneath as the real control. */
function syncDateLabel() {
  const inp = $('#c1-date'), lab = $('#c1-date-lbl'); if (!inp || !lab || !inp.value) return;
  lab.textContent = new Date(inp.value + 'T00:00:00Z').toLocaleDateString(getLang() === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function renderList() {
  if (!window.LLSN.window) return;
  const sorted = sortedSites(), rank = new Map(sorted.map((s, k) => [s.id, k + 1]));
  const pinned = pins.map(p => byId(p.id)).filter(Boolean);
  const passF = window.LLSN.filterPass;
  const rest = sorted.filter(s => !pinOf(s.id) && (!passF || passF.has(s.id)));   // conditions shorten the list (the copy)
  const shown = showAll ? rest : rest.slice(0, Math.max(0, LIST_FIRST - pinned.length));
  $('#pk-pinned').innerHTML = pinned.map(s => rowHTML(s, rank.get(s.id))).join('');
  $('#pk-pinned-empty').hidden = true;
  $('#pk-sep').hidden = !pinned.length;
  $('#pk-list').innerHTML = shown.map(s => rowHTML(s, rank.get(s.id))).join('');
  $('#c2-other').textContent = rest.length;
  const hidden = rest.length - shown.length;
  const more = $('#pk-more');
  more.hidden = true;
  more.textContent = showAll ? t('less') : fill(t('more'), { n: hidden });
  $('#c2-count').textContent = fill(t('c2Count'), { n: passF ? passF.size : core.state.sites.length });
  document.querySelector('.c2-bar .sort-row')?.style.setProperty('--pre', JSON.stringify(t('sortPre')));
  syncDateLabel();
  $('#c2-pinned').textContent = pins.length;
  const pass = window.LLSN.filterPass;
  $('#c2-pass').textContent = pass ? fill(t('c2Pass'), { n: pass.size }) : '';
  $('#c2-none').hidden = !(pass && pass.size === 0);
}

// ------------------------------------------------------------ time + period
function setPeriod(start, days) {
  const [a, b] = core.hourRange();
  periodDays = Math.max(1, Number(days) || 29.5);
  i0 = Math.min(Math.max(dayStart(start), a), b);
  const want = i0 + Math.round(periodDays * 24) - 1;
  i1 = Math.min(b, want);
  const metrics = new Map();
  for (const s of core.state.sites) metrics.set(s.id, core.terrainPending(s) ? { pending: true } : core.metrics(s, i0, i1));
  const hours = i1 - i0 + 1;
  window.LLSN.window = { i0, i1, hours, days: hours / 24, clipped: want > b, mode: String(periodDays), metrics };
  $('#c1-date').value = isoDay(i0);
  syncPeriodSelect();
  $('#c1-clipped').hidden = !(want > b);
  $('#slider').min = i0; $('#slider').max = i1;
  $('#scrub-a').textContent = isoDay(i0); $('#scrub-b').textContent = isoDay(i1);
  window.dispatchEvent(new CustomEvent('llsn:window', { detail: window.LLSN.window }));
  renderList();
  if (relayOn) primeRelay();
  setTime(Math.min(Math.max(now, i0), i1));
  drawScrub();
  saveURL();
}
function syncPeriodSelect() {
  const sel = $('#c1-period'), v = String(periodDays);
  if (![...sel.options].some(o => o.value === v)) {
    sel.querySelector('option[data-custom]')?.remove();
    const o = document.createElement('option'); o.value = v; o.dataset.custom = '1'; o.textContent = fill(t('pCustom'), { d: fmtDaysShort(periodDays) }); sel.append(o);
  }
  sel.value = v;
}

export function setTime(i) {
  now = Math.min(Math.max(i, i0), i1);
  if (document.activeElement !== $('#slider')) $('#slider').value = now;
  const tod = now - dayStart(now), hh = Math.floor(tod), mm = Math.round((tod - hh) * 60);
  if (document.activeElement !== $('#t-date')) $('#t-date').value = isoDay(now);
  if (document.activeElement !== $('#t-tod')) $('#t-tod').value = `${String(hh + (mm === 60 ? 1 : 0)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
  $('#t-date').min = isoDay(i0); $('#t-date').max = isoDay(i1);
  $('#slider').setAttribute('aria-valuetext', fmtUTC(now));
  $('#hud-2').textContent = fill(t('hudLine2'), { t: fmtUTC(now) });
  placeNeedle();
  window.dispatchEvent(new CustomEvent('llsn:time', { detail: { i: now, date: core.hourToDate(now) } }));
}
let pendingTime = null;
function setTimeSoon(i) {
  if (pendingTime === null) requestAnimationFrame(() => { const x = pendingTime; pendingTime = null; setTime(x); });
  pendingTime = i;
}

function setPlaying(on) {
  playing = on;
  const b = $('#play');
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', t(on ? 'pause' : 'play'));
  b.innerHTML = iconSvg(on ? 'pause' : 'play', { size: 16 });
  cancelAnimationFrame(raf);
  if (on) {
    if (now >= i1) setTime(i0);
    lastTs = performance.now();
    const step = ts => {
      const dt = Math.min(0.25, (ts - lastTs) / 1000); lastTs = ts;
      const next = now + Number($('#speed').value) * dt;          // hours per second — animation speed only
      if (next >= i1) { setTime(i1); setPlaying(false); return; }  // stop at the end of the period
      setTime(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
}

// ------------------------------------------------------------ scrubber (bands = focused site)
function drawScrub() {
  const cv = $('#scrub-cv'); if (!cv || !window.LLSN.window) return;
  const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!w) return;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const s = byId(window.LLSN.focus);
  const css = getComputedStyle(document.documentElement);
  g.fillStyle = css.getPropertyValue('--border'); g.fillRect(0, h * 0.25 - 2, w, 4); g.fillRect(0, h * 0.75 - 2, w, 4);
  $('#scrub-for').textContent = s ? fill(t('scrubFor'), { s: nameOf(s) }) : '';
  const bits = s ? hourBits(s, i0, i1) : null;
  if (!bits) return;
  const n = bits.length, x = k => (k / n) * w;
  for (const [m, col, y] of [[1, '--sun', h * 0.25], [2, '--earth', h * 0.75]]) {
    g.fillStyle = css.getPropertyValue(col);
    let st = -1;
    for (let k = 0; k <= n; k++) {
      const on = k < n && (bits[k] & m);
      if (on && st < 0) st = k; else if (!on && st >= 0) { g.fillRect(x(st), y - 3, Math.max(1, x(k) - x(st)), 6); st = -1; }
    }
  }
}
function placeNeedle() {
  const nd = $('#scrub-needle'); if (!nd || i1 <= i0) return;
  nd.style.left = `${((now - i0) / (i1 - i0)) * 100}%`;
}

// ------------------------------------------------------------ relay switch
async function primeRelay() {
  const ids = core.state.sites.filter(s => !s.user).map(s => s.id);
  $('#relay-status').textContent = t('relayLoading');
  await Promise.all(ids.map(id => relayPeriod(id, i0, i1)));
  await new Promise(r => setTimeout(r, 0));            // let relayPeek's settled map fill
  $('#relay-status').textContent = fill(t('relayHint'), { h: TOWER_H });
  renderList();
  window.dispatchEvent(new CustomEvent('llsn:relay', { detail: { on: relayOn } }));
}

// ------------------------------------------------------------ URL state (share link)
let urlTimer = null;
export function shareURL() {
  const p = new URLSearchParams();
  if (pins.length) p.set('sites', pins.map(x => x.id).join(','));
  if (pins.length) p.set('pn', pins.map(x => x.n).join(','));
  if (window.LLSN.focus) p.set('focus', window.LLSN.focus);
  p.set('d', isoDay(i0)); p.set('p', String(periodDays)); p.set('t', String(Math.round(now * 100) / 100));
  if (sortKey !== 'both') p.set('sort', sortKey);
  if (relayOn) p.set('relay', '1');
  const user = core.state.sites.filter(s => s.group === 'custom' && s.user);
  if (user.length) p.set('u', user.map(s => `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`).join(';'));
  const extra = window.LLSN.shareExtra?.() || {};
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  if (getLang() !== 'en') p.set('lang', getLang());
  return `${location.origin}${location.pathname}?${p.toString().replace(/%2C/g, ',').replace(/%3B/g, ';')}`;
}
function saveURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const u = new URL(shareURL());
    u.searchParams.delete('lang');
    history.replaceState(null, '', `${u.pathname}${u.search.replace(/%2C/g, ',').replace(/%3B/g, ';')}${location.hash}`);
  }, 300);
}

// ------------------------------------------------------------ language
function renderLang() {
  const L = getLang();
  document.querySelectorAll('.lang-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === L)));
  document.title = `${t('appName')} — ${t('appSub')}`;
}
function relabel() {
  applyI18n(); renderLang();
  fillSortSelect(); fillPeriodSelect();
  renderList(); setPlaying(playing); drawScrub(); setTime(now);
}
function fillSortSelect() {
  const sel = $('#sort');
  sel.innerHTML = SORTS.map(k => `<option value="${k}">${t('s_' + k)}</option>`).join('');
  sel.value = sortKey;
}
function fillPeriodSelect() {
  const sel = $('#c1-period');
  sel.innerHTML = PERIODS.map(([v, k]) => `<option value="${v}">${t(k)}</option>`).join('');
  syncPeriodSelect();
}

// ------------------------------------------------------------ boot
async function main() {
  applyI18n(); renderLang();
  document.querySelectorAll('.lang-seg button').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== getLang()) toggleLang(); }));
  window.addEventListener('llsn:lang', relabel);
  try {
    await core.loadData('data/');
  } catch (e) {
    $('#pk-list').innerHTML = `<li class="error">${t('error')}: ${esc(e.message)}</li>`;
    window.dispatchEvent(new CustomEvent('llsn:loadfail', { detail: { message: e.message } }));
    throw e;
  }
  document.body.classList.toggle('is-mock', core.state.mock);

  // initial state: URL (share link) > this browser > defaults
  const ids = new Set(core.state.sites.map(s => s.id));
  const urlPins = params.get('sites');
  if (urlPins !== null) {
    const nums = (params.get('pn') || '').split(',').map(Number);
    const list = urlPins.split(',').filter(id => ids.has(id) || id.startsWith('USER_'));
    pins = list.map((id, k) => ({ id, n: nums[k] > 0 ? nums[k] : 0 }));
    pins.forEach(p => { if (!p.n) p.n = nextNumber(); });
  } else {
    const saved = store.get('pins', null);
    pins = Array.isArray(saved) ? saved.filter(p => p && ids.has(p.id) && p.n > 0) : DEFAULT_PINS.filter(id => ids.has(id)).map((id, k) => ({ id, n: k + 1 }));
  }
  const userPins = pins.filter(p => !ids.has(p.id));                   // custom points: restored by custom_site.js from ?u=
  pins = pins.filter(p => ids.has(p.id));
  sortKey = SORTS.includes(params.get('sort')) ? params.get('sort') : (SORTS.includes(store.get('sort')) ? store.get('sort') : 'both');
  relayOn = params.get('relay') === '1' || (!params.has('sites') && store.get('relay', false) === true);
  const focus0 = ids.has(params.get('focus')) ? params.get('focus') : (pins[0]?.id || 'SHACKLETON_RIM');
  savePins();                                                            // first visit: the defaults become this browser's pins
  const [a, b] = core.hourRange();
  let t0;
  const tp = params.get('t'), dp = params.get('d');
  if (dp) t0 = core.dateToHour(new Date(dp + 'T00:00:00Z'));
  else t0 = Math.floor(core.dateToHour(new Date()));                     // default: today (UTC)
  if (!isFinite(t0)) t0 = 0;
  t0 = Math.min(Math.max(t0, a), b);
  const p0 = Number(params.get('p')); periodDays = p0 > 0 ? p0 : 29.5;
  let tSel = tp !== null && tp !== '' ? (isNaN(tp) ? core.dateToHour(new Date(tp)) : Number(tp)) : (dp ? t0 + 12 : Math.floor(core.dateToHour(new Date())));
  if (!isFinite(tSel)) tSel = t0;

  window.LLSN.now = () => now;
  window.LLSN.setTime = setTime;
  window.LLSN.setTimeSoon = setTimeSoon;
  window.LLSN.pick = pick;
  window.LLSN.pin = pin; window.LLSN.unpin = unpin; window.LLSN.togglePin = togglePin;
  window.LLSN.pins = () => pins.slice();
  renumber();
  window.LLSN.pinNo = id => pinOf(id)?.n ?? null;
  window.LLSN.compare = () => pins.map(p => p.id);
  window.LLSN.relayOn = () => relayOn;
  window.LLSN.sortedSites = sortedSites;
  window.LLSN.linkShare = linkShare;
  window.LLSN.shareURL = shareURL;
  window.LLSN.saveURL = saveURL;
  window.LLSN.initialParams = new URLSearchParams(params);
  window.LLSN.setPeriod = (startHour, days = periodDays) => { now = dayStart(startHour) + (now - dayStart(now)); setPeriod(startHour, days); };
  /** Add (or replace) a site computed in the browser (custom_site.js): joins the list, is pinned and focused. */
  window.LLSN.addSite = (site, horizon, { focus = true } = {}) => {
    const k = core.state.sites.findIndex(x => x.id === site.id);
    if (k >= 0) core.state.sites[k] = site; else core.state.sites.push(site);
    core.state.horizons.set(site.id, horizon);
    const w = window.LLSN.window;
    if (w) w.metrics.set(site.id, core.terrainPending(site) ? { pending: true } : core.metrics(site, w.i0, w.i1));
    const restored = userPins.find(p => p.id === site.id);
    if (!pinOf(site.id)) pins.push({ id: site.id, n: restored && !pins.some(p => p.n === restored.n) ? restored.n : nextNumber() });
    if (focus) setFocus(site.id);
    pinsChanged();
    window.dispatchEvent(new CustomEvent('llsn:sites', { detail: { id: site.id } }));
    if (w) window.dispatchEvent(new CustomEvent('llsn:window', { detail: w }));
  };
  window.LLSN.focus = focus0;
  fillSortSelect(); fillPeriodSelect();
  $('#relay-on').checked = relayOn;
  now = tSel;
  setPeriod(t0, periodDays);
  setTime(tSel);
  setPlaying(false);

  // ① conditions
  $('#c1-date').addEventListener('change', e => {
    if (!e.target.value) return;
    const d = core.dateToHour(new Date(e.target.value + 'T00:00:00Z'));
    if (!isFinite(d)) return;
    now = d + (now - dayStart(now));
    setPeriod(d, periodDays);
  });
  $('#c1-period').addEventListener('change', e => setPeriod(i0, Number(e.target.value)));
  // ② list
  $('#sort').addEventListener('change', e => { sortKey = e.target.value; store.set('sort', sortKey); renderList(); saveURL(); window.dispatchEvent(new CustomEvent('llsn:sort', { detail: { key: sortKey } })); });
  $('#relay-on').addEventListener('change', e => {
    relayOn = e.target.checked; store.set('relay', relayOn); saveURL();
    if (relayOn) primeRelay(); else { $('#relay-status').textContent = ''; renderList(); window.dispatchEvent(new CustomEvent('llsn:relay', { detail: { on: false } })); }
  });
  const onRows = e => {
    const pb = e.target.closest('.pk-pin');
    if (pb) { const id = pb.dataset.id, kb = pb.matches(':focus-visible') || e.detail === 0; togglePin(id);
      // keep the keyboard place: focus the same site's (+)/(-) button in its new row
      requestAnimationFrame(() => { const nb = document.querySelector(`.pk-pin[data-id="${CSS.escape(id)}"]`); if (nb) nb.focus({ preventScroll: !kb }); });
      return; }
    const it = e.target.closest('.pk-item'); if (it) pick(it.dataset.id);
  };
  $('#pk-list').addEventListener('click', onRows);
  $('#pk-pinned').addEventListener('click', onRows);
  $('#pk-more').addEventListener('click', () => { showAll = !showAll; renderList(); });
  $('#c2-reset').addEventListener('click', () => document.querySelector('#llsn-filters .fl-reset')?.click());
  window.addEventListener('llsn:focus', () => { renderList(); drawScrub(); saveURL(); });
  window.addEventListener('llsn:filter', renderList);
  window.addEventListener('llsn:sites', () => { renderList(); drawScrub(); });

  // tray time controls
  const sl = $('#slider');
  sl.addEventListener('input', e => { if (playing) setPlaying(false); setTimeSoon(Number(e.target.value)); });
  sl.addEventListener('keydown', e => {
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!d) return;
    e.preventDefault(); if (playing) setPlaying(false);
    setTime(Math.round(now) + d * (e.shiftKey ? 24 : 1));
  });
  const scrub = $('#scrub');
  const tip = $('#scrub-tip');
  scrub.addEventListener('pointermove', e => {
    const r = scrub.getBoundingClientRect(), f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    tip.hidden = false; tip.style.left = `${f * 100}%`; tip.textContent = fmtUTC(Math.round(i0 + f * (i1 - i0)));
  });
  scrub.addEventListener('pointerleave', () => { tip.hidden = true; });
  $('#t-date').addEventListener('change', e => {
    if (!e.target.value) return;
    const d = core.dateToHour(new Date(e.target.value + 'T00:00:00Z'));
    if (isFinite(d)) setTime(d + (now - dayStart(now)));
  });
  $('#t-tod').addEventListener('change', e => {
    const [hh, mm] = (e.target.value || '0:0').split(':').map(Number);
    setTime(dayStart(now) + hh + (mm || 0) / 60);
  });
  $('#play').addEventListener('click', () => setPlaying(!playing));
  new ResizeObserver((f => { let q = 0; return () => { if (!q) q = requestAnimationFrame(() => { q = 0; f(); }); }; })(() => drawScrub())).observe($('#scrub'));

  window.dispatchEvent(new CustomEvent('llsn:ready', { detail: { state: core.state } }));
  window.dispatchEvent(new CustomEvent('llsn:pins', { detail: { pins: pins.slice() } }));
  if (relayOn) primeRelay();
  loadExtraModules();
}

// Entry modules get ?v=<version.json> so a browser never keeps a stale copy after a deploy (module caches are per URL).
// Modules that other modules also import statically (compare_view.js, trust.js) keep their plain URL: a second URL
// would create a second instance with its own listeners.
const SHARED_MODULES = new Set(['compare_view.js', 'trust.js']);
async function loadExtraModules() {
  try {
    const [list, ver] = await Promise.all([
      fetch('js/modules.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('version.json', { cache: 'no-cache' }).then(r => r.json()).then(j => j.v).catch(() => ''),
    ]);
    for (const m of list) import(`./${m}${ver && !SHARED_MODULES.has(m) ? `?v=${ver}` : ''}`).catch(e => console.error('module failed:', m, e));
  } catch (e) { /* no extra modules */ }
}

main();
