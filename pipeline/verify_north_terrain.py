"""Actual cold Chrome Worker vs immutable Task-U references and independent tiled CPU controls.

Only writes the requested ignored report (default data/processed/north_terrain/verification.json).
Candidate tiles overlay /data/hterrain/polar_n/ without changing the published web tree.
Run after the builder has completed:
  python pipeline/verify_north_terrain.py
Smoke run, resumable by the command above:
  python pipeline/verify_north_terrain.py --limit 1 --skip-edges --skip-south
"""
import os
for _key in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[_key] = '1'

import argparse
from collections import OrderedDict
import functools
import gzip
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import unquote, urlsplit

import numpy as np
from task_u_check import BrowserTiles, comparison, march, metrics, save

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'data/processed/north_terrain'
BASELINE = ROOT / 'docs/task_u_north_check.json'
R = 1737400.
BASE_COMMIT = '673e250'
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
EDGES = [
    dict(id='EDGE_75_0', lat=75., lon=0.),
    dict(id='EDGE_DATE_W', lat=75., lon=-180.),
    dict(id='EDGE_DATE_E', lat=75., lon=180.),
    dict(id='EDGE_BELOW_85', lat=84.999999, lon=0.),
    dict(id='EDGE_85', lat=85., lon=0.),
    dict(id='EDGE_POLE_0', lat=90., lon=0.),
    dict(id='EDGE_POLE_180', lat=90., lon=180.),
    dict(id='EDGE_NEAR_POLE', lat=89.999, lon=179.999),
]


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for part in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


class NorthBrowserTiles(BrowserTiles):
    """Independent native north projection, predictor decoder and bilinear sampler.

    Global geometry and the full-ray marcher come from the earlier independent
    checker, never the production JS or candidate builder. Decoded cache is bounded.
    """
    def __init__(self, point_lat, candidate, terrain_root=ROOT / 'web/data/hterrain'):
        self.root = Path(terrain_root)
        self.candidate = Path(candidate)
        self.index = read_json(self.root / 'index.json')
        self.polar = read_json(self.candidate / 'index.json')
        assert self.polar['pole'] == 'north'
        self.levels = [lv for lv in self.polar['levels']
                       if point_lat >= max(self.polar['lat_edge_deg'], lv.get('lat_edge_deg', self.polar['lat_edge_deg']))]
        self.cache = OrderedDict()
        self.present = {lv['name']: set(lv['tiles']) for lv in self.levels}

    def tile(self, path, n, q=None):
        if path in self.cache:
            self.cache.move_to_end(path)
            return self.cache[path]
        file = self.candidate / path[len('polar_n/'):] if path.startswith('polar_n/') else self.root / path
        raw = gzip.decompress(file.read_bytes())
        if q is None:
            assert len(raw) == n * n * 2
            array = np.frombuffer(raw, dtype='<i2').reshape(n, n).astype(np.int64).cumsum(axis=1)
        else:
            assert len(raw) == 4 + n * n * 2
            base = int.from_bytes(raw[:4], 'little', signed=True)
            residual = np.frombuffer(raw[4:], dtype='<i2').reshape(n, n).astype(np.int64)
            array = (residual.cumsum(axis=1).cumsum(axis=0) + base) * q
        self.cache[path] = array.astype(float)
        if len(self.cache) > 128:
            self.cache.popitem(last=False)
        return self.cache[path]

    def sampled(self, lv, lat, lon, polar=False, name=None):
        if not polar:
            return super().sampled(lv, lat, lon, polar=False, name=name)
        lat, lon = np.broadcast_arrays(np.asarray(lat, float), np.asarray(lon, float))
        shape = lat.shape
        lat, lon = lat.ravel(), lon.ravel()
        radius = 2 * R * np.tan((90 - lat) * np.pi / 360)
        x = radius * np.sin(lon * np.pi / 180)
        y = -radius * np.cos(lon * np.pi / 180)
        row, col = (lv['y0_m'] - y) / lv['res_m'], (x - lv['x0_m']) / lv['res_m']
        stride = lv['tile_px']
        size = lv['nt'] * stride
        valid = (row >= 0) & (row <= size) & (col >= 0) & (col <= size)
        r0 = np.minimum(np.floor(row).astype(int), size - 1)
        c0 = np.minimum(np.floor(col).astype(int), size - 1)
        ty, tx = r0 // stride, c0 // stride
        out = np.full(lat.size, np.nan)
        present = self.present.get(lv['name'], set(lv['tiles']))
        for yy, xx in set(zip(ty[valid].tolist(), tx[valid].tolist())):
            key = f'{yy}_{xx}'
            if key not in present:
                continue
            use = valid & (ty == yy) & (tx == xx)
            data = self.tile(lv['url'].replace('{ty}_{tx}', key), lv['n'], lv['q_m'])
            rr, cc = r0[use] - yy * stride, c0[use] - xx * stride
            fy, fx = row[use] - r0[use], col[use] - c0[use]
            out[use] = ((1 - fy) * (1 - fx) * data[rr, cc] + (1 - fy) * fx * data[rr, cc + 1]
                        + fy * (1 - fx) * data[rr + 1, cc] + fy * fx * data[rr + 1, cc + 1])
        return out.reshape(shape)


class TerrainServer:
    """Static overlay with exact response-body byte accounting, no HTTP content compression."""
    def __init__(self, candidate, web_root=ROOT / 'web', baseline_files=None):
        self.candidate, self.web_root = Path(candidate).resolve(), Path(web_root).resolve()
        self.baseline_files = baseline_files or {}
        self.events = []
        self.lock = threading.Lock()

    def __enter__(self):
        owner = self

        class Handler(SimpleHTTPRequestHandler):
            extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

            def log_message(self, *_args):
                pass

            def end_headers(self):
                self.send_header('Cache-Control', 'no-store')
                super().end_headers()

            def translate_path(self, path):
                clean = unquote(urlsplit(path).path)
                prefix = '/data/hterrain/polar_n/'
                if clean.startswith(prefix):
                    target = (owner.candidate / clean[len(prefix):]).resolve()
                    return str(target if target.is_relative_to(owner.candidate) else owner.candidate / '.denied')
                return super().translate_path(path)

            def do_GET(self):
                key = urlsplit(self.path).path
                if key in owner.baseline_files:
                    blob = owner.baseline_files[key]
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/javascript')
                    self.send_header('Content-Length', str(len(blob)))
                    self.end_headers()
                    owner.add_transfer(key, len(blob))
                    self.wfile.write(blob)
                else:
                    super().do_GET()

            def copyfile(self, source, output):
                # Record before writes so the client seeing EOF also sees the complete counter.
                while part := source.read(65536):
                    owner.add_transfer(urlsplit(self.path).path, len(part))
                    output.write(part)

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(self.web_root)))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        return self

    def add_transfer(self, path, size):
        with self.lock:
            self.events.append(dict(path=path, bytes=size, terrain=path.startswith('/data/hterrain/')))

    def transfers(self):
        with self.lock:
            return list(self.events)

    def __exit__(self, *_args):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()


def baseline_javascript():
    return {f'/baseline/js/{name}': subprocess.check_output(
        ['git', 'show', f'{BASE_COMMIT}:web/js/{name}'], cwd=ROOT)
        for name in ('core.js', 'hterrain.js', 'custom_horizon_worker.js')}


def input_manifest(candidate, baseline_files):
    """Hash actual encoded files, not only a builder's claimed hashes, before resuming."""
    files = [Path(__file__), ROOT / 'pipeline/task_u_check.py', BASELINE,
             ROOT / 'web/data/ephem.bin', ROOT / 'web/data/ephem.json', ROOT / 'web/data/sites.json',
             candidate / 'index.json', candidate / 'build_report.json',
             ROOT / 'web/data/hterrain/index.json', ROOT / 'web/data/hterrain/polar_s/index.json']
    files += [ROOT / 'web/js' / name for name in ('core.js', 'hterrain.js', 'custom_horizon_worker.js')]
    for lv in read_json(candidate / 'index.json')['levels']:
        files += [candidate / lv['url'].replace('polar_n/', '', 1).replace('{ty}_{tx}', key) for key in lv['tiles']]
    files += list((ROOT / 'web/data/hterrain/tiles').rglob('*.gz'))
    # Southern regression uses published southern tiles, independently of the candidate.
    files += list((ROOT / 'web/data/hterrain/polar_s').rglob('*.gz'))
    result = {}
    for path in sorted(set(files)):
        key = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
        result[key] = dict(bytes=path.stat().st_size, sha256=digest(path))
    result.update({f'git:{BASE_COMMIT}:{path}': dict(bytes=len(blob), sha256=hashlib.sha256(blob).hexdigest())
                   for path, blob in baseline_files.items()})
    return result


def cold_worker(browser, server, point, baseline=False, timeout_ms=180000):
    context = browser.new_context(service_workers='block')
    started = time.perf_counter()
    try:
        page = context.new_page()
        page.goto(server.url + '/data/ephem.json')
        prefix = '/baseline/js/' if baseline else '/js/'
        page.evaluate('''async prefix => {
          window.verifyCore = await import(prefix + 'core.js');
          verifyCore.state.ephem = new Float32Array(await (await fetch('/data/ephem.bin')).arrayBuffer());
          verifyCore.state.n = verifyCore.state.ephem.length / 6;
        }''', prefix)
        mark = len(server.transfers())
        result = page.evaluate('''async ({point, prefix, timeout}) => {
          const start = performance.now(), w = new Worker(prefix + 'custom_horizon_worker.js', {type:'module'});
          const h = await new Promise((resolve,reject) => {
            const timer = setTimeout(() => {w.terminate(); reject(new Error('Worker timeout'));}, timeout);
            w.onerror = e => {clearTimeout(timer); w.terminate(); reject(new Error(e.message));};
            w.onmessage = e => { if (e.data.type === 'done' || e.data.type === 'error') {
              clearTimeout(timer); w.terminate();
              e.data.type === 'done' ? resolve(e.data) : reject(new Error(e.data.message));
            }};
            w.postMessage({...point, base:location.origin + '/data/'});
          });
          verifyCore.state.horizons.set(point.id, {...h, az_step_deg:.5});
          return {worker:h, core_metrics:verifyCore.metrics(point), cold_worker_elapsed_ms:performance.now()-start};
        }''', dict(point=point, prefix=prefix, timeout=timeout_ms))
        totals = {}
        for transfer in server.transfers()[mark:]:
            totals[transfer['path']] = totals.get(transfer['path'], 0) + transfer['bytes']
        result.update(encoded_served_bytes=sum(totals.values()),
                      terrain_encoded_served_bytes=sum(size for path, size in totals.items() if path.startswith('/data/hterrain/')),
                      tile_encoded_served_bytes=sum(size for path, size in totals.items() if path.endswith('.gz')),
                      served_paths=totals, cold_context_elapsed_s=time.perf_counter() - started,
                      cache_policy='new browser context and new Worker per point; HTTP Cache-Control: no-store; encoded response body bytes, excluding headers')
        return result
    finally:
        context.close()


def band_summary(rows, period):
    result = {}
    for band in ('75-80N', '80-85N', '85-90N'):
        selected = [r['metrics'][period]['difference'] for r in rows if r.get('band') == band and 'metrics' in r]
        if not selected:
            continue
        rms = np.array([r['rms_deg'] for r in selected])
        sun = np.abs([r['sun_diff_pp'] for r in selected])
        result[band] = dict(n=len(selected), rms_deg_median=float(np.median(rms)), rms_deg_max=float(max(rms)),
                            abs_sun_pp_median=float(np.median(sun)), abs_sun_pp_max=float(max(sun)),
                            meets_target=bool(np.median(rms) <= .2 and max(sun) <= 2))
    return result


def accuracy_target_pass(rows):
    if len(rows) != 30 or any('error' in row or any(
            not row.get('metrics', {}).get(period, {}).get('difference') for period in ('1h', '2h')) for row in rows):
        return False
    return all(len(band_summary(rows, period)) == 3 and all(
        band['n'] == 10 and band['meets_target'] for band in band_summary(rows, period).values())
        for period in ('1h', '2h'))


def reference_comparison(point, baseline, actual, ephemeris, candidate, control):
    worker = actual['worker']
    result = dict(**point, **actual, reference_signature=baseline['signature'], metrics={})
    for stride in (1, 2):
        ep = ephemeris[::stride]
        values = {name: metrics(point['lat'], point['lon'], horizon, ep, sunlit_time=True)
                  for name, horizon in [('reference', baseline['reference']), ('before', baseline['browser']), ('browser', worker)]}
        values['difference'] = comparison(worker, baseline['reference'], values['browser'], values['reference'])
        values['before_difference'] = comparison(baseline['browser'], baseline['reference'], values['before'], values['reference'])
        result['metrics'][f'{stride}h'] = values
    own = result['metrics']['1h']['browser']
    result['core_loop_diff_pp'] = {key: 100 * (actual['core_metrics'][key + '_frac'] - own[key]) for key in ('sun', 'earth', 'both')}
    result['adapter_pass'] = bool(worker.get('pole') == 'north' and worker.get('polar') is True
                                  and worker['params'] == dict(minKm=.005, maxKm=300, nSteps=8000)
                                  and len(worker['mask']) == 720 and np.isfinite(worker['mask']).all()
                                  and max(abs(v) for v in result['core_loop_diff_pp'].values()) < 1e-9)
    if control:
        started = time.perf_counter()
        reader = NorthBrowserTiles(point['lat'], candidate)
        full = march(point['lat'], point['lon'], reader.chain(), np.geomspace(5, 300000, 8001), 720)
        same_metrics = metrics(point['lat'], point['lon'], full, ephemeris, sunlit_time=True)
        check = comparison(worker, full, own, same_metrics)
        check.update(h0_difference_m=worker['h0_m'] - full['h0_m'],
                     rounded_mask_exact=bool(np.array_equal(np.round(full['mask'], 4), worker['mask'])),
                     elapsed_s=time.perf_counter() - started,
                     method='Independent north native tile decoder/interpolation + full 720 x 8001 CPU rays, no early stopping')
        check['passed'] = bool(check['max_abs_deg'] <= .000051 and abs(check['h0_difference_m']) < 1e-6)
        result['same_tile_control'] = check
        result['adapter_pass'] &= check['passed']
    return result


def edge_checks(rows):
    by_id = {r['id']: r for r in rows if 'worker' in r}
    result = {}
    for name, first, second, shift in [('date_line', 'EDGE_DATE_W', 'EDGE_DATE_E', 0),
                                      ('pole_rotation_180_deg', 'EDGE_POLE_0', 'EDGE_POLE_180', 360)]:
        if first in by_id and second in by_id:
            a, b = by_id[first]['worker'], by_id[second]['worker']
            delta = np.asarray(a['mask']) - np.roll(b['mask'], shift)
            error = float(np.max(np.abs(delta)))
            result[name] = dict(max_abs_deg=error, passed=error <= .00011,
                                h0_difference_m=a['h0_m'] - b['h0_m'])
    return result


def run(args):
    from playwright.sync_api import sync_playwright
    candidate = args.candidate.absolute()
    baseline = read_json(BASELINE)
    assert baseline['complete'] and len(baseline['rows']) == 30
    built = read_json(candidate / 'build_report.json')
    assert built['index_sha256'] == digest(candidate / 'index.json'), 'Candidate index differs from completed builder report'
    old_js = baseline_javascript()
    print('Hashing inputs before resume...', flush=True)
    manifest = input_manifest(candidate, old_js)
    ephemeris = np.fromfile(ROOT / 'web/data/ephem.bin', dtype='<f4').reshape(-1, 6)
    points = [{key: row[key] for key in ('id', 'lat', 'lon', 'band')} for row in baseline['rows']]
    reference_by_id = {row['id']: row for row in baseline['rows']}
    control_ids = {points[i]['id'] for i in (0, 10, 20)}
    sites = read_json(ROOT / 'web/data/sites.json')
    south = [{key: s[key] for key in ('id', 'lat', 'lon')} for s in sites
             if s['id'] in ('SHACKLETON_RIM', 'ARTEMIS_HAWORTH', 'ARTEMIS_MALAPERT')]
    prior = read_json(args.out) if args.out.exists() else {}
    report = dict(complete=False, candidate=str(candidate), baseline=str(BASELINE), input_main=BASE_COMMIT,
                  definitions=dict(observer_m=2, radius_m=R, azimuths=720, min_distance_m=5, max_distance_m=300000,
                                   distances=8001, sun='visible solar disk fraction >= 0.5', earth='center above terrain',
                                   window='2026-2030', periods_h=[1, 2]),
                  files=manifest, reference_source_hashes=baseline.get('files', {}),
                  rows=[], edges=[], south_regressions=[])
    started = time.perf_counter()
    with TerrainServer(candidate, baseline_files=old_js) as server, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=str(args.chrome), headless=True)
        report['chrome_version'] = browser.version
        signature = hashlib.sha256(json.dumps(dict(files=manifest, chrome=browser.version), sort_keys=True).encode()).hexdigest()
        report['signature'] = signature
        if prior.get('signature') == signature:
            for section in ('rows', 'edges', 'south_regressions'):
                report[section] = prior.get(section, [])

        def checkpoint():
            report['bands'] = {period: band_summary(report['rows'], period) for period in ('1h', '2h')}
            report['edge_checks'] = edge_checks(report['edges'])
            report['elapsed_s_this_run'] = time.perf_counter() - started
            save(args.out, report)

        def collect(section, point, operation):
            existing = next((r for r in report[section] if r['id'] == point['id']), None)
            if existing and 'error' not in existing:
                print('Resume', section, point['id'], flush=True)
                return
            try:
                result = operation()
            except Exception as exc:
                result = dict(**point, error=f'{type(exc).__name__}: {exc}', adapter_pass=False)
            report[section] = [r for r in report[section] if r['id'] != point['id']] + [result]
            checkpoint()
            print(section, point['id'], result.get('error') or result.get('metrics', {}).get('1h', {}).get('difference', result.get('passed', result.get('adapter_pass'))), flush=True)

        for point in points[:args.limit]:
            def run_north(point=point):
                control = point['id'] in control_ids
                # Matched cost comparison: same Chrome/server/point/ephemeris, fresh context and Worker each time.
                before = cold_worker(browser, server, point, baseline=True, timeout_ms=args.timeout_ms) if control else None
                actual = cold_worker(browser, server, point, timeout_ms=args.timeout_ms)
                result = reference_comparison(point, reference_by_id[point['id']], actual, ephemeris, candidate, control)
                if before is not None:
                    result['cold_before'] = before
                    result['cold_performance_comparison'] = {
                        'before_js_commit': BASE_COMMIT,
                        'before_path': 'global north terrain',
                        'after_path': 'candidate north polar terrain',
                        'matched': 'Same point, Chrome build, HTTP server, current global tiles and ephemeris; fresh contexts/Workers; no HTTP caching',
                        'before_worker_ms': before['worker']['ms'],
                        'after_worker_ms': actual['worker']['ms'],
                        'before_cold_worker_elapsed_ms': before['cold_worker_elapsed_ms'],
                        'after_cold_worker_elapsed_ms': actual['cold_worker_elapsed_ms'],
                        'before_encoded_served_bytes': before['encoded_served_bytes'],
                        'after_encoded_served_bytes': actual['encoded_served_bytes'],
                        'before_terrain_encoded_served_bytes': before['terrain_encoded_served_bytes'],
                        'after_terrain_encoded_served_bytes': actual['terrain_encoded_served_bytes'],
                        'before_tile_encoded_served_bytes': before['tile_encoded_served_bytes'],
                        'after_tile_encoded_served_bytes': actual['tile_encoded_served_bytes'],
                    }
                return result
            collect('rows', point, run_north)
        if not args.skip_edges:
            for point in EDGES:
                def run_edge(point=point):
                    result = dict(**point, **cold_worker(browser, server, point, timeout_ms=args.timeout_ms))
                    h = result['worker']
                    result['adapter_pass'] = bool(h.get('pole') == 'north' and h.get('polar') is True
                                                  and len(h['mask']) == 720 and np.isfinite(h['mask']).all()
                                                  and h['params'] == dict(minKm=.005, maxKm=300, nSteps=8000))
                    return result
                collect('edges', point, run_edge)
        if not args.skip_south:
            for point in south:
                def run_south(point=point):
                    before = cold_worker(browser, server, point, baseline=True, timeout_ms=args.timeout_ms)
                    after = cold_worker(browser, server, point, timeout_ms=args.timeout_ms)
                    a, b = before['worker'], after['worker']
                    equal = (a['mask'] == b['mask'] and a['h0_m'] == b['h0_m'] and a['dem_sources'] == b['dem_sources']
                             and a['params'] == b['params'] and before['core_metrics'] == after['core_metrics'])
                    return dict(**point, before=before, after=after, passed=equal,
                                max_abs_deg=float(np.max(np.abs(np.asarray(a['mask']) - b['mask']))))
                collect('south_regressions', point, run_south)
        browser.close()
    report['complete'] = (len(report['rows']) == 30 and all('error' not in r for r in report['rows'])
                          and len(report['edges']) == len(EDGES) and all('error' not in r for r in report['edges'])
                          and len(report['south_regressions']) == 3 and all('error' not in r for r in report['south_regressions']))
    report['adapter_pass'] = bool(report['complete'] and all(r['adapter_pass'] for r in report['rows'] + report['edges'])
                                  and all(r['passed'] for r in report['south_regressions'])
                                  and all(r['passed'] for r in edge_checks(report['edges']).values()))
    report['accuracy_target_pass'] = accuracy_target_pass(report['rows'])
    checkpoint()
    print('Saved', args.out, 'complete=', report['complete'], 'adapter_pass=', report['adapter_pass'],
          'accuracy_target_pass=', report['accuracy_target_pass'], flush=True)
    return 0 if report['complete'] and report['adapter_pass'] else 1


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidate', type=Path, default=WORK / 'candidate')
    p.add_argument('--out', type=Path, default=WORK / 'verification.json')
    p.add_argument('--chrome', type=Path, default=CHROME)
    p.add_argument('--limit', type=int, default=30)
    p.add_argument('--skip-edges', action='store_true')
    p.add_argument('--skip-south', action='store_true')
    p.add_argument('--timeout-ms', type=int, default=180000)
    return p


if __name__ == '__main__':
    raise SystemExit(run(parser().parse_args()))
