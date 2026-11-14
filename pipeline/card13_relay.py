"""Fixed-location relay sensitivity: change the 0-3 km DEM to 80 m or 240 m.

python pipeline/card13_relay.py --output docs/card13_sensitivity.json
The selected tower locations stay fixed; this isolates terrain sensitivity from re-optimisation.
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import horizon as hz
import relay_tower as rt
import run_horizons as rh
from card8_horizons import sensitivity_chain, SENSITIVITY_SITES

ROOT = Path(__file__).resolve().parents[1]


def evaluate_fixed_towers(site, chain, eph, params, towers):
    """Re-evaluate direct visibility and each fixed single tower under one terrain variant."""
    chain = rt.anchored_chain(chain, site['lat'], site['lon'])
    h0 = hz.sample_chain(chain, np.array([site['lat']]), np.array([site['lon']]), np.array([0.]))[0]
    if not np.isfinite(h0):
        raise ValueError('missing terrain at lander')
    direct = rt.earth_visibility(site['lat'], site['lon'], chain, h0, [2.], eph.earth, params)[0]
    rows = []
    for t in towers:
        lat, lon = rt.local_offsets_to_latlon(site['lat'], site['lon'], np.array([t['e_m']]), np.array([t['n_m']]))
        ground = hz.sample_chain(chain, lat, lon, np.array([np.hypot(t['e_m'], t['n_m'])/1000]))[0]
        if not np.isfinite(ground):
            raise ValueError('missing terrain at tower')
        pr = rt.link_profiles(chain, site['lat'], site['lon'], h0+2, lat, lon,
                              [[ground+t['height_m']]], bands=params['bands'], step_m=params['los_step_m'])
        linked = bool(rt.link_ok(pr, params['link_rule'])[0, 0])
        visible = rt.earth_visibility(float(lat[0]), float(lon[0]), chain, ground,
                                      [t['height_m']], eph.earth, params)[0]
        codes = direct | (linked & visible)
        rows.append(dict(height_m=t['height_m'], e_m=t['e_m'], n_m=t['n_m'],
            ground_m=float(ground), link_to_lander=linked, tower_earth_frac=float(visible.mean()),
            link_frac=float(codes.mean()), longest_gap_h=rt.longest_run_fast(~codes),
            min_clear_m=float(min(pr['min_clear_m'][0, 0], 1e6)),
            fresnel={b: float(min(pr['fresnel'][b][0, 0], 999)) for b in params['bands']}))
    return dict(h0_m=float(h0), direct_frac=float(direct.mean()), towers=rows)


def sensitivity(site, raw, web, eph):
    start = time.monotonic()
    path = web/'relay'/f"{site['id']}.json"
    rec = json.loads(path.read_text(encoding='utf-8'))
    if rec['params']['engine_version'] != rt.ENGINE_VERSION or rec.get('mock'):
        raise ValueError(f"{site['id']}: current real relay output required")
    params = dict(rt.DEFAULTS, **{k: v for k, v in rec['params'].items() if k in rt.DEFAULTS})
    params['bands'] = {b: f*1e9 for b, f in rec['params']['bands_ghz'].items()}
    chain = rh.build_chain(site, raw, params['max_km'])
    if rec.get('input_identity') != rt.input_identity(chain, eph):
        raise ValueError(f"{site['id']}: relay inputs have changed; regenerate first")
    baseline = evaluate_fixed_towers(site, chain, eph, params, rec['best'])
    variants = []
    for res in (80, 240):
        v = evaluate_fixed_towers(site, sensitivity_chain(site, chain, res), eph, params, rec['best'])
        variants.append(dict(resolution_m=res, **v))
    return dict(id=site['id'], lat=site['lat'], lon=site['lon'], near_km=3,
        observer_policy='Lander 2 m and towers at their specified heights above each variant DEM; horizontal positions fixed.',
        baseline=baseline, variants=variants, relay_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        input_identity=rec['input_identity'], elapsed_s=round(time.monotonic()-start, 2))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--site', action='append')
    ap.add_argument('--raw', type=Path, default=ROOT/'data/raw')
    ap.add_argument('--web-data', type=Path, default=ROOT/'web/data')
    ap.add_argument('--output', type=Path, default=ROOT/'docs/card13_sensitivity.json')
    args = ap.parse_args()
    chosen = args.site or SENSITIVITY_SITES
    sites = json.loads((args.web_data/'sites.json').read_text(encoding='utf-8'))
    if set(chosen)-{s['id'] for s in sites}:
        ap.error('unknown site')
    eph = rt.Ephem.load(args.web_data)
    report = dict(method='Fixed selected antennas; replace DEM only within 3 km of the lander, preserve far field.',
        interpretation='Sensitivity is not truth error. No threshold forces different resolutions to agree; no re-ranking or network re-optimisation.',
        sites=[])
    for site in [s for s in sites if s['id'] in chosen]:
        row = sensitivity(site, args.raw, args.web_data, eph)
        report['sites'].append(row)
        hz.write_json_atomic(args.output, report)
        delta = [100*(b['link_frac']-a['link_frac']) for a, b in zip(row['variants'][0]['towers'], row['variants'][1]['towers'])]
        print(f"{site['id']}: 240 minus 80 m link delta pp {delta}; {row['elapsed_s']} s", flush=True)


if __name__ == '__main__':
    main()
