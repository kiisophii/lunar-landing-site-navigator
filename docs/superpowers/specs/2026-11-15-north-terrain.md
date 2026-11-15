# North-polar high-resolution browser terrain

User approved applying higher-resolution original north DEMs, measuring before/after, then proceeding to task Y. Reuse the existing static polar tile architecture. Base main: 673e250; workspace data paths already redirect to D. No new approval round is needed for routine implementation choices within this request.

Implement geographic coverage for all custom points 75–90 N, never patches selected only around the 30 evaluation coordinates. Preserve existing southern and non-polar results. Use PGDA north product 98, MOON_ME DE421, 2 m observer, curvature, 720 azimuths and polar 5 m–300 km / 8001 distances. Start by measuring a native 60 m near/middle field and 240 m far field candidate against the existing 10/20/30 m reference. Add finer original source levels if required by measured accuracy; select the smallest complete-region chain that meets the stated targets where feasible. Do not confuse output grid spacing with source information.

Deployment constraint: published GitHub Pages sites have a 1 GB limit. Measure current web payload and candidate tiles before promotion; do not silently ship multi-GB native-resolution coverage. Original high-resolution rasters remain ignored on D. If finer whole-region payload cannot meet both limits, report the residual honestly and preserve a lower-accuracy badge in failing bands rather than fit the evaluation points.

North index: web/data/hterrain/polar_n/index.json, same codec/schema as south with pole=north, positive lat_edge_deg, level pole=north and unique n-prefixed names. North projection x=rho*sin(lon), y=-rho*cos(lon), rho=2R*tan(pi/4-lat/2). Worker chooses hemisphere, retains globally unique per-level caches, and supports missing optional north index. Catalogue horizon/metrics, existing south tiles and index.html are unchanged.

Validation: retain old 30-point task-U evidence; compare actual Worker plus core against the same independent full-ray reference. Median RMS≤0.2 degrees and each point Sun difference≤2 percentage points. Record Earth/both, every regression/failure, matched inputs, three same-tile controls, northern boundary/pole cases, southern regression, cold transfer and time. UI claims derive only from measured north validation and require the polar data path. Independent AI review is developer review, not a separate member's verification.

Sources: https://pgda.gsfc.nasa.gov/products/98 and https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits .
