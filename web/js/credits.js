// Verbatim from submission/about_credits_en.md (PR #55, Dongju Kim; provider wording checked 2026-11-14). Do not edit here —
// change the .md first. Lines whose exact provider wording is NOT confirmed (⚠ in that file's check table) are marked
// NEEDS CONFIRMATION below; they are shown unchanged on the page.
export const CREDITS = [
  ["Terrain — NASA Lunar Reconnaissance Orbiter (LRO), Lunar Orbiter Laser Altimeter (LOLA)", [
    ["C1", "South-polar elevation models (5–240 m): NASA Goddard Planetary Geodesy Data Archive (PGDA). Barker et al. (2023), *Planet. Sci. J.* 4, 183, doi:10.3847/PSJ/acf3e1; data doi:10.60903/gsfcpgda-lola-spole. Barker et al. (2021), *Planet. Space Sci.* 203, 105119, doi:10.1016/j.pss.2020.105119."],
    ["C2", "Global elevation models LDEM_16 / LDEM_64: LRO LOLA team, NASA PDS Geosciences Node, doi:10.17189/1520642. Smith et al. (2010), *Geophys. Res. Lett.* 37, L18204, doi:10.1029/2010GL043751."],
    ["C3", "SLDEM2015 (LOLA + SELENE/Kaguya Terrain Camera; NASA and JAXA): Barker et al. (2016), *Icarus* 273, 346–355, doi:10.1016/j.icarus.2015.07.039."],  // C3: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
  ]],
  ["Illumination reference used for validation", [
    ["C4", "Lunar polar illumination and Earth-visibility maps: NASA GSFC PGDA. Mazarico et al. (2011), *Icarus* 211, 1066–1081, doi:10.1016/j.icarus.2010.10.030."],
  ]],
  ["Sun and Earth positions", [
    ["C5", "SPICE kernels (DE440s, DE421 lunar orientation, lunar frames, leap seconds): NASA JPL Navigation and Ancillary Information Facility (NAIF). Park et al. (2021), *Astron. J.* 161, 105, doi:10.3847/1538-3881/abd414. Acton (1996), *Planet. Space Sci.* 44, 65–70, doi:10.1016/0032-0633(95)00107-7."],
    ["C6", "Cross-checked with JPL Horizons (NASA JPL Solar System Dynamics Group)."],  // C6: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
  ]],
  ["3D Moon colour", [
    ["C7", "CGI Moon Kit colour map (2019): NASA's Scientific Visualization Studio; visualizer Ernie Wright. Built from LRO LROC Wide Angle Camera data (NASA/GSFC/Arizona State University)."],
  ]],
  ["Landing-site coordinates", [
    ["C8", "Apollo and Luna sites: NASA Space Science Data Coordinated Archive (NSSDCA)."],  // C8: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
    ["C9", "Robotic landers (Chang'e 3–6, Chandrayaan-3, SLIM, IM-1, IM-2, Blue Ghost 1): LROC, NASA/GSFC/Arizona State University."],
    ["C10", "Artemis III candidate regions: NASA (28 Oct 2024); representative points from Wueller et al. (2026), *J. Geophys. Res. Planets*, doi:10.1029/2025JE009434."],  // C10: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
    ["C11", "Ridge and peak region centres: NASA Lunar Surface Data Book, ACD-50044 Rev A (2023). Shackleton rim point: Gläser et al. (2017), *Planet. Space Sci.*, doi:10.1016/j.pss.2017.07.006."],  // C11: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
    ["C12", "Reiner Gamma (IM-3) target: Waller et al. (2022), *Front. Astron. Space Sci.* 9:926018, doi:10.3389/fspas.2022.926018 (CC BY)."],
  ]],
  ["Ground stations and Korea links", [
    ["C13", "Korea Deep Space Antenna (Yeoju) coordinates: KARI, kernel kdsa01.tf distributed by NASA JPL NAIF. NASA Deep Space Network coordinates: DSN Telecommunications Link Design Handbook 810-005, module 301."],  // C13: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
    ["C14", "ShadowCam data archive (links only): NASA/KARI/ASU, doi:10.17189/y89z-kt98."],
  ]],
  ["Mission hindcast and concepts", [
    ["C15", "Apollo Sun elevations at landing: Apollo Lunar Surface Journal (P. Fjeld and J. Scotti, Sun/Earth altitude table)."],  // C15: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
    ["C16", "Relay-tower idea: BEACON demonstrator concept, NASA Glenn Research Center (Oleson, Landis et al., 2025; NTRS 20240014584)."],  // C16: NEEDS CONFIRMATION (⚠ provider wording not confirmed)
  ]],
  ["Software and fonts", [
    ["C17", "Pretendard — Copyright (c) 2021 Kil Hyung-jin, SIL Open Font License 1.1."],
    ["C18", "Oxanium — Copyright 2019 The Oxanium Project Authors, SIL Open Font License 1.1."],
    ["C22", "JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors, SIL Open Font License 1.1."],
    ["C19", "three.js r170 — Copyright © 2010–2024 three.js authors, MIT License."],
    ["C20", "Luna Sight source code: Apache License 2.0, github.com/kiisophii/lunar-landing-site-navigator."],
  ]],
  ["Disclaimer", [
    ["C21", "Luna Sight uses public NASA data and imagery and credits NASA as the source. No NASA logos or insignia are used. NASA has not reviewed, approved or endorsed this project."],
  ]],
];
