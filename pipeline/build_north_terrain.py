"""Build native PGDA tiles covering entire northern latitude bands, resumably.

Raw COG blocks and candidates stay outside the published web directory by default.
No resampling, extrapolation, or validation-point-specific patches are used.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from task_f_tiles import encode, decode, dump, sha

ROOT = Path(__file__).resolve().parents[1]
R = 1737400.
T = 512
BASE = 'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp_NP/'
SOURCES = {20: 'LDEM_80N_20MPP_ADJ.TIF', 40: 'LDEM_80N_40MPP_ADJ.TIF',
           60: 'LDEM_60N_60MPP_ADJ.TIF', 240: 'LDEM_60N_240MPP_ADJ.TIF'}


def level_geometry(sx, sy, res, shape, edge, to_km):
    if not (0 < edge <= 90 and 0 < to_km <= 300 and res > 0):
        raise ValueError('Invalid northern latitude/range/resolution')
    far_lat = math.radians(edge) - to_km * 1000 / R
    radius = 2 * R * math.tan(math.pi/4 - far_lat/2) + 2 * res
    c0 = math.floor((-radius - sx) / res)
    r0 = math.floor((sy - radius) / res)
    nt = math.ceil((2 * radius / res + 2) / T)
    if min(r0, c0) < 0 or r0+nt*T >= shape[0] or c0+nt*T >= shape[1]:
        raise ValueError('Full geographic coverage exceeds native source footprint')
    return dict(x0_m=sx+c0*res, y0_m=sy-r0*res, res_m=res,
                source_row=r0, source_col=c0, tile_px=T, n=T+1, nt=nt,
                coverage_radius_m=radius, lat_edge_deg=edge, to_km=to_km)


def tile_keys(g):
    width = g['tile_px'] * g['res_m']
    for ty in range(g['nt']):
        for tx in range(g['nt']):
            left = g['x0_m'] + tx * width
            top = g['y0_m'] - ty * width
            dx = max(left, 0, -left-width)
            dy = max(top-width, 0, -top)
            if dx*dx + dy*dy <= g['coverage_radius_m']**2:
                yield f'{ty}_{tx}'


def valid_tile(path, record):
    return (path.is_file() and path.stat().st_size == record.get('bytes')
            and sha(path) == record.get('sha256'))


def build(out, cache, fine=20, mid_range=3, workers=4, mid_q=.5):
    import tifffile
    import fetch_polar as fp
    import polar_prefetch
    from task_u_fetch import validate_crs, PROJ
    polar_prefetch.install(workers)
    started = time.time()
    levels = []
    reports = []
    configs = [(fine, 85, 3, .25), (60, 75, mid_range, mid_q), (240, 75, 200, .5)]
    for res, edge, radius, q in configs:
        name = f'n{res}'
        url = BASE + SOURCES[res]
        progress = out / f'{name}_build_progress.json'
        with fp.RangeFile(url, cache) as stream, tifffile.TiffFile(stream) as tif:
            page = tif.pages[0]
            validate_crs(page.geotiff_tags)
            sx, sy, step = fp.grid(page)
            if step != res:
                raise ValueError('Unexpected native source resolution')
            g = level_geometry(sx, sy, res, page.shape, edge, radius)
            identity = dict(source_url=url, source_size=stream.size,
                            etag=stream.etag, modified=stream.modified,
                            geometry=g, q_m=q, builder_sha256=sha(Path(__file__)),
                            codec_sha256=sha(ROOT/'pipeline/task_f_tiles.py'))
            previous = json.loads(progress.read_text()) if progress.exists() else {}
            records = previous.get('records', {}) if previous.get('identity') == identity else {}
            keys = list(tile_keys(g))
            blocks = set()
            for key in keys:
                ty, tx = map(int, key.split('_'))
                rr, cc = g['source_row']+ty*T, g['source_col']+tx*T
                blocks.update(polar_prefetch.blocks_for(page, stream, (rr,rr+T+1,cc,cc+T+1)))
            missing = [b for b in sorted(blocks) if not (stream.cache/str(b)).is_file()
                       or (stream.cache/str(b)).stat().st_size != min(stream.block_size,stream.size-b)]
            print(name, 'prefetch', len(missing), 'missing MiB blocks of', len(blocks), flush=True)
            with concurrent.futures.ThreadPoolExecutor(workers) as pool:
                for i, count in enumerate(pool.map(lambda b: polar_prefetch._get_block(stream,b), missing)):
                    stream.bytes_fetched += count
                    if (i+1)%64 == 0:
                        print(name, 'prefetch', i+1, '/', len(missing), 'elapsed_s',round(time.time()-started),flush=True)
            for i, key in enumerate(keys):
                dest = out/name/(key+'.bin.gz')
                if key in records and valid_tile(dest, records[key]):
                    continue
                ty, tx = map(int, key.split('_'))
                rr, cc = g['source_row']+ty*T, g['source_col']+tx*T
                bounds = (rr, rr+T+1, cc, cc+T+1)
                a = fp.read_window(page, stream, bounds)
                blob = encode(a, q)
                if not np.array_equal(decode(blob, T+1, q), np.rint(a.astype(float)/q)*q):
                    raise ValueError('Codec round trip failed')
                dest.parent.mkdir(parents=True, exist_ok=True)
                temp = dest.with_suffix('.tmp'); temp.write_bytes(blob); temp.replace(dest)
                records[key] = dict(sha256=sha(dest), bytes=len(blob), bounds=bounds,
                                    source_window_sha256=hashlib.sha256(a.tobytes()).hexdigest())
                dump(progress, dict(identity=identity, records=records))
                if (i+1) % 10 == 0 or i+1 == len(keys):
                    print(name, i+1, '/', len(keys), 'bytes', sum(v['bytes'] for v in records.values()),
                          'elapsed_s', round(time.time()-started), flush=True)
            records = {k: records[k] for k in keys}
            level = {k:v for k,v in g.items() if not k.startswith('source_')}
            level.update(name=name, pole='north', source=f'PGDA native {res} m, full northern latitude band',
                         source_url=url, q_m=q, tiles=keys, bytes=sum(v['bytes'] for v in records.values()),
                         url=f'polar_n/{name}/'+'{ty}_{tx}.bin.gz')
            levels.append(level)
            reports.append(dict(identity=identity, records=records, network_bytes=stream.bytes_fetched))
    south = json.loads((ROOT/'web/data/hterrain/polar_s/index.json').read_text())
    index = {k:v for k,v in south.items() if k in ('version','frame','units','pixel_centres','encoding')}
    index.update(pole='north', lat_edge_deg=75, projection=PROJ, levels=levels, mock=False,
                 sources=[dict(name='NASA PGDA north-polar adjusted LOLA DEMs', url='https://pgda.gsfc.nasa.gov/products/98')])
    dump(out/'index.json', index)
    dump(out/'build_report.json', dict(elapsed_s=time.time()-started, levels=reports,
                                      total_bytes=sum(lv['bytes'] for lv in levels), index_sha256=sha(out/'index.json')))
    print('BUILD COMPLETE', sum(lv['bytes'] for lv in levels), 'bytes', flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out', type=Path, default=ROOT/'data/processed/north_terrain/candidate')
    p.add_argument('--cache', type=Path, default=ROOT/'data/processed/task_u/raw/_blocks')
    p.add_argument('--fine', type=int, choices=(20,40), default=20)
    p.add_argument('--mid-range', type=float, default=3)
    p.add_argument('--mid-q', type=float, choices=(.25,.5), default=.5)
    p.add_argument('--workers', type=int, default=4)
    a = p.parse_args(); build(a.out, a.cache, a.fine, a.mid_range, a.workers, a.mid_q)
