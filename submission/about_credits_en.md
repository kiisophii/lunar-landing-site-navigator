# About page — "Data & credits" text (Luna Sight, Team Ginkgo Orbit)

> **팀용 (한국어):** 앱 About 페이지 "Data & credits" 칸에 그대로 붙여 넣을 영어 문구다. 바탕은 `submission/resources_en.md`(민철님 라이선스 표, main `8eff7ac`)이고, 각 제공처가 요구하는 표기는 2026-11-14에 원문 페이지를 직접 열어 확인했다.
> 본문(아래 "Text for the page")에는 확인 표시를 넣지 않았다. 각 줄 번호(C1…)의 확인 상태는 아래 **"Check status"** 표에 있다. **⚠ = 제공처가 요구하는 정확한 문구를 확인하지 못한 항목**(문구는 우리가 쓴 일반적인 인용 형식).
> 글꼴 Pretendard·Oxanium은 수아님 디자인 브랜치(`s5-design-impl-sua` `46cd9a2`)에서만 쓰고 main에는 아직 없다. 디자인이 합쳐질 때 C17–C18을 같이 넣는다.

## Text for the page

### Data & credits

**Terrain — NASA Lunar Reconnaissance Orbiter (LRO), Lunar Orbiter Laser Altimeter (LOLA)**

- C1. South-polar elevation models (5–240 m): NASA Goddard Planetary Geodesy Data Archive (PGDA). Barker et al. (2023), *Planet. Sci. J.* 4, 183, doi:10.3847/PSJ/acf3e1; data doi:10.60903/gsfcpgda-lola-spole. Barker et al. (2021), *Planet. Space Sci.* 203, 105119, doi:10.1016/j.pss.2020.105119.
- C2. Global elevation models LDEM_16 / LDEM_64: LRO LOLA team, NASA PDS Geosciences Node, doi:10.17189/1520642. Smith et al. (2010), *Geophys. Res. Lett.* 37, L18204, doi:10.1029/2010GL043751.
- C3. SLDEM2015 (LOLA + SELENE/Kaguya Terrain Camera; NASA and JAXA): Barker et al. (2016), *Icarus* 273, 346–355, doi:10.1016/j.icarus.2015.07.039.

**Illumination reference used for validation**

- C4. Lunar polar illumination and Earth-visibility maps: NASA GSFC PGDA. Mazarico et al. (2011), *Icarus* 211, 1066–1081, doi:10.1016/j.icarus.2010.10.030.

**Sun and Earth positions**

- C5. SPICE kernels (DE440s, DE421 lunar orientation, lunar frames, leap seconds): NASA JPL Navigation and Ancillary Information Facility (NAIF). Park et al. (2021), *Astron. J.* 161, 105, doi:10.3847/1538-3881/abd414. Acton (1996), *Planet. Space Sci.* 44, 65–70, doi:10.1016/0032-0633(95)00107-7.
- C6. Cross-checked with JPL Horizons (NASA JPL Solar System Dynamics Group).

**3D Moon colour**

- C7. CGI Moon Kit colour map (2019): NASA's Scientific Visualization Studio; visualizer Ernie Wright. Built from LRO LROC Wide Angle Camera data (NASA/GSFC/Arizona State University).

**Landing-site coordinates**

- C8. Apollo and Luna sites: NASA Space Science Data Coordinated Archive (NSSDCA).
- C9. Robotic landers (Chang'e 3–6, Chandrayaan-3, SLIM, IM-1, IM-2, Blue Ghost 1): LROC, NASA/GSFC/Arizona State University.
- C10. Artemis III candidate regions: NASA (28 Oct 2024); representative points from Wueller et al. (2026), *J. Geophys. Res. Planets*, doi:10.1029/2025JE009434.
- C11. Ridge and peak region centres: NASA Lunar Surface Data Book, ACD-50044 Rev A (2023). Shackleton rim point: Gläser et al. (2017), *Planet. Space Sci.*, doi:10.1016/j.pss.2017.07.006.
- C12. Reiner Gamma (IM-3) target: Waller et al. (2022), *Front. Astron. Space Sci.* 9:926018, doi:10.3389/fspas.2022.926018 (CC BY).

**Ground stations and Korea links**

- C13. Korea Deep Space Antenna (Yeoju) coordinates: KARI, kernel kdsa01.tf distributed by NASA JPL NAIF. NASA Deep Space Network coordinates: DSN Telecommunications Link Design Handbook 810-005, module 301.
- C14. ShadowCam data archive (links only): NASA/KARI/ASU, doi:10.17189/y89z-kt98.

**Mission hindcast and concepts**

- C15. Apollo Sun elevations at landing: Apollo Lunar Surface Journal (P. Fjeld and J. Scotti, Sun/Earth altitude table).
- C16. Relay-tower idea: BEACON demonstrator concept, NASA Glenn Research Center (Oleson, Landis et al., 2025; NTRS 20240014584).

**Software and fonts**

- C17. Pretendard — Copyright (c) 2021 Kil Hyung-jin, SIL Open Font License 1.1.
- C18. Oxanium — Copyright 2019 The Oxanium Project Authors, SIL Open Font License 1.1.
- C22. JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors, SIL Open Font License 1.1.
- C19. three.js r170 — Copyright © 2010–2024 three.js authors, MIT License.
- C20. Luna Sight source code: Apache License 2.0, github.com/kiisophii/lunar-landing-site-navigator.

**Disclaimer**

- C21. Luna Sight uses public NASA data and imagery and credits NASA as the source. No NASA logos or insignia are used. NASA has not reviewed, approved or endorsed this project.

## Check status (not for the page)

Opened on 14 November 2026 (KST) unless the source column says "resources_en.md".

| Line | Required wording confirmed? | Where it comes from |
|---|---|---|
| C1 | **Confirmed.** Product 90: "Please cite this paper when using these products: Barker et al., 2023 … Data DOI: 10.60903/gsfcpgda-lola-spole". Product 81 (5 m): "Please cite the following reference when using any of these products: Barker et al., 2021 …" | https://pgda.gsfc.nasa.gov/products/90 ; https://pgda.gsfc.nasa.gov/products/81 |
| C2 | **Confirmed in general, wording ours.** PDS Geosciences FAQ: data sets "are in the public domain" and "should be cited appropriately"; no fixed text. DOI from the node's DOI list (LRO-L-LOLA-4-GDR-V1.0). Smith et al. 2010 is the team's citation (resources_en.md) | https://pds-geosciences.wustl.edu/faq.html ; https://pds-geosciences.wustl.edu/dataserv/doi.htm |
| C3 | ⚠ **Not confirmed.** No provider wording found; joint NASA/JAXA product notice not checked; no dataset DOI found for SLDEM2015 | resources_en.md (REVIEW) |
| C4 | **Confirmed.** Product 69: "Please cite the Mazarico et al. (2011) reference below when using the LOLA illumination maps" | https://pgda.gsfc.nasa.gov/products/69 |
| C5 | **Confirmed (encouraged, not required).** NAIF rules: acknowledgement "is encouraged"; credit page lists Acton 1996 and asks to credit kernel producers. Park et al. 2021 (DE440) from resources_en.md; individual kernel headers not reopened | https://naif.jpl.nasa.gov/naif/rules.html ; https://naif.jpl.nasa.gov/naif/credit.html |
| C6 | ⚠ **No required wording found** on the Horizons page or manual (manual lists the JPL team in "Acknowledgements"). Credit line ours | https://ssd.jpl.nasa.gov/horizons/ ; https://ssd.jpl.nasa.gov/horizons/manual.html |
| C7 | **Confirmed.** "Please give credit for this item to: NASA's Scientific Visualization Studio"; visualizer Ernie Wright; dataset LROC WAC colour mosaic, "Collected by: Arizona State University". We use the 2019 map, not the 2025 one | https://svs.gsfc.nasa.gov/4720/ |
| C8 | ⚠ **Not confirmed.** NSSDCA pages not checked for credit wording; numbers only | resources_en.md (REVIEW) |
| C9 | **Confirmed form.** LROC posts credit images as "[NASA/GSFC/Arizona State University]". We use only the published coordinates, no images | https://lroc.im-ldi.com/images/1314 |
| C10 | ⚠ **Not confirmed.** Article licence still REVIEW in resources_en.md (an AI audit reported CC BY 4.0; publisher terms not confirmed) | resources_en.md |
| C11 | ⚠ **Not confirmed.** NASA technical report and NTRS paper: citation only, no required wording found | resources_en.md (REVIEW) |
| C12 | **Confirmed (resources_en.md).** CC BY in the Frontiers article copyright statement; credit authors and original publication. Not reopened here | resources_en.md |
| C13 | ⚠ **Partly.** KDSA: publicly released NASA/JPL NAIF SPICE file kdsa01.tf, used with citation; no separate permission was requested and no required credit wording was found (docs/source_permissions.md). DSN handbook: no required wording found | resources_en.md; docs/source_permissions.md |
| C14 | **Confirmed in the repository:** "Keep NASA/KARI/ASU and NAIF source credits" (docs/source_permissions.md:14); links and label metadata only, no images redistributed. ShadowCam site not reopened | docs/source_permissions.md |
| C15 | ⚠ **Not confirmed.** ALSJ terms REVIEW; numbers only | resources_en.md |
| C16 | ⚠ **Not confirmed.** Citation only | resources_en.md |
| C17 | **Confirmed.** LICENSE first line "Copyright (c) 2021, Kil Hyung-jin … with Reserved Font Name 'Pretendard'"; OFL 1.1. OFL requires the notice when the font files are redistributed; the design loads them from jsDelivr, so this line is a courtesy credit. **Only if the design branch is merged** | https://github.com/orioncactus/pretendard/blob/main/LICENSE |
| C18 | **Confirmed.** OFL.txt first line "Copyright 2019 The Oxanium Project Authors (https://github.com/sevmeyer/oxanium)"; loaded from Google Fonts. **Only if the design branch is merged** | https://github.com/google/fonts/blob/main/ofl/oxanium/OFL.txt |
| C19 | **Confirmed.** r170 LICENSE "Copyright © 2010-2024 three.js authors", MIT. MIT asks that the notice stay with copies of the software; we load it from cdnjs, so the line plus a link to the LICENSE is enough for the About page | https://github.com/mrdoob/three.js/blob/r170/LICENSE |
| C20 | **Confirmed.** Repository LICENSE = Apache License 2.0 | ../LICENSE |
| C22 | **Confirmed 2026-11-15.** OFL.txt first line "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)"; SIL OFL 1.1. Loaded from Google Fonts by the intro (js/luna-intro.js, HUD text). Numbered C22 so C19–C21 keep their numbers | https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt |
| C21 | **Basis confirmed: NASA Images and Media Usage Guidelines.** NASA content "used in a factual manner that does not imply endorsement may be used"; "NASA should be acknowledged as the source"; the Insignia and Logotype "are not in the public domain"; for SI uses, "do not imply any review or permission was granted by NASA". The Space Apps brand guidelines and 2026 participant terms pages were also opened: neither shows a required disclaimer text, so C21 is our own wording based on the NASA page | https://www.nasa.gov/nasa-brand-center/images-and-media/ ; https://www.spaceappschallenge.org/brand/ ; https://www.spaceappschallenge.org/legal/ |

## Differences from the current About source table (`s5-design-impl-sua`, `web/js/about.js`)

Checked against `46cd9a2`, for the integrator to decide; nothing in that branch was changed.

- CGI Moon Kit row: credit text should be "NASA's Scientific Visualization Studio" (C7); the row now says "NASA SVS 4720" and "NASA media guidelines".
- Oxanium row says "Severin Meyer / Google Fonts"; the licence names "The Oxanium Project Authors" (C18).
- PGDA AVGVISIB row says "NASA data, public domain" and the ALSJ row says "public"; the repository inventory keeps both as REVIEW (C4, C15). Suggest "cite Mazarico et al. 2011" and "numbers only".
- Missing from that table: SLDEM2015 / JAXA as its own credit (C3), Apollo/Luna NSSDCA and LROC lander credits (C8, C9), Waller et al. CC BY (C12).
