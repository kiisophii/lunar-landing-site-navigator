import { blockedStrip } from './visibility_graph.js';
// relay_panel.js — differentiator A: relay tower for the focused site (team idea, BEACON-style tower).
// Reads web/data/relay/<ID>.json (contract section 12) written by pipeline/run_relay.py from real LOLA DEMs.
// Sites without a real DEM cache are listed in relay/index.json "pending_terrain" and are shown as such:
// nothing here is ever computed on a flat or mock horizon.
// Period numbers use only the analysis period [i0, i1] from app.js (LLSN.window).
// Listens: llsn:window, llsn:focus, llsn:time, llsn:lang. Colours: CSS variables only.
import * as core from './core.js';
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, fmtHours, cssVar, roundShares, legendHTML, LLSN } from './ui_shared.js';
import { relayIndex, relayFor, segmentHours, longestNone } from './diff_data.js';

addStrings({
  rlTitle: 'Relay tower — restore line of sight to Earth', rlAria: 'Relay tower analysis for the focused site',
  rlFor: 'Site', rlPeriod: 'Period', rlHeight: 'Tower height',
  rlDirect: 'Earth in view', rlVia: 'Added via tower', rlTotal: 'In view with tower(s)', rlNone: 'Out of view',
  rlLongestNone: 'Longest out-of-view stretch', rlOfPeriod: 'of the period',
  rlStrip: 'Visibility over the period', rlStripDirect: 'direct', rlStripVia: 'via tower', rlStripNone: 'out of view',
  rlBest: 'Tower site that adds the most hours', rlTowers: 'Tower network (greedy, up to 3 towers)',
  rlDist: 'distance from lander', rlBearing: 'bearing', rlGround: 'ground height', rlSlope: 'slope',
  rlTowerSun: 'tower-top sunlight', rlTowerEarth: 'tower sees Earth', rlGain: 'adds', rlParent: 'linked to',
  rlLander: 'lander', rlTower: 'tower', rlLos: 'line of sight to lander', rlClear: 'min. clearance',
  rlFresnel: 'first-Fresnel clearance (≥ 0.6 = clear)', rlYes: 'yes', rlNo: 'no',
  rlNoGain: 'No buildable tower within the search radius improves this site at this height.',
  rlAlways: 'This site already sees Earth all the time in the 5-year data window — no tower needed.',
  rlMap: 'Where a tower would help (search area)', rlMapLegend: '', rlLgGain: 'link gain with one tower at that spot (stronger = more)', rlLgNo: 'no line of sight or too steep', rlLgLander: 'lander', rlLgTower: 'towers',
  rlByN: 'Whole 2026–2030 window: link % with 0 / 1 / 2 / 3 towers',
  rlBudget: 'Link budget tower → Earth (ESTIMATE)', rlBudgetNote: 'Rough estimate using assumed equipment parameters, not a specification.',
  rlStation: 'station', rlBand: 'band', rlRange: 'range', rlCn0: 'C/N₀', rlRate: 'power-limited rate (ignores bandwidth)',
  rlPending: 'Terrain pending — the relay tower is computed only from real LOLA terrain. This site has no DEM cache yet, so nothing is shown (never a flat-horizon result).',
  rlNotYet: 'Relay results not computed yet for this site.',
  rlAssume: 'Assumptions: concept after NASA Glenn\'s BEACON lunar relay demonstrator (15 m deployed boom, users up to ~10 km; NTRS 20240014584). Search radius 10 km, 250 m grid, slope ≤ 15°. Link = geometric line of sight between the lander antenna (2 m) and the tower top over LOLA terrain with lunar curvature; first-Fresnel clearance (S 2.2 GHz, Ka 26 GHz) is reported, not required. Tower sees Earth = Earth center above the tower-top horizon. The link budget is an estimate.',
  rlSrc: 'Terrain: PGDA LOLA 20 m / 60 m / 80 m (near) + LOLA LDEM_16 (far, to 300 km). Ephemeris: NAIF DE440s + DE421 Moon orientation.',
  rlNetN: 'towers', rlAt: 'at',
}, {
  rlTitle: '중계 타워 — 지구 가시선 되살리기', rlAria: '선택한 착륙지의 중계 타워 분석',
  rlFor: '착륙지', rlPeriod: '기간', rlHeight: '타워 높이',
  rlDirect: '지구 직접 보임', rlVia: '타워로 추가', rlTotal: '타워 포함 가시', rlNone: '보이지 않음',
  rlLongestNone: '가장 긴 비가시 구간', rlOfPeriod: '(기간 대비)',
  rlStrip: '기간 동안 가시 여부', rlStripDirect: '직접', rlStripVia: '타워 경유', rlStripNone: '보이지 않음',
  rlBest: '가시 시간을 가장 늘리는 타워 위치', rlTowers: '타워 네트워크 (탐욕법, 최대 3기)',
  rlDist: '착륙선과의 거리', rlBearing: '방위', rlGround: '지면 고도', rlSlope: '경사',
  rlTowerSun: '타워 꼭대기 햇빛', rlTowerEarth: '타워에서 지구 보임', rlGain: '추가', rlParent: '연결 대상',
  rlLander: '착륙선', rlTower: '타워', rlLos: '착륙선과 가시선', rlClear: '최소 여유 높이',
  rlFresnel: '1차 프레넬 여유 (0.6 이상 = 여유 충분)', rlYes: '있음', rlNo: '없음',
  rlNoGain: '이 높이에서는 탐색 반경 안에 세울 수 있는 타워로 개선되지 않는다.',
  rlAlways: '이 착륙지는 5년 데이터 내내 지구가 보인다 — 타워가 필요 없다.',
  rlMap: '타워가 도움이 되는 곳 (탐색 범위)', rlMapLegend: '', rlLgGain: '그 자리에 탑 1기를 세울 때 늘어나는 교신 (진할수록 많음)', rlLgNo: '가시선 없음 또는 너무 가파름', rlLgLander: '착륙선', rlLgTower: '탑',
  rlByN: '2026–2030 전체: 타워 0 / 1 / 2 / 3기일 때 통신 %',
  rlBudget: '타워 → 지구 링크 버짓 (추정치)', rlBudgetNote: '장비 매개변수를 가정한 대략적 추정치이며 실제 규격이 아닙니다.',
  rlStation: '지상국', rlBand: '대역', rlRange: '거리', rlCn0: 'C/N₀', rlRate: '전력 기준 전송률 (대역폭 무시)',
  rlPending: '지형 대기 중 — 중계 타워는 실제 LOLA 지형으로만 계산한다. 이 착륙지는 아직 DEM이 없어서 아무것도 보여 주지 않는다 (평평한 지평선 결과는 절대 쓰지 않음).',
  rlNotYet: '이 착륙지는 아직 중계 결과가 계산되지 않았다.',
  rlAssume: '가정: NASA 글렌 연구센터 BEACON 달 중계 실증 개념(15 m 전개식 붐, 약 10 km 안 사용자; NTRS 20240014584)을 따름. 탐색 반경 10 km, 250 m 격자, 경사 15° 이하. 통신 = 착륙선 안테나(2 m)와 타워 꼭대기 사이의 기하학적 가시선(LOLA 지형, 달 곡률 포함). 1차 프레넬 여유(S 2.2 GHz, Ka 26 GHz)는 표시만 하고 조건으로 쓰지 않음. 타워에서 지구 보임 = 지구 중심이 타워 꼭대기 지평선 위. 링크 버짓은 추정치.',
  rlSrc: '지형: PGDA LOLA 20 m / 60 m / 80 m (근거리) + LOLA LDEM_16 (원거리, 300 km까지). 천체력: NAIF DE440s + DE421 달 자세.',
  rlNetN: '기', rlAt: '높이',
});

const HEIGHTS = [5, 15, 30, 50];
let sec, height = 15, cur = null, curId = null, seq = 0;

const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isoDay = i => core.hourToDate(i).toISOString().slice(0, 10);
const km = m => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
const bearing = (e, n) => ((Math.atan2(e, n) * 180 / Math.PI) + 360) % 360;

function build() {
  sec = document.getElementById('llsn-relay');
  sec.dataset.i18nAria = 'rlAria';
  sec.innerHTML = `
    <div class="panel-head"><h2 data-i18n="rlTitle"></h2><span class="rl-period num muted"></span></div>
    <div class="ctl">
      <span class="ctl-item"><span data-i18n="rlHeight"></span>
        <span class="seg rl-h" role="group">${HEIGHTS.map(h => `<button type="button" data-h="${h}">${h} m</button>`).join('')}</span></span>
      <span class="rl-site muted"></span>
    </div>
    <div class="rl-body"></div>
    <p class="hint" data-i18n="rlSrc"></p>`;
  const st = document.createElement('style');
  st.dataset.owner = 'relay_panel.js';
  st.textContent = `
    #llsn-relay .rl-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--gap); margin: var(--gap) 0; }
    #llsn-relay .kpi { background: var(--surface-2); border-radius: var(--radius); padding: .6em .8em; border-top: 4px solid var(--off); }
    #llsn-relay .kpi .label { display: block; color: var(--muted); font-size: .85rem; }
    #llsn-relay .kpi .value { display: block; font-family: var(--font-num); font-size: var(--fs-big); font-weight: 700; line-height: 1.1; }
    #llsn-relay .kpi .sub { display: block; font-family: var(--font-num); color: var(--muted); font-size: .85rem; }
    #llsn-relay .kpi.direct { border-top-color: var(--earth); } #llsn-relay .kpi.direct .value { color: var(--earth); }
    #llsn-relay .kpi.via { border-top-color: var(--relay); } #llsn-relay .kpi.via .value { color: var(--relay); }
    #llsn-relay .kpi.total { border-top-color: var(--text); }
    #llsn-relay .kpi.none { border-top-color: var(--warn); } #llsn-relay .kpi.none .value { color: var(--warn); }
    #llsn-relay h3 { font-size: 1rem; margin: var(--gap) 0 .4em; }
    #llsn-relay .rl-strip { width: 100%; height: 34px; display: block; border-radius: 6px; background: var(--off); }
    #llsn-relay .legend { display: flex; flex-wrap: wrap; gap: .3em var(--gap); font-size: .85rem; color: var(--muted); margin-top: .3em; }
    #llsn-relay .sw { display: inline-block; width: .9em; height: .9em; border-radius: 3px; vertical-align: -.1em; margin-right: .3em; }
    #llsn-relay .rl-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--gap); }
    @media (max-width: 860px) { #llsn-relay .rl-grid { grid-template-columns: 1fr; } }
    #llsn-relay canvas.rl-map { width: 100%; max-width: 420px; aspect-ratio: 1; display: block; background: var(--surface-2); border-radius: var(--radius); }
    #llsn-relay dl { display: grid; grid-template-columns: auto 1fr; gap: .2em .8em; margin: 0; font-size: .92rem; }
    #llsn-relay dt { color: var(--muted); } #llsn-relay dd { margin: 0; font-family: var(--font-num); }
    #llsn-relay table { border-collapse: collapse; width: 100%; font-size: .88rem; }
    #llsn-relay th, #llsn-relay td { text-align: left; padding: .3em .45em; border-bottom: 1px solid var(--border); }
    #llsn-relay th { color: var(--muted); font-weight: 600; }
    #llsn-relay td { font-family: var(--font-num); }
    #llsn-relay .note { background: var(--surface-2); border-left: 4px solid var(--warn); padding: .6em .8em; border-radius: 6px; margin: var(--gap) 0; }
    #llsn-relay .est { display: inline-block; font-size: .72rem; font-weight: 700; padding: .05em .5em; border-radius: 999px; background: var(--warn); color: var(--bg); margin-left: .4em; }
    #llsn-relay .scroll { overflow-x: auto; }
  `;
  document.head.appendChild(st);
  sec.querySelector('.rl-h').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    height = Number(b.dataset.h); window.LLSN.relayHeight = height; render();
    window.dispatchEvent(new CustomEvent('llsn:relayheight', { detail: { height } }));
  });
  translate(sec);
}

function markHeight() {
  sec.querySelectorAll('.rl-h button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.h) === height)));
}

async function load() {
  const site = getFocus();
  const my = ++seq;
  const idx=await relayIndex();
  const rel=idx.ids.includes(site.id)?await relayFor(site.id).catch(()=>null):null;
  if (my !== seq) return;
  curId = site.id; cur = { site, idx, rel };
  render();
}

function render() {
  if (!cur) return;
  markHeight();
  const { site, idx, rel } = cur;
  const w = LLSN().window;
  sec.querySelector('.rl-period').textContent = `${t('rlPeriod')} ${isoDay(w.i0)} → ${isoDay(w.i1)} (${(w.days).toFixed(w.days % 1 ? 1 : 0)} ${t('days')})`;
  sec.querySelector('.rl-site').textContent = `${t('rlFor')}: ${siteName(site)}`;
  const body = sec.querySelector('.rl-body');
  if (!rel) {
    const why = idx.pending_terrain?.[site.id];
    body.innerHTML = `<p class="note">${why && why !== 'not computed yet' ? t('rlPending') : (idx.ids.length ? t('rlPending') : t('rlNotYet'))}</p>`;
    return;
  }
  const j = rel.params.heights_m.findIndex(h => Number(h) === height);
  const net = rel.networks[j], best = rel.best[j];
  const seg = segmentHours(net.timeline.segments, w.i0, w.i1);
  const T = seg.total || 1;
  const gap = longestNone(net.timeline.segments, w.i0, w.i1);
  const nT = net.towers.length;
  const always = rel.lander.earth_frac >= 0.9999;
  // direct + via + none = 100 % exactly (largest-remainder rounding, issue #44); total = direct + via.
  const [pD, pV, pN] = roundShares([seg.direct, seg.via, seg.none]);
  body.innerHTML = `
    <div class="rl-kpis">
      <div class="kpi direct"><span class="label">${t('rlDirect')}</span><span class="value">${pD}%</span><span class="sub">${fmtHours(seg.direct)}</span></div>
      <div class="kpi via"><span class="label">${t('rlVia')} (${nT} ${t('rlNetN')}, ${height} m)</span><span class="value">+${pV}%</span><span class="sub">${fmtHours(seg.via)}</span></div>
      <div class="kpi total"><span class="label">${t('rlTotal')}</span><span class="value">${pD + pV}%</span><span class="sub">${fmtHours(seg.direct + seg.via)}</span></div>
      <div class="kpi none"><span class="label">${t('rlNone')}</span><span class="value">${pN}%</span><span class="sub">${t('rlLongestNone')}: ${fmtHours(gap)}</span></div>
    </div>
    <h3>${t('rlStrip')}</h3>
    <canvas class="rl-strip" height="34" role="img" aria-label="${esc(t('rlStrip'))}"></canvas>
    <div class="legend"><span><i class="sw" style="background:var(--earth)"></i>${t('rlStripDirect')}</span>
      <span><i class="sw" style="background:var(--relay)"></i>${t('rlStripVia')}</span>
      <span><i class="sw" style="background:var(--warn)"></i>${t('rlStripNone')}</span>
      <span class="num">${isoDay(w.i0)} → ${isoDay(w.i1)}</span></div>
    ${blockedStrip(site,w)}<p class="hint geometry-explanation">${t('visRelay')}</p>
    ${always ? `<p class="note">${t('rlAlways')}</p>` : ''}
    <div class="rl-grid">
      <div><h3>${t('rlMap')}</h3><canvas class="rl-map" width="420" height="420" role="img" aria-label="${esc(t('rlMap'))}"></canvas>
        ${legendHTML([{ kind: 'square', c: 'var(--relay)', op: 0.9, label: t('rlLgGain') }, { kind: 'square', c: 'var(--off)', op: 0.5, label: t('rlLgNo') }, { kind: 'dot', c: 'var(--earth)', label: t('rlLgLander') }, { kind: 'diamond', c: 'var(--text)', label: t('rlLgTower') }])}</div>
      <div>${towerHTML(net, best, rel)}</div>
    </div>
    <h3>${t('rlByN')}</h3>
    <p class="num">${net.link_frac_by_n.map((f, k) => `${k}: ${pct(f, 1)}`).join(' · ')}</p>
    ${budgetHTML(rel)}`;
  drawStrip(net, w);
  drawMap(rel, j, net);
  drawNow();
}

function towerHTML(net, best, rel) {
  if (!net.towers.length) return rel.lander.earth_frac >= 0.9999 ? '' : `<h3>${t('rlBest')}</h3><p class="note">${t('rlNoGain')}</p>`;
  const b = net.towers[0];
  const fr = b.fresnel || {};
  const rows = net.towers.map((tw, k) => `<tr><td>${k + 1}</td><td>${km(tw.dist_m)}</td><td>${bearing(tw.e_m, tw.n_m).toFixed(0)}°</td>
    <td>${tw.slope_deg?.toFixed(1)}°</td><td>+${tw.gain_pp?.toFixed(1)} pp</td>
    <td>${tw.parent === 'LANDER' ? t('rlLander') : `${t('rlTower')} ${tw.parent + 1}`}</td>
    <td>${tw.sun_frac != null ? pct(tw.sun_frac) : '—'}</td></tr>`).join('');
  return `<h3>${t('rlBest')} (${height} m)</h3>
    <dl>
      <dt>${t('rlDist')}</dt><dd>${km(b.dist_m)} · ${t('rlBearing')} ${bearing(b.e_m, b.n_m).toFixed(0)}°</dd>
      <dt>lat / lon</dt><dd>${b.lat.toFixed(4)}°, ${b.lon.toFixed(4)}°</dd>
      <dt>${t('rlGround')}</dt><dd>${b.ground_m != null ? Math.round(b.ground_m) + ' m' : '—'} (${t('rlSlope')} ${b.slope_deg?.toFixed(1)}°)</dd>
      <dt>${t('rlTowerEarth')}</dt><dd>${pct(b.tower_earth_frac, 1)} <span class="muted">(2026–2030)</span></dd>
      <dt>${t('rlTowerSun')}</dt><dd>${b.sun_frac != null ? pct(b.sun_frac, 1) : '—'}${b.longest_dark_h != null ? ` · ${t('perDark')} ${fmtHours(b.longest_dark_h)}` : ''}</dd>
      <dt>${t('rlLos')}</dt><dd>${b.link_to_lander ? t('rlYes') : t('rlNo')} · ${t('rlClear')} ${b.min_clear_m?.toFixed(1)} m</dd>
      <dt>${t('rlFresnel')}</dt><dd>S ${fr.S?.toFixed(2) ?? '—'} · Ka ${fr.Ka?.toFixed(2) ?? '—'}</dd>
    </dl>
    <h3>${t('rlTowers')}</h3>
    <div class="scroll"><table><thead><tr><th>#</th><th>${t('rlDist')}</th><th>${t('rlBearing')}</th><th>${t('rlSlope')}</th><th>${t('rlGain')}</th><th>${t('rlParent')}</th><th>${t('rlTowerSun')}</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function budgetHTML(rel) {
  const lb = rel.link_budget; if (!lb || !lb.results) return '';
  const rows = lb.results.filter(r => r.range === 'mean').map(r => `<tr><td>${esc(r.station.replace('_', ' '))}</td><td>${esc(r.band)}</td>
    <td>${lb.range_km?.mean ? Math.round(lb.range_km.mean).toLocaleString() + ' km' : '—'}</td>
    <td>${r.cn0_dbhz?.toFixed(1)} dB-Hz</td><td>${fmtRate(r.max_rate_bps)}</td><td class="muted">${esc(r.band_support || '')}</td></tr>`).join('');
  const as = budgetAssumptions(lb.assumptions);
  return `<h3>${t('rlBudget')}<span class="est">ESTIMATE</span></h3>
    <div class="scroll"><table><thead><tr><th>${t('rlStation')}</th><th>${t('rlBand')}</th><th>${t('rlRange')}</th><th>${t('rlCn0')}</th><th>${t('rlRate')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">${t('rlBudgetNote')}</p>${as}`;
}

/** Human-readable technical assumptions; results above remain expanded and unchanged. */
function budgetAssumptions(a) {
  if (!a) return '';
  const ko = document.documentElement.lang === 'ko';
  const label = (en, kr) => ko ? kr : en;
  const row = (name, value, unit = '') => value == null ? '' : `<dt>${esc(name)}</dt><dd>${esc(value)}${unit ? ` ${unit}` : ''}</dd>`;
  const bands = values => Object.entries(values || {}).map(([band, value]) => `${band}: ${value}`).join(' · ');
  const stationRows = Object.entries(a.stations || {}).map(([id, st]) => `<h4>${esc(id.replace('_', ' '))}</h4><dl>
    ${row(label('Dish diameter', '안테나 지름'), st.dish_m, 'm')}
    ${row(label('Efficiency', '효율'), st.efficiency)}
    ${row(label('System noise temperature', '시스템 잡음 온도'), bands(st.tsys_k), 'K')}
    ${row(label('Band support (assumed / unverified)', '대역 지원 (가정 / 미검증)'), bands(st.bands_supported))}</dl>`).join('');
  return `<details class="rl-budget-method"><summary>${t('mv')}</summary>
    <p class="hint">${label('All equipment parameters are assumptions, not BEACON, DSN or KDSA specifications. Range uses the largest and mean Moon–Earth distance over the ephemeris window.', '모든 장비 매개변수는 가정이며 BEACON·DSN·KDSA의 규격이 아닙니다. 거리는 천체력 기간의 달–지구 최대 거리와 평균 거리를 사용합니다.')}</p><dl>
    ${row(label('Transmit power', '송신 전력'), a.tx_power_w, 'W')}
    ${row(label('Transmit dish diameter', '송신 안테나 지름'), a.tx_dish_m, 'm')}
    ${row(label('Transmit efficiency', '송신 효율'), a.tx_efficiency)}
    ${row(label('Pointing loss', '지향 손실'), a.pointing_loss_db, 'dB')}
    ${row(label('Polarisation and other losses', '편파·기타 손실'), a.polarisation_misc_loss_db, 'dB')}
    ${row(label('Earth atmosphere loss', '지구 대기 손실'), bands(a.earth_atmos_loss_db), 'dB')}
    ${row(label('Required Eb/N₀', '필요 Eb/N₀'), a.required_ebn0_db, 'dB')}
    ${row(label('Margin', '여유'), a.margin_db, 'dB')}</dl>${stationRows}</details>`;
}

function fmtRate(bps) {
  if (bps == null || !isFinite(bps)) return '—';
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} kbps`;
  return `${Math.round(bps)} bps`;
}

function drawStrip(net, w) {
  const cv = sec.querySelector('.rl-strip'); if (!cv) return;
  const W = Math.max(200, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)));
  cv.width = W;
  const g = cv.getContext('2d');
  const col = { 0: cssVar('--warn'), 1: cssVar('--earth'), 2: cssVar('--relay') };
  const a = w.i0, b = w.i1 + 1, span = b - a;
  g.clearRect(0, 0, W, cv.height);
  for (const [s, len, code] of net.timeline.segments) {
    const lo = Math.max(s, a), hi = Math.min(s + len, b);
    if (hi <= lo) continue;
    g.fillStyle = col[code];
    const x0 = Math.floor((lo - a) / span * W), x1 = Math.ceil((hi - a) / span * W);
    g.fillRect(x0, 0, Math.max(1, x1 - x0), cv.height);
  }
  cv._base = g.getImageData(0, 0, W, cv.height);
}

function drawNow() {
  const cv = sec.querySelector('.rl-strip'); if (!cv || !cv._base) return;
  const w = LLSN().window, g = cv.getContext('2d');
  g.putImageData(cv._base, 0, 0);
  const x = (LLSN().now() - w.i0) / (w.i1 + 1 - w.i0) * cv.width;
  g.fillStyle = cssVar('--text');
  g.fillRect(Math.round(x) - 1, 0, 3, cv.height);
}

function drawMap(rel, j, net) {
  const cv = sec.querySelector('.rl-map'); if (!cv) return;
  const g = cv.getContext('2d'), S = cv.width;
  const c = rel.candidates, key = `${rel.params.heights_m[j]}`.replace(/\.0$/, '');
  const ph = c.per_height[key] || c.per_height[String(rel.params.heights_m[j])];
  const R = rel.params.radius_km * 1000, sp = rel.params.spacing_m;
  const px = sp / (2 * R) * S;
  const relay = cssVar('--relay'), off = cssVar('--off');
  g.clearRect(0, 0, S, S);
  const base = rel.lander.earth_frac;
  const maxGain = Math.max(1e-6, ...ph.lander_link_pm.map(v => v / 1000 - base));
  for (let i = 0; i < c.n; i++) {
    const x = (c.e_m[i] + R) / (2 * R) * S, y = (R - c.n_m[i]) / (2 * R) * S;
    const ok = ph.link[i] && c.ground_m[i] != null && c.slope_deg[i] <= rel.params.max_slope_deg;
    const gain = ph.lander_link_pm[i] / 1000 - base;
    if (ok && gain > 0) { g.globalAlpha = 0.25 + 0.75 * Math.min(1, gain / maxGain); g.fillStyle = relay; }
    else { g.globalAlpha = 0.5; g.fillStyle = off; }
    g.fillRect(x - px / 2, y - px / 2, px + 0.5, px + 0.5);
  }
  g.globalAlpha = 1;
  const txt = cssVar('--text'), earth = cssVar('--earth');
  // range rings every 2.5 km
  g.strokeStyle = txt; g.globalAlpha = 0.25; g.lineWidth = 1;
  for (let r = 2500; r <= R; r += 2500) { g.beginPath(); g.arc(S / 2, S / 2, r / (2 * R) * S, 0, 2 * Math.PI); g.stroke(); }
  g.globalAlpha = 1;
  // links + towers
  const pos = tw => [(tw.e_m + R) / (2 * R) * S, (R - tw.n_m) / (2 * R) * S];
  g.strokeStyle = relay; g.lineWidth = 2;
  net.towers.forEach(tw => {
    const [x, y] = pos(tw);
    const [x0, y0] = tw.parent === 'LANDER' ? [S / 2, S / 2] : pos(net.towers[tw.parent]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
  });
  net.towers.forEach((tw, k) => {
    const [x, y] = pos(tw);
    g.fillStyle = txt; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 8, y); g.lineTo(x, y + 8); g.lineTo(x - 8, y); g.closePath(); g.fill();
    g.fillStyle = cssVar('--bg'); g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k + 1), x, y + 0.5);
  });
  g.fillStyle = earth; g.beginPath(); g.arc(S / 2, S / 2, 7, 0, 2 * Math.PI); g.fill();
  g.strokeStyle = txt; g.lineWidth = 2; g.stroke();
  g.fillStyle = txt; g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
  g.fillText('N', S / 2, 4);
  g.textAlign = 'left'; g.textBaseline = 'bottom';
  g.fillText(`${rel.params.radius_km} km`, 6, S - 4);
}

whenReady(() => {
  window.LLSN.relayHeight = height;
  build();
  load();
  window.addEventListener('llsn:focus', () => load());
  window.addEventListener('llsn:window', () => render());
  window.addEventListener('llsn:time', () => drawNow());
  window.addEventListener('llsn:lang', () => { translate(sec); render(); });
  window.addEventListener('resize', () => render());
});
