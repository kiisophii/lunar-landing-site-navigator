// about.js — About view (#about, design spec v65 §6): how to use, definitions, validation, Korea links,
// sources (required by the rules), assumptions, team and SI (AI) use disclosure. Loaded on first visit to #about.
// Numbers: validation.json, hindcast.json (no other numbers on this page).
import { t, getLang } from './i18n.js';
import { addStrings, LLSN } from './ui_shared.js';
import { headline, PGDA_URL, PAPER_URL } from './trust.js';
import { hindcast, validation } from './values.js';
import { RULE } from './compare_view.js';
import { CREDITS } from './credits.js';
import { mountHero } from './about_hero.js';
import { ABOUT_COPY } from './about_copy.js';
import { iconSvg } from './icons.js';

// Keep the designer's About layout isolated from the map and other owners' views.
const layout = document.createElement('link');
layout.rel = 'stylesheet';
layout.href = new URL('../css/about_layout.css', import.meta.url).href;
document.head.append(layout);

addStrings({
  abExplore: 'Explore the Moon', abKicker: 'Lunar Landing Site Navigator',
  abH1: 'Where can a lander see the Sun and the Earth?', abLead: 'Luna Sight compares lunar landing sites and dates side by side: sunlight for power, a direct line to Earth for the radio link, and how long the dark lasts — from NASA terrain and ephemeris data, hour by hour. A comparison tool, not a “best site” picker.',
  abArtCap: 'Illustration only, not to scale.',
  abWhy: 'Why the lunar south pole?', abW1: 'There is ice', abW1t: 'Crater floors that never see the Sun can keep water ice — a resource for future crews.',
  abW2: 'The Sun stays low', abW2t: 'Near the pole the Sun skims the horizon, so a few hundred meters of height or a ridge decide between light and long shadows.',
  abW3: 'The Earth hides', abW3t: 'Libration makes the Earth bob around the horizon, so the direct radio link comes and goes.',
  abHow: 'How to use', abH1s: 'Set the conditions', abH1t: '① Landing date and operating period; optional minimum sunlight / Direct-to-Earth and maximum shadow.',
  abH2s: 'Compare sites', abH2t: '② Sort by one value and pin any number of sites; the tray and the section below compare them over the same period.',
  abH3s: 'Read the evidence', abH3t: '“Site check ↓” opens the decision brief: horizon, date slip, nearby spots, relay tower, ground stations, validation.',
  abKeys: 'Detailed controls', abKeysT: 'Drag = move the 3D Moon · right-drag or Shift-drag = rotate/tilt · wheel or pinch = zoom (click the globe first) · scrubber: ←/→ = 1 hour, Shift = 1 day · Esc closes pop-ups · ⌖ in the toolbar places your own point · mini map accepts “−89.45, −136.2” or “89.45S 136.2W” · “Copy link” shares the exact view.',
  abDefs: 'How to read the numbers',
  df1: 'Sunlight', df1t: 'Share of hours in the period when at least half of the solar disc (radius 0.2666°) is above the local terrain horizon, seen from 2 m above the ground.',
  df2: 'Direct-to-Earth', df2t: 'Share of hours when the Earth’s center is above the terrain horizon (conservative). Geometry only — not radio performance.',
  df3: 'Sun + Earth together', df3t: 'Sun disc ≥ 50 % and Earth centre above the terrain horizon at the same hour. Geometry only — not power or radio performance.', df4: 'Longest shadow', df4t: 'Longest continuous run of hours without sunlight inside the period.',
  df5: 'Margin', df5t: 'Body elevation minus the terrain horizon in that direction; positive = visible.',
  df6: 'Via relay tower', df6t: 'Hours when the lander sees a tower (line of sight, up to 3 towers within 10 km on slopes ≤ 15°) and the tower sees the Earth.',
  df7: 'Yeoju KDSA in view', df7t: 'The site sees the Earth AND the Moon is at least 10° above the Korea Deep Space Antenna in Yeoju. Geometry only — reception was not modelled.',
  df8: 'Analysis period vs long-term', df8t: 'Period values (chip “this period”) come from the dates you chose. Long-term values (chip “long-term”) are 2026–2030 or 18.6-year averages. Do not mix them.',
  df9: 'Example verdict thresholds', df9t: 'Caution: longest shadow > {dark} h, direct link < {lo} %, or last among the compared sites. Strength: direct link ≥ {hi} % or first. These are published examples for discussion, not mission requirements. No hidden scores.',
  abVal: 'Can I trust these numbers?', abValLead: 'Average sunlight over 18.6 years at {n} random points (85–90°S) compared with NASA PGDA maps: mean absolute error',
  abArtAria: 'Illustration: a small rocket leaves the Earth on a dotted path toward the Moon.', abNext: 'Next section', abVc1: 'Sunlight', abVc2: 'Earth visibility', abVc3: 'Named sites inside PGDA’s ±300 m range', abVc3t: '{a} of {b} catalogue sites (sunlight)',
  abEph: 'Ephemeris check against an independent run: max difference {d}° over {n} samples.',
  abHind: 'Mission hindcast', abNotNasa: 'Comparisons with public data — not a NASA approval or endorsement.',
  abKorea: 'Korea links', abK1: 'ShadowCam on Danuri', abK1t: 'A NASA camera on Korea’s Danuri orbiter images inside permanently shadowed craters (NASA / KARI / ASU). Links only — Danuri does not relay for landers.',
  abK2: 'Yeoju deep-space antenna', abK2t: 'KDSA (35 m): for every site the decision brief counts the hours when the site sees the Earth and the Moon is ≥ 10° above Yeoju. Coordinates: KARI kdsa01.tf via NASA NAIF.',
  abK3: 'KASA partner', abK3t: 'The Korea AeroSpace Administration is a 2026 Space Apps partner.', abKMore: 'Ground-station block →',
  abMore: 'Team, sources and AI use', abSrc: 'Data & credits', abSrcLead: 'Every dataset and number on this site comes from these sources (full list with sizes and checks: data/DATASETS.md in the repository).',
  sName: 'Data', sOrg: 'From', sUse: 'Used for', sLic: 'Terms',
  abLim: 'Assumptions and limits', abLimT: 'Observer 2 m above the ground · hourly steps · no atmosphere / refraction · link = geometric visibility · tower heights 5/15/30/50 m, up to 3 towers · data window 2026-01-01 to 2030-12-31 UTC · your own points use coarser browser terrain (~948 m north of 75°S; PGDA terrain near the south pole) · slope: catalogue sites only, from data/terrain (16 southern sites at lander scale from 5–20 m PGDA LOLA terrain, the other 17 from a 250 m box); none for your own points.',
  abTeam: 'Team and SI (AI) use', abTeamLead: 'Team Ginkgo Orbit, NASA Space Apps Challenge 2026 (Seoul).',
  abSI: 'All solution ideas and design decisions came from our six team members. SI tools (Claude Code with Claude Opus 5.5; OpenAI Codex) helped with code, data processing, documentation and verification. Every SI task is logged in docs/SI_USAGE.md. No AI-generated images or video are used; any added later must carry a visible “AI-generated” watermark.',
  abCTA: 'Find your own landing site', abCTAb: 'Find my landing site →',
}, {
  abExplore: '달 살펴보기', abKicker: 'Lunar Landing Site Navigator',
  abH1: '착륙선이 해와 지구를 볼 수 있는 곳은?', abLead: 'Luna Sight는 달 착륙지와 날짜를 나란히 비교합니다: 전력을 위한 햇빛, 지구와 직접 교신할 수 있는 시간, 어둠이 얼마나 오래 가는지 — NASA 지형·천체력 자료로 1시간 간격으로 계산합니다. "최고의 착륙지"를 고르는 도구가 아니라 비교 도구입니다.',
  abArtCap: '설명용 그래픽, 실제 비율 아님.',
  abWhy: '왜 달 남극인가', abW1: '얼음이 있다', abW1t: '해가 들지 않는 분화구 바닥에 물 얼음이 남아 있을 수 있습니다 — 미래 탐사의 자원.',
  abW2: '해가 낮게 뜬다', abW2t: '극 근처에서는 해가 지평선을 스치듯 움직여서, 몇백 m의 높이나 능선 하나가 빛과 긴 그늘을 가릅니다.',
  abW3: '지구가 숨는다', abW3t: '칭동 때문에 지구가 지평선 근처에서 오르내려 직접 교신이 생겼다 끊겼다 합니다.',
  abHow: '사용법', abH1s: '조건 정하기', abH1t: '① 착륙 날짜와 운용 기간, 필요하면 최소 일조·교신과 최대 그늘.',
  abH2s: '후보 비교', abH2t: '② 한 가지 값으로 정렬하고 원하는 만큼 핀으로 고정 — 트레이와 아래 섹션이 같은 기간으로 비교합니다.',
  abH3s: '근거 보기', abH3t: '"이 후보 따져 보기 ↓"로 착륙지 검증를 엽니다: 지평선, 날짜 밀림, 주변 위치, 중계탑, 지상국, 검증.',
  abKeys: '자세한 조작법', abKeysT: '드래그 = 3D 달 이동 · 오른쪽 드래그 또는 Shift 드래그 = 회전·기울이기 · 휠/핀치 = 확대(먼저 지구본 클릭) · 스크러버: ←/→ = 1시간, Shift = 1일 · Esc = 팝업 닫기 · 도구 막대 ⌖ = 내 지점 찍기 · 미니맵 좌표 형식 "−89.45, −136.2" 또는 "89.45S 136.2W" · "링크 복사"로 지금 화면 공유.',
  abDefs: '결과를 읽는 법',
  df1: '일조율', df1t: '기간 중 태양 원반(반지름 0.2666°)의 절반 이상이 지형 지평선 위에 있는 시간 비율, 지면 2 m 높이 기준.',
  df2: '지구 직접 교신', df2t: '지구 중심이 지형 지평선 위에 있는 시간 비율(보수적). 기하만 — 전파 성능 아님.',
  df3: '해+지구 동시', df3t: '같은 시각에 태양 원반 50 % 이상과 지구 중심이 함께 지형 지평선 위. 기하만 — 전력·전파 성능 아님.', df4: '최장 그늘', df4t: '기간 안에서 햇빛 없이 이어진 가장 긴 시간.',
  df5: '여유각', df5t: '천체 고도 − 그 방향 지형 지평선 높이. 양수면 보임.',
  df6: '중계탑 경유', df6t: '착륙선이 탑을 보고(시선, 10 km 안 경사 15° 이하 자리에 최대 3기) 탑이 지구를 보는 시간.',
  df7: '여주 KDSA 가시', df7t: '착륙지에서 지구가 보이고 여주 심우주 안테나에서 달이 10° 이상 떠 있는 시간. 기하만 — 수신 성능은 계산하지 않음.',
  df8: '분석 기간 vs 장기 평균', df8t: '기간 값(칩 "이 기간")은 고른 날짜의 값, 장기 값(칩 "장기 평균")은 2026–2030 또는 18.6년 평균. 섞지 않습니다.',
  df9: '예시 판정 기준값', df9t: '주의: 최장 그늘 > {dark}시간, 직접 교신 < {lo} %, 또는 비교 중 꼴찌. 강점: 직접 교신 ≥ {hi} % 또는 1위. 토론용으로 공개한 예시이며 임무 요구 조건이 아닙니다. 숨은 점수 없음.',
  abVal: '방법과 검증', abValLead: '남위 85–90° 무작위 {n}점의 18.6년 평균 일조를 NASA PGDA 지도와 비교한 평균 절대 오차',
  abArtAria: '그림: 작은 로켓이 지구에서 점선을 따라 달로 향합니다.', abNext: '다음 섹션', abVc1: '일조', abVc2: '지구 가시', abVc3: 'PGDA ±300 m 범위 안에 든 이름 있는 착륙지', abVc3t: '카탈로그 {b}곳 중 {a}곳 (일조)',
  abEph: '독립 계산과 천체력 비교: {n}개 표본에서 최대 차 {d}°.',
  abHind: '실제 임무 되짚기', abNotNasa: '공개 자료와 비교한 결과이며 NASA의 승인이나 보증이 아닙니다.',
  abKorea: '한국과의 연결', abK1: '다누리의 ShadowCam', abK1t: '한국 다누리 궤도선에 실린 NASA 카메라가 영구음영 분화구 안을 찍습니다(NASA / KARI / ASU). 링크만 — 다누리는 착륙선을 중계하지 않습니다.',
  abK2: '여주 심우주 안테나', abK2t: 'KDSA(35 m): 착륙지 검증에서 착륙지가 지구를 보고 여주에서 달이 10° 이상인 시간을 셉니다. 좌표: KARI kdsa01.tf (NASA NAIF).',
  abK3: 'KASA 파트너', abK3t: '우주항공청(KASA)은 2026 Space Apps 파트너입니다.', abKMore: '지상국 블록 →',
  abMore: '만든 사람 · 데이터 출처 · AI 사용', abSrc: '데이터 출처', abSrcLead: '이 사이트의 모든 자료와 숫자는 아래 출처에서 왔습니다. 제공처 표기 원문이라 영어 그대로 둡니다 (전체 목록: 저장소 data/DATASETS.md).',
  sName: '자료', sOrg: '기관', sUse: '쓴 곳', sLic: '조건',
  abLim: '가정과 한계', abLimT: '관측 높이 2 m · 1시간 간격 · 대기·굴절 없음 · 교신 = 기하학적 가시성 · 탑 높이 5/15/30/50 m, 최대 3기 · 자료 기간 2026-01-01 ~ 2030-12-31 UTC · 사용자 지점은 더 거친 브라우저 지형(남위 75° 북쪽 약 948 m, 남극 근처는 PGDA 지형) · 경사: 카탈로그 착륙지만, data/terrain 값(남쪽 16곳은 5–20 m PGDA LOLA 지형의 착륙선 규모 경사, 나머지 17곳은 250 m 상자 경사). 사용자 지점은 경사 값 없음.',
  abTeam: '팀과 AI 사용', abTeamLead: 'Team Ginkgo Orbit, NASA Space Apps Challenge 2026 (서울).',
  abSI: '해결 아이디어와 설계 결정은 모두 6명 팀원이 냈습니다. SI 도구(Claude Code · Claude Opus 5.5, OpenAI Codex)는 코드, 자료 처리, 문서, 검증을 도왔습니다. 모든 SI 작업은 docs/SI_USAGE.md에 기록합니다. AI가 만든 그림·영상은 쓰지 않았고, 나중에 넣으면 눈에 보이는 "AI-generated" 표시를 붙입니다.',
  abCTA: '내 착륙지를 직접 찾아보세요', abCTAb: '내 착륙지 찾아보기 →',
});

const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const E = k => esc(t(k));
// about 40 fixed stars for the picture band (seeded, same every load)
const STARS = (() => { let x = 7, out = ''; const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 40; k++) out += `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;opacity:${(0.25 + r() * 0.6).toFixed(2)};${r() > 0.85 ? 'width:2px;height:2px;' : ''}"></i>`;
  return out; })();
const SV = d => `<svg class="ab-ic" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
const IC = {
  why: [SV('<path d="M4 15l4-6 3 4 2-3 3 5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M3 15h14" stroke="currentColor" stroke-width="1.4"/>'),
    SV('<circle cx="10" cy="10" r="3.2" fill="none" stroke="var(--sun)" stroke-width="1.4"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" stroke="var(--sun)" stroke-width="1.3" stroke-linecap="round"/>'),
    SV('<circle cx="10" cy="10" r="6.5" fill="none" stroke="var(--earth)" stroke-width="1.4"/><path d="M4 8.5c3 1 5-1.5 7 0s3.5 2 5 1M5.5 14c2-1 4 .5 6 0" fill="none" stroke="var(--earth)" stroke-width="1.2"/>')],
  how: [SV('<rect x="3" y="4" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'),
    SV('<path d="M6 3h8l-1 5 3 3v1H4v-1l3-3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 12v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'),
    SV('<rect x="2.5" y="4" width="6.5" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="11" y="4" width="6.5" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/>')],
  kr: [SV('<path d="M5 9a5 5 0 0 1 10 0z" fill="none" stroke="var(--kdsa)" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 9v8M7 17h6M10 9l3-4" stroke="var(--kdsa)" stroke-width="1.4" stroke-linecap="round"/>'),
    SV('<ellipse cx="10" cy="10" rx="8" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(-25 10 10)"/><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>'),
    SV('<rect x="3" y="6" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="11" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 6l1.2-2h3.6L13 6" fill="none" stroke="currentColor" stroke-width="1.4"/>')],
};
/** the credits text uses *italics* only */
const md = x => esc(x).replace(/\*([^*]+)\*/g, '<i>$1</i>');

const TEAM = [['Dongju Kim', 'team lead · validation'], ['Sua Kim', 'integrator · Korea links · custom points'], ['Minchul Kim', 'ephemeris · site catalogue'],
  ['Jiyong Sung', 'terrain · horizons · local grids'], ['Soyun Jeong', 'whole-Moon maps'], ['Chaei Oh', 'visual design']];

let disposeHero = () => {};
let renderVersion = 0;
async function render() {
  const version = ++renderVersion;
  const root = document.getElementById('view-about');
  const H = await headline(), v = await validation(), h = await hindcast();
  if (version !== renderVersion) return;
  disposeHero();
  const inRange = v?.named ? v.named.filter(n => n.ours_sun >= n.pgda_sun_min300 && n.ours_sun <= n.pgda_sun_max300).length : null;
  const ap = h?.apollo_sun_elevation || [], rb = h?.robotic_sunset || [];
  const C = ABOUT_COPY[getLang() === 'ko' ? 'ko' : 'en'], X = esc;
  const trustCards = H ? `    <div class="ab-trust">
      <div class="tr-big"><b class="num" style="color:var(--sun)">${H.sun}<small> pp</small></b><span>${E('abVc1')} · MAE · <span class="num">r ${H.sunR}</span></span></div>
      <div class="tr-sm"><b class="num" style="color:var(--earth)">${H.earth}<small> pp</small></b><span>${E('abVc2')} · MAE · <span class="num">r ${H.earthR}</span></span></div>
      <div class="tr-sm"><b class="num">${inRange}<small> / ${v.named.length}</small></b><span>${E('abVc3')}</span></div>
    </div>` : '';
  root.innerHTML = `
  <div class="ab-hero" id="ab-hero">
    <div class="abh-scene" id="heroJourney"></div><div class="abh-shade" aria-hidden="true"></div>
    <div class="abh-text"><h1 tabindex="-1">${X(C.hero.h1)}</h1><div class="abh-name">${X(C.hero.name)}</div>${C.hero.lead.map(x => `<p class="abh-lead">${X(x)}</p>`).join('')}
      <p class="abh-btns"><a class="ls-btn primary" href="#" data-act="explore">${X(C.hero.btns[0])} →</a><a class="ls-btn" href="#about-steps" data-act="how">${X(C.hero.btns[1])}</a></p></div>
  </div>
  <div id="abScroll" class="ab-scroll at-top" tabindex="0">
  <section class="ab-sec" id="about-why"><div><span class="ab-no num">01</span><h2>${X(C.why.h2)}</h2></div><div class="ab-body">${C.why.p.map((x, k) => `<p${k === C.why.p.length - 1 ? ' class="ab-strong"' : ''}>${X(x)}</p>`).join('')}</div></section>
  <section class="ab-sec" id="about-steps"><div><span class="ab-no num">02</span><h2>${X(C.steps.h2)}</h2></div><div class="ab-steps">${C.steps.items.map(it => `<div class="ls-panel"><h3><span class="circ">${X(it.n)}</span> ${X(it.h)}</h3><p>${X(it.p)}</p></div>`).join('')}</div></section>
  <section class="ab-sec" id="about-what"><div><span class="ab-no num">03</span><h2>${X(C.what.h2)}</h2></div><div class="ab-cards">${C.what.items.map((it, k) => `<div class="ls-panel"><h3>${X(it.h)}</h3><p>${X(it.p)}</p><a class="ls-btn ab-act" href="#" data-act="${['dates', 'near', 'relay'][k]}">${X(it.btn)} →</a></div>`).join('')}</div></section>
  <section class="ab-sec" id="about-results"><div><span class="ab-no num">04</span><h2>${X(C.results.h2)}</h2></div><div class="ab-body">
    <table class="src-tbl ab-measures"><thead><tr><th>${X(C.results.head[0])}</th><th>${X(C.results.head[1])}</th></tr></thead><tbody>${C.results.rows.map(r => `<tr><th scope="row">${X(r[0])}</th><td>${X(r[1])}</td></tr>`).join('')}</tbody></table>
    ${C.results.p.map(x => `<p>${X(x)}</p>`).join('')}</div></section>
  <section class="ab-sec" id="about-data"><div><span class="ab-no num">05</span><h2>${X(C.data.h2)}</h2></div><div class="ab-body">${C.data.p.map((x, k) => `<p>${X(x)}</p>${k === 0 ? trustCards : ''}`).join('')}
    <p class="ab-links">${C.data.btns.map((x, k) => `<a class="ls-btn" href="#" data-act="${['sources', 'methods', 'limits'][k]}">${X(x)}</a>`).join('')}</p></div></section>
  <section class="ab-sec" id="about-korea"><div><span class="ab-no num">06</span><h2>${X(C.korea.h2)}</h2></div><div class="ab-body">${C.korea.p.map(x => `<p>${X(x)}</p>`).join('')}
    <p class="ab-links"><a class="ls-btn ab-act" href="#" data-act="korea">${X(C.korea.btn)} →</a></p></div></section>
  <section class="ab-sec ab-start" id="about-start"><div><span class="ab-no num">07</span><h2>${X(C.start.h2)}</h2></div><div class="ab-body"><p>${X(C.start.p)}</p>
    <p class="ab-links"><a class="ls-btn primary" href="#" data-act="explore">${X(C.start.btn)} →</a></p>
    <p class="ab-by"><em>${X(C.start.by)}</em></p>
    <p class="ab-links small">${C.start.links.map((x, k) => `<a class="ls-link" href="#" data-act="${['team', 'credits', 'ai'][k]}">${X(x)}</a>`).join('<span aria-hidden="true"> · </span>')}</p></div></section>
  <div class="ab-ref-sep" role="presentation"></div>
  <section class="ab-sec" id="about-more"><h2>${E('abMore')}</h2><div>
  <details id="about-defs"><summary>${E('abDefs')}</summary><dl class="defs">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<dt>${E('df' + k)}</dt><dd>${esc(fill(t('df' + k + 't'), { dark: RULE.darkH, lo: RULE.directLow * 100, hi: RULE.directHigh * 100 }))}</dd>`).join('')}</dl></details>
  <details id="about-validation"><summary>${E('abVal')}</summary><div>
    ${H ? `<p>${esc(fill(t('abValLead'), { n: v.n_points }))}</p>
` : ''}
    ${h?.ephemeris_check ? `<p class="muted">${esc(fill(t('abEph'), { d: h.ephemeris_check.max_deg.toExponential(1), n: h.ephemeris_check.sample_hours }))}</p>` : ''}
    <h3 style="margin-top:20px">${E('abHind')}</h3>
    <table class="src-tbl"><thead><tr><th></th><th>UTC</th><th>ALSJ</th><th>Luna Sight</th><th>Δ</th></tr></thead><tbody>${ap.map(a => `<tr><td>${esc(a.mission)}</td><td class="num">${a.landing_utc.slice(0, 16).replace('T', ' ')}</td><td class="num">${a.reported_sun_el_deg.toFixed(2)}°</td><td class="num">${a.ours_sun_el_deg_catalogue_point.toFixed(2)}°</td><td class="num">${a.difference_deg_catalogue.toFixed(2)}°</td></tr>`).join('')}</tbody></table>
    <table class="src-tbl" style="margin-top:10px"><tbody>${rb.map(r => `<tr><td>${esc(r.mission)}</td><td>${r.difference_text ? esc(r.difference_text) : esc(t('hcNoSrc'))}${r.source_url ? ` · <a href="${esc(r.source_url)}" target="_blank" rel="noopener">source</a>` : ''}</td></tr>`).join('')}</tbody></table>
    <p class="muted">${E('hcProxy')} · <a href="${PGDA_URL}" target="_blank" rel="noopener">PGDA</a> · <a href="${PAPER_URL}" target="_blank" rel="noopener">Mazarico et al. 2011</a> · ${E('abNotNasa')}</p></div></details>
    <details id="about-sources"><summary>${E('abSrc')}</summary><p class="muted">${E('abSrcLead')}</p>
      <p class="credits-add" lang="en">Fonts (added 2026-11-15): Geist, Geist Mono — Copyright 2024 The Geist Project Authors, SIL Open Font License 1.1, served by Google Fonts (C26, C27).</p>
      <div class="credits" lang="en">${CREDITS.map(([h, items]) => `<h4>${esc(h)}</h4><ul>${items.map(([id, txt]) => `<li><span class="muted num">${id}.</span> ${md(txt)}</li>`).join('')}</ul>`).join('')}</div></details>
    <details id="about-limits"><summary>${E('abLim')}</summary><p class="muted">${E('abLimT')}</p></details>
    <details id="about-team"><summary>${E('abTeam')}</summary><p>${E('abTeamLead')}</p><ul>${TEAM.map(([n, r]) => `<li><b>${esc(n)}</b> — <span class="muted">${esc(r)}</span></li>`).join('')}</ul>
      <p id="about-si">${E('abSI')}</p><p><a href="https://github.com/kiisophii/lunar-landing-site-navigator/blob/main/docs/SI_USAGE.md" target="_blank" rel="noopener">docs/SI_USAGE.md</a> · <a href="https://github.com/kiisophii/lunar-landing-site-navigator" target="_blank" rel="noopener">source (Apache-2.0)</a></p></details>
  </div></section>
  </div>
`;
  const sc = root.querySelector('#abScroll');
  const stopHero = mountHero(root.querySelector('.abh-scene'), t('abArtAria'), sc);
  const header = document.querySelector('.ls-head');
  const size = () => root.style.setProperty('--about-head', `${header.getBoundingClientRect().height}px`);
  const observer = new ResizeObserver(size); observer.observe(header); size();
  disposeHero = () => { stopHero(); observer.disconnect(); };
  root.insertAdjacentHTML('beforeend', `<button type="button" class="ab-next">${iconSvg('arrow-down', { size: 18 })}</button>`);
  const nextBtn = root.querySelector('.ab-next');
  const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  const upcoming = () => [...sc.querySelectorAll(':scope > section')].find(el => el.getBoundingClientRect().top > sc.getBoundingClientRect().top + 40);
  const toSection = el => sc.scrollTo({top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 32, behavior: behavior()});
  const atEnd = () => sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
  const sync = () => {
    sc.classList.toggle('at-top', sc.scrollTop < 4);
    const back = atEnd();
    nextBtn.classList.toggle('back-top', back);
    const label = back ? (getLang() === 'ko' ? '맨 위로' : 'Back to top') : (getLang() === 'ko' ? '다음 내용으로' : 'Next section');
    nextBtn.setAttribute('aria-label', label); nextBtn.title = label;
  };
  nextBtn.addEventListener('click', () => {
    if (atEnd()) sc.scrollTo({top:0, behavior:behavior()});
    else if (upcoming()) toSection(upcoming());
    else sc.scrollTo({top:sc.scrollHeight, behavior:behavior()});
  });
  sc.addEventListener('scroll', sync, {passive:true}); sync();
  const goIn = (sel, openDetails) => { const el = root.querySelector(sel); if (!el) return; if (openDetails) { const d = el.closest('details') || (el.tagName === 'DETAILS' ? el : null); if (d) d.open = true; } toSection(el); };
  const anchor = location.hash.length > 6 ? root.querySelector(`[id="${CSS.escape(location.hash.slice(1))}"]`) : null;
  if (anchor) { anchor.closest('details')?.setAttribute('open', ''); toSection(anchor); }
  // leaving About: the app may still be drawing, so retry until the target exists, then re-align twice — stop as soon as the user scrolls
  const settle = (find, act) => {
    let tries = 0, stop = false; const quit = () => { stop = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, quit, { once: true, passive: true }));
    const go = () => { if (stop) return; const el = find(); if (!el) { if (++tries < 16) setTimeout(go, 250); return; }
      act(el); [600, 1500].forEach(ms => setTimeout(() => { if (!stop) act(find() || el, true); }, ms)); };
    setTimeout(go, 250);
  };
  const openBlock = k => settle(() => document.querySelector(`#ls-brief [data-open="${k}"]`), (b, again) => {
    if (!again && b.getAttribute('aria-expanded') !== 'true') b.click();
    document.getElementById(`blk-${k}`)?.scrollIntoView({ behavior: again ? 'auto' : 'smooth', block: 'start' }); });
  root.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return; e.preventDefault();
    const act = a.dataset.act;
    if (act === 'explore') leave();
    else if (act === 'how') goIn('#about-steps');
    else if (act === 'dates') { leave(); openBlock('date'); }
    else if (act === 'near') { leave(); openBlock('near'); }
    else if (act === 'korea') { leave(); openBlock('gs'); }
    else if (act === 'relay') { leave(); settle(() => document.querySelector('#tray-cat .tc-tabs [data-c="relay"]'), (b, again) => {
      if (b.getAttribute('aria-pressed') !== 'true') b.click();
      if (window.innerWidth < 1100) document.getElementById('ls-tray')?.scrollIntoView({ behavior: again ? 'auto' : 'smooth', block: 'start' }); else if (!again) window.scrollTo({ top: 0 }); }); }
    else if (act === 'sources' || act === 'credits') goIn('#about-sources', true);
    else if (act === 'methods') goIn('#about-validation', true);
    else if (act === 'limits') goIn('#about-limits', true);
    else if (act === 'team') goIn('#about-team', true);
    else if (act === 'ai') goIn('#about-si', true);
  };
}
function leave() { history.pushState(null, '', location.pathname + location.search); window.dispatchEvent(new HashChangeEvent('hashchange')); }
/** The hero picture: the same colour map as the 3D view, orthographic, lit from the side. */
function drawMoon(cv) {
  const im = new Image();
  im.onload = () => {
    const IW = 512, IH = 256, c = document.createElement('canvas'); c.width = IW; c.height = IH;
    const g0 = c.getContext('2d'); g0.drawImage(im, 0, 0, IW, IH); const px = g0.getImageData(0, 0, IW, IH).data;
    const W = cv.width, R = W / 2, g = cv.getContext('2d'), out = g.createImageData(W, W), la = -0.5;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = (i + .5) / R - 1, y = 1 - (j + .5) / R, rr = x * x + y * y; if (rr > 1) continue;
      const z = Math.sqrt(1 - rr), lat = Math.asin(z * Math.sin(la) + y * Math.cos(la)), lon = Math.atan2(x, z * Math.cos(la) - y * Math.sin(la));
      const u = ((lon / (2 * Math.PI) + .5) % 1 + 1) % 1, v = .5 - lat / Math.PI, si = (Math.floor(v * IH) * IW + Math.floor(u * IW)) * 4, di = (j * W + i) * 4;
      const sh = Math.max(0.06, 0.15 + 0.85 * (0.75 * x + 0.35 * y + 0.55 * z));
      out.data[di] = px[si] * sh; out.data[di + 1] = px[si + 1] * sh; out.data[di + 2] = px[si + 2] * sh; out.data[di + 3] = 255;
    }
    g.putImageData(out, 0, 0);
  };
  im.src = 'data/globe/moon_color_2k.jpg';
}

window.addEventListener('llsn:lang', () => { if (document.body.classList.contains('on-about')) render(); });
render();
