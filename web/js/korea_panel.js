import { blockedStrip } from './visibility_graph.js';
// korea_panel.js — differentiator B: Korea links (KASA is a NASA Space Apps 2026 partner).
//   1. KDSA (Yeoju, 35 m) Moon visibility in KST for the analysis period, compared with the NASA DSN 70 m antennas.
//   2. Direct link from the focused site: Earth visible from the site AND the Moon >= 10 deg above Yeoju (and NASA DSN 70 m).
//      No Danuri relay: Danuri (KPLO) carries no lunar-surface relay payload; it is only mentioned as ShadowCam's host.
//   3. ShadowCam context products: links + label metadata only (no images redistributed).
// Reads web/data/korea/*.json (contract section 13) via diff_data.js / korea.js. Colours: CSS variables only.
import * as core from './core.js';
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, fmtHours, LLSN } from './ui_shared.js';
import { stationHours, stationsMeta, kdsaWindows, siteStationLink, koreaInfo, STATION_IDS } from './diff_data.js';

addStrings({
  krTitle: 'Korea links — Yeoju antenna, ShadowCam', krAria: 'Korea links',
  krPeriod: 'Period',
  krStTitle: 'Total time with Moon ≥ 10° above each antenna',
  krStHint: 'Hours in the analysis period with the Moon center at least 10° above each antenna\'s horizon (no refraction, no local terrain). A lander signal still needs a direct or relayed line of sight to Earth.',
  krAnyDsn: 'Any NASA DSN 70 m', krKdsaOnly: 'Only Yeoju (no DSN 70 m)',
  krWin: 'Yeoju (KDSA) passes in Korean time (KST = UTC+9)', krFrom: 'from (KST)', krTo: 'to (KST)', krMaxEl: 'max. Moon elevation',
  krMore: 'more passes in this period', krNoWin: 'The Moon does not rise 10° above Yeoju in this period.',
  krLnTitle: 'When are Earth and the stations in view?',
  krLnHint: 'Hours in the analysis period when the Earth center is above this site\'s real terrain horizon AND the Moon is at least 10° above the antenna (direct link only; no relay, no link budget).',
  krLnEarth: 'Site sees Earth', krLnKdsa: 'Site sees Earth + Yeoju sees the Moon', krLnDsn: 'Site sees Earth + any NASA DSN 70 m',
  krLnPending: 'Terrain pending — no real horizon for this site yet, so the direct link is not computed (no flat-horizon result is shown).',
  krScTitle: 'ShadowCam context (NASA instrument aboard Korea\'s Danuri / KPLO)',
  krScNote: 'Links and label metadata only — no ShadowCam images are copied or shown here. Credit: NASA/KARI/ASU.',
  krScCentre: 'center', krScDates: 'acquired', krScPix: 'pixel', krScLabel: 'PDS label', krScData: 'data (COG)', krScReadme: 'readme',
  krPendingQ: 'Open questions to the organisers',
  krSrc: 'Station coordinates: DSN 810-005 module 301 (NASA/JPL); KDSA from public NASA/JPL NAIF SPICE antenna coordinates. Moon positions: NAIF DE440s via Skyfield.',
  krCP11: 'Korean payload on the Moon',
}, {
  krTitle: '한국 연결 — 여주 안테나, 섀도캠', krAria: '한국 연결',
  krPeriod: '기간',
  krStTitle: '지상국별 달 가시 시간 합계 (안테나 위 달 고도 ≥ 10°)',
  krStHint: '분석 기간 중 달 중심이 각 안테나 지평선 위 10° 이상인 시간 (굴절 없음, 주변 지형 무시). 착륙선 신호는 여전히 지구까지 직접 또는 중계 가시선이 필요하다.',
  krAnyDsn: 'NASA DSN 70 m 중 하나라도', krKdsaOnly: '여주만 (DSN 70 m 없음)',
  krWin: '여주(KDSA) 달 가시 시간, 한국 시간 (KST = UTC+9)', krFrom: '시작 (KST)', krTo: '끝 (KST)', krMaxEl: '최대 달 고도',
  krMore: '개 더 있음 (이 기간)', krNoWin: '이 기간에는 여주에서 달이 10° 위로 뜨지 않는다.',
  krLnTitle: '이 착륙지에서 지구와 지상국이 보이는 시간은?',
  krLnHint: '분석 기간 중 착륙지의 실제 지형 지평선 위로 지구 중심이 보이면서, 안테나에서 달이 10° 이상 떠 있는 시간 (직접 통신만, 중계·링크 버짓 없음).',
  krLnEarth: '착륙지에서 지구가 보임', krLnKdsa: '지구 보임 + 여주에서 달 보임', krLnDsn: '지구 보임 + NASA DSN 70 m 중 하나',
  krLnPending: '지형 대기 중 — 이 착륙지는 아직 실제 지평선이 없어서 직접 통신을 계산하지 않는다 (평평한 지평선 결과는 보여 주지 않음).',
  krScTitle: '섀도캠 자료 (한국 다누리/KPLO에 실린 NASA 장비)',
  krScNote: '링크와 라벨 정보만 — 섀도캠 이미지는 복사하거나 보여 주지 않는다. 출처: NASA/KARI/ASU.',
  krScCentre: '중심', krScDates: '촬영', krScPix: '픽셀', krScLabel: 'PDS 라벨', krScData: '데이터 (COG)', krScReadme: 'readme',
  krPendingQ: '운영진에게 보낸 질문',
  krSrc: '지상국 좌표: DSN 810-005 모듈 301 (NASA/JPL), KDSA는 NASA/JPL NAIF 공개 SPICE 안테나 좌표. 달 위치: NAIF DE440s, Skyfield.',
  krCP11: '달에 가는 한국 장비',
});

const KST_MS = 9 * 3600e3;
let sec, seq = 0;
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isoDay = i => core.hourToDate(i).toISOString().slice(0, 10);
const kst = ms => new Date(ms + KST_MS).toISOString().replace('T', ' ').slice(0, 16);
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const stName = (st, lang) => (lang === 'ko' && st.name_ko ? st.name_ko : st.name);

function build() {
  sec = document.getElementById('llsn-korea');
  sec.dataset.i18nAria = 'krAria';
  sec.innerHTML = `<div class="panel-head"><h2 data-i18n="krTitle"></h2><span class="kr-period num muted"></span></div>
    <div class="kr-st"></div><div class="kr-ln"></div><div class="kr-sc"></div>
    <p class="hint" data-i18n="krSrc"></p>`;
  const st = document.createElement('style');
  st.dataset.owner = 'korea_panel.js';
  st.textContent = `
    #llsn-korea h3 { font-size: 1rem; margin: var(--gap) 0 .4em; }
    #llsn-korea .bars { display: grid; gap: .35em; }
    #llsn-korea .brow { display: grid; grid-template-columns: minmax(0, 18em) minmax(60px, 1fr) auto; grid-template-areas: "l b v"; gap: .2em .8em; align-items: center; }
    #llsn-korea .brow .l { grid-area: l; min-width: 0; } #llsn-korea .brow .bar { grid-area: b; } #llsn-korea .brow .v { grid-area: v; }
    @media (max-width: 600px) { #llsn-korea .brow { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "l v" "b b"; } }
    #llsn-korea .bar { height: 14px; border-radius: 7px; background: var(--off); overflow: hidden; }
    #llsn-korea .bar > i { display: block; height: 100%; background: var(--earth); }
    #llsn-korea .bar.kdsa > i { background: var(--relay); }
    #llsn-korea .bars .v { font-family: var(--font-num); white-space: nowrap; }
    #llsn-korea .bars .kd { font-weight: 700; }
    #llsn-korea table { border-collapse: collapse; width: 100%; font-size: .88rem; }
    #llsn-korea th, #llsn-korea td { text-align: left; padding: .3em .45em; border-bottom: 1px solid var(--border); }
    #llsn-korea th { color: var(--muted); font-weight: 600; } #llsn-korea td { font-family: var(--font-num); }
    #llsn-korea .scroll { overflow-x: auto; }
    #llsn-korea .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--gap); margin: .4em 0; }
    #llsn-korea .kpi { background: var(--surface-2); border-radius: var(--radius); padding: .6em .8em; border-top: 4px solid var(--off); }
    #llsn-korea .kpi .label { display: block; color: var(--muted); font-size: .85rem; }
    #llsn-korea .kpi .value { display: block; font-family: var(--font-num); font-size: var(--fs-big); font-weight: 700; line-height: 1.1; }
    #llsn-korea .kpi .sub { display: block; color: var(--muted); font-size: .8rem; }
    #llsn-korea .kpi.ub { border-top-color: var(--warn); }
    #llsn-korea .note { background: var(--surface-2); border-left: 4px solid var(--warn); padding: .6em .8em; border-radius: 6px; margin: .5em 0; }
    #llsn-korea .caveat { border-left-color: var(--warn); font-weight: 600; }
    #llsn-korea .sc { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--gap); }
    #llsn-korea .sc article { background: var(--surface-2); border-radius: var(--radius); padding: .7em .9em; font-size: .88rem; }
    #llsn-korea .sc h4 { margin: 0 0 .3em; font-size: .95rem; }
    #llsn-korea .sc a { color: var(--earth); }
    #llsn-korea .credit { font-weight: 700; }
  `;
  document.head.appendChild(st);
  translate(sec);
}

async function render() {
  const my = ++seq;
  const w = LLSN().window, site = getFocus();
  sec.querySelector('.kr-period').textContent = `${t('krPeriod')} ${isoDay(w.i0)} → ${isoDay(w.i1)} (${w.days.toFixed(w.days % 1 ? 1 : 0)} ${t('days')})`;
  const [hrs, meta, wins, ln, info] = await Promise.all([
    stationHours(w.i0, w.i1), stationsMeta(), kdsaWindows(w.i0, w.i1, core.T0_MS),
    siteStationLink(site, w.i0, w.i1), koreaInfo()]);
  if (my !== seq) return;
  const lang = document.documentElement.lang;
  // ---- 1. stations
  const H = hrs.hours || 1;
  const byId = Object.fromEntries(meta.stations.map(s => [s.id, s]));
  const row = (label, h, cls = '') => `<div class="brow"><span class="l${cls === 'kdsa' ? ' kd' : ''}">${esc(label)}</span>
    <span class="bar ${cls}"><i style="width:${(100 * h / H).toFixed(1)}%"></i></span><span class="v">${fmtHours(h)} · ${pct(h / H)}</span></div>`;
  const shown = wins.slice(0, 8);
  sec.querySelector('.kr-st').innerHTML = `<h3>${t('krStTitle')}</h3>
    <div class="bars">${STATION_IDS.map(id => row(stName(byId[id], lang), hrs.byStation[id], id === 'KDSA' ? 'kdsa' : '')).join('')}
      ${row(t('krAnyDsn'), hrs.anyDsn)}${row(t('krKdsaOnly'), hrs.kdsaOnly, 'kdsa')}</div>
    <p class="hint">${t('krStHint')}</p>
    <h3>${t('krWin')}</h3>
    ${wins.length ? `<div class="scroll"><table><thead><tr><th>${t('krFrom')}</th><th>${t('krTo')}</th><th>${t('krMaxEl')}</th></tr></thead><tbody>
      ${shown.map(x => `<tr><td>${kst(x.rise)}${x.clippedStart ? ' ◂' : ''}</td><td>${kst(x.set)}${x.clippedEnd ? ' ▸' : ''}</td><td>${x.maxEl.toFixed(1)}°</td></tr>`).join('')}
      </tbody></table></div>${wins.length > shown.length ? `<p class="hint">+${wins.length - shown.length} ${t('krMore')}</p>` : ''}`
      : `<p class="muted">${t('krNoWin')}</p>`}`;
  // ---- 2. direct link from the focused site to the antennas (real terrain only)
  const lnBody = ln.pending ? `<p class="note">${t('krLnPending')}</p>`
    : `<div class="bars">${row(t('krLnEarth'), ln.earth)}${row(t('krLnKdsa'), ln.kdsa, 'kdsa')}${row(t('krLnDsn'), ln.dsn)}</div>`;
  sec.querySelector('.kr-ln').innerHTML = `<h3>${t('krLnTitle')} — ${esc(siteName(site))}</h3>${lnBody}<p class="hint">${t('krLnHint')}</p>`;
  if(!ln.pending)sec.querySelector('.kr-ln').insertAdjacentHTML('beforeend', `${blockedStrip(site,w)}<p class="hint geometry-explanation">${t('visStation')}</p>`);
  // ---- 3. ShadowCam + CP-11
  const sc = info.shadowcam;
  const cp = (info.sites_of_korean_interest || [])[0];
  sec.querySelector('.kr-sc').innerHTML = `<h3>${t('krScTitle')}</h3>
    <p class="note">${t('krScNote')}</p>
    <div class="sc">${sc.products.map(p => `<article><h4>${esc(p.target)}</h4>
      <div class="muted">${esc(p.title)}</div>
      <div>${t('krScCentre')} ${p.center_latlon[0].toFixed(2)}°, ${p.center_latlon[1].toFixed(2)}° · ${t('krScPix')} ${Number(p.pixel_m).toFixed(0)} m</div>
      <div>${t('krScDates')} ${esc(p.start_utc.slice(0, 10))}</div>
      <div><a href="${esc(p.label_url)}" target="_blank" rel="noopener">${t('krScLabel')}</a> ·
        <a href="${esc(p.browse_cog_url)}" target="_blank" rel="noopener">${t('krScData')}</a> ·
        <a href="${esc(p.readme_url)}" target="_blank" rel="noopener">${t('krScReadme')}</a></div>
      <div class="credit">© NASA/KARI/ASU</div></article>`).join('')}</div>
    <p class="hint">${esc(sc.citation)}</p>
    ${cp ? `<h3>${t('krCP11')}</h3><p>${esc(lang === 'ko' && cp.korea_link_ko ? cp.korea_link_ko : cp.korea_link)}
      <a href="${esc(cp.source_url)}" target="_blank" rel="noopener">NTRS 20230000531</a></p>` : ''}
`;
}

whenReady(() => {
  build();
  render();
  window.addEventListener('llsn:focus', () => render());
  window.addEventListener('llsn:window', () => render());
  window.addEventListener('llsn:lang', () => { translate(sec); render(); });
});
