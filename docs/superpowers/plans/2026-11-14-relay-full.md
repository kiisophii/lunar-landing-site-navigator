# Card 13: complete relay analysis

> Execute inline using executing-plans and test-driven-development. User has authorized implementation and PR.

**Spec:** `docs/3단계_분배.md`, card 13; data contract section 12.
**Goal:** reproducible real-terrain relay outputs for all 33 sites, including height curves, Artemis coverage and polar resolution sensitivity.
**Architecture:** extend the existing NumPy relay engine and resumable batch runner; preserve existing JSON fields. Keep independent verification separate from production geometry.
**Global constraints:** no raw data in git, no web/index.html edits, no main merge; 4 below-normal workers and one numerical thread per process; unchanged download tool. Do not present geometry as a guaranteed RF link.

### Task 1: reliable terrain geometry and resume
**Files:** pipeline/relay_tower.py, pipeline/run_relay.py, related tests.
**Interfaces:** existing chain samplers, ephemeris and section-12 JSON; add input provenance.
1. Add regression tests for missing-terrain paths, off-centre chain gates, near-field obstruction, stale ephemeris/DEM cache and stale batch outputs. Run tests; expected failures demonstrate each defect.
2. Correct these issues with conservative visibility shortcuts, anchored DEM gates and content-aware cache identity. Retain exact curvature and Fresnel formula.
3. Run relay and batch tests; expected all pass. Commit.

### Task 2: coverage maps and height curves
**Files:** pipeline/relay_tower.py, pipeline/run_relay.py, docs/data_contract.md, tests.
**Interfaces:** optional height_curve, coverage and parent-link records; existing best/networks unchanged.
1. Test a synthetic obstruction in a 15 km square map, height-curve consistency, and validation of dimensions. Expected missing-feature failures.
2. Add a 250 m cell-centred grid for each height's best single tower at Artemis sites. Export geometric LOS and S/Ka 60%-Fresnel masks, valid terrain and area totals; explicitly distinguish local reach from Earth availability.
3. Add optional height curves and actual parent-hop clearance records. Document definitions and assumptions. Run tests; expected all pass. Commit.

### Task 3: compute, sensitivity and independent evidence
**Files:** pipeline/card13_relay.py, verification script, docs/card13_relay_report.md, web/data/relay/*.json, docs/SI_USAGE.md.
**Interfaces:** task 1 provenance, task 2 optional fields, original DEM cache format.
1. Download missing nonpolar windows unchanged; run all 33 sites with checkpoints and bounded CPU. Expected 33 valid outputs and no pending terrain.
2. Compare 80 m and 240 m terrain within 3 km at three polar sites, preserving far-field terrain. Report best positions as well as fractions; no artificial agreement target for different resolutions.
3. Independent session: three sites, 30 hourly epochs, independently sampled DEM LOS, Fresnel and Earth visibility; compare like-for-like samples within 1 percentage point. Record sampling/convergence limits.
4. Check remote Shackleton coordinate correction; regenerate its caches/horizon/relay if available, otherwise explicitly record dependency.
5. Run contract checker, targeted tests and full suite; report any external-service failures separately. Write runtime, height and sensitivity tables, sources and SI row. Commit results.

### Review Focus
- Off-centre tower rays must select DEMs by distance from the original lander, not path length plus tower offset.
- Missing DEM must never become guaranteed visibility; cache must not reuse different terrain or ephemerides.
- Coverage is local geometric reach, not guaranteed end-to-end radio availability; surface area uses cell centres.
- Greedy networks must retain each actual parent's path evidence and consistent timeline fractions.
- Independent 30-sample fractions must be compared to matching production samples, not a five-year aggregate.
- No precision claim from DEM pixel size; sensitivity measures model change rather than truth error.

Final: fresh whole-branch review, fix material findings with regression tests, push feature branch and open PR with measured evidence. Do not merge.
