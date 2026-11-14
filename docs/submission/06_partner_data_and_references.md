# Space Agency Partner Data and Other References (DRAFT)

> **팀용 요약 (한국어)**: 공식 '우주기관 파트너 자료·기타 참고' 칸 초안. ① KASA/KARI 자료(다누리 궤도, ShadowCam, KDSA) ② 비NASA 좌표 출처 ③ 논문 ④ 라이브러리·글꼴과 라이선스.
> 약관상 **출처를 하나라도 빠뜨리면 수상 취소 가능**이라, 병합되는 브랜치가 생길 때마다 여기에 추가해야 한다. ShadowCam 재배포 조건·KDSA 좌표 사용 조건은 **미확인(동주님 문의 중)**.
> 라이브러리 라이선스는 일반적으로 알려진 값을 적었고 버전별로 다시 확인해야 한다 `[UNVERIFIED]`.

## Space agency partner data (KASA / KARI)
| Item | Source | Role | Terms |
|---|---|---|---|
| Danuri (KPLO) trajectory | JPL Horizons, `COMMAND='-155'`: https://ssd.jpl.nasa.gov/api/horizons.api | [PENDING MERGE: s4-korea-links-sua] When Korea's lunar orbiter passes above a chosen site (could it relay?) | JPL service terms; trajectory after 2026-11-10 is a prediction |
| ShadowCam (on Danuri/KPLO) mosaics — image credit **NASA/KARI/ASU** | PDS archive https://pds.shadowcam.asu.edu/ (bundle DOI 10.17189/y89z-kt98); mission site https://shadowcam.im-ldi.com/ | [PENDING MERGE: s4-korea-links-sua] Context images of permanently shadowed regions near our south-polar sites | PDS products public with DOI citation; website image redistribution terms [UNVERIFIED — asked organisers] |
| Korea Deep Space Antenna (KDSA) location | NAIF kernel `kdsa01.tf` [UNVERIFIED: exact URL to copy from DATASETS.md after merge] | [PENDING MERGE: s4-korea-links-sua] Hours when the Moon is ≥ 10° above KDSA's horizon, compared with NASA DSN | Terms [UNVERIFIED — asked organisers] |
| KASI DALO LUSEM mission page | https://pda.kasi.re.kr/lusem.php?lang=en | Context for the IM-3 / Reiner Gamma target (Korean instrument on a CLPS lander) | KASI website terms |

## Other (non-NASA) coordinate sources
- Wueller et al. 2026, *JGR Planets*, Appendix Table A1, doi:10.1029/2025JE009434 — representative coordinates for the nine Artemis III regions.
- Waller et al. 2022, *Front. Astron. Space Sci.* 9:926018, doi:10.3389/fspas.2022.926018 — IM-3 Reiner Gamma target point.
- Validation-only test point: doi:10.1038/s41467-019-12278-3 (Chang'e-4 landing paper) — used only to test the ephemeris, not in the catalogue.

## Papers cited
- Mazarico, E., Neumann, G. A., Smith, D. E., Zuber, M. T., Torrence, M. H. (2011). Illumination conditions of the lunar polar regions using LOLA topography. *Icarus* 211, 1066–1081. doi:10.1016/j.icarus.2010.10.030
- Barker, M. K., et al. (2016). A new lunar digital elevation model from the Lunar Orbiter Laser Altimeter and SELENE Terrain Camera. *Icarus* 273, 346–355. doi:10.1016/j.icarus.2015.07.039
- Barker, M. K., et al. (2021). Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions. *Planet. Space Sci.* doi:10.1016/j.pss.2020.105119
- Barker, M. K., et al. (2023). [title to copy from DOI page] *Planet. Sci. J.* doi:10.3847/PSJ/acf3e1 [UNVERIFIED: title]
- Smith, D. E., et al. (2010). Initial observations from the Lunar Orbiter Laser Altimeter (LOLA). *Geophys. Res. Lett.* 37, L18204. doi:10.1029/2010GL043751
- Park, R. S., et al. (2021). The JPL Planetary and Lunar Ephemerides DE440 and DE441. *Astron. J.* 161, 105. doi:10.3847/1538-3881/abd414
- Folkner, W. M., et al. (2009). The Planetary and Lunar Ephemeris DE 421. JPL IPN Progress Report 42-178.
- Grieser, S. A., et al. (2025). ShadowCam Controlled Mosaics. LPSC 56, abstract #2523 — [PENDING MERGE: s4-korea-links-sua; cite only if ShadowCam mosaics are shown]
- Rhodes, B. Skyfield: High precision research-grade positions for planets and Earth satellites. Astrophysics Source Code Library ascl:1907.024 [UNVERIFIED: ASCL id]

[UNVERIFIED] Paper titles and co-author names are not in `data/DATASETS.md` and were written by the SI from memory — check each against its DOI page before submission.

## Software (all open source)
| Library | Use | Licence `[UNVERIFIED per version]` |
|---|---|---|
| Skyfield 1.54 | Ephemeris, frames | MIT |
| jplephem 2.24 | SPK/PCK reading | MIT |
| sgp4 2.25 | Skyfield dependency | MIT |
| NumPy | Arrays | BSD-3-Clause |
| Numba | Fast horizon/map kernels | BSD-2-Clause |
| Requests | HTTP Range downloads | Apache-2.0 |
| tifffile, imagecodecs | GeoTIFF reading | BSD-3-Clause |
| pyproj | Polar stereographic projection | MIT |
| Rasterio (GDAL) | Independent pixel checks | BSD-3-Clause (GDAL: MIT) |
| pytest | Tests | MIT |
| Node.js | Browser-code cross-check script | MIT |
| [PENDING MERGE: s4-globe3d-sua] 3D viewer libraries, if any | — | [TBD] |

**Fonts**: the page uses the visitor's system fonts only (`system-ui`, "Segoe UI", "Noto Sans KR" if installed, monospace for numbers); no font files are bundled or loaded from a web service.

**Services**: GitHub (repository), GitHub Pages and GitHub Actions (hosting).

## Our licence
Our code is released under the **Apache License 2.0** (`LICENSE`). NASA/JPL data keep their own terms (US Government public data or JPL/NAIF distribution terms) and are not relicensed. Coordinates from papers are used as numeric facts with citation; no third-party images are redistributed in the repository.
