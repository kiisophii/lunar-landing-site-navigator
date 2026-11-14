"""Card 4: build the cited catalogue and its human-readable source audit.

Source coordinates below were transcribed from the primary pages identified
by source_url + locator, reviewed 2026-11-14. This is not an automatic web
scraper or an independent verification of those transcriptions.

Run from repository root: python pipeline/build_sites.py
Then: python pipeline/check_contract.py
"""
from collections import Counter
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEWED = "2026-11-14"
APOLLO = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
LUNA = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html"
REGIONS = "https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/"
WUELLER = "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434"
WUELLER_ETH = "https://www.research-collection.ethz.ch/server/api/core/bitstreams/fdbbd74d-ec07-4adc-9869-51a416cce9f1/content"
WUELLER_ETH_RECORD = "https://www.research-collection.ethz.ch/items/828482bf-3641-40d8-a6b3-86378841d4e2"
DATA_BOOK = "https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf"
VERTEX = "https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2022.926018/full"
KASI = "https://pda.kasi.re.kr/lusem.php?lang=en"


def record(id, name, name_ko, short, group, lat, source_lon_east,
           source_url, locator, note, coord_quality="primary"):
    """Keep source longitude separately; normalize only its numeric convention."""
    lon = round((source_lon_east + 180) % 360 - 180, 8)
    site = {"id": id, "name": name, "name_ko": name_ko, "short": short,
            "group": group, "lat": lat, "lon": lon, "elev_m": None,
            "source_url": source_url, "coord_quality": coord_quality, "note": note}
    evidence = {"id": id, "source_url": source_url, "locator": locator,
                "source_lat_north_positive": lat, "source_lon_east_positive": source_lon_east,
                "source_reviewed_date": REVIEWED,
                "review_method": "Primary source opened; numeric pair manually transcribed",
                "longitude_conversion": "(east_lon + 180) modulo 360 - 180",
                "catalogue_lon": lon, "representation": "point"}
    evidence["datum_status"] = ("source_de421_confirmed" if group in ("apollo", "luna")
                                else "exact_moon_me_de421_unverified")
    evidence["datum_basis"] = ("User-reported independent review confirmed DE421 in the cited original source"
                               if group in ("apollo", "luna") else
                               "Numeric source match does not establish the exact MOON_ME_DE421 datum; no transformation applied")
    if group == "artemis3_region":
        evidence["alternate_full_text_url"] = WUELLER_ETH
        evidence["alternate_repository_record_url"] = WUELLER_ETH_RECORD
    return site, evidence


def catalogue():
    rows = []
    for number, lat, lon in [
        (11, 0.67416, 23.47314), (12, -3.0128, -23.4219),
        (14, -3.64589, -17.47194), (15, 26.13239, 3.63330),
        (16, -8.9734, 15.5011), (17, 20.1911, 30.7723),
    ]:
        rows.append(record(f"APOLLO{number}", f"Apollo {number}", f"아폴로 {number}호",
                           f"Apollo {number}", "apollo", lat, lon, APOLLO,
                           f"Apollo {number}: Lunar Module row",
                           "Historical crewed landing; lunar module location (not ALSEP or retroreflector)."))
    for number, lat, lon in [(16, -0.5137, 56.3638), (20, 3.7863, 56.6242), (24, 12.7142, 62.2129)]:
        rows.append(record(f"LUNA{number}", f"Luna {number}", f"루나 {number}호", f"Luna {number}",
                           "luna", lat, lon, LUNA, f"Luna {number}: Soft Landing row",
                           "Historical robotic sample-return landing; NSSDCA/LROC location."))
    for number, lat, lon, url, locator, note in [
        (3, 44.1214, 340.4884, "https://lroc.im-ldi.com/images/637",
         "Paragraph beginning 'Since the rover is close'", "LROC lander position; source longitude 340.4884 E converted to -19.5116 E."),
        (4, -45.4562, 177.5885, "https://lroc.im-ldi.com/images/1168",
         "Paragraph after Yutu-2 traverse table", "Refined LROC lander position; source reports 13 m uncertainty at 95% confidence. Not the Chang'e-2-map coordinate used in some papers."),
        (5, 43.0576, 308.0839, "https://lroc.im-ldi.com/images/1172.2020",
         "Paragraph beginning 'China's Chang'e 5'", "LROC lander position; source longitude 308.0839 E converted to -51.9161 E; reported horizontal accuracy +/-20 m."),
        (6, -41.6385, 206.0148, "https://lroc.im-ldi.com/images/1374",
         "Paragraph beginning 'The LROC team computed'", "LROC lander position; source longitude 206.0148 E converted to -153.9852 E; reported horizontal accuracy +/-30 m."),
    ]:
        rows.append(record(f"CHANGE{number}", f"Chang'e {number}", f"창어 {number}호", f"Chang'e {number}",
                           "change", lat, lon, url, locator, "Historical robotic landing. " + note))
    rows.append(record("CHANDRAYAAN3", "Chandrayaan-3", "찬드라얀 3호", "Chandrayaan-3",
                       "chandrayaan", -69.3741, 32.32, "https://lroc.im-ldi.com/images/1314",
                       "Annotated image caption", "Historical landing; post-landing LROC coordinates, not the pre-launch target ellipse."))
    rows.append(record("SLIM", "SLIM", "슬림", "SLIM", "slim", -13.3160, 25.2510,
                       "https://lroc.im-ldi.com/images/1358", "Opening lander image caption",
                       "Historical JAXA lander position measured by LROC; not the intended landing point."))
    rows.append(record("IM1", "IM-1 Odysseus", "IM-1 오디세우스", "IM-1 Odysseus", "clps", -80.13, 1.44,
                       "https://lroc.im-ldi.com/images/1360", "Second lander image caption",
                       "Historical landed location. Source publishes only two decimal places; do not infer metre-level accuracy."))
    rows.append(record("IM2", "IM-2 Athena", "IM-2 아테나", "IM-2 Athena", "clps", -84.7906, 29.1957,
                       "https://lroc.im-ldi.com/images/1408", "Full-resolution NAC image caption",
                       "Historical actual surface location; lander ended on its side. Not the pre-landing target (-84.78, 29.13)."))
    rows.append(record("BLUE_GHOST1", "Blue Ghost Mission 1", "블루 고스트 1호", "Blue Ghost 1", "clps",
                       18.562, 61.810, "https://lroc.im-ldi.com/images/1406", "Full-resolution oblique image caption",
                       "Historical landed location near Mons Latreille; use lander coordinates, not LRO's imaging position."))

    # NASA's 2024 nine-region set. Each point is a named research CLS within
    # its region, deliberately not claimed to be a polygon centroid or an
    # approved NASA touchdown point. The representative choice is ours.
    for id, name, ko, short, lat, lon, cls in [
        ("ARTEMIS_CABEUS_B", "Peak near Cabeus B", "카베우스 B 인근 봉우리", "Cabeus B area", -83.7630, -69.9830, "PCB01"),
        ("ARTEMIS_HAWORTH", "Haworth", "하워스", "Haworth area", -86.7680, -20.5140, "HW01"),
        ("ARTEMIS_MALAPERT", "Malapert Massif", "말라퍼트 산괴", "Malapert area", -85.9420, -0.9440, "MMA01"),
        ("ARTEMIS_MOUTON_PLATEAU", "Mons Mouton Plateau", "무통산 고원", "Mouton Plateau", -85.1110, 26.7100, "MMP01"),
        ("ARTEMIS_MOUTON", "Mons Mouton", "무통산", "Mons Mouton", -85.4160, 31.8510, "MMO01"),
        ("ARTEMIS_NOBILE_RIM1", "Nobile Rim 1", "노빌레 가장자리 1", "Nobile Rim 1", -85.2950, 36.9170, "NR101"),
        ("ARTEMIS_NOBILE_RIM2", "Nobile Rim 2", "노빌레 가장자리 2", "Nobile Rim 2", -84.0540, 56.4810, "NR201"),
        ("ARTEMIS_DE_GERLACHE_RIM2", "de Gerlache Rim 2", "드 제를라슈 가장자리 2", "deGerlache R2", -88.3890, -68.8650, "dGR201"),
        ("ARTEMIS_SLATER_PLAIN", "Slater Plain", "슬레이터 평원", "Slater Plain", -87.4780, 124.5210, "SP01"),
    ]:
        site, evidence = record(id, name + " (region)", "아르테미스 후보: " + ko + " (대표점)", short,
                                "artemis3_region", lat, lon, WUELLER, f"Appendix Table A1, {cls}",
                                f"region representative point; research CLS {cls}, not a region centre or a NASA-selected touchdown point. NASA 2024 candidate set.")
        evidence["representation"] = "Research CLS chosen to represent the NASA 2024 region"
        evidence["region_membership_source"] = REGIONS
        if cls == "MMA01":
            evidence["name_note"] = "Paper discussion identifies Mons Malapert as formerly Malapert Massif"
        rows.append((site, evidence))

    for id, name, ko, short, lat, lon, locator in [
        ("SHACKLETON_RIM", "Shackleton Rim (R04)", "섀클턴 가장자리 R04", "Shackleton R04", -89.7668, -171.87, "R04 / Site04, printed p.58"),
        ("CONNECTING_RIDGE", "Connecting Ridge (R01)", "연결 능선 R01", "Connect Ridge", -89.4632, -137.49, "R01 / Site01, printed p.58"),
        ("PEAK_NEAR_SHACKLETON", "Peak Near Shackleton (R07)", "섀클턴 인근 봉우리 R07", "Peak Shacklet", -88.811, 123.6901, "R07 / Site07, printed p.58"),
        ("DE_GERLACHE_RIM1", "de Gerlache Rim 1 (R11)", "드 제를라슈 가장자리 R11", "deGerlache R11", -88.6834, -67.9321, "R11 / Site11, printed p.58"),
        ("SHOEMAKER_RIM_A", "Shoemaker Rim A (LM2)", "슈메이커 가장자리 A", "Shoemaker A", -88.0792, 11.88866, "LM2, printed p.57"),
    ]:
        site, evidence = record(id, name, ko, short, "polar_peak", lat, lon, DATA_BOOK,
                                "Table A2-2: " + locator,
                                "South-polar terrain study point; published DEM-polygon centre, not a landed vehicle or a claimed summit.")
        evidence["representation"] = "Published terrain-study polygon centre"
        rows.append((site, evidence))

    site, evidence = record("IM3_REINER_GAMMA", "IM-3 / Lunar Vertex target", "IM-3 라이너 감마 목표점",
                            "IM-3 target", "future", 7.585, -58.725, VERTEX,
                            "Figures 3, 9 and 10 captions: targeted LVx landing site",
                            "Planned science target, not an observed landing or a confirmed touchdown point. KASI associates LUSEM with IM-3/CP-11 at Reiner Gamma; https://pda.kasi.re.kr/lusem.php?lang=en .")
    evidence["representation"] = "Published Lunar Vertex science target for the IM-3 region"
    evidence["mission_association_source"] = KASI
    rows.append((site, evidence))
    return rows


def main():
    rows = catalogue()
    sites = [site for site, _ in rows]
    assert len(sites) >= 30 and len({s["id"] for s in sites}) == len(sites)
    assert all(-90 <= s["lat"] <= 90 and -180 <= s["lon"] <= 180 for s in sites)
    assert all(len(s["short"]) <= 14 for s in sites)
    assert all(s["source_url"].startswith("https://") for s in sites)
    assert sum(s["group"] == "artemis3_region" for s in sites) == 9
    for site, evidence in rows:
        assert abs(site["lat"] - evidence["source_lat_north_positive"]) < 1e-10
        delta = (site["lon"] - evidence["source_lon_east_positive"] + 180) % 360 - 180
        assert abs(delta) < 1e-10
    out = ROOT / "web/data/sites.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(sites, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    audit = {"reviewed_date": REVIEWED, "n_sites": len(sites), "n_region_representatives": 9,
             "counts_by_group": dict(Counter(s["group"] for s in sites)),
             "scope": "Manual primary-source transcription and numeric convention checks, not an independent source re-extraction or human sign-off",
             "datum_counts": {"source_de421_confirmed": 9, "exact_moon_me_de421_unverified": 24},
             "datum_scope": "Application target frame is MOON_ME_DE421; source numeric agreement alone does not confirm that datum. Status for nine Apollo/Luna entries is based on user-reported independent review, not a new author datum audit.",
             "rows": [evidence for _, evidence in rows]}
    (ROOT / "docs/sites_source_audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    lines = ["# Landing sites and region representatives", "",
             f"Card 4 catalogue: {len(sites)} entries. Source review date: {REVIEWED}.", "",
             "## Coordinate policy", "",
             "Latitude is north-positive and longitude is east-positive in [-180, 180). MOON_ME_DE421 is the application's required target frame, not a verified datum claim for every catalogue entry. Numerical agreement with a source and confirmation of its exact coordinate datum are separate checks. The user-reported independent review confirmed DE421 in the original sources for all six Apollo and three Luna entries. The remaining 24 entries have exact MOON_ME_DE421 datum UNVERIFIED; an LROC or LOLA association alone does not prove the exact datum. No datum transformation has been applied, and no coordinate was changed in this documentation follow-up.", "",
             "`coord_quality=primary` means the numbers are published by the official archive, measurement team or original paper. It is not an accuracy class, does not certify the exact MOON_ME_DE421 datum and does not mean a point is NASA-approved. LROC's own image measurements are primary values under the contract; `secondary` would describe a location we derived from imagery ourselves. Coordinate precision is preserved; IM-1 remains a coarse two-decimal location.", "",
             "All `elev_m` values are null. Heights must be sampled from the team's DEM pipeline above R=1737.4 km; null is unknown, not a measured zero. We deliberately do not mix article elevations with potentially different vertical control. The observer's +2 m belongs in the geometry, not in the stored terrain elevation.", "",
             "## Datum confirmation status", "",
             "| Entries | Count | Exact source datum status |",
             "|---|---:|---|",
             "| Apollo 11, 12, 14, 15, 16, 17 | 6 | Source DE421 confirmed in user-reported independent review |",
             "| Luna 16, 20, 24 | 3 | Source DE421 confirmed in user-reported independent review |",
             "| Change, Chandrayaan, SLIM, CLPS, Artemis representatives, polar study points and future target | 24 | Exact MOON_ME_DE421 datum unverified |", "",
             "Per-entry status and its evidence basis are recorded in docs/sites_source_audit.json. These documentation-only fields do not extend the sites.json contract.", "",
             "## Point meanings", "",
             "Apollo entries identify lunar modules, not ALSEP stations or retroreflectors. Robotic entries use post-landing positions. The Chang'e-4 point follows the refined 2020 LROC solution (-45.4562, 177.5885), rather than the different Chang'e-2-map solution used for the card 1 geometry test; those test coordinates were not a catalogue decision.", "",
             "The nine Artemis entries reproduce the membership of NASA's 2024-10-28 candidate-region list. Each is represented by one explicitly identified research CLS in Wueller et al. (2026), Appendix Table A1; it is not a region centroid, boundary or selected NASA touchdown point. Choosing the first listed CLS is a reproducible display choice, not a ranking or recommendation. No mission schedule is inferred from the historical Artemis III label. Slater Plain uses SP01, whose longitude is explicitly 124.5210 E; it is not the centre of Slater crater.", "",
             "The five polar_peak records are published topographic study points (polygon centres), not necessarily summits. The IM-3 entry is the published Lunar Vertex science target; KASI supplies the IM-3/LUSEM mission association, not a more precise landing location or launch-date guarantee.", "",
             "## Catalogue", "",
             "| ID | English name | Korean label | Group | Latitude N | Longitude E | Quality | Source / locator | Note |",
             "|---|---|---|---|---:|---:|---|---|---|"]
    for site, evidence in rows:
        lines.append("| " + " | ".join([site["id"], site["name"], site["name_ko"], site["group"],
                                         str(site["lat"]), str(site["lon"]), site["coord_quality"],
                                         f"[source]({site['source_url']}) - {evidence['locator']}", site["note"]]) + " |")
    lines += ["", "## Source corrections and limitations", "",
              "The task card's NTRS 20250007692 resolves to 'LEMS-A3 Lunar Environment Monitoring Station Thermal Control Subsystem', not a coordinate catalogue: https://ntrs.nasa.gov/citations/20250007692 . It is not used for coordinates. The cited Goossens et al. (2025) full coordinate table was not verified and is not presented as evidence. The exact, accessible representative coordinates instead come from Wueller et al. (2026), DOI 10.1029/2025JE009434. NASA supplies region membership; the original paper supplies each numerical pair.", "",
              "This is a curated comparison catalogue, not an exhaustive or live registry of every lunar mission. Provider schedules and final future touchdown positions can change. Individual source uncertainties are retained when reported; no uniform metre-level accuracy is asserted. Reopening a source and checking its row is still required for independent review.", "",
              "## Independent review supplied by user (2026-11-14)", "",
              "The user reported that independent re-extraction of all 33 coordinate pairs matched the original sources exactly: maximum latitude difference 0 degrees and maximum wrapped-longitude difference 0 degrees. The contract checker, regeneration in a separate copy, and actual-browser display of 33 cards with a mock banner passed. These are user-supplied results for implementation commit a09b0dbfba0a5b075404ecafe57dbb24f4306b59, not new independent tests performed during this documentation update and not human sign-off. Exact datum confirmation has the separate 9 confirmed / 24 unverified scope above. Human review remains TO CHECK.", "",
              "## Artemis original full text", "",
              f"Publisher: {WUELLER} ; accessible ETH copy of the same published article (DOI 10.1029/2025JE009434), Appendix Table A1: {WUELLER_ETH} ; ETH repository record: {WUELLER_ETH_RECORD} . The ETH PDF was opened for this documentation update and its DOI and Table A1 were checked. This confirms document identity and access, not the exact datum of the Artemis coordinates.", "",
              "## Terrain handoff and mock fallbacks", "",
              "All 33 elev_m=null values mean unconfirmed terrain heights, not elevations of zero. In the current core.js, missing real horizon files cause flatHorizon(site) to substitute h0_m = site.elev_m ?? 0 and a zero-degree horizon mask, marked mock=true and flat=true; the 2 m observer offset is then added separately. The resulting zero terrain height and flat horizon are MOCK fallbacks for app operation, not measured terrain or validated visibility. A real ephemeris or a source-matched coordinate does not make these terrain assumptions real. Keep the app mock indication until real terrain inputs replace the fallbacks.", "",
              "Terrain owners must obtain heights above R=1737.4 km and real curvature-aware horizon masks at the catalogue coordinates, with datum provenance, before treating derived visibility as terrain-based results. Do not replace null by zero in sites.json or infer terrain heights from this fallback. No heights, coordinates, core.js, horizon files or app UI were changed by this follow-up.", "",
              "## Reproduce and verify", "", "```sh", "python pipeline/build_sites.py", "python pipeline/check_contract.py", "```", "",
              "`docs/sites_source_audit.json` retains the original east-longitude value and exact row/figure locator for each record, including 0..360-to-signed conversions. It documents this author's source review, not an independent PASS. A separate reviewer should open every source and compare latitude and wrapped longitude within 0.01 degrees, paying attention to regional representatives and source precision.", "",
              "The three old card-6 mock horizon files for APOLLO17, CHANGE4 and SHACKLETON_RIM were tied to obsolete placeholder coordinates. They are removed, not moved to the new sites or replaced with invented terrain. core.js already supplies an explicitly mock flat fallback until the terrain owners generate real horizons. This catalogue does not provide terrain-visibility results.", "",
              f"NASA 2024 region membership: {REGIONS}", f"KASI LUSEM association: {KASI}", ""]
    (ROOT / "docs/sites.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Built {len(sites)} sites, including 9 region representative points.")
    print(json.dumps(audit["counts_by_group"], sort_keys=True))


if __name__ == "__main__":
    main()
