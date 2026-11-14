# Use of Artificial Intelligence (SI) (DRAFT)

> **팀용 요약 (한국어)**: 공식 'SI 사용' 칸 초안. 핵심 메시지 = **아이디어와 설계 결정은 팀원이, SI는 코드·데이터 처리·문서·교차 검증을 도움.** `docs/SI_USAGE.md`(main `ad945de` 기준 23줄)를 요약했다. 제출 직전에 표를 최신 로그로 다시 세야 한다.
> ⚠️ 확인 필요: 로그에는 Codex 모델이 'GPT-6'로 적혀 있는데 팀 정보에는 'Astra'(성지용 Codex Pro)라고 되어 있다. 지용님이 실제 모델명을 확인해서 둘 중 하나로 통일해 주세요. 소윤님은 로그상 Claude Code를 썼다(팀 안내에는 Codex Plus).

## Statement
All ideas, feature choices and design decisions in this project came from our six team members — including the choice of challenge, the comparison-not-ranking goal, the multi-resolution horizon approach, the relay-tower study, the Korea links and the visual design. Team members proposed ideas to each other in conversation and then asked SI tools to help implement them.

SI tools assisted with:
- **Code**: Python data pipelines (downloads with resume, horizon engine, maps, validation) and the browser modules.
- **Data processing**: running long computations, converting formats, writing files that follow our data contract.
- **Documentation**: method notes in `docs/`, dataset table `data/DATASETS.md`, and drafts of these submission texts (which the team reviewed and edited).
- **Cross-checking**: a separate SI session (not the one that wrote the code) re-checked results — e.g. against JPL Horizons, GDAL/Rasterio pixel reads and NASA PGDA maps. Humans read every verification report before merging.

## Tools
| Tool | Model (as logged) | Used by | Typical use |
|---|---|---|---|
| Claude Code | Claude Opus 5.5 | Sua Kim (integrator), Dongju Kim, Soyun Jeong | Data contract, page skeleton and UI modules, horizon/map engines, PGDA validation scaffold, global terrain fetch, merging pull requests, submission drafts |
| ChatGPT Codex | GPT-6 (Codex Plus/Pro) [UNVERIFIED: team notes also mention the "Astra" model for Jiyong's Codex Pro] | Minchul Kim, Jiyong Sung | Ephemeris pipeline and Horizons check, site catalogue with sources, south-polar terrain downloads and resolution diagnosis |
| [TBD] | [TBD] | Chaei Oh (design) | [TBD: add once design work is logged] |

## How we kept the SI honest
- Every SI task appends one row to `docs/SI_USAGE.md` (time, member, role, tool/model, what was asked, files changed, how a human checked it, whether a human changed it). The full log is in the repository.
- Every dataset or number must have a source URL; unknowns are marked "unverified" instead of guessed.
- Verification was run in a separate session from the one that wrote the code.
- Numbers shown on the page and in this submission come only from computations run during the event (Nov 14–15, 2026).

## Images and video
- No AI-generated images or videos are used in the app or the submission. All visuals are screenshots or screen recordings of our own app, rendered from NASA data. [TBD: if any AI-generated image is added later, it must carry a visible "AI-generated" watermark.]
- [TBD: video voice-over — human voice or text captions only; if a synthetic voice is used, say so on screen.]

## Log summary (from `docs/SI_USAGE.md`, main `ad945de`)
[TBD: recount at submission time]
- 23 logged SI tasks on Nov 14 (09:30–11:05 KST) at the time of drafting.
- By area: data contract, skeleton and integration 9, ephemeris 3, site catalogue 1, south-polar terrain 4, global terrain 2, PGDA validation 1, horizon and map engines 2, UI modules 1.
- Human check columns: several rows still say "TO CHECK"; members must fill them before submission.
