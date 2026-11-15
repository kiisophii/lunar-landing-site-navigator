// custom_horizon_worker.js — module Web Worker: horizon mask of a user-defined point from web/data/hterrain/.
// Message in:  {id, lat, lon, base}        (base = URL of the data folder, e.g. 'https://…/data/')
// Messages out: {id, type:'progress', text} … then {id, type:'done', mask:[720], h0_m, dem_sources, tiles, ms, polar}
//               or {id, type:'error', message}
// Optional polar_s / polar_n indices select PGDA levels within each hemisphere's latitude edge.
import { computeHorizon, decodeTile, decodePolarTile, tilesFor, needCount } from './hterrain.js';

let index = null, indexBase = null;
const cache = { near: new Map(), far: new Map(), polar: {} };   // decoded tiles stay in memory for later points

async function gunzip(buf) {
  const u8 = new Uint8Array(buf);
  if (u8[0] !== 0x1f || u8[1] !== 0x8b) return buf;  // server already removed the gzip layer
  const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
  return ds.arrayBuffer();
}

const get = url => fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.arrayBuffer(); }).then(gunzip);

async function fetchTiles(base, want) {
  const jobs = [];
  for (const g of ['near', 'far']) for (const key of want[g]) {
    if (cache[g].has(key)) continue;
    const url = base + 'hterrain/' + index.url.replace('{grid}', g).replace('{ty}_{tx}', key);
    jobs.push(get(url).then(raw => cache[g].set(key, decodeTile(raw, index.grids[g].n))));
  }
  for (const lv of [...(index.polar?.levels || []), ...(index.polarNorth?.levels || [])]) {
    const m = cache.polar[lv.name] || (cache.polar[lv.name] = new Map());
    for (const key of (want.polar && want.polar[lv.name]) || []) {
      if (m.has(key)) continue;
      const url = base + 'hterrain/' + lv.url.replace('{ty}_{tx}', key);
      jobs.push(get(url).then(raw => m.set(key, decodePolarTile(raw, lv.n, lv.q_m))));
    }
  }
  // A failed tile must not release the job queue while siblings can still write into the shared cache.
  const settled = await Promise.allSettled(jobs);
  const failed = settled.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  return jobs.length;
}

async function runJob(ev) {
  const { id, lat, lon, base } = ev.data;
  try {
    const t0 = performance.now();
    if (!index || indexBase !== base) {
      const r = await fetch(base + 'hterrain/index.json');
      if (!r.ok) throw new Error('hterrain/index.json: HTTP ' + r.status);
      index = await r.json(); indexBase = base;
      cache.near.clear(); cache.far.clear(); cache.polar = {};
      // A missing optional index falls back to global terrain; a missing advertised tile remains an error.
      const optionalIndex = path => fetch(base + 'hterrain/' + path + '/index.json')
        .then(p => p.ok ? p.json() : null).catch(() => null);
      [index.polar, index.polarNorth] = await Promise.all([optionalIndex('polar_s'), optionalIndex('polar_n')]);
    }
    let fetched = await fetchTiles(base, tilesFor(index, lat, lon));
    self.postMessage({ id, type: 'progress', text: 'march' });
    let res;
    for (let round = 0; round < 6; round++) {
      res = computeHorizon(index, cache, lat, lon);
      if (!needCount(res.need)) break;
      fetched += await fetchTiles(base, res.need);
    }
    if (needCount(res.need) || !res.mask) throw new Error('terrain tiles missing');
    self.postMessage({ id, type: 'done', mask: Array.from(res.mask, v => Math.round(v * 1e4) / 1e4), h0_m: res.h0_m,
      dem_sources: res.dem_sources, grids: { near: index.grids.near.res_m, far: index.grids.far.res_m },
      polar: res.polar, pole: res.pole, params: res.params, tiles: fetched, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    self.postMessage({ id, type: 'error', message: String(e && e.message || e) });
  }
}

// Fetch yields to other messages; serialize jobs so a base/hemisphere switch cannot replace an in-flight cache.
let queue = Promise.resolve();
self.onmessage = ev => (queue = queue.then(() => runJob(ev)));
