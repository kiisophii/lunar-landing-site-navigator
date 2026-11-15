# Verification ledger — who checked each published data product

One row per data product in `web/data/` (main `115d285`, web version 26). Every entry is taken from what the
repository records: merge-commit messages on main (short hash), integrator rows in `docs/SI_USAGE.md` (line number),
the validation table `docs/VALIDATION.md` ("row N" = full-table row), and the products' own check files.
If no check is recorded, the cell says so. Checks of all entries: `python pipeline/verify_ledger.py`.

**Status rule.**
- **Independently verified**: someone other than the person who computed the product recomputed part or all of its
  values with their own code, and the recorded result agrees. "Integrator" = Sua Kim at merge time; "other member" =
  another team member in a separate pull request.
- **Author-verified only**: the only recorded checks were run by the person who computed the product (even if with
  separate code), or the integrator only re-ran the same code / compared file diffs.
- **Not verified**: no check recorded.

Most independent checks are **samples** (a few sites, nodes, azimuths or cells); the "Scope" words say which.
Team: Minchul Kim, Jiyong Sung, Soyun Jeong, Dongju Kim, Sua Kim (integrator). All computation was done with AI help
(Claude Code and OpenAI Codex), as logged in `docs/SI_USAGE.md`.

| # | Product (`web/data/`) | Computed by (card / PR, member) | Author-side verification | Independent recomputation (integrator at merge, or other member) | Commit / PR | Status |
|---|---|---|---|---|---|---|
| 1 | `sites.json` (33 sites) | Card 4, PR #5, Minchul (`a09b0db`); SHACKLETON_RIM moved to the published rim point, card 15, PR #16, Minchul (`648adfd`); 4 display labels, Minchul (`00bb8a5`) | Source audit `docs/sites_source_audit.json`; AI link check: the 24 checkable sites match the source pages within 0.01°, the 9 Artemis regions not confirmed (`docs/source_link_ai_report_2026-11-14.md:9`); coordinate audit: all 33 pairs equal the stated source pair, max 0.000 m (`docs/site_coordinate_audit.md:24`) | **None recorded.** Merge `34b14b9` (PR #5): no check listed. Merge `170d483`: diff check only (only `name`/`name_ko` of 4 sites changed) | `34b14b9`, `4fd2225`, `170d483` | Independently verified (other member): Dongju Kim re-read 5 random sites from the original sources, max diff 0.0000° (C-row below). Integrator: diff check only |
| 2 | `ephem.bin`, `ephem.json` (Sun/Earth 2026–2030, hourly) | Card 1, PR #2, Minchul (`d89c42a`) | vs JPL Horizons: 1,452 comparisons, max 0.000016° (app float32 0.00044°) (row 1); 6 real sites max 0.000034° (row 2) | **Other member (Dongju, card 10 check, PR #11):** own code without `ephem.py`: the 21,912 overlapping rows of the 18.6-year file are bit-identical to `ephem.bin`, and that file matches Horizons in 34,296 comparisons, max 0.000041° (row 3; `docs/card10_npz_independent_check.json:30`). Integrator: none recorded for `ephem.bin` itself (merge `b7f499d`) | `b7f499d` (PR #2), `d360288` (PR #11) | Independently verified (other member) |
| 3 | `horizon/` (33 terrain masks) | Card 8, PR #8, Jiyong (16 south-polar, `5bde5df`); card 9, PR #9, Soyun (17 non-polar, `7de0271`); SHACKLETON_RIM recomputed in PR #14, Jiyong (`d477409`) | Polar: brute-force re-march 2.5 m steps, 2 sites × 10 azimuths, max 0.00053° (row 6, Jiyong); non-polar: own brute-force code, all 720 azimuths, max 0.012–0.219°, RMS ≤ 0.026° (row 7, Soyun) | **Integrator, merge a7a0978 (PR #14):** SHACKLETON_RIM, 10 azimuths, max 0.0035 deg (historical sample). **Other member, task A (PR #65):** full independent original-DEM recomputation by Minchul; 33/33 sites x 720 bins = 23,760 angles; all 43,824 hourly Sun states/site. 23,759 angles pass; CHANGE6 231 deg differs +0.0604630281 deg (FAIL vs 0.05 deg). Median absolute angle 0.000150406 deg. All 33 Sun fractions pass, max 0.0114092735 pp (threshold 1 pp). [Full evidence](task_a_horizons/report.md); prior integrator sample remains recorded in git history. | Original production commits unchanged; task A PR #65, calculation run 43655770217 | Independently verified (historical integrator sample); task A full recomputation complete, angular criterion FAIL (1/23,760), sunlight PASS (33/33) |
| 4 | `metrics/` (33 sites, 2026–2030) | Card 10, PR #12, Dongju (`5e105e7`, incl. Minchul's PR #6); SHACKLETON_RIM re-run in PR #14, Jiyong | **Other member (Minchul):** separate Python port = app `core.js` on 3 fixtures and all 33 sites (row 13) | **Integrator:** `a7a0978`: SHACKLETON_RIM metrics recomputed from `ephem.bin`, exact match; `4a760de`: own loop for SHACKLETON_RIM, ARTEMIS_HAWORTH, APOLLO17, 60-month hour-weighted means = `metrics/<ID>.json` to 6 dp; `7ddda73`: visible hours = metrics fraction × 43,824 exactly (same 3 sites). Re-running the same code reproduced all 33 files byte-for-byte (`2b05c2c`, reproduction, not independent) | `2b05c2c` (PR #12), `a7a0978`, `4a760de`, `7ddda73` | Independently verified (sample: 3 sites) |
| 5 | `relay/` (33 sites, towers 5–50 m) | Engine: Sua (s4-relay-tower-sua); 33-site run: card 13, PR #14, Jiyong (`d477409`) | Separate verifier without production geometry, 3 sites: max 0.0011 pp, 30-epoch mismatches 0 (row 18, Jiyong) | **Integrator:** `a7a0978`: own 15 m network line of sight + tower Earth visibility at 20 hours, 20/20; `bab473b`: ARTEMIS_CABEUS_B direct 29.6367 %, 15 m single tower 85.743 % vs 85.727 % (own tower horizon + LOS); `42d3a21`: SHACKLETON_RIM 30-day spot check 342 h / 378 h. Note: the integrator also wrote the relay engine | `a7a0978` (PR #14), `bab473b` | Independently verified (sample) |
| 6 | `korea/` (station visibility, KDSA/DSN windows) | Sua (`dd114ff`, `5284299`) | — | **Other member (Dongju, card 16, PR #13):** `stations.json` Moon ≥ 10° bits vs Horizons for all 43,824 h × 4 stations: 2 of 175,296 differ, both within 0.0008° of 10°; Moon az/el max 0.0012°; link hours for 5 sites by brute force within 1 h (rows 15–17, `docs/korea_links.md` §2). Task C (Jiyong, `a78d83c`): all 7,058 station windows matched (max edge 1.003 s), all 132 site-station hourly series exact. KDSA exact-row check finds 6 one-minute differences; Goldstone/Madrid windows contain invalid JSON NaN peaks. [Full check](task_c_check.md). Integrator: merge `5804e63` lists no check | `5804e63` (PR #13) | Independently verified (other member; station/window geometry and 33-site links only); 6 KST-row discrepancies and 2 JSON defects remain |
| 7 | `validation.json` (PGDA comparison, 240 points + 16 named sites) | Card 11, PR #7 and #10, Dongju (`c5b8fc0`, `a15b2c5`); Shackleton refresh, Dongju (`c6b018e`) | PGDA truth extraction self-test: 5 points identical, projection 0.000 m (row 12, card 5, Dongju) | **Integrator:** statistics recomputed from the 240 points (`docs/SI_USAGE.md:34`); named MAE/bias recomputed (`:38`); `067f7c8`: SHACKLETON_RIM named row recomputed from the merged horizon with an own Skyfield 2020–2038 ephemeris, exact (0.84488 / 0.53847), PGDA pixel read directly (0.87060 / 0.53748) | `5da68cd` (PR #7), `09a70f9` (PR #10), `067f7c8` | Independently verified (other member): Jiyong task V, all 240 random masks/fractions independently rebuilt; stored fraction max 0.000496292 pp. Earth-definition MAE 3.874107 to 1.239464 pp; 112 residuals >0.1 pp retained. See task V appendix; not an exact PGDA geometry match |
| 8 | `gmaps/` (3.8 km whole-Moon map) | Engine: Sua (s2-global-maps-sua); run: card 9, PR #9, Soyun (`7de0271`) | Own re-implementation at 400 points 75–85° S: engine vs independent code MAE 0.37 pp (row 11, Soyun); cell-centre recomputation equals the stored map (`docs/card14_pgda_analysis.md`, run B5, Soyun) | **None recorded for the map values.** Merge `3d7d86d`: no check listed. Merge `1c950be` re-derived the PGDA statistics from the stored map (Sun 4.337 pp, r 0.8232): a statistics check, not a recomputation | `3d7d86d` (PR #9) | Independently verified (other member): Jiyong Sung recomputed 10 random cells with separate code, max 9.4 × 10⁻¹² pp vs the original CPU engine, published PNG 30/30 DN identical (appendix below). Gap: the producer's raw float32 grid is not published, so no raw-array comparison |
| 9 | `gmaps_ppd32/` (948 m whole-Moon map) | Card 14, PR #35/#39: CPU rows and merge Soyun (`5237b76`), CUDA rows Jiyong | CPU vs CUDA identical at 400 cells (Soyun, `docs/card14_pgda_analysis.md`); 600 latitude-stratified cells, max 2.96 × 10⁻⁶ pp (Jiyong, PR #41) | **Integrator:** `1c950be`: 10 overview pixels (5 CPU rows, 5 CUDA rows, 2 poleward of 85° S) recomputed with the CPU engine and the export's resampling: 30/30 values identical; `086a9ed`: 6 cells recomputed, max 1.3 × 10⁻⁶ pp | `1c950be` (PR #39), `086a9ed` (PR #41) | Independently verified (sample) |
| 10 | `local/` (±10 km grids, 33 sites) | Card 18, Jiyong (6 polar, `5982e09`); card 20, PR #26, Dongju (27, `792b1dd`, `c2f424e`) | `docs/card18_validation.json` (Jiyong); `docs/card20_validation.json` (Dongju) | **Integrator:** `bab473b`: own 720-azimuth PGDA horizons + `ephem.bin` loop at 5 nodes in 3 regions (incl. the Malapert headline pair), max diff 0.009 pp; `f8d29a6`: centre node = metrics file 33/33, own horizons at 5 nodes within 0.007 pp, headlines 38.65 / 6.70 pp and IQR 17.16 / 0.40 pp reproduced | `bab473b`, `f8d29a6` (PR #26) | Independently verified (sample) |
| 11 | `uncertainty/` (±500 m, 121 nodes, 33 sites) | Non-polar 17: Sua (`30c64f6`); south-polar 16: PR #27, Jiyong (`27a0470`, `acff6f4`) | Non-polar: own brute force at 15 nodes, max 0.021 pp (row 20, Sua); polar: separate verifier, 15 nodes, difference 0, centres 16/16 exact (`docs/coordinate_uncertainty_check.json`, Jiyong) | **Integrator (polar part):** `33a7342`: centre node = metrics 16/16; own PGDA horizons + `ephem.bin` loop at 5 nodes within 0.146 pp. Non-polar part: the checks in `ed25936` (centre 17/17, 5 nodes ≤ 0.014 pp) were run by the integrator, who is also its author. **Other member (Jiyong, task B, `0df3fcd`):** all 17 non-polar sites / 2,057 nodes and 1,020 radius statistics independently recomputed; production-serialized differences 0 pp / 0 h; unrounded max 0.002281855 pp. [Full evidence](task_b_full_check.md) | `ed25936`, `33a7342` (PR #27) | Independently verified (full non-polar part; sample south-polar part) |
| 12 | `date_slip/` (33 sites × 730 landing days) | Card 19, PR #25, Dongju (`68182a1`) | `pipeline/verify_date_slip.py` → `docs/date_slip_check.json` | **Integrator:** `812cc94`: own loop over `ephem.bin` + horizons reproduces all 33 × 730 × 4 series values to 4 decimals (max diff 0). Scope: all values | `812cc94` (PR #25) | Independently verified (full) |
| 13 | `monthly/` (seasons, 33 sites × 60 months) | Sua (`7bbf35e`) | Own numpy check, 3 sites × 6 random months + all 60; 33/33 five-year means = metrics (row 19) | **None by another person.** The check in merge `4a760de` was run by the integrator, who is also the author  **Jiyong, task Q (`ee9a62b`):** all 33 x 60 months, all lunation fractions, latitude extrema and totals; serialized values identical. Raw rounding residual max 0.005 pp / 0.000498163 deg, durations 0 h. | `4a760de` ; `ee9a62b` | Independently verified (other members): previous Dongju sample plus Jiyong full 33-site / 1,980-month recomputation; see task_pq_check.md |
| 14 | `windows/` (Sun/Earth visibility windows, 33 sites) | Card 15-B, PR #19, Minchul (`3ae1974`) | 20 window edges per site vs the app's `core.js` (`docs/windows_verification.md`) | **Integrator:** `7ddda73`: own sunlit/Earth bits from `ephem.bin` + horizons for SHACKLETON_RIM, ARTEMIS_HAWORTH, APOLLO17: every interval identical (Sun 226/179/63, Earth 68/68/1), 20 random edges each matched to the hour  **Jiyong, task P (`ee9a62b`):** every interval for all 33 sites (3,022 Sun / 969 Earth), 472 longest gaps; edges and durations 0 difference, no missing or extra interval. | `7ddda73` (PR #19) ; `ee9a62b` | Independently verified (other member): Jiyong full 33-site window recomputation; see task_pq_check.md |
| 15 | `hindcast.json` (real missions) | Card 21, PR #28, Dongju (`43d0bba`) | 3 rows re-derived from Horizons: Δ ≤ 0.0002°, 0 min (row 21) | **Integrator:** `e97de2d`: own Skyfield Sun elevation at the landing times: Apollo 11 10.7035° (doc 10.70), Apollo 17 13.3501° (doc 13.35); sources opened (ALSJ six values, NASA, ISRO) | `e97de2d` (PR #28) | Independently verified (other member): Jiyong task R, six stored Apollo values max 0.000641284 deg vs Horizons; all five conditional sunset edges 0 min; 18 independent landing geometries. Source-time conflicts retained; see task R appendix |
| 16 | `globe/` (3D Moon tiles, display) | Sua (`f373647`); south z8 tiles from PGDA 10 m, PR #15, Soyun (`875cdbb`) | Projection + height-encoding self-test (`docs/globe3d.md:30`, Sua); z8 tiles: decoded heights within 0.251 m of the 10 m source, 462 shared edges identical (`docs/card14.md:102–103`, Soyun) | **Other members:** Soyun C1 below (10 original-DEM samples, max 0.218 m); Jiyong task D: 160 vertices over band z4-z7 / south z3-z6, all encoded heights equal, unquantized max 0.248621 m; 1,638 target PNGs intact, 2,549 same-zoom shared edges identical, both NASA TIFF-derived albedos byte-identical. [Evidence](task_d_check.md) | `b80ebae`, `8e6c0d8` (PR #15); checker `f564948` | Independently verified (other members, C1 + D). Fine-level samples and albedo gap closed using published source-window origins. Remaining scope: all-pixel DEM heights, normal borders, cross-LOD/band-cap joins and south z8 geometry not independently checked here |
| 17 | `hterrain/tiles/` (global terrain for user points) | Sua (`f4ef867`) | Browser horizon vs Python `horizon.py` on the same tiles RMS ≤ 5.33 × 10⁻¹¹°; vs full LDEM_64 RMS ≤ 0.155° (`web/data/hterrain/validation.json`; row 14) | **None by another person** (merge `36a30e6` lists no check) | `36a30e6` | Independently verified (other member, C2): Soyun Jeong decoded random near/far tile samples against LDEM_64 / LDEM_16, max 0.373 m (tolerance 0.51 m); Task U adds 30 northern points: same-input controls agree, but high-resolution reference comparison FAILS row-14 targets (median RMS 0.559387 deg, max Sun 5.348667 pp). North badge remains; see appendix |
| 18 | `hterrain/polar_s/` (south-polar terrain for user points) | Sua (`33831da`); sparse p5/p10 extension: Jiyong, task F / PR #63 (`b5bdced`) | vs the card 8 chain (Jiyong's horizons) at 16 sites + 30 random points: median RMS 0.085° / 0.027°; PEAK_NEAR_SHACKLETON +2.40 pp written as a known limit (row 14) | **None by another person.** The checks in merge `d300e04` (3 points) were run by the integrator, who is also the author | `d300e04` | Independently verified (other members): Soyun Jeong (C2) polar tile samples equal round(original / q) × q; Jiyong Sung: browser Worker vs a separate march on the same tiles at 3 points, 0 pp, max 0.00005°. Gap kept (updated 2026-11-15 after the PR #63 5/10 m patches, official re-run): against the card-8 chain the custom polar path reads sunlight within 0.33 pp at the 16 sites (PEAK_NEAR_SHACKLETON +0.08 pp, was +2.40/+2.43 pp) and ≤ 0.42 pp at 30 random points, horizon max 0.80°; outside the 4 km patches 85–90° S points still use 20 m near-field terrain (VALIDATION row 14 / L9) |

## Count

| Status (updated 2026-11-15, tasks R/U/V; other pending PRs excluded) | Products | Which |
|---|---:|---|
| Independently verified by the integrator before merging | 7 | horizon, metrics, relay, 948 m map, local grids, uncertainty (south-polar part only), date_slip |
| Independently verified by another team member | 11 | ephem, korea (`stations.json`), sites, 3.8 km map, monthly (task Q), windows (task P), globe tiles, hterrain tiles, custom polar terrain, validation (task V), hindcast (task R) |
| Author-verified only | 0 | — (but see the gaps below: parts of some products were never sampled by another person) |
| Not verified | 0 | — |

The interim counts in the appendices below (12/18, 14/18) are superseded by this table.

**Known gaps (kept from the rows and appendices):**
- `uncertainty/` non-polar gap **closed by task B**: Jiyong independently recomputed every node and radius statistic at all 17 sites; see [full check](task_b_full_check.md). South-polar verification remains sampled.
- `korea/`: task C fully compared station windows and all 33-site links; geometry passes. Remaining: 6 KST dates differ by one displayed minute; the Goldstone/Madrid window files contained NaN (failed strict JSON parsing) and were rewritten with `null` for the clipped windows' missing peak on 2026-11-15 (all other values identical; `pipeline/korea_links.py` now refuses NaN). See [task C](task_c_check.md).
- `globe/`: task D closes the missing-origin/fine-level sample/albedo gaps (160 vertices, 2,549 same-zoom edges, both complete albedos). All-pixel DEM heights, normal borders, cross-LOD/band-cap joins, browser rendering and south z8 geometry remain outside this check.
- `hterrain/polar_s/`: before PR #63 it read +0.20 to +2.43 pp sunlight against the card-8 originals (horizon max 0.52°). After the 5/10 m patches (official re-run 2026-11-15) the 16 sites are within 0.33 pp and 30 random points within 0.42 pp; outside the 4 km patches 85–90° S points still use 20 m near-field terrain. This is a measured resolution limit, not an implementation error.
- `gmaps/`: the producer's raw float32 grid is not published; the check compares with the original engine and the published PNG.
- `horizon/`: task A fully recomputed 33/33 sites and 23,760 angles; one unresolved angular failure at CHANGE6 231 deg (+0.0604630281 deg vs 0.05 deg). All 33 sunlight fractions pass. See PR #65 and task_a_horizons/report.md. Integrator re-march of that ray (2026-11-15): a single narrow peak at 10.62 km gives 0.138 deg at 30 m steps, 0.230 deg at 5 m and 0.233 deg at 1 m, so the production step (~75 m) missed it; the checker value is right. Sunlight effect 0 pp; kept as a known limit, production unchanged.
- Most checks are samples. Task B fully recomputed the 17-site non-polar uncertainty part; `date_slip/`, task A horizons (33/33 sites, one retained angular failure) and task C station/window/link scopes were recomputed in full, with the KST/JSON exceptions above. None is a check against the real lunar surface.

Only `date_slip/` was recomputed in full as an entire original product; task B additionally fully covers the non-polar uncertainty part (17/33 sites), and task C the station/window/link scopes (exact KST rows and strict JSON checks retain the reported exceptions). Other scopes remain as recorded.

## Cross-checks of the author-only products (added 2026-11-15)

One row per check of the six "author-verified only" products, by a member who did not produce them, with
their own code. The status column and the counts above are updated by the integrator once all six rows are in.

| Product | Checker | Method | Sample | Max diff | Pass / fail |
|---|---|---|---|---|---|
| `sites.json` (Minchul) | Dongju Kim | Coordinates re-read from the original source pages (NSSDCA tables, LROC post, ACD-50044 Table A2-2 p. 58 PDF text, Frontiers article), compared with `sites.json`; `pipeline/crosscheck_sites_dongju.py` → `docs/crosscheck_sites_dongju.json` | 5 random sites (seed 20261114): APOLLO16, IM1, DE_GERLACHE_RIM1, IM3_REINER_GAMMA, LUNA24 | 0.0000° (5/5 identical to the published precision) | Pass |
| `monthly/` (Sua) | Dongju Kim | Own plain-Python hourly loop over `ephem.bin` + `horizon/<ID>.json` (no `core.js`, `seasons.mjs` or `verify_seasons.py`); `pipeline/crosscheck_monthly_dongju.py` → `docs/crosscheck_monthly_dongju.json` | 3 random sites × 3 random months (seed 20261115): ARTEMIS_HAWORTH 2029-09, 2029-10, 2030-02; APOLLO12 2029-03, 2029-07, 2030-06; DE_GERLACHE_RIM1 2026-11, 2026-12, 2027-11 | 0 h in sun / Earth / both hours and longest dark; fractions 0 at 4 dp (9/9 identical) | Pass |

## Claim for the SI disclosure and validation text

> All 18 published data products were re-checked by someone other than their author, who recomputed a sample with separate code (site coordinates: re-read from the sources); on identical inputs, differences were at most 0.15 percentage points, 0.004° or 0.37 m (tiles, within encoding steps); known gaps are listed in docs/verification_ledger.md.

(Updated 2026-11-15. The earlier 12-of-18 sentence is superseded. Largest same-input differences: 0.146 pp, coordinate uncertainty polar nodes; 0.0035°, SHACKLETON_RIM horizon; 0.373 m, hterrain tiles with a 0.51 m tolerance.)

This replaces "every number was independently re-verified", which the records do not support.

## Additional independent checks by another member (after the ledger snapshot)

Requested by the team lead (Sua Kim) on 2026-11-14 and run on main `8eff7ac` (web version 28) with `python pipeline/verify_terrain_tiles.py` → `docs/terrain_tiles_verification.json` (details: `docs/terrain_tiles_verification.md`). The checker's own code decodes the tiles, places the samples and reads the original DEMs; no production decoder, sampler or builder is imported. The 18 rows above and the Count table are left as recorded; their owner may update rows 16–18 from these entries.

| # | Product | Producer | Checker | Method | Samples | Max difference | Result |
|---|---|---|---|---|---|---|---|
| C1 | 3D globe terrain tiles (`globe/`: band z1–z3, north cap z0–z2, south z7 from PGDA 20 m; south z8 excluded because the checker computed it) | Sua Kim | Soyun Jeong | Independent tile decoding and comparison against original NASA LOLA DEM | 10 | 0.218 m (mean 0.088 m; tolerance 0.26 m = 0.5 m PNG step / 2 + 0.01 m) | PASS |
| C2 | Custom-coordinate terrain tiles (`hterrain/tiles/` near 32 ppd and far 16 ppd; `hterrain/polar_s/` p20, p60, p240) | Sua Kim | Soyun Jeong | Independent decoding and comparison against original NASA LOLA DEM | 10 | 0.373 m (mean 0.170 m; tolerance 0.51 m for the 1 m global steps, q/2 for polar: 0.125 m p20/p60, 0.25 m p240) | PASS |

**Originals.**
- LOLA LDEM_64 and LDEM_16 float V3.1 (PDS Geosciences, `.../lola_gdr/cylindrical/float_img/ldem_{64,16}_float.img`).
  - Local copies have the server's byte size (1,061,683,200 / 66,355,200).
  - Every byte range the check reads was also fetched from the PDS server and compared: LDEM_64 64 ranges and LDEM_16 3 ranges, 0 mismatches.
  - Labels read: centre-registered pixels, km above 1737.4 km, no missing constant.
- PGDA `LDEM_80S_20MPP_ADJ.TIF`, `LDEM_60S_60MPP_ADJ.TIF`, `LDEM_60S_240MPP_ADJ.TIF`: read over HTTP from the file URLs `https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/<file>` listed on https://pgda.gsfc.nasa.gov/products/90 (Content-Length 2,696,082,051 / 3,089,110,093 / 218,961,039 B). GeoTIFF pixel-is-area; centre = corner + (c + 0.5) × res.

**Expected values follow each product's documented rule** (not the nearest pixel of another resolution, which would differ by up to 12.3 m here):
- C1 LDEM levels: bilinear between the pixel centres of the coarsest k × k block mean of LDEM_64 whose pixel is ≤ 1.01 × the tile spacing (8, 16 or 32 ppd).
- C1 south z7: bilinear on PGDA 20 m.
- C2 near: 2 × 2 block mean of LDEM_64. C2 far: LDEM_16 node.
- C2 polar: the PGDA pixel itself.

**C1 samples** (tile, vertex lat/lon, original → tile m, |Δ| m):

| Tile | Lat, lon | Original → tile (m) | \|Δ\| (m) |
|---|---|---|---|
| band/1/4_2 | −18.00000, −31.07812 | −2079.577 → −2079.5 (LDEM_64 8 ppd) | 0.077 |
| band/2/6_3 | +3.02344, −61.45312 | −1653.390 → −1653.5 (16 ppd) | 0.110 |
| band/3/32_10 | −20.70703, +110.81250 | 1005.912 → 1006.0 (32 ppd) | 0.088 |
| north/0/0_0 | +74.16230, −62.50716 | 340.046 → 340.0 (8 ppd) | 0.046 |
| north/1/0_1 | +77.49252, −58.86690 | −510.023 → −510.0 (16 ppd) | 0.023 |
| north/2/2_2 | +84.88102, +0.80693 | −1352.718 → −1352.5 (32 ppd) | 0.218 |
| south/7/64_50 | −86.05689, +1.73571 (ARTEMIS_MALAPERT, 6.7 km) | 4862.494 → 4862.5 (PGDA 20 m) | 0.006 |
| south/7/71_49 | −85.18694, +27.63862 (MOUTON_PLATEAU, 3.3 km) | 5002.798 → 5003.0 | 0.202 |
| south/7/71_50 | −85.46531, +28.74905 (MOUTON, 7.6 km) | 6023.455 → 6023.5 | 0.045 |
| south/7/43_56 | −83.64099, −70.60893 (CABEUS_B, 4.3 km) | 2646.561 → 2646.5 | 0.061 |

**C2 samples**:

| Tile | Case | Lat, lon | Original → tile (m) | \|Δ\| (m) |
|---|---|---|---|---|
| near/1_18 | random | +69.32812, +91.39062 | −2023.051 → −2023 (LDEM_64 2 × 2) | 0.051 |
| near/0_22 | random | +79.79688, +155.48438 | 817.082 → 817 | 0.082 |
| near/10_14 | random | −65.60938, +42.42188 | −178.731 → −179 | 0.269 |
| near/1_23 | last column wraps to global column 0; same value in tile 1_0 column 0 | +69.73438, −179.98438 | −444.870 → −445 | 0.130 |
| far/5_10 | random | −71.71875, +146.65625 | −2332.627 → −2333 (LDEM_16) | 0.373 |
| far/4_5 | random | −39.65625, −12.03125 | −1379.879 → −1380 | 0.121 |
| far/5_4 | last row clamped at the pole | −89.96875, −44.46875 | 860.690 → 861 | 0.310 |
| polar_s/p20/12_24 | random | −86.34159, +83.01779 | 614.797 → 614.75 (PGDA 20 m) | 0.047 |
| polar_s/p60/13_21 | random | −83.61580, +75.46682 | −917.906 → −918.00 (PGDA 60 m) | 0.094 |
| polar_s/p240/6_0 | random | −69.73467, −112.67522 | −2402.283 → −2402.5 (PGDA 240 m) | 0.217 |

Every decoded global value equals round(original); every polar value equals round(original / q) × q.

**Scope and limits.**
- 10 samples per product (fixed seed 20261115), not all tiles.
- Not covered:
  - the band fine levels z4–z7 (SLDEM2015 / PGDA 60 m windows; SLDEM2015 not read here)
  - the south z3–z6 fine levels (box means of the PGDA 20 m site windows, whose window origins are not recorded in the repository)
  - the albedo texture
- A PASS confirms the tiles encode the stated DEMs as documented. It is not a check of the DEMs against the real surface.
## Additional independent checks — Jiyong, 2026-11-14 23:39 KST

The table/count/claim above is the preserved PR #53 snapshot at main `115d285`;
its 12-of-18 count and shared 0.15 pp / 0.004° sentence are **not an updated bound for the checks below**.
This appendix uses new OpenAI Codex-assisted code, independent of the producers' check scripts.
Inputs: main `6829725`; custom-polar Worker/sampler/index match `s4-custom-polar-sua` (`33831da`).
Full method, limitations, all samples and reproduction: [independent cross-check report](crosscheck_maps_polar.md).

| Product | Computed by | New independent recomputation | Recorded differences / scope | Status after this check |
|---|---|---|---|---|
| `gmaps/` (3.8 km whole-Moon map) | Soyun, card 9 / PR #9; original CPU engine by Sua | Jiyong's separate DEM reader, full CPU ray march and Sun/Earth loop; ten deterministic random source cells, seed 53142026; four supporting cells for each nearest published overview pixel, 40 unique cells total including the ten centres | Max vs original CPU engine **9.4147e-12 pp** over Sun/Earth/both. Published PNG **30/30 DN values identical** after own interpolation/quantization (0 pp); pre-quantization residual ≤ **0.198773 pp** within its 0.2 pp rounding half-step. Producer's raw float32 grid unavailable, so no claim of direct raw-array equality. [Evidence](crosscheck_maps_polar/map_check.json) | Independently verified by another member (10 sampled source cells + published overview encoding) |
| `hterrain/polar_s/` (custom south-polar terrain) | Sua, `s4-custom-polar-sua` / `33831da` | Jiyong's independent card-8 PGDA-chain full march and time loop versus actual browser Worker at SHACKLETON_RIM, PEAK_NEAR_SHACKLETON, ARTEMIS_MALAPERT; second control independently decodes and marches identical browser tiles | Against card-8: RMS **0.105267 / 0.140531 / 0.063066°**, max **0.519843 / 0.413379 / 0.327241°**, Sun **+1.220792 / +2.430175 / +0.198521 pp**. Same browser tiles: all **2160 angles identical after output rounding**, unrounded max ≤ **0.000050°**, Sun difference **0 pp**, independent loop equals browser core. [Evidence](crosscheck_maps_polar/polar_check.json) | Independently verified by another member on identical inputs; high-resolution agreement is limited by the explicitly measured DEM-product differences |

With these two checks alone added to PR #53, **14/18 products have independent sample recomputation**
(10 integrator, 4 other member); **4 remain author-only** in this snapshot: sites, monthly, globe tiles,
and global hterrain tiles. Other team members' pending checks are not counted here. The custom-polar
control verifies implementation agreement, **not high-resolution equivalence or a universal <1 pp accuracy**.
All values above are sample results, not bounds on absolute physical accuracy. No production numbers changed.

## Full non-polar uncertainty recomputation — Jiyong, task B, 2026-11-15

Producer: Sua Kim. Checker implementation commit: `0df3fcd`; input main `89a9af1`. Existing product count is unchanged; the count table above remains its dated snapshot.

| Product / scope | Independent method | Full coverage | Maximum difference | Result |
|---|---|---|---|---|
| `uncertainty/`, all 17 non-polar sites | Own SLDEM/PDS readers, full 720-azimuth / 4,001-distance Cartesian rays (CuPy FP64), own hourly ephemeris loop; no repository imports. Separate CPU PROJ/ECEF controls at centre + corner of every site | **2,057/2,057 nodes**, four metrics, **1,020/1,020** min/max/p10/median/p90 statistics over 100/300/500 m discs | Production serialization: **0 pp**, longest dark **0 h**, all radius statistics identical. Unrounded independent fraction max **0.002281855 pp**, dark **0 h**. GPU/CPU controls: 34 nodes, max **1.68223e-10°**, all rounded metrics equal | **PASS**, 0 failures vs task B's 1 pp fraction criterion; darkness reported without an assigned threshold |

[Method and all-site table](task_b_full_check.md), [full JSON with source hashes and every failure](task_b_full_check.json), [all node comparisons](task_b_nodes.csv), [all radius comparisons](task_b_ranges.csv). Values from the full recalculation, not a sample extrapolation. The native DEM resolution and hourly/azimuth/radial sampling remain model limits; this checks implementation consistency, not absolute surface accuracy. Production files are unchanged.

## Task F candidate development check — Jiyong, 2026-11-15

| Product | Change and scope | Measured comparison | Status |
|---|---|---|---|
| hterrain/polar_s sparse p5/p10 | 16 centres + 32 fixed-seed nearby points versus original card-8 chain; 210 native tiles | Mean absolute Sun difference 0.494022 → 0.112429 pp, max 3.984118 → 0.588719 pp; Earth max 3.653249 → 0.502008 pp. SHACKLETON longest-dark difference worsens −2 → +14 h. [Full report and every regression](task_f_custom_polar.md) | Developer comparison, not another member's independent verification; integrator review required. Existing global validation/counts are unchanged. |

## Task W full assumption sensitivity — Jiyong, 2026-11-15

| Product / scope | Implementation and evidence | Results | Status |
|---|---|---|---|
| 33 catalogue sites × heights 0/2/10 m × near-field included/excluded (198 cases) | Standalone copied-definition FP64 GPU march + NumPy time loop, no repository module imports; code/results commit `c9e08a4`; [full report](task_w_sensitivity.md), [198 rows](task_w_cases.csv), [all 159 threshold exceedances](task_w_exceedances.csv) | Production baselines 33/33 exact stored masks and metrics. 18 CPU PROJ/ECEF geometry controls: max 4.285773958e-9 deg, metric difference 0. Scenario max Sun change 46.278295 pp (0 m), Earth 18.937112 pp, longest dark 4499 h. At 2 m, near-field Sun effect max 13.371668 pp polar / 0.798649 pp nonpolar. | Complete sensitivity experiment; scenario changes are not physical errors. Same-author GPU/CPU controls share DEM reader and metric loop; not new independent team verification of self-produced data. Existing verification counts unchanged. |

## Task C full comparison — Jiyong, 2026-11-15

Code/results `a78d83c`; [full report](task_c_check.md). 10,517,764 minute samples across four stations; 7,058 windows, no missing/extra; max edge difference 1.0029296875 s (≤60 s). All 175,296 station-hour bits, 5,784,768 site-station link bits and 33 actual-app totals agree exactly (max difference 0 h). KDSA 1,826 dates/2,516 rows checked: six dates fail exact displayed-minute equality (one-minute differences). Two boundary-window peak NaNs make Goldstone/Madrid files invalid strict JSON. These failures are retained, not rounded away. Own search/KST/NumPy loops; Skyfield/DE440s and lunar ephemeris/horizon inputs are shared, not independent astronomy/terrain truth. Three tests, stale-reference rejection and fingerprinted resume passed; separate AI code review is not counted as an additional team member.

## Task D fine globe and albedo verification — Jiyong, 2026-11-15

Producer: Sua Kim. Separate checker code/results commit `f564948`, source-window manifest `8fd119b`; latest main `3086143` leaves these inputs unchanged. No production files changed. Existing product counts are unchanged.

| Scope | Independent calculation | Result |
|---|---|---|
| Band z4–z7 and south z3–z6 | 10 fixed-seed random vertices + 10 catalogue controls per level, original PGDA/SLDEM/LDEM pixels, reconstructed original box-filter phases, own PNG decode and projection | 160/160 encoded heights identical; unquantized max **0.248620272 m**, within the 0.5 m encoding step and 0.25 m half-step |
| Indexed files / target-level PNGs / same-zoom shared vertices | All 3,294 file paths; 1,638 full RGB PNG decodes; 2,549 adjacent shared-vertex edges including four longitude-wrap edges | No missing/malformed/constant target tile; all checked shared heights **0 m** difference |
| 8k and 2k albedo | Every RGB channel against the original NASA SVS TIFF, own LANCZOS/JPEG replay | Both re-encoded JPEGs byte-identical; TIFF/compression MAE 2.159976 / 2.077311 DN; not DEM height error |

[Report and reproduction](task_d_check.md), [full JSON and source/tile/code hashes](task_d_check.json), [all vertices](task_d_vertices.csv), [all 34 reconstructed native windows](task_d_windows.csv). Source data acquisition readers are reused; the numerical checker imports no production builder/sampler/verifier. Original 18 PGDA window origins are now published, resolving the previous source-phase blocker. These are display-data consistency checks, not physical elevation accuracy or a guarantee of gap-free browser rendering. Normal border pixels, cross-LOD/band-cap joins and higher south-level geometry are outside this D audit. Earlier C1 scope notes remain historical.

Latest-main bookkeeping: PR #63 adds Jiyong as an author of `hterrain/polar_s/`; the author-set assertion in `verify_ledger.py` is updated accordingly. Existing independent checks apply to their recorded pre-F inputs; the F developer comparison is not reclassified as independent team verification.

## Tasks P/Q — full windows and monthly verification (Jiyong, 2026-11-15)

Separate implementation/evidence commit `ee9a62b`. P producer Minchul; Q producer Sua. All 33 catalogue sites independently recomputed from the existing ephemeris and stored horizons, without repository-module imports. **3,022 Sun intervals, 969 Earth intervals, 472 published longest gaps, 1,980 monthly rows**, plus every lunation fraction, latitude min/max and total. **58,301 comparison records pass; serialized numerical differences 0, edges/durations 0**. Raw rounding residuals at most **0.005 pp** and **0.000498163 degrees**. Sixty-six historical code-hash differences are solely CRLF/LF, retained explicitly with normalized-byte proof.

[Report](task_pq_check.md), [every comparison](task_pq_comparisons.csv), [provenance differences](task_pq_provenance_differences.csv), [13 tests and fresh/resume/fresh equivalence](task_pq_validation.json). Computation/evidence 1.714 s CPU; no GPU needed. This verifies the stored hourly-bin definitions, not physical minute-level rise/set accuracy or independent ephemeris/DEM truth. The status counts become 9 integrator / 9 other member because windows now has a full other-member check; product count remains 18.

## Task X — nonpolar 250 m local maps (Jiyong, 2026-11-15)

Adds 17 complete nonpolar maps (28,577 nodes), preserving the 16 existing polar maps and all local/ files. Producer implementation `3ac7f3b`; [report](task_x.md), [all results](task_x_results.json), [full developer verifier](task_x_check.json), [validation commands](task_x_validation.json). All 17 centres exactly equal production metrics; all 2,057 nodes shared with the existing 1 km grids match exactly (0 pp / 0 h). CPU versus GPU at 85 centre/corner controls yields identical metrics. Separate CPU full rays and time loop at 15 random nodes also yield 0 pp / 0 h. **These are developer controls, not independent team sign-off; another member must verify before merge.** No status-count credit is added for checking one's own new product.

The 1/3/5 km distributions use the new 250 m grid; the 10 km distributions use the existing 1 km grid with explicit spacing labels. Full run 977.2 s including source waits, preflights and exports; 16 pilot nodes resumed. Discovery index hashes normalize CRLF to LF, while scientific evidence records actual execution bytes. No absolute physical-error claim follows from agreement on identical inputs.

## Task A full horizon recomputation — 2026-11-15, PR #65

Checker: Minchul Kim; producers: Jiyong Sung (16 polar), Soyun Jeong (17 non-polar). Every published bin and hourly sunlight fraction was recomputed with separate original-DEM readers and geometry, without pipeline/web JS imports. **Complete does not mean PASS:** 1/23,760 angular failures remains (CHANGE6, 231 deg, +0.0604630281 deg); Sun 33/33 PASS, max 0.0114092735 pp. Initial 19 failures and all refined results are retained. Latest-main input equality and full tables: [report](task_a_horizons/report.md), [audit](task_a_horizons/resume_audit.json), [failed ray](task_a_horizons/failed_angles.csv). The previous snapshot counts, sample-only wording, and shared 0.004-degree sentence above are historical and must not be read as current bounds for this full check. No production data changed; integrator review is pending.

## Tasks R / U / V — full requested scope, Jiyong, 2026-11-15

Input main `274e676`; implementation/evidence commit **dc53eca**. AI-assisted independent checker code; no production files changed. These rows update evidence and limitations, not absolute physical accuracy.

| Task / product | Scope and comparison | Result / remaining limit |
|---|---|---|
| R / historical landings | All 18 actually landed catalogue missions: own direct-observer geometry vs Horizons, max 0.000338859 deg, median 0.000005308 deg. Six existing Apollo landing values: max 0.000641284 deg. Five stored robotic sunset edges: 0 min difference; all five sunlit booleans agree. | Numerical thresholds PASS, conditional on existing masks/heights. Twelve missions have no stored numeric landing elevation. Source-time disagreements: Chandrayaan-3 120 s, IM-1 53 s; NASA Luna 24 02:00 vs 06:36 UTC unresolved, Sun sensitivity 2.076715182 deg. Historical NPZ was unavailable; no random-hour historical-product reverification or shutdown-truth claim. [Full report](task_r_audit.md), [source hashes](task_r_manifest.json). |
| U / north-polar browser terrain | All 30 stratified points 75–90 N vs original PGDA north 10/20/30→60→240 m chain and global fallback: median RMS 0.559386786 deg, max RMS 4.740184448 deg, maximum angular bin 10.087462805 deg; Sun max 5.348667397 pp, Earth max 13.298649142 pp, both max 5.175246440 pp. | **FAIL** row-14 median RMS≤0.2 deg and every-point Sun≤2 pp; 9 Sun failures retained. Three same-tile CPU controls: all 2160 rounded bins exact, unrounded max 0.000049995 deg, fractions 0 pp; actual core vs independent loop 0 pp at all30. Matched-start control and every failure retained. North accuracy badge unchanged; 30 samples are not universal bounds. [Report](task_u_north_check.md), [full masks/inputs](task_u_north_check.json). |
| V / PGDA Earth definition | All 240 random masks independently reconstructed; own 81,444-epoch loop and direct original PGDA pixels. Centre MAE 3.874106927 pp → upper-limb approximation 1.239463679 pp (68.006% reduction); stored any-part max difference 0.000496292 pp. Direct PGDA max below 0.00001 pp. | Reproduction PASS; residual >0.1 pp at112/240, maximum25.083492952 pp, alllisted. 148 improve/31 worsen/61 unchanged. Sixteen named metrics separately reproduced (max0.000462453 pp), using checker-authored existing masks: not independent verification of those masks. Whole-disk geometry equivalence, exact PGDA dates and observer height unresolved. [Report](task_v_earth_definition.md), [all256rows](task_v_earth_definition_rows.csv). |

Task K is an administrative audit, not an additional verified scientific product: [35 unique Jiyong SI entries across pinned main/current/pending branches including local storage migration, 17 rows with pending human cells](task_k_si_audit.md). Prior log entries and human cells are preserved. This table excludes the unmerged C/D/X/P/Q PR evidence from its status counts; each PR documents its own scope.

## Task Y independent member verification — PR #75

Checked PR head 9758ecdb156eae902881634090f53e4d2ea7d8e0 by Minchul Kim (producer: Jiyong Sung). Three original DEMs/sites: Haworth 5 m, Nobile Rim2 10 m, IM1 20 m. Own generic least-squares fits, scipy bilinear samples, PROJ/haversine masks and area sums; no pipeline/web numerical imports. Every native centre inside 100/500/1000 m circles re-evaluated.

Maximum slope difference 5.65769653349e-13 deg (criterion <=0.5); flat-area difference 1.16529008665e-12 pp (criterion <=1). Result **PASS** for the requested three-site scope. All 33 content hashes and relay-centre copies pass; terrain-specific contract and focused tests pass. Roughness additionally compared, max 1.11022302463e-16 m (diagnostic, no task threshold). [Report](task_y_independent/report.md), [all comparisons](task_y_independent/comparisons.csv), [source/byte evidence](task_y_independent/summary.json). No production data changed. Existing author-only statement remains a historical PR snapshot; this appendix supplies the separate member check, not a full 16-site numerical verification or physical safety certification.
