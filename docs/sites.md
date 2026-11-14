# Landing sites and region representatives

Card 4 catalogue: 33 entries. Source review date: 2026-11-14.

## Coordinate policy

Latitude is north-positive and longitude is east-positive in [-180, 180). MOON_ME_DE421 is the application's required target frame, not a verified datum claim for every catalogue entry. Numerical agreement with a source and confirmation of its exact coordinate datum are separate checks. The user-reported independent review confirmed DE421 in the original sources for all six Apollo and three Luna entries. The remaining 24 entries have exact MOON_ME_DE421 datum UNVERIFIED; an LROC or LOLA association alone does not prove the exact datum. No datum transformation has been applied, and no coordinate was changed in this documentation follow-up.

`coord_quality=primary` means the numbers are published by the official archive, measurement team or original paper. It is not an accuracy class, does not certify the exact MOON_ME_DE421 datum and does not mean a point is NASA-approved. LROC's own image measurements are primary values under the contract; `secondary` would describe a location we derived from imagery ourselves. Coordinate precision is preserved; IM-1 remains a coarse two-decimal location.

All `elev_m` values are null. Heights must be sampled from the team's DEM pipeline above R=1737.4 km; null is unknown, not a measured zero. We deliberately do not mix article elevations with potentially different vertical control. The observer's +2 m belongs in the geometry, not in the stored terrain elevation.

## Datum confirmation status

| Entries | Count | Exact source datum status |
|---|---:|---|
| Apollo 11, 12, 14, 15, 16, 17 | 6 | Source DE421 confirmed in user-reported independent review |
| Luna 16, 20, 24 | 3 | Source DE421 confirmed in user-reported independent review |
| Change, Chandrayaan, SLIM, CLPS, Artemis representatives, polar study points and future target | 24 | Exact MOON_ME_DE421 datum unverified |

Per-entry status and its evidence basis are recorded in docs/sites_source_audit.json. These documentation-only fields do not extend the sites.json contract.

## Point meanings

Apollo entries identify lunar modules, not ALSEP stations or retroreflectors. Robotic entries use post-landing positions. The Chang'e-4 point follows the refined 2020 LROC solution (-45.4562, 177.5885), rather than the different Chang'e-2-map solution used for the card 1 geometry test; those test coordinates were not a catalogue decision.

The nine Artemis entries reproduce the membership of NASA's 2024-10-28 candidate-region list. Each is represented by one explicitly identified research CLS in Wueller et al. (2026), Appendix Table A1; it is not a region centroid, boundary or selected NASA touchdown point. Choosing the first listed CLS is a reproducible display choice, not a ranking or recommendation. No mission schedule is inferred from the historical Artemis III label. Slater Plain uses SP01, whose longitude is explicitly 124.5210 E; it is not the centre of Slater crater.

The five polar_peak records are published topographic study points (polygon centres), not necessarily summits. The IM-3 entry is the published Lunar Vertex science target; KASI supplies the IM-3/LUSEM mission association, not a more precise landing location or launch-date guarantee.

## Catalogue

| ID | English name | Korean label | Group | Latitude N | Longitude E | Quality | Source / locator | Note |
|---|---|---|---|---:|---:|---|---|---|
| APOLLO11 | Apollo 11 | 아폴로 11호 | apollo | 0.67416 | 23.47314 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 11: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| APOLLO12 | Apollo 12 | 아폴로 12호 | apollo | -3.0128 | -23.4219 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 12: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| APOLLO14 | Apollo 14 | 아폴로 14호 | apollo | -3.64589 | -17.47194 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 14: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| APOLLO15 | Apollo 15 | 아폴로 15호 | apollo | 26.13239 | 3.6333 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 15: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| APOLLO16 | Apollo 16 | 아폴로 16호 | apollo | -8.9734 | 15.5011 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 16: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| APOLLO17 | Apollo 17 | 아폴로 17호 | apollo | 20.1911 | 30.7723 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) - Apollo 17: Lunar Module row | Historical crewed landing; lunar module location (not ALSEP or retroreflector). |
| LUNA16 | Luna 16 | 루나 16호 | luna | -0.5137 | 56.3638 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) - Luna 16: Soft Landing row | Historical robotic sample-return landing; NSSDCA/LROC location. |
| LUNA20 | Luna 20 | 루나 20호 | luna | 3.7863 | 56.6242 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) - Luna 20: Soft Landing row | Historical robotic sample-return landing; NSSDCA/LROC location. |
| LUNA24 | Luna 24 | 루나 24호 | luna | 12.7142 | 62.2129 | primary | [source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) - Luna 24: Soft Landing row | Historical robotic sample-return landing; NSSDCA/LROC location. |
| CHANGE3 | Chang'e 3 | 창어 3호 | change | 44.1214 | -19.5116 | primary | [source](https://lroc.im-ldi.com/images/637) - Paragraph beginning 'Since the rover is close' | Historical robotic landing. LROC lander position; source longitude 340.4884 E converted to -19.5116 E. |
| CHANGE4 | Chang'e 4 | 창어 4호 | change | -45.4562 | 177.5885 | primary | [source](https://lroc.im-ldi.com/images/1168) - Paragraph after Yutu-2 traverse table | Historical robotic landing. Refined LROC lander position; source reports 13 m uncertainty at 95% confidence. Not the Chang'e-2-map coordinate used in some papers. |
| CHANGE5 | Chang'e 5 | 창어 5호 | change | 43.0576 | -51.9161 | primary | [source](https://lroc.im-ldi.com/images/1172.2020) - Paragraph beginning 'China's Chang'e 5' | Historical robotic landing. LROC lander position; source longitude 308.0839 E converted to -51.9161 E; reported horizontal accuracy +/-20 m. |
| CHANGE6 | Chang'e 6 | 창어 6호 | change | -41.6385 | -153.9852 | primary | [source](https://lroc.im-ldi.com/images/1374) - Paragraph beginning 'The LROC team computed' | Historical robotic landing. LROC lander position; source longitude 206.0148 E converted to -153.9852 E; reported horizontal accuracy +/-30 m. |
| CHANDRAYAAN3 | Chandrayaan-3 | 찬드라얀 3호 | chandrayaan | -69.3741 | 32.32 | primary | [source](https://lroc.im-ldi.com/images/1314) - Annotated image caption | Historical landing; post-landing LROC coordinates, not the pre-launch target ellipse. |
| SLIM | SLIM | 슬림 | slim | -13.316 | 25.251 | primary | [source](https://lroc.im-ldi.com/images/1358) - Opening lander image caption | Historical JAXA lander position measured by LROC; not the intended landing point. |
| IM1 | IM-1 Odysseus | IM-1 오디세우스 | clps | -80.13 | 1.44 | primary | [source](https://lroc.im-ldi.com/images/1360) - Second lander image caption | Historical landed location. Source publishes only two decimal places; do not infer metre-level accuracy. |
| IM2 | IM-2 Athena | IM-2 아테나 | clps | -84.7906 | 29.1957 | primary | [source](https://lroc.im-ldi.com/images/1408) - Full-resolution NAC image caption | Historical actual surface location; lander ended on its side. Not the pre-landing target (-84.78, 29.13). |
| BLUE_GHOST1 | Blue Ghost Mission 1 | 블루 고스트 1호 | clps | 18.562 | 61.81 | primary | [source](https://lroc.im-ldi.com/images/1406) - Full-resolution oblique image caption | Historical landed location near Mons Latreille; use lander coordinates, not LRO's imaging position. |
| ARTEMIS_CABEUS_B | Peak near Cabeus B (region) | 아르테미스 후보: 카베우스 B 인근 봉우리 (대표점) | artemis3_region | -83.763 | -69.983 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, PCB01 | region representative point; research CLS PCB01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_HAWORTH | Haworth (region) | 아르테미스 후보: 하워스 (대표점) | artemis3_region | -86.768 | -20.514 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, HW01 | region representative point; research CLS HW01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_MALAPERT | Malapert Massif (region) | 아르테미스 후보: 말라퍼트 산괴 (대표점) | artemis3_region | -85.942 | -0.944 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, MMA01 | region representative point; research CLS MMA01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_MOUTON_PLATEAU | Mons Mouton Plateau (region) | 아르테미스 후보: 무통산 고원 (대표점) | artemis3_region | -85.111 | 26.71 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, MMP01 | region representative point; research CLS MMP01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_MOUTON | Mons Mouton (region) | 아르테미스 후보: 무통산 (대표점) | artemis3_region | -85.416 | 31.851 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, MMO01 | region representative point; research CLS MMO01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_NOBILE_RIM1 | Nobile Rim 1 (region) | 아르테미스 후보: 노빌레 가장자리 1 (대표점) | artemis3_region | -85.295 | 36.917 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, NR101 | region representative point; research CLS NR101, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_NOBILE_RIM2 | Nobile Rim 2 (region) | 아르테미스 후보: 노빌레 가장자리 2 (대표점) | artemis3_region | -84.054 | 56.481 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, NR201 | region representative point; research CLS NR201, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_DE_GERLACHE_RIM2 | de Gerlache Rim 2 (region) | 아르테미스 후보: 드 제를라슈 가장자리 2 (대표점) | artemis3_region | -88.389 | -68.865 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, dGR201 | region representative point; research CLS dGR201, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| ARTEMIS_SLATER_PLAIN | Slater Plain (region) | 아르테미스 후보: 슬레이터 평원 (대표점) | artemis3_region | -87.478 | 124.521 | primary | [source](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434) - Appendix Table A1, SP01 | region representative point; research CLS SP01, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set. |
| SHACKLETON_RIM | Shackleton Rim (R04) | 섀클턴 가장자리 R04 | polar_peak | -89.7668 | -171.87 | primary | [source](https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf) - Table A2-2: R04 / Site04, printed p.58 | South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit. |
| CONNECTING_RIDGE | Connecting Ridge (R01) | 연결 능선 R01 | polar_peak | -89.4632 | -137.49 | primary | [source](https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf) - Table A2-2: R01 / Site01, printed p.58 | South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit. |
| PEAK_NEAR_SHACKLETON | Peak Near Shackleton (R07) | 섀클턴 인근 봉우리 R07 | polar_peak | -88.811 | 123.6901 | primary | [source](https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf) - Table A2-2: R07 / Site07, printed p.58 | South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit. |
| DE_GERLACHE_RIM1 | de Gerlache Rim 1 (R11) | 드 제를라슈 가장자리 R11 | polar_peak | -88.6834 | -67.9321 | primary | [source](https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf) - Table A2-2: R11 / Site11, printed p.58 | South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit. |
| SHOEMAKER_RIM_A | Shoemaker Rim A (LM2) | 슈메이커 가장자리 A | polar_peak | -88.0792 | 11.88866 | primary | [source](https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf) - Table A2-2: LM2, printed p.57 | South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit. |
| IM3_REINER_GAMMA | IM-3 / Lunar Vertex target | IM-3 라이너 감마 목표점 | future | 7.585 | -58.725 | primary | [source](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2022.926018/full) - Figures 3, 9 and 10 captions: targeted LVx landing site | Planned science target, not an observed landing or a confirmed touchdown point. KASI associates LUSEM with IM-3/CP-11 at Reiner Gamma; https://pda.kasi.re.kr/lusem.php?lang=en . |

## Source corrections and limitations

The task card's NTRS 20250007692 resolves to 'LEMS-A3 Lunar Environment Monitoring Station Thermal Control Subsystem', not a coordinate catalogue: https://ntrs.nasa.gov/citations/20250007692 . It is not used for coordinates. The cited Goossens et al. (2025) full coordinate table was not verified and is not presented as evidence. The exact, accessible representative coordinates instead come from Wueller et al. (2026), DOI 10.1029/2025JE009434. NASA supplies region membership; the original paper supplies each numerical pair.

This is a curated comparison catalogue, not an exhaustive or live registry of every lunar mission. Provider schedules and final future touchdown positions can change. Individual source uncertainties are retained when reported; no uniform metre-level accuracy is asserted. Reopening a source and checking its row is still required for independent review.

## Independent review supplied by user (2026-11-14)

The user reported that independent re-extraction of all 33 coordinate pairs matched the original sources exactly: maximum latitude difference 0 degrees and maximum wrapped-longitude difference 0 degrees. The contract checker, regeneration in a separate copy, and actual-browser display of 33 cards with a mock banner passed. These are user-supplied results for implementation commit a09b0dbfba0a5b075404ecafe57dbb24f4306b59, not new independent tests performed during this documentation update and not human sign-off. Exact datum confirmation has the separate 9 confirmed / 24 unverified scope above. Human review remains TO CHECK.

## Artemis original full text

Publisher: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434 ; accessible ETH copy of the same published article (DOI 10.1029/2025JE009434), Appendix Table A1: https://www.research-collection.ethz.ch/server/api/core/bitstreams/fdbbd74d-ec07-4adc-9869-51a416cce9f1/content ; ETH repository record: https://www.research-collection.ethz.ch/items/828482bf-3641-40d8-a6b3-86378841d4e2 . The ETH PDF was opened for this documentation update and its DOI and Table A1 were checked. This confirms document identity and access, not the exact datum of the Artemis coordinates.

## Terrain handoff and mock fallbacks

All 33 elev_m=null values mean unconfirmed terrain heights, not elevations of zero. In the current core.js, missing real horizon files cause flatHorizon(site) to substitute h0_m = site.elev_m ?? 0 and a zero-degree horizon mask, marked mock=true and flat=true; the 2 m observer offset is then added separately. The resulting zero terrain height and flat horizon are MOCK fallbacks for app operation, not measured terrain or validated visibility. A real ephemeris or a source-matched coordinate does not make these terrain assumptions real. Keep the app mock indication until real terrain inputs replace the fallbacks.

Terrain owners must obtain heights above R=1737.4 km and real curvature-aware horizon masks at the catalogue coordinates, with datum provenance, before treating derived visibility as terrain-based results. Do not replace null by zero in sites.json or infer terrain heights from this fallback. No heights, coordinates, core.js, horizon files or app UI were changed by this follow-up.

## Reproduce and verify

```sh
python pipeline/build_sites.py
python pipeline/check_contract.py
```

`docs/sites_source_audit.json` retains the original east-longitude value and exact row/figure locator for each record, including 0..360-to-signed conversions. It documents this author's source review, not an independent PASS. A separate reviewer should open every source and compare latitude and wrapped longitude within 0.01 degrees, paying attention to regional representatives and source precision.

The three old card-6 mock horizon files for APOLLO17, CHANGE4 and SHACKLETON_RIM were tied to obsolete placeholder coordinates. They are removed, not moved to the new sites or replaced with invented terrain. core.js already supplies an explicitly mock flat fallback until the terrain owners generate real horizons. This catalogue does not provide terrain-visibility results.

NASA 2024 region membership: https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
KASI LUSEM association: https://pda.kasi.re.kr/lusem.php?lang=en
