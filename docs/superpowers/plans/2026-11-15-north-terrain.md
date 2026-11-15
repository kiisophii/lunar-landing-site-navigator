# North-polar browser terrain implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Independent browser-adapter and data-preparation domains may be dispatched with superpowers:dispatching-parallel-agents; one fresh whole-branch review follows integration.

**Goal:** Improve northern custom-point terrain and quantify the improvement before starting task Y.
**Architecture:** Geographic multiresolution original-PGDA tiles, existing planar residual codec, hemisphere-aware browser sampler/worker and measured accuracy UI. Source/working caches are on D through existing junctions.
**Tech Stack:** Python NumPy/tifffile/HTTP Range, Node tests, browser Worker/Playwright.
**Spec:** docs/superpowers/specs/2026-11-15-north-terrain.md

## Global constraints
- No index.html, catalogue horizon/metric or existing south-tile changes.
- Full geographic coverage; no evaluation-point-specific patches.
- Preserve source registration, 2 m height, curvature and core predicates. Missing source data fall through explicitly.
- Bound deployed payload; never silently publish more than the documented Pages capacity.
- Reproducible before/after; raw data ignored on D; append SI/source/contract evidence; PR without merge.

## Review focus
- North y-axis sign, longitude wrap and pole singularity: cardinal projection and same-tile tests.
- Reused worker switches hemisphere: distinct tile cache identities and fallback tests.
- Missing optional north index/tile: truthful fallback or error, never an accuracy success badge.
- Source edge / quantization / no-data: codec round-trip, native pixel alignment and tile-seam tests.
- Accuracy vs model truth and payload tradeoffs: all 30 points plus boundary cases; preserve failed bands.

### 1. Baseline and candidate selection (root)
- [x] Preserve task-U baseline and source hashes; measure deployed bytes.
- [x] Compute geographic candidate DEM chains on all 30 points, report every difference and choose coverage based on accuracy/payload.

### 2. Browser northern adapter (independent domain)
Files: web/js/hterrain.js, custom_horizon_worker.js, custom_site.js; pipeline/test_north_hterrain.mjs.
- [x] RED: north projection, level selection, missing-tile and hemisphere cases.
- [x] GREEN: optional north index, north-aware geometry, measured north UI with fallback.
- [x] Preserve south behavior; run focused tests.

### 3. Source tiles and validation (root)
Files: pipeline/build_north_terrain.py, pipeline/north_terrain_check.py, tests/test_north_terrain.py, optional north contract checks, docs/north_terrain*.
- [x] RED: original-grid geometry, missing-pixel behavior, codec/coverage/resume tests.
- [x] GREEN: resumable geographic source/tile builder, provenance and payload accounting; generate selected candidate.
- [x] Actual browser before/after, independent same-tile controls and regional coverage/performance checks.
- [x] Promote only measured candidate; contract/SI/DATASETS and all regressions/limits.
- [ ] Final evidence review, latest main and PR. Then begin Y in a separate branch/PR.
