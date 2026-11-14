# NASA Data (DRAFT)

> **팀용 요약 (한국어)**: 공식 'NASA Data' 칸 초안. `data/DATASETS.md`(main `ad945de`)에 있는 NASA 자료만 옮겼다. 각 줄 = 자료 이름, 링크, 우리 도구에서의 역할.
> 제출 직전에 `data/DATASETS.md`가 늘었으면(중계탑·한국·3D 병합 후 SVS Moon Kit 등) 여기도 추가. 비NASA 자료(논문 좌표, KASA/KARI 등)는 `06_partner_data_and_references.md`로.

## Ephemeris and geometry (NASA/JPL NAIF, JPL SSD)
| Data | Link | Role in our project |
|---|---|---|
| DE440s planetary ephemeris (`de440s.bsp`) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp | Positions of the Moon, Sun and Earth → hourly Sun/Earth directions 2026–2030 (`web/data/ephem.bin`) |
| DE421 lunar orientation (`moon_pa_de421_1900-2050.bpc`) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc | Lunar libration / principal-axis orientation |
| Lunar frames kernel (`moon_080317.tf`) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf | PA → MOON_ME (mean Earth) rotation; all coordinates in MOON_ME |
| Planetary constants (`pck00008.tpc`) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/a_old_versions/pck00008.tpc | Planetary constants (we fix the lunar radius at 1737.4 km) |
| Leap seconds (`naif0012.tls`) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls | UTC ↔ TDB time conversion |
| JPL Horizons API | https://ssd.jpl.nasa.gov/api/horizons.api (docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Independent check of Sun/Earth azimuth-elevation at 6 lunar sites (1,452 comparisons); [PENDING MERGE: s4-korea-links-sua] Danuri (KPLO) trajectory, `COMMAND='-155'` |

## Terrain (LRO LOLA)
| Data | Link | Role |
|---|---|---|
| PGDA LOLA south-polar DEMs 5 m (87°S), 10 m, 20 m, 60 m, 80 m, 240 m | https://pgda.gsfc.nasa.gov/products/81 (5 m), https://pgda.gsfc.nasa.gov/products/90 (10–240 m); files under https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ and https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/ | Near-field terrain for south-polar sites (finest first) in the horizon engine |
| PGDA Site04 Shackleton-rim regional DEM (5 m) | https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif (product https://pgda.gsfc.nasa.gov/products/78) | Cross-product landmark/georeferencing check |
| SLDEM2015 (LOLA + SELENE TC), 512 px/deg (≈59 m) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/tiles/float_img/ | Near-field terrain (±150 km) for sites between 60°S and 60°N |
| LOLA GDR LDEM_64 and LDEM_16 (float) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/float_img/ | Far-field terrain to 300 km; whole-Moon maps |
| LOLA GDR LDEM_64 (int16) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.img | Independent unit check of the float product |
| LOLA GDR LDEM_45S_400M (polar stereographic) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/float_img/ldem_45s_400m_float.img | Independent registration check of SLDEM/LDEM |

## Validation truth (PGDA)
| Data | Link | Role |
|---|---|---|
| Average solar illumination and Earth visibility, 85–90°S, 60 m (`AVGVISIB_85S_060M_201608.TIF`, `..._EARTH.TIF`) | https://pgda.gsfc.nasa.gov/products/69 ; files under https://pgda.gsfc.nasa.gov/data/MoonIllumination/ | Answer sheet: our 18.6-year averages vs NASA's at 240 random points and named sites [TBD: results] |
| Same, 75–90°S, 120 m (`AVGVISIB_75S_120M_201608.TIF`, `..._EARTH.TIF`) | same | Named sites outside 85°S; whole-Moon map validation in 75–85°S [TBD: results] |

## Landing-site coordinates (NASA sources)
| Data | Link | Role |
|---|---|---|
| NSSDCA Apollo Lunar Module coordinates | https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html | Apollo 11, 12, 14, 15, 16, 17 sites |
| NSSDCA lunar artefact table | https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html | Luna 16, 20, 24 |
| LROC (NASA/GSFC/ASU) lander posts 637, 1168, 1172.2020, 1374, 1314, 1358, 1360, 1408, 1406 | https://lroc.im-ldi.com/images/637 (and the other post numbers) | Chang'e 3/4/5/6, Chandrayaan-3, SLIM, IM-1, IM-2, Blue Ghost 1 (coordinates only; no images redistributed) |
| NASA Lunar Surface Data Book ACD-50044 Rev A (2023), Table A2-2 | https://ntrs.nasa.gov/citations/20230007818 | Five south-polar ridge/rim sites |
| NASA Lunar Surface Data Book M2M-30044 (2025), Table A2.1-1 | https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf | Shackleton rim reference point for terrain checks |
| NASA Artemis III landing-region update (release 24-136, 2024-10-28) | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ | Defines which nine regions are Artemis III candidates |

## Pending (add only if used in the final build)
- [PENDING MERGE: s4-globe3d-sua] NASA SVS CGI Moon Kit colour map — https://svs.gsfc.nasa.gov/4720 [UNVERIFIED: confirm the 3D globe uses it and add to DATASETS.md].
- [PENDING MERGE: s4-korea-links-sua] NAIF DSN station kernels / KDSA `kdsa01.tf` — exact URLs to be copied from DATASETS.md after merge.
- [PENDING MERGE: s4-relay-tower-sua] NASA BEACON study (NTRS 20240014584) — used only as context for mast height.
