# Project Details (DRAFT)

> **팀용 요약 (한국어)**: 공식 칸 'Project Details' 초안. 공식 요구(무엇·어떻게·이점·목표·도구/언어)와 서울 운영팀 권장 흐름(문제/가설 → 접근과 이유 → NASA 데이터가 뭘 뜻하고 설계·검증에 어떻게 쓰였나 → 무엇을 시험하고 고쳤나 → 한계와 다음 단계)을 합쳤다.
> 심사위원이 '이틀은 짧다'는 걸 아니까 **왜 이렇게 설계했는지**를 앞에 뒀다. 기준 = main `ad945de`. main에 없는 건 `[PENDING MERGE]`, 숫자는 `[TBD]`.
> 아이디어·설계 결정은 팀원이 냈다는 점을 지키려고, '우리는 ~하기로 했다(We chose)' 문장은 팀이 실제로 정한 것만 남기고 아니면 고쳐 주세요.

## 1. Problem and hypothesis
A lunar lander lives on two lights. Sunlight gives it power and keeps it warm; a line of sight to the Earth lets it talk home without a relay. Near the south pole, where Artemis III will land, the Sun skims the horizon and a ridge a few kilometres away can turn day into night. The Earth also hangs low and moves with libration. Published NASA maps give long-term averages, but a mission planner, a teacher or a curious member of the public wants to ask a concrete question: *"At this site, on this date, how long until the Sun sets, and how long until the Earth sets?"*

**Hypothesis:** if we combine NASA's precise ephemerides with real terrain horizons computed at the finest resolution near each site, a lightweight web page can answer that question for any site and date in seconds, and the period statistics will agree with NASA's published 18.6-year average maps [TBD: agreement numbers].

## 2. What we built
A static web application (no server, no login) that lets users:
- **Pick and compare sites side by side** — 33 cited locations: 6 Apollo, 3 Luna, 4 Chang'e, Chandrayaan-3, SLIM, 3 CLPS landers, 9 Artemis III candidate regions, 5 south-polar ridges/rims from NASA's Lunar Surface Data Book, and the IM-3 Reiner Gamma target. Search and group filters; up to 3 site cards side by side; a shareable URL.
  - Custom coordinates: `[PENDING — the "custom" group exists in the catalogue code, a coordinate input is not on main yet]`.
- **Change date and time** (UTC) and play an animation; the time range covers 2026–2030 hourly.
- **Read instant values first:** Sun elevation and azimuth (largest number on each card), time until sunset/sunrise, time until Earthset/Earthrise.
- **Read period values separately:** for an analysis window (7, 30, 90 days or custom) — sunlight %, Earth-visible %, both %, longest dark spell, each also expressed in days. Animation speed never changes the percentages.
- **See the horizon:** a 360° panorama of the terrain silhouette with the Sun and Earth now and their tracks over the window; a true-shape ×1 view and a ×3 vertical view.
- **Filter sites** by thresholds (e.g. "sunlight ≥ X % and Earth ≥ Y %").
- **English by default, Korean toggle**; a large-text TV mode (`?tv=1`).
- `[PENDING MERGE: s2-global-maps-sua output]` Whole-Moon maps of average sunlight, Earth visibility and both.
- `[PENDING MERGE: s4-globe3d-sua]` A 3D globe with level-of-detail terrain tiles (height ×3 for display only; calculations use true heights).
- `[PENDING MERGE: s4-relay-tower-sua]` Relay-tower siting: where a short mast near a site restores a line of sight to the Earth, and for what share of time.
- `[PENDING MERGE: s4-korea-links-sua]` Korea links: when Korea's deep-space antenna (KDSA) and NASA DSN stations see the Moon, and Danuri (KPLO) passes over a chosen site.

## 3. How it works (approach and why)
| Step | What we do | Why this design |
|---|---|---|
| Ephemeris | Python + Skyfield read NAIF kernels (DE440s positions, DE421 lunar orientation → MOON_ME frame). We export Sun and Earth direction vectors for every hour 2026–2030 (43,824 hours, ~1 MB) to the browser. | Libration and light time are included by the ephemeris itself. One small binary lets the browser compute any site instantly without a server. |
| Terrain horizon | For each site we march outward along 720 azimuths (every 0.5°) from 0.2 km to 300 km, observer 2 m above ground, with exact lunar curvature, keeping the maximum elevation angle. Finest data first: PGDA 5 m → 10 → 20 → 60/80 → 240 m near the south pole; SLDEM2015 59 m elsewhere (±60°); LOLA LDEM_64/LDEM_16 for the far field. | Near the pole the Sun is within a few degrees of the horizon, so the nearest kilometres need metre-scale terrain while distant mountains only need coarse data. A multi-resolution chain gives both at low cost. HTTP Range requests download only the windows we need. |
| Visibility | Sun = fraction of the solar disc above the mask; "sunlit" if ≥ 0.5. Earth = Earth's centre above the mask (conservative). "Both" = sunlit and Earth visible. No atmospheric refraction (the Moon has none). | Fixed, written definitions (`CLAUDE.md`, `docs/data_contract.md`) so that every team member's code and the validation use the same rule. |
| Data contract | One versioned file-format contract (`docs/data_contract.md`) and a checker (`pipeline/check_contract.py`). | Six people and several AI assistants worked in parallel for two days; the contract let pieces plug in without breaking the page. |
| Web | Vanilla JavaScript ES modules, no external libraries, GitHub Pages. | Fast to load on a classroom laptop; no build step; anyone can fork it. |

## 4. NASA data: what it represents and how it shaped the design
- **LOLA elevation models (LRO)** are laser-altimeter heights of the lunar surface. They are the "walls" around a site; every sunset and Earthset in our tool is a moment when the Sun or Earth passes behind one of those walls. The resolution available near the pole (5 m) is why we built a multi-resolution horizon rather than one global grid.
- **NAIF SPICE kernels / JPL ephemerides** describe where the Sun and Earth are, seen from the Moon, including lunar libration. We cross-checked our hourly file against JPL Horizons at 6 sites × Sun/Earth over 60 days: 1,452 comparisons, maximum difference 0.00044° in azimuth and 0.000034° in elevation (`docs/ephem.md`, `docs/ephem_validation.json`), well inside our 0.01° acceptance limit.
- **PGDA average illumination and Earth-visibility maps** (Mazarico et al. 2011) are NASA's 18.6-year averages for the south pole. They are our independent "answer sheet": we recompute the same averages with our own engine at 240 random points (85–90°S, seed 42) and at named sites, and report the error. [TBD: sun MAE ___ pp, r ___; Earth MAE ___ pp, r ___; share within PGDA's ±60 m spread ___ %].
- **NSSDCA, LROC and NASA technical reports** give the landing-site coordinates; each site in the catalogue keeps its source URL (`docs/sites_source_audit.json`).

## 5. What we tested and improved
- Ephemeris: independent Horizons comparison (above); a second, user-reported independent rerun matched with zero float32 mismatches over all 43,824 hours (`docs/ephem.md`).
- Terrain downloads: GDAL/Rasterio independently decoded 30 pixels across six polar resolutions with 0 m difference to our caches (`docs/polar-validation.md`). A point-to-point 5 m vs 240 m mismatch was diagnosed as real sub-pixel relief, not a code error, by comparing resolution-matched averages (`docs/polar-resolution-diagnosis.md`).
- Global terrain: unit check of LDEM_64 float against the int16 product (max 0.5 m), registration check against a different projection; an edge gap in the 150 km SLDEM window was found in review and fixed with a regression test (`docs/global_terrain.md`).
- Horizon engine: synthetic tests (flat sphere dip, cone mountain, azimuth orientation) in `pipeline/test_horizon.py`. [TBD: resolution sensitivity table — mask RMS when the near field is replaced by 80 m / 240 m].
- Interface: periods and instant values were separated [UNVERIFIED: say who on the team raised this] so that animation speed cannot change any percentage; sites without a finished horizon are labelled "Terrain pending" instead of silently using a flat horizon.
- [TBD: anything changed after validation results come in.]

## 6. Benefits and goals
- **Mission planners**: quick re-planning — slide the date and see how sunlight and Earth-link windows shift at several candidate sites at once.
- **Educators and the public**: a concrete picture of why the lunar south pole is both attractive (near-continuous sunlight on rims) and hard (low Earth, long shadows).
- **Transparency**: every number has a cited source and a reproducible pipeline; the code is open source (Apache 2.0).
- Goal: a tool for comparing and re-planning, not a ranking. We do not label any site "best"; we show trade-offs.

## 7. Limitations and next steps
- Terrain horizons are only as good as the DEMs; outside ±60° latitude and away from the PGDA polar products, near-field resolution drops to LOLA LDEM_64 (≈474 m) `[UNVERIFIED for north-polar sites — none in the current catalogue]`.
- The Earth is counted visible only when its centre clears the horizon (conservative); partial Earth discs and radio diffraction are ignored.
- No lander height above 2 m, no thermal model, no link budget (relay-tower link figures, if shown, are labelled assumptions).
- Ephemeris file covers 2026–2030 only; leap seconds after `naif0012.tls` are not predicted.
- Validation covers the south pole (PGDA maps, 75–90°S); equatorial sites are checked only through the ephemeris and DEM cross-checks.
- Next steps: [TEAM TO WRITE — future plans are ideas, so they must come from team members, not the SI. Placeholder bullets only.]
  - [TBD]
  - [TBD]

## 8. Tools and languages
- **Languages**: Python 3 (pipelines), JavaScript (ES modules, browser), HTML/CSS.
- **Python libraries**: Skyfield, jplephem, sgp4, NumPy, Numba, Requests, tifffile, imagecodecs, pyproj, Rasterio, pytest (see `06_partner_data_and_references.md` for licences).
- **Browser**: no third-party libraries on `main` [re-check after the 3D globe merge].
- **Hosting**: GitHub, GitHub Pages, GitHub Actions.
- **SI tools**: Claude Code (Claude Opus 5.5) and ChatGPT Codex (see `04_use_of_si.md`).
