"""Tests for pipeline/relay_tower.py.  Run:  python -m pytest pipeline/test_relay_tower.py -q"""
import math
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import horizon as hz  # noqa: E402
import relay_tower as rt  # noqa: E402

R = hz.R_M


# ---------------------------------------------------------------- Fresnel: hand calculation
def test_fresnel_radius_hand_values():
    # lambda = c / f = 0.136269 m at 2.2 GHz; d1 = d2 = 5 km -> sqrt(0.136269 * 2500) = 18.457 m
    assert rt.fresnel_radius(2.2e9, 5000.0, 5000.0) == pytest.approx(18.457, abs=1e-3)
    # 26 GHz: lambda = 0.0115305 m -> sqrt(0.0115305 * 2500) = 5.3690 m
    assert rt.fresnel_radius(26e9, 5000.0, 5000.0) == pytest.approx(5.3690, abs=1e-3)
    # 1 km from one end of a 10 km path at 2.2 GHz: sqrt(0.136269 * 1000 * 9000 / 10000) = 11.074 m
    assert rt.fresnel_radius(2.2e9, 1000.0, 9000.0) == pytest.approx(11.074, abs=1e-3)


def test_chord_clearance_with_curvature_hand_calc():
    """Lander antenna 2 m, tower top 50 m, 10 km apart over a sphere; a 10 m wall at mid-path.
    Hand: chord mid height = (2 + 50)/2 - D^2/(8R) = 26 - 7.1946 = 18.805 m -> clearance 8.805 m.
    Ratio to F1: S (2.2 GHz) 8.805 / 18.457 = 0.4771, Ka (26 GHz) 8.805 / 5.369 = 1.640."""
    th = 10000.0 / R
    clear, d1, D = rt.chord_clearance(R + 2.0, R + 50.0, th, th / 2, R + 10.0)
    assert clear == pytest.approx(8.805, abs=0.01)
    assert d1 == pytest.approx(5000.0, abs=1.0) and D == pytest.approx(10000.0, abs=1.0)
    f_s = clear / rt.fresnel_radius(2.2e9, d1, D - d1)
    f_ka = clear / rt.fresnel_radius(26e9, d1, D - d1)
    assert f_s == pytest.approx(0.4771, abs=0.002)
    assert f_ka == pytest.approx(1.640, abs=0.005)


def test_link_profiles_knife_edge_matches_hand_calc():
    """Same geometry through the DEM-sampling path: wall of 10 m (flat top +-5 m) at 5 km north.
    Elsewhere the ground is 1000 m lower so that only the wall can set the minimum (antenna tops
    are absolute heights above R: 2 m and 50 m, as in the hand calculation)."""
    lat0, lon0 = 0.0, 0.0
    y_wall = 5000.0

    def wall(la, lo):
        y = np.radians(la) * R
        return np.where(np.abs(y - y_wall) <= 5.0, 10.0, -1000.0)
    chain = [(hz.FunctionSampler(wall), 400.0)]
    la, lo = rt.local_offsets_to_latlon(lat0, lon0, np.array([0.0]), np.array([10000.0]))
    pr = rt.link_profiles(chain, lat0, lon0, 2.0, la, lo, np.array([[50.0]]),
                          bands={"S": 2.2e9, "Ka": 26e9}, step_m=2.0)
    # min over the 10 m wide top: the near edge (y = 4995) is lowest; difference < 0.03 m
    assert pr["min_clear_m"][0, 0] == pytest.approx(8.805, abs=0.05)
    assert pr["fresnel"]["S"][0, 0] == pytest.approx(0.4771, abs=0.005)
    assert pr["fresnel"]["Ka"][0, 0] == pytest.approx(1.640, abs=0.02)
    # a 30 m wall blocks the geometric line of sight
    chain30 = [(hz.FunctionSampler(lambda la, lo: np.where(wall(la, lo) > 0, 30.0, -1000.0)), 400.0)]
    pr30 = rt.link_profiles(chain30, lat0, lon0, 2.0, la, lo, np.array([[50.0]]),
                            bands={"S": 2.2e9}, step_m=2.0)
    assert pr30["min_clear_m"][0, 0] < 0 and not rt.link_ok(pr30, "los")[0, 0]


# ---------------------------------------------------------------- horizon subset == horizon engine
def test_horizon_bins_matches_horizon_engine():
    lat0, lon0 = -60.0, 40.0
    rng = np.random.default_rng(3)
    fs = []
    for _ in range(8):
        la, lo = hz.destination(lat0, lon0, np.array([rng.uniform(0, 360)]), np.array([rng.uniform(3e3, 1.5e5)]))
        c_la, c_lo, H = float(la.ravel()[0]), float(lo.ravel()[0]), rng.uniform(300, 4000)

        def f(a, b, c_la=c_la, c_lo=c_lo, H=H):
            u = rt.unit(a, b) @ rt.unit(c_la, c_lo)
            d = np.arccos(np.clip(u, -1, 1)) * R
            return H * np.clip(1 - d / 12000.0, 0, 1)
        fs.append(f)
    terrain = hz.FunctionSampler(lambda a, b: np.max([f(a, b) for f in fs], axis=0))
    chain = [(terrain, 400.0)]
    bins = np.array([0, 1, 100, 250, 251, 500, 719])
    for H in (2.0, 30.0):
        full = hz.compute_horizon(lat0, lon0, chain, h0_m=0.0, obs_height_m=H, n_steps=800)["mask"]
        sub = rt.horizon_bins(lat0, lon0, chain, bins, 0.0, [H], n_steps=800)[0]
        assert np.allclose(sub, full[bins], atol=1e-9)
    two = rt.horizon_bins(lat0, lon0, chain, bins, 0.0, [2.0, 30.0], n_steps=800)
    assert np.all(two[1] <= two[0] + 1e-12)          # higher observer -> lower (or equal) mask


# ---------------------------------------------------------------- synthetic ridge scenario
RIDGE_Y, RIDGE_H, RIDGE_HALF = 2000.0, 300.0, 800.0


def ridge(la, lo):
    """East-west ridge 2 km north of the lander (lat 0), triangular profile 300 m high."""
    y = np.radians(la) * R
    return RIDGE_H * np.clip(1 - np.abs(y - RIDGE_Y) / RIDGE_HALF, 0, 1)


def synthetic_ephem(n=1500):
    """Earth due north of the lander, elevation 2 +- 4 deg (period 655 h, libration-like);
    Sun circling the horizon at 1 deg elevation (period 708 h)."""
    up, east, north = hz.site_frame(0.0, 0.0)
    t = np.arange(n)
    e_el = np.radians(2.0 + 4.0 * np.sin(2 * np.pi * t / 655.0))
    earth = 384400.0 * (np.cos(e_el)[:, None] * north + np.sin(e_el)[:, None] * up)
    s_az = 2 * np.pi * t / 708.0
    s_el = np.radians(1.0)
    sun = 1.496e8 * (np.cos(s_el) * (np.cos(s_az)[:, None] * north + np.sin(s_az)[:, None] * east)
                     + np.sin(s_el) * up)
    return rt.Ephem(sun, earth, mock=True, source="synthetic test")


@pytest.fixture(scope="module")
def ridge_result():
    site = {"id": "RIDGE_TEST", "lat": 0.0, "lon": 0.0}
    chain = [(hz.FunctionSampler(ridge, "RIDGE", 1.0), 400.0)]
    params = {"radius_km": 3.0, "spacing_m": 250.0, "n_steps": 600, "los_step_m": 10.0,
              "sun_shortlist": 4}
    return rt.compute_relay(site, chain, synthetic_ephem(), params, log=lambda *a: None)


def test_ridge_blocks_direct_link(ridge_result):
    # lander mask to the north ~ atan(298 / 2000) = 8.5 deg > max Earth elevation 6 deg
    assert ridge_result["lander"]["earth_frac"] == 0.0


def test_tower_on_ridge_restores_link(ridge_result):
    # Hand estimate: from the ridge top the northern horizon is ~-1 deg, so Earth (2 + 4 sin) is
    # visible while sin > -0.75 -> 0.5 + asin(0.75)/pi = 77 % of the time.
    for b in ridge_result["best"]:
        assert b["link_to_lander"]
        assert abs(b["n_m"] - RIDGE_Y) <= 250.0, b      # tower stands on the ridge crest
        assert 0.70 <= b["link_frac"] <= 0.85, b
        assert b["slope_deg"] < 15.0
        assert 0.0 <= b["sun_frac"] <= 1.0
    net = ridge_result["networks"][1]
    assert net["link_frac_by_n"][0] == 0.0 and net["link_frac_by_n"][1] >= 0.70
    codes = {s[2] for s in net["timeline"]["segments"]}
    assert codes <= {0, 2} and 2 in codes             # no direct link, via-tower present


def test_candidates_behind_ridge_have_no_lander_link(ridge_result):
    c = ridge_result["candidates"]
    n = np.array(c["n_m"])
    e = np.array(c["e_m"])
    link = np.array(c["per_height"]["50"]["link"])
    far = (n >= 2750) & (np.abs(e) < 500)              # north of the ridge, behind it
    assert far.any() and not link[far].any()
    near = (n <= 0) & (np.hypot(e, n) > 0)             # flat ground south of the lander
    assert link[near].all()


def test_contract_and_timeline(ridge_result):
    rt.validate_relay(ridge_result)
    import json
    s = json.dumps(ridge_result)                       # JSON-serialisable (no NaN / numpy types)
    assert "NaN" not in s and "Infinity" not in s


def test_resume_gives_same_result(tmp_path):
    site = {"id": "RIDGE_TEST", "lat": 0.0, "lon": 0.0}
    chain = [(hz.FunctionSampler(ridge, "RIDGE", 1.0), 400.0)]
    params = {"radius_km": 1.0, "spacing_m": 500.0, "n_steps": 300, "los_step_m": 20.0}
    eph = synthetic_ephem(400)
    a = rt.compute_relay(site, chain, eph, params, work_dir=tmp_path, log=lambda *x: None)
    b = rt.compute_relay(site, chain, eph, params, work_dir=tmp_path, log=lambda *x: None)
    assert a["candidates"] == b["candidates"] and a["networks"] == b["networks"]


# ---------------------------------------------------------------- small helpers
def test_run_lengths_and_fspl():
    assert rt.run_lengths(np.array([0, 0, 2, 2, 2, 1])) == [[0, 2, 0], [2, 3, 2], [5, 1, 1]]
    assert rt.longest_run_fast(np.array([1, 1, 0, 1, 1, 1, 0], bool)) == 3
    # textbook: FSPL(1 km, 1 GHz) = 32.45 + 20 log10(1000 MHz) + 20 log10(1 km) = 92.45 dB
    assert rt.fspl_db(1000.0, 1e9) == pytest.approx(92.45, abs=0.01)
    lb = rt.link_budget({"S": 2.2e9}, {"max": 406000.0})
    assert lb["estimate"] and all(r["max_rate_bps"] > 0 for r in lb["results"])


def test_candidate_grid():
    e, n = rt.candidate_grid(20.0, 250.0)
    assert np.all(np.hypot(e, n) <= 20000.0 + 1e-6)
    assert ((e == 0) & (n == 0)).sum() == 1
    assert abs(e.size - math.pi * 80 ** 2) / e.size < 0.01     # ~20,100 candidates


def test_missing_profile_terrain_is_not_clear():
    chain = [(hz.FunctionSampler(lambda a, b: np.full(a.shape, np.nan)), 400)]
    la, lo = rt.local_offsets_to_latlon(0, 0, np.array([1000.]), np.array([0.]))
    with pytest.raises(ValueError, match="missing terrain"):
        rt.link_profiles(chain, 0, 0, 2, la, lo, [[15]], bands={"S": 2.2e9})


def test_shifted_tower_samples_fine_terrain_towards_lander():
    fine = hz.FunctionSampler(lambda a, b: np.full(a.shape, 200.), "FINE")
    far = hz.FunctionSampler(lambda a, b: np.zeros(a.shape), "FAR")
    anchored = rt.anchored_chain([(fine, 3), (far, 300)], 0, 0)
    # A ray starting 10 km east and returning to 1 km east must use the fine DEM.
    la, lo = rt.local_offsets_to_latlon(0, 0, np.array([1000., 4000.]), np.array([0., 0.]))
    values = hz.sample_chain(anchored, la, lo, np.array([19., 16.]))
    assert values.tolist() == [200., 0.]


def test_high_earth_is_not_assumed_visible_above_near_cliff():
    chain = [(hz.FunctionSampler(lambda a, b: np.where(np.radians(a)*R > 10, 300., 0.)), 400)]
    earth = np.array([[384400.*np.sin(np.radians(60)), 0, 384400.*np.cos(np.radians(60))]])
    p = dict(rt.DEFAULTS, min_km=.005, n_steps=300)
    assert not rt.earth_visibility(0, 0, chain, 0, [2], earth, p)[0, 0]


def test_resume_rejects_changed_ephemeris(tmp_path):
    site = {"id": "CACHE", "lat": 0., "lon": 0.}
    chain = [(hz.FunctionSampler(lambda a, b: np.zeros(a.shape)), 400)]
    p = dict(radius_km=0., spacing_m=250., n_steps=100)
    e = synthetic_ephem(4)
    first = rt.compute_relay(site, chain, e, p, work_dir=tmp_path, log=lambda *a: None)
    e.earth[:] = -rt.unit(0, 0)*384400.
    second = rt.compute_relay(site, chain, e, p, work_dir=tmp_path, log=lambda *a: None)
    assert first["best"][0]["tower_earth_frac"] > 0
    assert second["best"][0]["tower_earth_frac"] == 0


def test_input_identity_detects_same_size_dem_replacement(tmp_path):
    path = tmp_path / "terrain.npz"
    path.write_bytes(b"abcd")
    sampler = hz.FunctionSampler(lambda a, b: np.zeros(a.shape))
    sampler.path = path
    e = synthetic_ephem(2)
    before = rt.input_identity([(sampler, 300)], e)
    import os
    old = path.stat().st_mtime_ns
    path.write_bytes(b"efgh")
    os.utime(path, ns=(old+1000, old+1000))
    assert rt.input_identity([(sampler, 300)], e) != before


def test_coverage_square_area_and_shadow():
    # A tall east-west wall separates the tower at the origin from the northern half.
    chain = [(hz.FunctionSampler(lambda a, b: np.where(
        np.abs(np.radians(a)*R-1000) < 100, 1000., 0.)), 400)]
    p = dict(rt.DEFAULTS, coverage_side_km=15., coverage_spacing_m=250.)
    tower = dict(idx=0, lat=0., lon=0., ground_m=0., height_m=15.)
    m = rt.coverage_map({"lat": 0., "lon": 0.}, chain, [tower], p)
    assert (m["rows"], m["cols"]) == (60, 60)
    assert m["area_km2"] == 225.
    layer = m["per_height"]["15"]
    los = np.array(layer["los"]).reshape(60, 60)
    assert los[30, 30] == 1 and los[45, 30] == 0
    assert layer["los_area_km2"] == pytest.approx(los.sum()*.0625)
    for band in ("S", "Ka"):
        f = np.array(layer[f"fresnel60_{band}"])
        assert np.all(f <= los.ravel())


def test_height_curve_matches_selected_solution(ridge_result):
    curve = ridge_result["height_curve"]
    assert [r["height_m"] for r in curve] == [5., 15., 30., 50.]
    for row, best, net in zip(curve, ridge_result["best"], ridge_result["networks"]):
        assert row["single_link_frac"] == best["link_frac"]
        assert row["network_link_frac"] == net["link_frac_by_n"][-1]


def test_contract_rejects_wrong_coverage_dimensions(ridge_result):
    import copy
    obj = copy.deepcopy(ridge_result)
    obj["coverage"] = dict(rows=60, cols=60, valid_terrain=[1], per_height={})
    with pytest.raises(AssertionError):
        rt.validate_relay(obj)


def test_network_records_clearance_to_actual_parent():
    # First antenna sits on the ridge, second behind it: only the hop via the first can reach it.
    chain = [(hz.FunctionSampler(ridge), 400.)]
    e, n = np.array([0., 0.]), np.array([2000., 3000.])
    la, lo = rt.local_offsets_to_latlon(0, 0, e, n)
    ground = ridge(la, lo)
    p = dict(rt.DEFAULTS, n_towers=2, los_step_m=2.)
    prof = rt.link_profiles(chain, 0, 0, 2, la, lo, (ground+15)[:, None], bands=p["bands"], step_m=2.)
    linked = rt.link_ok(prof, "los")
    assert linked[:, 0].tolist() == [True, False]
    vis = rt.pack(np.array([[[1, 1, 0, 0]], [[0, 0, 1, 1]]], bool))
    direct = np.zeros(4, bool)
    net = rt._greedy_network(0, 15, p, chain, 0, 0, 0, e, n, la, lo, ground,
        np.ones(2, bool), linked, vis, rt.pack(direct), direct, 4, p["bands"], "los", prof,
        np.full((2, 1), .5), np.array([[.5], [0.]]), np.zeros(2))
    assert net["link_frac_by_n"] == [0., .5, 1.]
    second = net["towers"][1]
    assert second["parent"] == 0 and second["min_clear_m"] < 0
    assert second["parent_link"]["min_clear_m"] > 0
    assert second["parent_link"]["fresnel"]["S"] > 0


@pytest.mark.parametrize("lat", [0., 20., -89.])
def test_colocated_antenna_remains_linked_in_mixed_distance_batch(lat):
    chain = [(hz.FunctionSampler(lambda a, b: np.zeros(a.shape)), 400.)]
    la, lo = rt.local_offsets_to_latlon(lat, 30., np.array([0., 250.]), np.array([0., 0.]))
    pr = rt.link_profiles(chain, lat, 30., 2., la, lo, [[15.], [15.]],
                           bands={"S": 2.2e9, "Ka": 26e9}, step_m=5.)
    assert rt.link_ok(pr, "los").all()
    assert np.isposinf(pr["min_clear_m"][0, 0])
    assert np.isfinite(pr["min_clear_m"][1, 0])
    for band in ("S", "Ka"):
        assert np.isposinf(pr["fresnel"][band][0, 0])
