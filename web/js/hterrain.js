// hterrain.js — horizon mask for a user-defined point, computed from the browser height tiles in web/data/hterrain/
// (written by pipeline/build_custom_terrain.py and the south/north polar terrain builders).
// Pure maths, no DOM: used by custom_horizon_worker.js and by the Node check pipeline/check_custom_horizon.mjs.
//
// Same definitions as pipeline/horizon.py (contract section 3 / 9):
//   720 azimuths (0.5°, 0 = north, clockwise), geometric distance grid, exact sphere R = 1737.4 km (lunar curvature
//   included), observer 2 m above the terrain at the site, elevation = atan2(r_t cos θ − r_o, r_t sin θ),
//   per-azimuth early stop once a +10.8 km peak could no longer win. DEM chain, finest first: for a sample at
//   distance s the first source whose "to_km" ≥ s and that has data wins (NaN falls through), as horizon.sample_chain.
// Global path: "near" grid (LDEM_64 → 32 px/deg, ~948 m) to 150 km, "far" grid (LDEM_16, ~1895 m) to 300 km,
//   distances 0.2 → 300 km in 4000 steps.
// Polar path (inside the hemisphere's lat_edge_deg): PGDA polar-stereographic levels (e.g. 60 m, 240 m) first,
//   then the global grids; distances 0.005 → 300 km in 8000 steps (the card-8 settings).

export const R_M = 1737400;
export const OBS_HEIGHT_M = 2;
export const HMAX_M = 10800;
export const N_AZ = 720;
export const AZ_STEP_DEG = 0.5;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

/** Decode one global tile: gzip(int16 LE row-delta) → Float32Array(n*n). `raw` = ArrayBuffer already gunzipped. */
export function decodeTile(raw, n) {
  const dv = new DataView(raw), out = new Float32Array(n * n);
  if (raw.byteLength !== n * n * 2) throw new Error(`tile has ${raw.byteLength} bytes, expected ${n * n * 2}`);
  for (let r = 0; r < n; r++) {
    let acc = 0;
    for (let c = 0; c < n; c++) { acc += dv.getInt16((r * n + c) * 2, true); out[r * n + c] = acc; }
  }
  return out;
}

/** Decode one polar tile: int32 base + n*n int16 planar residuals (units q_m) → Float64Array(n*n) metres. */
export function decodePolarTile(raw, n, q) {
  if (raw.byteLength !== 4 + n * n * 2) throw new Error(`polar tile has ${raw.byteLength} bytes, expected ${4 + n * n * 2}`);
  const dv = new DataView(raw), base = dv.getInt32(0, true);
  const a = new Int32Array(n * n);                // quantised heights relative to base (exact integers)
  for (let r = 0; r < n; r++) {
    let rowAcc = 0;                               // running sum along the row of the column-cumulated residuals
    for (let c = 0; c < n; c++) {
      const k = r * n + c, res = dv.getInt16(4 + k * 2, true);
      rowAcc += res;
      a[k] = rowAcc + (r > 0 ? a[k - n] : 0);     // cumsum over rows of the row-cumsums == 2-D prefix sum
    }
  }
  const out = new Float64Array(n * n);
  for (let k = 0; k < n * n; k++) out[k] = (a[k] + base) * q;
  return out;
}

/** Tile key and in-tile bilinear position for (lat, lon) on a global grid {ppd, tile_deg, n}. */
export function locate(grid, lat, lon) {
  const P = grid.ppd, H = 180 * P, W = 360 * P, tp = grid.n - 1;
  let r = (90 - lat) * P - 0.5;
  r = Math.min(Math.max(r, 0), H - 1);
  const r0 = Math.min(Math.floor(r), H - 2), fr = r - r0;
  const c = (lon + 180) * P - 0.5, c0f = Math.floor(c), fc = c - c0f;
  const c0 = ((c0f % W) + W) % W;
  const ty = Math.floor(r0 / tp), tx = Math.floor(c0 / tp);
  return { ty, tx, lr: r0 - ty * tp, lc: c0 - tx * tp, fr, fc };
}

/** Bilinear height (m) from a decoded global tile, or NaN if the tile is not loaded. */
export function sampleGrid(grid, tiles, lat, lon, need) {
  const p = locate(grid, lat, lon), key = p.ty + '_' + p.tx;
  const t = tiles.get(key);
  if (!t) { if (need) need.add(key); return NaN; }
  const n = grid.n, k = p.lr * n + p.lc;
  return (1 - p.fr) * ((1 - p.fc) * t[k] + p.fc * t[k + 1]) + p.fr * ((1 - p.fc) * t[k + n] + p.fc * t[k + n + 1]);
}

/** Polar stereographic (k0 = 1, R = 1737.4 km). Omitted pole preserves the legacy southern projection. */
export function polarXY(lat, lon, pole = 'south') {
  const sign = pole === 'north' ? -1 : 1;
  const rho = 2 * R_M * Math.tan(Math.PI / 4 + sign * lat * D2R / 2);
  return [rho * Math.sin(lon * D2R), sign * rho * Math.cos(lon * D2R)];
}

/** Locate (lat, lon) on a polar level; null when outside the level's tiles (= no data there, falls through). */
export function locatePolar(level, lat, lon) {
  const [x, y] = polarXY(lat, lon, level.pole), d = level.res_m, T = level.tile_px, N = level.nt * T;
  const c = (x - level.x0_m) / d, r = (level.y0_m - y) / d;
  if (!(r >= 0 && c >= 0 && r <= N && c <= N)) return null;
  const r0 = Math.min(Math.floor(r), N - 1), c0 = Math.min(Math.floor(c), N - 1);
  const ty = Math.floor(r0 / T), tx = Math.floor(c0 / T), key = ty + '_' + tx;
  if (!level._present) level._present = new Set(level.tiles);
  if (!level._present.has(key)) return null;
  return { key, lr: r0 - ty * T, lc: c0 - tx * T, fr: r - r0, fc: c - c0 };
}

export function samplePolar(level, tiles, lat, lon, need) {
  const p = locatePolar(level, lat, lon);
  if (!p) return NaN;
  const t = tiles.get(p.key);
  if (!t) { if (need) need.add(p.key); return NaN; }
  const n = level.n, k = p.lr * n + p.lc;
  return (1 - p.fr) * ((1 - p.fc) * t[k] + p.fc * t[k + 1]) + p.fr * ((1 - p.fc) * t[k + n] + p.fc * t[k + n + 1]);
}

/** Distance grid identical to numpy.geomspace(minKm, maxKm, nSteps + 1) (km). */
export function distancesKm(minKm = 0.2, maxKm = 300, nSteps = 4000) {
  const out = new Float64Array(nSteps + 1), a = Math.log(minKm), b = Math.log(maxKm);
  for (let k = 0; k <= nSteps; k++) out[k] = Math.exp(a + (b - a) * k / nSteps);
  out[0] = minKm; out[nSteps] = maxKm;
  return out;
}

/** Polar levels that apply to a point (finest first), or [] for the global path. */
export function polarLevels(index, lat) {
  const pole = lat >= 0 ? 'north' : 'south', P = pole === 'north' ? index.polarNorth : index.polar;
  const covers = edge => pole === 'north' ? lat >= edge : lat <= edge;
  if (!P || P.pole !== pole || !covers(P.lat_edge_deg)) return [];
  return P.levels.filter(lv => (lv.pole ?? 'south') === pole && covers(lv.lat_edge_deg ?? P.lat_edge_deg));
}

/** March settings for a point: card-8 settings on the polar path, the phase-2 defaults elsewhere. */
export function marchParams(index, lat) {
  return polarLevels(index, lat).length ? { minKm: 0.005, maxKm: 300, nSteps: 8000 } : { minKm: 0.2, maxKm: 300, nSteps: 4000 };
}

function emptyNeed(index) {
  const need = { near: new Set(), far: new Set(), polar: {} };
  for (const lv of [...(index.polar?.levels || []), ...(index.polarNorth?.levels || [])]) need.polar[lv.name] = new Set();
  return need;
}
export const needCount = need => need.near.size + need.far.size + Object.values(need.polar || {}).reduce((s, v) => s + v.size, 0);

/** Tiles touched by a coarse pre-scan (so most points need a single fetch round). Returns a need-like object. */
export function tilesFor(index, lat, lon) {
  const want = emptyNeed(index), levels = polarLevels(index, lat);
  const { up, east, north } = frame(lat, lon);
  const visit = (la, lo, s) => {
    for (const lv of levels) if (s <= lv.to_km) { const p = locatePolar(lv, la, lo); if (p) { want.polar[lv.name].add(p.key); return; } }
    const g = s <= index.grids.near.to_km ? 'near' : 'far';
    const p = locate(index.grids[g], la, lo); want[g].add(p.ty + '_' + p.tx);
  };
  visit(lat, lon, 0);
  for (let a = 0; a < 360; a += 2) {
    const dir = dirVec(up, east, north, a);
    for (let s = 1; s <= 300; s += 2) {
      const [la, lo] = dest(up, dir, s / (R_M / 1000));
      visit(la, lo, s);
    }
  }
  return want;
}

function frame(lat, lon) {
  const la = lat * D2R, lo = lon * D2R;
  const up = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const east = [-Math.sin(lo), Math.cos(lo), 0];
  const north = [up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]];
  return { up, east, north };
}
const dirVec = (up, east, north, azDeg) => {
  const ca = Math.cos(azDeg * D2R), sa = Math.sin(azDeg * D2R);
  return [north[0] * ca + east[0] * sa, north[1] * ca + east[1] * sa, north[2] * ca + east[2] * sa];
};
function dest(up, dir, th) {
  const ct = Math.cos(th), st = Math.sin(th);
  const x = up[0] * ct + dir[0] * st, y = up[1] * ct + dir[1] * st, z = up[2] * ct + dir[2] * st;
  return [Math.asin(Math.max(-1, Math.min(1, z))) * R2D, Math.atan2(y, x) * R2D];
}

/**
 * Horizon mask at (lat, lon). `tiles` = {near: Map(key → Float32Array), far: Map, polar: {levelName: Map}}.
 * Returns {mask: Float64Array(720) degrees, h0_m, need, dem_sources, params, polar} — if needCount(need) > 0 some
 * samples hit tiles that were not loaded: fetch them and call again (only valid when nothing is needed).
 */
export function computeHorizon(index, tiles, lat, lon, opts = {}) {
  const levels = polarLevels(index, lat);
  const { minKm, maxKm, nSteps } = { ...marchParams(index, lat), ...opts };
  const block = opts.block || 128;
  const near = index.grids.near, far = index.grids.far, nearTo = near.to_km;
  const need = emptyNeed(index);
  const used = new Float64Array(levels.length + 2);              // furthest distance each source supplied
  const ptiles = tiles.polar || {};
  // first source (finest first) with data at distance s; returns [height, source index]
  const sample = (la, lo, s) => {
    for (let i = 0; i < levels.length; i++) {
      const lv = levels[i];
      if (s > lv.to_km) continue;
      const h = samplePolar(lv, ptiles[lv.name] || new Map(), la, lo, need.polar[lv.name]);
      if (isFinite(h)) return [h, i];
      if (locatePolar(lv, la, lo)) return [NaN, -1];            // tile not loaded yet: wait, never fall through
    }
    if (s <= nearTo) return [sampleGrid(near, tiles.near, la, lo, need.near), levels.length];
    return [sampleGrid(far, tiles.far, la, lo, need.far), levels.length + 1];
  };
  const [h0, h0src] = sample(lat, lon, 0);
  if (!isFinite(h0)) return { mask: null, h0_m: NaN, need, polar: false, pole: null };
  const ro = R_M + h0 + OBS_HEIGHT_M, rTop = R_M + HMAX_M;
  const s = distancesKm(minKm, maxKm, nSteps), ns = s.length, Rk = R_M / 1000;
  const th = new Float64Array(ns), ct = new Float64Array(ns), st = new Float64Array(ns);
  for (let k = 0; k < ns; k++) { th[k] = s[k] / Rk; ct[k] = Math.cos(th[k]); st[k] = Math.sin(th[k]); }
  const { up, east, north } = frame(lat, lon);
  const mask = new Float64Array(N_AZ);
  for (let j = 0; j < N_AZ; j++) {
    const d = dirVec(up, east, north, j * AZ_STEP_DEG);
    let best = -Infinity;
    for (let i0 = 0; i0 < ns; i0 += block) {
      const i1 = Math.min(ns, i0 + block);
      for (let k = i0; k < i1; k++) {
        const x = up[0] * ct[k] + d[0] * st[k], y = up[1] * ct[k] + d[1] * st[k], z = up[2] * ct[k] + d[2] * st[k];
        const la = Math.asin(Math.max(-1, Math.min(1, z))) * R2D, lo = Math.atan2(y, x) * R2D;
        const [h, src] = sample(la, lo, s[k]);
        if (!isFinite(h)) continue;
        if (s[k] > used[src]) used[src] = s[k];
        const rt = R_M + h, el = Math.atan2(rt * ct[k] - ro, rt * st[k]);
        if (el > best) best = el;
      }
      if (i1 < ns) {                                              // early stop (bound only decreases with distance)
        const bound = Math.atan2(rTop * ct[i1] - ro, rTop * st[i1]);
        if (best > bound) break;
      }
    }
    mask[j] = best * R2D;
  }
  const r2 = v => Math.round(v * 100) / 100;
  const dem_sources = [];
  levels.forEach((lv, i) => { if (used[i]) dem_sources.push({ name: `PGDA ${lv.res_m} m (browser, ${lv.q_m} m steps)`, res_m: lv.res_m, to_km: r2(used[i]) }); });
  if (used[levels.length]) dem_sources.push({ name: 'LDEM_64 (32 px/deg, browser)', res_m: near.res_m, to_km: r2(used[levels.length]) });
  if (used[levels.length + 1]) dem_sources.push({ name: 'LDEM_16 (browser)', res_m: far.res_m, to_km: r2(used[levels.length + 1]) });
  const polar = h0src < levels.length || used.slice(0, levels.length).some(v => v > 0);
  return { mask, h0_m: h0, need, dem_sources, params: { minKm, maxKm, nSteps }, polar,
    pole: polar ? (lat >= 0 ? 'north' : 'south') : null };
}
