"""Batch runner for the relay-tower engine over every site in web/data/sites.json.

    python pipeline/run_relay.py                    # all sites, one process
    python pipeline/run_relay.py --jobs 4           # 4 sites in parallel (one process each)
    python pipeline/run_relay.py --site IM2         # one site (repeatable)
    python pipeline/run_relay.py --index-only       # rebuild web/data/relay/index.json from the files

Sites whose real DEMs are not cached yet (pipeline/run_horizons.build_chain raises MissingDEM) are NOT
computed with a flat or mock terrain: they are listed in index.json under "pending_terrain" with the
reason, and the app shows "Terrain pending" for them. Rerun after the DEM caches / horizons arrive.

Resume: a site whose relay/<ID>.json already has the same coordinates and parameters is skipped;
inside a site, relay_tower.compute_relay resumes per candidate from data/processed/relay/<ID>/.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import horizon as hz  # noqa: E402
import relay_tower as rt  # noqa: E402
import run_horizons as rh  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
# 10 km = BEACON's stated service range ("users up to 10 km away", NTRS 20240014584); 250 m grid.
RUN_PARAMS = {"radius_km": 10.0, "spacing_m": 250.0, "heights_m": [5.0, 15.0, 30.0, 50.0],
              "link_rule": "los", "n_towers": 3}


def same_run(path, site, params, identity):
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return False
    p = o.get("params", {})
    effective = dict(rt.DEFAULTS, **params)
    return (not o.get("mock") and o.get("lat") == site["lat"] and o.get("lon") == site["lon"]
            and p.get("engine_version") == rt.ENGINE_VERSION and o.get("input_identity") == identity
            and all(p.get(k) == v for k, v in effective.items() if k not in ("bands", "sun_shortlist"))
            and p.get("bands_ghz") == {b: f/1e9 for b, f in effective["bands"].items()})


def run_one(site, raw, web_data, work, params, force):
    t0 = time.time()
    params = dict(params, coverage_side_km=15. if site["id"].startswith("ARTEMIS_") else 0.)
    try:
        chain = rh.build_chain(site, raw, rt.DEFAULTS["max_km"])
    except rh.MissingDEM as e:
        return site["id"], "PENDING", f"missing DEM: {e}"
    out = web_data / "relay" / f"{site['id']}.json"
    eph = rt.Ephem.load(web_data)
    if eph.mock:
        return site["id"], "PENDING", "ephemeris is mock"
    if not force and same_run(out, site, params, rt.input_identity(chain, eph)):
        return site["id"], "OK", "up to date (resume)"
    obj = rt.compute_relay(site, chain, eph, params, work_dir=work / site["id"],
                           log=lambda msg: print(f"[{site['id']}] {msg}", flush=True))
    rt.validate_relay(obj)
    hz.write_json_atomic(out, obj)
    return site["id"], "OK", f"computed in {time.time() - t0:.0f} s"


def write_index(web_data, sites, pending):
    d = web_data / "relay"
    d.mkdir(parents=True, exist_ok=True)
    ids = [s["id"] for s in sites if s["id"] not in pending and (d / f"{s['id']}.json").exists()]
    pend = {sid: why for sid, why in pending.items() if sid not in ids}
    for s in sites:
        if s["id"] not in ids and s["id"] not in pend:
            pend[s["id"]] = "not computed yet"
    idx = {"ids": ids, "pending_terrain": pend, "run_params": RUN_PARAMS,
           "note": "Relay-tower results (contract section 12). Sites in pending_terrain have no real DEM cache yet; "
                   "they are never computed on flat or mock terrain. Written by pipeline/run_relay.py."}
    hz.write_json_atomic(d / "index.json", idx)
    return idx


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--site", action="append")
    ap.add_argument("--sites", default=str(ROOT / "web" / "data" / "sites.json"))
    ap.add_argument("--raw", default=str(ROOT / "data" / "raw"))
    ap.add_argument("--web-data", default=str(ROOT / "web" / "data"))
    ap.add_argument("--work", default=str(ROOT / "data" / "processed" / "relay"))
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--index-only", action="store_true")
    a = ap.parse_args(argv)
    web_data, raw, work = Path(a.web_data), Path(a.raw), Path(a.work)
    sites = json.loads(Path(a.sites).read_text(encoding="utf-8"))
    todo = [s for s in sites if not a.site or s["id"] in a.site]
    pending = {}
    old = web_data / "relay" / "index.json"
    if old.exists():
        pending = json.loads(old.read_text(encoding="utf-8")).get("pending_terrain", {})
    if not a.index_only:
        params = dict(RUN_PARAMS)
        if a.jobs > 1:
            with cf.ProcessPoolExecutor(a.jobs) as ex:
                futs = [ex.submit(run_one, s, raw, web_data, work, params, a.force) for s in todo]
                results = [f.result() for f in cf.as_completed(futs)]
        else:
            results = [run_one(s, raw, web_data, work, params, a.force) for s in todo]
        for sid, st, msg in sorted(results):
            print(f"{sid:28s} {st:8s} {msg}", flush=True)
            if st == "PENDING":
                pending[sid] = msg
            else:
                pending.pop(sid, None)
    idx = write_index(web_data, sites, pending)
    print(f"index: {len(idx['ids'])} computed, {len(idx['pending_terrain'])} pending terrain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
