<!-- 팀용 요약 (한국어): README 새 초안(s6-submission-draft-sua). 맨 위에 데모 링크, 기능은 main ad945de 기준으로 실제 있는 것만, 브랜치에만 있는 건 [PENDING MERGE]. 숫자는 [TBD]. 제출 전에 표시 다 지우기. -->
# Lunar Landing Site Navigator — Team Ginkgo Orbit

**▶ Live demo: https://kiisophii.github.io/lunar-landing-site-navigator/**

NASA Space Apps Challenge 2026 · Seoul · Challenge: *Lunar Landing Site Navigator* · Project name: [TBD — see `docs/submission/01_project_name.md`]

At a chosen lunar landing site and time, can a lander see the **Sun** (power, heat) and the **Earth** (direct-to-Earth radio link) — and for how long? This tool lets mission planners, educators and the public compare sites and dates side by side. It is a comparison and re-planning tool, **not** a "best site" picker.

## What is implemented
On the live page (main):
- **33 cited landing sites** — Apollo, Luna, Chang'e, Chandrayaan-3, SLIM, CLPS (IM-1, IM-2, Blue Ghost 1), nine Artemis III candidate regions, five south-polar ridges/rims, IM-3 Reiner Gamma. Search, group filter, up to three cards side by side, shareable URL. Every coordinate keeps its source (`docs/sites.md`).
- **Real ephemeris**: hourly Sun/Earth directions 2026–2030 from JPL DE440s + DE421 lunar orientation (libration included), checked against JPL Horizons (max difference 0.00044° azimuth, 0.000034° elevation over 1,452 comparisons; `docs/ephem.md`).
- **Instant values** per site: Sun elevation (largest number), Sun azimuth, time until sunset/sunrise, time until Earthset/Earthrise.
- **Analysis window** (7 / 30 / 90 days or custom): sunlight %, Earth-visible %, both %, longest dark spell — also in days. Play/speed controls never change the percentages.
- **360° horizon panorama** with Sun and Earth now and their tracks; true-shape ×1 and ×3 vertical views.
- **Threshold filters** for the site list.
- **English UI, Korean toggle** (`?lang=ko`); large-text mode `?tv=1`.

Computed by the pipelines, waiting for the final run or merge:
- Terrain horizons from LOLA (multi-resolution, with curvature) — engine on main; per-site results [TBD]. Until a site's horizon file exists, the page labels it **"Terrain pending"** and uses a flat horizon.
- Validation against NASA PGDA polar maps — scaffold on main; numbers [TBD].
- Whole-Moon sunlight / Earth-visibility maps — engine on main; tiles [TBD].
- [PENDING MERGE: s4-globe3d-sua] 3D globe with level-of-detail terrain.
- [PENDING MERGE: s4-relay-tower-sua] Relay-tower siting.
- [PENDING MERGE: s4-korea-links-sua] Korea links: KDSA / DSN Moon visibility, Danuri (KPLO) passes, ShadowCam context.
- Custom user coordinates [TBD: not on main yet].

## Screenshots
[TBD: add 2–3 screenshots from the final build — site cards, horizon panorama, analysis table.]

## How it works
1. `pipeline/ephem.py` — NAIF kernels → hourly Sun/Earth vectors in the MOON_ME frame → `web/data/ephem.bin` (+ `ephem.json`).
2. `pipeline/build_sites.py` — cited site catalogue → `web/data/sites.json`.
3. `pipeline/fetch_polar.py`, `pipeline/fetch_global.py` — download only the needed terrain windows (HTTP Range, resumable): PGDA south-polar 5–240 m, SLDEM2015 59 m, LOLA LDEM_64/LDEM_16.
4. `pipeline/horizon.py`, `pipeline/run_horizons.py` — horizon mask per site: 720 azimuths, 0.2–300 km, 2 m observer, lunar curvature, finest DEM first → `web/data/horizon/<ID>.json`.
5. `pipeline/global_maps.py` — whole-Moon average sunlight / Earth / both maps.
6. `pipeline/validate.py` — compare with NASA PGDA average illumination and Earth-visibility maps (Mazarico et al. 2011).
7. `web/` — static page; `web/js/core.js` computes everything in the browser from the files above.

Definitions (fixed for the whole team): observer 2 m above terrain; Sun "sunlit" when ≥ 50 % of the disc is above the horizon mask; Earth visible when its centre is above the mask; "both" = sunlit and Earth visible; no atmospheric refraction. File formats: `docs/data_contract.md`.

## Run it
App (any static server):
```bash
python -m http.server 8000 -d web
```
Then open http://localhost:8000/ .

Pipelines (Python 3; raw data go to `data/raw/` and are never committed):
```bash
python -m pip install -r pipeline/requirements-ephem.txt -r pipeline/requirements-polar.txt
```
```bash
python pipeline/ephem.py
```
```bash
python pipeline/fetch_polar.py
```
```bash
python pipeline/fetch_global.py
```
```bash
python pipeline/run_horizons.py
```
```bash
python pipeline/global_maps.py run --ppd 8
```
```bash
python pipeline/validate.py
```
```bash
python pipeline/check_contract.py
```
Long runs save progress and resume when restarted. `global_maps.py` and the horizon engine also need `numba` [UNVERIFIED: not yet in a requirements file]. Tests: `python -m pytest pipeline -q`.

## Data sources
All NASA and other sources, with URLs, licences and citations: **`data/DATASETS.md`**. Main ones: JPL/NAIF SPICE kernels and JPL Horizons; LRO LOLA (PGDA south-polar DEMs, SLDEM2015, LDEM_64/16); NASA PGDA average illumination and Earth-visibility maps (Mazarico et al. 2011); NSSDCA, LROC and NASA Lunar Surface Data Book site coordinates. Submission texts: `docs/submission/`.

## Use of AI (SI)
Ideas and design decisions came from the team; SI tools (Claude Code, ChatGPT Codex) helped with code, data processing, documentation and cross-checking. Every use is logged in `docs/SI_USAGE.md`.

## Limitations
- Horizon accuracy depends on DEM resolution; outside the PGDA polar products and SLDEM2015 (±60°), the near field uses LDEM_64 (~474 m).
- Earth counted visible only when its centre clears the horizon (conservative); no radio diffraction, no link budget, no thermal model.
- Ephemeris covers 2026–2030; future leap seconds are not predicted.
- Validation is against south-polar PGDA maps; [TBD: final numbers and known disagreements].

## Team
Team Ginkgo Orbit (6 members, Seoul): [TBD — names/roles as the team wants them shown].

## License
Code: Apache License 2.0 (`LICENSE`). NASA/JPL data and third-party libraries keep their own terms; see `data/DATASETS.md` and `docs/submission/06_partner_data_and_references.md`.
