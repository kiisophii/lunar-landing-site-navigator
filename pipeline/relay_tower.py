"""Relay-tower siting engine (differentiator A).

Question: if a lander loses its direct line of sight to Earth (libration + terrain), where should a
relay tower stand, and how tall, so that the lander's link improves?  Concept after NASA Glenn's
BEACON demonstrator (15 m deployed boom, 3GPP service for users up to ~10 km; NTRS 20240014584).

For one site (the lander, antenna 2 m above terrain):
  1. Candidate grid: local east/north offsets every `spacing_m` (250 m) within `radius_km` (20 km).
  2. Tower heights: 5 / 15 / 30 / 50 m.  For each candidate and height:
     (a) line of sight tower-top <-> lander antenna over the finest DEM, exact spherical geometry
         (curvature), plus first-Fresnel-zone clearance ratio for every configured band (S, Ka);
     (b) tower-top horizon mask, from the horizon-engine geometry with observer height = tower
         height (only the azimuth bins the Earth can occupy are marched, see `earth_bins`);
     (c) hourly Earth visibility from the tower top (ephemeris contract section 2);
     (d) lander link = direct OR (link lander<->tower AND tower sees Earth).
     Plus tower ground slope (plane fit over ~250 m) and, for a shortlist, the tower-top sunlight
     fraction (can it power itself) from a full 720-bin horizon (pipeline/horizon.py).
  3. Greedy 1..3 tower network per height (tower<->tower hops allowed) maximising lander link %.
  4. Rough link budget tower -> DSN 34 m and tower -> KDSA 35 m (explicit, labelled estimates).
Output: web/data/relay/<ID>.json (format: docs/data_contract.md section 12, proposed v1.2).

Definitions follow CLAUDE.md / contract: Earth visible = Earth CENTRE above the mask (topocentric,
mask linearly interpolated between 0.5 deg bins); sun visible fraction of a 0.2666 deg disk,
sunlit >= 0.5.  "Link" between two antennas (rule `los`, default) = geometric line of sight with
positive clearance at every interior profile sample; rules `fresnel60_<band>` also require
clearance >= 0.6 * first Fresnel radius.

Run (long; resumes from data/processed/relay/<ID>/):
    python pipeline/relay_tower.py --site SHACKLETON_RIM
Quick look on a coarse grid:
    python pipeline/relay_tower.py --site SHACKLETON_RIM --radius-km 5 --spacing-m 500 --n-steps 800
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import horizon as hz  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
R_M = hz.R_M
C_LIGHT = 299_792_458.0
K_BOLTZ_DBW = -228.6                     # 10*log10(Boltzmann constant), dBW/K/Hz
SUN_RADIUS_DEG = 0.2666                  # contract section 6
LANDER_ANT_M = 2.0                       # contract section 0
ENGINE_VERSION = 2

DEFAULTS = {
    "radius_km": 20.0, "spacing_m": 250.0, "heights_m": [5, 15, 30, 50],
    "bands": {"S": 2.2e9, "Ka": 26.0e9},          # Hz; lunar S / Ka bands (configurable)
    "link_rule": "los",                           # los | fresnel60_S | fresnel60_Ka
    "los_step_m": 5.0,                            # resolve the finest 5 m terrain along local links
    "min_km": 0.005, "max_km": 300.0, "n_steps": 8000,
    "earth_el_cap_deg": 90.0,  # retained for compatibility; v2 does not bypass terrain above a cap
    "slope_box_m": 250.0, "max_slope_deg": 15.0,  # buildability
    "n_towers": 3, "sun_shortlist": 12,
    "coverage_side_km": 0.0, "coverage_spacing_m": 250.0,
}


# ====================================================================== geometry helpers
def unit(lat_deg, lon_deg):
    la, lo = np.radians(lat_deg), np.radians(lon_deg)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


def to_latlon(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1)
    return np.degrees(np.arcsin(np.clip(v[..., 2] / n, -1, 1))), np.degrees(np.arctan2(v[..., 1], v[..., 0]))


def local_offsets_to_latlon(lat0, lon0, e_m, n_m):
    """Local east/north offsets (m, measured along the surface from the site) -> lat, lon."""
    e_m, n_m = np.asarray(e_m, float), np.asarray(n_m, float)
    d = np.hypot(e_m, n_m)
    az = np.degrees(np.arctan2(e_m, n_m))
    la, lo = hz.destination(lat0, lon0, az.ravel(), d.ravel())
    return la.reshape(d.shape), lo.reshape(d.shape)


def bearing_and_angle(lat_a, lon_a, lat_b, lon_b):
    """Azimuth (deg, 0 = N clockwise) at A towards B and central angle (rad); B may be arrays."""
    up, east, north = hz.site_frame(lat_a, lon_a)
    ub = unit(lat_b, lon_b)
    c = ub @ up
    t = ub - c[..., None] * up
    s = np.linalg.norm(t, axis=-1)
    az = np.degrees(np.arctan2(t @ east, t @ north)) % 360.0
    return az, np.arctan2(s, c)


def candidate_grid(radius_km, spacing_m):
    """Square lattice of local (east, north) offsets inside the radius; the site itself included."""
    k = int(math.floor(radius_km * 1000.0 / spacing_m))
    g = np.arange(-k, k + 1) * spacing_m
    E, N = np.meshgrid(g, g)
    keep = np.hypot(E, N) <= radius_km * 1000.0 + 1e-6
    return E[keep].astype(float), N[keep].astype(float)


# ====================================================================== Fresnel + LOS
def fresnel_radius(freq_hz, d1_m, d2_m):
    """First Fresnel zone radius (m) at distances d1, d2 from the two ends: sqrt(lambda d1 d2 / D)."""
    lam = C_LIGHT / freq_hz
    d1, d2 = np.asarray(d1_m, float), np.asarray(d2_m, float)
    return np.sqrt(lam * d1 * d2 / (d1 + d2))


def chord_clearance(rA, rB, theta, phi, rt):
    """Exact 2-D geometry in the great-circle plane.  A = (0, rA), B = rB (sin th, cos th),
    terrain T = rt (sin phi, cos phi).  Returns (clearance_m, d1_m, D_m): signed perpendicular
    distance of T BELOW the straight line A-B (positive = clear) and distance along the line."""
    ax, ay = 0.0, rA
    bx, by = rB * np.sin(theta), rB * np.cos(theta)
    dx, dy = bx - ax, by - ay
    D = np.hypot(dx, dy)
    ux, uy = dx / D, dy / D
    tx, ty = rt * np.sin(phi) - ax, rt * np.cos(phi) - ay
    clear = -(ux * ty - uy * tx)
    d1 = ux * tx + uy * ty
    return clear, d1, D


def link_profiles(chain, lat_a, lon_a, top_a_m, lat_b, lon_b, top_b_m, *, bands, step_m=20.0,
                  dist_offset_km=0.0, block=256):
    """Line of sight + Fresnel clearance from antenna A (radius R+top_a_m) to many antennas B.

    lat_b, lon_b: (n,) positions; top_b_m: (n, nh) antenna heights above R (one column per tower
    height; the terrain profile is shared).  Returns dict with
      'min_clear_m' (n, nh), 'fresnel' {band: (n, nh) min clearance / F1}, 'dist_m' (n,).
    Ends of the path are excluded (only interior samples).  dist_offset_km is added to the
    distance used for DEM-chain gating (profile points are measured from A)."""
    lat_b, lon_b = np.atleast_1d(lat_b).astype(float), np.atleast_1d(lon_b).astype(float)
    top_b = np.asarray(top_b_m, float).reshape(lat_b.size, -1)
    n, nh = top_b.shape
    az, th = bearing_and_angle(lat_a, lon_a, lat_b, lon_b)
    dist = th * R_M
    rA = R_M + top_a_m
    out_clear = np.full((n, nh), np.inf)
    out_fr = {b: np.full((n, nh), np.inf) for b in bands}
    order = np.argsort(dist)
    # Same surface position is a vertical antenna connection with no interior terrain path.
    # A block's other, longer paths must not turn this into a zero-width chord calculation.
    # 1 micrometre absorbs spherical-coordinate roundoff at the poles.
    order = order[dist[order] > 1e-6]
    for i0 in range(0, order.size, block):
        idx = order[i0:i0 + block]
        dmax = dist[idx].max()
        ns = int(math.ceil(dmax / step_m))
        if ns < 2:
            continue                       # B within one step of A: nothing in between
        f = np.arange(1, ns) / ns          # interior fractions
        phi = th[idx][:, None] * f[None, :]
        la, lo = hz.destination(lat_a, lon_a, az[idx][:, None], phi * R_M)
        dk = phi * R_M / 1000.0 + dist_offset_km
        h = hz.sample_chain(chain, la.ravel(), lo.ravel(), dk.ravel()).reshape(la.shape)
        if not np.isfinite(h).all():
            raise ValueError("missing terrain in antenna link profile")
        rt = R_M + h
        for j in range(nh):
            rB = (R_M + top_b[idx, j])[:, None]
            clear, d1, D = chord_clearance(rA, rB, th[idx][:, None], phi, rt)
            out_clear[idx, j] = clear.min(axis=1)
            for b, fhz in bands.items():
                F = fresnel_radius(fhz, np.maximum(d1, 1e-6), np.maximum(D - d1, 1e-6))
                out_fr[b][idx, j] = (clear / F).min(axis=1)
    return {"min_clear_m": out_clear, "fresnel": out_fr, "dist_m": dist}


def link_ok(prof, rule):
    if rule == "los":
        return prof["min_clear_m"] > 0
    if rule.startswith("fresnel60_"):
        b = rule.split("_", 1)[1]
        return (prof["min_clear_m"] > 0) & (prof["fresnel"][b] >= 0.6)
    raise ValueError(f"unknown link rule {rule!r}")


# ====================================================================== horizon (subset of bins)
def horizon_bins(lat, lon, chain, bins, ground_m, obs_heights_m, *, min_km=0.2, max_km=300.0,
                 n_steps=1500, dist_offset_km=0.0, early_stop=True, hmax_m=hz.HMAX_M):
    """Same maths as horizon.compute_horizon (great-circle march, exact curvature, finest-first
    chain, early stop) but only for azimuth bins `bins` (indices of 0.5 deg bins) and for several
    observer heights at once (terrain samples are shared).  Returns (nh, len(bins)) degrees."""
    bins = np.asarray(bins, int)
    az = bins * hz.AZ_STEP_DEG
    r_o = R_M + ground_m + np.asarray(obs_heights_m, float)          # (nh,)
    s_km = hz.distances_km(min_km, max_km, n_steps)
    best = np.full((r_o.size, bins.size), -np.inf)
    active = np.ones(bins.size, bool)
    r_top = R_M + hmax_m
    blk = 128
    for i0 in range(0, s_km.size, blk):
        idx = np.flatnonzero(active)
        if idx.size == 0:
            break
        s = s_km[i0:i0 + blk]
        la, lo = hz.destination(lat, lon, az[idx][:, None], s[None, :] * 1000.0)
        dk = np.broadcast_to(s[None, :] + dist_offset_km, la.shape)
        h = hz.sample_chain(chain, la.ravel(), lo.ravel(), dk.ravel()).reshape(la.shape)
        if not np.isfinite(h).all():
            raise ValueError("missing terrain in tower horizon")
        th = s / (R_M / 1000.0)
        rt = R_M + h
        for j, ro in enumerate(r_o):
            el = np.arctan2(rt * np.cos(th) - ro, rt * np.sin(th))
            el = np.where(np.isfinite(el), el, -np.inf)
            best[j, idx] = np.maximum(best[j, idx], el.max(axis=1))
        if early_stop and i0 + blk < s_km.size:
            th_next = s_km[i0 + blk] / (R_M / 1000.0)
            bound = np.arctan2(r_top * math.cos(th_next) - r_o, r_top * math.sin(th_next))  # (nh,)
            done = np.all(best[:, idx] > bound[:, None], axis=0)
            active[idx[done]] = False
    return np.degrees(best)


def topo_az_el(lat, lon, top_m, body_km):
    """Topocentric azimuth/elevation (deg) of body vectors (N,3) km from an observer at
    radius R + top_m above (lat, lon)."""
    up, east, north = hz.site_frame(lat, lon)
    o = up * (R_M + top_m) / 1000.0
    v = body_km - o
    v = v / np.linalg.norm(v, axis=1, keepdims=True)
    el = np.degrees(np.arcsin(np.clip(v @ up, -1, 1)))
    az = np.degrees(np.arctan2(v @ east, v @ north)) % 360.0
    return az, el


def mask_lookup(mask720, az):
    """Linear interpolation between 0.5 deg bins (wraps), contract section 3."""
    x = (np.asarray(az) % 360.0) / hz.AZ_STEP_DEG
    k = np.floor(x).astype(int) % hz.N_AZ
    t = x - np.floor(x)
    return mask720[..., k] + (mask720[..., (k + 1) % hz.N_AZ] - mask720[..., k]) * t


def earth_bins(az, el, cap_deg):
    """0.5 deg bins needed to look up the mask for every hour with Earth below cap (+1 bin pad)."""
    low = el < cap_deg
    if not low.any():
        return np.zeros(0, int)
    k = np.floor((az[low] % 360.0) / hz.AZ_STEP_DEG).astype(int)
    need = np.unique(np.concatenate([k - 1, k, k + 1, k + 2]) % hz.N_AZ)
    return need


def earth_visibility(lat, lon, chain, ground_m, heights_m, earth_km, p, dist_offset_km=0.0):
    """(nh, N) bool: Earth centre above the mask from heights above ground at (lat, lon)."""
    heights_m = np.atleast_1d(np.asarray(heights_m, float))
    vis = np.ones((heights_m.size, earth_km.shape[0]), bool)
    cap = 90.000001  # every physical elevation, including zenith; no arbitrary clear-sky shortcut
    ae = [topo_az_el(lat, lon, ground_m + H, earth_km) for H in heights_m]
    bins = np.unique(np.concatenate([earth_bins(az, el, cap) for az, el in ae]))
    full = np.full((heights_m.size, hz.N_AZ), np.nan)
    if bins.size:
        full[:, bins] = horizon_bins(lat, lon, chain, bins, ground_m, heights_m, min_km=p["min_km"],
                                     max_km=p["max_km"], n_steps=p["n_steps"],
                                     dist_offset_km=dist_offset_km)
    for j, (az, el) in enumerate(ae):
        low = el < cap
        if low.any():
            ml = mask_lookup(full[j], az[low])
            if np.isnan(ml).any():
                raise RuntimeError("mask bin missing for an Earth azimuth (bug)")
            vis[j, low] = el[low] > ml
    return vis


def sun_fraction_series(mask720, az, el):
    y = (mask_lookup(mask720, az) - el) / SUN_RADIUS_DEG
    y = np.clip(y, -1, 1)
    return (np.arccos(y) - y * np.sqrt(1 - y * y)) / np.pi


# ====================================================================== slope
def plane_slope_deg(chain, lat0, lon0, e_m, n_m, box_m=250.0, n=5, dist_offset_km=0.0):
    """Least-squares plane z = a e + b n + c over an n x n grid spanning box_m around each point
    (local tangent offsets); slope = atan(|grad|).  Returns (slope_deg, ground_m)."""
    g = np.linspace(-box_m / 2, box_m / 2, n)
    de, dn = [a.ravel() for a in np.meshgrid(g, g)]
    E = np.asarray(e_m)[:, None] + de[None, :]
    N = np.asarray(n_m)[:, None] + dn[None, :]
    la, lo = local_offsets_to_latlon(lat0, lon0, E, N)
    dk = np.hypot(E, N) / 1000.0 + dist_offset_km
    z = hz.sample_chain(chain, la.ravel(), lo.ravel(), dk.ravel()).reshape(E.shape)
    A = np.stack([de, dn, np.ones_like(de)], axis=1)
    pinv = np.linalg.pinv(A)                                  # (3, n*n)
    coef = np.where(np.isfinite(z), z, np.nan) @ pinv.T       # NaN propagates (no DEM)
    slope = np.degrees(np.arctan(np.hypot(coef[:, 0], coef[:, 1])))
    lac, loc_ = local_offsets_to_latlon(lat0, lon0, np.asarray(e_m), np.asarray(n_m))
    ground = hz.sample_chain(chain, np.atleast_1d(lac), np.atleast_1d(loc_),
                             np.hypot(e_m, n_m) / 1000.0 + dist_offset_km)
    return slope, ground


# ====================================================================== bit helpers
def pack(b):
    return np.packbits(np.asarray(b, bool), axis=-1)


def count_bits(packed):
    return np.bitwise_count(packed).sum(axis=-1, dtype=np.int64)


def run_lengths(codes):
    """[[start, length, code], ...] for an int array."""
    codes = np.asarray(codes)
    if codes.size == 0:
        return []
    cut = np.flatnonzero(np.diff(codes)) + 1
    starts = np.concatenate([[0], cut])
    lens = np.diff(np.concatenate([starts, [codes.size]]))
    return [[int(s), int(L), int(codes[s])] for s, L in zip(starts, lens)]


def longest_run_fast(mask):
    segs = run_lengths(np.asarray(mask, np.int8))
    return max([L for _, L, c in segs if c == 1], default=0)


# ====================================================================== link budget
LINK_BUDGET_ASSUMPTIONS = {
    "note": "ESTIMATE ONLY. Every parameter below is an assumption chosen by us (not a BEACON, DSN "
            "or KDSA specification); change them with --budget-json. Range uses the worst "
            "(largest) and mean Moon-Earth distance in the ephemeris window.",
    "tx_power_w": 10.0, "tx_dish_m": 0.5, "tx_efficiency": 0.55,
    "pointing_loss_db": 0.5, "polarisation_misc_loss_db": 1.0,
    "earth_atmos_loss_db": {"S": 0.1, "Ka": 1.0},
    "required_ebn0_db": 2.5, "margin_db": 3.0,
    "stations": {
        "DSN_34m": {"dish_m": 34.0, "efficiency": 0.6, "tsys_k": {"S": 40.0, "Ka": 60.0},
                    "bands_supported": {"S": "assumed", "Ka": "assumed"}},
        "KDSA_35m": {"dish_m": 35.0, "efficiency": 0.6, "tsys_k": {"S": 60.0, "Ka": 80.0},
                     "bands_supported": {"S": "assumed", "Ka": "unverified (KDSA Ka-band receive not confirmed)"}},
    },
}


def dish_gain_db(d_m, eff, freq_hz):
    lam = C_LIGHT / freq_hz
    return 10 * math.log10(eff * (math.pi * d_m / lam) ** 2)


def fspl_db(dist_m, freq_hz):
    return 20 * math.log10(4 * math.pi * dist_m * freq_hz / C_LIGHT)


def link_budget(bands, range_km, a=LINK_BUDGET_ASSUMPTIONS):
    out = {"estimate": True, "assumptions": a, "range_km": range_km, "results": []}
    for st, s in a["stations"].items():
        for b, f in bands.items():
            for which, rk in range_km.items():
                eirp = 10 * math.log10(a["tx_power_w"]) + dish_gain_db(a["tx_dish_m"], a["tx_efficiency"], f)
                gr = dish_gain_db(s["dish_m"], s["efficiency"], f)
                loss = (fspl_db(rk * 1000.0, f) + a["pointing_loss_db"] + a["polarisation_misc_loss_db"]
                        + a["earth_atmos_loss_db"].get(b, 0.0))
                c_dbw = eirp + gr - loss
                tsys = s["tsys_k"].get(b)
                cn0 = c_dbw - (K_BOLTZ_DBW + 10 * math.log10(tsys))
                rate_db = cn0 - a["required_ebn0_db"] - a["margin_db"]
                out["results"].append({
                    "station": st, "band": b, "freq_ghz": round(f / 1e9, 3), "range": which,
                    "eirp_dbw": round(eirp, 1), "rx_gain_dbi": round(gr, 1), "path_loss_db": round(loss, 1),
                    "rx_power_dbw": round(c_dbw, 1), "cn0_dbhz": round(cn0, 1),
                    "max_rate_bps": float(f"{10 ** (rate_db / 10):.3g}"),
                    "band_support": s["bands_supported"].get(b, "unknown")})
    return out


# ====================================================================== the engine
class Ephem:
    """Ephemeris arrays (contract section 2): sun (N,3), earth (N,3) km, MOON_ME."""

    def __init__(self, sun_km, earth_km, start="2026-01-01T00:00:00Z", mock=False, source=""):
        self.sun, self.earth = np.asarray(sun_km, float), np.asarray(earth_km, float)
        self.n, self.start, self.mock, self.source = self.sun.shape[0], start, mock, source

    @classmethod
    def load(cls, web_data):
        meta = json.loads((web_data / "ephem.json").read_text(encoding="utf-8"))
        a = np.fromfile(web_data / "ephem.bin", dtype="<f4").reshape(-1, 6).astype(float)
        if a.shape[0] != meta["n"]:
            raise ValueError(f"ephem.bin has {a.shape[0]} rows, ephem.json says {meta['n']}")
        return cls(a[:, :3], a[:, 3:], meta["start"], bool(meta.get("mock")), meta.get("source", ""))


def relax_chain(chain, extra_km):
    """Widen distance gates by the search radius (gates are measured from the lander)."""
    return [(s, m + extra_km) for s, m in chain]


class AnchoredTerrain:
    """Select source resolution by distance from the cache's lander, for every tower ray."""
    def __init__(self, chain, lat, lon):
        self.chain, self.lat, self.lon = chain, lat, lon
        self.name, self.res_m = "ANCHORED_DEM", chain[0][0].res_m

    def sample(self, lat, lon):
        la, lo = np.radians(lat), np.radians(lon)
        la0, lo0 = np.radians([self.lat, self.lon])
        a = np.sin((la-la0)/2)**2 + np.cos(la0)*np.cos(la)*np.sin((lo-lo0)/2)**2
        dk = 2*R_M/1000*np.arcsin(np.sqrt(np.clip(a, 0, 1)))
        # Global sources have no cache edge: cover the full 300 km march from a shifted tower.
        chain = [(s, np.inf if isinstance(s, hz.GlobalCylSampler) else m) for s, m in self.chain]
        return hz.sample_chain(chain, lat, lon, dk)


def anchored_chain(chain, lat, lon):
    return [(AnchoredTerrain(chain, lat, lon), np.inf)]


def input_identity(chain, eph):
    """DEM file identity (including sub-second writes) and content hash of both ephemeris arrays."""
    sources = []
    for sampler, radius in chain:
        s = getattr(sampler, "sampler", sampler)
        path = getattr(s, "path", None) or getattr(getattr(s, "data", None), "filename", None)
        stat = Path(path).stat() if path else None
        row = {"name": s.name, "radius_km": radius, "size": stat.st_size if stat else None,
               "mtime_ns": stat.st_mtime_ns if stat else None}
        if isinstance(s, hz.GlobalCylSampler):
            row["label_sha256"] = hashlib.sha256(Path(path).with_suffix(".lbl").read_bytes()).hexdigest()
        if hasattr(sampler, "near_km"):
            row["outer_only_km"] = sampler.near_km
        sources.append(row)
    digest = hashlib.sha256()
    for arr in (eph.sun, eph.earth):
        digest.update(np.ascontiguousarray(arr, dtype="<f8").tobytes())
    return {"dem": sources, "ephem_sha256": digest.hexdigest(), "start": eph.start,
            "n": eph.n, "mock": eph.mock}


def coverage_map(site, chain, best, p):
    """Cell-centred local antenna reach; Earth visibility and receiver power are separate."""
    side = p["coverage_side_km"]*1000
    spacing = p["coverage_spacing_m"]
    count = int(round(side/spacing))
    if count < 1 or not np.isclose(count*spacing, side):
        raise ValueError("coverage side must be a positive multiple of grid spacing")
    offsets = -side/2 + (np.arange(count)+.5)*spacing
    ee, nn = np.meshgrid(offsets, offsets)
    lat, lon = local_offsets_to_latlon(site["lat"], site["lon"], ee.ravel(), nn.ravel())
    ground = hz.sample_chain(chain, lat, lon, np.hypot(ee, nn).ravel()/1000)
    valid = np.isfinite(ground)
    cell_area = (spacing/1000)**2
    layers = {}
    for t in best:
        # Use original DEM at the tower rather than its rounded JSON ground height.
        ground_t = hz.sample_chain(chain, np.array([t["lat"]]), np.array([t["lon"]]),
                                  np.array([t.get("dist_m", 0.)/1000]))[0]
        pr = link_profiles(chain, t["lat"], t["lon"], ground_t+t["height_m"],
                           lat[valid], lon[valid], (ground[valid]+LANDER_ANT_M)[:, None],
                           bands=p["bands"], step_m=p["los_step_m"])
        masks = {"los": link_ok(pr, "los")[:, 0]}
        masks.update({f"fresnel60_{b}": link_ok(pr, f"fresnel60_{b}")[:, 0] for b in p["bands"]})
        row = {"tower_idx": t["idx"], "tower_lat": t["lat"], "tower_lon": t["lon"],
               "tower_height_m": t["height_m"]}
        for name, values in masks.items():
            values = values & (pr["dist_m"] <= p["radius_km"]*1000)
            full = np.zeros(lat.size, np.uint8)
            full[valid] = values
            row[name] = full.tolist()
            row[name+"_area_km2"] = round(float(full.sum()*cell_area), 6)
        layers[f"{t['height_m']:g}"] = row
    return {"rows": count, "cols": count, "spacing_m": spacing,
            "origin_e_m": -side/2, "origin_n_m": -side/2,
            "order": "row-major; rows south to north; cell centres are origin+(index+0.5)*spacing",
            "receiver_height_m": LANDER_ANT_M, "max_link_range_km": p["radius_km"],
            "area_km2": (side/1000)**2, "valid_area_km2": round(float(valid.sum()*cell_area), 6),
            "valid_terrain": valid.astype(int).tolist(), "per_height": layers,
            "meaning": "Local geometric reach of each best single tower, NOT end-to-end availability. "
                       "No receiver sunlight, interference, antenna gain or station scheduling constraint."}


def compute_relay(site, chain, eph, params=None, work_dir=None, log=print):
    """Full relay-tower analysis for one site. Returns the contract v1.2 section-10 object."""
    p = dict(DEFAULTS, **(params or {}))
    t0 = time.time()
    lat0, lon0 = float(site["lat"]), float(site["lon"])
    H = np.asarray(p["heights_m"], float)
    nh, N = H.size, eph.n
    bands = p["bands"]
    rule = p["link_rule"]
    chain_r = anchored_chain(chain, lat0, lon0)
    provenance = input_identity(chain, eph)

    # ---- lander (direct link)
    h0 = float(hz.sample_chain(chain, np.array([lat0]), np.array([lon0]), np.array([0.0]))[0])
    if not np.isfinite(h0):
        raise ValueError("no DEM covers the site")
    direct = earth_visibility(lat0, lon0, chain, h0, [LANDER_ANT_M], eph.earth, p)[0]
    direct_p = pack(direct)

    # ---- candidates: positions, ground, slope
    E, Nn = candidate_grid(p["radius_km"], p["spacing_m"])
    nc = E.size
    clat, clon = local_offsets_to_latlon(lat0, lon0, E, Nn)
    slope, ground = plane_slope_deg(chain_r, lat0, lon0, E, Nn, p["slope_box_m"])
    has_dem = np.isfinite(ground)
    log(f"{site['id']}: {nc} candidates x {nh} heights, {N} hours, direct Earth {direct.mean():.1%}")

    # ---- (a) lander <-> tower-top profiles (terrain shared by all heights)
    tops = np.where(has_dem, ground, 0.0)[:, None] + H[None, :]
    prof = link_profiles(chain_r, lat0, lon0, h0 + LANDER_ANT_M, clat, clon, tops,
                         bands=bands, step_m=p["los_step_m"])
    lander_link = link_ok(prof, rule) & has_dem[:, None]

    # ---- (b)+(c) tower-top Earth visibility, packed, checkpointed per candidate
    nbytes = (N + 7) // 8
    work = Path(work_dir) if work_dir else None
    if work:
        work.mkdir(parents=True, exist_ok=True)
        key = json.dumps({k: p[k] for k in ("radius_km", "spacing_m", "heights_m", "min_km", "max_km",
                                            "n_steps", "earth_el_cap_deg")} | {"lat": lat0, "lon": lon0,
                         "inputs": provenance, "v": ENGINE_VERSION}, sort_keys=True)
        kf = work / "key.json"
        fresh = not (kf.exists() and kf.read_text() == key and (work / "vis.npy").exists()
                     and (work / "done.npy").exists())
        mode = "w+" if fresh else "r+"
        vis_p = np.lib.format.open_memmap(work / "vis.npy", mode=mode, dtype=np.uint8, shape=(nc, nh, nbytes))
        done = np.lib.format.open_memmap(work / "done.npy", mode=mode, dtype=np.bool_, shape=(nc,))
        if fresh:
            done[:] = False
            kf.write_text(key)
        log(f"  resume: {int(done.sum())}/{nc} candidates already done ({work})")
    else:
        vis_p = np.zeros((nc, nh, nbytes), np.uint8)
        done = np.zeros(nc, bool)
    tl = time.time()
    for i in range(nc):
        if done[i]:
            continue
        if has_dem[i]:
            dk = math.hypot(E[i], Nn[i]) / 1000.0
            v = earth_visibility(clat[i], clon[i], chain_r, ground[i], H, eph.earth, p, dist_offset_km=dk)
            vis_p[i] = pack(v)
        done[i] = True
        if (i + 1) % 200 == 0:
            if work:
                vis_p.flush(); done.flush()
            el = time.time() - tl
            log(f"  {i + 1}/{nc} candidates, {el:.0f} s")
    if work:
        vis_p.flush(); done.flush()

    # ---- (d) per-candidate metrics
    tower_earth = count_bits(vis_p) / N                                   # (nc, nh)
    gain_bits = count_bits(vis_p & ~direct_p[None, None, :])              # Earth when direct is down
    link_frac = np.where(lander_link, (count_bits(direct_p) + gain_bits) / N, direct.mean())
    buildable = has_dem & (slope <= p["max_slope_deg"])
    if not buildable.any():
        raise ValueError("no buildable candidate with valid terrain and slope")

    # ---- best per height + sunlight for a shortlist
    best = []
    for j, h in enumerate(H):
        # ties (common on synthetic or flat terrain) go to the candidate nearest the lander
        score = np.where(buildable, link_frac[:, j] - 1e-9 * np.hypot(E, Nn), -1.0)
        i = int(np.argmax(score))
        best.append(_tower_record(i, j, h, E, Nn, clat, clon, ground, slope, prof, lander_link,
                                  tower_earth, link_frac, bands, None))
    sun_cache = {}

    def sun_frac(i, j):
        if (i, j) not in sun_cache:
            res = hz.compute_horizon(clat[i], clon[i], chain_r, h0_m=float(ground[i]),
                                     obs_height_m=float(H[j]), min_km=p["min_km"], max_km=p["max_km"],
                                     n_steps=p["n_steps"])
            if res["n_missing"]:
                raise ValueError("missing terrain in tower sunlight horizon")
            az, el = topo_az_el(clat[i], clon[i], ground[i] + H[j], eph.sun)
            f = sun_fraction_series(res["mask"], az, el)
            sun_cache[(i, j)] = {"sun_frac": round(float((f >= 0.5).mean()), 4),
                                 "longest_dark_h": int(longest_run_fast(f < 0.5))}
        return sun_cache[(i, j)]

    for b in best:
        b.update(sun_frac(b["idx"], int(np.flatnonzero(H == b["height_m"])[0])))

    # ---- greedy networks (one per height)
    networks = []
    for j, h in enumerate(H):
        net = _greedy_network(j, h, p, chain_r, lat0, lon0, h0, E, Nn, clat, clon, ground, buildable,
                              lander_link, vis_p, direct_p, direct, N, bands, rule, prof, tower_earth,
                              link_frac, slope)
        for t in net["towers"]:
            t.update(sun_frac(t["idx"], j))
        networks.append(net)

    # ---- link budget
    rng = np.linalg.norm(eph.earth, axis=1)
    budget = link_budget(bands, {"max": round(float(rng.max()), 0), "mean": round(float(rng.mean()), 0)})

    def q(a, s=1000.0, lo=-999, hi=999):
        a = np.where(np.isfinite(a), np.round(a * s), hi)
        return np.clip(a, lo, hi).astype(int).tolist()

    cand = {"n": int(nc), "e_m": E.astype(int).tolist(), "n_m": Nn.astype(int).tolist(),
            "ground_m": np.round(np.where(has_dem, ground, np.nan), 1).tolist(),
            "slope_deg": np.round(np.where(np.isfinite(slope), slope, 99.0), 1).tolist(),
            "per_height": {}}
    cand["ground_m"] = [None if not math.isfinite(v) else v for v in cand["ground_m"]]
    for j, h in enumerate(H):
        cand["per_height"][f"{h:g}"] = {
            "link": lander_link[:, j].astype(int).tolist(),
            "tower_earth_pm": q(tower_earth[:, j], 1000, 0, 1000),
            "lander_link_pm": q(link_frac[:, j], 1000, 0, 1000),
            **{f"fresnel_{b}_pc": q(prof["fresnel"][b][:, j], 100) for b in bands}}

    log(f"  done in {time.time() - t0:.0f} s; best single-tower link "
        + ", ".join(f"{b['height_m']:g} m: {b['link_frac']:.1%}" for b in best))
    result = {
        "id": site["id"], "lat": lat0, "lon": lon0, "h0_m": round(h0, 2), "lander_antenna_m": LANDER_ANT_M,
        "window": {"start": eph.start, "step_h": 1, "n": int(N)},
        "params": {k: p[k] for k in ("radius_km", "spacing_m", "heights_m", "link_rule", "los_step_m",
                                     "min_km", "max_km", "n_steps", "earth_el_cap_deg", "slope_box_m",
                                     "max_slope_deg", "n_towers", "coverage_side_km", "coverage_spacing_m")} | {
            "bands_ghz": {b: f / 1e9 for b, f in bands.items()}, "engine_version": ENGINE_VERSION},
        "dem_sources": [{"name": s.name, "res_m": round(float(s.res_m), 1)} for s, _ in chain],
        "lander": {"earth_frac": round(float(direct.mean()), 4),
                   "longest_no_earth_h": int(longest_run_fast(~direct))},
        "candidates": cand,
        "best": best,
        "height_curve": [{"height_m": b["height_m"], "single_link_frac": b["link_frac"],
                          "network_link_frac": n["link_frac_by_n"][-1],
                          "single_gain_pp": round(100*(b["link_frac"]-direct.mean()), 2)}
                         for b, n in zip(best, networks)],
        "networks": networks,
        "link_budget": budget,
        "inputs_mock": {"ephem": bool(eph.mock), "site_coords": bool(site.get("mock", False))},
        "input_identity": provenance,
        "mock": bool(eph.mock),
        "concept": "BEACON (NASA GRC, NTRS 20240014584): 15 m deployed boom, users up to ~10 km",
    }
    if p["coverage_side_km"] > 0:
        result["coverage"] = coverage_map(site, chain_r, best, p)
    return result


def _tower_record(i, j, h, E, Nn, clat, clon, ground, slope, prof, lander_link, tower_earth, link_frac,
                  bands, parent):
    r = {"idx": int(i), "height_m": float(h), "e_m": float(E[i]), "n_m": float(Nn[i]),
         "lat": round(float(clat[i]), 6), "lon": round(float(clon[i]), 6),
         "dist_m": round(float(math.hypot(E[i], Nn[i])), 1), "ground_m": round(float(ground[i]), 1),
         "slope_deg": round(float(slope[i]), 1), "link_to_lander": bool(lander_link[i, j]),
         "min_clear_m": round(float(min(prof["min_clear_m"][i, j], 1e6)), 1),
         "fresnel": {b: round(float(min(prof["fresnel"][b][i, j], 999)), 2) for b in bands},
         "tower_earth_frac": round(float(tower_earth[i, j]), 4), "link_frac": round(float(link_frac[i, j]), 4)}
    if parent is not None:
        r["parent"] = parent
    return r


def _greedy_network(j, h, p, chain_r, lat0, lon0, h0, E, Nn, clat, clon, ground, buildable, lander_link,
                    vis_p, direct_p, direct, N, bands, rule, prof, tower_earth, link_frac, slope):
    vis = np.ascontiguousarray(vis_p[:, j, :])
    covered = direct_p.copy()
    reach = lander_link[:, j] & buildable           # reachable from the lander (directly or by hops)
    parent = np.where(reach, -1, -2)                # -1 = lander, k = tower k, -2 = unreachable
    parent_clear = prof["min_clear_m"][:, j].copy()
    parent_fr = {b: prof["fresnel"][b][:, j].copy() for b in bands}
    towers, fracs = [], [round(float(direct.mean()), 4)]
    for k in range(int(p["n_towers"])):
        cand = np.flatnonzero(reach)
        if cand.size == 0:
            break
        gains = count_bits(vis[cand] & ~covered[None, :])
        g = int(gains.max())
        if g == 0:
            break
        i = int(cand[np.argmax(gains)])
        covered |= vis[i]
        rec = _tower_record(i, j, h, E, Nn, clat, clon, ground, slope, prof, lander_link, tower_earth,
                            link_frac, bands, "LANDER" if parent[i] == -1 else int(parent[i]))
        rec["gain_pp"] = round(100.0 * g / N, 2)
        rec["parent_link"] = {"min_clear_m": round(float(min(parent_clear[i], 1e6)), 2),
                              "fresnel": {b: round(float(min(parent_fr[b][i], 999)), 3) for b in bands}}
        towers.append(rec)
        fracs.append(round(float(count_bits(covered) / N), 4))
        reach[i] = False                            # placed
        # tower-top <-> other tower-tops (same height)
        others = np.flatnonzero(buildable & (parent == -2))
        if others.size:
            pr = link_profiles(chain_r, clat[i], clon[i], ground[i] + h, clat[others], clon[others],
                               (ground[others] + h)[:, None], bands=bands, step_m=p["los_step_m"],
                               dist_offset_km=math.hypot(E[i], Nn[i]) / 1000.0)
            ok = link_ok(pr, rule)[:, 0]
            parent[others[ok]] = k
            reach[others[ok]] = True
            parent_clear[others[ok]] = pr["min_clear_m"][ok, 0]
            for b in bands:
                parent_fr[b][others[ok]] = pr["fresnel"][b][ok, 0]
    bits = np.unpackbits(covered)[:N].astype(bool)
    codes = np.where(direct, 1, np.where(bits, 2, 0))
    return {"height_m": float(h), "towers": towers, "link_frac_by_n": fracs,
            "longest_gap_h": int(longest_run_fast(codes == 0)),
            "timeline": {"codes": {"0": "none", "1": "direct", "2": "via_tower"},
                         "segments": run_lengths(codes)}}


# ====================================================================== contract check
def validate_relay(obj):
    """Raise AssertionError if obj does not follow contract section 12 (proposed v1.2)."""
    for k in ("id", "lat", "lon", "h0_m", "window", "params", "lander", "candidates", "best",
              "networks", "link_budget", "mock"):
        assert k in obj, f"missing key {k}"
    n = obj["window"]["n"]
    c = obj["candidates"]
    for k in ("e_m", "n_m", "ground_m", "slope_deg"):
        assert len(c[k]) == c["n"], k
    hs = [f"{h:g}" for h in obj["params"]["heights_m"]]
    assert sorted(c["per_height"]) == sorted(hs)
    for h in hs:
        for k, v in c["per_height"][h].items():
            assert len(v) == c["n"], (h, k)
    assert len(obj["best"]) == len(hs)
    for net in obj["networks"]:
        segs = net["timeline"]["segments"]
        assert sum(s[1] for s in segs) == n and segs[0][0] == 0
        assert all(segs[i][0] + segs[i][1] == segs[i + 1][0] for i in range(len(segs) - 1))
        assert all(s[2] in (0, 1, 2) for s in segs)
        f = net["link_frac_by_n"]
        assert all(f[i] <= f[i + 1] + 1e-9 for i in range(len(f) - 1))
        assert 0 <= f[0] <= 1 and len(f) == len(net["towers"]) + 1
    assert obj["link_budget"]["estimate"] is True
    if "height_curve" in obj:
        assert len(obj["height_curve"]) == len(hs)
        for row, best, net in zip(obj["height_curve"], obj["best"], obj["networks"]):
            assert row["height_m"] == best["height_m"] == net["height_m"]
            assert row["single_link_frac"] == best["link_frac"]
            assert row["network_link_frac"] == net["link_frac_by_n"][-1]
    if "coverage" in obj:
        m = obj["coverage"]
        size = m["rows"]*m["cols"]
        assert len(m["valid_terrain"]) == size
        assert sorted(m["per_height"]) == sorted(hs)
        for layer in m["per_height"].values():
            for key in ["los"] + [f"fresnel60_{b}" for b in obj["params"]["bands_ghz"]]:
                assert len(layer[key]) == size
                assert all(v in (0, 1) for v in layer[key])
                assert abs(layer[key+"_area_km2"]-sum(layer[key])*(m["spacing_m"]/1000)**2) < 1e-5


# ====================================================================== CLI
def main(argv=None):
    import run_horizons as rh
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--site", required=True, action="append")
    ap.add_argument("--sites", default=str(ROOT / "web" / "data" / "sites.json"))
    ap.add_argument("--raw", default=str(ROOT / "data" / "raw"))
    ap.add_argument("--web-data", default=str(ROOT / "web" / "data"))
    ap.add_argument("--work", default=str(ROOT / "data" / "processed" / "relay"))
    ap.add_argument("--radius-km", type=float, default=DEFAULTS["radius_km"])
    ap.add_argument("--spacing-m", type=float, default=DEFAULTS["spacing_m"])
    ap.add_argument("--heights", default="5,15,30,50")
    ap.add_argument("--s-ghz", type=float, default=2.2)
    ap.add_argument("--ka-ghz", type=float, default=26.0)
    ap.add_argument("--link-rule", default="los")
    ap.add_argument("--n-steps", type=int, default=DEFAULTS["n_steps"])
    ap.add_argument("--n-towers", type=int, default=3)
    ap.add_argument("--allow-mock-ephem", action="store_true")
    a = ap.parse_args(argv)
    eph = Ephem.load(Path(a.web_data))
    if eph.mock and not a.allow_mock_ephem:
        ap.error("web/data/ephem.bin is still the MOCK; wait for card 1 or pass --allow-mock-ephem")
    sites = {s["id"]: s for s in json.loads(Path(a.sites).read_text(encoding="utf-8"))}
    params = {"radius_km": a.radius_km, "spacing_m": a.spacing_m,
              "heights_m": [float(x) for x in a.heights.split(",")],
              "bands": {"S": a.s_ghz * 1e9, "Ka": a.ka_ghz * 1e9}, "link_rule": a.link_rule,
              "n_steps": a.n_steps, "n_towers": a.n_towers}
    for sid in a.site:
        site = sites[sid]
        chain = rh.build_chain(site, Path(a.raw), DEFAULTS["max_km"])
        obj = compute_relay(site, chain, eph, params, work_dir=Path(a.work) / sid)
        validate_relay(obj)
        hz.write_json_atomic(Path(a.web_data) / "relay" / f"{sid}.json", obj)
        print(f"wrote web/data/relay/{sid}.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
