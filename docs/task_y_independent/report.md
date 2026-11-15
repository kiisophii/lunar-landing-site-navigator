# Task Y independent member verification

PR #75 pinned head: 9758ecdb156eae902881634090f53e4d2ea7d8e0. Latest main at start: 300b8499e3ea4cadf1e9f2c36a267ba91e935aee.

Checker: Minchul Kim. Producer: Jiyong Sung. Independent multi-RHS least squares, scipy bilinear samples, PROJ/haversine masks and explicit area sums; no pipeline/web imports. Source transport is this checker's original task A reader, not Y producer code.

All native sample centres in the 100/500/1000 m circles were recomputed at three sites spanning 5/10/20 m resolution. Roughness is an additional diagnostic.

| Site | DEM m | Point slope stored / own deg | Max slope diff deg | Max flat diff pp |
|---|---:|---:|---:|---:|
| ARTEMIS_HAWORTH | 5 | 4.178640473443 / 4.178640473442 | 5.65769653349e-13 | 1.16529008665e-12 |
| ARTEMIS_NOBILE_RIM2 | 10 | 1.370029690601 / 1.370029690601 | 1.15463194561e-14 | 5.96855898038e-13 |
| IM1 | 20 | 12.720838623588 / 12.720838623588 | 3.76587649953e-13 | 9.94759830064e-14 |

Result: PASS. Slope <=0.5 deg; flat fractions <=1 percentage point. All failed rows are retained in summary.json.

All 33 content hashes, reference labels, coordinates and relay-centre copies checked. Detailed numerical scope is three sites only; no production product changed. Original source URLs, validators, bounds, byte-block hashes, decoded-window hashes and every comparison are published.

Limits: shared-source implementation agreement, not physical surface accuracy or safe-landing certification. 8/15 degree cutoffs remain reference values. No task criterion is invented for roughness.

Reproduce: install numpy scipy pyproj tifffile imagecodecs requests, check out the pinned PR head into target/, then run Y_TARGET_ROOT=target python verification/task_y/verify.py from the verification branch.

The terrain-specific contract checker passed for all 33 records (terrain_contract.json). Focused producer/schema/author-checker regression tests were also run (focused_tests.txt); they are supporting tests, not the independent numerical calculation. The repository-wide contract on unrelated products was not rerun in this sparse verification checkout.
