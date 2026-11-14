"""Independent card-13 DEM/LOS/Fresnel/Earth check, without production imports.

PROJ geodesics and ECEF vectors replace the relay engine's spherical equations.
The full ephemeris window is independently evaluated on the declared angular /
distance grid. Thirty evenly spaced epochs also get dense, exact-azimuth rays;
their reference is the production candidate checkpoint, not the five-year mean.
This tests numerical implementation on the same DEMs, not DEM physical accuracy.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta
import hashlib
import json
import math
from pathlib import Path
import re
import time

import numpy as np
from pyproj import Geod, Proj

ROOT = Path(__file__).resolve().parents[1]
RADIUS = 1737400.0
LIGHT_M_S = 299792458.0
GEOD = Geod(a=RADIUS, b=RADIUS)


def bilinear(array, row, col, wrap=False):
    """Separate four-neighbor interpolation; no-data remains no-data."""
    row, col = np.asarray(row), np.asarray(col)
    ny, nx = array.shape
    good = np.isfinite(row) & np.isfinite(col) & (row >= 0) & (row <= ny - 1)
    if not wrap:
        good &= (col >= 0) & (col <= nx - 1)
    result = np.full(row.shape, np.nan)
    y = np.minimum(np.floor(row[good]).astype(int), ny - 2)
    x = np.floor(col[good]).astype(int)
    if not wrap:
        x = np.minimum(x, nx - 2)
    fy, fx = row[good] - y, col[good] - x
    a, b = array[y, x % nx], array[y, (x + 1) % nx]
    c, d = array[y + 1, x % nx], array[y + 1, (x + 1) % nx]
    result[good] = (1 - fy) * ((1 - fx) * a + fx * b) + fy * ((1 - fx) * c + fx * d)
    return result


class DEM:
    """Independent NPZ/PDS reader; source gates are anchored on the lander."""
    def __init__(self, site, raw, max_km=300.):
        self.lat, self.lon = site['lat'], site['lon']
        self.sources = []
        if self.lat <= -80:
            for resolution in [5, 10, 20, 60, 80, 240]:
                path = raw / 'polar' / str(resolution) / (site['id'] + '.npz')
                if not path.exists():
                    continue
                with np.load(path, allow_pickle=False) as z:
                    meta = json.loads(str(z['metadata']))
                    x, y = z['x_m'], z['y_m']
                    self.sources.append(dict(kind='polar', path=str(path), array=z['height_m'],
                        project=Proj(meta['projection']), x0=x[0], y0=y[0],
                        dx=(x[-1]-x[0])/(len(x)-1), dy=(y[0]-y[-1])/(len(y)-1),
                        max_km=min(meta['radius_m']/1000, max_km)))
            if not self.sources:
                raise ValueError(f"{site['id']}: missing polar DEM")
        elif abs(self.lat) < 60:
            path = raw / 'sldem' / (site['id'] + '.npz')
            with np.load(path, allow_pickle=False) as z:
                meta = json.loads(str(z['meta']))
                lat, lon = z['lat'], z['lon_unwrapped']
                self.sources.append(dict(kind='sldem', path=str(path), array=z['height_m'],
                    lat0=lat[0], lon0=lon[0], mid=(lon[0]+lon[-1])/2,
                    dlat=(lat[0]-lat[-1])/(len(lat)-1), dlon=(lon[-1]-lon[0])/(len(lon)-1),
                    max_km=min(meta['radius_km'], max_km)))
        for ppd in [64, 16]:
            path = raw / 'global' / f'ldem_{ppd}_float.img'
            if not path.exists():
                continue
            label = path.with_suffix('.lbl').read_text(encoding='latin-1')
            def number(key):
                return float(re.search(r'^\s*'+key+r'\s*=\s*([-+0-9.eE]+)', label, re.M)[1])
            ny, nx = int(number('LINES')), int(number('LINE_SAMPLES'))
            self.sources.append(dict(kind='global', path=str(path),
                array=np.memmap(path, dtype='<f4', shape=(ny, nx), mode='r'),
                ppd=number('MAP_RESOLUTION'), lpo=number('LINE_PROJECTION_OFFSET'),
                spo=number('SAMPLE_PROJECTION_OFFSET'), clon=number('CENTER_LONGITUDE'),
                scale=number('SCALING_FACTOR')*1000, max_km=None))
        if not any(s['kind'] == 'global' for s in self.sources):
            raise ValueError('missing global far-field DEM')

    def __call__(self, lat, lon):
        lat, lon = np.asarray(lat), np.asarray(lon)
        _, _, distances = GEOD.inv(np.full(lat.shape, self.lon), np.full(lat.shape, self.lat), lon, lat)
        out = np.full(lat.shape, np.nan)
        for s in self.sources:
            take = np.isnan(out)
            if s['max_km'] is not None:
                take &= distances <= s['max_km']*1000 + 1e-6
            if not take.any():
                continue
            la, lo = lat[take], lon[take]
            if s['kind'] == 'polar':
                x, y = s['project'](lo, la)
                v = bilinear(s['array'], (s['y0']-y)/s['dy'], (x-s['x0'])/s['dx'])
            elif s['kind'] == 'sldem':
                lu = s['mid'] + (lo-s['mid']+180) % 360 - 180
                v = bilinear(s['array'], (s['lat0']-la)/s['dlat'], (lu-s['lon0'])/s['dlon'])
            else:
                row = np.clip(s['lpo']-la*s['ppd'], 0, s['array'].shape[0]-1)
                col = s['spo'] + (np.mod(lo, 360)-s['clon'])*s['ppd']
                v = bilinear(s['array'], row, col, wrap=True)*s['scale']
            out[take] = v
        return out

    def manifest(self):
        return [{k: s[k] for k in ['kind', 'path', 'max_km']} for s in self.sources]


def xyz(lat, lon, altitude_m=0.):
    la, lo = np.radians(lat), np.radians(lon)
    direction = np.stack([np.cos(la)*np.cos(lo), np.cos(la)*np.sin(lo), np.sin(la)], axis=-1)
    return direction * np.asarray(RADIUS + altitude_m)[..., None]


def trace_mask(lat, lon, ground, height, terrain, azimuths, distances_m):
    """Brute-force rays in ECEF; no early stopping or production geometry."""
    up = xyz(lat, lon)/RADIUS
    observer = xyz(lat, lon, ground + height)
    result = []
    for azimuth in azimuths:
        lo, la, _ = GEOD.fwd(np.full(distances_m.shape, lon), np.full(distances_m.shape, lat),
                            np.full(distances_m.shape, azimuth), distances_m)
        heights = terrain(la, lo)
        if not np.isfinite(heights).all():
            raise ValueError(f'{azimuth:g} degrees: missing terrain')
        ray = xyz(la, lo, heights) - observer
        vertical = ray @ up
        horizontal = np.linalg.norm(ray - vertical[:, None]*up, axis=1)
        result.append(float(np.degrees(np.arctan2(vertical, horizontal)).max()))
    return np.asarray(result)


def body_angles(lat, lon, altitude, earth_km):
    up = xyz(lat, lon)/RADIUS
    east = np.array([-np.sin(np.radians(lon)), np.cos(np.radians(lon)), 0.])
    north = np.cross(up, east)
    rays = earth_km*1000 - xyz(lat, lon, altitude)
    v = rays @ up
    el = np.degrees(np.arctan2(v, np.hypot(rays @ north, rays @ east)))
    az = np.degrees(np.arctan2(rays @ east, rays @ north)) % 360
    return az, el


def visibility(lat, lon, ground, height, terrain, earth, distances):
    az, el = body_angles(lat, lon, ground + height, earth)
    lower = np.floor(az/.5).astype(int) % 720
    bins = np.unique(np.concatenate([lower, (lower + 1) % 720]))
    masks = np.full(720, np.nan)
    masks[bins] = trace_mask(lat, lon, ground, height, terrain, bins*.5, distances)
    frac = (az/.5) % 1
    limit = masks[lower]*(1-frac) + masks[(lower+1) % 720]*frac
    return el > limit


def profile_geometry(a, b, terrain_xyz, bands):
    chord = b-a
    length = np.linalg.norm(chord)
    direction = chord/length
    normal = np.cross(a/np.linalg.norm(a), b/np.linalg.norm(b))
    normal /= np.linalg.norm(normal)
    down = np.cross(normal, direction)
    relative = terrain_xyz-a
    clearance = relative @ down
    along = relative @ direction
    # Clamp endpoint projections only to make Fresnel radius defined on steep paths.
    d1, d2 = np.maximum(along, 1e-6), np.maximum(length-along, 1e-6)
    ratios = {band: float(np.min(clearance / np.sqrt((LIGHT_M_S/freq)*d1*d2/(d1+d2))))
              for band, freq in bands.items()}
    return {'min_clear_m': float(clearance.min()), 'fresnel': ratios}


def check_path(site, tower_lat, tower_lon, tower_height, terrain, bands, step_m):
    az, _, distance = GEOD.inv(site['lon'], site['lat'], tower_lon, tower_lat)
    ground_a = float(terrain(np.array([site['lat']]), np.array([site['lon']]))[0])
    ground_b = float(terrain(np.array([tower_lat]), np.array([tower_lon]))[0])
    if not math.isfinite(ground_a) or not math.isfinite(ground_b):
        raise ValueError('missing terrain at path endpoint')
    if distance < 1e-5:
        return {'status': 'co-located; no horizontal interior', 'distance_m': distance,
                'min_clear_m': None, 'fresnel': {b: None for b in bands}, 'los': True}
    n = max(2, math.ceil(distance/step_m))
    offsets = distance*np.arange(1, n)/n
    lo, la, _ = GEOD.fwd(np.full(offsets.shape, site['lon']), np.full(offsets.shape, site['lat']),
                        np.full(offsets.shape, az), offsets)
    heights = terrain(la, lo)
    if not np.isfinite(heights).all():
        raise ValueError('missing terrain inside antenna path')
    result = profile_geometry(xyz(site['lat'], site['lon'], ground_a+2),
                              xyz(tower_lat, tower_lon, ground_b+tower_height), xyz(la, lo, heights), bands)
    result.update(status='sampled', distance_m=distance, samples=len(offsets), step_m=distance/n,
                  los=result['min_clear_m'] > 0)
    return result


def hour_indices(n, count):
    if count < 2 or n < count:
        raise ValueError('need 2 <= hour count <= ephemeris rows')
    return np.linspace(0, n-1, count, dtype=int)


def load_reference(record, directory, candidate, height_index):
    key = json.loads((directory/'key.json').read_text(encoding='utf-8'))
    epoch_count = (key.get('inputs') or {}).get('n', key.get('n'))
    if (key.get('inputs') != record.get('input_identity') or not record.get('input_identity')
            or key.get('v') != record['params']['engine_version']
            or key.get('lat') != record['lat'] or key.get('lon') != record['lon']
            or epoch_count != record['window']['n']):
        raise ValueError('candidate checkpoint identity does not match output')
    for name in ['radius_km', 'spacing_m', 'heights_m', 'min_km', 'max_km', 'n_steps', 'earth_el_cap_deg']:
        if name in key and key[name] != record['params'].get(name):
            raise ValueError(f'candidate checkpoint parameter identity differs: {name}')
    done = np.load(directory/'done.npy', mmap_mode='r')
    if done.shape != (record['candidates']['n'],) or not done.all():
        raise ValueError('candidate checkpoint incomplete')
    packed = np.load(directory/'vis.npy', mmap_mode='r')
    n = record['window']['n']
    expected = (record['candidates']['n'], len(record['params']['heights_m']), (n+7)//8)
    if packed.shape != expected:
        raise ValueError('candidate checkpoint shape does not match report')
    return np.unpackbits(packed[candidate, height_index])[:n].astype(bool)


def auxiliary_path(site, record, height, terrain, bands, step_m):
    """A non-degenerate local path when the best tower shares the lander's position."""
    candidates = record['candidates']
    offsets_e, offsets_n = np.asarray(candidates['e_m']), np.asarray(candidates['n_m'])
    d = np.hypot(offsets_e, offsets_n)
    data = candidates['per_height'][f'{height:g}']
    available = np.flatnonzero((d > 1.) & np.isfinite(np.asarray(candidates['ground_m'], float)))
    if available.size == 0:
        raise ValueError('no non-colocated auxiliary candidate')
    linked = available[np.asarray(data['link'])[available] == 1]
    choices = linked if linked.size else available
    idx = int(choices[np.argmin(d[choices])])
    lon, lat, _ = GEOD.fwd(site['lon'], site['lat'], math.degrees(math.atan2(offsets_e[idx], offsets_n[idx])), d[idx])
    result = check_path(site, lat, lon, height, terrain, bands, step_m)
    result['idx'] = idx
    result['reported_fresnel_pc'] = {b: data[f'fresnel_{b}_pc'][idx] for b in bands}
    result['fresnel60_agrees'] = {b: bool((v >= .6) == (data[f'fresnel_{b}_pc'][idx] >= 60))
                                for b, v in result['fresnel'].items()}
    link = result['los']
    if record['params']['link_rule'].startswith('fresnel60_'):
        link &= result['fresnel'][record['params']['link_rule'].split('_', 1)[1]] >= .6
    result['link_rule_agrees'] = bool(link == bool(data['link'][idx]))
    result['note'] = 'Nearest non-colocated linked candidate (or nearest candidate if none linked); Fresnel fields quantized/clipped to percent.'
    return result


def verify_site(site, args):
    start_time = time.monotonic()
    file = args.web_data/'relay'/(site['id']+'.json')
    record = json.loads(file.read_text(encoding='utf-8'))
    if record['mock'] or (record['lat'], record['lon']) != (site['lat'], site['lon']):
        raise ValueError('mock or stale-coordinate result')
    params = record['params']
    best = next(b for b in record['best'] if b['height_m'] == args.height_m)
    height_index = list(params['heights_m']).index(args.height_m)
    ephem_meta = json.loads((args.web_data/'ephem.json').read_text(encoding='utf-8'))
    ephem = np.fromfile(args.web_data/'ephem.bin', dtype='<f4').reshape(-1, 6).astype(float)
    earth = ephem[:, 3:]
    if ephem_meta['mock'] or len(earth) != record['window']['n'] or ephem_meta['start'] != record['window']['start']:
        raise ValueError('ephemeris does not match result')
    hours = hour_indices(len(earth), args.hour_count)
    terrain = DEM(site, args.raw, params['max_km'])
    identity = record.get('input_identity')
    if identity:
        digest = hashlib.sha256()
        for vectors in [ephem[:, :3], earth]:
            digest.update(np.ascontiguousarray(vectors, dtype='<f8').tobytes())
        if digest.hexdigest() != identity['ephem_sha256']:
            raise ValueError('ephemeris content differs from production input')
        if len(identity['dem']) != len(terrain.sources):
            raise ValueError('DEM source count differs from production input')
        for source, expected in zip(terrain.sources, identity['dem']):
            path = Path(source['path'])
            info = path.stat()
            if info.st_size != expected['size'] or info.st_mtime_ns != expected['mtime_ns']:
                raise ValueError(f'DEM identity differs from production input: {path}')
            if source['kind'] == 'global':
                if hashlib.sha256(path.with_suffix('.lbl').read_bytes()).hexdigest() != expected['label_sha256']:
                    raise ValueError(f'global label differs from production input: {path}')
    # Reconstruct the exact lattice position instead of using six-decimal display coordinates.
    tower_lon, tower_lat, _ = GEOD.fwd(site['lon'], site['lat'],
        math.degrees(math.atan2(best['e_m'], best['n_m'])), math.hypot(best['e_m'], best['n_m']))
    tower_ground = float(terrain(np.array([tower_lat]), np.array([tower_lon]))[0])
    lander_ground = float(terrain(np.array([site['lat']]), np.array([site['lon']]))[0])
    bands = {b: f*1e9 for b, f in params['bands_ghz'].items()}
    path = check_path(site, tower_lat, tower_lon, args.height_m, terrain, bands, args.los_step_m)
    linked = path['los']
    rule = params['link_rule']
    if rule.startswith('fresnel60_') and path['status'] == 'sampled':
        linked &= path['fresnel'][rule.split('_', 1)[1]] >= .6
    path['reported_min_clear_m'] = best['min_clear_m']
    path['reported_fresnel'] = best['fresnel']
    path['clearance_difference_m'] = (path['min_clear_m']-best['min_clear_m']) if path['min_clear_m'] is not None else None
    path['fresnel_difference'] = {b: (v-best['fresnel'][b]) if v is not None else None for b, v in path['fresnel'].items()}
    path['link_rule_agrees'] = bool(linked == best['link_to_lander'])
    path['fresnel60_agrees'] = {b: bool(v is None or (v >= .6) == (best['fresnel'][b] >= .6))
                              for b, v in path['fresnel'].items()}
    auxiliary = auxiliary_path(site, record, args.height_m, terrain, bands, args.los_step_m) if path['status'] != 'sampled' else None
    distances = np.geomspace(params['min_km']*1000, params['max_km']*1000, params['n_steps']+1)
    direct = visibility(site['lat'], site['lon'], lander_ground, 2., terrain, earth, distances)
    tower = visibility(tower_lat, tower_lon, tower_ground, args.height_m, terrain, earth, distances)
    link = direct | (linked & tower)
    full = {name: {'independent': float(a.mean()), 'reported': target,
                   'difference_pp': float(100*(a.mean()-target))}
            for name, a, target in [('direct', direct, record['lander']['earth_frac']),
                                    ('tower_earth', tower, best['tower_earth_frac']),
                                    ('single_tower_link', link, best['link_frac'])]}
    print(f"{site['id']}: full-window independent check done; tracing {len(hours)} dense epochs", flush=True)
    dense = np.unique(np.r_[distances, np.arange(min(5., distances[0]), distances[-1], args.horizon_step_m)])
    daz, delv = body_angles(site['lat'], site['lon'], lander_ground+2, earth[hours])
    taz, telv = body_angles(tower_lat, tower_lon, tower_ground+args.height_m, earth[hours])
    dh = trace_mask(site['lat'], site['lon'], lander_ground, 2., terrain, daz, dense)
    th = trace_mask(tower_lat, tower_lon, tower_ground, args.height_m, terrain, taz, dense)
    dense_direct, dense_tower = delv > dh, telv > th
    dense_link = dense_direct | (linked & dense_tower)
    # Direct flags are independently recoverable from every network's RLE.
    direct_reference = np.zeros(len(earth), bool)
    for start, length, code in record['networks'][height_index]['timeline']['segments']:
        direct_reference[start:start+length] = code == 1
    visfile = args.work/site['id']/'vis.npy'
    tower_reference = None
    cache_fraction_consistent = False
    if visfile.exists():
        tower_reference = load_reference(record, args.work/site['id'], best['idx'], height_index)
        cache_link = direct_reference | (best['link_to_lander'] & tower_reference)
        cache_fraction_consistent = bool(abs(tower_reference.mean()-best['tower_earth_frac']) <= .000051
                                         and abs(cache_link.mean()-best['link_frac']) <= .000051)
    elif not args.allow_missing_cache:
        raise ValueError(f'missing candidate checkpoint: {visfile}')
    rows = []
    epoch = datetime.fromisoformat(ephem_meta['start'].replace('Z', '+00:00'))
    for j, hour in enumerate(hours):
        ref_tower = bool(tower_reference[hour]) if tower_reference is not None else None
        ref_link = bool(direct_reference[hour] or (best['link_to_lander'] and ref_tower)) if ref_tower is not None else None
        rows.append(dict(hour=int(hour), utc=(epoch+timedelta(hours=int(hour))).isoformat(),
            direct=bool(dense_direct[j]), tower=bool(dense_tower[j]), link=bool(dense_link[j]),
            reference_direct=bool(direct_reference[hour]), reference_tower=ref_tower, reference_link=ref_link,
            direct_margin_deg=float(delv[j]-dh[j]), tower_margin_deg=float(telv[j]-th[j])))
    mismatches = {name: sum(r[name] != r['reference_'+name] for r in rows) if
                  all(r['reference_'+name] is not None for r in rows) else None for name in ['direct', 'tower', 'link']}
    sample_pass = all(m is not None and 100*m/len(hours) <= 1 for m in mismatches.values())
    passed = (all(abs(v['difference_pp']) <= 1 for v in full.values()) and path['link_rule_agrees']
              and all(path['fresnel60_agrees'].values()) and sample_pass and cache_fraction_consistent)
    if auxiliary:
        passed &= auxiliary['link_rule_agrees'] and all(auxiliary['fresnel60_agrees'].values())
    return dict(id=site['id'], passed=passed, height_m=args.height_m, best_idx=best['idx'],
        tower_lat=tower_lat, tower_lon=tower_lon, terrain=terrain.manifest(), params=params,
        relay_sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
        ephem_sha256=hashlib.sha256((args.web_data/'ephem.bin').read_bytes()).hexdigest(),
        path=path, auxiliary_path=auxiliary, full_window=full, sample_mismatches=mismatches, epochs=rows,
        cache_fraction_consistent=cache_fraction_consistent,
        dense_horizon_step_m=args.horizon_step_m, dense_horizon_samples_per_ray=len(dense),
        elapsed_s=round(time.monotonic()-start_time, 2))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--site', action='append')
    ap.add_argument('--raw', type=Path, default=ROOT/'data/raw')
    ap.add_argument('--web-data', type=Path, default=ROOT/'web/data')
    ap.add_argument('--work', type=Path, default=ROOT/'data/processed/relay')
    ap.add_argument('--output', type=Path, default=ROOT/'data/processed/card13-independent.json')
    ap.add_argument('--height-m', type=float, default=15.)
    ap.add_argument('--hour-count', type=int, default=30)
    ap.add_argument('--los-step-m', type=float, default=1.)
    ap.add_argument('--horizon-step-m', type=float, default=2.5)
    ap.add_argument('--allow-missing-cache', action='store_true', help='diagnostic only; cannot pass')
    args = ap.parse_args(argv)
    for value in (args.los_step_m, args.horizon_step_m, args.height_m):
        if not math.isfinite(value) or value <= 0:
            ap.error('steps and tower height must be positive and finite')
    sites = json.loads((args.web_data/'sites.json').read_text(encoding='utf-8'))
    chosen = args.site or ['IM2', 'APOLLO17', 'APOLLO11']
    if set(chosen)-{s['id'] for s in sites}:
        ap.error('unknown site')
    report = dict(method='Independent PROJ geodesics + ECEF rays; no production code imports; no early stop',
        criterion='<=1 percentage point full-window fractions and <=1% mismatched sampled states; LOS and Fresnel60 classification agreement',
        limitation='Verification against the same DEMs, not physical ground truth; 30 epochs cannot establish a statistical 1% error bound.',
        sites=[])
    for site in [s for s in sites if s['id'] in chosen]:
        item = verify_site(site, args)
        report['sites'].append(item)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temp = args.output.with_suffix('.tmp')
        temp.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n', encoding='utf-8')
        temp.replace(args.output)
        print(json.dumps({k: item[k] for k in ['id', 'passed', 'full_window', 'sample_mismatches', 'elapsed_s']}), flush=True)
    return 0 if all(s['passed'] for s in report['sites']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
