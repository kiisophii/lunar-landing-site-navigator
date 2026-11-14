# Validation against NASA PGDA (card 11)

Numbers below come from `python pipeline/validate_ours.py` run on 2026-11-14 (KST) and are stored in
`web/data/validation.json`. Per-point values: `data/processed/validation_ours.csv` (not committed;
re-create with the command above).

## Draft paragraph for the submission

**Validation.** We checked our horizon-and-ephemeris engine against NASA's published lunar south-polar
illumination maps (PGDA, Mazarico et al. 2011), which average Sun and Earth visibility over the full
18.6-year lunar nodal cycle at 60 m resolution. We drew 240 random points uniformly by area between
85°S and 90°S (fixed seed 42) and computed, for each point, a 720-azimuth horizon from NASA LOLA
terrain (60 m within 60 km, 240 m out to 300 km, lunar curvature included, observer 2 m above the
ground) and the Sun and Earth directions every 2 hours from 2020-01-01 to 2038-07-31 (NAIF DE440s,
MOON_ME frame). For the Sun (mean visible fraction of the solar disc) our values differ from PGDA by
1.66 percentage points on average (RMSE 2.62 pp, correlation r = 0.985, mean bias −0.25 pp). For the
Earth (any part of the Earth disc above the horizon, PGDA's definition) the mean difference is
1.24 pp (RMSE 3.37 pp, r = 0.990). The largest differences occur on steep slopes, where the PGDA value
itself changes by tens of percentage points within ±60 m (only 59 % of our Sun values fall inside
that local PGDA range, 83 % for the Earth), so the remaining error is dominated by terrain resolution
and exact point placement rather than by geometry. Limits: PGDA uses its own 60 m terrain and an
hourly step over its own 18.6-year window (exact dates not stated on the product page; unverified); our app's stricter Earth rule (Earth centre above the
horizon) gives lower Earth fractions by design (mean −3.25 pp vs PGDA, MAE 3.87 pp), and the validation
covers only 85–90°S.

## Numbers

| Quantity | Definition (ours) | MAE (pp) | RMSE (pp) | r | inside PGDA ±60 m range |
|---|---|---|---|---|---|
| Sun (primary) | mean visible fraction of solar disc (r = 0.2666°) | 1.658 | 2.620 | 0.9846 | 58.75 % |
| Sun (alt.) | any part of disc visible | 1.400 | 3.118 | 0.9834 | 76.25 % |
| Sun (alt.) | ≥ 50 % of disc visible ("sunlit") | 1.668 | 2.630 | 0.9845 | 58.33 % |
| Earth (primary) | any part of Earth disc visible (= PGDA) | 1.239 | 3.368 | 0.9896 | 82.92 % |
| Earth (alt., app rule) | Earth centre above horizon | 3.874 | 5.092 | 0.9847 | 47.08 % |

All rows use the same rounding as `web/data/validation.json` (ours stored to 5 decimals), so the
primary rows equal the JSON `sun` / `earth` blocks exactly.

Mean bias (ours − PGDA): Sun −0.25 pp, Earth (any part) +1.11 pp, Earth (centre) −3.25 pp.
DEM coverage: 0 % missing terrain samples for all 256 horizons.

## Named south-polar sites (card 8 per-site horizons)
Since 2026-11-14 11:50 KST the 16 named sites in `validation.json` use card 8's per-site horizons
(PR #8, branch `s2-polar-horizon-jiyong` at a31e1bf; 5 m → 10 → 60 → 240 m PGDA LOLA + LOLA LDEM,
`web/data/horizon/<ID>.json`). The 240 random points keep the pole-centred 60/240 m horizons.

| Named sites (n = 16) | Sun MAE | Sun bias | Earth (any part) MAE | Earth bias |
|---|---|---|---|---|
| pole-centred 60/240 m windows | 5.56 pp | +4.31 pp | 4.52 pp | +4.51 pp |
| card 8 per-site horizons | 3.67 pp | +1.72 pp | 3.56 pp | +3.29 pp |

*Updated 2026-11-14 15:20 KST:* SHACKLETON_RIM moved to the Gläser et al. (2017) rim point S (−89.6866, −162.81, card 15). Its horizon is card 13's recomputation (PR #14). New point: ours Sun 0.845 vs PGDA 0.871 (±300 m range 0.000–0.871), Earth 0.538 vs 0.537. The earlier table (5.59 / 3.63 / 4.53 / 3.57 pp) used the old R04 point.

Named sites sit on peaks and rims where PGDA's own value varies strongly within ±300 m, so these
errors are larger than for the random points; the finer card 8 near-field terrain clearly helps
(e.g. Connecting Ridge Sun 0.570 → 0.474 vs PGDA 0.439). Both versions are kept side by side in
`validation.json` → `named_pole_window_vs_card8`. If PR #8 changes its horizons before merging,
re-run `python pipeline/validate_ours.py --named-horizons web/data/horizon`.

## Method details
- Truth: `AVGVISIB_85S_060M_201608.TIF` and `_EARTH.TIF` (60 m), `AVGVISIB_75S_120M_201608*.TIF` for
  IM1 and Cabeus B (outside the 85°S map). Value = DN × 0.00004 (PDS label).
- Points: `pipeline/validate.py` (card 5), `data/processed/validation_points.csv`.
- Horizons: `pipeline/horizon.py` with two PGDA LOLA windows centred on the pole fetched by
  `pipeline/fetch_polar.py` (LDEM_60S_60MPP_ADJ radius 220 km, LDEM_60S_240MPP_ADJ radius 520 km).
- Ephemeris: `pipeline/ephem.py` validation series, `data/processed/ephem_2020-2038_2h.npz` (81,444 steps).
  Checked against card 10's delivered file (Minchul): all 81,444 × 6 float32 values bit-identical, same
  start / step / frame / columns, so the results above hold for card 10's file unchanged.
- Named south-polar sites (16, from `web/data/sites.json` with lat ≤ −75°) are in `validation.json`
  `named` with the PGDA ±300 m range; peaks and rims show the largest local PGDA spread.

## How it was checked
- `python pipeline/check_contract.py` → PASS (0 errors).
- 5 points (k = 0, 57, 123, 199, 239) recomputed independently: PGDA pixels read directly with
  rasterio; horizons recomputed by brute force (8000 distance steps, no early stop); Sun/Earth
  directions from card 1's `ephem.az_el`. All PGDA values identical; ours within 0.0002 (0.02 pp).

## Re-run
```
python pipeline/validate.py          # PGDA maps + points (card 5)
python pipeline/validate_ours.py     # horizons + fractions + web/data/validation.json
python pipeline/check_contract.py
```
Named sites with card 8's per-site horizons (after card 8 is on main):
`python pipeline/validate_ours.py --named-horizons web/data/horizon` - named sites then use the
5-240 m per-site masks; the JSON keeps `named_pole_window_vs_card8` (both versions side by side) and
`data/processed/validation_named_card8.csv` is written. The 240 random points are unchanged.
Needs the DEM windows: run once
`python -c "import sys; sys.path.insert(0,'pipeline'); import fetch_polar as F; from pathlib import Path; s=dict(id='VALIDATION_POLE',lat=-90.0,lon=0.0); r=Path('data/raw/polar_validation'); F.fetch(s,60,220000,r); F.fetch(s,240,520000,r)"`
and the validation ephemeris from `pipeline/ephem.py`.
