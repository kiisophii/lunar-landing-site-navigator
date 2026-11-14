// about.js — About page (#about hash route) + validation badge in the right panel (integrator, layout v11).
// Every validation number shown here is read from web/data/validation.json at run time (never typed in).
// The page lives in index.html (<main id="about">); app.js toggles it on 'hashchange'. Language: 'llsn:lang'.
import { t, getLang } from './i18n.js';
import { addStrings } from './ui_shared.js';

const REPO = 'https://github.com/kiisophii/lunar-landing-site-navigator';
const BLOB = REPO + '/blob/main/';

addStrings({
  abTitle: 'About the Lunar Landing Site Navigator',
  abWhatH: 'What it does',
  abWhat: 'The Navigator compares lunar landing sites and landing dates by asking two questions at every hour from 2026 to 2030: can a lander at this spot see the Sun (solar power, heat) and can it see the Earth (a direct radio link)? It combines NASA LOLA terrain around each site with NAIF ephemerides, so mountains and crater rims that hide the Sun or the Earth are included. You get the values at a chosen moment (Sun elevation, time until sunset and Earthset) and over an analysis period (share of hours with sunlight, with Earth in view, with both, and the longest dark stretch). It is a comparison and re-planning tool, not a "best site" picker.',
  abHowH: 'How to use',
  abHow1: 'Pick a site in the left list (search by name or filter by group). The right panel and the 3D Moon follow the focused site.',
  abHow2: 'Pin sites with ☆ to keep them at the top of the list in the order you pinned them, and to compare them side by side in the “Compare pinned” tab. Unpinned sites are sorted by the share of hours with Sun AND Earth (ⓘ next to the list title).',
  abHow3: 'Set the date, time (UTC) and the analysis period (7, 30, 90 days or a custom number). Drag the scrubber to move the selected time inside the period; dragging pauses playback and the time stays where you release it. Keyboard: ←/→ = 1 hour, Shift+←/→ = 1 day, Home/End = start/end. Play continues from the current time; Speed only changes how fast the animation runs.',
  abHow4: 'Instant values (top of the right panel) change with the selected time. Period values (below) use every hour of the period and never change with the scrubber or the speed.',
  abHow5: '3D Moon: drag = move · right-drag or Shift-drag = rotate & tilt · wheel / pinch = zoom (click the globe first) · click a site marker to focus it. Lighting and shadows use the selected time. Sun/Earth icons are enlarged; terrain relief is exaggerated ×3 for display only.',
  abHow6: 'Tabs below the viewer: the 360° horizon chart (why the Sun or Earth is hidden), a landing-date scan (which start day gives the best period), the relay tower (where a tower would restore the Earth link), Korea links (when the KDSA antenna in Yeoju can talk to the site) and “Why?” (the communication story).',
  abHow7: 'Filters (left, “Filter by thresholds”) hide sites below a sunlight / Earth / both share or above a longest-dark limit for the current period. “Add your own point” computes a horizon in your browser from LOLA LDEM_64/LDEM_16 for any latitude/longitude.',
  abDefH: 'Definitions',
  abDef1: 'Sunlit = at least 50 % of the solar disk (radius 0.2666°) is above the local horizon.',
  abDef2: 'Earth visible = the centre of the Earth is above the horizon mask (a conservative rule).',
  abDef3: 'Both = sunlit AND Earth visible in the same hour. Longest darkness = longest continuous run of not-sunlit hours inside the period.',
  abDef4: 'Observer 2 m above the terrain. Horizon mask = highest terrain elevation angle in each of 720 azimuth directions, marched outward with lunar curvature.',
  abDef5: 'No atmosphere, so no refraction. Libration is included through the ephemeris (MOON_ME frame, DE421 orientation). Azimuth 0° = north, clockwise. All times are UTC; period values are hourly samples.',
  abDef6: 'Ground stations (Korea links) need the Moon at least 10° above their own horizon.',
  abDataH: 'Data sources',
  abDataMore: 'Full table with sizes, licences and citations: data/DATASETS.md',
  abValH: 'Validation',
  abValIntro: 'Numbers below are read from web/data/validation.json (written by pipeline/validate_ours.py).',
  abValRand: 'South pole, {n} random points (85–90°S, seed {seed}), {win}, every {step} h, against NASA PGDA average-visibility maps (Mazarico et al. 2011):',
  abValSun: 'Sun (mean visible fraction of the solar disk): mean absolute error {mae} %p, RMSE {rmse} %p, r = {r}.',
  abValEarth: 'Earth (any part of the disk visible, PGDA’s rule): mean absolute error {mae} %p, RMSE {rmse} %p, r = {r}. With the app’s stricter Earth-centre rule: {mae2} %p.',
  abValNamed: 'At the {n} named south-polar sites (peaks and rims, where PGDA itself varies strongly within a few hundred metres): mean absolute error Sun {sun} %p, Earth {earth} %p.',
  abValGeo: 'Geometry: Sun and Earth directions from our browser code agree with JPL Horizons observer tables to better than 0.0001° at six real sites (docs/real_sites_horizons_check.json, docs/real_sites_web_check.json).',
  abValLimit: 'Limits: the terrain validation covers only the south pole; sites outside it use SLDEM2015/LOLA terrain that has not been compared with an independent illumination product.',
  abValDocs: 'Method and details: docs/validation.md',
  abValLoading: 'Loading validation results…', abValFail: 'Validation file could not be loaded.',
  abKrH: 'Korea context',
  abKr1: 'KASA (Korea AeroSpace Administration) is a 2026 Space Apps partner. The “Korea links” tab computes when the Korea Deep Space Antenna (KDSA, Yeoju) has the Moon at least 10° above its horizon AND the focused site sees the Earth, compared with NASA’s Deep Space Network.',
  abKr2: 'Danuri (KPLO), Korea’s lunar orbiter, carries NASA’s ShadowCam camera, which images permanently shadowed regions near the poles. Danuri has no surface-relay payload, so the Navigator does not model a Danuri relay.',
  abTeamH: 'Team',
  abTeam: 'Team Ginkgo Orbit — six members, NASA Space Apps Challenge 2026, Seoul. The ideas and design decisions come from the team members.',
  abLicH: 'License',
  abLic: 'Source code: Apache License 2.0. Third-party data keep their own terms (see Data sources).',
  abSiH: 'Use of AI (SI) disclosure',
  abSi: 'The team used AI assistants (Anthropic Claude Code, OpenAI Codex) to implement code, process data, write documentation and cross-check results; the problem framing, ideas and design decisions are the team’s. Every AI-assisted task is logged in docs/SI_USAGE.md.',
  abBack: '← Back to the viewer',
}, {
  abTitle: '달 착륙지 내비게이터 소개',
  abWhatH: '무엇을 하나',
  abWhat: '내비게이터는 2026–2030년의 매 시간마다 두 가지를 묻는 방식으로 달 착륙지와 착륙 날짜를 비교한다: 이 자리의 착륙선이 해(태양광 전력, 열)를 볼 수 있나, 그리고 지구(직접 무선 통신)를 볼 수 있나? 착륙지 주변의 NASA LOLA 지형과 NAIF 천체력을 함께 써서, 해나 지구를 가리는 산과 크레이터 능선까지 반영한다. 선택한 순간의 값(태양 고도, 해 지기까지, 지구 지기까지)과 분석 기간의 값(햇빛, 지구 보임, 둘 다인 시간의 비율, 가장 긴 어둠)을 보여 준다. "최고의 착륙지"를 골라 주는 도구가 아니라 비교하고 다시 계획하는 도구다.',
  abHowH: '사용법',
  abHow1: '왼쪽 목록에서 착륙지를 고른다(이름 검색, 분류 선택). 오른쪽 패널과 3D 달이 선택한 착륙지를 따라간다.',
  abHow2: '☆로 착륙지를 고정하면 고정한 순서대로 목록 맨 위에 남고, “고정한 곳 비교” 탭에서 나란히 비교할 수 있다. 고정하지 않은 곳은 해와 지구가 함께 보이는 시간 비율 순으로 정렬된다(목록 제목 옆 ⓘ).',
  abHow3: '날짜, 시각(UTC), 분석 기간(7·30·90일 또는 직접 입력)을 정한다. 스크러버를 끌면 기간 안에서 선택 시각이 움직인다. 끌기 시작하면 재생이 멈추고, 놓은 자리에 그대로 멈춰 있다. 키보드: ←/→ = 1시간, Shift+←/→ = 1일, Home/End = 처음/끝. 재생은 지금 시각부터 이어지고, 속도는 애니메이션 빠르기만 바꾼다.',
  abHow4: '오른쪽 위의 순간 값은 선택 시각에 따라 바뀐다. 아래의 기간 값은 기간의 모든 시간을 쓰므로 스크러버나 속도에 따라 바뀌지 않는다.',
  abHow5: '3D 달: 드래그 = 이동 · 오른쪽 드래그 또는 Shift 드래그 = 회전·기울이기 · 휠/핀치 = 확대(먼저 지구본 클릭) · 착륙지 표시를 누르면 선택. 빛과 그림자는 선택 시각 기준이다. 해·지구 아이콘은 크게 그렸고, 지형 높낮이는 화면에서만 3배로 과장했다.',
  abHow6: '뷰어 아래 탭: 360° 지평선 그래프(해나 지구가 왜 가려지나), 착륙일 비교(어느 시작일이 기간 결과가 좋은가), 중계 타워(어디에 타워를 세우면 지구 통신이 살아나나), 한국 연결(여주 KDSA가 언제 그 착륙지와 통신할 수 있나), “왜 그럴까?”(통신 이야기).',
  abHow7: '거르기(왼쪽 “기준값으로 거르기”)는 지금 기간의 햇빛·지구·둘 다 비율이 기준보다 낮거나 가장 긴 어둠이 기준보다 긴 곳을 숨긴다. “직접 좌표 넣기”는 아무 위도·경도에 대해 브라우저에서 LOLA LDEM_64/LDEM_16으로 지평선을 계산한다.',
  abDefH: '정의',
  abDef1: '햇빛 받음 = 태양 원반(반지름 0.2666°)의 50 % 이상이 지평선 위.',
  abDef2: '지구 보임 = 지구 중심이 지평선 마스크 위(보수적 기준).',
  abDef3: '둘 다 = 같은 시간에 햇빛 받음 그리고 지구 보임. 가장 긴 어둠 = 기간 안에서 햇빛 없이 이어진 가장 긴 시간.',
  abDef4: '관측자는 지면 위 2 m. 지평선 마스크 = 720개 방위마다 가장 높은 지형의 고도각(달 곡률 포함, 바깥으로 훑어 계산).',
  abDef5: '대기가 없으므로 굴절 없음. 칭동은 천체력으로 포함(MOON_ME 좌표계, DE421 자세). 방위 0° = 북쪽, 시계 방향. 모든 시각은 UTC, 기간 값은 1시간 간격 표본.',
  abDef6: '지상국(한국 연결)은 달이 자기 지평선 위 10° 이상일 때만 통신한다고 본다.',
  abDataH: '데이터 출처',
  abDataMore: '크기·라이선스·인용까지 담은 전체 표: data/DATASETS.md',
  abValH: '검증',
  abValIntro: '아래 숫자는 web/data/validation.json(pipeline/validate_ours.py가 만든 파일)에서 읽는다.',
  abValRand: '남극 무작위 {n}개 지점(남위 85–90°, seed {seed}), {win}, {step}시간 간격, NASA PGDA 평균 가시율 지도(Mazarico 외 2011)와 비교:',
  abValSun: '해(태양 원반이 보이는 평균 비율): 평균 절대 오차 {mae} %p, RMSE {rmse} %p, r = {r}.',
  abValEarth: '지구(원반 일부라도 보임, PGDA 기준): 평균 절대 오차 {mae} %p, RMSE {rmse} %p, r = {r}. 앱의 더 엄격한 지구 중심 기준으로는 {mae2} %p.',
  abValNamed: '이름 있는 남극 착륙지 {n}곳(봉우리·능선이라 PGDA 값 자체가 수백 m 안에서 크게 바뀜): 평균 절대 오차 해 {sun} %p, 지구 {earth} %p.',
  abValGeo: '기하: 브라우저 코드의 해·지구 방향은 실제 착륙지 6곳에서 JPL Horizons 관측표와 0.0001°보다 작게 차이 난다(docs/real_sites_horizons_check.json, docs/real_sites_web_check.json).',
  abValLimit: '한계: 지형 검증은 남극만 했다. 남극 밖 착륙지는 SLDEM2015/LOLA 지형을 쓰며, 독립적인 일조 자료와는 아직 비교하지 않았다.',
  abValDocs: '방법과 자세한 내용: docs/validation.md',
  abValLoading: '검증 결과 불러오는 중…', abValFail: '검증 파일을 불러오지 못했다.',
  abKrH: '한국과의 연결',
  abKr1: 'KASA(우주항공청)는 2026 Space Apps 파트너 기관이다. “한국 연결” 탭은 여주의 심우주 안테나(KDSA)에서 달이 지평선 위 10° 이상이고, 동시에 선택한 착륙지에서 지구가 보이는 시간을 계산해 NASA 심우주 통신망(DSN)과 비교한다.',
  abKr2: '한국의 달 궤도선 다누리(KPLO)에는 극지방의 영구 그늘 지역을 찍는 NASA ShadowCam이 실려 있다. 다누리에는 지표 중계 장비가 없어서 내비게이터는 다누리 중계를 모델로 넣지 않는다.',
  abTeamH: '팀',
  abTeam: 'Team Ginkgo Orbit — 6명, NASA Space Apps Challenge 2026 서울. 아이디어와 설계 결정은 팀원들이 했다.',
  abLicH: '라이선스',
  abLic: '소스 코드: Apache License 2.0. 외부 데이터는 각자의 이용 조건을 따른다(데이터 출처 참고).',
  abSiH: 'AI(SI) 사용 공개',
  abSi: '팀은 AI 도구(Anthropic Claude Code, OpenAI Codex)를 코드 구현, 데이터 처리, 문서 작성, 결과 교차 확인에 썼다. 문제 정의, 아이디어, 설계 결정은 팀이 했다. AI를 쓴 작업은 모두 docs/SI_USAGE.md에 기록했다.',
  abBack: '← 뷰어로 돌아가기',
});

// data sources (names are proper nouns; the "used for" line is translated)
const SOURCES = [
  { name: 'NAIF SPICE kernels: DE440s, DE421 lunar orientation (MOON_ME), lunar FK, PCK 00008, LSK naif0012', url: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/', en: 'Sun and Earth positions seen from the Moon, libration', ko: '달에서 본 해·지구 위치, 칭동' },
  { name: 'JPL Horizons API', url: 'https://ssd.jpl.nasa.gov/api/horizons.api', en: 'independent check of Sun/Earth directions', ko: '해·지구 방향 독립 검증' },
  { name: 'NASA PGDA LOLA south-polar DEMs 5–240 m (Barker et al. 2021, 2023)', url: 'https://pgda.gsfc.nasa.gov/products/90', en: 'near-site terrain for south-polar sites', ko: '남극 착륙지 주변 지형' },
  { name: 'SLDEM2015 (LOLA + SELENE TC, 59 m; Barker et al. 2016)', url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/', en: 'near-site terrain for sites between 60°S and 60°N', ko: '남·북위 60° 안 착륙지 주변 지형' },
  { name: 'LOLA GDR LDEM_64 / LDEM_16 (Smith et al. 2010)', url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/float_img/', en: 'far-field terrain (to 300 km), 3D Moon, your own points', ko: '먼 지형(300 km까지), 3D 달, 직접 좌표' },
  { name: 'NASA PGDA average illumination & Earth visibility maps (Mazarico et al. 2011)', url: 'https://pgda.gsfc.nasa.gov/products/69', en: 'validation truth', ko: '검증 기준값' },
  { name: 'NASA SVS CGI Moon Kit', url: 'https://svs.gsfc.nasa.gov/4720', en: '3D Moon colour', ko: '3D 달 색' },
  { name: 'NSSDCA lunar landing sites', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html', en: 'Apollo and Luna coordinates', ko: '아폴로·루나 좌표' },
  { name: 'LROC (NASA/GSFC/ASU) lander posts', url: 'https://lroc.im-ldi.com/', en: "Chang'e, Chandrayaan-3, SLIM, IM-1/2, Blue Ghost coordinates", ko: '창어, 찬드라얀 3, SLIM, IM-1/2, 블루 고스트 좌표' },
  { name: 'NASA Artemis III landing regions (2024) + Wueller et al. 2026', url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/', en: 'Artemis III region names and representative points', ko: '아르테미스 III 후보 지역과 대표 지점' },
  { name: 'NASA Lunar Surface Data Book (ACD-50044 Rev A)', url: 'https://ntrs.nasa.gov/citations/20230007818', en: 'south-polar peaks and rims', ko: '남극 봉우리·능선 좌표' },
  { name: 'NASA DSN 810-005 module 301 & NAIF kdsa01.tf', url: 'https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301P.pdf', en: 'ground-station coordinates (DSN, KDSA)', ko: '지상국 좌표(DSN, KDSA)' },
  { name: 'NASA Glenn BEACON lunar relay concept (NTRS 20240014584)', url: 'https://ntrs.nasa.gov/citations/20240014584', en: 'relay-tower assumptions', ko: '중계 타워 가정' },
];

let val = null, valErr = false;
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = x => (Number.isFinite(x) ? x.toFixed(1) : '—');
const f2 = x => (Number.isFinite(x) ? x.toFixed(2) : '—');
const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : '—');
const fileLink = path => `<a href="${BLOB}${path}">${esc(path)}</a>`;
const linkify = s => esc(s).replace(/((?:docs|data|web\/data|pipeline)\/[\w./-]+\.(?:md|json|py))/g, m => fileLink(m));

/** Mean absolute error (percentage points) of the named south-polar sites, from validation.json "named". */
function namedMAE(v) {
  const rows = Array.isArray(v.named) ? v.named : [];
  const mae = (a, b) => {
    const r = rows.filter(x => Number.isFinite(x[a]) && Number.isFinite(x[b]));
    return r.length ? r.reduce((s, x) => s + Math.abs(x[a] - x[b]), 0) / r.length * 100 : NaN;
  };
  return { n: rows.length, sun: mae('ours_sun', 'pgda_sun'), earth: mae('ours_earth', 'pgda_earth') };
}
const winText = v => String(v.window || '').replace('..', ' → ');

function renderAbout() {
  const root = document.getElementById('about'); if (!root) return;
  const li = keys => `<ul>${keys.map(k => `<li>${linkify(t(k))}</li>`).join('')}</ul>`;
  const lang = getLang();
  let valHTML;
  if (val) {
    const nm = namedMAE(val), ec = val.alt_definitions?.earth_centre;
    valHTML = `<p class="muted">${linkify(t('abValIntro'))}</p>
      <p>${esc(fill(t('abValRand'), { n: val.n_points, seed: val.seed, win: winText(val), step: val.step_h }))}</p>
      <ul>
        <li>${esc(fill(t('abValSun'), { mae: f2(val.sun.mae_pp), rmse: f2(val.sun.rmse_pp), r: f3(val.sun.r) }))}</li>
        <li>${esc(fill(t('abValEarth'), { mae: f2(val.earth.mae_pp), rmse: f2(val.earth.rmse_pp), r: f3(val.earth.r), mae2: f2(ec?.mae_pp) }))}</li>
        ${nm.n ? `<li>${esc(fill(t('abValNamed'), { n: nm.n, sun: f1(nm.sun), earth: f1(nm.earth) }))}</li>` : ''}
        <li>${linkify(t('abValGeo'))}</li>
      </ul>
      <p class="muted">${esc(t('abValLimit'))}</p>
      <p>${linkify(t('abValDocs'))}</p>`;
  } else valHTML = `<p class="muted">${t(valErr ? 'abValFail' : 'abValLoading')}</p>`;
  root.innerHTML = `<div class="about-in">
    <p><a href="#" class="about-back">${esc(t('abBack'))}</a></p>
    <h2>${esc(t('abTitle'))}</h2>
    <section><h3>${esc(t('abWhatH'))}</h3><p>${esc(t('abWhat'))}</p></section>
    <section><h3>${esc(t('abHowH'))}</h3>${li(['abHow1', 'abHow2', 'abHow3', 'abHow4', 'abHow5', 'abHow6', 'abHow7'])}</section>
    <section><h3>${esc(t('abDefH'))}</h3>${li(['abDef1', 'abDef2', 'abDef3', 'abDef4', 'abDef5', 'abDef6'])}</section>
    <section id="about-validation"><h3>${esc(t('abValH'))}</h3>${valHTML}</section>
    <section><h3>${esc(t('abDataH'))}</h3>
      <ul class="about-src">${SOURCES.map(s => `<li><a href="${s.url}">${esc(s.name)}</a> — ${esc(lang === 'ko' ? s.ko : s.en)}</li>`).join('')}</ul>
      <p>${linkify(t('abDataMore'))}</p></section>
    <section><h3>${esc(t('abKrH'))}</h3><p>${esc(t('abKr1'))}</p><p>${esc(t('abKr2'))}</p></section>
    <section><h3>${esc(t('abTeamH'))}</h3><p>${esc(t('abTeam'))}</p></section>
    <section><h3>${esc(t('abLicH'))}</h3><p>${esc(t('abLic'))} <a href="${REPO}/blob/main/LICENSE">LICENSE</a> · <a href="${REPO}">GitHub</a></p></section>
    <section><h3>${esc(t('abSiH'))}</h3><p>${linkify(t('abSi'))}</p></section>
  </div>`;
}

// ------------------------------------------------------------ validation badge (right panel)
function renderBadge() {
  const b = document.getElementById('val-badge'), pop = document.getElementById('val-pop');
  if (!b || !pop) return;
  if (!val) { b.hidden = true; return; }
  b.hidden = false;
  b.innerHTML = `<span aria-hidden="true">✓</span> ${esc(t('valBadge'))} <span class="num">${t('valSun')} ${f1(val.sun.mae_pp)} · ${t('valEarth')} ${f1(val.earth.mae_pp)} ${t('valPp')}</span>`;
  pop.innerHTML = `<h4 id="val-pop-h">${esc(t('valPopTitle'))}</h4>
    <p>${esc(fill(t('valPop'), { n: val.n_points, win: winText(val), step: val.step_h, sun: f2(val.sun.mae_pp), rsun: f3(val.sun.r),
      earth: f2(val.earth.mae_pp), rearth: f3(val.earth.r), earthc: f2(val.alt_definitions?.earth_centre?.mae_pp) }))}</p>
    <p><a href="#about" class="val-more">${esc(t('valMore'))}</a></p>
    <button type="button" class="val-close">${esc(t('valClose'))}</button>`;
}
function setPop(open) {
  const b = document.getElementById('val-badge'), pop = document.getElementById('val-pop');
  b.setAttribute('aria-expanded', String(open)); pop.hidden = !open;
  if (open) pop.querySelector('.val-close')?.focus();
}

export function initAbout() {
  renderAbout();
  const b = document.getElementById('val-badge'), pop = document.getElementById('val-pop');
  b?.addEventListener('click', () => setPop(pop.hidden));
  pop?.addEventListener('click', e => {
    if (e.target.closest('.val-close')) { setPop(false); b.focus(); }
    else if (e.target.closest('.val-more')) setPop(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop && !pop.hidden) { setPop(false); b.focus(); } });
  document.addEventListener('click', e => { if (pop && !pop.hidden && !e.target.closest('.val-wrap')) setPop(false); });
  window.addEventListener('llsn:lang', () => { renderAbout(); renderBadge(); });
  fetch('data/validation.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(v => { if (v.mock) throw new Error('mock validation'); val = v; renderBadge(); renderAbout(); window.LLSN && (window.LLSN.validation = v); })
    .catch(e => { valErr = true; console.warn('validation.json:', e.message); renderAbout(); });
}
