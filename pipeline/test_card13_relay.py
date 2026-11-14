"""Sensitivity compares the same antennas and times, rather than silently re-ranking sites."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import horizon as hz
import relay_tower as rt
import card13_relay as c13


def test_fixed_tower_sensitivity_detects_nearby_wall():
    site = dict(id="SYNTHETIC", lat=0., lon=0.)
    p = dict(rt.DEFAULTS, n_steps=500)
    earth = np.array([[384400*np.sin(np.radians(5)), 0, 384400*np.cos(np.radians(5))]])
    eph = rt.Ephem(earth*1000, earth, mock=True)
    towers = [dict(e_m=0., n_m=0., height_m=15.)]
    flat = [(hz.FunctionSampler(lambda a, b: np.zeros(a.shape)), 400.)]
    wall = [(hz.FunctionSampler(lambda a, b: np.where(
        np.abs(np.radians(a)*hz.R_M-200) < 30, 100., 0.)), 400.)]
    a = c13.evaluate_fixed_towers(site, flat, eph, p, towers)
    b = c13.evaluate_fixed_towers(site, wall, eph, p, towers)
    assert a["direct_frac"] == 1 and b["direct_frac"] == 0
    assert a["towers"][0]["link_frac"] == 1 and b["towers"][0]["link_frac"] == 0
    assert b["towers"][0]["e_m"] == b["towers"][0]["n_m"] == 0
