# Data contract v1.1 (fixed 2026-11-14 09:40 KST; v1.1 09:45 — Earth min/max fields added to validation, thanks Dongju)

Every card writes or reads these files. **Do not change a format without telling the team** (post in chat + edit this file in a PR).
Card 6 adds fake (mock) versions of every file by 09:40 (`"mock": true`), so UI work can start immediately. Real data overwrites them with the same names.

## 0. Conventions (all files)
| Item | Rule |
|---|---|
| Body frame | `MOON_ME` (DE421 mean-Earth / polar axis) — same frame as LOLA DEMs and PGDA maps |
| Latitude / longitude | degrees; lat −90…90; **lon −180…180, east positive** |
| Heights | metres above the reference sphere **R = 1737.4 km** |
| Azimuth | degrees, **0 = north, clockwise** (90 = east) |
| Elevation | degrees above the local horizontal plane (no refraction; the Moon has no air) |
| Time | **UTC**. Hour index `i` = hours since `2026-01-01T00:00:00Z` |
| Observer | 2 m above terrain |
| Binary | little-endian `float32`, row-major |
| IDs | `UPPER_SNAKE` (e.g. `APOLLO17`, `SHACKLETON_RIM`), unique; file names lowercase except IDs |
| Text | English in data files; Korean labels only in `name_ko` |

## 1. `web/data/sites.json` — owner: card 4
Array of objects:
```json
{
  "id": "APOLLO17", "name": "Apollo 17", "name_ko": "아폴로 17호", "short": "Apollo 17",
  "group": "apollo",
  "lat": 20.1908, "lon": 30.7717, "elev_m": null,
  "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
  "coord_quality": "primary",
  "note": ""
}
```
- `group` ∈ `apollo, luna, change, chandrayaan, slim, clps, artemis3_region, polar_peak, future, custom`
- `coord_quality` ∈ `primary` (official/paper value) · `secondary` (derived from imagery) · `estimated` (measured by us; explain in `note`)
- `short` ≤ 14 characters (fits a card). Artemis III regions: `note` = "region representative point".

## 2. `web/data/ephem.bin` + `ephem.json` — owner: card 1
- `ephem.bin`: `float32[N][6]` = `sun_x, sun_y, sun_z, earth_x, earth_y, earth_z` (km, Moon centre → body, MOON_ME, light-time-corrected apparent).
- 2026-01-01T00Z … 2030-12-31T23Z, 1-hour step → **N = 43,824** (≈1.05 MB).
- `ephem.json`:
```json
{"start": "2026-01-01T00:00:00Z", "step_h": 1, "n": 43824, "frame": "MOON_ME_DE421", "units": "km",
 "columns": ["sun_x","sun_y","sun_z","earth_x","earth_y","earth_z"],
 "source": "NAIF de440s.bsp + moon_pa_de421_1900-2050.bpc via Skyfield", "mock": false}
```
- Validation file (not shipped to web): `data/processed/ephem_2020-2038_2h.npz` (same columns) for the 18.6-year PGDA comparison.

## 3. `web/data/horizon/<ID>.json` — owners: cards 2 & 3 (DEMs), computed in phase 2
```json
{
  "id": "APOLLO17", "lat": 20.1908, "lon": 30.7717,
  "h0_m": -1820.5, "obs_height_m": 2,
  "az_step_deg": 0.5, "mask": [720 numbers, degrees, index k ↔ azimuth k*0.5],
  "max_range_km": 300,
  "dem_sources": [{"name": "SLDEM2015", "res_m": 59, "to_km": 150}, {"name": "LDEM_16", "res_m": 1895, "to_km": 300}],
  "mock": false
}
```
- Mask = maximum elevation angle of terrain along each azimuth, **lunar curvature included**. Between bins: linear interpolation.

## 4. `web/data/metrics/<ID>.json` (optional cache, phase 2)
`{"id", "window": "2026-01-01..2030-12-31", "sun_frac", "earth_frac", "both_frac", "longest_dark_h", "slope_deg"}` — fractions 0…1.

## 5. `web/data/validation.json` — owner: card 5
```json
{
  "window": "2020-01-01..2038-08-01", "step_h": 2, "n_points": 240, "seed": 42,
  "sun":   {"mae_pp": 0, "rmse_pp": 0, "r": 0, "within_pgda_60m_spread_pct": 0},
  "earth": {"mae_pp": 0, "rmse_pp": 0, "r": 0, "within_pgda_60m_spread_pct": 0},
  "points": [{"lat": -86.1, "lon": 12.3, "ours_sun": 0.41, "pgda_sun": 0.43, "pgda_sun_min60": 0.40, "pgda_sun_max60": 0.47,
              "ours_earth": 0.55, "pgda_earth": 0.56, "pgda_earth_min60": 0.52, "pgda_earth_max60": 0.58}],
  "named": [{"id": "SHACKLETON_RIM", "ours_sun": 0.0, "pgda_sun": 0.0, "pgda_sun_min300": 0.0, "pgda_sun_max300": 0.0,
             "ours_earth": 0.0, "pgda_earth": 0.0, "pgda_earth_min300": 0.0, "pgda_earth_max300": 0.0}],
  "pgda_files": ["AVGVISIB_85S_060M_201608.TIF", "AVGVISIB_85S_060M_201608_EARTH.TIF"], "mock": false
}
```

- `within_pgda_60m_spread_pct` = share of points where our value lies within that point's PGDA min…max over ±60 m (sun uses `pgda_sun_min60/max60`, earth uses `pgda_earth_min60/max60`).

## 6. `web/js/core.js` API — owners: card 6 (+ card 1 checks the maths)
| Function | Returns |
|---|---|
| `loadData()` | Promise; loads sites, ephem, horizons on demand |
| `siteFrame(site)` | local east/north/up unit vectors at the site |
| `sunAzEl(site, i)` / `earthAzEl(site, i)` | `{az, el}` degrees at hour index `i` (Earth with topocentric parallax) |
| `horizonAt(site, az)` | mask elevation (deg), linear interpolation |
| `sunVisibleFraction(site, i)` | 0…1, solar disk radius 0.2666° above the mask |
| `earthVisible(site, i)` | boolean, Earth **centre** above the mask |
| `untilSunset(site, i)` / `untilEarthset(site, i)` | hours until the next transition to not-visible (`null` if none within the window); `untilSunrise`, `untilEarthrise` likewise |
| `metrics(site, i0, i1)` | `{sun_frac, earth_frac, both_frac, longest_dark_h}` |
- "Sunlit" = `sunVisibleFraction ≥ 0.5`. "Both" = sunlit AND Earth visible.

## 7. Other shared files
- `web/version.json` `{"v": <int>}` — integrator bumps on every merge (TV auto-reload).
- `web/css/theme.css` — owner: card 7 (CSS custom properties only; everyone uses the variables).
- `data/DATASETS.md`, `docs/SI_USAGE.md` — everyone appends, never edits others' rows.

## 8. Check
Card 6 adds `python pipeline/check_contract.py`, which validates every file in `web/data/` against this contract (shapes, ranges, required keys). Run it before opening a PR that touches data.

## 9. Proposed v1.2 (horizon engine, 2026-11-14 10:05 KST, Sua) — NOT yet agreed; sections 0–8 unchanged
Written by phase 2 `pipeline/horizon.py` / `run_horizons.py`. Please comment in the PR.

**a. DEM cache formats the horizon engine reads** (as on the open branches `s1-polar-jiyong` and `s1-terrain-global-soyun`; local only, git-ignored):
| Cache | Arrays | Grid |
|---|---|---|
| `data/raw/polar/<res>/<ID>.npz` (card 2; res ∈ 5,10,20,60,80,240) | `height_m` float32 (NaN = no data), `x_m`, `y_m`, `metadata` (JSON string with `resolution_m`, `radius_m`, `projection`) | south polar stereographic `+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400`; pixel centres; x ascending, y descending (rows north→south) |
| `data/raw/sldem/<ID>.npz` (card 3) | `height_m` float32, `lat` (descending), `lon` (−180…180), `lon_unwrapped` (ascending, may exceed 360), `meta` (JSON string with `radius_km`) | SLDEM2015 512 ppd pixel centres |
| `data/raw/global/ldem_{16,64}_float.img` + `.lbl` (card 3) | raw PDS float32, km above 1737.4 km | simple cylindrical; row r centre lat = (LINE_PROJECTION_OFFSET − r)/ppd, col c centre lon = CENTER_LONGITUDE + (c − SAMPLE_PROJECTION_OFFSET)/ppd (0-based, lon 0…360 E) |

**b. DEM chain** (finest first; a point uses the first DEM that covers it, NaN falls through):
polar sites (lat ≤ −80): PGDA 5 → 10 → 20 → 60 → 80 → 240 m (each to its window radius) → LDEM_64 → LDEM_16 (to 300 km).
other sites: SLDEM2015 (|lat| < 60, to 150 km) → LDEM_64 → LDEM_16 (to 300 km). |lat| ≥ 60 outside the polar caches needs LDEM_64.
`dem_sources[].to_km` = farthest distance where that DEM actually supplied a sample.

**c. Extra keys in `horizon/<ID>.json`** (the app may ignore them): `engine` = `{min_km, max_km, n_steps, early_stop, hmax_m, engine_version, n_missing_samples, n_samples, chain}` (used for resume and QA), and `site_coords_mock` (true when the site coordinates in `sites.json` are still placeholders; the horizon itself is computed from real DEMs, so `mock` is false).

## 10. Proposed v1.2 — global maps `web/data/gmaps/` (phase 2 C5/C6, 2026-11-14 10:30 KST, Sua) — NOT yet agreed; sections 0–9 unchanged
Written by `python pipeline/global_maps.py export --ppd <P>` from the resumable grid in `data/processed/gmaps_ppd<P>/` (git-ignored).

**a. Grid** — MOON_ME, pixel centres `lat = 90 − (r+0.5)/P`, `lon = −180 + (c+0.5)/P` (P = `--ppd`; 8 ≈ 3.79 km, 32 ≈ 948 m). Each point: horizon over 360 azimuths to 300 km (near DEM LDEM_64 to 150 km, LDEM_16 beyond, curvature exact, observer 2 m), then metrics over the whole `ephem.bin` window (2026–2030) at a 2 h step. Definitions = section 6 (sun disk 0.2666°, Earth centre, sunlit ≥ 0.5).

**b. Files**
| File | Content |
|---|---|
| `index.json` | `ppd`, `grid_res_km`, `projection`, `tiles` {`size`: 512, `url`: `"tiles/{layer}/{z}/{x}_{y}.jpg"`, `levels`: [{`z`,`width`,`height`,`nx`,`ny`}]}, `overview_size` [4096, 2048], `layers` [{`id`, `units`, `definition`, `colormap` [[value, "#rrggbb"], …], `nodata_rgb`, `overview`, `values_png`, `stats` {min, max, area_mean}}], `rows_done`/`rows_total`, `ephem` (file, step, sha1, mock), `dem_sources` [{name, res_m, to_km}], `params`, `mock` |
| `tiles/<layer>/<z>/<x>_<y>.jpg` | colour JPEG, 512×512. Level z image = 1024·2^z × 512·2^z px, equirectangular, x from lon −180 (left edge), y from lat +90 (top edge); tile (0,0) = north-west. `zmax` = max(2, round(log2(360·P/1024))) → P=8: z 0–2, P=32: z 0–3 |
| `<layer>_overview.jpg` | 4096 × 2048 colour image of the whole Moon (same projection) |
| `<layer>_values.png` | 8-bit grey, 4096 × 2048: value = DN / 250 (0…1), DN 255 = no data — for hover read-outs and legends (JPEG colours are lossy) |

Layers: `sun` (mean visible solar-disk fraction), `earth` (fraction of time Earth centre above the mask), `both` (sunlit AND Earth visible). Colours: Sun = yellow ramp, Earth = blue ramp, both = violet ramp (stops in `index.json`; card 7 may change them, then re-export). No-data (rows not computed yet) = `nodata_rgb` grey.

## 11. Proposed v1.2 — `web/data/horizon_index.json` (2026-11-14, Sua, integrator) — NOT yet agreed; sections 0–10 unchanged
`{"ids": [<site IDs that have horizon/<ID>.json>], "note": "..."}`. The app fetches only the listed horizons (no 404s for missing ones);
every other site uses a flat 0° mask labelled **"Terrain pending"** (not counted as mock). Written automatically at the end of
`pipeline/run_horizons.py`; after merging horizon PRs run `python pipeline/run_horizons.py --index-only`.
`check_contract.py` errors if the index and the files disagree. If the index is missing, the app tries every horizon file (old behaviour).

## 12. Proposed v1.2 (relay towers, 2026-11-14, Sua) — NOT yet agreed; new section only (renumbered from 10 at merge; sections 0–11 unchanged)
`web/data/relay/<ID>.json`, written by `pipeline/relay_tower.py` (differentiator A, concept after NASA GRC BEACON, NTRS 20240014584).
```json
{
  "id": "SHACKLETON_RIM", "lat": -89.9, "lon": 0.0, "h0_m": 1700.0, "lander_antenna_m": 2,
  "window": {"start": "2026-01-01T00:00:00Z", "step_h": 1, "n": 43824},
  "params": {"radius_km": 20, "spacing_m": 250, "heights_m": [5, 15, 30, 50], "link_rule": "los",
             "bands_ghz": {"S": 2.2, "Ka": 26.0}, "los_step_m": 20, "n_steps": 1500, "max_km": 300,
             "earth_el_cap_deg": 45, "slope_box_m": 250, "max_slope_deg": 15, "n_towers": 3, "engine_version": 1},
  "dem_sources": [{"name": "PGDA_LOLA_5M", "res_m": 5.0}],
  "lander": {"earth_frac": 0.41, "longest_no_earth_h": 310},
  "candidates": {
    "n": 20109, "e_m": [..], "n_m": [..], "ground_m": [.. or null], "slope_deg": [..],
    "per_height": {"15": {"link": [0|1], "tower_earth_pm": [0..1000], "lander_link_pm": [0..1000],
                          "fresnel_S_pc": [..], "fresnel_Ka_pc": [..]}}
  },
  "best": [{"idx": 812, "height_m": 15, "e_m": -1250, "n_m": 3500, "lat": .., "lon": .., "dist_m": 3716.5,
            "ground_m": .., "slope_deg": 4.2, "link_to_lander": true, "min_clear_m": 6.1,
            "fresnel": {"S": 0.31, "Ka": 1.12}, "tower_earth_frac": 0.72, "link_frac": 0.74,
            "sun_frac": 0.81, "longest_dark_h": 120}],
  "networks": [{"height_m": 15, "towers": [{..same as best.., "parent": "LANDER" | 0 | 1, "gain_pp": 33.1}],
                "link_frac_by_n": [0.41, 0.74, 0.80, 0.82], "longest_gap_h": 52,
                "timeline": {"codes": {"0": "none", "1": "direct", "2": "via_tower"},
                             "segments": [[start_hour_index, length_h, code], ..]}}],
  "link_budget": {"estimate": true, "assumptions": {..}, "range_km": {"max": .., "mean": ..},
                  "results": [{"station": "DSN_34m" | "KDSA_35m", "band": "S" | "Ka", "range": "max" | "mean",
                               "cn0_dbhz": .., "max_rate_bps": .., "band_support": "assumed" | "unverified ..", ..}]},
  "inputs_mock": {"ephem": false, "site_coords": false}, "mock": false,
  "concept": "BEACON (NASA GRC, NTRS 20240014584): 15 m deployed boom, users up to ~10 km"
}
```
- Candidate `i` sits at local offset (`e_m[i]` east, `n_m[i]` north) from the lander, measured along the surface (great circle with azimuth atan2(e, n), distance hypot(e, n)); the lander itself is the candidate with e = n = 0.
- Integer encodings keep the file small: `*_pm` = per mille (0…1000); `fresnel_<band>_pc` = min clearance / first Fresnel radius × 100 over the interior of the path, clipped to −999…999 (999 = no interior sample). Clearance ≥ 60 (i.e. 0.6) is the usual "Fresnel clear" rule.
- `link` = 1 when the lander antenna (2 m) and the tower top are linked under `params.link_rule` (`los` = geometric line of sight with curvature; `fresnel60_<band>` = also ≥ 0.6 F1).
- `tower_earth_pm` = Earth centre above the tower-top horizon mask (horizon-engine geometry, observer height = tower height). `lander_link_pm` = direct OR (link AND tower sees Earth).
- `best[j]` = best buildable candidate (slope ≤ `max_slope_deg`) for height `heights_m[j]`; `sun_frac` = sunlit (≥ 0.5 disk) fraction at the tower top.
- `networks[j]`: greedy 1…`n_towers` towers at that height; `parent` = what the tower hangs on (`"LANDER"` or the index of an earlier tower in `towers`). `link_frac_by_n[0]` = direct only. Timeline segments cover the whole window in order; when direct works the code is 1 even if a tower also works.
- `link_budget` is a rough estimate with explicit assumptions (not a specification); the UI must label it "estimate".

### 12.1 Optional card-13 additions (2026-11-14, Jiyong)
Existing fields remain compatible. Engine v2 samples local links at at most 5 m intervals,
and horizons from 5 m to 300 km at 8,001 logarithmic distances. All Earth elevations are checked
against terrain (`earth_el_cap_deg` is retained as metadata, 90). DEM gates are measured from
the original lander even for a shifted tower; global rasters cover the entire tower ray.
Missing profile/horizon terrain aborts output instead of assuming clear sky.

- `input_identity`: DEM source names, radius gates, file byte sizes and nanosecond modification
  times, global label hashes, plus a SHA-256 of the actual Sun/Earth arrays and epoch. Used for
  resume invalidation. DEM file identity is **not** a cryptographic hash of the raster content.
- `height_curve`: four rows `{height_m, single_link_frac, network_link_frac, single_gain_pp}`;
  single is the selected `best` tower, network is the final greedy network, gain is percentage
  points over the direct fraction. Each height may choose a different location.
- `networks[].towers[].parent_link`: `{min_clear_m, fresnel:{S,Ka}}` for the actual parent hop.
  Existing `min_clear_m`/`fresnel` remain the path to the lander. Same-position paths have no
  interior samples: clearance `1000000` and Fresnel `999` are sentinels, not measured margins.
- `coverage` (Artemis III sites): a 15 x 15 km square centred on the lander. `rows=cols=60`,
  `spacing_m=250`, `origin_e_m=origin_n_m=-7500`; row-major, rows south to north, columns west
  to east. Cell centres are origin + (index + 0.5) x spacing. `valid_terrain` has 3,600 binary
  entries; `area_km2=225`, `valid_area_km2` counts available cell centres.
  `per_height["5"|"15"|"30"|"50"]` identifies the selected single tower and contains binary
  `los`, `fresnel60_S`, `fresnel60_Ka` arrays of length 3,600, plus corresponding `*_area_km2`.
  The receiver antenna is 2 m above its local terrain; range is capped at `max_link_range_km`
  (10 km in the batch run). Each represented cell contributes 0.0625 km²; areas are grid estimates,
  not precise terrain surface areas. Fresnel masks require both positive LOS and clearance ≥0.6 F1.
  Coverage means **local geometric antenna reach** only. It is not Earth-link availability,
  receiver sunlight, guaranteed throughput, or ground-station coverage. Tower Earth availability
  and sunlight remain in `best`. `params.coverage_side_km=0` disables the optional map.

The network is a greedy marginal-coverage heuristic, not a global optimum. A bridge that adds
zero immediate Earth-visible hours is not selected. Slopes are 250 m plane fits, not a survey
for construction. Frequencies and link-budget assumptions remain the existing configurable estimates.

## 13. `web/data/korea/*.json` — Korea links (differentiator B) — **v1.2 proposal** (2026-11-14, Sua; new section only, renumbered from 9 at merge; sections 0–12 unchanged)
Written by `python pipeline/korea_links.py`; tests `python -m pytest pipeline/test_korea_links.py -q`.

### 13.1 `stations.json` — Moon ≥ 10° above each ground station, hourly
```json
{"start": "2026-01-01T00:00:00Z", "step_h": 1, "n": 43824, "min_el_deg": 10,
 "bit_order": "LSB-first: hour k is bit (k % 8) of byte k // 8 of base64-decoded bits_b64",
 "stations": [{"id": "KDSA", "name": "...", "name_ko": "...", "antenna": "KDSA01 (DSN code 32)", "country": "KR",
               "lat": 37.20723347, "lon": 127.62181206, "height_m": 145.359, "ellipsoid": "...",
               "source": "...", "source_url": "...", "terms": "...", "frac_visible": 0.33, "bits_b64": "..."}],
 "summary": {"frac_any_dsn": 0.0, "frac_any_dsn_or_kdsa": 0.0, "frac_kdsa_only": 0.0, "frac_kdsa_and_no_dsn_of_kdsa_hours": 0.0},
 "mock": false}
```
- Station IDs: `KDSA`, `DSN_GOLDSTONE` (DSS-14), `DSN_MADRID` (DSS-63), `DSN_CANBERRA` (DSS-43). Station `lon` is Earth longitude, −180…180 east.
- Bit = apparent Moon **centre** ≥ 10° above the ellipsoidal horizon at the hour mark (no refraction, no local terrain). Decode in JS: `bytes[k >> 3] >> (k & 7) & 1`.

### 13.2 `windows_<station_id_lowercase>.json` — exact rise/set (1 s) at 10°
`{"station", "min_el_deg": 10, "time": "UTC", "columns": ["rise_utc","set_utc","max_el_deg"], "windows": [["2026-01-01T03:12:09Z","2026-01-01T12:40:51Z",55.1], ...]}`

### 13.3 `kdsa_daily_kst.json` — "when can Korea talk to the Moon tonight"
`{"station": "KDSA", "tz": "KST (UTC+9)", "columns": ["from_kst","to_kst","max_el_deg_of_whole_window"], "days": {"2026-11-14": [["18:05","24:00",62.3]], ...}}`
- A window crossing midnight is split per KST date (`"24:00"` / `"00:00"`). Helper: `web/js/korea.js` → `kdsaTonight(dateKST)`.

### 13.4 `danuri.json` — Danuri (KPLO) passes over catalog sites
```json
{"frame": "MOON_ME_DE421", "window": ["2026-01-01T00:00:00Z", "2027-06-03T07:55:00Z"], "step_min": 5,
 "prediction_after": "2026-11-10 ...", "orbit": {"alt_km_min": 0, "alt_km_max": 0},
 "definitions": {...}, "caveat": "Danuri carries no lander relay payload ... GEOMETRIC upper bound only",
 "track_sample": {"start": "...", "step_min": 5, "xyz_km": [[x,y,z], ...]},
 "sites": [{"id": "APOLLO17", "lat": 0, "lon": 0, "h0_m": 0, "mask": "terrain|flat", "site_coords_mock": false,
            "passes": {"start_i": [12.3417], "dur_s": [612], "max_el_deg": [41.2]},
            "n_passes": 0, "visible_frac": 0, "visible_frac_flat": 0, "direct_earth_frac": 0,
            "no_direct_hours": 0, "relay_covered_hours": 0, "relay_upper_bound": 0,
            "longest_uncovered_gap_h": 0, "median_pass_min": 0}],
 "mock": false}
```
- Only the overlap of Danuri's Horizons span with our window (2026-01-01 → end of Horizons prediction, 2027-06-03). After 2026-11-10 the trajectory is a **prediction**.
- `start_i` = hour index (fractional), `dur_s` = seconds. Pass = Danuri centre above the site mask (terrain mask if `horizon/<ID>.json` exists, else flat 0°).
- `relay_upper_bound` = share of the site's no-direct-Earth time when Danuri is above the site mask **and** sees Earth's centre past the lunar sphere. Geometry only.
- Sites = `sites.json` + Korea sites from `korea.json` (`sites_of_korean_interest`).

### 13.5 `korea.json` — sites of Korean interest + ShadowCam links
`{"sites_of_korean_interest": [<sites.json-style objects + "korea_link">], "shadowcam": {"terms": "...", "products": [{"target", "product_id", "label_url", "data_url", "browse_url", "size_bytes", "center_lat", "center_lon", "corners", "projection", ...}]}, "pending_questions": [...]}`
- ShadowCam: **links and metadata only, no image files** in the repo until the Seoul ops/SME answer on redistribution.
## 14. Proposed v1.2 — `web/data/hterrain/` browser height tiles for user-defined sites (2026-11-14, Sua) — NOT yet agreed; new section only (renumbered from 12 at merge; sections 0–13 unchanged)
Written by `python pipeline/build_custom_terrain.py --ldem64 … --ldem16 …`; read by `web/js/hterrain.js` (Web Worker `custom_horizon_worker.js`).
| File | Content |
|---|---|
| `index.json` | `grids.near` = LDEM_64 block-mean 2×2 → 32 px/deg (947.6 m), 15° tiles, used to 150 km; `grids.far` = LDEM_16 (1895 m), 30° tiles, 150–300 km. Each grid: `ppd, tile_deg, n (= ppd·tile_deg + 1), nx, ny, res_m, to_km, source`. `url` = `tiles/{grid}/{ty}_{tx}.i16.gz`, `overview` = `overview.png`, `mock` |
| `tiles/<grid>/<ty>_<tx>.i16.gz` | gzip of `n × n` int16 LE heights (m above 1737.4 km, rounded to 1 m), each row delta-coded along the row. Global pixel centres `lat = 90 − (r+0.5)/ppd`, `lon = −180 + (c+0.5)/ppd`; tile (ty, tx) = rows `ty·(n−1)…`, cols `tx·(n−1)…` (one shared row/column with the next tile; columns wrap at the dateline, the last row is clamped at the south pole) |
| `overview.png` | 1024 × 512 grey shaded relief (from LDEM_16), display only (click-to-pick mini map) |
| `validation.json` | summary written by `pipeline/validate_custom_horizon.py` (full report: `docs/custom_horizon_validation.json`), shown next to the resolution label |

A custom site's horizon object in the app = section 3 fields + `"browser": true`; it is never written to `web/data/horizon/`.
Its id is `USER_<N|S><lat>_<E|W><lon>` with `P` for the decimal point (e.g. `USER_S85P942_W0P944`); the URL keeps it as `?u=lat,lon;…` and recomputes on load.

### 14b. Proposed v1.2 — `web/data/hterrain/polar_s/` south-polar levels for user-defined points (2026-11-14, Sua, s4) — NOT yet agreed; new subsection only
Written by `python pipeline/build_polar_terrain.py`; read by `web/js/hterrain.js` when the point latitude ≤ `lat_edge_deg`.
| File | Content |
|---|---|
| `polar_s/index.json` | `pole` = "south", `lat_edge_deg`, `projection` (PROJ string: spherical polar stereographic, lat_0 = −90, k0 = 1, R = 1737400 m — the PGDA / card-2 grid), `levels` finest first: `name, source, source_url, res_m, q_m, to_km` (used for samples up to this distance from the point), `lat_edge_deg` (level used only for points at or poleward of it), `x0_m, y0_m` (first pixel centre), `tile_px, n (= tile_px + 1), nt` (tiles per side), `tiles` (list of `"ty_tx"` that exist; others = no data), `bytes`, `url` = `polar_s/<name>/{ty}_{tx}.bin.gz`; `mock` |
| `polar_s/<name>/<ty>_<tx>.bin.gz` | gzip of int32 LE base + `n × n` int16 LE residuals of `a = round(h / q_m)`: planar predictor `res[r,c] = a[r,c] − a[r,c−1] − a[r−1,c] + a[r−1,c−1]`, first row / column 1-D deltas, `res[0,0] = a[0,0] − base = 0`. Heights in m above 1737.4 km. Level pixel centre `x = x0_m + C·res_m`, `y = y0_m − R·res_m`; tile (ty, tx) = level rows `ty·tile_px … ty·tile_px + tile_px`, cols likewise |

Sampling chain for a polar point (same rule as `horizon.sample_chain`): for a sample at distance s, the first level with `to_km ≥ s` that has a tile there, then `grids.near` (to 150 km), then `grids.far` (to 300 km). March: 5 m → 300 km, 8000 geometric steps (card-8 settings). The browser horizon object adds `"polar": true` and `"accuracy": {lower, text}` from `hterrain/validation.json` → `polar` (written by `pipeline/validate_custom_polar.py`).

Task F proposal (2026-11-15, Jiyong): optional sparse `p5` and `p10` levels precede the existing levels, with the same encoding and 0.25 m height steps, used only to 3 km. They contain full-valid native-source tiles intersecting 4 km projected discs around the 16 catalogue sites; absent keys still fall through. `patch_radius_m`, `coverage_note` and top-level `sparse_near_field` document this limited coverage. No full-polar 5/10 m coverage or catalogue-equivalence promise. See [measured accuracy, regressions and cost](task_f_custom_polar.md).

### 14c. Proposed — north-polar custom-point terrain (Jiyong, 2026-11-15)

Optional `web/data/hterrain/polar_n/index.json` uses the section 14b predictor codec and fields, with `pole: "north"`, positive `lat_edge_deg`, and spherical stereographic `lat_0=90, lat_ts=90, lon_0=0, R=1737400`. Coordinates are `x=rho*sin(lon), y=-rho*cos(lon)`. Every level explicitly carries `pole: "north"`; names start with `n`, separate from southern `p` levels. URLs start `polar_n/<name>/`. `coverage_radius_m` records the projected cap enclosing the observer latitude band plus that level's entire geodesic sampling range. Native source pixels and shared tile borders are retained; height quantization is given by `q_m`.

The optional north index is attached as `index.polarNorth` in memory; legacy `index.polar` remains southern. Missing optional indices use the global chain. Advertised missing tile files are errors. Levels apply by observer latitude and distance; the remaining global chain extends to 300 km. The Worker adds `pole: "north" | "south" | null`, while retaining `polar: boolean`. The existing 2 m observer, curvature, 720 azimuths and polar march parameters do not change.

`hterrain/validation.json.north` contains `lat_edge_deg`, descriptive `levels`, `target` (`rms_deg_median`, `abs_sun_pp_per_point`), and `bands` keyed `75-80N`, `80-85N`, `85-90N`, each with `n`, `rms_deg_median`, `rms_deg_max`, `abs_sun_pp_median`, `abs_sun_pp_max`, `meets_target`. The UI applies measured northern accuracy only when the Worker actually reports `pole: "north"`; missing/failed validation retains an approximation warning. Measured errors are comparison results at sampled points, not guaranteed bounds at arbitrary coordinates.

## 15. Proposed — `web/data/local/<ID>.json` (Card 18, Jiyong, 2026-11-14)

New optional data only; existing sections unchanged. Written by `pipeline/local_maps.py`.
Each file contains 441 sampled locations, **not area-averaged pixels**. Card 18 made six south-polar files; card 20 (Dongju) extended the same format to all 33 catalogue sites. Terrain chain by site: lat ≤ −75° PGDA polar 5–240 m (+ LDEM_64/16); |lat| < 60° SLDEM2015 59 m to 150 km (+ LDEM_64/16, as card 9); CHANDRAYAAN3 (69° S) LDEM_64/16 only. `dem_sources` and `ground_resolution_m` per node record what was used.

- `id`, `center:{lat,lon}`, `frame:"MOON_ME_DE421"`, `radius_m:1737400`, `complete:true`, `mock:false`.
- `grid:{rows:21,cols:21,spacing_m:1000,origin_e_m:-10000,origin_n_m:-10000,order}`.
  Node index = row×21+column; rows south to north and columns west to east. Offset (e,n)
  is mapped by spherical geodesic bearing atan2(e,n) and distance hypot(e,n). A corner is
  approximately 14.14 km from the centre; the square is not a 10 km circular footprint.
- `window:{start:"2026-01-01T00:00:00Z",step_h:1,n:43824}`.
- `params:{min_km:0.005,max_km:300,n_steps:8000,obs_height_m:2}`. Horizon masks have 720
  azimuths (0.5°), lunar curvature and original source gates measured from **each node**:
  5/10/20/60/80/240 m terrain to 3/25/25/60/60/200 km, then global fallback to 300 km.
  Expanded cached windows are storage envelopes, not modified radial gates. Real source
  coverage may lack 5 m terrain; no extrapolation or invented elevations are permitted.
- `points`: 441 ordered objects `{index,e_m,n_m,lat,lon,h0_m,ground_resolution_m,
  sun_frac,earth_frac,both_frac,longest_dark_h,dem_sources}`. Fractions are unrounded
  hourly counts/43824 from the actual `web/js/core.js`. The input horizon uses section-3
  rounding (height 0.01 m, mask 0.0001°). Sunlit means disk fraction≥0.5; Earth centre must
  be above the mask; both is their AND. Darkness is the longest consecutive dark hourly
  run clipped to this window. `ground_resolution_m` is the finest source available at
  that node, not a vertical accuracy claim; `dem_sources` describes sources used on rays.
- `provenance:{terrain_sources,files_sha256,center,params,input_key}`. Each source contains
  repository-relative `path`, full source `sha256`, `resolution_m`, `gate_km` (null for global
  sources) and global `label_sha256`. Code/core/ephemeris hashes identify exact inputs.
  Resume checkpoints and 720-bin masks are ignored local files, not browser payloads.

No partial map is exported. Local statistics use nodes within circular radii 1/3/5/10 km;
IQR is Q3−Q1 with linear quantile interpolation. Maps describe geometric illumination and
direct Earth visibility, not Earth-station availability, terrain ground truth or RF service.

## 16. Proposed v1.2 — `web/data/date_slip/<ID>.json` landing-date slips (2026-11-14, Dongju, card 19) — NOT yet agreed; new section only (renumbered from 15 at merge; sections 0–15 unchanged)
Written by `node pipeline/date_slip.mjs` (actual `web/js/core.js`); human summary `docs/date_slip.md`.
```json
{"id": "ARTEMIS_HAWORTH", "first_landing": "2026-01-01", "last_landing": "2027-12-31", "n_landings": 730,
 "days_after_landing": 14, "step_h": 1, "definition": "...",
 "series": {"sun_frac": [730 numbers], "earth_frac": [...], "both_frac": [...], "longest_dark_h": [730 integers]},
 "best":  {"landing": "2027-09-13", "sun_frac": 1, "earth_frac": 1, "both_frac": 1, "longest_dark_h": 0},
 "worst": {"landing": "2026-03-16", "sun_frac": 0, "earth_frac": 0.5, "both_frac": 0, "longest_dark_h": 336},
 "range": {"sun_frac": [min, max], "earth_frac": [min, max], "both_frac": [min, max], "longest_dark_h": [min, max]},
 "slip": {"+7d":  {"sun_frac": {"unit": "pp", "median_abs_change": 0, "worst_change": 0, "worst_from": "YYYY-MM-DD", "worst_to": "YYYY-MM-DD", "share_of_days_worse": 0},
                   "earth_frac": {...}, "both_frac": {...}, "longest_dark_h": {"unit": "h", ...}},
          "+14d": {...}},
 "horizon_sha256": "...", "core_sha256": "...", "mock": false}
```
- `series[m][k]` = metric for landing at 00:00 UTC of `first_landing + k` days, over hours `[24·d, 24·d + 24·days_after_landing − 1]` (hour index from section 0); fractions rounded to 4 decimals, `longest_dark_h` integer hours.
- Definitions = `core.sunlit` (≥ 50 % of the solar disc above the mask), `core.earthVisible` (Earth centre above the mask); `longest_dark_h` = longest run of not-sunlit hours inside the window.
- `best` / `worst` = highest / lowest `both_frac` (ties: shorter / longer `longest_dark_h`), same as `web/js/landing_scan.js`.
- `slip["+Nd"][m]`: Δ = metric(landing + N days) − metric(landing) for every landing with landing + N ≤ `last_landing`. `median_abs_change` = median |Δ|; `worst_change` = most unfavourable Δ (most negative for fractions, most positive for dark hours) with its dates; fractions in percentage points.
- Only sites with a real horizon (section 3) get a file; no flat or mock fallback.

## 17. Proposed v1.2 — `web/data/monthly/<ID>.json` seasons 2026–2030 (2026-11-14, Sua, s4-seasons) — NOT yet agreed; new section only (sections 0–16 unchanged)
Written by `node pipeline/seasons.mjs` (actual `web/js/core.js`); independent check `python pipeline/verify_seasons.py` → `docs/seasons_check.json`; human summary `python pipeline/seasons_doc.py` → `docs/seasons.md`; all-site summary `docs/seasons_summary.json`.
```json
{"id": "SHACKLETON_RIM", "first_month": "2026-01", "last_month": "2030-12", "n_months": 60, "step_h": 1,
 "definition": "...", "lunation_definition": "...",
 "months": ["2026-01", ..., "2030-12"],
 "series": {"hours": [744, 672, ...], "sun_h": [ints], "earth_h": [ints], "both_h": [ints],
            "sun_frac": [60 numbers], "earth_frac": [...], "both_frac": [...], "longest_dark_h": [60 ints]},
 "lunation": {"window_h": 709, "sun_frac": [60], "earth_frac": [60], "both_frac": [60]},
 "subsolar_lat_deg": {"min": [60], "max": [60]}, "subearth_lat_deg": {"min": [60], "max": [60]},
 "total": {"hours": 43824, "sun_frac": 0.84.., "earth_frac": ..., "both_frac": ..., "longest_dark_h_max_month": 75},
 "horizon_sha256": "...", "core_sha256": "...", "mock": false}
```
- Month k = calendar month (UTC) = hour indices `[i0, i1]` (section 0); the 60 months tile hours 0 … 43823 exactly. `series` = `core.metrics(site, i0, i1)`: `*_h` = hours sunlit / Earth visible / both (integers), `*_frac` = count / hours rounded half-up to 4 decimals, `longest_dark_h` = longest not-sunlit run **inside** the month (cut at month boundaries).
- `lunation` = the same metrics over 709 h (≈ one synodic month, 29.54 d) centred on the month: centre `c = i0 + floor(hours / 2)`, window `[c − 354, c + 354]`. It removes the day/night aliasing of 28–31-day months (equatorial sites), so the line shows the real season.
- `subsolar_lat_deg` / `subearth_lat_deg` = min/max over the month's hours of the selenographic latitude (MOON_ME) of the Sun / Earth direction from `ephem.bin`, 3 decimals; same for every site.
- Invariants (checked by `pipeline/check_contract.py`): Σ`*_h` / 43824 = `metrics/<ID>.json` fraction (≤ 1e-9); max monthly `longest_dark_h` ≤ 5-year `longest_dark_h`; both ≤ min(sun, earth).
- Only sites with a real horizon (section 3) get a file; custom (browser) points have none — the UI says "catalogue sites only" and requests nothing.

## 18. Proposed — `web/data/uncertainty/<ID>.json` coordinate-uncertainty ranges (Card 23, Sua non-polar part + Jiyong south-polar part, 2026-11-14) — NOT yet agreed; new section only (renumbered from 17 at merge: seasons took 17; sections 0–17 unchanged)

Answers "if the catalogue coordinate is off by r metres, what range of values could the site have?".
Non-polar sites (lat > −75°) are written by `pipeline/coord_uncertainty.py`; the south-polar part
(Jiyong) should use the **same keys** so the app reads one format. One file per catalogue site.

- `id`, `center:{lat,lon}` (= `sites.json`), `frame:"MOON_ME_DE421"`, `radius_m:1737400`,
  `window:{start:"2026-01-01T00:00:00Z",step_h:1,n:43824}`, `complete:true`, `mock:false`,
  `part` (free text: which pipeline wrote it).
- `grid:{rows:11,cols:11,spacing_m:100,origin_e_m:-500,origin_n_m:-500,order}`. Node index =
  row×11+column, rows south→north, columns west→east; offset (e,n) placed at geodesic bearing
  atan2(e,n) and distance hypot(e,n) (same rule as section 15). Centre node index 60 uses the
  exact catalogue lat/lon.
- `params:{min_km,max_km,n_steps,obs_height_m}` = the parameters of the site's production horizon
  (section 3), so node 60 reproduces `metrics/<ID>.json`. Non-polar: `{0.2,300,4000,2}`, chain
  SLDEM2015 59 m to 150 km → LDEM_64 → LDEM_16 to 300 km (|lat| ≥ 60: LDEM_64 → LDEM_16), gates
  measured from **each node**. 720 azimuths, curvature, observer 2 m.
- `nodes`: 121 ordered `{index,e_m,n_m,lat,lon,h0_m,sun_frac,earth_frac,both_frac,longest_dark_h}`;
  unrounded fractions = hourly counts / 43824 from the actual `web/js/core.js` (horizon rounded as
  section 3 before the metrics, exactly like production).
- `radius_rule`: radius r uses the nodes with hypot(e_m,n_m) ≤ r → 100 m: 5, 300 m: 29, 500 m: 81 nodes
  (a disc, not the square).
- `ranges:{"100"|"300"|"500": {n_nodes, sun_frac:{min,max,p10,median,p90}, earth_frac:{…},
  both_frac:{…}, longest_dark_h:{…}}}`; quantiles = `numpy.percentile` linear interpolation
  (`longest_dark_h` min/max are integers, its quantiles may be fractional).
- `dem_sources`: `[{name,res_m,to_km_min,to_km_max}]` over all node rays.
- `provenance:{terrain_sources:[{name,path,sha256,gate_km,resolution_m,(label_sha256|storage_radius_km)}],
  files_sha256,center,params,input_key}`.

Nodes are point samples, not area averages. The spread shows sensitivity to position on the
same DEM; it does not include DEM height errors.

South-polar extension (same common keys, Jiyong): `pipeline/coordinate_uncertainty.py`
writes only the 16 sites with lat <= -75. Each retains its current Card 8 horizon
parameters (min_km=0.005, max_km=300, n_steps=8000, observer=2 m), full PGDA chain,
and LDEM_64/LDEM_16 fallback. `params` also records `early_stop` and `hmax_m`.
Optional node fields `ground_resolution_m` and `dem_sources` identify actual data
support. Optional `center_check` stores exact differences and the baseline metrics
SHA256; a mismatch blocks export. Provenance additionally records unchanged baseline
horizon/metrics SHA256. No existing horizon or metrics files are modified.

The five nonpolar near-field alternatives are separate in `docs/near_field_check.md`;
they are never used to change uncertainty centres. PGDA reference values outside the
published raster footprint remain null, including neighbourhood extrema and closeness.

## 19. Proposed v1.3 — site visibility windows (card 15-B, 2026-11-14) — pending team agreement; renumbered from 18 at merge (coordinate uncertainty took 18); sections 0–18 unchanged

Written by `node pipeline/build_windows.mjs`, using unchanged `web/js/core.js` predicates. Files are optional until generated; no existing format is changed.

### 19.1 `web/data/windows/<ID>.json`

```json
{
  "format": "site-windows-v1", "id": "<catalogue ID>", "lat": 0, "lon": 0,
  "h0_m": 0, "obs_height_m": 2,
  "start_utc": "2026-01-01T00:00:00Z", "end_utc": "2031-01-01T00:00:00Z",
  "step_h": 1, "n": 43824,
  "sun": {"visible": [], "longest_gaps": [], "visible_hours": 0},
  "earth": {"visible": [], "longest_gaps": [], "visible_hours": 0},
  "source": {"core_sha256": "<hash>", "ephem_sha256": "<hash>", "ephem_meta_sha256": "<hash>",
             "site_sha256": "<hash>", "horizon_sha256": "<hash>", "producer_sha256": "<hash>"},
  "mock": false
}
```

The snippet shows structure only, not computed coordinates or results. Each interval record in visible or longest_gaps has exactly `start_utc, end_utc, duration_h, clipped_start, clipped_end`.

- UTC timestamps are whole hours. Every interval is **[start_utc, end_utc)**: start included, end excluded. Each hour-mark state describes its one-hour bin. The final sampled state at 2030-12-31T23Z describes the bin ending 2031-01-01T00Z. This is a discretisation convention, not a claim that the physical transition is exactly on an hour mark.
- Sun: `core.sunlit(site,i)`, visible disk fraction >= 0.5. Earth: `core.earthVisible(site,i)`, centre strictly above the interpolated terrain mask. A visible interval is a maximal consecutive run of true hour bins; no interpolation or sub-hour refinement is applied.
- `duration_h` is an integer, exactly end minus start. `visible_hours` is the sum of durations. Divide by 43,824 to obtain the same hourly fractions as core.metrics.
- A gap is a maximal consecutive run of false bins, the complement of visible intervals within the domain. `longest_gaps` contains at most 10, sorted by duration descending and then start UTC ascending. If always visible, gaps is empty; if never visible, visible is empty and one full-domain gap is returned. No December/January cyclic wrapping is performed.
- `clipped_start` is true exactly when the interval begins at the domain start; `clipped_end` is true exactly when it ends at the exclusive domain end. These are censored boundaries, not independently detected transitions.
- `h0_m`, lat/lon and observer height must match the real horizon used. No mock/flat/mismatched/missing-DEM horizon is exported. SHACKLETON_RIM is exported only when sites.json and its real horizon both use the corrected (-89.6866, -162.81) coordinate on main; otherwise it is skipped.
- `source` hashes identify exact computation inputs; site_sha256 hashes JSON.stringify(site), producer_sha256 hashes pipeline/build_windows.mjs. Production ephemeris and core.js are not modified.

### 19.2 `web/data/windows/index.json`

`{"format":"site-windows-v1","start_utc":"2026-01-01T00:00:00Z","end_utc":"2031-01-01T00:00:00Z","step_h":1,"n":43824,"ids":[...],"skipped":{"<ID>":"reason"},"mock":false}`

Every catalogue ID must appear exactly once in ids or skipped; ids match the actual <ID>.json files. The UI should use this index, treating skipped as unavailable rather than zero visibility. Tables/JSON in docs/windows_verification.md and docs/windows_verification.json record the Node edge checks. check_contract.py validates intervals, longest-gap complements, clipping, index coverage and input hashes via pipeline/check_windows.py.

Section 19 validator detail: site_sha256 is recomputed by Node using exact JSON.stringify(site), not Python JSON serialization. producer_sha256 is recomputed from actual build_windows.mjs bytes. Node (or LLSN_NODE) is required when checking windows. See pipeline/test_windows_contract.py for zero-hash and missing-tile regressions; a present hterrain index with a missing required tile is an ERROR under section 14.

## 20. Proposed v1.2 — `web/data/hindcast.json` real-mission hindcast (2026-11-14, Dongju, card 21) — NOT yet agreed; new section only (renumbered from 18 at merge; sections 0–19 unchanged)
Written by `python pipeline/hindcast.py`; summary `docs/hindcast.md`; independent check `docs/hindcast_check.json`.
```json
{"contract": "...", "generated_utc": "...", "definitions": {"sun_elevation": "...", "sunset": "...", "ephemeris": "..."},
 "ephemeris_check": {"file": "ephem_2019-2025_1h.npz", "rows": 61368, "sample_hours": 50, "checks": [{"site": "", "body": "", "n": 50, "max_deg": 0, "mean_deg": 0}], "max_deg": 0, "passed": true},
 "apollo_sun_elevation": [{"id": "APOLLO11", "mission": "Apollo 11", "landing_utc": "1969-07-20T20:17:39Z", "reported_sun_el_deg": 10.65,
     "reported_source": "https://...", "ours_sun_el_deg_catalogue_point": 10.703, "ours_sun_el_deg_alsj_point": 10.66,
     "difference_deg_catalogue": 0.053, "difference_deg_alsj_point": 0.01, "terrain_mask_at_sun_az_deg": 0.0,
     "catalogue_point": [0, 0], "alsj_point": [0, 0], "h0_m": 0}],
 "robotic_sunset": [{"id": "CHANDRAYAAN3", "mission": "...", "landing_utc": "...", "landing_source": "...", "sunlit_at_landing": true,
     "ours_first_sunset_utc": "2023-09-04T06:17Z", "reported_event": "...", "reported_utc": "ISO time | YYYY-MM-DD | null",
     "reported_precision": "time ... | date only | null", "source_url": "https://... | null", "source_quote": "...", "source_kind": "...",
     "difference_hours": 3.8, "difference_days": 0, "difference_text": "...", "proxy_note": "..."}],
 "alsj_note": "...", "mock": false}
```
- `reported_*` are copied from the cited source only; `null` with `source_kind: "no public source"` when nothing was found (never estimated).
- `ours_first_sunset_utc` = first minute after landing with < 50 % of the solar disc above the terrain mask (core.js sunlit rule). End-of-operations reports are a proxy for sunset, not a measurement.

## 21. Proposed v1.3 — `web/data/gmaps_ppd32/` 948 m whole-Moon map (card 14, 2026-11-14, integrator) — NOT yet agreed; new section only (sections 0–20 unchanged)
Same format as section 10, written by `python pipeline/global_maps.py export --ppd 32` from the merged CPU + CUDA store
(`data/processed/gmaps_ppd32/`, git-ignored; rows 0–3102 CPU, 3103–3454 CPU on Jiyong's PC, 3455–5759 CUDA). What differs
from the generic section 10:

| Item | Value in `web/data/gmaps_ppd32/` |
|---|---|
| Grid | `ppd` 32, 11,520 × 5,760 cells, `grid_res_km` 0.948; one value per cell, computed at the cell centre (section 10a) |
| Engine settings (`index.json` `params`) | `naz` 360, `near_km` 150 (LDEM_64), `max_km` 300 (LDEM_16), `step_frac` 0.01, `n_steps` 283, observer 2 m, Sun radius 0.2666° |
| Ephemeris (`index.json` `ephem`) | `ephem.bin`, **3 h** step (14,608 samples, 2026-01-01 … 2030-12-31) — not the 2 h default of section 10; the 3 h vs 2 h effect is ≤ 0.001 pp of PGDA MAE (`docs/card14_pgda_analysis.md` factor 2) |
| Layers | `sun` = mean visible solar-disc fraction; `earth` = Earth **centre** above the mask; `both` = sunlit (disc ≥ 50 %) AND Earth visible. Fractions 0…1 |
| `tiles/<layer>/<z>/<x>_<y>.jpg` | 512 × 512 colour JPEG (q 88), equirectangular, tile (0,0) = north-west. Exported levels z 0–3 (`zmax` rule of section 10: round(log2(11520/1024)) = 3, 8,192 px ≈ 1.33 km/px). **z 4** (16,384 × 8,192 px, ≈ 0.67 km/px) was added afterwards by `pipeline/gmaps_add_zoom.py` and is listed in `index.json` `added_levels`: bilinear upsampling of the 948 m grid, **display only**, no detail finer than the grid |
| Resampling | to a level / overview smaller than the grid: PIL BOX (mean of the cells whose centres fall in the pixel); larger: bilinear (`global_maps.resample`) |
| `<layer>_values.png` | 8-bit grey 4096 × 2048, value = DN / 250, DN 255 = no data (BOX-averaged from the grid, so a pixel is ≈ 2.8 × 2.8 cells, not one cell) |
| `<layer>_overview.jpg` | 4096 × 2048 colour overview |
| Other `index.json` fields | `rows_done` = `rows_total` = 5760, `window`, `dem_sources`, `computed_utc`, `exported_utc`, `mock` false, `contract` (points to section 10) |

Validation: `docs/VALIDATION.md` row 22 (PGDA, 400 points, cell-containing-point reading) and `docs/gpu_cpu_300_check.md` (CPU vs CUDA cells).
As of version 26 the web app reads neither this folder nor the 3.8 km `web/data/gmaps/` (no `web/js` module requests them).

## 22. Proposed — `web/data/local250/<ID>.json` (Jiyong, 2026-11-15)

Optional finer south-polar neighbourhood product; section 15 `local/` remains unchanged.
Written by `pipeline/local250.py`. Same fields and metric definitions as section 15, with:

- Only the 16 catalogue sites at latitude <= -75 degrees.
- `grid:{rows:41,cols:41,spacing_m:250,origin_e_m:-5000,origin_n_m:-5000,order}`;
  1,681 **nodes**, south-to-north row-major; index=row*41+column. Centre index 840.
- Offsets -5,000 through +5,000 m inclusive; same great-circle conversion as card18.
  Corner distance is about 7.071 km; this is a square, not a 5 km circular footprint.
- `params`, frame, ephemeris window, source gates and `points` fields are unchanged:
  720 azimuths, 5 m near start, 8,001 geometric range samples to 300 km, 2 m observer,
  curvature, and actual `core.js` hourly metrics for 2026–2030. Grid spacing does not
  mean the underlying DEM resolution is 250 m.
- `provenance` additionally includes `grid` and hashes of the runner/CUDA adapter.
  Source windows are expanded storage envelopes; radial gates remain observer-centred.
- GPU is an optional FP64 horizon implementation validated against CPU per site;
  masks retain four-decimal-degree storage and metrics use unchanged `core.js`.
- Only complete site files are exported. Centre metrics must exactly equal the
  catalogue metrics file. Node checkpoints and progress/ETA remain git-ignored.

### 22.1 Task X extension — remaining 17 nonpolar catalogue sites (2026-11-15)

Extends section 22 to all 33 catalogue sites; the existing 16 polar files and
their 5 m / 8,001-distance sampling remain unchanged. New nonpolar files use
`pipeline/task_x.py` with card9/card20 settings: `params:{min_km:0.2,max_km:300,
n_steps:4000,obs_height_m:2}` (4,001 range samples), 720 azimuths and curvature.
SLDEM2015 ~59 m applies within 150 km for abs(lat)<60; otherwise, including
CHANDRAYAAN3, the existing LDEM64/16 fallback applies. Expanded 166 km raw windows
are storage envelopes, not changes to the observer-centred source gates.

The grid, node fields, ephemeris window, 4-decimal-degree mask serialization,
centre-equality requirement and complete-file-only export match section 22.
`web/data/local250/index.json` is an optional discovery manifest:
`{schema_version:1,sha256_normalization:"CRLF_to_LF",sites:[{id,file,center,grid,sha256}]}`. Each entry refers to a
complete sibling `<ID>.json`; `center` and `grid` match that map, and `sha256`
identifies its UTF-8 file bytes after CRLF-to-LF normalization for portability
between Windows checkouts and GitHub Pages. The manifest includes existing polar maps without
rewriting them. `check_contract.py` checks both maps and the index.

The requested +/-5 km grid supports complete circular 1/3/5 km statistics.
Task X's 10 km summary uses the existing section 15 1 km grid, explicitly
labelled `spacing_m:1000`; it is not a 10 km fine-grid estimate. Same spacing
does not imply the same underlying DEM resolution between different sites.

