// diff_data.js — data access for the two differentiators (relay towers, Korea links). No UI.
// Imported by relay_panel.js, korea_panel.js and story_arc.js (not listed in modules.json).
// Formats: docs/data_contract.md section 12 (web/data/relay/) and section 13 (web/data/korea/).
// Every number here is computed for an explicit hour range [i0, i1] (inclusive, UTC hour index).
import * as core from './core.js';
import { stationBits, koreaInfo } from './korea.js';

const cache = new Map();
function getJSON(url) {
  if (!cache.has(url)) cache.set(url, fetch(url, { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json();
  }));
  return cache.get(url);
}

// ------------------------------------------------------------------ relay towers (section 12)
/** {ids, pending_terrain: {id: reason}, run_params}; an empty index if the file is missing. */
export async function relayIndex() {
  try { return await getJSON('data/relay/index.json'); }
  catch (e) { return { ids: [], pending_terrain: {}, run_params: null, missing: true }; }
}

/**
 * Why a site has no relay result: 'pending' = a south-polar catalogue site whose real terrain is still being prepared;
 * 'na' = relay analysis not available for this site (so far run_relay.py covers only the south-polar sites, so
 * non-polar catalogue sites — listed in index.pending_terrain because their SLDEM cache is missing — and custom points
 * get this). Never called "terrain pending" for non-polar sites: their horizon IS computed, only the relay run is missing.
 */
export function relayMissingKind(site, idx) {
  const polar = site.lat <= -80 && !site.user && site.group !== 'custom';
  return polar && idx && idx.pending_terrain && idx.pending_terrain[site.id] ? 'pending' : 'na';
}

/** Relay result for one site, or null when it is pending terrain / not computed. */
export async function relayFor(id) {
  const idx = await relayIndex();
  if (!idx.ids.includes(id)) return null;
  return getJSON(`data/relay/${id}.json`);
}

/** Hours of each timeline code (0 none, 1 direct, 2 via tower) inside [i0, i1]. */
export function segmentHours(segments, i0, i1) {
  const out = [0, 0, 0];
  const a = Math.floor(i0), b = Math.floor(i1) + 1;          // [a, b) in whole hours
  for (const [s, len, code] of segments) {
    const lo = Math.max(s, a), hi = Math.min(s + len, b);
    if (hi > lo) out[code] += hi - lo;
  }
  return { none: out[0], direct: out[1], via: out[2], total: out[0] + out[1] + out[2] };
}

/** Longest run of code 0 (no link) inside [i0, i1], hours. */
export function longestNone(segments, i0, i1) {
  const a = Math.floor(i0), b = Math.floor(i1) + 1;
  let best = 0, run = 0, last = null;
  for (const [s, len, code] of segments) {
    const lo = Math.max(s, a), hi = Math.min(s + len, b);
    if (hi <= lo) continue;
    if (code === 0) { run = (last === 0 ? run : 0) + (hi - lo); best = Math.max(best, run); }
    last = code;
  }
  return best;
}

// ------------------------------------------------------------------ Korea links (section 13)
export const STATION_IDS = ['KDSA', 'DSN_GOLDSTONE', 'DSN_MADRID', 'DSN_CANBERRA'];

let bitsP = null;
const bitsOnce = () => (bitsP ||= stationBits());

export async function stationsMeta() { return getJSON('data/korea/stations.json'); }

/** Hours in [i0, i1] with the Moon ≥ 10° above each station, plus any-DSN and KDSA-only hours. */
export async function stationHours(i0, i1) {
  const bits = await bitsOnce();
  const a = Math.max(0, Math.floor(i0)), b = Math.floor(i1);
  const out = Object.fromEntries(STATION_IDS.map(k => [k, 0]));
  let anyDsn = 0, kdsaOnly = 0, n = 0;
  for (let k = a; k <= b; k++) {
    n++;
    for (const id of STATION_IDS) out[id] += bits[id] ? bits[id][k] : 0;
    const dsn = bits.DSN_GOLDSTONE[k] | bits.DSN_MADRID[k] | bits.DSN_CANBERRA[k];
    anyDsn += dsn;
    if (bits.KDSA[k] && !dsn) kdsaOnly++;
  }
  return { hours: n, byStation: out, anyDsn, kdsaOnly };
}

/** KDSA rise/set windows (UTC ISO strings) overlapping [i0, i1], clipped to the period. */
export async function kdsaWindows(i0, i1, t0ms) {
  const w = await getJSON('data/korea/windows_kdsa.json');
  const a = t0ms + i0 * 3600e3, b = t0ms + (Math.floor(i1) + 1) * 3600e3;
  const out = [];
  for (const [r, s, maxEl] of w.windows) {
    const rs = Date.parse(r), ss = Date.parse(s);
    if (ss <= a || rs >= b) continue;
    out.push({ rise: Math.max(rs, a), set: Math.min(ss, b), clippedStart: rs < a, clippedEnd: ss > b, maxEl });
  }
  return out;
}

/**
 * Direct-to-Earth link from a lunar site to the ground stations, counted per hour in [i0, i1]:
 * Earth CENTRE above the site's terrain horizon (core.earthVisible) AND the Moon >= 10 deg above the station.
 * Returns {pending: true} while the site has no real terrain horizon (no flat-horizon result is shown).
 */
export async function siteStationLink(site, i0, i1) {
  if (core.terrainPending(site) || core.horizonMock(site)) return { pending: true };
  const bits = await bitsOnce();
  const a = Math.max(0, Math.floor(i0)), b = Math.floor(i1);
  let n = 0, earth = 0, kdsa = 0, dsn = 0;
  for (let k = a; k <= b; k++) {
    n++;
    if (!core.earthVisible(site, k)) continue;
    earth++;
    if (bits.KDSA[k]) kdsa++;
    if (bits.DSN_GOLDSTONE[k] | bits.DSN_MADRID[k] | bits.DSN_CANBERRA[k]) dsn++;
  }
  return { hours: n, earth, kdsa, dsn };
}

export { koreaInfo };
