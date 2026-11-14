# 30-second demo video script (DRAFT)

> **팀용 요약 (한국어)**: 30초 데모 영상 대본(시간표). 공식 구조(0:00 소개 → 0:02 챌린지 → 0:05 이름/한 줄 → 0:10 작동 방식 + NASA 데이터 → 0:20–0:30 앞으로)에 팀이 고른 스토리보드 두 장면을 넣었다: ① 남극 착륙지에서 해가 능선 뒤로 지고 '일몰까지' 카드가 0이 됨 ② 중계탑이 지구 통신을 되살림.
> **30초 넘으면 글로벌 탈락** → 최종 편집본 길이를 꼭 29초 이하로. 전부 영어, 영어 자막 필수. 얼굴(특히 18세 미만) 없음. 숫자는 최종 계산 후 `[TBD from final run]` 채움. ②는 중계탑 브랜치가 main에 들어와야 촬영 가능.

**Format:** screen recording of the live page (1920×1080), English captions burned in, no faces, no AI-generated imagery. Voice-over optional (human voice; if a synthetic voice is used, show "AI voice" on screen [team to decide]). Music: none, or a cited royalty-free track [TBD].
**Hard limit:** final file ≤ 30.0 s — aim for 29 s.

| Time | Official part | On screen | Caption / voice-over (English) |
|---|---|---|---|
| 0:00–0:02 | Intro | Team name "Ginkgo Orbit", "NASA Space Apps 2026 · Seoul" (text only, no NASA logo) | "Team Ginkgo Orbit, Seoul." |
| 0:02–0:05 | Challenge | Challenge title "Lunar Landing Site Navigator"; Moon south pole view | "Can a lunar lander see the Sun — and the Earth?" |
| 0:05–0:10 | Name / tagline | Project name [TBD: from 01_project_name.md] over the site picker; three site cards appear side by side | "[Project name]: compare landing sites and dates in seconds." |
| 0:10–0:15 | How it works — scene ① | Focus on a south-polar site [TBD: site ID from final run]. Time slider plays; on the horizon panorama the yellow Sun slides behind the ridge silhouette; the card's "Until sunset" counts down to **0 h** and the card switches to "Until sunrise [TBD from final run]". | "Real LOLA terrain: at [site], the Sun sets behind a ridge at [TBD from final run] UTC." |
| 0:15–0:20 | How it works + NASA data | Analysis window 30 days: table shows Sunlight [TBD from final run] %, Earth [TBD from final run] %, Both [TBD from final run] %, Longest dark [TBD from final run] h. Small caption strip of sources. | "Built on NASA LOLA elevation, JPL ephemerides, checked against NASA PGDA illumination maps." |
| 0:20–0:25 | Future / impact — scene ② | [PENDING MERGE: s4-relay-tower-sua] Same site: Earth (blue) is below the horizon. A green relay tower appears [TBD: distance] km away at [TBD: height] m; green line-of-sight link to Earth; Earth-link share rises from [TBD from final run] % to [TBD from final run] %. | "Where terrain blocks the Earth, a [TBD] m relay tower restores the link [TBD from final run] % of the time." |
| 0:25–0:30 | Future / close | Live URL + repository; "Open source · Apache 2.0" | "Next: [TEAM TO WRITE — future plans must be the team's own ideas]. Try it: kiisophii.github.io/lunar-landing-site-navigator" |

## Shot list / prep
1. Pick the scene-① site and timestamp from the **final** horizon files (look for a sunset within the 30-day window where the ridge, not the flat horizon, causes it). Record `?sites=…&focus=…&d=…&p=30` URL so the shot is reproducible.
2. Use `?tv=1` for large text; English UI (default).
3. Record each scene separately; cut to length; burn in captions; check the exported file length (e.g. `ffprobe -show_entries format=duration`).
4. If scene ② is not on `main` by the recording time, replace 0:20–0:25 with the whole-Moon sunlight map or the 3D globe, whichever is merged; never show features that are not in the live demo.

## Backup: 7-slide version (if video is not ready)
[TBD — same story in ≤ 7 slides: 1 title, 2 challenge, 3 tool screenshot, 4 sunset scene, 5 data + validation, 6 relay tower, 7 future + links.]
