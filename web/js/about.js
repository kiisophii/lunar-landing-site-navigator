// about.js — About view (#about, design spec v65 §6): how to use, definitions, validation, Korea links,
// sources (required by the rules), assumptions, team and SI (AI) use disclosure. Loaded on first visit to #about.
// Numbers: validation.json, hindcast.json (no other numbers on this page).
// Top band (Chaei Oh's About band spec): a fixed 40 % band with the Earth-to-Moon picture (about-journey.js, Chaei Oh),
// the sections scroll inside #abScroll only, and the craft follows that scroll. Decorative picture: no data, not to scale.
import './about-journey.js';                       // classic script: defines window.LunaJourney
import { t } from './i18n.js';
import { addStrings, LLSN } from './ui_shared.js';
import { headline, PGDA_URL, PAPER_URL } from './trust.js';
import { hindcast, validation } from './values.js';
import { RULE } from './compare_view.js';
import { CREDITS } from './credits.js';

addStrings({
  abExplore: 'Explore the Moon', abKicker: 'Lunar Landing Site Navigator',
  abBand1: 'See lunar landing', abBand2: 'conditions clearly.', abLede: 'Sunlight, Earth contact and terrain at a glance.', abCta: 'Explore the Moon',
  abArt: 'Illustration of the journey from the Earth to a landing on the Moon. Not to scale.', abNext: 'Next section', abTop: 'Back to top',
  abH1: 'Where can a lander see the Sun and the Earth?', abLead: 'Luna Sight compares lunar landing sites and dates side by side: sunlight for power, a direct line to Earth for the radio link, and how long the dark lasts — from NASA terrain and ephemeris data, hour by hour. A comparison tool, not a “best site” picker.',
  abArtCap: 'The Moon is drawn by this tool’s 3D view (NASA SVS CGI Moon Kit colour, LOLA terrain). Not to scale.',
  abWhy: 'Why the lunar south pole?', abW1: 'There is ice', abW1t: 'Crater floors that never see the Sun can keep water ice — a resource for future crews.',
  abW2: 'The Sun stays low', abW2t: 'Near the pole the Sun skims the horizon, so a few hundred metres of height or a ridge decide between light and long shadows.',
  abW3: 'The Earth hides', abW3t: 'Libration makes the Earth bob around the horizon, so the direct radio link comes and goes.',
  abHow: 'How to use', abH1s: 'Set the conditions', abH1t: '① Landing date and operating period; optional minimum sunlight / Earth link and maximum shadow.',
  abH2s: 'Compare sites', abH2t: '② Sort by one value and pin any number of sites; the tray and the section below compare them over the same period.',
  abH3s: 'Read the evidence', abH3t: '“Why this site ↓” opens the decision brief: horizon, date slip, nearby spots, relay tower, ground stations, validation.',
  abKeys: 'Detailed controls', abKeysT: 'Drag = move the 3D Moon · right-drag or Shift-drag = rotate/tilt · wheel or pinch = zoom (click the globe first) · scrubber: ←/→ = 1 hour, Shift = 1 day · Esc closes pop-ups · ⌖ in the toolbar places your own point · mini map accepts “−89.45, −136.2” or “89.45S 136.2W” · “Copy link” shares the exact view.',
  abDefs: 'How to read the numbers',
  df1: 'Sunlight', df1t: 'Share of hours in the period when at least half of the solar disc (radius 0.2666°) is above the local terrain horizon, seen from 2 m above the ground.',
  df2: 'Direct Earth link', df2t: 'Share of hours when the Earth’s centre is above the terrain horizon (conservative). Geometry only — not radio performance.',
  df3: 'Sun + Earth together', df3t: 'Sunlit and Earth in view at the same hour.', df4: 'Longest shadow', df4t: 'Longest continuous run of hours without sunlight inside the period.',
  df5: 'Margin', df5t: 'Body elevation minus the terrain horizon in that direction; positive = visible.',
  df6: 'Via relay tower', df6t: 'Hours when the lander sees a tower (line of sight, up to 3 towers within 10 km on slopes ≤ 15°) and the tower sees the Earth.',
  df7: 'Yeoju KDSA can receive', df7t: 'The site sees the Earth AND the Moon is at least 10° above the Korea Deep Space Antenna in Yeoju.',
  df8: 'Analysis period vs long-term', df8t: 'Period values (chip “this period”) come from the dates you chose. Long-term values (chip “long-term”) are 2026–2030 or 18.6-year averages. Do not mix them.',
  df9: 'Example verdict thresholds', df9t: 'Caution: longest shadow > {dark} h, direct link < {lo} %, or last among the compared sites. Strength: direct link ≥ {hi} % or first. These are published examples for discussion, not mission requirements. No hidden scores.',
  abVal: 'Can I trust these numbers?', abValLead: 'Average sunlight over 18.6 years at {n} random points (85–90°S) compared with NASA PGDA maps: mean absolute error',
  abVc1: 'Sunlight', abVc2: 'Earth visibility', abVc3: 'Named sites inside PGDA’s ±300 m range', abVc3t: '{a} of {b} catalogue sites (sunlight)',
  abEph: 'Ephemeris check against an independent run: max difference {d}° over {n} samples.',
  abHind: 'Mission hindcast', abNotNasa: 'Comparisons with public data — not a NASA approval or endorsement.',
  abKorea: 'Korea links', abK1: 'ShadowCam on Danuri', abK1t: 'A NASA camera on Korea’s Danuri orbiter images inside permanently shadowed craters (NASA / KARI / ASU). Links only — Danuri does not relay for landers.',
  abK2: 'Yeoju deep-space antenna', abK2t: 'KDSA (35 m): for every site the decision brief counts the hours when the site sees the Earth and the Moon is ≥ 10° above Yeoju. Coordinates: KARI kdsa01.tf via NASA NAIF.',
  abK3: 'KASA partner', abK3t: 'The Korea AeroSpace Administration is a 2026 Space Apps partner.', abKMore: 'Ground-station block →',
  abMore: 'Team, sources and AI use', abSrc: 'Data & credits', abSrcLead: 'Every dataset and number on this site comes from these sources (full list with sizes and checks: data/DATASETS.md in the repository).',
  sName: 'Data', sOrg: 'From', sUse: 'Used for', sLic: 'Terms',
  abLim: 'Assumptions and limits', abLimT: 'Observer 2 m above the ground · hourly steps · no atmosphere / refraction · link = geometric visibility · tower heights 5/15/30/50 m, up to 3 towers · data window 2026-01-01 to 2030-12-31 UTC · your own points use coarser browser terrain (~948 m north of 75°S; PGDA terrain near the south pole) · slope not computed.',
  abTeam: 'Team and SI (AI) use', abTeamLead: 'Team Ginkgo Orbit, NASA Space Apps Challenge 2026 (Seoul).',
  abSI: 'All solution ideas and design decisions came from our six team members. SI tools (Claude Code with Claude Opus 5.5; OpenAI Codex) helped with code, data processing, documentation and verification. Every SI task is logged in docs/SI_USAGE.md. No AI-generated images or video are used; any added later must carry a visible “AI-generated” watermark.',
  abCTA: 'Find your own landing site', abCTAb: 'Find my landing site →',
}, {
  abExplore: '달 살펴보기', abKicker: 'Lunar Landing Site Navigator',
  abBand1: '달 착륙 조건을', abBand2: '더 또렷하게.', abLede: '햇빛과 지구 교신, 착륙지의 조건을 한눈에.', abCta: '달 살펴보기',
  abArt: '지구에서 달까지 착륙 과정을 표현한 그림. 실제 비율이 아닙니다.', abNext: '다음 내용으로', abTop: '맨 위로',
  abH1: '착륙선이 해와 지구를 볼 수 있는 곳은?', abLead: 'Luna Sight는 달 착륙지와 날짜를 나란히 비교합니다: 전력을 위한 햇빛, 지구와 직접 교신할 수 있는 시간, 어둠이 얼마나 오래 가는지 — NASA 지형·천체력 자료로 1시간 간격으로 계산합니다. "최고의 착륙지"를 고르는 도구가 아니라 비교 도구입니다.',
  abArtCap: '달은 이 도구의 3D 보기(NASA SVS CGI Moon Kit 색, LOLA 지형)로 그린 것. 실제 비율 아님.',
  abWhy: '왜 달 남극인가', abW1: '얼음이 있다', abW1t: '해가 들지 않는 분화구 바닥에 물 얼음이 남아 있을 수 있습니다 — 미래 탐사의 자원.',
  abW2: '해가 낮게 뜬다', abW2t: '극 근처에서는 해가 지평선을 스치듯 움직여서, 몇백 m의 높이나 능선 하나가 빛과 긴 그늘을 가릅니다.',
  abW3: '지구가 숨는다', abW3t: '칭동 때문에 지구가 지평선 근처에서 오르내려 직접 교신이 생겼다 끊겼다 합니다.',
  abHow: '사용법', abH1s: '조건 정하기', abH1t: '① 착륙 날짜와 운용 기간, 필요하면 최소 일조·교신과 최대 그늘.',
  abH2s: '후보 비교', abH2t: '② 한 가지 값으로 정렬하고 원하는 만큼 핀으로 고정 — 트레이와 아래 섹션이 같은 기간으로 비교합니다.',
  abH3s: '근거 보기', abH3t: '"이 후보 따져 보기 ↓"로 선택 근거를 엽니다: 지평선, 날짜 밀림, 주변 위치, 중계탑, 지상국, 검증.',
  abKeys: '자세한 조작법', abKeysT: '드래그 = 3D 달 이동 · 오른쪽 드래그 또는 Shift 드래그 = 회전·기울이기 · 휠/핀치 = 확대(먼저 지구본 클릭) · 스크러버: ←/→ = 1시간, Shift = 1일 · Esc = 팝업 닫기 · 도구 막대 ⌖ = 내 지점 찍기 · 미니맵 좌표 형식 "−89.45, −136.2" 또는 "89.45S 136.2W" · "링크 복사"로 지금 화면 공유.',
  abDefs: '숫자 읽는 법',
  df1: '일조율', df1t: '기간 중 태양 원반(반지름 0.2666°)의 절반 이상이 지형 지평선 위에 있는 시간 비율, 지면 2 m 높이 기준.',
  df2: '지구 직접 교신', df2t: '지구 중심이 지형 지평선 위에 있는 시간 비율(보수적). 기하만 — 전파 성능 아님.',
  df3: '해+지구 동시', df3t: '같은 시각에 햇빛도 있고 지구도 보임.', df4: '최장 그늘', df4t: '기간 안에서 햇빛 없이 이어진 가장 긴 시간.',
  df5: '여유각', df5t: '천체 고도 − 그 방향 지형 지평선 높이. 양수면 보임.',
  df6: '중계탑 경유', df6t: '착륙선이 탑을 보고(시선, 10 km 안 경사 15° 이하 자리에 최대 3기) 탑이 지구를 보는 시간.',
  df7: '여주 KDSA 수신 가능', df7t: '착륙지에서 지구가 보이고 여주 심우주 안테나에서 달이 10° 이상 떠 있는 시간.',
  df8: '분석 기간 vs 장기 평균', df8t: '기간 값(칩 "이 기간")은 고른 날짜의 값, 장기 값(칩 "장기 평균")은 2026–2030 또는 18.6년 평균. 섞지 않습니다.',
  df9: '예시 판정 기준값', df9t: '주의: 최장 그늘 > {dark}시간, 직접 교신 < {lo} %, 또는 비교 중 꼴찌. 강점: 직접 교신 ≥ {hi} % 또는 1위. 토론용으로 공개한 예시이며 임무 요구 조건이 아닙니다. 숨은 점수 없음.',
  abVal: '이 숫자 믿어도 되나', abValLead: '남위 85–90° 무작위 {n}점의 18.6년 평균 일조를 NASA PGDA 지도와 비교한 평균 절대 오차',
  abVc1: '일조', abVc2: '지구 가시', abVc3: 'PGDA ±300 m 범위 안에 든 이름 있는 착륙지', abVc3t: '카탈로그 {b}곳 중 {a}곳 (일조)',
  abEph: '독립 계산과 천체력 비교: {n}개 표본에서 최대 차 {d}°.',
  abHind: '실제 임무 되짚기', abNotNasa: '공개 자료와 비교한 결과이며 NASA의 승인이나 보증이 아닙니다.',
  abKorea: '한국과의 연결', abK1: '다누리의 ShadowCam', abK1t: '한국 다누리 궤도선에 실린 NASA 카메라가 영구음영 분화구 안을 찍습니다(NASA / KARI / ASU). 링크만 — 다누리는 착륙선을 중계하지 않습니다.',
  abK2: '여주 심우주 안테나', abK2t: 'KDSA(35 m): 선택 근거에서 착륙지가 지구를 보고 여주에서 달이 10° 이상인 시간을 셉니다. 좌표: KARI kdsa01.tf (NASA NAIF).',
  abK3: 'KASA 파트너', abK3t: '우주항공청(KASA)은 2026 Space Apps 파트너입니다.', abKMore: '지상국 블록 →',
  abMore: '만든 사람 · 데이터 출처 · AI 사용', abSrc: '데이터 출처와 표기 (Data & credits)', abSrcLead: '이 사이트의 모든 자료와 숫자는 아래 출처에서 왔습니다. 제공처 표기 원문이라 영어 그대로 둡니다 (전체 목록: 저장소 data/DATASETS.md).',
  sName: '자료', sOrg: '기관', sUse: '쓴 곳', sLic: '조건',
  abLim: '가정과 한계', abLimT: '관측 높이 2 m · 1시간 간격 · 대기·굴절 없음 · 교신 = 기하학적 가시성 · 탑 높이 5/15/30/50 m, 최대 3기 · 자료 기간 2026-01-01 ~ 2030-12-31 UTC · 사용자 지점은 더 거친 브라우저 지형(남위 75° 북쪽 약 948 m, 남극 근처는 PGDA 지형) · 경사 미계산.',
  abTeam: '팀과 SI(AI) 사용', abTeamLead: 'Team Ginkgo Orbit, NASA Space Apps Challenge 2026 (서울).',
  abSI: '해결 아이디어와 설계 결정은 모두 6명 팀원이 냈습니다. SI 도구(Claude Code · Claude Opus 5.5, OpenAI Codex)는 코드, 자료 처리, 문서, 검증을 도왔습니다. 모든 SI 작업은 docs/SI_USAGE.md에 기록합니다. AI가 만든 그림·영상은 쓰지 않았고, 나중에 넣으면 눈에 보이는 "AI-generated" 표시를 붙입니다.',
  abCTA: '내 착륙지를 직접 찾아보세요', abCTAb: '내 착륙지 찾아보기 →',
});

const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const E = k => esc(t(k));
/** the credits text uses *italics* only */
const md = x => esc(x).replace(/\*([^*]+)\*/g, '<i>$1</i>');

const TEAM = [['Dongju Kim', 'team lead · validation'], ['Sua Kim', 'integrator · Korea links · custom points'], ['Minchul Kim', 'ephemeris · site catalogue'],
  ['Jiyong Sung', 'terrain · horizons · local grids'], ['Soyun Jeong', 'whole-Moon maps'], ['Chaei Oh', 'visual design']];

async function render() {
  const root = document.getElementById('view-about');
  const H = await headline(), v = await validation(), h = await hindcast();
  const inRange = v?.named ? v.named.filter(n => n.ours_sun >= n.pgda_sun_min300 && n.ours_sun <= n.pgda_sun_max300).length : null;
  const ap = h?.apollo_sun_elevation || [], rb = h?.robotic_sunset || [];
  const foot = document.querySelector('.ls-foot'); if (foot && root.contains(foot)) root.after(foot);   // keep the page footer
  stopJourney();
  root.innerHTML = `
  <section class="ab-band" aria-labelledby="abH">
    <div class="ab-stage" role="img" aria-label="${E('abArt')}"><div id="heroJourney" role="presentation" aria-hidden="true"></div></div>
    <div class="ab-copy">
      <h1 id="abH" tabindex="-1"><span>${E('abBand1')}</span><br><span>${E('abBand2')}</span></h1>
      <p class="ab-lede">${E('abLede')}</p>
      <a class="ls-btn primary ab-cta" href="#" data-explore><span>${E('abCta')}</span> <span aria-hidden="true">→</span></a>
    </div>
  </section>
  <div class="ab-scroll at-top" id="abScroll">
  <section class="ab-sec" id="about-why"><h2>${E('abWhy')}</h2><div class="ab-cards">${[1, 2, 3].map(k => `<div class="ls-panel"><h3>${E('abW' + k)}</h3><p>${E('abW' + k + 't')}</p></div>`).join('')}</div></section>
  <section class="ab-sec" id="about-how"><h2>${E('abHow')}</h2><div><div class="ab-cards">${[1, 2, 3].map(k => `<div class="ls-panel"><h3><span class="circ">${k}</span> ${E('abH' + k + 's')}</h3><p>${E('abH' + k + 't')}</p></div>`).join('')}</div>
    <details><summary>${E('abKeys')}</summary><p class="muted">${E('abKeysT')}</p></details></div></section>
  <section class="ab-sec" id="about-defs"><h2>${E('abDefs')}</h2><dl class="defs">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<dt>${E('df' + k)}</dt><dd>${esc(fill(t('df' + k + 't'), { dark: RULE.darkH, lo: RULE.directLow * 100, hi: RULE.directHigh * 100 }))}</dd>`).join('')}</dl></section>
  <section class="ab-sec" id="about-validation"><h2>${E('abVal')}</h2><div>
    ${H ? `<p>${esc(fill(t('abValLead'), { n: v.n_points }))}</p><div class="ab-big" style="color:var(--sun)">${H.sun}<small style="font-size:.4em"> pp</small></div>
    <div class="ab-cards" style="margin-top:12px">
      <div class="ls-panel"><h3>${E('abVc1')}</h3><p class="num" style="font-size:18px;color:var(--sun)">MAE ${H.sun} pp · r ${H.sunR}</p></div>
      <div class="ls-panel"><h3>${E('abVc2')}</h3><p class="num" style="font-size:18px;color:var(--earth)">MAE ${H.earth} pp · r ${H.earthR}</p></div>
      <div class="ls-panel"><h3>${E('abVc3')}</h3><p class="num" style="font-size:18px">${esc(fill(t('abVc3t'), { a: inRange, b: v.named.length }))}</p></div></div>` : ''}
    ${h?.ephemeris_check ? `<p class="muted">${esc(fill(t('abEph'), { d: h.ephemeris_check.max_deg.toExponential(1), n: h.ephemeris_check.sample_hours }))}</p>` : ''}
    <h3 style="margin-top:20px">${E('abHind')}</h3>
    <table class="src-tbl"><thead><tr><th></th><th>UTC</th><th>ALSJ</th><th>Luna Sight</th><th>Δ</th></tr></thead><tbody>${ap.map(a => `<tr><td>${esc(a.mission)}</td><td class="num">${a.landing_utc.slice(0, 16).replace('T', ' ')}</td><td class="num">${a.reported_sun_el_deg.toFixed(2)}°</td><td class="num">${a.ours_sun_el_deg_catalogue_point.toFixed(2)}°</td><td class="num">${a.difference_deg_catalogue.toFixed(2)}°</td></tr>`).join('')}</tbody></table>
    <table class="src-tbl" style="margin-top:10px"><tbody>${rb.map(r => `<tr><td>${esc(r.mission)}</td><td>${r.difference_text ? esc(r.difference_text) : esc(t('hcNoSrc'))}${r.source_url ? ` · <a href="${esc(r.source_url)}" target="_blank" rel="noopener">source</a>` : ''}</td></tr>`).join('')}</tbody></table>
    <p class="muted">${E('hcProxy')} · <a href="${PGDA_URL}" target="_blank" rel="noopener">PGDA</a> · <a href="${PAPER_URL}" target="_blank" rel="noopener">Mazarico et al. 2011</a> · ${E('abNotNasa')}</p></div></section>
  <section class="ab-sec" id="about-korea"><h2>${E('abKorea')}</h2><div><div class="ab-cards">${[1, 2, 3].map(k => `<div class="ls-panel"><h3>${E('abK' + k)}</h3><p>${E('abK' + k + 't')}</p></div>`).join('')}</div>
    <p><a href="#" data-gs>${E('abKMore')}</a></p></div></section>
  <section class="ab-sec" id="about-more"><h2>${E('abMore')}</h2><div>
    <details id="about-sources" open><summary>${E('abSrc')}</summary><p class="muted">${E('abSrcLead')}</p>
      <div class="credits" lang="en">${CREDITS.map(([h, items]) => `<h4>${esc(h)}</h4><ul>${items.map(([id, txt]) => `<li><span class="muted num">${id}.</span> ${md(txt)}</li>`).join('')}</ul>`).join('')}</div></details>
    <details><summary>${E('abLim')}</summary><p class="muted">${E('abLimT')}</p></details>
    <details id="about-team"><summary>${E('abTeam')}</summary><p>${E('abTeamLead')}</p><ul>${TEAM.map(([n, r]) => `<li><b>${esc(n)}</b> — <span class="muted">${esc(r)}</span></li>`).join('')}</ul>
      <p>${E('abSI')}</p><p><a href="https://github.com/kiisophii/lunar-landing-site-navigator/blob/main/docs/SI_USAGE.md" target="_blank" rel="noopener">docs/SI_USAGE.md</a> · <a href="https://github.com/kiisophii/lunar-landing-site-navigator" target="_blank" rel="noopener">source (Apache-2.0)</a></p></details>
  </div></section>
  <section class="ab-sec"><h2>${E('abCTA')}</h2><div><a class="ls-btn primary" href="#" data-mine style="height:40px;border-radius:999px;padding:0 1.4em">${E('abCTAb')}</a></div></section>
  </div>
  <button type="button" class="ab-next" aria-label="${E('abNext')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M12 4V18M6.5 12.5L12 18L17.5 12.5"/></svg></button>`;
  wireScroll(root);
  if (document.body.classList.contains('on-about')) enter();
  root.querySelector('[data-explore]').addEventListener('click', e => { e.preventDefault(); leave(); });
  root.querySelector('[data-mine]').addEventListener('click', e => { e.preventDefault(); leave(); setTimeout(() => LLSN().openAdd?.('coord'), 100); });
  root.querySelector('[data-gs]').addEventListener('click', e => { e.preventDefault(); leave(); setTimeout(() => { document.querySelector('#ls-brief [data-open="gs"]')?.click(); }, 200); });
}
function leave() { history.pushState(null, '', location.pathname + location.search); window.dispatchEvent(new HashChangeEvent('hashchange')); }
// ------------------------------------------------------------ scroll area, page footer, arrow, band picture
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The page footer lives at the end of #abScroll while About is shown (shell.js puts it back on leaving). */
function dockFoot() {
  const foot = document.querySelector('.ls-foot'), sc = document.getElementById('abScroll');
  if (foot && sc && foot.parentNode !== sc) sc.appendChild(foot);
}
function wireScroll(root) {
  const sc = root.querySelector('#abScroll'), btn = root.querySelector('.ab-next');
  const atEnd = () => sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 4;
  const sync = () => {
    sc.classList.toggle('at-top', sc.scrollTop < 4);              // top fade only once the content has moved
    const end = atEnd();
    btn.classList.toggle('up', end);
    btn.setAttribute('aria-label', t(end ? 'abTop' : 'abNext'));
  };
  sc.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(sync).observe(sc);
  btn.addEventListener('click', () => {
    const behavior = reduced() ? 'auto' : 'smooth';
    if (atEnd()) { sc.scrollTo({ top: 0, behavior }); return; }
    const top = sc.getBoundingClientRect().top;
    const next = [...sc.querySelectorAll(':scope > section')].find(s => s.getBoundingClientRect().top - top > 40);
    sc.scrollTo({ top: next ? sc.scrollTop + next.getBoundingClientRect().top - top - 32 : sc.scrollHeight, behavior });
  });
  sync();
}
// The band picture runs only while About is shown: mounted on entering, destroyed on leaving or re-rendering.
let journey = null, jRaf = 0;
function stopJourney() { cancelAnimationFrame(jRaf); jRaf = 0; journey?.destroy(); journey = null; }
function startJourney() {
  stopJourney();
  const el = document.getElementById('heroJourney'), sc = document.getElementById('abScroll');
  if (!el || !sc || !window.LunaJourney) return;
  const j = window.LunaJourney.mount(el, { mode: 'manual', fit: 'band', showLabels: false, bandPadTop: 26, bandPadBot: 52, focusAt: innerWidth > 860 ? 0.62 : 0.7 });
  const T = j.timeline, stops = [T.fadeIn[1], T.coast[0], T.flip[0], T.touch, T.touch + 1400], endPad = 0.15;
  const timeAt = p => { const q = Math.max(0, Math.min(1, p / (1 - endPad))) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(q)); return stops[i] + (stops[i + 1] - stops[i]) * (q - i); };
  let cur = stops[0];
  const tick = () => {
    jRaf = requestAnimationFrame(tick);
    if (document.getElementById('view-about').hidden) return;
    const run = sc.scrollHeight - sc.clientHeight, p = run > 0 ? sc.scrollTop / run : 1, tt = reduced() ? stops[4] : timeAt(p);
    cur += (tt - cur) * (reduced() ? 1 : 0.12); if (Math.abs(tt - cur) < 1) cur = tt;
    j.seekTime(cur);
  };
  journey = j; tick();
}
/** Entering About (first render or #about again): footer in, scroll from the top (unless a section was asked for), picture on. */
function enter() {
  dockFoot();
  const sc = document.getElementById('abScroll'); if (!sc) return;
  const target = location.hash.length > 6 ? document.getElementById(location.hash.slice(1)) : null;
  if (target && sc.contains(target)) { target.closest('details')?.setAttribute('open', ''); target.scrollIntoView(); } else sc.scrollTop = 0;
  startJourney();
  window.dispatchEvent(new Event('resize'));                      // the band was display:none until now
  if (document.activeElement === document.body) document.getElementById('abH')?.focus({ preventScroll: true });   // first load: h1 came late
}
window.addEventListener('llsn:about', enter);
window.addEventListener('hashchange', () => { if (!/^#about/.test(location.hash)) stopJourney(); });

window.addEventListener('llsn:lang', () => { if (document.body.classList.contains('on-about')) render(); });
render();
