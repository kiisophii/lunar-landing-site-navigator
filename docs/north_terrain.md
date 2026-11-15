# Northern custom-point terrain: measured improvement

The former global ~948 m terrain path failed Task U. This change adds native PGDA northern terrain over entire latitude bands, without changing catalogue masks/metrics, southern tiles, or `index.html`. Baseline JavaScript: main `673e250`. Northern sampling now starts at 5 m with 8,001 ranges, 720 azimuths, curvature and a 2 m observer. It uses 20 m within 3 km for 85–90 N, 60 m within 3 km for 75–85 N, 240 m to 200 km, then the existing global LDEM_16 browser fallback to 300 km. These are DEM pixel spacings, not claimed vertical accuracy.

## Before / after

The same 30 area-stratified random Task-U points (10 per 5-degree band, seed 2026111503) are compared with the unchanged independent full-ray PGDA reference (native 10/20/30 m to 3 km, 60 m to 60 km, 240 m to 200 km, native global fallback). This measures differences between terrain models, not error against ground truth. Hourly production ephemeris and exact `core.js` predicates cover 2026–2030.

| Metric | Before | After |
|---|---:|---:|
| Median horizon RMS (deg) | 0.559386786 | 0.045787575 |
| Maximum point RMS (deg) | 4.740184448 | 0.332816146 |
| Maximum individual azimuth difference (deg) | 10.087462805 | 1.133363613 |
| Maximum Sun difference (pp) | 5.378331508 | 0.561336254 |
| Maximum Earth difference (pp) | 13.291803578 | 0.709656809 |
| Maximum both difference (pp) | 5.161555312 | 0.232749179 |

All 30 points pass the Sun ≤2 pp condition; all three bands pass median RMS ≤0.2 deg. The 2-hour sensitivity check also passes (maximum Sun difference 0.602409639 pp). Individual RMS can still exceed 0.2 deg: the target is the band median, not an every-ray guarantee. All coordinates, masks, regressions and signed differences remain in [the full report](north_terrain_check.json).

## Candidate choice and limits

Native 60 m + 240 m reduced median RMS to 0.035288109 deg but retained a 2.437020811 pp Sun discrepancy at NORTH_85_02. Adding native 40 m over the entire 85–90 N band retained 2.144943410 pp there; native 20 m reduced it to 0.401606426 pp (2-hour samples). The selected compact chain uses 240 m beyond 3 km and 0.5 m height quantization for 60/240 m levels, followed by a complete actual-browser recheck. Near 20 m heights use 0.25 m steps. These are independently re-evaluated tradeoffs, not patches around the test locations.

The same 30 points informed candidate selection; they are not a held-out accuracy study. Sharp unresolved terrain, source errors and untested coordinates can have larger differences. No claim of safe landing or instrument-scale obstacle detection follows. The original reference is itself a model. Another team member's verification is pending; separate AI/code checks here are author verification only.

## Numerical and boundary checks

- Independent decoder, north projection, bilinear interpolation and full 720 × 8,001 CPU rays at 3 points: all 2,160 rounded mask values exactly match the Worker; maximum unrounded difference ≤0.00005 deg; Sun/Earth/both differences 0 pp.
- Actual `core.js` vs independent NumPy loop: 0 pp at all 30 points.
- Eight edge/pole tests pass, including 75 N coverage, 85 N level boundary, date-line equivalence and 180-degree mask rotation at the north pole.
- Three actual southern catalogue points (Shackleton Rim, Haworth, Malapert): old/new masks, observer ground heights, source list, march parameters and all core metrics exactly equal.
- 3146 shared native tile edges match exactly. Source-aligned pixels and per-tile round-trip checks retain quantized original heights.
- Worker failure/base-switch regression found and fixed: drain sibling fetches before a failed job lets the next queued job replace its cache.

## Measured cost

Local desktop Chrome, new browser context and Worker per run, cache disabled, same server/ephemeris/global tiles. Encoded terrain response bytes exclude HTTP headers and common ephemeris/core initialization; this is not a public-Internet latency benchmark. Concurrent unrelated desktop work was left running.

| Point | Worker before / after (s) | Terrain before / after (MB) |
|---|---:|---:|
| NORTH_75_01 | 0.536 / 1.662 | 2.474 / 5.385 |
| NORTH_80_01 | 0.658 / 1.847 | 4.687 / 7.411 |
| NORTH_85_01 | 0.647 / 1.920 | 8.691 / 7.416 |

Added encoded tiles: 224,705,607 bytes. Complete web tree after promotion: 970,928,120 bytes, below the conservative 1,000,000,000-byte Pages budget. The extra detail costs about 1.1–1.3 s in these cold local Worker runs. Final cached build: 221.3 s; complete browser/reference/control verification: 100.6 s. Initial source acquisition and discarded candidate experiments are excluded from these runtimes.

## Reproduction and provenance

```sh
python pipeline/build_north_terrain.py --workers 12
python pipeline/verify_north_terrain.py
python -m pytest pipeline/tests/test_north_terrain.py pipeline/test_verify_north_terrain.py -q
node --test pipeline/test_north_hterrain.mjs
python pipeline/check_contract.py
```

Builder and checker checkpoint into ignored `data/processed/north_terrain/` (physically on D on this desktop). The original Task-U reference windows/report remain unchanged. [Build provenance](north_terrain_build.json) records source URLs, validators, native pixel bounds, decoded window hashes, encoded tile hashes, geometry and quantization. [Verification provenance](north_terrain_check.json) hashes actual inputs, including every served candidate/global/southern tile and the original baseline. The original task-U source hashes are retained there. Windows CRLF execution-byte hashes can differ from Git's LF blobs without changing code semantics.

Sources: [NASA PGDA north products](https://pgda.gsfc.nasa.gov/products/98), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Dataset URLs also appear in `data/DATASETS.md`. The measured northern badge is shown only for an actual northern terrain result; fallback, absent validation and failed bands retain an approximation warning.

Contract validation passes with the Git LF bytes of `pipeline/build_windows.mjs` and `web/js/core.js`. This Windows checkout initially reported 33 existing window input-hash errors because automatic checkout conversion made those unrelated inputs CRLF; their original bytes were restored immediately after the LF check. No window hashes or existing products were rewritten to hide that platform difference.
