# 30-second demo video — shot list (Team Ginkgo Orbit · Luna Sight)

> **팀용 (한국어)**: 대회판 새 디자인(브랜치 `s5-design-impl-sua`) 기준 30초 촬영표. 11/15 아침 미리보기(`http://127.0.0.1:8791/`)에서 장면마다 화면을 열고 숫자를 읽어 확인했고, 같은 숫자를 데이터 파일로 따로 다시 계산해 맞췄다. 옛 v17 초안은 이 문서로 대체.
> **30.0초 넘으면 글로벌 탈락** → 목표 29.0초. 전부 영어, 영어 자막 burn-in. 얼굴·NASA 로고·AI 이미지/영상 없음. 음악을 쓰면 끝 카드에 출처.

## 0. 팀이 정할 것 (촬영 전에)

| # | 질문 | 선택지 | Claude 추천 |
|---|---|---|---|
| Q1 | **자막만 vs 목소리** | (a) 자막만 (b) 팀원 목소리 + 같은 문장 자막 (c) 합성 음성(화면에 "AI voice" 표시) | **(a) 자막만.** 29초 안에 장면 8개라 말을 넣으면 속도가 빡빡하다. 작년 수상작 3개도 길이 29–30초로 짧은 자막 위주로 보인다(직접 재생 확인은 아직). |
| Q2 | **음악** | (a) 없음 (b) 무료 음원(출처를 끝 카드·설명에 적기) | **(b)** 단, 라이선스가 확실한 곡만. 고르기 어려우면 (a). |
| Q3 | **편집 담당** | 녹화 = 지용님 데스크톱(정해짐). 자막·자르기·길이 확인은 누가? | 팀에서 정하기. 편집한 사람이 아래 "내보낸 뒤 확인" 3줄을 직접 실행. |
| Q4 | **④ 위치 장면 숫자** | (a) 화면 값 "250 m apart: 0.0% vs 48.6%" (b) 요약문 값 "1 km apart: 0% vs 45%" | **(a).** 새 디자인은 남극 착륙지 주변 지도를 250 m 격자로 보여 줘서 1 km 쌍(0% → 45.11%)은 화면에 안 나온다. (a)로 가면 요약문 문장도 같이 바꿔야 한다(아래 6절). |
| Q5 | **녹화 시점** | 라이브 main(v36)은 아직 옛 디자인이라 ⑥ 검증 배지가 없다. | **대회판을 main에 합치고 라이브가 새 버전이 된 뒤 녹화.** 채이님 디자인을 오후에 반영하면 버튼 위치가 바뀔 수 있으니, 녹화 직전에 이 표의 "화면에서 할 일"을 한 번 더 따라 해 보기. |

## 1. 녹화 설정

- **화면**: 1920×1080, 영어(`&lang=en`), 브라우저 확대 100%. `?tv=1`(큰 글자)은 **쓰지 않는다**: 옛 화면용 CSS(`web/css/base.css:29`)라 새 3단 화면에서 확인하지 않았다. 글자가 작으면 편집할 때 확대(crop/zoom)한다.
- **고정 링크** (합친 뒤 라이브에서. 날짜를 고정해서 언제 녹화해도 같은 숫자가 나온다):
  `https://kiisophii.github.io/lunar-landing-site-navigator/?sites=ARTEMIS_CABEUS_B,ARTEMIS_MALAPERT,ARTEMIS_HAWORTH&pn=1,2,3&focus=ARTEMIS_CABEUS_B&d=2026-11-15&p=29.5&lang=en`
- 아래 세부 블록(관련 장면 ②③④⑤)은 `&open=hz` · `&open=near` · `&open=date` · `&open=relay`로도 열리지만, 미리보기에서 한 번 안 열린 적이 있다. **"Why this site" 아래 `Horizon & blocking ▾` / `Nearby ▾` / `Date change ▾` / `Relay tower ▾` 버튼을 누르는 장면을 그대로 찍는 게** 확실하고 화면도 살아 있다.
- 비교 표 칸에 "terrain pending"이 보이면 파일을 아직 못 받은 것이다(미리보기에서 로컬 서버 연결이 한 번 끊겨 생겼음). 새로고침 뒤 다시 찍는다.
- 각 장면은 3–5초 이상 넉넉히 따로 녹화하고, 편집에서 아래 길이로 자른다.

## 2. Shot list (29.0 s)

| # | Time | Screen / action (new design) | Caption (English, burned in) | What the screen shows (read 11/15) | Number source (file) |
|---|---|---|---|---|---|
| 0 | 0:00–0:03 (3.0 s) | 3D Moon in the centre. Bottom toolbar → **"Mean sunlight 2026–2030"** layer button (2nd icon), then the toolbar's zoom-to-site button so the south pole fills the screen: yellow sunlight over LOLA terrain shading. Title "LUNA SIGHT" is already top-left. | **Can a lander see the Sun — and Earth?** | Layer legend "Mean sunlight 2026–2030 · long-term 2026–2030 · 0% 50% 100%". No numbers in the caption. | — |
| 1 | 0:03–0:07 (4.0 s) | Left panel **② Sites 33** list → click the pin of Cabeus B, Malapert, Haworth; the right **Compare** tray fills with the three columns (Sunlight / Direct Earth link / Longest shadow). | **Compare 33 landing sites, hour by hour.** | "Sites 33 · comparing 3". Tray (period 2026-11-15 + 29.5 d): Malapert 48% / 100%, Cabeus B 47% / 23%, Haworth 82% / 55%. | `web/data/sites.json` (33 sites); tray values from `web/data/horizon/*.json` via `core.js` (not in caption) |
| 2 | 0:07–0:10 (3.0 s) | Tray → **"Why this site ↓"** under Cabeus B → open **`Horizon & blocking ▾`** → horizon panorama: the LOLA ridge line with the Earth path dipping behind it. | **Every horizon from real NASA LOLA terrain.** | Horizon panorama for "Peak near Cabeus B (region)". No numbers in the caption. | `docs/VALIDATION.md` S2 row (terrain horizons re-checked) |
| 3 | 0:10–0:14 (4.0 s) | Pick **Malapert** (tray header or site list) → **`Nearby ▾`** → local map, metric **Both**. Hover the square at (−2.75, −1) km, then the one just north at (−2.75, −0.75) km; the readout under the map changes. End on the line "Biggest jump between neighbours". | **Just 250 m apart: Sun + Earth 0.0% vs 48.6%.** *(Q4)* | "Biggest jump between neighbours (250 m apart): (-2.75, -1) km 0.0% → (-2.75, -0.75) km 48.6% (Both)." Footer "Grid: 41 × 41 nodes, 250 m apart, ±5 km · data: web/data/local250/". | `web/data/local250/ARTEMIS_MALAPERT.json` nodes 665 → 706, `both_frac` 0 → 0.48560 (re-computed 11/15 with a separate script: largest 4-neighbour jump of the whole grid) |
| 4 | 0:14–0:18 (4.0 s) | Same site → **`Date change ▾`** → slip panel; scroll to **"All sites: worst extra darkness after a 14-day slip"** bars and the line "22 sites where a 14-day slip can turn the whole first two weeks into night (+330 h or more)… +336 h". | **14 days late? Up to 336 more hours of darkness.** | Bar ranking (Shackleton Rim +59 h … ) and the list ending in "+336 h". Malapert row: "+14 d · worst change +335 h". | `web/data/date_slip/*.json` → `slip['+14d'].longest_dark_h.worst_change`: max **336** (BLUE_GHOST1, CHANGE6, IM3_REINER_GAMMA, LUNA16, LUNA24, SLIM, Apollo 12/14/16 …), **26 of 33 ≥ 300 h**, 22 ≥ 330 h (re-computed 11/15) |
| 5 | 0:18–0:23 (5.0 s) | Pick **Cabeus B** → **`Relay tower ▾`**, height **15 m** (default). Pan the map "Where a tower would help" (◆ tower), then **zoom in on the line "Whole 2026–2030 window: link % with 0 / 1 / 2 / 3 towers"** and the tower table row 1 "+56.1 pp". | **One 15 m relay tower: Earth link 29.6% → 85.7% (2026–2030).** | "0: 29.6% · 1: 85.7% · 2: 89.5% · 3: 89.7%". Row 1: "5.76 km · 56° · 11.3° · +56.1 pp · lander". ⚠️ The KPI tiles at the top of the same panel show this month with 3 towers ("23%", "85%") — keep them out of frame or cut before the zoom. | `web/data/relay/ARTEMIS_CABEUS_B.json`: `lander.earth_frac` 0.2964, `height_curve[15 m].single_link_frac` 0.8573, `single_gain_pp` 56.09 = `docs/relay_impact.md:20` |
| 6 | 0:23–0:27 (4.0 s) | Top of the **Compare** tray → click the **"Mean error 1.66 pp"** badge → popover "Compared with NASA PGDA maps". Hold on the Metric row and "This site" (Malapert: ours 45.2% · PGDA 45.7%). | **Checked against NASA PGDA maps: mean error 1.66 points.** | Badge "Mean error 1.66 pp". Popover: "Sunlight MAE 1.66 pp (r 0.985) · Earth MAE 1.24 pp (r 0.990)", "Mean over 240 random points at 85–90°S (seed 42)", "ours 45.2% · PGDA 45.7% … difference −0.5 pp". | `web/data/validation.json`: `sun.mae_pp` 1.658 → 1.66, `sun.r` 0.9846; `named[ARTEMIS_MALAPERT]` ours 0.45187, PGDA 0.45708 (= `docs/VALIDATION.md` S3 row, line 15 / 62 on this branch) |
| 7 | 0:27–0:29 (2.0 s) | End card made in the editor (text only, no logos). | **Try Luna Sight: kiisophii.github.io/lunar-landing-site-navigator** · Team Ginkgo Orbit · Seoul · Apache-2.0 · (music credit if used) | — | — |

Total on paper **29.0 s** (3 + 4 + 3 + 4 + 4 + 5 + 4 + 2).
Reading-time check (captions revised 11/15 by Dongju, see 2a): captions 7–11 words (counting numbers and symbols as words), at most 2.5 words/s (⓪ 8 words / 3 s = 2.7 is the only one above; it is a short question the viewer reads at a glance).

> 한국어 자막 뜻 (팀 확인용): ⓪ 착륙선이 해와 지구를 볼 수 있을까? ① 착륙지 33곳을 매시간 비교 ② 모든 지평선은 실제 NASA LOLA 지형으로 ③ 겨우 250 m 차이로 해+지구 동시 0.0% 대 48.6% ④ 14일 늦으면? 어둠이 최대 336시간 늘어남 ⑤ 15 m 중계탑 하나로 지구 연결 29.6% → 85.7% (2026–2030) ⑥ NASA PGDA 지도와 비교: 평균 오차 1.66포인트 ⑦ Luna Sight를 써 보세요(주소).

### 2a. Caption edits (Dongju, 11/15 afternoon)

Only the wording changed; every number is the same as before and was re-read from the data files on main `4cc7357`
(`local250/ARTEMIS_MALAPERT.json` points 665 → 706: both 0 → 0.48560; `date_slip/*.json` +14 d worst change max 336 h;
`relay/ARTEMIS_CABEUS_B.json` lander Earth 0.2964, 15 m single link 0.8573; `validation.json` sun MAE 1.658 pp).

| # | Before | After | Why |
|---|---|---|---|
| ① | Compare 33 sites, hour by hour. | Compare 33 landing sites, hour by hour. | Says what the sites are for a viewer who has not seen the app. |
| ② | Real NASA LOLA terrain, every horizon. | Every horizon from real NASA LOLA terrain. | Reads as one phrase instead of two fragments. |
| ③ | 250 m apart: 0.0% vs 48.6% Sun + Earth. | Just 250 m apart: Sun + Earth 0.0% vs 48.6%. | Names the metric before the numbers; "Just" stresses the short distance. Still waits on Q4. |
| ④ | Land 14 days late: up to 336 h more darkness. | 14 days late? Up to 336 more hours of darkness. | "h" is easy to miss in a 4 s caption; "hours" is clearer for non-experts. The question form keeps it at 10 words (2.5 words/s). |
| ⑥ | Checked against NASA PGDA maps: 1.66-point mean error. | Checked against NASA PGDA maps: mean error 1.66 points. | Same order as the badge on screen ("Mean error 1.66 pp"). |
| ⑦ | Luna Sight — try it: <url> | Try Luna Sight: <url> | Shorter for a 2 s end card. |

⓪ and ⑤ unchanged. Team can revert any line; captions are burned in only after recording.

**내보낸 뒤 확인** (편집 담당):

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 demo.mp4
```
→ **29.5 이하**여야 한다. 그다음 처음부터 끝까지 한 번 재생해서 자막 숫자가 위 표 "Caption" 칸과 글자 하나까지 같은지 본다.

## 3. 초안 ⚠️ 두 개 — 결정

1. **중계탑 장면 → 제출 문서 값(29.6% → 85.7%, 탑 1개, 2026–2030)을 쓴다.** 새 디자인의 Relay tower 블록 아래쪽에 "Whole 2026–2030 window: link % with 0 / 1 / 2 / 3 towers → 0: 29.6% · 1: 85.7% · …" 줄이 **이미 화면에 있다**(`web/js/relay_panel.js:26`, `:172`). 이 줄을 확대해서 찍으면 요약문·슬라이드 5와 영상 숫자가 같다. 같은 블록 위쪽 큰 숫자(이번 달, 탑 3개: 23% → 85%)는 화면에 안 걸리게 한다. 자막에 "One 15 m relay tower"와 "(2026–2030)"을 꼭 넣어 기간·탑 수를 밝힌다.
2. **검증 장면 → "Mean error 1.66 pp" 배지를 쓸 수 있다.** 새 디자인의 Compare 트레이 제목 줄 오른쪽에 배지가 있고(`web/js/trust.js`, `index.html`의 `#ls-valbadge`), 값은 `validation.json`의 1.658을 소수 둘째 자리로 반올림한 것이다. 요약문은 "1.7-point"라 반올림만 다르다. 자막은 화면대로 **1.66**으로 쓴다.
   - 초안에 있던 "JPL Horizons ≤ 0.0005°"는 **자막에서 뺐다.** 화면(Sources & method 블록)에는 다른 검사 값 "Ephemeris check: max difference 3.6e-5° over 50 samples"가 나와서, 0.0005°(3만 7천 회 이상 비교)를 화면에서 보여 줄 수 없다.

## 4. 새로 생긴 것 — 어디에 넣었나

| 새 기능 | 장면 | 비고 |
|---|---|---|
| 남극 250 m 주변 지도 (`web/data/local250/`, 16곳) | **③** 그대로 사용 | 화면 숫자가 1 km 때보다 극적(0.0% → 48.6%). Q4 결정 필요. |
| 지형이 보이는 일조 레이어 (데이터 레이어를 LOLA 음영 위에 반투명으로) | **⓪** 첫 장면 | 브랜치 커밋 `792f70a` 이름이 "Experiment 1"이라 **합칠 때 남는지 확인**. 빠지면 ⓪은 "Sunlight now" 레이어(1번째 아이콘)로 찍는다. 미리보기 창이 숨겨져 있어 3D를 직접 띄워 보진 못했고, 디자인 세션 스크린샷(`s5_design_impl_shots/layer_overlay/after/haworth_near.png`)으로만 모양을 확인했다. |
| 남극 사용자 지점 정확도 개선 (main v36, custom-polar 재검증) | **본편에는 안 넣음** | 29초에 자리가 없다. 바꾸고 싶으면 ① 대신 "+ Add a landing site → 남극 좌표 입력 → 정확도 배지" 4초 컷으로 교체 가능. 그때 자막 숫자는 화면 배지에서 읽어 이 표에 다시 적는다(지금은 확인 안 함). |

## 5. 디자인에 필요한 것 (지금 화면에 없어서 못 찍거나 잘 안 보이는 것)

코드는 고치지 않았다. 채이님·수아 판단용 목록.

1. **⑤ 중계탑 "2026–2030 · 탑 0/1/2/3개" 줄이 블록 맨 아래 작은 글자**다. 영상에서는 확대로 해결되지만, 눈에 띄는 한 줄(예: "29.6% → 85.7% with one 15 m tower, 2026–2030")이 위 KPI 옆에 있으면 더 좋다. (선택)
2. **③ 가장 큰 차이 두 칸이 지도 위에 표시되지 않는다.** 글줄로만 나온다. 두 칸에 테두리 표시가 있으면 영상에서 바로 보인다. 지금은 두 칸에 마우스를 올려 읽음 값이 바뀌는 걸로 대신한다(클릭하면 "Your own landing point"로 보내지니 **클릭 말고 마우스 올리기만**). (선택)
3. **JPL Horizons 0.0005°(3만 7천 회 이상 비교) 값이 화면에 없다.** 영상·슬라이드 6에서 이 숫자를 화면 근거로 쓰려면 Sources & method 블록이나 배지 창에 한 줄 필요. 없으면 영상에서는 빼고(위 결정), 슬라이드는 문서 근거(`docs/VALIDATION.md:89` on this branch)로 둔다.
4. **큰 글자 모드(`?tv=1`)는 새 3단 화면에 맞춰지지 않았다**(확인 안 함). 영상은 편집 확대로 대신한다. (선택)

## 6. 요약문·슬라이드와 맞출 곳

- Q4에서 (a)를 고르면 `summary_en.md`의 "two spots 1 km apart see Sun and Earth together 0% versus 45%" 문장과 `slides_7.md` 슬라이드 4를 250 m 값으로 바꿀지 팀이 정한다. 근거: `web/data/local250/ARTEMIS_MALAPERT.json`(node 665 → 706). 1 km 값(`docs/location_sensitivity.md:37`, 0.00% → 45.11%)도 데이터로는 맞으니 문서에 그대로 둬도 틀린 건 아니다. 다만 영상과 문서 숫자가 다르면 심사위원이 헷갈릴 수 있다.
- 이름: 앱 제목은 "Luna Sight — Lunar Landing Site Navigator"(새 디자인 `<title>`). 영상 ⓪은 화면 워드마크, ⑦ 끝 카드는 "Luna Sight". 요약문·슬라이드 1은 아직 "Lunar Landing Site Navigator"라 같이 바꿀지 팀 결정.
- 숫자 출처 확인: 위 표의 숫자는 11/15 아침 브랜치 `s5-design-impl-sua`(`792f70a`) 화면에서 읽었다. 근거 데이터 파일(`validation.json`, `relay/ARTEMIS_CABEUS_B.json`, `local250/ARTEMIS_MALAPERT.json`, `date_slip/*.json`, `metrics/ARTEMIS_MALAPERT.json`)은 같은 시각 `origin/main`(`274e676`, v36)과 git 해시까지 같다. 합친 뒤에도 숫자는 그대로여야 한다.
