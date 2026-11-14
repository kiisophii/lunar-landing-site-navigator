# Submission drafts (Team Ginkgo Orbit) — DRAFT, team to review

> **팀용 요약 (한국어)**: 공식 제출 양식(Project Submission Guide, 2026-11-13) 칸별 영어 초안이다. 전부 **초안**이고 팀이 고친다.
> 숫자는 main에 아직 없는 건 전부 `[TBD]`로 비웠다. `[PENDING MERGE: <branch>]` = 브랜치에만 있고 main에 안 합쳐진 기능, `[UNVERIFIED]` = 확인 안 된 말.
> 제출 직전 체크: ① `[TBD]`/`[PENDING]`/`[UNVERIFIED]` 0개 ② 요약 50–200단어 ③ 영상 30초 이하 또는 슬라이드 7장 이하 ④ 모든 출처 들어갔는지.
> 기준 시점: main `ad945de` (2026-11-14 11:05 KST 통합본).

| File | Form field | Status |
|---|---|---|
| [01_project_name.md](01_project_name.md) | Project Name | 5 options — team picks one |
| [02_high_level_summary.md](02_high_level_summary.md) | High-Level Summary (50–200 words) | draft, numbers TBD |
| [03_project_details.md](03_project_details.md) | Project Details | draft, Seoul recommended flow |
| [04_use_of_si.md](04_use_of_si.md) | Use of Artificial Intelligence (SI) | draft, from `docs/SI_USAGE.md` |
| [05_nasa_data.md](05_nasa_data.md) | NASA Data | draft, from `data/DATASETS.md` |
| [06_partner_data_and_references.md](06_partner_data_and_references.md) | Space Agency Partner Data / References | draft |
| [07_demo_video_script.md](07_demo_video_script.md) | 30-second demo video | script, numbers TBD |

The repository `README.md` is rewritten in the same branch.

## Markers used in every file
- `[TBD]` — final number not on `main` yet; fill from the final run only.
- `[PENDING MERGE: branch]` — feature exists on a branch, not on `main`/live page yet. Delete the sentence if it does not land before submission.
- `[UNVERIFIED]` — claim not yet checked by a human against the source.

## Final-check commands (before pasting into the form)
```bash
grep -rn "\[TBD\|\[PENDING\|\[UNVERIFIED" docs/submission README.md
```
```bash
python -c "import re;t=open('docs/submission/02_high_level_summary.md',encoding='utf-8').read().split('<!-- BEGIN -->')[1].split('<!-- END -->')[0];print(len(re.findall(r\"[A-Za-z0-9'’\-\.%°]+\",t)),'words')"
```
