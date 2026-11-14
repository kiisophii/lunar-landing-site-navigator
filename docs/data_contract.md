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
