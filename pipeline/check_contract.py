"""Validate every file in web/data/ against docs/data_contract.md (v1.1).

Usage:  python pipeline/check_contract.py [--data web/data]
Exit code 0 = all good, 1 = at least one ERROR. WARN lines do not fail the check.
Standard library only (no numpy), so anyone can run it.
"""
import argparse
import json
import math
import re
import struct
import sys
from pathlib import Path

GROUPS = {"apollo", "luna", "change", "chandrayaan", "slim", "clps", "artemis3_region",
          "polar_peak", "future", "custom"}
QUALITY = {"primary", "secondary", "estimated"}
ID_RE = re.compile(r"^[A-Z0-9]+(_[A-Z0-9]+)*$")
EPHEM_COLUMNS = ["sun_x", "sun_y", "sun_z", "earth_x", "earth_y", "earth_z"]
REAL_EPHEM_N = 43824

errors, warns = [], []


def err(where, msg):
    errors.append(f"ERROR {where}: {msg}")


def warn(where, msg):
    warns.append(f"WARN  {where}: {msg}")


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def need(obj, keys, where):
    if not isinstance(obj, dict):
        err(where, "must be an object")
        return False
    ok = True
    for k in keys:
        if k not in obj:
            err(where, f"missing key '{k}'")
            ok = False
    return ok


def check_mock_flag(obj, where):
    if "mock" in obj and not isinstance(obj["mock"], bool):
        err(where, "'mock' must be true/false")
    if obj.get("mock") is True:
        warn(where, "mock data (fine for UI work, not for results)")


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(path.name, f"not valid JSON: {e}")
        return None


# ---------------------------------------------------------------- 1. sites.json
def check_sites(data):
    p = data / "sites.json"
    if not p.exists():
        err("sites.json", "file missing")
        return {}
    arr = load_json(p)
    if not isinstance(arr, list) or not arr:
        err("sites.json", "must be a non-empty array")
        return {}
    sites = {}
    for n, s in enumerate(arr):
        w = f"sites.json[{n}]"
        if not need(s, ["id", "name", "name_ko", "short", "group", "lat", "lon", "elev_m",
                        "source_url", "coord_quality", "note"], w):
            continue
        w = f"sites.json[{s['id']}]"
        if not isinstance(s["id"], str) or not ID_RE.match(s["id"]):
            err(w, "id must be UPPER_SNAKE")
        if s["id"] in sites:
            err(w, "duplicate id")
        if not is_num(s["lat"]) or not -90 <= s["lat"] <= 90:
            err(w, f"lat {s['lat']} not in -90..90")
        if not is_num(s["lon"]) or not -180 <= s["lon"] <= 180:
            err(w, f"lon {s['lon']} not in -180..180 (east positive)")
        if s["elev_m"] is not None and (not is_num(s["elev_m"]) or not -10000 <= s["elev_m"] <= 11000):
            err(w, "elev_m must be null or metres in -10000..11000")
        if s["group"] not in GROUPS:
            err(w, f"group '{s['group']}' not in {sorted(GROUPS)}")
        if s["coord_quality"] not in QUALITY:
            err(w, f"coord_quality '{s['coord_quality']}' not in {sorted(QUALITY)}")
        if not isinstance(s["short"], str) or len(s["short"]) > 14:
            err(w, "short must be a string of <= 14 characters")
        for k in ("name", "name_ko", "note", "source_url"):
            if not isinstance(s[k], str):
                err(w, f"{k} must be a string")
        url = s["source_url"] if isinstance(s["source_url"], str) else ""
        if url and not url.startswith(("http://", "https://")):
            err(w, "source_url must be an http(s) URL")
        if not url:
            (warn if s.get("mock") else err)(w, "source_url is empty (every source must be cited)")
        if s["coord_quality"] == "estimated" and not s["note"]:
            err(w, "estimated coordinates need an explanation in 'note'")
        if s["group"] == "artemis3_region" and "region representative point" not in s["note"]:
            err(w, "Artemis III regions: note must say 'region representative point'")
        check_mock_flag(s, w)
        sites[s["id"]] = s
    print(f"sites.json: {len(sites)} sites")
    return sites


# ---------------------------------------------------------------- 2. ephemeris
def check_ephem(data):
    pj, pb = data / "ephem.json", data / "ephem.bin"
    if not pj.exists() or not pb.exists():
        err("ephem", "ephem.json and ephem.bin are both required")
        return
    m = load_json(pj)
    if not need(m, ["start", "step_h", "n", "frame", "units", "columns", "source"], "ephem.json"):
        return
    if m["start"] != "2026-01-01T00:00:00Z":
        err("ephem.json", "start must be 2026-01-01T00:00:00Z (hour index 0)")
    if m["step_h"] != 1:
        err("ephem.json", "step_h must be 1")
    if m["frame"] != "MOON_ME_DE421":
        err("ephem.json", "frame must be MOON_ME_DE421")
    if m["units"] != "km":
        err("ephem.json", "units must be km")
    if m["columns"] != EPHEM_COLUMNS:
        err("ephem.json", f"columns must be {EPHEM_COLUMNS}")
    check_mock_flag(m, "ephem.json")
    n = m["n"]
    if not isinstance(n, int) or n < 1:
        err("ephem.json", "n must be a positive integer")
        return
    if not m.get("mock") and n != REAL_EPHEM_N:
        err("ephem.json", f"real ephemeris must have n = {REAL_EPHEM_N} (2026-2030 hourly)")
    raw = pb.read_bytes()
    if len(raw) != n * 6 * 4:
        err("ephem.bin", f"size {len(raw)} B != n*6*4 = {n * 24} B")
        return
    bad = 0
    s_rng = [math.inf, -math.inf]
    e_rng = [math.inf, -math.inf]
    for k, r in enumerate(struct.iter_unpack("<6f", raw)):
        if not all(math.isfinite(v) for v in r):
            err("ephem.bin", f"non-finite value at row {k}")
            return
        ds = math.sqrt(r[0] ** 2 + r[1] ** 2 + r[2] ** 2)
        de = math.sqrt(r[3] ** 2 + r[4] ** 2 + r[5] ** 2)
        s_rng = [min(s_rng[0], ds), max(s_rng[1], ds)]
        e_rng = [min(e_rng[0], de), max(e_rng[1], de)]
        if not (1.40e8 <= ds <= 1.60e8 and 3.50e5 <= de <= 4.10e5):
            bad += 1
            if bad <= 3:
                err("ephem.bin", f"row {k}: |sun|={ds:.4g} km, |earth|={de:.4g} km out of range "
                                 "(sun 1.40e8..1.60e8, earth 3.50e5..4.10e5) - wrong units/columns?")
    print(f"ephem: n={n}, |sun| {s_rng[0]:.4g}..{s_rng[1]:.4g} km, |earth| {e_rng[0]:.4g}..{e_rng[1]:.4g} km")


# ---------------------------------------------------------------- 3. horizons
def check_horizons(data, sites):
    d = data / "horizon"
    files = sorted(d.glob("*.json")) if d.exists() else []
    for p in files:
        w = f"horizon/{p.name}"
        h = load_json(p)
        if not need(h, ["id", "lat", "lon", "h0_m", "obs_height_m", "az_step_deg",
                        "mask", "max_range_km", "dem_sources"], w):
            continue
        if p.stem != h["id"]:
            err(w, f"file name must be <id>.json (id = {h['id']})")
        if h["id"] not in sites:
            err(w, "id not in sites.json")
        elif is_num(h["lat"]) and is_num(h["lon"]):
            s = sites[h["id"]]
            if abs(h["lat"] - s["lat"]) > 1e-4 or abs(h["lon"] - s["lon"]) > 1e-4:
                err(w, f"lat/lon ({h['lat']}, {h['lon']}) differ from sites.json ({s['lat']}, {s['lon']})")
        if h["obs_height_m"] != 2:
            err(w, "obs_height_m must be 2")
        if not is_num(h["h0_m"]) or not -10000 <= h["h0_m"] <= 11000:
            err(w, "h0_m must be metres above R=1737.4 km, within -10000..11000")
        step = h["az_step_deg"]
        if not is_num(step) or step <= 0 or abs(360 / step - round(360 / step)) > 1e-9:
            err(w, "az_step_deg must divide 360")
        else:
            nbin = round(360 / step)
            mask = h["mask"]
            if not isinstance(mask, list) or len(mask) != nbin:
                err(w, f"mask must have {nbin} numbers (360 / az_step_deg)")
            elif not all(is_num(v) and -90 <= v <= 90 for v in mask):
                err(w, "mask values must be degrees in -90..90")
            elif max(mask) > 60:
                warn(w, f"max mask {max(mask):.1f} deg is very high - check units")
        if not isinstance(h["dem_sources"], list):
            err(w, "dem_sources must be a list")
        elif not h.get("mock"):
            if not h["dem_sources"]:
                err(w, "real horizon needs dem_sources")
            for ds in h["dem_sources"]:
                if not isinstance(ds, dict) or not {"name", "res_m", "to_km"} <= set(ds):
                    err(w, "each dem_source needs name, res_m, to_km")
            if not is_num(h["max_range_km"]) or h["max_range_km"] <= 0:
                err(w, "max_range_km must be > 0")
        check_mock_flag(h, w)
    missing = sorted(set(sites) - {p.stem for p in files})
    if missing:
        warn("horizon", f"no horizon file for {missing} (app falls back to a flat 0 deg mask)")
    idx_path = data / "horizon_index.json"
    if idx_path.exists():
        idx = load_json(idx_path)
        listed = set(idx.get("ids", [])) if isinstance(idx, dict) and isinstance(idx.get("ids"), list) else None
        if listed is None:
            err("horizon_index.json", "must be {\"ids\": [...]}")
        elif listed != {p.stem for p in files}:
            err("horizon_index.json", f"ids differ from horizon/*.json files (missing {sorted({p.stem for p in files} - listed)}, "
                f"extra {sorted(listed - {p.stem for p in files})}) - run: python pipeline/run_horizons.py --index-only")
    print(f"horizon: {len(files)} files")


# ---------------------------------------------------------------- 4. metrics (optional)
def check_metrics(data, sites):
    d = data / "metrics"
    for p in sorted(d.glob("*.json")) if d.exists() else []:
        w = f"metrics/{p.name}"
        m = load_json(p)
        if not need(m, ["id", "window", "sun_frac", "earth_frac", "both_frac", "longest_dark_h", "slope_deg"], w):
            continue
        if p.stem != m["id"] or m["id"] not in sites:
            err(w, "id must match file name and sites.json")
        fr = [m[k] for k in ("sun_frac", "earth_frac", "both_frac")]
        if not all(is_num(x) and 0 <= x <= 1 for x in fr):
            err(w, "sun_frac / earth_frac / both_frac must be fractions 0..1")
        elif fr[2] > min(fr[0], fr[1]) + 1e-9:
            err(w, "both_frac cannot exceed sun_frac or earth_frac")
        if not is_num(m["longest_dark_h"]) or m["longest_dark_h"] < 0:
            err(w, "longest_dark_h must be hours >= 0")
        if m["slope_deg"] is not None and (not is_num(m["slope_deg"]) or not 0 <= m["slope_deg"] <= 90):
            err(w, "slope_deg must be null or 0..90")


# ---------------------------------------------------------------- 5. validation (contract v1.1)
POINT_FRACS = ["ours_sun", "pgda_sun", "pgda_sun_min60", "pgda_sun_max60",
               "ours_earth", "pgda_earth", "pgda_earth_min60", "pgda_earth_max60"]
NAMED_FRACS = ["ours_sun", "pgda_sun", "pgda_sun_min300", "pgda_sun_max300",
               "ours_earth", "pgda_earth", "pgda_earth_min300", "pgda_earth_max300"]


def check_fracs(obj, keys, where):
    ok = True
    for f in keys:
        if not is_num(obj[f]) or not 0 <= obj[f] <= 1:
            err(where, f"{f} must be a fraction 0..1")
            ok = False
    return ok


def check_validation(data, sites):
    p = data / "validation.json"
    if not p.exists():
        warn("validation.json", "file missing")
        return
    v = load_json(p)
    if not need(v, ["window", "step_h", "n_points", "seed", "sun", "earth", "points", "named", "pgda_files"],
                "validation.json"):
        return
    for body in ("sun", "earth"):
        b = v[body]
        if need(b, ["mae_pp", "rmse_pp", "r", "within_pgda_60m_spread_pct"], f"validation.{body}"):
            if not all(is_num(x) for x in b.values()):
                err(f"validation.{body}", "values must be numbers")
            elif not -1 <= b["r"] <= 1 or not 0 <= b["within_pgda_60m_spread_pct"] <= 100:
                err(f"validation.{body}", "r must be -1..1 and *_pct 0..100")
    pts = v["points"] if isinstance(v["points"], list) else []
    if not isinstance(v["points"], list) or v["n_points"] != len(pts):
        err("validation.json", "n_points must equal len(points)")
    inside = {"sun": 0, "earth": 0}
    good_pts = 0
    for k, pt in enumerate(pts):
        w = f"validation.points[{k}]"
        if not need(pt, ["lat", "lon"] + POINT_FRACS, w):
            continue
        if not (is_num(pt["lat"]) and -90 <= pt["lat"] <= 90 and is_num(pt["lon"]) and -180 <= pt["lon"] <= 180):
            err(w, "lat must be -90..90 and lon -180..180")
        if not check_fracs(pt, POINT_FRACS, w):
            continue
        good_pts += 1
        for body in ("sun", "earth"):
            lo, hi = pt[f"pgda_{body}_min60"], pt[f"pgda_{body}_max60"]
            if lo > hi:
                err(w, f"pgda_{body}_min60 > pgda_{body}_max60")
            if lo <= pt[f"ours_{body}"] <= hi:
                inside[body] += 1
    # v1.1: within_pgda_60m_spread_pct = % of points with ours inside that body's PGDA min60..max60
    if good_pts and good_pts == len(pts):
        for body in ("sun", "earth"):
            got = v[body].get("within_pgda_60m_spread_pct") if isinstance(v[body], dict) else None
            want = 100 * inside[body] / good_pts
            if is_num(got) and abs(got - want) > 0.51:
                err(f"validation.{body}", f"within_pgda_60m_spread_pct = {got}, but points give {want:.1f}")
    for k, nm in enumerate(v["named"] if isinstance(v["named"], list) else []):
        w = f"validation.named[{k}]"
        if not need(nm, ["id"] + NAMED_FRACS, w):
            continue
        if nm["id"] not in sites:
            err(w, f"id {nm['id']} not in sites.json")
        if check_fracs(nm, NAMED_FRACS, w):
            for body in ("sun", "earth"):
                if nm[f"pgda_{body}_min300"] > nm[f"pgda_{body}_max300"]:
                    err(w, f"pgda_{body}_min300 > pgda_{body}_max300")
    if not isinstance(v["pgda_files"], list):
        err("validation.json", "pgda_files must be a list")
    check_mock_flag(v, "validation.json")
    print(f"validation.json: {len(pts)} points")


# ---------------------------------------------------------------- 12. relay/ (proposed v1.2)
def check_relay(data, sites):
    d = data / "relay"
    if not d.exists():
        return
    idx_p = d / "index.json"
    files = sorted(p.stem for p in d.glob("*.json") if p.name != "index.json")
    idx = load_json(idx_p) if idx_p.exists() else None
    if idx is None:
        err("relay/index.json", "missing (run python pipeline/run_relay.py --index-only)")
        return
    if sorted(idx.get("ids", [])) != files:
        err("relay/index.json", f"ids {sorted(idx.get('ids', []))} != files {files}")
    pend = idx.get("pending_terrain", {})
    for sid in idx.get("ids", []):
        if sid in pend:
            err("relay/index.json", f"{sid} is both computed and pending_terrain")
    for sid in files:
        w = f"relay/{sid}.json"
        o = load_json(d / f"{sid}.json")
        if o is None or not need(o, ["id", "lat", "lon", "window", "params", "lander", "candidates", "best",
                                     "networks", "link_budget", "mock"], w):
            continue
        if o["id"] != sid:
            err(w, f"id {o['id']} != file name")
        s = sites.get(sid)
        if s and (abs(o["lat"] - s["lat"]) > 1e-6 or abs(o["lon"] - s["lon"]) > 1e-6):
            err(w, "lat/lon differ from sites.json (rerun pipeline/run_relay.py)")
        if o["mock"] or any((o.get("inputs_mock") or {}).values()):
            err(w, "mock inputs: relay results must come from real ephemeris and terrain")
        if o["window"].get("n") != REAL_EPHEM_N:
            err(w, f"window.n {o['window'].get('n')} != {REAL_EPHEM_N}")
        if o["link_budget"].get("estimate") is not True:
            err(w, "link_budget.estimate must be true")
        n = o["window"].get("n", 0)
        for k, net in enumerate(o["networks"]):
            segs = net["timeline"]["segments"]
            if not segs or segs[0][0] != 0 or sum(x[1] for x in segs) != n:
                err(f"{w}.networks[{k}]", "timeline does not cover the window")
            if any(segs[i][0] + segs[i][1] != segs[i + 1][0] for i in range(len(segs) - 1)):
                err(f"{w}.networks[{k}]", "timeline segments not contiguous")
        if not check_fracs(o["lander"], ["earth_frac"], f"{w}.lander"):
            continue
    print(f"relay: {len(files)} computed, {len(pend)} pending terrain")


# ---------------------------------------------------------------- 13. korea/ (proposed v1.2)
def check_korea(data, sites):
    d = data / "korea"
    if not d.exists():
        return
    st = load_json(d / "stations.json")
    if st and need(st, ["start", "step_h", "n", "min_el_deg", "stations", "mock"], "korea/stations.json"):
        if st["n"] != REAL_EPHEM_N:
            err("korea/stations.json", f"n {st['n']} != {REAL_EPHEM_N}")
        nbytes = (st["n"] + 7) // 8
        import base64
        for s in st["stations"]:
            if len(base64.b64decode(s["bits_b64"])) != nbytes:
                err("korea/stations.json", f"{s['id']}: bitset length != ceil(n/8)")
        check_mock_flag(st, "korea/stations.json")
    dn = load_json(d / "danuri.json")
    if dn and need(dn, ["window", "sites", "caveat", "mock"], "korea/danuri.json"):
        n_ok = n_pend = 0
        for s in dn["sites"]:
            w = f"korea/danuri.json[{s.get('id')}]"
            if s.get("status") == "pending_terrain":
                n_pend += 1
                continue
            if s.get("mask") != "terrain" or s.get("mask_mock"):
                err(w, "Danuri results must use a real terrain mask (flat/mock masks are not allowed)")
            if s["id"] in sites and (abs(s["lat"] - sites[s["id"]]["lat"]) > 1e-6 or abs(s["lon"] - sites[s["id"]]["lon"]) > 1e-6):
                err(w, "lat/lon differ from sites.json (rerun pipeline/korea_links.py --only danuri)")
            check_fracs(s, ["visible_frac", "direct_earth_frac", "relay_upper_bound"], w)
            n_ok += 1
        missing = set(sites) - {s["id"] for s in dn["sites"]}
        if missing:
            warn("korea/danuri.json", f"sites not listed: {sorted(missing)}")
        if "upper bound" not in dn["caveat"].lower():
            err("korea/danuri.json", "caveat must state the geometric upper bound")
        check_mock_flag(dn, "korea/danuri.json")
        print(f"korea: danuri {n_ok} sites with terrain, {n_pend} pending terrain")


def check_hterrain(data):
    """Section 14 (proposed): browser height tiles for user-defined sites (web/data/hterrain/)."""
    d = data / "hterrain"
    f = d / "index.json"
    if not f.exists():
        warn("hterrain", "index.json missing - custom sites cannot compute a horizon")
        return
    idx = load_json(f)
    if idx is None:
        return
    if not need(idx, ["grids", "url", "radius_m", "mock"], "hterrain/index.json"):
        return
    if idx["radius_m"] != 1737400:
        err("hterrain/index.json", f"radius_m {idx['radius_m']} != 1737400")
    for name in ("near", "far"):
        g = idx["grids"].get(name)
        w = f"hterrain.{name}"
        if not isinstance(g, dict) or not need(g, ["ppd", "tile_deg", "n", "nx", "ny", "to_km", "res_m"], w):
            continue
        if g["n"] != g["ppd"] * g["tile_deg"] + 1 or g["nx"] * g["tile_deg"] != 360 or g["ny"] * g["tile_deg"] != 180:
            err(w, "tile geometry inconsistent (n = ppd*tile_deg + 1, nx*tile_deg = 360, ny*tile_deg = 180)")
        tdir = d / "tiles" / name
        have = {p.name for p in tdir.glob("*.i16.gz")} if tdir.exists() else set()
        want = {f"{y}_{x}.i16.gz" for y in range(g["ny"]) for x in range(g["nx"])}
        if want - have:
            err(w, f"{len(want - have)} tiles missing, e.g. {sorted(want - have)[:3]}")
    if idx["grids"].get("near", {}).get("to_km", 0) != 150 or idx["grids"].get("far", {}).get("to_km", 0) != 300:
        err("hterrain/index.json", "near grid must reach 150 km and far grid 300 km (same chain as pipeline/horizon.py)")
    check_mock_flag(idx, "hterrain/index.json")
    print(f"hterrain: near {idx['grids']['near'].get('res_m')} m, far {idx['grids']['far'].get('res_m')} m")
    check_hterrain_polar(d)
    check_hterrain_polar(d, 'north')


def check_hterrain_polar(d, pole='south'):
    """Sections 14b/c: optional hemisphere-specific PGDA levels."""
    folder = 'polar_n' if pole == 'north' else 'polar_s'
    where = f'hterrain/{folder}'
    f = d / folder / "index.json"
    if not f.exists():
        warn(where, "index.json missing - polar custom points use the 948 m grid")
        return
    idx = load_json(f)
    if idx is None or not need(idx, ["pole", "lat_edge_deg", "levels", "projection", "mock"], where+'/index.json'):
        return
    origin = 'lat_0=90' if pole == 'north' else 'lat_0=-90'
    if "R=1737400" not in idx["projection"].replace(".0", "") or origin not in idx["projection"]:
        err(where, f"unexpected projection {idx['projection']}")
    if idx['pole'] != pole or not is_num(idx['lat_edge_deg']) or not (0 < (1 if pole=='north' else -1)*idx['lat_edge_deg'] <= 90):
        err(where, 'pole/latitude edge mismatch')
    total = 0
    for lv in idx["levels"]:
        w = f"hterrain.{folder}.{lv.get('name')}"
        if not need(lv, ["name", "res_m", "q_m", "to_km", "x0_m", "y0_m", "tile_px", "n", "nt", "tiles", "url"], w):
            continue
        if lv["n"] != lv["tile_px"] + 1:
            err(w, "n must be tile_px + 1")
        limit = 300 if pole == 'north' else 150
        if not (0 < lv["to_km"] <= limit):
            err(w, f"to_km {lv['to_km']} outside (0, {limit}]")
        if pole == 'north' and (lv.get('pole') != 'north' or not (0 < lv.get('lat_edge_deg',0) <= 90)):
            err(w, 'north level requires pole=north and positive latitude edge')
        paths = [d / lv["url"].replace("{ty}_{tx}", k) for k in lv["tiles"]]
        absent = [p.name for p in paths if not p.exists()]
        if absent:
            err(w, f"{len(absent)} listed tiles missing, e.g. {absent[:3]}")
        total += sum(p.stat().st_size for p in paths if p.exists())
    check_mock_flag(idx, where+'/index.json')
    print(f"hterrain.{folder}: {[(lv['name'], lv['res_m'], lv['to_km']) for lv in idx['levels']]}, {total / 1e6:.1f} MB")


def check_local(data, sites):
    """Optional section 15: complete local node maps (card 18 six + card 20 the rest)."""
    directory = data / 'local'
    if not directory.exists():
        return
    from local_maps import validate_map
    ids = sorted(p.stem for p in directory.glob('*.json'))
    for sid in ids:
        if sid not in sites:
            err(f'local/{sid}.json', 'id not in sites.json')
            continue
        where = f'local/{sid}.json'
        obj = load_json(directory / (sid+'.json'))
        if obj is None:
            continue
        try:
            validate_map(obj)
            if obj['id'] != sid or obj['center'] != {k:sites[sid][k] for k in ['lat','lon']}:
                raise ValueError('Centre differs from catalogue')
        except (ValueError, KeyError, TypeError) as exc:
            err(where, str(exc))
    print(f'local: {len(ids)} 21x21 maps checked')


def check_monthly(data, sites):
    """Section 17 (proposed): web/data/monthly/<ID>.json seasons 2026-2030 (pipeline/seasons.mjs)."""
    d = data / "monthly"
    if not d.exists():
        warn("monthly", "folder missing - the Seasons chart has no data (run node pipeline/seasons.mjs)")
        return
    import calendar
    want_m, want_h = [], []
    for y in range(2026, 2031):
        for mo in range(1, 13):
            want_m.append(f"{y}-{mo:02d}")
            want_h.append(calendar.monthrange(y, mo)[1] * 24)
    n_ok = 0
    for p in sorted(d.glob("*.json")):
        w = f"monthly/{p.name}"
        m = load_json(p)
        if not need(m, ["id", "months", "series", "lunation", "subsolar_lat_deg", "subearth_lat_deg", "total", "mock"], w):
            continue
        if p.stem != m["id"] or m["id"] not in sites:
            err(w, "id must match file name and sites.json")
        if m["months"] != want_m:
            err(w, "months must be 2026-01 .. 2030-12 (60 calendar months)")
            continue
        s = m["series"]
        keys = ["hours", "sun_h", "earth_h", "both_h", "sun_frac", "earth_frac", "both_frac", "longest_dark_h"]
        if not need(s, keys, w + ".series") or any(not isinstance(s[k], list) or len(s[k]) != 60 for k in keys):
            err(w, "series arrays must have 60 values")
            continue
        if s["hours"] != want_h:
            err(w, "series.hours must be the hours of each calendar month (sum 43824)")
        bad = False
        for k in range(60):
            n = s["hours"][k]
            for f in ("sun", "earth", "both"):
                c, fr = s[f + "_h"][k], s[f + "_frac"][k]
                if not isinstance(c, int) or not 0 <= c <= n or not is_num(fr) or abs(fr - c / n) > 5.01e-5:
                    bad = True
            if s["both_h"][k] > min(s["sun_h"][k], s["earth_h"][k]):
                bad = True
            dk = s["longest_dark_h"][k]
            if not isinstance(dk, int) or not 0 <= dk <= n - s["sun_h"][k]:
                bad = True
        if bad:
            err(w, "monthly counts / fractions / longest_dark_h inconsistent (frac = count/hours to 4 dp, both <= sun, earth; dark <= not-sunlit hours)")
        lun = m["lunation"]
        if lun.get("window_h") != 709 or any(len(lun.get(f, [])) != 60 or not all(is_num(x) and 0 <= x <= 1 for x in lun.get(f, []))
                                             for f in ("sun_frac", "earth_frac", "both_frac")):
            err(w, "lunation must have window_h 709 and three 60-value fraction arrays")
        for key in ("subsolar_lat_deg", "subearth_lat_deg"):
            r = m[key]
            if any(len(r.get(x, [])) != 60 for x in ("min", "max")) or any(not (-10 < a <= b < 10) for a, b in zip(r["min"], r["max"])):
                err(w, f"{key} must be 60 min <= max latitudes (deg)")
        f5 = data / "metrics" / p.name
        if f5.exists():
            five = load_json(f5) or {}
            N = sum(s["hours"])
            for f in ("sun", "earth", "both"):
                if is_num(five.get(f + "_frac")) and abs(sum(s[f + "_h"]) / N - five[f + "_frac"]) > 1e-9:
                    err(w, f"60-month mean {f}_frac differs from metrics/{p.name}")
            if is_num(five.get("longest_dark_h")) and max(s["longest_dark_h"]) > five["longest_dark_h"]:
                err(w, "a month's longest dark exceeds the 5-year longest_dark_h")
        check_mock_flag(m, w)
        if m.get("mock") is not False:
            err(w, "monthly data must be real (mock: false)")
        n_ok += 1
    missing = sorted(set(sites) - {p.stem for p in d.glob("*.json")})
    if missing:
        warn("monthly", f"sites without a monthly file: {missing}")
    print(f"monthly: {n_ok} site files checked")
def check_uncertainty(data, sites):
    """Optional section 18: coordinate-uncertainty ranges (121 nodes, radii 100/300/500 m)."""
    directory = data / 'uncertainty'
    if not directory.exists():
        return
    from coord_uncertainty import LAT_MIN, validate_record
    n = 0
    for path in sorted(directory.glob('*.json')):
        where = f'uncertainty/{path.name}'
        obj = load_json(path)
        if obj is None:
            continue
        sid = path.stem
        try:
            if obj['id'] != sid or sid not in sites:
                raise ValueError('id/file name not in catalogue')
            if obj['center'] != {k: sites[sid][k] for k in ['lat', 'lon']}:
                raise ValueError('Centre differs from catalogue')
            validate_record(obj, sites[sid], strict_params=sites[sid]['lat'] > LAT_MIN)
        except (ValueError, KeyError, TypeError) as exc:
            err(where, str(exc))
        n += 1
    print(f'uncertainty: {n} site file(s) checked')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parents[1] / "web" / "data"))
    data = Path(ap.parse_args().data)
    sites = check_sites(data)
    check_ephem(data)
    check_horizons(data, sites)
    check_metrics(data, sites)
    from check_windows import check_windows
    check_windows(data, sites, err, warn)
    check_validation(data, sites)
    check_relay(data, sites)
    check_korea(data, sites)
    check_hterrain(data)
    check_local(data, sites)
    from check_local250 import check_local250
    check_local250(data, sites, err, warn)
    check_monthly(data, sites)
    check_uncertainty(data, sites)
    for line in warns + errors:
        print(line)
    print(f"\n{'FAIL' if errors else 'PASS'}: {len(errors)} errors, {len(warns)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
