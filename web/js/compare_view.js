// compare_view.js — comparison tray (spec §3.9) + "Compare pinned sites" section (§4): table with best-value marks,
// lunar-day clock, Sun/Earth elevation, timeline. No limit on pinned sites (horizontal scroll, stable #numbers).
// Numbers: LLSN.window (core.metrics), core.js instant functions, data/relay (via values.js), data/korea station bits.
// Verdicts use ONLY the published example rule (longest shadow 72 h, direct link 50 % / 90 %).
import * as core from './core.js';
import { legendHTML } from './ui_shared.js';
import { t, getLang } from './i18n.js';
import { addStrings, whenReady, setFocus, fmtHours, LLSN } from './ui_shared.js';
import { relayPeriod, stationPeriod, instant, hourBits, gapStats, TOWER_H } from './values.js';
import { relayFor, relayIndex } from './diff_data.js';
import { stationBits } from './korea.js';

addStrings({
  cmpH: 'Detailed comparison', cmpSub: '',
  cmpNoPins: 'No site is pinned, so this shows the site you are looking at in 3D. Pin sites with the pin buttons in the list on the left.',
  cmpEmptyTray: 'No pinned sites yet. Press a pin in Candidates on the left to compare them here side by side.',
  cmpCaption: 'Whole Moon: LROC color (NASA SVS CGI Moon Kit) on LOLA terrain, lit by the real Sun at the selected time.', cmpEdge: 'Earth-set edge (moves with libration)',
  r_item: 'Item', r_sun: 'Sunlight (period)', r_earth: 'Direct-to-Earth', r_both: 'Sun + Earth together', r_dark: 'Longest shadow',
  r_relay: 'Link incl. relay tower', r_now: 'At the selected time', r_kdsa: 'Yeoju KDSA in view', r_gs: 'NASA DSN (any of 3):',
  dOfN: '{a} of {b} d', km: 'km', towerAt: 'nearest tower {k} km', noTower: 'no tower placed', noTowerCalc: 'no tower calc.',
  nowSun: 'sunlit · {x} left', nowDark: 'dark · {x} to sunrise', nowEarth: 'Earth · {x} left', nowNoEarth: 'no Earth · {x} to rise',
  noChange: 'no change in data', why: 'Site check ↓', whyOn: 'Shown below', pending: 'terrain pending', hoursN: '{h} h',
  tabDial: '◷ Lunar-day clock', tabAlt: '↗ Sun & Earth elevation', changeH: 'Change over time',
  dialDesc: 'One turn = the analysis period, 12 o’clock = start.',
  lgSun: 'sunlight', lgEarth: 'direct-to-Earth', lgRelay: 'via relay tower', lgCut: 'no link even with the tower', lgNeedle: 'selected time', lgKdsa: 'Yeoju sees the Moon (≥ 10°) while the site sees Earth — geometry only',
  altDesc: 'A body is visible only above the terrain line.', lgSunEl: 'Sun elevation', lgEarthEl: 'Earth elevation', lgHzSun: 'terrain horizon (Sun direction)', lgZero: '0° (flat horizon)', lgSunPart: 'Sun partly visible', lgSunDial: 'sunlight (stronger = more of the disc)', altAria: 'Sun and Earth elevation with the terrain horizon over the period',
  tlH: 'Timeline', tlDesc: 'Click or drag to move the selected time.',
  sNextSet: 'Until sunset', sNextRise: 'Until sunrise', sNextESet: 'Until Earthset', sNextERise: 'Until Earthrise', sDark: 'Longest shadow',
  sRelayNeed: 'Longest direct-link gap', sTower: 'Via tower ({h} m)', sCut: 'Still no link with tower', sKdsa: 'Yeoju KDSA in view',
  vGood: '✓ No flags', vCond: '! Check conditions', vRuleTip: 'Example thresholds only (published rule): caution if longest shadow > 72 h, direct link < 50 %, or last among the pinned sites; strength if direct link ≥ 90 % or first among the pinned sites.',
  sumLine: '{n}: {s} strength(s), {c} caution(s) under the example rule.', allSites: 'All sites — period table',
  coordsH: '{c} · h {h} m',
}, {
  cmpH: '상세 비교', cmpSub: '',
  cmpNoPins: '고정한 후보가 없어서 지금 3D에서 보는 곳을 보여 줍니다. 왼쪽 목록의 핀으로 후보를 고정하세요.',
  cmpEmptyTray: '아직 고정한 후보지가 없습니다. 왼쪽 ② 후보지의 핀을 누르면 여기서 나란히 비교합니다.',
  cmpCaption: '달 전체: LROC 컬러(NASA SVS CGI Moon Kit)에 LOLA 지형, 선택한 시각의 실제 태양.', cmpEdge: '지구가 지는 경계 (칭동으로 출렁임)',
  r_item: '항목', r_sun: '햇빛 (운용 기간)', r_earth: '지구 직접 교신', r_both: '해+지구 동시', r_dark: '최장 연속 그늘',
  r_relay: '중계탑 포함 교신', r_now: '선택 시각', r_kdsa: '여주 KDSA 가시', r_gs: 'NASA DSN (3곳 중 하나):',
  dOfN: '{b}일 중 {a}일', km: 'km', towerAt: '가장 가까운 탑 {k} km', noTower: '탑 설치 안 함', noTowerCalc: '탑 계산 없음',
  nowSun: '햇빛 · {x} 남음', nowDark: '그늘 · 해 뜨기까지 {x}', nowEarth: '교신 · {x} 남음', nowNoEarth: '교신 없음 · 뜨기까지 {x}',
  noChange: '자료 안에서 변화 없음', why: '이 후보 따져 보기 ↓', whyOn: '아래에 표시 중', pending: '지형 계산 전', hoursN: '{h}시간',
  tabDial: '◷ 달의 하루 시계', tabAlt: '↗ 태양·지구 고도', changeH: '시간에 따른 변화',
  dialDesc: '한 바퀴 = 선택한 기간, 12시 = 기간 시작.',
  lgSun: '햇빛', lgEarth: '지구 직접 교신', lgRelay: '중계탑 경유', lgCut: '탑이 있어도 끊김', lgNeedle: '선택 시각', lgKdsa: '여주에서 달 ≥ 10° 이고 착륙지에서 지구가 보임 — 기하만',
  altDesc: '지형 선보다 위에 있어야 보입니다.', lgSunEl: '태양 고도', lgEarthEl: '지구 고도', lgHzSun: '지형 지평선 (태양 방향)', lgZero: '0° (평평한 지평선)', lgSunPart: '태양 일부만 보임', lgSunDial: '햇빛 (진할수록 원반이 많이 보임)', altAria: '기간 동안의 태양·지구 고도와 지형 지평선',
  tlH: '타임라인', tlDesc: '누르거나 끌어서 선택 시각을 옮깁니다.',
  sNextSet: '다음 일몰까지', sNextRise: '다음 일출까지', sNextESet: '다음 지구몰까지', sNextERise: '다음 지구돋이까지', sDark: '최장 연속 그늘',
  sRelayNeed: '직접 교신 최장 끊김', sTower: '탑 경유 ({h} m)', sCut: '탑 있어도 끊김', sKdsa: '여주 KDSA 가시',
  vGood: '✓ 주의 없음', vCond: '! 조건 확인', vRuleTip: '예시 기준값(공개 규칙)만 사용: 최장 그늘 > 72시간, 직접 교신 < 50 %, 고정한 곳 중 꼴찌면 주의. 직접 교신 ≥ 90 % 또는 고정한 곳 중 1위면 강점.',
  sumLine: '{n}: 예시 규칙으로 강점 {s}개, 주의 {c}개.', allSites: '전체 착륙지 — 기간 표',
  coordsH: '{c} · 높이 {h} m',
});

const $ = s => document.querySelector(s);
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const byId = id => LLSN().state.sites.find(s => s.id === id);
const nameOf = s => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const pctH = f => (f == null || !isFinite(f) ? '<span class="na">—</span>' : `${Math.round(f * 100)}<small>%</small>`);
const daysTxt = h => { const d = h / 24; return d < 1.95 ? `${h.toFixed(0)} h` : `${(Math.round(d * 10) / 10).toFixed(1)} d`; };
const darkH = h => (getLang() === 'ko' ? (h < 48 ? `${h}시간` : `${(h / 24).toFixed(1)}일`) : (h < 48 ? `${h} h` : `${(h / 24).toFixed(1)} d`));
const until = h => (h == null ? t('noChange') : fmtHours(h));
export const coordText = s => `${Math.abs(s.lat).toFixed(3)}°${s.lat >= 0 ? 'N' : 'S'}, ${Math.abs(s.lon).toFixed(3)}°${s.lon >= 0 ? 'E' : 'W'}`;
const PIN_SVG = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 1.5h5l-.8 4.2 2.3 2.3v1H4v-1l2.3-2.3z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 9v5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

/** Sites shown: pinned (pin order), else the focused site. */
function shown() {
  const ids = LLSN().compare?.() || [];
  if (ids.length) return ids.map(byId).filter(Boolean);
  const f = byId(LLSN().focus); return f ? [f] : [];
}

// ------------------------------------------------------------ example verdict rule (public, fixed)
export const RULE = { darkH: 72, directLow: 0.5, directHigh: 0.9 };
/** Strengths / cautions for one site among the compared ids, from the period metrics only. */
export function verdict(id, ids) {
  const w = LLSN().window, m = w?.metrics.get(id);
  if (!m || m.pending) return null;
  const pool = ids.map(x => [x, w.metrics.get(x)]).filter(([, v]) => v && !v.pending);
  const plus = [], bang = [];
  const keys = [['sun_frac', 1, 'r_sun'], ['earth_frac', 1, 'r_earth'], ['both_frac', 1, 'r_both'], ['longest_dark_h', -1, 'r_dark']];
  if (pool.length >= 2) for (const [k, sgn, lbl] of keys) {
    const vals = pool.map(([, v]) => v[k] * sgn), best = Math.max(...vals), worst = Math.min(...vals);
    if (best === worst) continue;
    if (m[k] * sgn === best) plus.push({ k, lbl, rank: 1, n: pool.length });
    else if (m[k] * sgn === worst) bang.push({ k, lbl, rank: pool.length, n: pool.length });
  }
  if (m.earth_frac >= RULE.directHigh && !plus.some(p => p.k === 'earth_frac')) plus.push({ k: 'earth_frac', lbl: 'r_earth', rule: 'high' });
  if (m.longest_dark_h > RULE.darkH && !bang.some(p => p.k === 'longest_dark_h')) bang.push({ k: 'longest_dark_h', lbl: 'r_dark', rule: 'dark' });
  if (m.earth_frac < RULE.directLow && !bang.some(p => p.k === 'earth_frac')) bang.push({ k: 'earth_frac', lbl: 'r_earth', rule: 'low' });
  return { plus, bang, good: bang.length === 0 };
}

// ------------------------------------------------------------ table (tray + big)
const TRAY_ROWS = ['sun', 'earth', 'dark', 'relay', 'now'];
const BIG_ROWS = ['sun', 'earth', 'both', 'dark', 'relay', 'kdsa', 'now'];
const BEST = { sun: 1, earth: 1, both: 1, dark: -1, relay: 1, kdsa: 1 };

function cell(row, s, w, async) {
  const m = w.metrics.get(s.id);
  if (!m) return { html: '…' };
  if (m.pending && row !== 'now') return { html: `<span class="na">${t('pending')}</span>`, cls: 'na-cell' };
  const dd = w.days, fd = x => (Math.round(x * dd * 10) / 10).toFixed(1).replace(/\.0$/, '');
  switch (row) {
    case 'sun': return { v: m.sun_frac, html: `<span class="val num">${pctH(m.sun_frac)}</span><span class="sub">${fill(t('dOfN'), { a: fd(m.sun_frac), b: fd(1) })}</span>` };
    case 'earth': return { v: m.earth_frac, html: `<span class="val num">${pctH(m.earth_frac)}</span><span class="sub">${fill(t('dOfN'), { a: fd(m.earth_frac), b: fd(1) })}</span>` };
    case 'both': return { v: m.both_frac, html: `<span class="val num">${pctH(m.both_frac)}</span><span class="sub">${fill(t('dOfN'), { a: fd(m.both_frac), b: fd(1) })}</span>` };
    case 'dark': return { v: m.longest_dark_h, html: `<span class="val num">${darkH(m.longest_dark_h)}</span>` };
    case 'relay': {
      const r = async.relay.get(s.id);
      if (r === undefined) return { html: '<span class="na">…</span>' };
      if (r.state !== 'ok') return { html: `<span class="na">${t('noTowerCalc')}</span>`, cls: 'na-cell' };
      return { v: r.pct, html: `<span class="val num">${pctH(r.pct)}</span><span class="sub">${r.towers ? fill(t('towerAt'), { k: r.distKm.toFixed(1) }) : t('noTower')}</span>` };
    }
    case 'kdsa': {
      const g = async.gs.get(s.id);
      if (g === undefined) return { html: '<span class="na">…</span>' };
      if (g.pending || g.error) return { html: `<span class="na">—</span>`, cls: 'na-cell' };
      return { v: g.kdsa, html: `<span class="val num">${g.kdsa}<small> h</small></span><span class="sub">${t('r_gs')} ${g.dsn} h</span>` };
    }
    case 'now': return { html: `<span class="now-span" data-id="${s.id}"></span>` };
  }
  return { html: '' };
}
function nowHTML(s, i) {
  const x = instant(s, i);
  if (x.pending) return `<span class="na">${t('pending')}</span>`;
  return `<span class="now-dot"><i style="background:${x.lit ? 'var(--sun)' : 'var(--off)'}"></i>${esc(fill(t(x.lit ? 'nowSun' : 'nowDark'), { x: until(x.sunNext) }))}</span>
    <span class="now-dot"><i style="background:${x.up ? 'var(--earth)' : 'var(--off)'}"></i>${esc(fill(t(x.up ? 'nowEarth' : 'nowNoEarth'), { x: until(x.earthNext) }))}</span>`;
}

const LG = {
  dial: () => legendHTML([{ kind: 'bar', c: 'var(--sun)', h: 5, label: t('lgSunDial') }, { kind: 'bar', c: 'var(--earth)', h: 5, label: t('lgEarth') },
    { kind: 'bar', c: 'var(--relay)', h: 5, label: t('lgRelay') }, { kind: 'bar', c: 'var(--cut)', h: 1.6, label: t('lgCut') }, { kind: 'vline', c: 'var(--text)', w: 2, label: t('lgNeedle') }]),
  alt: () => legendHTML([{ kind: 'line', c: 'var(--sun)', w: 1.6, label: t('lgSunEl') }, { kind: 'line', c: 'var(--earth)', w: 1.6, label: t('lgEarthEl') },
    { kind: 'line', c: 'var(--muted)', w: 1, label: t('lgHzSun') }, { kind: 'line', c: 'var(--muted)', w: 1, dash: '3 3', label: t('lgZero') }, { kind: 'vline', c: 'var(--text)', w: 1.5, label: t('lgNeedle') }]),
  tl: () => legendHTML([{ kind: 'bar', c: 'var(--sun)', h: 8, label: t('lgSun') }, { kind: 'bar', c: 'var(--sun)', h: 8, op: 0.35, label: t('lgSunPart') }, { kind: 'bar', c: 'var(--earth)', h: 8, label: t('lgEarth') },
    { kind: 'bar', c: 'var(--relay)', h: 8, label: t('lgRelay') }, { kind: 'bar', c: 'var(--kdsa)', h: 3, label: t('lgKdsa') }, { kind: 'vline', c: 'var(--text)', w: 1.6, label: t('lgNeedle') }]),
};

function tableHTML(sites, rows, big, async) {
  const w = LLSN().window, focus = LLSN().focus;
  const head = sites.map(s => {
    const n = LLSN().pinNo?.(s.id);
    return `<th scope="col" class="cmp-col${s.id === focus ? ' focus-col' : ''}" data-id="${s.id}"><div class="col-h">
      <span class="nm" role="button" tabindex="0" data-focus="${s.id}">${n ? (big ? `<span class="pin-no">#${n}</span>` : `<span class="pin-no chip" style="--sc:var(--c${n})">${String(n).padStart(2, '0')}</span>`) : ''}${esc(nameOf(s))}</span>
      ${n ? `<button type="button" class="unpin" data-id="${s.id}" aria-label="${esc(t('unpin'))}: ${esc(nameOf(s))}" title="${esc(t('unpin'))}">${PIN_SVG}</button>` : ''}</div>
      ${big ? `<span class="sub">${esc(t('g_' + s.group))} · ${coordText(s)}</span>` : ''}</th>`;
  }).join('');
  const body = rows.map(r => {
    const cells = sites.map(s => cell(r, s, w, async));
    const vals = cells.map(c => c.v).filter(v => v != null && isFinite(v));
    let best = null;
    if (BEST[r] && vals.length >= 2 && sites.length >= 2) { const b = BEST[r] > 0 ? Math.max(...vals) : Math.min(...vals); if (vals.some(v => v !== b)) best = b; }
    return `<tr class="r-${r}"><th scope="row" class="lbl">${esc(t('r_' + r))}${r === 'relay' ? ` <small class="muted num">${TOWER_H} m</small>` : ''}</th>${cells.map((c, k) =>
      `<td class="${c.cls || ''}${best !== null && c.v === best ? ' best' : ''}" data-id="${sites[k].id}">${c.html}</td>`).join('')}</tr>`;
  }).join('');
  const why = `<tr class="r-why"><th scope="row" class="lbl"></th>${sites.map(s => `<td><button type="button" class="ls-btn why-btn" data-why="${s.id}" aria-pressed="${s.id === focus}">${esc(t(s.id === focus ? 'whyOn' : 'why'))}</button></td>`).join('')}</tr>`;
  return `<div class="cmp-scroll"><table class="cmp-tbl"><thead><tr><th scope="col" class="lbl">${esc(t('r_item'))}</th>${head}</tr></thead><tbody>${body}${why}</tbody></table></div>`;
}

const terrainVals = new Map();
const asyncVals = { relay: new Map(), gs: new Map(), key: '' };
addStrings({
  measure: 'Measure', showMap: 'Show on map', seeDetails: 'See details', slopeLabel: 'Slope',
  missingMeasure: 'Data needed', noTowerSite: 'No tower site', compareRange: '{n} pinned · showing {a}–{b}',
  sameScale: 'Sun and Earth elevation · same period and scale for every candidate',
  help_sun: 'Share of hourly samples with at least half the solar disc above terrain.',
  help_earth: 'Earth centre above terrain. Geometric visibility, not guaranteed radio service.',
  help_both: 'Hours meeting both sunlight and Earth visibility conditions.',
  help_dark: 'Longest consecutive dark run within the selected period; shown in days.',
  help_slope: 'Catalogue landing slope from data/terrain. Footprints and DEM resolution vary; not a safety assessment.',
  help_relay: 'Direct Earth visibility → visibility including the 15 m relay network. Geometry only.',
  help_kdsa: 'Site sees Earth and Yeoju sees the Moon above 10°. Shown in days; geometry only.',
  label_sun: 'Sunlit time', label_earth: 'Earth visibility', label_both: 'Sun and Earth together', label_dark: 'Longest dark period', label_slope: 'Slope', label_relay: 'Relay tower', label_kdsa: 'Yeoju ground station',
}, {
  measure: '측정 항목', showMap: '지도에서 보기', seeDetails: '자세히 보기', slopeLabel: '경사',
  missingMeasure: '데이터 필요', noTowerSite: '중계탑 위치 없음', compareRange: '{n}개 고정 · {a}–{b} 표시',
  sameScale: '태양·지구 고도 · 모든 후보에 같은 기간과 눈금 적용',
  help_sun: '시간별 표본 중 태양 원반의 절반 이상이 지형 위로 보이는 비율입니다.',
  help_earth: '지구 중심이 지형 위로 보이는 비율입니다. 실제 통신 성능을 뜻하지 않습니다.',
  help_both: '일조와 지구 가시 조건을 동시에 만족하는 시간의 비율입니다.',
  help_dark: '선택한 기간에서 가장 길게 이어지는 암흑 구간을 일 단위로 표시합니다.',
  help_slope: 'data/terrain의 착륙 지점 경사입니다. 분석 범위와 DEM 해상도가 다르며 안전 판정이 아닙니다.',
  help_relay: '지구 직접 가시율 → 15m 중계탑 네트워크 포함 가시율. 기하학적 계산입니다.',
  help_kdsa: '착륙지에서 지구가 보이고 여주에서 달 고도가 10° 이상인 시간을 일 단위로 표시합니다.',
  label_sun: '일조 시간', label_earth: '지구 가시성', label_both: '태양·지구 동시 가시', label_dark: '최장 암흑 기간', label_slope: '경사', label_relay: '중계탑', label_kdsa: '여주 지상국',
});

function sharedScale(sites) {
  const w = LLSN().window, step = Math.max(1, Math.ceil((w.i1 - w.i0 + 1) / 480));
  let lo = 0, hi = 0;
  for (const s of sites) for (let i = w.i0; i <= w.i1; i += step) {
    const sun = core.sunAzEl(s, i), earth = core.earthAzEl(s, i);
    const hz = core.terrainPending(s) ? 0 : core.horizonAt(s, sun.az);
    lo = Math.min(lo, sun.el, earth.el, hz); hi = Math.max(hi, sun.el, earth.el, hz);
  }
  return [Math.floor(lo - 1), Math.ceil(hi + 1)];
}

function detailTableHTML(sites, scale) {
  const w = LLSN().window, focus = LLSN().focus;
  const rows = ['sun', 'earth', 'both', 'dark', 'slope', 'relay', 'kdsa'];
  const symbols = ['☼', '⊕', '◉', '☾', '∠', '⚑', '⊙'];
  const header = sites.map((s, k) => `<th scope="col" data-id="${s.id}" class="${s.id === focus ? 'focus-col' : ''}"><span class="pin-no">#${k + 1}</span><button class="cmp-name" title="${esc(nameOf(s))}" data-focus="${s.id}">${esc(getLang() === 'ko' ? nameOf(s) : (s.short || s.name))}</button><span class="cmp-group">${esc(t('g_' + s.group))}</span>${LLSN().pinNo?.(s.id) ? `<button class="unpin" data-id="${s.id}" aria-label="${esc(t('unpin'))}: ${esc(nameOf(s))}">×</button>` : ''}</th>`).join('');
  const body = rows.map((row, ri) => {
    const cells = sites.map(s => {
      const m = w.metrics.get(s.id), base = cell(row, s, w, asyncVals);
      if (row === 'slope') {
        const v = terrainVals.get(s.id)?.landing_slope_deg;
        return { v: Number.isFinite(v) ? v : null, html: Number.isFinite(v) ? `<span class="val num">${v.toFixed(1)}<small>°</small></span>` : `<span class="na">${t('missingMeasure')}</span>` };
      }
      if (!m || m.pending) return base;
      if (row === 'dark') return { v: m.longest_dark_h, html: `<span class="val num">${(m.longest_dark_h / 24).toFixed(1)}<small>${getLang() === 'ko' ? '일' : 'd'}</small></span>` };
      if (row === 'kdsa') {
        const g = asyncVals.gs.get(s.id);
        if (g && !g.pending && !g.error) return { v: g.kdsa, html: `<span class="val num">${(g.kdsa / 24).toFixed(1)}<small>${getLang() === 'ko' ? '일' : 'd'}</small></span>` };
      }
      if (row === 'relay') {
        const r = asyncVals.relay.get(s.id);
        if (r?.state === 'ok') return { html: r.towers ? `<span class="val num">${pctH(m.earth_frac)} <span class="muted">›</span> ${pctH(r.pct)}</span><span class="sub">${r.distKm.toFixed(1)} km</span>` : `<span class="na">${esc(t('noTowerSite'))}</span>` };
      }
      return base;
    });
    const vals = cells.map(c => c.v).filter(Number.isFinite), direction = row === 'slope' || row === 'dark' ? -1 : 1;
    const candidate = direction > 0 ? Math.max(...vals) : Math.min(...vals);
    const best = row !== 'relay' && vals.length > 1 && vals.filter(v => v === candidate).length === 1 ? candidate : null;
    return `<tr class="r-${row}"><th scope="row" class="lbl"><span class="measure-icon" aria-hidden="true">${symbols[ri]}</span>${esc(t('label_' + row))}<details class="measure-help"><summary aria-label="${esc(t('label_' + row))}: ${esc(t('info') || 'Info')}">◇</summary><p>${esc(t('help_' + row))}</p></details></th>${cells.map((c, i) => `<td data-id="${sites[i].id}" class="${sites[i].id === focus ? 'focus-col ' : ''}${best !== null && c.v === best ? 'best' : ''}">${c.html}</td>`).join('')}</tr>`;
  }).join('');
  const actions = `<tr class="r-actions"><th class="lbl"></th>${sites.map(s => `<td class="${s.id === focus ? 'focus-col' : ''}"><button class="ls-btn cmp-map" data-map="${s.id}">${esc(t('showMap'))}<span aria-hidden="true">◫</span></button><button class="ls-btn cmp-detail" data-why="${s.id}">${esc(t('seeDetails'))}<span aria-hidden="true">↓</span></button></td>`).join('')}</tr>`;
  const plots = `<tr class="r-change-title"><th colspan="${sites.length + 1}">${esc(t('changeH'))} <small>${esc(t('sameScale'))}</small></th></tr><tr class="r-plots"><th class="lbl">${LG.alt()}</th>${sites.map(s => `<td class="alt-card" data-id="${s.id}" tabindex="0" aria-label="${esc(nameOf(s))}: ${esc(t('altAria'))}">${altSVG(s, 300, 180, scale)}</td>`).join('')}</tr>`;
  return `<div class="cmp-scroll"><table class="cmp-tbl cmp-detail-table" style="--candidate-count:${sites.length}"><thead><tr><th scope="col" class="lbl">${esc(t('measure'))}</th>${header}</tr></thead><tbody>${body}${actions}${plots}</tbody></table></div>`;
}

let columnsObserver;
function wireColumns(root, count, pinned) {
  columnsObserver?.disconnect();
  const sc = root.querySelector('.cmp-scroll'), columns = [...sc.querySelectorAll('thead th[data-id]')];
  const update = () => {
    const label = innerWidth <= 700 ? 150 : 248;
    const width = innerWidth <= 700 ? 180 : Math.max(150, Math.min(300, (sc.clientWidth - label) / Math.max(1, count)));
    const table = sc.querySelector('table');
    table.style.setProperty('--candidate-width', `${width}px`);
    table.style.width = `${label + width * count}px`;
    const bounds = sc.getBoundingClientRect(), labelWidth = sc.querySelector('th.lbl').getBoundingClientRect().width;
    const visible = columns.map((c, k) => ({ k, r: c.getBoundingClientRect() })).filter(x => x.r.right > bounds.left + labelWidth + 1 && x.r.left < bounds.right - 1);
    root.querySelector('.cmp-range').textContent = fill(t('compareRange'), { n: pinned, a: visible.length ? visible[0].k + 1 : 0, b: visible.length ? visible.at(-1).k + 1 : 0 });
    root.querySelector('[data-col="-1"]').disabled = sc.scrollLeft <= 1;
    root.querySelector('[data-col="1"]').disabled = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
  };
  root.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => sc.scrollBy({ left: Number(b.dataset.col) * (columns[0]?.offsetWidth || 300), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })));
  sc.addEventListener('scroll', update, { passive: true });
  columnsObserver = new ResizeObserver(update); columnsObserver.observe(sc); update();
}

function showReading(root, anchor, i, site) {
  const tip = root.querySelector('.cmp-tooltip');
  if (!site || core.terrainPending(site)) return;
  const su = core.sunAzEl(site, i), ea = core.earthAzEl(site, i), hz = core.horizonAt(site, su.az);
  tip.textContent = `${nameOf(site)} · ${core.hourToDate(i).toISOString().slice(0,16).replace('T',' ')} UTC · ${t('lgSunEl')} ${su.el.toFixed(2)}° · ${t('lgEarthEl')} ${ea.el.toFixed(2)}° · ${t('lgHzSun')} ${hz.toFixed(2)}° · ${t('label_sun')} ${core.sunlit(site,i) ? '1' : '0'} · ${t('label_earth')} ${core.earthVisible(site,i) ? '1' : '0'}`;
  tip.hidden = false;
  tip.style.left = Math.max(8, Math.min(anchor.x + 12, innerWidth - tip.offsetWidth - 8)) + 'px';
  tip.style.top = Math.max(8, Math.min(anchor.y + 14, innerHeight - tip.offsetHeight - 8)) + 'px';
}
function wirePlotTips(root) {
  for (const td of root.querySelectorAll('.r-plots td')) {
    const svg = td.querySelector('svg');
    td.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), w = LLSN().window;
      const fraction = Math.max(0, Math.min(1, ((e.clientX-r.left)/r.width*300-28)/266));
      showReading(root, {x:e.clientX,y:e.clientY}, w.i0 + fraction*(w.i1-w.i0), byId(td.dataset.id));
    });
    td.addEventListener('focus', () => { const r=td.getBoundingClientRect();showReading(root,{x:r.left,y:r.top},LLSN().now(),byId(td.dataset.id)); });
    for (const event of ['pointerleave','blur']) td.addEventListener(event,()=>{root.querySelector('.cmp-tooltip').hidden=true;});
  }
}
async function wireTimelineTips(root, sites) {
  const svg=root.querySelector('.tl-svg'); if(!svg)return;
  const w=LLSN().window;
  const codes=await Promise.all(sites.map(s=>relayCodes(s.id,w.i0,w.i1).catch(()=>null)));
  const kd=await stationBits().catch(()=>null);
  if(!svg.isConnected)return;
  svg.addEventListener('pointermove',e=>{
    const r=svg.getBoundingClientRect(),box=svg.viewBox.baseVal,nd=svg.querySelector('.tl-needle'),lw=Number(nd.dataset.lw);
    const x=(e.clientX-r.left)/r.width*box.width,y=(e.clientY-r.top)/r.height*box.height;
    const k=Math.floor((y-22)/46); if(k<0||k>=sites.length||x<lw){root.querySelector('.cmp-tooltip').hidden=true;return;}
    const i=Math.min(w.i1,w.i0+Math.floor((x-lw)/(box.width-lw-10)*(w.i1-w.i0+1)));
    const lane=(y-22)%46,site=sites[k],tip=root.querySelector('.cmp-tooltip');
    if(core.terrainPending(site)){tip.hidden=true;return;}
    if(lane>35){tip.hidden=true;return;}
    const yes=getLang()==='ko'?'가능':'Yes',no=getLang()==='ko'?'불가':'No';
    const sun=core.sunlit(site,i),earth=core.earthVisible(site,i),code=codes[k]?.[i-w.i0];
    let label,value;
    if(lane<16){label=t('label_sun');value=`${sun?yes:no} · ${getLang()==='ko'?'태양 원반':'Solar disc'} ${(core.sunVisibleFraction(site,i)*100).toFixed(1)}%`;}
    else if(lane<32){label=t('label_earth');value=`${earth?yes:no} · ${t('lgRelay')}: ${code==null||code<0?t('missingMeasure'):code===2?yes:no}`;}
    else {label=t('label_kdsa');value=kd?.KDSA?((earth&&kd.KDSA[i])?yes:no):t('missingMeasure');}
    tip.textContent=`${nameOf(site)} · ${core.hourToDate(i).toISOString().slice(0,16).replace('T',' ')} UTC · ${label}: ${value}`;
    tip.hidden=false;tip.style.left=Math.max(8,Math.min(e.clientX+12,innerWidth-tip.offsetWidth-8))+'px';tip.style.top=Math.max(8,Math.min(e.clientY+14,innerHeight-tip.offsetHeight-8))+'px';
  });
  svg.addEventListener('pointerleave',()=>{root.querySelector('.cmp-tooltip').hidden=true;});
}
function loadAsync(sites, after) {
  const w = LLSN().window, key = `${w.i0}|${w.i1}`;
  if (asyncVals.key !== key) { asyncVals.relay.clear(); asyncVals.gs.clear(); asyncVals.key = key; }
  const jobs = [];
  for (const s of sites) {
    if (!terrainVals.has(s.id)) jobs.push((s.user ? Promise.resolve(null) : fetch(`data/terrain/${s.id}.json`).then(r => r.ok ? r.json() : null).catch(() => null)).then(v => terrainVals.set(s.id, v)));
    if (!asyncVals.relay.has(s.id)) jobs.push(relayPeriod(s.id, w.i0, w.i1).then(v => { if (asyncVals.key === key) asyncVals.relay.set(s.id, v); }));
    if (!asyncVals.gs.has(s.id)) jobs.push(stationPeriod(s, w.i0, w.i1).then(v => { if (asyncVals.key === key) asyncVals.gs.set(s.id, v); }));
  }
  if (jobs.length) Promise.all(jobs).then(after);
}

// ------------------------------------------------------------ lunar-day clock (SVG)
async function relayCodes(id, i0, i1) {
  const idx = await relayIndex(); if (!idx.ids.includes(id)) return null;
  const rel = await relayFor(id); const j = rel.params.heights_m.findIndex(h => Number(h) === TOWER_H); if (j < 0) return null;
  const out = new Int8Array(i1 - i0 + 1).fill(-1);
  for (const [s, len, code] of rel.networks[j].timeline.segments) {
    const lo = Math.max(s, i0), hi = Math.min(s + len, i1 + 1);
    for (let k = lo; k < hi; k++) out[k - i0] = code;
  }
  return out;
}
const arc = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};
async function dialSVG(s, size) {
  const w = LLSN().window, n = w.i1 - w.i0 + 1, cx = size / 2, cy = size / 2, R1 = size * 0.44, R2 = size * 0.34;
  const bits = hourBits(s, w.i0, w.i1);
  if (!bits) return `<p class="na">${t('pending')}</p>`;
  const codes = await relayCodes(s.id, w.i0, w.i1).catch(() => null);
  const step = Math.max(1, Math.ceil(n / 360)), parts = [];
  const sunC = css('--sun'), earthC = css('--earth'), relayC = css('--relay'), cutC = css('--cut'), off = css('--surface-2');
  for (let k = 0; k < n; k += step) {
    const a0 = (k / n) * 2 * Math.PI, a1 = (Math.min(n, k + step) / n) * 2 * Math.PI + 0.004;
    const f = core.sunVisibleFraction(s, w.i0 + k);
    parts.push(`<path d="${arc(cx, cy, R1, a0, a1)}" stroke="${f > 0 ? sunC : off}" stroke-opacity="${f > 0 ? (0.25 + 0.75 * f).toFixed(2) : 1}" stroke-width="${size * 0.07}" fill="none"/>`);
    const e = bits[k] & 2, c = codes ? codes[k] : -1;
    const col = e ? earthC : c === 2 ? relayC : (codes ? cutC : off), wdt = e || c === 2 ? size * 0.07 : size * 0.025;
    parts.push(`<path d="${arc(cx, cy, R2, a0, a1)}" stroke="${col}" stroke-width="${wdt}" fill="none"/>`);
  }
  const ticks = [7, 14, 21].filter(d => d * 24 < n).map(d => { const a = (d * 24 / n) * 2 * Math.PI; return `<line x1="${cx + (R1 + size * .05) * Math.sin(a)}" y1="${cy - (R1 + size * .05) * Math.cos(a)}" x2="${cx + (R1 + size * .085) * Math.sin(a)}" y2="${cy - (R1 + size * .085) * Math.cos(a)}" stroke="${css('--muted')}" stroke-width="1.5"/><text x="${cx + (R1 + size * .06) * Math.sin(a) * 0.86}" y="${cy - (R1 + size * .06) * Math.cos(a) * 0.86 + 3}" font-size="${size * .045}" fill="${css('--muted')}" text-anchor="middle" font-family="Oxanium, monospace">+${d}d</text>`; }).join('');
  const m = w.metrics.get(s.id);
  return `<svg class="dial" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(nameOf(s))}: ${esc(t('lgSun'))} ${Math.round(m.sun_frac * 100)}%, ${esc(t('lgEarth'))} ${Math.round(m.earth_frac * 100)}%">
    <line x1="${cx}" y1="${cy - R1 - size * .05}" x2="${cx}" y2="${cy - R1 + size * .05}" stroke="${css('--text')}" stroke-width="1"/>
    ${parts.join('')}${ticks}
    <g class="dial-needle" data-n="${n}" data-i0="${w.i0}"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R1 - size * .02}" stroke="${css('--text')}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="3" fill="${css('--text')}"/></g>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="${size * .08}" fill="${sunC}" font-family="Oxanium, monospace">☼ ${Math.round(m.sun_frac * 100)}%</text>
    <text x="${cx}" y="${cy + size * .09}" text-anchor="middle" font-size="${size * .08}" fill="${earthC}" font-family="Oxanium, monospace">◍ ${Math.round(m.earth_frac * 100)}%</text></svg>`;
}
function placeDialNeedles(root) {
  const now = LLSN().now();
  root.querySelectorAll('.dial-needle').forEach(g => {
    const n = Number(g.dataset.n), i0 = Number(g.dataset.i0), svg = g.ownerSVGElement, vb = svg.viewBox.baseVal;
    g.setAttribute('transform', `rotate(${(((now - i0) / n) * 360).toFixed(2)} ${vb.width / 2} ${vb.height / 2})`);
  });
}

// ------------------------------------------------------------ Sun/Earth elevation (SVG)
function altSVG(s, W, H, scale = null) {
  const w = LLSN().window, n = w.i1 - w.i0 + 1, step = Math.max(1, Math.ceil(n / 480));
  const pts = { sun: [], earth: [], hz: [] };
  let lo = 0, hi = 0;
  for (let k = 0; k < n; k += step) {
    const i = w.i0 + k, su = core.sunAzEl(s, i), ea = core.earthAzEl(s, i);
    const hz = core.terrainPending(s) ? null : core.horizonAt(s, su.az);
    pts.sun.push([k, su.el]); pts.earth.push([k, ea.el]); if (hz != null) pts.hz.push([k, hz]);
    lo = Math.min(lo, su.el, ea.el); hi = Math.max(hi, su.el, ea.el, hz ?? 0);
  }
  lo = scale ? scale[0] : Math.floor(lo - 1); hi = scale ? scale[1] : Math.ceil(hi + 1);
  const X = k => 28 + (k / (n - 1)) * (W - 34), Y = v => 6 + (1 - (v - lo) / (hi - lo)) * (H - 20);
  const line = (arr, col, wd, dash = '') => `<polyline points="${arr.map(([k, v]) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${wd}" ${dash}/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(nameOf(s))}: ${esc(t('altAria'))}">
    <line x1="28" x2="${W - 6}" y1="${Y(0)}" y2="${Y(0)}" stroke="${css('--muted')}" stroke-dasharray="3 3" stroke-width="1"/>
    <text x="2" y="${Y(hi) + 8}" font-size="9" fill="${css('--muted')}" font-family="Oxanium,monospace">${hi}°</text><text x="2" y="${Y(lo)}" font-size="9" fill="${css('--muted')}" font-family="Oxanium,monospace">${lo}°</text><text x="2" y="${Y(0) + 3}" font-size="9" fill="${css('--muted')}" font-family="Oxanium,monospace">0°</text>
    ${pts.hz.length ? line(pts.hz, css('--muted'), 1) : ''}${line(pts.earth, css('--earth'), 1.6)}${line(pts.sun, css('--sun'), 1.6)}
    <line class="alt-needle" data-n="${n}" data-i0="${w.i0}" data-x0="28" data-w="${W - 34}" x1="0" x2="0" y1="4" y2="${H - 12}" stroke="${css('--text')}" stroke-width="1.5"/></svg>`;
}
function placeAltNeedles(root) {
  const now = LLSN().now();
  root.querySelectorAll('.alt-needle').forEach(l => {
    const x = Number(l.dataset.x0) + ((now - Number(l.dataset.i0)) / (Number(l.dataset.n) - 1)) * Number(l.dataset.w);
    l.setAttribute('x1', x); l.setAttribute('x2', x);
  });
  root.querySelectorAll('.alt-now').forEach(p => {
    const s = byId(p.dataset.id); if (!s) return;
    const su = core.sunAzEl(s, now), ea = core.earthAzEl(s, now);
    p.innerHTML = `<span class="v sun">☼ ${su.el.toFixed(1)}°</span> | <span class="v earth">◍ ${ea.el.toFixed(1)}°</span>`;
  });
}

// ------------------------------------------------------------ timeline (SVG)
let bitsKD = null;
async function timelineSVG(sites) {
  const cw = document.querySelector('#ls-compare .tl')?.clientWidth || 1100;
  const w = LLSN().window, n = w.i1 - w.i0 + 1, W = Math.max(720, Math.min(1100, Math.round(cw - 34))), LW = W < 900 ? 124 : 150, rowH = 14, gap = 10, top = 22;
  const kd = await (bitsKD ||= stationBits().catch(() => null));
  const H = top + sites.length * (rowH * 2 + 8 + gap) + 4;
  const X = k => LW + (k / n) * (W - LW - 10);
  const sunC = css('--sun'), earthC = css('--earth'), relayC = css('--relay'), kdC = css('--kdsa');
  let out = '';
  const dStep = [1, 2, 7, 14, 30, 60, 120].find(st => ((W - LW - 10) / (n / 24)) * st >= 42) || 240;   // axis labels at least 42 px apart
  for (let d = 0; d * 24 < n; d += dStep) out += `<line x1="${X(d * 24)}" x2="${X(d * 24)}" y1="${top - 4}" y2="${H}" stroke="${css('--border')}" stroke-width="1"/><text x="${X(d * 24) + 2}" y="12" font-size="11" fill="${css('--muted')}" font-family="Oxanium,monospace">${core.hourToDate(w.i0 + d * 24).toISOString().slice(5, 10)}</text>`;
  for (let r = 0; r < sites.length; r++) {
    const s = sites[r], y = top + r * (rowH * 2 + 8 + gap), bits = hourBits(s, w.i0, w.i1);
    const pn = LLSN().pinNo?.(s.id);
    out += `<text x="0" y="${y + rowH}" font-size="11.5" fill="${css('--text')}">${pn ? `#${pn} ` : ''}${esc(nameOf(s).slice(0, W < 900 ? 16 : 22))}</text>`;
    if (!bits) { out += `<text x="${LW}" y="${y + rowH}" font-size="11" fill="${css('--muted')}">${esc(t('pending'))}</text>`; continue; }
    const codes = await relayCodes(s.id, w.i0, w.i1).catch(() => null);
    const runsDraw = (test, col, yy, hh, op = 1) => { let st = -1; for (let k = 0; k <= n; k++) { const on = k < n && test(k); if (on && st < 0) st = k; else if (!on && st >= 0) { out += `<rect x="${X(st).toFixed(1)}" y="${yy}" width="${Math.max(0.8, X(k) - X(st)).toFixed(1)}" height="${hh}" fill="${col}" fill-opacity="${op}"/>`; st = -1; } } };
    out += `<rect x="${LW}" y="${y}" width="${W - LW - 10}" height="${rowH}" fill="${css('--surface-2')}"/><rect x="${LW}" y="${y + rowH + 2}" width="${W - LW - 10}" height="${rowH}" fill="${css('--surface-2')}"/>`;
    runsDraw(k => bits[k] & 1, sunC, y, rowH);
    runsDraw(k => !(bits[k] & 1) && core.sunVisibleFraction(s, w.i0 + k) > 0, sunC, y, rowH, 0.35);
    runsDraw(k => bits[k] & 2, earthC, y + rowH + 2, rowH);
    if (codes) runsDraw(k => !(bits[k] & 2) && codes[k] === 2, relayC, y + rowH + 2, rowH);
    if (kd?.KDSA) runsDraw(k => (bits[k] & 2) && kd.KDSA[w.i0 + k], kdC, y + rowH * 2 + 4, 3);
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="tl-svg" role="img" aria-label="${esc(t('tlH'))}">${out}
    <g class="tl-needle" data-n="${n}" data-i0="${w.i0}" data-w="${W}" data-lw="${LW}"><line x1="0" x2="0" y1="${top - 6}" y2="${H}" stroke="${css('--text')}" stroke-width="1.6"/><path d="M-5,${top - 10} L5,${top - 10} L0,${top - 3}z" fill="${css('--text')}"/></g></svg>`;
}
function placeTlNeedle(root) {
  const g = root.querySelector('.tl-needle'); if (!g) return;
  const n = Number(g.dataset.n), W = Number(g.dataset.w) || 1100, LW = Number(g.dataset.lw) || 150, x = LW + ((LLSN().now() - Number(g.dataset.i0)) / n) * (W - LW - 10);
  g.setAttribute('transform', `translate(${x.toFixed(1)},0)`);
}

// ------------------------------------------------------------ render
let trayView = 'table', seq = 0;
const tray = () => $('#tray-body'), sec = () => $('#ls-compare .cmp-dyn');

async function renderTray() {
  const root = tray(); if (!root || !LLSN().window) return;
  const pinned = (LLSN().compare?.() || []).length;
  const sites = shown();
  const my = ++seq;
  const trayEl = $('#ls-tray');
  if (trayEl && trayEl.classList.contains('empty') !== !pinned) {
    trayEl.classList.toggle('empty', !pinned);
    if (pinned) window.dispatchEvent(new Event('resize'));          // scrubber canvas re-measures once it is shown
  }
  if (!pinned) { root.innerHTML = ''; return; }
  if (trayView === 'table') {
    loadAsync(sites, () => { if (my === seq) renderTray(); });
    root.innerHTML = tableHTML(sites, TRAY_ROWS, false, asyncVals);
    updateNow(root);
  } else if (trayView === 'dial') {
    root.innerHTML = `${LG.dial()}<div class="tray-dials" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px"></div>`;
    const box = root.querySelector('.tray-dials');
    for (const s of sites) {
      const svg = await dialSVG(s, 160); if (my !== seq) return;
      box.insertAdjacentHTML('beforeend', `<div class="ls-panel" style="padding:8px"><div style="font-size:12px;font-weight:600">${LLSN().pinNo?.(s.id) ? `<span class="pin-no">#${LLSN().pinNo(s.id)}</span>` : ''}${esc(nameOf(s))}</div>${svg}<button type="button" class="ls-btn why-btn" data-why="${s.id}" style="width:100%">${esc(t('why'))}</button></div>`);
    }
    placeDialNeedles(root);
  } else {
    root.innerHTML = LG.alt() + sites.map(s => `<div class="ls-panel alt-card" style="padding:8px;margin-bottom:8px"><div style="font-size:12px;font-weight:600">${LLSN().pinNo?.(s.id) ? `<span class="pin-no">#${LLSN().pinNo(s.id)}</span>` : ''}${esc(nameOf(s))}</div>${altSVG(s, 360, 120)}<p class="alt-now num" data-id="${s.id}" style="margin:2px 0 0;font-size:12px"></p></div>`).join('');
    placeAltNeedles(root);
  }
}

let bigSeq = 0;
async function renderBig() {
  const root = sec(); if (!root || !LLSN().window) return;
  const my = ++bigSeq;
  const pinned = (LLSN().compare?.() || []).length, sites = shown(), ids = sites.map(s => s.id);
  loadAsync(sites, () => { if (my === bigSeq) renderBig(); });
  const sm = document.querySelector('#ls-compare > details > summary'); if (sm) sm.textContent = t('allSites');
  const scale = sharedScale(sites);
  root.innerHTML = `<div class="sec-head"><h2 id="cmp-h">${esc(t('cmpH'))}</h2><div class="cmp-controls"><span class="cmp-range"></span><div class="cmp-arrows"><button type="button" class="ls-btn" data-col="-1" aria-label="${esc(t('colPrev'))}">‹</button><button type="button" class="ls-btn" data-col="1" aria-label="${esc(t('colNext'))}">›</button></div></div></div>
    ${pinned ? '' : `<p class="lsn-note">${esc(t('cmpNoPins'))}</p>`}
    <div class="big-cmp synced-comparison" id="cards">${detailTableHTML(sites, scale)}</div>
    <div class="sub-h"><h3>${esc(t('tlH'))}</h3></div>${LG.tl()}<p class="lsn-note">${esc(t('tlDesc'))}</p>
    <div class="tl ls-panel"><div class="tl-wrap"></div></div><div class="cmp-tooltip" role="tooltip" hidden></div>`;
  placeAltNeedles(root);
  wireColumns(root, sites.length, pinned);
  wirePlotTips(root);
  const tl = root.querySelector('.tl-wrap');
  const timeline = await timelineSVG(sites);
  if (my !== bigSeq) return;
  tl.innerHTML = timeline;
  placeTlNeedle(root);
  wireTimeline(tl);
  wireTimelineTips(root, sites);
}

function wireTimeline(box) {
  const svg = box.querySelector('svg'); if (!svg) return;
  const toTime = e => {
    const nd = svg.querySelector('.tl-needle'), W = Number(nd?.dataset.w) || 1100, LW = Number(nd?.dataset.lw) || 150;
    const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W;
    const w = LLSN().window, n = w.i1 - w.i0 + 1, f = (x - LW) / (W - LW - 10);
    if (f < 0 || f > 1) return;
    (LLSN().setTimeSoon || LLSN().setTime)(w.i0 + f * n);
  };
  let drag = false;
  svg.addEventListener('pointerdown', e => { drag = true; svg.setPointerCapture(e.pointerId); toTime(e); });
  svg.addEventListener('pointermove', e => { if (drag) toTime(e); });
  svg.addEventListener('pointerup', () => { drag = false; });
  svg.style.cursor = 'pointer';
}

function updateNow(root) {
  const now = LLSN().now?.(); if (now == null) return;
  root.querySelectorAll('.now-span').forEach(c => { const s = byId(c.dataset.id); if (s) c.innerHTML = nowHTML(s, now); });
}
function onTime() {
  const t0 = tray(), b = sec();
  if (t0) { updateNow(t0); placeDialNeedles(t0); placeAltNeedles(t0); }
  if (b) { updateNow(b); placeDialNeedles(b); placeAltNeedles(b); placeTlNeedle(b); }
}

function wire() {
  $('#tray-view').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    trayView = b.dataset.v;
    $('#tray-view').querySelectorAll('button[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderTray();
  });
  const click = e => {
    const map = e.target.closest('[data-map]');
    if (map) { setFocus(map.dataset.map); LLSN().goTo?.('.ls-screen'); return; }
    const why = e.target.closest('[data-why]');
    if (why) { setFocus(why.dataset.why); LLSN().goTo?.('#ls-brief'); return; }
    const un = e.target.closest('.unpin'); if (un) { LLSN().unpin?.(un.dataset.id); return; }
    const f = e.target.closest('[data-focus]'); if (f) setFocus(f.dataset.focus);

  };
  tray().addEventListener('click', click);
  $('#ls-compare').addEventListener('click', click);
  document.addEventListener('click', e => {
    for (const pop of document.querySelectorAll('.measure-help[open]')) if (!pop.contains(e.target)) pop.open = false;
  });
  $('#ls-compare').addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const pop = e.target.closest('.measure-help[open]');
    if (pop) { pop.open = false; pop.querySelector('summary').focus(); }
    const tip = sec()?.querySelector('.cmp-tooltip'); if (tip) tip.hidden = true;
  });
  for (const root of [tray(), $('#ls-compare')]) root.addEventListener('keydown', e => { const f = e.target.closest('[data-focus]'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setFocus(f.dataset.focus); } });
  const all = () => { renderTray(); renderBig(); };
  window.addEventListener('llsn:pins', all);
  window.addEventListener('llsn:window', all);
  window.addEventListener('llsn:sites', all);
  window.addEventListener('llsn:lang', all);
  window.addEventListener('llsn:focus', () => { renderTray(); renderBig(); });
  window.addEventListener('llsn:time', onTime);
  all();
}

whenReady(wire);
