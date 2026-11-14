// i18n.js — English default, Korean toggle. Add keys here; elements use data-i18n="key".
export const STR = {
  en: {
    title: 'Lunar Landing Site Navigator',
    tagline: 'Compare landing sites and dates: can a lander see the Sun (power) and the Earth (direct-to-Earth link)?',
    mock: 'MOCK DATA — placeholder files for building the interface. Do not quote these numbers.',
    play: 'Play', pause: 'Pause', speed: 'Speed', time: 'Time (UTC)',
    sunEl: 'Sun elevation', earthEl: 'Earth elevation',
    untilSunset: 'Until sunset', untilSunrise: 'Until sunrise',
    untilEarthset: 'Until Earthset', untilEarthrise: 'Until Earthrise',
    sunlit: 'Sunlit', dark: 'In shadow', earthUp: 'Earth visible', earthDown: 'Earth hidden',
    notInWindow: 'no change before 2030-12-31 (end of data)', az: 'az', sunFrac: 'Sunlight', earthFrac: 'Earth visible', bothFrac: 'Both',
    longestDark: 'Longest shadow', windowStats: 'Over the data window',
    assumptions: 'Assumptions: observer 2 m above terrain · no atmosphere (no refraction) · sunlit = ≥ 50% of the solar disk above the local horizon · Earth visible = Earth centre above the horizon · azimuth 0° = north, clockwise · times in UTC.',
    loading: 'Loading data…', error: 'Could not load data',
    lang: '한국어', h: 'h', d: 'd',
    // integrator (index.html / app.js)
    pkTitle: 'Landing sites', pkSearch: 'Search sites', pkSearchPh: 'Search by name, mission or ID…',
    pkGroup: 'Group', pkAll: 'All groups', pkShown: 'shown', pkOf: 'of',
    pkHint: 'Click a site to put it in the comparison (up to 3) and show its horizon below. Sites hidden by the filters at the bottom are not listed.',
    pkNone: 'No site matches the search, group and filters.',
    g_apollo: 'Apollo', g_luna: 'Luna', g_change: "Chang'e", g_chandrayaan: 'Chandrayaan', g_slim: 'SLIM', g_clps: 'CLPS (commercial)',
    g_artemis3_region: 'Artemis III regions', g_polar_peak: 'South-polar peaks & rims', g_future: 'Future missions', g_custom: 'Your sites',
    cmpRemove: 'Remove from comparison', cmpEmpty: 'Pin sites with ☆ in the list to compare them side by side here.', cmpFocus: 'Focused site',
    instTitle: 'At the selected time', perTitle: 'Over the analysis period',
    perSun: 'Sunlight', perEarth: 'Earth link', perBoth: 'Both', perDark: 'Longest dark', dOf: 'of', days: 'days',
    terrainPending: 'Terrain pending', terrainPendingTip: 'No LOLA horizon computed yet: a flat 0° horizon is used, so terrain shadows are not included.',
    mockTerrain: 'MOCK terrain', filteredOut: 'Outside filters',
    browserTerrain: 'Browser terrain ~948 m', browserTerrainTip: 'Horizon computed in your browser from LOLA LDEM_64 (~948 m) and LDEM_16 — coarser than the catalogue sites.',
    awTitle: 'Analysis window', tbAria: 'Time and analysis period',
    tbStart: 'Period start (UTC date)', tbTod: 'Time of day (UTC)', tbPeriod: 'Period', tbDays: 'Period length in days',
    wm7: '7 days', wm30: '30 days', wm90: '90 days', wmDays: 'days',
    sp1: '1 h / frame', sp3: '3 h / frame', sp6: '6 h / frame', sp24: '1 day / frame',
    selTime: 'Selected time:', periodIs: 'Period',
    tbHint: 'The slider and Play move the selected time inside the period (Play loops). Speed only changes how fast the animation runs; the period results always use every hour of the period, so they never change with speed.',
    clipped: 'clipped to the end of the data (2030-12-31)',
    // 3-column viewer (integrator, layout v11)
    navViewer: 'Viewer', navAbout: 'About', langLabel: 'Language', aboutLinkTitle: 'About this tool',
    pinned: 'Pinned', allSites: 'All sites', pin: 'Pin', unpin: 'Unpin', pinHint: 'Pin to keep at the top and compare',
    rkLabel: 'Sorted by Sun + Earth', rkInfoBtn: 'How the list is sorted',
    rkInfo: 'Unpinned sites are sorted by the share of hours in the analysis period when the Sun is up (≥ 50 % of the disk) AND the Earth is visible at the same time — the hours a lander has both power and a direct link. Highest first. Pinned sites stay on top in the order you pinned them. This is a comparison aid, not a "best site" verdict.',
    rkVal: 'Sun + Earth', pkNoneCustom: 'Nothing found. You can add your own coordinates under "Add your own point".',
    cuFold: 'Add your own point (lat/lon)', flFold: 'Filter by thresholds',
    anFocus: 'Focused site', anPinned: 'Pinned', anUnpinned: 'Not pinned',
    sunVis: 'Sun visible', earthVis: 'Earth visible',
    valBadge: 'Validated vs NASA PGDA · mean error', valPp: '%p', valSun: 'Sun', valEarth: 'Earth', valMore: 'Method, limits and sources → About',
    valPopTitle: 'How we validated',
    valPop: 'We recomputed {n} random points between 85°S and 90°S with our own engine (NASA LOLA terrain, observer 2 m, NAIF ephemeris, {win}, every {step} h) and compared them with NASA PGDA average-visibility maps (Mazarico et al. 2011). Mean absolute error: Sun {sun} %p (r = {rsun}); Earth {earth} %p (r = {rearth}, PGDA rule: any part of the Earth disk). With the app’s stricter rule (Earth centre above the horizon) the Earth error is {earthc} %p. The check covers the south pole only.',
    valClose: 'Close',
    tabsAria: 'Details for the focused site', tabHorizon: 'Horizon chart', tabDates: 'Landing-date scan', tabRelay: 'Relay tower', tabKorea: 'Korea links', tabStory: 'Why?', tabCompare: 'Compare pinned',
    scrubAria: 'Selected time inside the analysis period', scrubKeys: '←/→ 1 h · Shift 1 day · Home/End',
    playFrom: 'Play from the current time',
    tbDate: 'Date (UTC)', tbTime: 'Time (UTC)', tbCustom: 'custom',
    rlNotAvail: 'Relay analysis not available for this site yet. The relay tower is computed only from real high-resolution terrain; so far that has been done for the south-polar sites.',
    saNotAvail: 'Not available yet', saNotAvailTip: 'Relay analysis has been run only for the south-polar sites so far.',
    terrainNote: 'Terrain: horizon masks from LOLA/SLDEM2015 DEMs (lunar curvature included) are being computed; sites marked "Terrain pending" use a flat 0° horizon until then. Ephemeris: NAIF DE440s + DE421 lunar orientation (MOON_ME), libration included.',
  },
  ko: {
    title: '달 착륙지 내비게이터',
    tagline: '착륙지와 날짜를 비교한다: 착륙선이 해(전력)와 지구(직접 통신)를 볼 수 있나?',
    mock: '가짜 데이터 — 화면을 만들기 위한 임시 파일이다. 이 숫자를 인용하지 말 것.',
    play: '재생', pause: '정지', speed: '속도', time: '시각 (UTC)',
    sunEl: '태양 고도', earthEl: '지구 고도',
    untilSunset: '해 지기까지', untilSunrise: '해 뜨기까지',
    untilEarthset: '지구 지기까지', untilEarthrise: '지구 뜨기까지',
    sunlit: '햇빛 받음', dark: '그늘', earthUp: '지구 보임', earthDown: '지구 안 보임',
    notInWindow: '2030-12-31(데이터 끝)까지 변화 없음', az: '방위', sunFrac: '햇빛', earthFrac: '지구 보임', bothFrac: '둘 다',
    longestDark: '가장 긴 그늘', windowStats: '데이터 기간 전체',
    assumptions: '가정: 관측자는 지면 위 2 m · 대기 없음(굴절 없음) · 햇빛 받음 = 태양 원반 50% 이상이 지평선 위 · 지구 보임 = 지구 중심이 지평선 위 · 방위 0° = 북쪽, 시계 방향 · 시각은 UTC.',
    loading: '데이터 불러오는 중…', error: '데이터를 불러오지 못함',
    lang: 'English', h: '시간', d: '일',
    pkTitle: '착륙지', pkSearch: '착륙지 검색', pkSearchPh: '이름, 임무, ID로 검색…',
    pkGroup: '분류', pkAll: '전체', pkShown: '곳 표시', pkOf: '/',
    pkHint: '착륙지를 누르면 비교 카드(최대 3개)에 들어가고 아래에 지평선이 나온다. 맨 아래 거르기에 걸린 곳은 목록에서 빠진다.',
    pkNone: '검색·분류·거르기에 맞는 착륙지가 없다.',
    g_apollo: '아폴로', g_luna: '루나', g_change: '창어', g_chandrayaan: '찬드라얀', g_slim: 'SLIM', g_clps: 'CLPS (민간)',
    g_artemis3_region: '아르테미스 III 후보 지역', g_polar_peak: '남극 봉우리·능선', g_future: '앞으로의 임무', g_custom: '내 착륙지',
    browserTerrain: '브라우저 지형 ~948 m', browserTerrainTip: '브라우저에서 LOLA LDEM_64(~948 m)와 LDEM_16으로 계산한 지평선 — 목록 착륙지보다 거칠다.',
    cmpRemove: '비교에서 빼기', cmpEmpty: '목록에서 ☆로 착륙지를 고정하면 여기서 나란히 비교한다.', cmpFocus: '선택한 착륙지',
    instTitle: '선택한 시각', perTitle: '분석 기간 전체',
    perSun: '햇빛', perEarth: '지구 통신', perBoth: '둘 다', perDark: '가장 긴 어둠', dOf: '/', days: '일',
    terrainPending: '지형 계산 중', terrainPendingTip: 'LOLA 지평선이 아직 없어 평평한 0° 지평선을 쓴다. 지형 그림자는 빠져 있다.',
    mockTerrain: '가짜 지형', filteredOut: '거르기 밖',
    awTitle: '분석 기간', tbAria: '시각과 분석 기간',
    tbStart: '기간 시작 (UTC 날짜)', tbTod: '시각 (UTC)', tbPeriod: '기간', tbDays: '기간 길이(일)',
    wm7: '7일', wm30: '30일', wm90: '90일', wmDays: '일',
    sp1: '1프레임 1시간', sp3: '1프레임 3시간', sp6: '1프레임 6시간', sp24: '1프레임 1일',
    selTime: '선택한 시각:', periodIs: '기간',
    tbHint: '슬라이더와 재생은 기간 안에서 선택한 시각만 움직인다(재생은 반복). 속도는 애니메이션 빠르기만 바꾼다. 기간 결과는 기간의 모든 시간을 쓰므로 속도에 따라 바뀌지 않는다.',
    clipped: '데이터 끝(2030-12-31)에서 잘림',
    navViewer: '뷰어', navAbout: '소개', langLabel: '언어', aboutLinkTitle: '이 도구 소개',
    pinned: '고정됨', allSites: '전체 착륙지', pin: '고정', unpin: '고정 해제', pinHint: '고정하면 맨 위에 남고 비교에 들어간다',
    rkLabel: '해 + 지구 순 정렬', rkInfoBtn: '목록 정렬 기준',
    rkInfo: '고정하지 않은 착륙지는 분석 기간 중 해가 보이고(원반 50 % 이상) 동시에 지구도 보이는 시간의 비율이 높은 순으로 놓인다 — 착륙선이 전력과 직접 통신을 함께 가진 시간이다. 고정한 착륙지는 고정한 순서대로 맨 위에 남는다. "최고의 착륙지" 판정이 아니라 비교를 돕는 정렬이다.',
    rkVal: '해 + 지구', pkNoneCustom: '찾는 곳이 없다. "직접 좌표 넣기"에서 위도·경도를 넣을 수 있다.',
    cuFold: '직접 좌표 넣기 (위도/경도)', flFold: '기준값으로 거르기',
    anFocus: '선택한 착륙지', anPinned: '고정됨', anUnpinned: '고정 안 됨',
    sunVis: '해 보임', earthVis: '지구 보임',
    valBadge: 'NASA PGDA와 검증 · 평균 오차', valPp: '%p', valSun: '해', valEarth: '지구', valMore: '방법·한계·출처 → 소개',
    valPopTitle: '검증 방법',
    valPop: '남위 85°–90° 사이 무작위 {n}개 지점을 우리 엔진(NASA LOLA 지형, 관측자 2 m, NAIF 천체력, {win}, {step}시간 간격)으로 다시 계산해 NASA PGDA 평균 가시율 지도(Mazarico 외 2011)와 비교했다. 평균 절대 오차: 해 {sun} %p (r = {rsun}), 지구 {earth} %p (r = {rearth}, PGDA 기준: 지구 원반 일부라도 보임). 앱의 더 엄격한 기준(지구 중심이 지평선 위)으로는 지구 오차가 {earthc} %p다. 남극 지역만 검증했다.',
    valClose: '닫기',
    tabsAria: '선택한 착륙지 자세히', tabHorizon: '지평선 그래프', tabDates: '착륙일 비교', tabRelay: '중계 타워', tabKorea: '한국 연결', tabStory: '왜 그럴까?', tabCompare: '고정한 곳 비교',
    scrubAria: '분석 기간 안에서 선택한 시각', scrubKeys: '←/→ 1시간 · Shift 1일 · Home/End',
    playFrom: '지금 시각부터 재생',
    tbDate: '날짜 (UTC)', tbTime: '시각 (UTC)', tbCustom: '직접',
    rlNotAvail: '이 착륙지는 아직 중계 분석이 없다. 중계 타워는 실제 고해상도 지형으로만 계산하며, 지금까지는 남극 착륙지만 계산했다.',
    saNotAvail: '아직 없음', saNotAvailTip: '중계 분석은 아직 남극 착륙지만 했다.',
    terrainNote: '지형: LOLA/SLDEM2015 DEM으로 지평선 마스크(달 곡률 포함)를 계산하는 중이다. "지형 계산 중" 표시가 있는 곳은 그때까지 평평한 0° 지평선을 쓴다. 천체력: NAIF DE440s + DE421 달 자세(MOON_ME), 칭동 포함.',
  },
};

let lang = 'en';
try { const q = new URLSearchParams(location.search).get('lang'); lang = q || localStorage.getItem('llsn.lang') || 'en'; } catch (e) { /* storage blocked */ }
if (!STR[lang]) lang = 'en';

export const getLang = () => lang;
export const t = key => STR[lang][key] ?? STR.en[key] ?? key;

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-ph]').forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
  root.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
}

export const toggleLang = () => setLang(lang === 'en' ? 'ko' : 'en');

/** Switch the UI language (persists in localStorage, shared by the viewer and the About page). */
export function setLang(next) {
  if (!STR[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem('llsn.lang', lang); } catch (e) { /* ignore */ }
  applyI18n();
  window.dispatchEvent(new CustomEvent('llsn:lang', { detail: { lang } }));
}
