"""run_relay.py never computes a site without a real DEM: it is recorded as pending terrain.

    python -m pytest pipeline/test_run_relay.py -q
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_relay as rr  # noqa: E402
import relay_tower as rt


def test_missing_dem_is_pending_and_indexed(tmp_path):
    raw = tmp_path / "raw"            # empty: no DEM caches at all
    web = tmp_path / "web"
    (web / "relay").mkdir(parents=True)
    site = {"id": "NO_DEM_SITE", "lat": 20.0, "lon": 30.0}
    sid, status, msg = rr.run_one(site, raw, web, tmp_path / "work", dict(rr.RUN_PARAMS), force=False)
    assert (sid, status) == ("NO_DEM_SITE", "PENDING") and "missing DEM" in msg
    assert not (web / "relay" / "NO_DEM_SITE.json").exists()
    idx = rr.write_index(web, [site], {sid: msg})
    assert idx["ids"] == [] and "NO_DEM_SITE" in idx["pending_terrain"]
    assert json.loads((web / "relay" / "index.json").read_text())["pending_terrain"]["NO_DEM_SITE"] == msg


def test_index_lists_only_existing_files(tmp_path):
    web = tmp_path / "web"
    (web / "relay").mkdir(parents=True)
    (web / "relay" / "A.json").write_text("{}")
    idx = rr.write_index(web, [{"id": "A"}, {"id": "B"}], {})
    assert idx["ids"] == ["A"]
    assert idx["pending_terrain"] == {"B": "not computed yet"}


def test_pending_inputs_hide_old_output(tmp_path):
    (tmp_path / "relay").mkdir()
    (tmp_path / "relay/A.json").write_text("{}")
    idx = rr.write_index(tmp_path, [{"id": "A"}], {"A": "missing DEM"})
    assert idx["ids"] == [] and idx["pending_terrain"]["A"] == "missing DEM"


def test_batch_resume_rejects_old_engine_and_inputs(tmp_path):
    site = {"id": "A", "lat": 1., "lon": 2.}
    path = tmp_path / "A.json"
    params = dict(rt.DEFAULTS, **rr.RUN_PARAMS)
    p = dict(params, engine_version=rt.ENGINE_VERSION, bands_ghz={"S": 2.2, "Ka": 26.})
    original = dict(site, params=p, mock=False, input_identity={"ephem_sha256": "a"})
    path.write_text(json.dumps(original))
    assert rr.same_run(path, site, rr.RUN_PARAMS, {"ephem_sha256": "a"})
    assert not rr.same_run(path, site, rr.RUN_PARAMS, {"ephem_sha256": "b"})
    original["params"]["engine_version"] = rt.ENGINE_VERSION-1
    path.write_text(json.dumps(original))
    assert not rr.same_run(path, site, rr.RUN_PARAMS, {"ephem_sha256": "a"})
