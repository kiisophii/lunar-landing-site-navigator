// Focused adapter checks; real sampler/worker, synthetic encoded terrain at the fetch boundary.
// Run: node --test pipeline/test_north_hterrain.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { polarXY, locatePolar, polarLevels, marchParams, computeHorizon, needCount } from '../web/js/hterrain.js';

const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const level = (name, pole) => ({ name, pole, lat_edge_deg: pole === 'north' ? 75 : -75,
  res_m: 1000000, x0_m: -1000000, y0_m: 1000000, tile_px: 2, nt: 1, n: 3,
  q_m: 1, to_km: 300, tiles: ['0_0'], url: `polar_${pole[0]}/${name}/{ty}_{tx}.bin` });
const north = { pole: 'north', lat_edge_deg: 75, levels: [level('n60', 'north')] };
const south = { pole: 'south', lat_edge_deg: -75, levels: [level('s60', 'south')] };
const grid = { ppd: 1 / 90, n: 3, tile_deg: 180, res_m: 948, to_km: 300 };
const baseIndex = () => ({ url: 'tiles/{grid}/{ty}_{tx}.bin', grids: { near: { ...grid }, far: { ...grid, res_m: 1895 } } });
const index = () => ({ ...baseIndex(), polar: structuredClone(south), polarNorth: structuredClone(north) });

test('north cardinal projection has the native negative y axis and finite pole/date line', () => {
  // tan(22.5 degrees) = sqrt(2)-1; independent analytic reference.
  const rho = 3474800 * (Math.SQRT2 - 1);
  for (const [lon, want] of [[0, [0, -rho]], [90, [rho, 0]], [180, [0, rho]], [-90, [-rho, 0]]]) {
    polarXY(45, lon, 'north').forEach((v, i) => close(v, want[i]));
  }
  for (const lon of [-180, 0, 180]) polarXY(90, lon, 'north').forEach(v => close(v, 0));
  polarXY(-45, 0).forEach((v, i) => close(v, [0, rho][i]));
  const lv = level('n60', 'north');
  assert.ok(locatePolar(lv, 85, 0));
  const a = locatePolar(lv, 85, -180), b = locatePolar(lv, 85, 180);
  close(a.lr + a.fr, b.lr + b.fr); close(a.lc + a.fc, b.lc + b.fc);
});

test('hemisphere selection preserves south API and north level-specific latitude gates', () => {
  const ix = index();
  ix.polarNorth.levels.unshift({ ...level('n20', 'north'), lat_edge_deg: 85 });
  for (const [lat, names] of [[90, ['n20', 'n60']], [85, ['n20', 'n60']], [80, ['n60']], [75, ['n60']],
    [74.999, []], [0, []], [-74.999, []], [-75, ['s60']], [-90, ['s60']]]) {
    assert.deepEqual(polarLevels(ix, lat).map(v => v.name), names);
  }
  assert.equal(marchParams(ix, 75).minKm, .005);
  assert.equal(marchParams(ix, 75).nSteps, 8000);
  delete ix.polarNorth;
  assert.deepEqual(polarLevels(ix, 85), []);
  assert.equal(marchParams(ix, 85).minKm, .2);
});

test('a missing northern tile remains needed and never falls through to global heights', () => {
  const ix = index(), tiles = { near: new Map([['0_0', new Float32Array(9)]]), far: new Map(), polar: {} };
  const result = computeHorizon(ix, tiles, 85, 0, { nSteps: 2 });
  assert.equal(result.mask, null);
  assert.equal(needCount(result.need), 1);
  assert.deepEqual([...result.need.polar.n60], ['0_0']);
});

function encodedPolar(height) {
  const b = new ArrayBuffer(22); new DataView(b).setInt32(0, height, true); return b;
}
let instance = 0;
async function workerFixture({ missingNorth = false, missingTile = false, failedGlobal = false } = {}) {
  const oldFetch = globalThis.fetch, oldSelf = globalThis.self;
  const replies = [], requests = [];
  let nextId = 0;
  globalThis.self = { postMessage: msg => replies.push(msg) };
  globalThis.fetch = async url => {
    requests.push(url);
    if (url.endsWith('hterrain/index.json')) {
      const ix = baseIndex();
      if (failedGlobal) ix.grids.near.to_km = 150;
      return Response.json(ix);
    }
    if (url.endsWith('polar_s/index.json')) return Response.json(south);
    if (url.endsWith('polar_n/index.json')) return missingNorth ? new Response('', { status: 404 }) : Response.json(north);
    if (url.includes('/n60/')) return missingTile ? new Response('', { status: 404 }) : new Response(encodedPolar(url.startsWith('https://b/') ? 300 : 100));
    if (url.includes('/s60/')) return new Response(encodedPolar(200));
    if (url.includes('/tiles/')) {
      if (!failedGlobal) return new Response(new ArrayBuffer(18));
      if (url.startsWith('https://a/') && url.includes('/far/')) return new Response('', { status: 404 });
      // A fails while its near tile is in flight. B's far tile holds the next march until that stale A response arrives.
      if (url.startsWith('https://a/')) await new Promise(resolve => setTimeout(resolve, 30));
      if (url.startsWith('https://b/') && url.includes('/far/')) await new Promise(resolve => setTimeout(resolve, 80));
      const raw = new ArrayBuffer(18), view = new DataView(raw), height = url.startsWith('https://a/') ? 100 : 300;
      for (const offset of [0, 6, 12]) view.setInt16(offset, height, true);
      return new Response(raw);
    }
    throw new Error('Unexpected fixture URL: ' + url);
  };
  await import(`../web/js/custom_horizon_worker.js?fixture=${++instance}`);
  return {
    requests,
    async compute(lat, base = 'https://a/') {
      const id = ++nextId;
      await globalThis.self.onmessage({ data: { id, lat, lon: 0, base } });
      const reply = replies.find(m => m.id === id && m.type !== 'progress');
      assert.ok(reply, 'Worker must finish with a done/error message'); return reply;
    },
    restore() { globalThis.fetch = oldFetch; globalThis.self = oldSelf; },
  };
}

test('one worker switches hemispheres without reusing another hemisphere or base height', async () => {
  const f = await workerFixture();
  try {
    for (const [lat, base, height, pole] of [[85, 'https://a/', 100, 'north'], [-85, 'https://a/', 200, 'south'],
      [85, 'https://a/', 100, 'north'], [85, 'https://b/', 300, 'north']]) {
      const r = await f.compute(lat, base);
      assert.equal(r.type, 'done'); close(r.h0_m, height); assert.equal(r.pole, pole); assert.equal(r.polar, true);
      assert.equal(r.mask.length, 720); assert.ok(r.mask.every(Number.isFinite));
    }
  } finally { f.restore(); }
});

test('missing optional northern index uses global settings with no polar claim', async () => {
  const f = await workerFixture({ missingNorth: true });
  try {
    const r = await f.compute(85);
    assert.equal(r.type, 'done'); assert.equal(r.polar, false); assert.equal(r.pole, null); assert.equal(r.params.minKm, .2);
  } finally { f.restore(); }
});

test('overlapping worker jobs retain their own base and hemisphere', async () => {
  const f = await workerFixture();
  try {
    const [a, b] = await Promise.all([f.compute(85, 'https://a/'), f.compute(85, 'https://b/')]);
    assert.equal(a.type, 'done'); assert.equal(b.type, 'done'); close(a.h0_m, 100); close(b.h0_m, 300);
  } finally { f.restore(); }
});

test('a failed job drains pending tile responses before switching to another base', async () => {
  const f = await workerFixture({ failedGlobal: true });
  try {
    assert.equal((await f.compute(0)).type, 'error');
    const next = await f.compute(0, 'https://b/');
    assert.equal(next.type, 'done'); close(next.h0_m, 300);
  } finally { f.restore(); }
});

test('advertised but unavailable northern tiles produce an error', async () => {
  const f = await workerFixture({ missingTile: true });
  try { assert.equal((await f.compute(85)).type, 'error'); } finally { f.restore(); }
});

function uiFixture(validation) {
  // UI imports require the DOM; keep accuracy logic and real translated strings, stub only UI bootstrapping.
  const strings = {};
  const context = vm.createContext({ addStrings: en => Object.assign(strings, en), t: k => strings[k], whenReady: () => {} });
  const source = readFileSync(new URL('../web/js/custom_site.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/import\.meta\.url/g, "'file:///custom_site.js'");
  vm.runInContext(source, context);
  context.validation = validation;
  vm.runInContext('val = validation', context);
  return context;
}
function accuracyFixture(validation) {
  const context = uiFixture(validation);
  return (lat, polar, pole) => { context.args = { lat, polar, pole }; return vm.runInContext('accuracyFor(args.lat, args.polar, args.pole)', context); };
}
const measured = { n: 10, rms_deg_median: .1, rms_deg_max: .3, abs_sun_pp_median: .5, abs_sun_pp_max: 1.5, meets_target: true };
const validation = () => ({ north: { levels: ['60 m'], lat_edge_deg: 75, target: { rms_deg_median: .2, abs_sun_pp_per_point: 2 },
  bands: { '75-80N': { ...measured }, '80-85N': { ...measured, meets_target: false, abs_sun_pp_max: 4 } } } });

test('north accuracy requires actual north path and measured band; failed/unknown bands stay lower', () => {
  const accuracy = accuracyFixture(validation());
  const a = accuracy(77, true, 'north');
  assert.ok(a); assert.equal(a.lower, false); assert.match(a.text, /75-80°N/);
  for (const args of [[77, false, null], [77, true, 'south'], [82, true, 'north'], [88, true, 'north']]) {
    const result = accuracy(...args); assert.ok(result); assert.equal(result.lower, true);
  }
  assert.equal(accuracyFixture(null)(77, true, 'north').lower, true);
});

test('UI can render before validation loads and without legacy southern catalogue statistics', () => {
  for (const data of [null, validation()]) {
    const context = uiFixture(data), elements = new Map();
    context.section = { querySelector(key) { if (!elements.has(key)) elements.set(key, { textContent: '' }); return elements.get(key); } };
    assert.doesNotThrow(() => vm.runInContext('sec = section; showErr()', context));
    if (data) assert.match(elements.get('.cu-respolar').textContent, /North-polar/);
  }
});
