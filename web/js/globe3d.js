// globe3d.js — one whole-Moon 3D view that gets more detailed as you zoom (phase 4, card S4).
//
// Data: web/data/globe/index.json + height tiles from pipeline/build_globe_tiles.py
//       (LOLA LDEM_64 everywhere, SLDEM2015 / PGDA patches around catalogue sites),
//       colour = NASA SVS CGI Moon Kit (https://svs.gsfc.nasa.gov/4720), Sun/Earth = web/data/ephem.bin.
// World frame = MOON_ME (x -> lon 0, y -> lon 90E, z -> north), units = km.
//
// API (see createGlobe): setTime(hourIndex|Date), flyTo({lat,lon,range,tilt,heading}), focusSite(id),
//   setExaggeration(k) [display default x3, shown in a persistent note; calculations always use true heights],
//   setLang('en'|'ko'), getView(), on(event, fn) [events: 'siteclick', 'view', 'time'], dispose(),
//   setColorMap(url|null) [data layer instead of the colour kit], screenToLatLon(clientX, clientY).
// Options: base, hour, view, exaggeration (3), lang ('en'), hud (true),
//   avoid: [elements | CSS selectors] the off-screen Sun/Earth chips must never cover (header, panels, buttons, minimap),
//   chipInsets: {top, right, bottom, left} px kept free for chips.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js';
import { iconSvg } from './icons.js';

const R = 1737.4;                       // km, contract section 0
const T0_MS = Date.UTC(2026, 0, 1);     // hour index 0
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const SIN_CAP = Math.sin(71.9 * D2R);   // polar caps draw only poleward of 71.9 deg (band ends at 72)
const MESH_STRIDE = 2;                  // geometry uses every 2nd height sample; normals use all of them
const MAX_TILES = 420;                  // LRU cache size (meshes kept on the GPU)
const MAX_LOADS = 6;                    // concurrent tile downloads

// ------------------------------------------------------------------ small vector helpers
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dirFromLatLon = (lat, lon, out = v3()) => {
  const cl = Math.cos(lat * D2R);
  return out.set(cl * Math.cos(lon * D2R), cl * Math.sin(lon * D2R), Math.sin(lat * D2R));
};
const latLonFromDir = d => ({ lat: Math.asin(Math.max(-1, Math.min(1, d.z / d.length()))) * R2D, lon: Math.atan2(d.y, d.x) * R2D });
function enu(up) {                       // east, north at unit vector `up`
  let east = v3(-up.y, up.x, 0);
  if (east.lengthSq() < 1e-12) east.set(0, 1, 0); else east.normalize();
  const north = v3().crossVectors(up, east).normalize();
  return { east, north };
}

// ------------------------------------------------------------------ tile geometry (must match the pipeline)
function makeLayout(idx) {
  const N = idx.tile_cells, B = idx.border, P = idx.tile_px;   // 256, 1, 259
  const band = idx.band, half = idx.cap.half_m / 1000;         // km
  return {
    N, B, P,
    // direction for bordered sample (i, j) of tile (kind, z, x, y); i = column, j = row (0..P-1)
    dir(kind, z, x, y, i, j, out) {
      const k = i - B, l = j - B;
      if (kind === 'band') {
        const d = band.root_deg / (1 << z) / N;
        const lon = -180 + (x * N + k) * d, lat = Math.max(-90, Math.min(90, band.lat_max - (y * N + l) * d));
        return dirFromLatLon(lat, lon, out);
      }
      const d = 2 * half / (1 << z) / N;
      const px = -half + (x * N + k) * d, py = half - (y * N + l) * d;
      const rho = Math.hypot(px, py);
      const c = 2 * Math.atan(rho / (2 * R));
      const s = rho > 0 ? Math.sin(c) / rho : 0;
      return kind === 'south' ? out.set(s * py, s * px, -Math.cos(c)) : out.set(-s * py, s * px, Math.cos(c));
    },
    directions(kind, z, x, y) {
      const dirs = new Float32Array(P * P * 3), v = v3();
      // Band longitude repeats down columns and latitude across rows. Keep
      // trig values as doubles and the exact dir()/normalize arithmetic.
      const cosLon = new Float64Array(P), sinLon = new Float64Array(P);
      const step = band.root_deg / (1 << z) / N;
      if (kind === 'band') for (let i = 0; i < P; i++) {
        const lon = -180 + (x * N + i - B) * step;
        cosLon[i] = Math.cos(lon * D2R); sinLon[i] = Math.sin(lon * D2R);
      }
      for (let j = 0; j < P; j++) {
        const lat = Math.max(-90, Math.min(90, band.lat_max - (y * N + j - B) * step));
        const cl = Math.cos(lat * D2R), sl = Math.sin(lat * D2R);
        for (let i = 0; i < P; i++) {
          if (kind === 'band') v.set(cl * cosLon[i], cl * sinLon[i], sl).normalize();
          else this.dir(kind, z, x, y, i, j, v).normalize();
          const o = 3 * (j * P + i); dirs[o] = v.x; dirs[o + 1] = v.y; dirs[o + 2] = v.z;
        }
      }
      return dirs;
    },
    spacing(kind, z) { return kind === 'band' ? band.root_deg / (1 << z) / N * D2R * R : 2 * half / (1 << z) / N; },
    // which tile at level z contains (lat, lon); returns [x, y, fi, fj] (fractional bordered sample coords) or null
    locate(kind, z, lat, lon) {
      let fx, fy;
      if (kind === 'band') {
        if (Math.abs(lat) > band.lat_max) return null;
        const d = band.root_deg / (1 << z) / N;
        lon = ((lon + 180) % 360 + 360) % 360 - 180;
        fx = Math.min((lon + 180) / d, 5 * (1 << z) * N - 1e-9); fy = Math.min((band.lat_max - lat) / d, 2 * (1 << z) * N - 1e-9);
      } else {
        const south = kind === 'south';
        if (south ? lat > -60 : lat < 60) return null;
        const rho = 2 * R * Math.tan((90 - Math.abs(lat)) * D2R / 2), L = lon * D2R;
        const px = rho * Math.sin(L), py = south ? rho * Math.cos(L) : -rho * Math.cos(L);
        const d = 2 * half / (1 << z) / N;
        fx = (px + half) / d; fy = (half - py) / d;
      }
      const x = Math.floor(fx / N), y = Math.floor(fy / N);
      return [x, y, fx - x * N + B, fy - y * N + B];
    },
  };
}

// ------------------------------------------------------------------ sprites (procedural canvas, no images)
function discTexture(inner, outer, glow) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(glow, outer); grd.addColorStop(Math.min(1, glow + 0.08), 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ main
export async function createGlobe(container, opts = {}) {
  const base = opts.base ?? 'data/';
  const listeners = {};
  const emit = (ev, data) => (listeners[ev] || []).forEach(f => f(data));

  // opts.ephem (Float32Array) + opts.ephemMeta let the app share the ephemeris it already loaded (no second download)
  const [idx, ephemMeta, ephemBuf, sites] = await Promise.all([
    fetch(base + 'globe/index.json').then(r => r.json()),
    opts.ephemMeta ? Promise.resolve(opts.ephemMeta) : fetch(base + 'ephem.json').then(r => r.json()),
    opts.ephem ? Promise.resolve(null) : fetch(base + 'ephem.bin').then(r => r.arrayBuffer()),
    opts.sites ? Promise.resolve(opts.sites) : fetch(base + 'sites.json').then(r => r.json()),
  ]);
  const ephem = opts.ephem || new Float32Array(ephemBuf);
  const L = makeLayout(idx);
  const avail = new Map();                     // "kind/z/x/y" -> {min, max, fine}
  for (const [kind, arr] of Object.entries(idx.tiles)) for (const [z, x, y, mn, mx, fine] of arr) avail.set(`${kind}/${z}/${x}/${y}`, { min: mn, max: mx, fine });
  const maxZ = {}; for (const [k, arr] of Object.entries(idx.tiles)) maxZ[k] = Math.max(...arr.map(a => a[0]));

  // ---------------- renderer, scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', outline: 'none' });
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D Moon. Drag to pan, right-drag or Shift-drag to rotate and tilt, wheel or pinch to zoom, arrow keys to move.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.0005, 1e8);
  // Moon look matched to the designer's copy (Chaei, 18:41): warm sunlight 0xfff4e2 and a faint blue earthshine,
  // applied to the colour map in display (sRGB) space like her three.js r128 page; see the moon shader below.
  const sun = new THREE.DirectionalLight(new THREE.Color().setRGB(1, 0xf4 / 255, 0xe2 / 255, THREE.LinearSRGBColorSpace), 3.2 * Math.PI);   // 3.2: day side measured ~25 % darker than the copy at 2.5
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  scene.add(sun, sun.target);
  // night side: nearly black like the copy (its ambient 0.012 + earthshine 0.07 from the Earth, which keeps a hint of crater relief)
  const ambient = new THREE.AmbientLight(0xffffff, 0.012 * Math.PI);
  const earthshine = new THREE.DirectionalLight(new THREE.Color().setRGB(0x9f / 255, 0xb8 / 255, 1, THREE.LinearSRGBColorSpace), 0.07 * Math.PI);
  scene.add(ambient, earthshine, earthshine.target);

  // colour map: 2k first (0.4 MB), the 8k (6.6 MB) only once the camera comes closer than HIRES_RANGE km (lazy)
  const HIRES_RANGE = 3000;
  const texLoader = new THREE.TextureLoader();
  const colorTex = { value: null };
  let hiresState = 'none';                 // none | loading | done
  let colorWorker = null;
  const setColor = t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; colorTex.value = t; };
  setColor(await texLoader.loadAsync(base + 'globe/moon_color_2k.jpg'));
  let baseTex = null;                       // LROC colour texture currently loaded (2k or 8k)
  let layerTex = null, layerUrl = null;     // optional data layer drawn over the terrain (setColorMap)
  const layerU = { value: null }, layerA = { value: 0 };   // layer texture + opacity (0 = off) for the moon shader
  // elevation layer (setElevation): colour from the displayed LOLA height of each fragment, (|p| - R) / exaggeration
  const elevOn = { value: 0 }, elevExag = { value: 3 }, elevRange = { value: new THREE.Vector2(-4.5, 5.5) };
  const elevRamp = { value: Array.from({ length: 9 }, () => new THREE.Color()) };
  const LAYER_OPACITY = 0.72;               // layer colour share; the rest is a fixed-light LOLA hillshade so craters stay visible
  function loadHires() {
    if (hiresState !== 'none') return;
    hiresState = 'loading';
    // Decode, orient and unpack pixels off the render thread. Even an ImageBitmap
    // upload can synchronously convert all 8K pixels; a transferable RGBA buffer
    // avoids that conversion. Retain it on the texture for WebGL context restore.
    const url = new URL(base + 'globe/moon_color_8k.jpg', document.baseURI).href;
    const pending = typeof Worker === 'function' && typeof OffscreenCanvas === 'function'
      ? new Promise((resolve, reject) => {
        const worker = colorWorker = new Worker(new URL('./globe_color_worker.js', import.meta.url));
        worker.onmessage = ({ data }) => {
          worker.terminate(); colorWorker = null;
          if (data.error) { reject(new Error(data.error)); return; }
          const t = new THREE.DataTexture(new Uint8Array(data.pixels), data.width, data.height);
          t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
          t.needsUpdate = true;
          resolve(t);
        };
        worker.onerror = e => { worker.terminate(); colorWorker = null; reject(new Error(e.message)); };
        worker.postMessage({ url, maxSize: renderer.capabilities.maxTextureSize });
      })
      : texLoader.loadAsync(url);
    pending
      .then(t => {
        if (stopped) { t.dispose(); return; }
        const old = baseTex || colorTex.value; setColor(t); baseTex = t; if (old !== t) old.dispose(); dirty = true;   // a data layer (setColorMap) is a separate uniform, drawn on top
      })
      .catch(() => {})
      .finally(() => { hiresState = 'done'; });
  }

  function makeMaterial(kind, normalTex) {
    const m = new THREE.MeshLambertMaterial({ normalMap: normalTex, normalMapType: THREE.ObjectSpaceNormalMap });
    m.onBeforeCompile = sh => {
      sh.uniforms.uColor = colorTex; sh.uniforms.uLayer = layerU; sh.uniforms.uLayerA = layerA;
      sh.uniforms.uElev = elevOn; sh.uniforms.uElevExag = elevExag; sh.uniforms.uElevRange = elevRange; sh.uniforms.uElevRamp = elevRamp;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMoonP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMoonP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMoonP;
uniform sampler2D uColor;
uniform sampler2D uLayer;
uniform float uLayerA;
uniform float uElev; uniform float uElevExag; uniform vec2 uElevRange; uniform vec3 uElevRamp[9];
vec3 gLayer; float gLum; vec3 gBase;`)
        .replace('#include <map_fragment>', `{
  vec3 dd = normalize(vMoonP);
  ${kind === 'band' ? '' : `if (abs(dd.z) < ${SIN_CAP.toFixed(6)}) discard;`}
  float u = atan(dd.y, dd.x) / 6.28318530718 + 0.5;
  float v = asin(clamp(dd.z, -1.0, 1.0)) / 3.14159265359 + 0.5;
  float u2 = fract(u + 0.5) - 0.5;            // Tarini's seamless longitude trick
  float uu = fwidth(u) <= fwidth(u2) + 1e-6 ? u : u2;
  vec3 base = texture2D(uColor, vec2(uu, v)).rgb;
  gBase = base;
  diffuseColor.rgb *= base;
  gLum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  gLayer = uLayerA > 0.0 ? texture2D(uLayer, vec2(uu, v)).rgb : vec3(0.0);
  if (uElev > 0.5) {
    float hk = (length(vMoonP) - ${R.toFixed(1)}) / uElevExag;                     // km above 1737.4 km (true height)
    float f = clamp((hk - uElevRange.x) / (uElevRange.y - uElevRange.x), 0.0, 1.0) * 8.0;
    int i0 = int(min(floor(f), 7.0));
    gLayer = mix(uElevRamp[i0], uElevRamp[i0 + 1], f - float(i0));
  }
}`)
        .replace('#include <opaque_fragment>', `#include <opaque_fragment>
if (uLayerA <= 0.0 && uElev < 0.5) {
  // display-space lighting (designer's copy): colour map in sRGB x light factor, clipped, then back to linear for output.
  // light factor = what the Lambert pass delivered per unit albedo (keeps terrain shadows and the normal map).
  vec3 irr = outgoingLight / max(diffuseColor.rgb, vec3(1e-4));
  vec3 sb = sRGBTransferOETF(vec4(gBase, 1.0)).rgb;
  gl_FragColor.rgb = sRGBTransferEOTF(vec4(clamp(sb * irr, 0.0, 1.0), 1.0)).rgb;
}
if (uLayerA > 0.0 || uElev > 0.5) {
  const float LAYER_DIM = 0.78;
  // Data layer over a cartographic hillshade: light fixed from the local north-west, 45 deg up, independent of the
  // selected time, so a long-term average is never darkened by tonight's shadow and the terrain stays readable.
  vec3 up = normalize(vMoonP);
  vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  vec3 ea = cross(vec3(0.0, 0.0, 1.0), up);
  ea = dot(ea, ea) < 1e-8 ? vec3(1.0, 0.0, 0.0) : normalize(ea);
  vec3 no = cross(up, ea);
  vec3 L = normalize(up * 0.70711 + (no - ea) * 0.5);
  float relief = clamp(1.0 + 1.6 * (dot(nW, L) / 0.70711 - 1.0), 0.08, 1.8);   // 1 on level ground, steeper contrast on slopes
  vec3 ground = vec3(clamp(0.05 + 1.6 * gLum, 0.04, 0.5)) * relief;
  gl_FragColor.rgb = uElev > 0.5
    ? gLayer * mix(1.0, relief, 0.35)                                            // elevation: full colour, light relief (as vivid as the copy)
    : mix(ground, gLayer * LAYER_DIM * mix(1.0, relief, 0.75), uLayerA);   // LAYER_DIM: team asked for a darker mean map (11/14)
}`);
    };
    m.customProgramCacheKey = () => 'moon-' + (kind === 'band' ? 'b' : 'c');
    return m;
  }

  // ---------------- view state (vector form: parallel transport over the poles)
  const view = { tgt: dirFromLatLon(0, 0), hvec: v3(0, 0, 1), range: 6000, tilt: 0 };
  let exag = opts.exaggeration ?? 3;     // team decision 11/14: display fixed at x3 (true heights in all calculations)
  let lang = opts.lang === 'ko' ? 'ko' : 'en';
  let hour = 0;
  let dirty = true;
  let fly = null;
  let labelIns = null;            // panels over the stage (opts.labelInsets), refreshed every 30 frames

  // ---------------- tiles
  const tiles = new Map();   // key -> {key, kind, z, x, y, state, mesh, h(Float32Array P*P), dirs, center, radius, used}
  const queue = new Set();
  let loading = 0;
  const buildQueue = [];
  let meshIndices = null;             // immutable CPU topology shared by this globe's tiles
  let frameNo = 0;
  const group = new THREE.Group(); scene.add(group);

  function tileInfo(kind, z, x, y) {
    const key = `${kind}/${z}/${x}/${y}`;
    let t = tiles.get(key);
    if (t) return t;
    const a = avail.get(key);
    if (!a) return null;
    // bounding sphere from the 4 corners + centre at mean radius
    const P = L.P, pts = [[L.B, L.B], [P - 1 - L.B, L.B], [L.B, P - 1 - L.B], [P - 1 - L.B, P - 1 - L.B], [(P - 1) / 2, (P - 1) / 2]];
    const ds = pts.map(([i, j]) => L.dir(kind, z, x, y, i, j, v3()));
    const centerDir = ds[4].clone().normalize();
    t = { key, kind, z, x, y, a, state: 'none', mesh: null, used: 0, centerDir, cornerDirs: ds,
          angRad: Math.max(...ds.map(d => d.angleTo(centerDir))) };
    tiles.set(key, t);
    return t;
  }
  function bounds(t) {
    const rMax = R + t.a.max / 1000 * exag, rMin = R + Math.min(0, t.a.min / 1000 * exag);
    const c = t.centerDir.clone().multiplyScalar((rMax + rMin) / 2);
    const radius = Math.max(rMax * Math.sin(t.angRad), 0) + (rMax - rMin * Math.cos(t.angRad)) / 2 + 1;
    return { c, radius, rMax };
  }
  function children(t) {
    const out = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const c = tileInfo(t.kind, t.z + 1, 2 * t.x + i, 2 * t.y + j);
      if (!c) return null;
      out.push(c);
    }
    return out;
  }

  function request(t) {
    if (t.state !== 'none') return;
    t.state = 'queued'; queue.add(t);
  }
  function pumpLoads() {
    if (loading >= MAX_LOADS || !queue.size) return;
    const camPos = camera.position;
    const list = [...queue].sort((a, b) => (a.z - b.z) || (a.centerDir.distanceToSquared(camPos.clone().normalize()) - b.centerDir.distanceToSquared(camPos.clone().normalize())));
    for (const t of list) {
      if (loading >= MAX_LOADS) break;
      queue.delete(t);
      if (frameNo - t.wanted > 30) { t.state = 'none'; continue; }   // no longer needed
      loadTile(t);
    }
  }
  async function loadTile(t) {
    t.state = 'loading'; loading++;
    try {
      const blob = await fetch(base + 'globe/' + idx.url.replace('{kind}', t.kind).replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); });
      const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      // #104: OffscreenCanvas only where it exists (Safari < 16.4 and some WebKit builds lack it) — same check as the 8k path above
      const cv = typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(bmp.width, bmp.height)
        : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(bmp, 0, 0); bmp.close();
      const px = g.getImageData(0, 0, cv.width, cv.height).data;
      const n = cv.width * cv.height, h = new Float32Array(n);
      for (let k = 0; k < n; k++) h[k] = ((px[4 * k] << 8) | px[4 * k + 1]) / 2 - 10000;
      t.h = h;
      if (t.state === 'disposed') return;
      t.state = 'decoded'; buildQueue.push(t);
    } catch (e) {
      console.warn('globe3d: tile failed', t.key, e); t.state = 'failed';
    } finally { loading--; }
  }

  // builds / rebuilds mesh + normal map from heights (also used when exaggeration changes)
  function buildMesh(t) {
    const P = L.P, B = L.B, N = L.N, S = MESH_STRIDE, M = N / S + 1;   // mesh vertices per side
    if (!t.dirs) t.dirs = L.directions(t.kind, t.z, t.x, t.y);
    const D = t.dirs, H = t.h, e = exag / 1000;
    const c = t.centerDir.clone().multiplyScalar(R);
    // full-resolution positions (relative to centre) for normals
    const pos = new Float32Array(P * P * 3);
    for (let k = 0; k < P * P; k++) {
      const r = R + H[k] * e;
      pos[3 * k] = D[3 * k] * r - c.x; pos[3 * k + 1] = D[3 * k + 1] * r - c.y; pos[3 * k + 2] = D[3 * k + 2] * r - c.z;
    }
    const nm = new Uint8Array((N + 1) * (N + 1) * 4);
    const a = v3(), b = v3(), nrm = v3(), up = v3();
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const I = i + B, J = j + B;
      const pE = 3 * (J * P + I + 1), pW = 3 * (J * P + I - 1), pS = 3 * ((J + 1) * P + I), pN = 3 * ((J - 1) * P + I);
      a.set(pos[pE] - pos[pW], pos[pE + 1] - pos[pW + 1], pos[pE + 2] - pos[pW + 2]);
      b.set(pos[pN] - pos[pS], pos[pN + 1] - pos[pS + 1], pos[pN + 2] - pos[pS + 2]);
      nrm.crossVectors(a, b).normalize();
      const o = 3 * (J * P + I); up.set(D[o], D[o + 1], D[o + 2]);
      if (nrm.dot(up) < 0) nrm.negate();
      const q = 4 * (j * (N + 1) + i);
      nm[q] = (nrm.x * 0.5 + 0.5) * 255; nm[q + 1] = (nrm.y * 0.5 + 0.5) * 255; nm[q + 2] = (nrm.z * 0.5 + 0.5) * 255; nm[q + 3] = 255;
    }
    // mesh: M x M grid + skirt (4 edges)
    const nv = M * M + 4 * M;
    const P3 = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), NO = new Float32Array(nv * 3);
    let v = 0;
    const put = (i, j, drop) => {             // i, j = cell coords 0..N
      const o = 3 * ((j + B) * P + (i + B));
      const r = R + H[(j + B) * P + (i + B)] * e - drop;
      P3[3 * v] = D[o] * r - c.x; P3[3 * v + 1] = D[o + 1] * r - c.y; P3[3 * v + 2] = D[o + 2] * r - c.z;
      NO[3 * v] = D[o]; NO[3 * v + 1] = D[o + 1]; NO[3 * v + 2] = D[o + 2];
      UV[2 * v] = (i + 0.5) / (N + 1); UV[2 * v + 1] = 1 - (j + 0.5) / (N + 1);
      return v++;
    };
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) put(i * S, j * S, 0);
    const skirt = Math.max(L.spacing(t.kind, t.z) * S * 4, (t.a.max - t.a.min) / 1000 * e * 0.05, 0.05);
    const g = (i, j) => j * M + i;
    const ix = [], skirtIx = [];
    if (!meshIndices) for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) {
      const a0 = g(i, j), a1 = g(i + 1, j), a2 = g(i, j + 1), a3 = g(i + 1, j + 1);
      ix.push(a0, a2, a1, a1, a2, a3);
    }
    // skirts: one strip per edge, hanging `skirt` km down; both windings so back-face culling never opens a gap
    for (const edgeFn of [k => [k, 0], k => [M - 1, k], k => [k, M - 1], k => [0, k]]) {
      let prevG = -1, prevS = -1;
      for (let k = 0; k < M; k++) {
        const [i, j] = edgeFn(k), gi = g(i, j), si = put(i * S, j * S, skirt);
        if (k && !meshIndices) skirtIx.push(prevG, prevS, gi, gi, prevS, si, prevG, gi, prevS, gi, si, prevS);
        prevG = gi; prevS = si;
      }
    }
    if (!meshIndices) {
      // Preserve Three's index-type selection; share arrays, not GPU attributes.
      meshIndices = { surface: new THREE.BufferGeometry().setIndex(ix).index.array,
                      skirt: new THREE.BufferGeometry().setIndex(skirtIx).index.array };
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P3, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(NO, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    geo.setIndex(new THREE.BufferAttribute(meshIndices.surface, 1));
    geo.computeBoundingSphere();
    const tex = new THREE.DataTexture(nm, N + 1, N + 1, THREE.RGBAFormat);
    tex.flipY = true; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
    if (t.mesh) disposeMesh(t.mesh);
    const mat = makeMaterial(t.kind, tex);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(c);
    mesh.castShadow = mesh.receiveShadow = true;
    // skirts (crack fillers between LOD levels) hang below the surface: never shadowed, never casting
    const sgeo = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) sgeo.setAttribute(k, geo.getAttribute(k));
    sgeo.setIndex(new THREE.BufferAttribute(meshIndices.skirt, 1)); sgeo.boundingSphere = geo.boundingSphere;
    const smesh = new THREE.Mesh(sgeo, mat);
    smesh.castShadow = smesh.receiveShadow = false;
    mesh.add(smesh); smesh.updateMatrix(); smesh.matrixAutoUpdate = false;
    mesh.visible = false;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    group.add(mesh);
    t.mesh = mesh; t.state = 'ready'; t.exag = exag;
    t.dirs = null;   // 0.8 MB per tile; recomputed on the rare exaggeration change
  }
  function disposeMesh(m) {
    m.children.forEach(ch => ch.geometry.dispose());
    m.geometry.dispose(); m.material.normalMap.dispose(); m.material.dispose(); group.remove(m);
  }
  function disposeTile(t) {
    if (t.mesh) { disposeMesh(t.mesh); t.mesh = null; }
    t.h = null; t.dirs = null; t.state = 'none';
  }

  // ---------------- LOD selection
  const frustum = new THREE.Frustum(), lightFrustum = new THREE.Frustum(), projView = new THREE.Matrix4(), sphere = new THREE.Sphere();
  let selected = [];
  function select() {
    projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    // tiles inside the Sun's shadow box are kept too, so off-screen ridges still cast shadows on screen
    const sc = sun.shadow.camera; sc.updateMatrixWorld();
    lightFrustum.setFromProjectionMatrix(projView.clone().multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse));
    const K = renderer.domElement.clientHeight / (2 * Math.tan(camera.fov * D2R / 2));
    const cam = camera.position, camD = cam.length(), camN = cam.clone().divideScalar(camD);
    const thresh = (opts.pixelError ?? 1.6) * (quality >= 3 ? 1.6 : 1);
    const out = [];
    const visit = (t) => {
      t.wanted = frameNo;
      const b = bounds(t);
      sphere.set(b.c, b.radius);
      const inView = frustum.intersectsSphere(sphere);
      if (!inView && !lightFrustum.intersectsSphere(sphere)) return;
      // horizon culling: tile entirely beyond the limb as seen from the camera
      const cosLimb = Math.min(1, (R - 10) / camD);
      const ang = Math.acos(Math.max(-1, Math.min(1, t.centerDir.dot(camN))));
      if (ang - t.angRad > Math.acos(cosLimb) + Math.acos(Math.min(1, (R - 10) / b.rMax)) + 0.01) return;
      const dist = Math.max(cam.distanceTo(b.c) - b.radius, 1e-3);
      const err = L.spacing(t.kind, t.z) * K / dist;
      if (err > (inView ? thresh : thresh * 4)) {   // off-screen shadow casters can be coarser
        const kids = children(t);
        if (kids) {
          kids.forEach(k => { k.wanted = frameNo; request(k); });
          if (kids.every(k => k.state === 'ready')) { kids.forEach(visit); return; }
        }
      }
      if (t.state === 'ready') { out.push(t); return; }
      request(t);
      const kids = children(t);
      if (kids && kids.every(k => k.state === 'ready')) kids.forEach(visit);
    };
    for (const kind of ['band', 'south', 'north']) {
      const nx = kind === 'band' ? 5 : 1, ny = kind === 'band' ? 2 : 1;
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const t = tileInfo(kind, 0, x, y); if (t) visit(t); }
    }
    for (const t of selected) if (t.mesh) t.mesh.visible = false;
    for (const t of out) { t.mesh.visible = true; t.used = frameNo; if (t.exag !== exag) { buildMesh(t); t.mesh.visible = true; } }
    selected = out;
  }
  function evict() {
    const ready = [...tiles.values()].filter(t => t.state === 'ready' && t.z > 1);
    if (ready.length <= MAX_TILES) return;
    ready.sort((a, b) => a.used - b.used);
    for (const t of ready.slice(0, ready.length - MAX_TILES)) if (t.used !== frameNo) disposeTile(t);
  }

  // ---------------- heights from loaded tiles
  function heightAt(lat, lon) {
    const kinds = Math.abs(lat) >= 71.95 ? [lat < 0 ? 'south' : 'north'] : ['band'];
    for (const kind of kinds) for (let z = maxZ[kind]; z >= 0; z--) {
      const p = L.locate(kind, z, lat, lon); if (!p) continue;
      const t = tiles.get(`${kind}/${z}/${p[0]}/${p[1]}`);
      if (!t || !t.h) continue;
      const P = L.P, i = Math.min(P - 2, Math.max(0, Math.floor(p[2]))), j = Math.min(P - 2, Math.max(0, Math.floor(p[3])));
      const fi = p[2] - i, fj = p[3] - j, H = t.h;
      return (H[j * P + i] * (1 - fi) + H[j * P + i + 1] * fi) * (1 - fj) + (H[(j + 1) * P + i] * (1 - fi) + H[(j + 1) * P + i + 1] * fi) * fj;
    }
    return 0;
  }
  // terrain horizon (deg) at the camera target along azimuth `az` (true scale, no exaggeration), from loaded tiles
  function horizonEl(lat, lon, azDeg, h0) {
    const up = dirFromLatLon(lat, lon), { east, north } = enu(up);
    const dirv = north.clone().multiplyScalar(Math.cos(azDeg * D2R)).addScaledVector(east, Math.sin(azDeg * D2R));
    const r0 = R + h0 / 1000 + 0.002;
    let best = -90;
    for (let s = 0.2; s < 400; s *= 1.04) {
      const th = s / R;
      const p = up.clone().multiplyScalar(Math.cos(th)).addScaledVector(dirv, Math.sin(th));
      const ll = latLonFromDir(p);
      const rt = R + heightAt(ll.lat, ll.lon) / 1000;
      const el = Math.atan2(rt * Math.cos(th) - r0, rt * Math.sin(th)) * R2D;
      if (el > best) best = el;
    }
    return best;
  }

  // ---------------- Sun / Earth
  function bodyVec(col) {
    const n = ephemMeta.n, i = Math.max(0, Math.min(n - 1.000001, hour)), i0 = Math.floor(i), f = i - i0, i1 = Math.min(n - 1, i0 + 1);
    return v3(...[0, 1, 2].map(k => ephem[6 * i0 + col + k] * (1 - f) + ephem[6 * i1 + col + k] * f));
  }
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture('#fffbe6', '#ffd23f', 0.45), sizeAttenuation: false, depthWrite: false, transparent: true }));
  const earthSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture('#d8f0ff', '#3b8cff', 0.5), sizeAttenuation: false, depthWrite: false, transparent: true }));
  sunSprite.scale.setScalar(0.07); earthSprite.scale.setScalar(0.05);
  sunSprite.renderOrder = earthSprite.renderOrder = 10;
  scene.add(sunSprite, earthSprite);
  let sunDir = v3(1, 0, 0), earthPos = v3(384400, 0, 0);
  function updateBodies() {
    sunDir = bodyVec(0).normalize(); earthPos = bodyVec(3);
  }

  // ---------------- HTML overlays: site markers, off-screen chips, HUD
  const overlay = document.createElement('div');
  Object.assign(overlay.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', font: '12px system-ui, sans-serif' });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(overlay);
  const css = document.createElement('style');
  css.textContent = `
  .g3-site{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer;border:0;background:none;color:#fff;padding:0;font:inherit;white-space:nowrap;text-shadow:0 0 3px #000,0 0 2px #000}
  .g3-site::before{content:'';display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff5a5a;border:2px solid #fff;margin-right:4px;vertical-align:-2px;box-shadow:0 0 3px #000}
  .g3-site.g3-polar_peak::before,.g3-site.g3-artemis3_region::before{background:#2ee59d}
  .g3-site.g3-flip{display:inline-flex;flex-direction:row-reverse;align-items:center}.g3-site.g3-flip::before{margin:0 0 0 4px}
  .g3-site.g3-dotonly{width:14px!important;height:14px;font-size:0!important;overflow:hidden;padding:0!important}
  .g3-site.g3-dotonly::before{content:''!important;width:6px!important;height:6px!important;margin:0!important;background:#fff;border:1px solid #111}
  .g3-cluster{position:absolute;pointer-events:auto;z-index:4;min-width:32px;min-height:26px;padding:3px 7px;border:1px solid #aaa;border-radius:14px;background:#16191eee;color:#fff;font:600 12px sans-serif;cursor:pointer}
  .g3-cluster-panel{position:absolute;pointer-events:auto;z-index:8;width:240px;max-width:calc(100% - 24px);max-height:240px;overflow:auto;padding:8px;border:1px solid #666;border-radius:8px;background:#101318f5;color:white}
  .g3-cluster-panel[hidden]{display:none}.g3-cluster-panel button{display:block;width:100%;padding:8px;text-align:left;border:0;background:transparent;color:#fff;cursor:pointer}.g3-cluster-panel button:hover{background:#ffffff20}
  .g3-cluster:focus-visible,.g3-cluster-panel button:focus-visible{outline:2px solid #ffd23f}
  .g3-site:focus-visible{outline:2px solid #ffd23f}
  .g3-site.g3-dotonly{color:transparent!important;text-shadow:none!important}.g3-site.g3-dotonly:hover,.g3-site.g3-dotonly:focus-visible{color:inherit!important;z-index:2}
  .g3-chip{position:absolute;left:0;top:0;padding:3px 8px;border-radius:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px #0008}
  .g3-chip.sun{background:#ffd23f;color:#222}.g3-chip.earth{background:#3b8cff;color:#fff}
  .g3-label{position:absolute;left:0;top:0;font-weight:600;white-space:nowrap;text-shadow:0 0 3px #000}
  .g3-label.sun{color:#ffd23f}.g3-label.earth{color:#7fb6ff}
  .g3-dock{position:absolute;left:8px;bottom:8px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
  .g3-note{background:#000c;color:#fff;padding:3px 8px;border-radius:5px;font:600 12px system-ui,sans-serif;border:1px solid #ffffff40}
  .g3-hud{background:#000a;color:#eee;padding:6px 9px;border-radius:6px;font:12px/1.45 ui-monospace,monospace}
  .g3-chip .g3-arr{display:inline-block;margin-right:4px}
  .g3-hud b.sun{color:#ffd23f}.g3-hud b.earth{color:#7fb6ff}`;
  overlay.appendChild(css);
  const siteName = s => lang === 'ko' && s.name_ko ? s.name_ko : s.name;
  function updateSiteLabel(s, el) {
    el.textContent = lang === 'ko' ? siteName(s) : (s.short || s.name);
    el.title = `${siteName(s)} (${s.lat.toFixed(3)}, ${s.lon.toFixed(3)})`;
  }
  const siteEls = sites.map(s => {
    const b = document.createElement('button');
    b.className = 'g3-site g3-' + s.group; b.type = 'button'; b.dataset.siteId = s.id;
    updateSiteLabel(s, b);
    b.addEventListener('click', ev => { ev.stopPropagation(); focusSite(s.id); emit('siteclick', s); });
    overlay.appendChild(b);
    return { s, el: b, dir: dirFromLatLon(s.lat, s.lon), h: null };
  });
  const mk = (cls, text) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; overlay.appendChild(d); return d; };
  const chipSun = mk('g3-chip sun', 'Sun'), chipEarth = mk('g3-chip earth', 'Earth');
  const labSun = mk('g3-label sun', 'Sun'), labEarth = mk('g3-label earth', 'Earth');
  const dock = mk('g3-dock', '');
  const note = document.createElement('div'); note.className = 'g3-note'; note.setAttribute('role', 'note'); dock.appendChild(note);
  const hud = document.createElement('div'); hud.className = 'g3-hud'; dock.appendChild(hud);
  if (opts.hud === false) hud.style.display = 'none';
  function updateNote() {
    note.textContent = exag === 1
      ? (lang === 'ko' ? '실제 높이 (과장 없음)' : 'True heights (no exaggeration)')
      : (lang === 'ko' ? `높이 ${exag}배 과장 · 보기용 (계산은 실제 높이)` : `Height ×${exag} (display only; calculations use true heights)`);
  }
  updateNote();
  for (const [c, t, ic] of [[chipSun, lang === 'ko' ? '태양' : 'Sun', 'sun'], [chipEarth, lang === 'ko' ? '지구' : 'Earth', 'earth']]) c.innerHTML = `<span class="g3-arr">${iconSvg('marker-down', { size: 12 })}</span>${iconSvg(ic, { size: 12 })} ${t}`;

  const tmp = v3();
  function project(p) {                         // -> {x, y, behind, on}
    tmp.copy(p).project(camera);
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const behind = tmp.z > 1;
    return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, behind, on: !behind && Math.abs(tmp.x) <= 1 && Math.abs(tmp.y) <= 1, nx: tmp.x, ny: tmp.y };
  }
  // Off-screen chips: placed on the border of a safe rectangle (container minus opts.chipInsets) in the
  // direction of the body, then slid along that border until they overlap no obstacle: opts.avoid
  // (elements or CSS selectors: header, side panels, buttons, minimap ...), our own note/HUD and the other chip.
  const avoidList = () => {
    const out = [dock, ...clusterButtons.values(), clusterPanel];
    for (const a of opts.avoid || []) {
      if (typeof a === 'string') document.querySelectorAll(a).forEach(e => out.push(e)); else if (a) out.push(a);
    }
    return out;
  };
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const clusterButtons = new Map();
  const clusterPanel=document.createElement('div');clusterPanel.className='g3-cluster-panel';clusterPanel.hidden=true;clusterPanel.setAttribute('role','dialog');overlay.append(clusterPanel);
  let activeCluster=null;
  function closeCluster(restore=false){clusterPanel.hidden=true;if(restore)activeCluster?.focus();activeCluster=null;}
  overlay.addEventListener('pointerdown',e=>{if(!e.target.closest('.g3-cluster,.g3-cluster-panel'))closeCluster();});
  clusterPanel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeCluster(true);}});
  function openCluster(button, members){
    activeCluster=button;clusterPanel.replaceChildren();clusterPanel.hidden=false;
    clusterPanel.setAttribute('aria-label',lang==='ko'?'가까운 착륙지 선택':'Choose a nearby landing site');
    const close=document.createElement('button');close.textContent=lang==='ko'?'닫기 ×':'Close ×';close.onclick=()=>closeCluster(true);clusterPanel.append(close);
    for(const m of members){const row=document.createElement('button');row.textContent=lang==='ko'?(m.s.name_ko||m.s.name):m.s.name;row.dataset.siteId=m.s.id;
      row.onclick=e=>{e.stopPropagation();closeCluster();focusSite(m.s.id);emit('siteclick',m.s);};clusterPanel.append(row);}
    const x=parseFloat(button.style.left),y=parseFloat(button.style.top);
    clusterPanel.style.left=`${Math.max(8,Math.min(x,overlay.clientWidth-clusterPanel.offsetWidth-8))}px`;
    clusterPanel.style.top=`${Math.max(8,Math.min(y+30,overlay.clientHeight-clusterPanel.offsetHeight-8))}px`;
    clusterPanel.querySelector('button[data-site-id]')?.focus();
  }
  function declutter() {
    const origin=overlay.getBoundingClientRect();
    const blockers=(typeof opts.labelBlockers==='function'?opts.labelBlockers():[]).map(q=>({x0:q.left,y0:q.top,w:q.width,h:q.height}));
    const overlaps=(a,b,pad=3)=>a.x0<b.x0+b.w+pad&&b.x0<a.x0+a.w+pad&&a.y0<b.y0+b.h+pad&&b.y0<a.y0+a.h+pad;
    const kept=[...blockers], candidates=[], blocked=new Map();   // blocker index -> sites whose dot sits under that box
    for(const m of siteEls){m.el.style.visibility='';m.el.classList.remove('g3-dotonly');if(!m.box||!m.point)continue;
      m.lw=m.el.offsetWidth||m.lw||80;
      m.el.style.transform=`translate(${m.flip?m.point.x-m.lw+7:m.point.x-7}px,${m.point.y-7}px)`;
      const edge=m.point.x<(labelIns?.left||0)+7?'left':m.point.x>overlay.clientWidth-(labelIns?.right||0)-7?'right':m.point.y<(labelIns?.top||0)+7?'top':null;
      if(edge){m.el.style.visibility='hidden';if(m.point.x>=0&&m.point.x<=overlay.clientWidth&&m.point.y>=0&&m.point.y<=overlay.clientHeight){if(!blocked.has(edge))blocked.set(edge,[]);blocked.get(edge).push(m);}continue;}
      const dot={x0:origin.left+m.point.x-7,y0:origin.top+m.point.y-7,w:14,h:14};
      // a dot under a page box (legend, notes, minimap) is not dropped: it joins a +N button placed beside that box
      const bi=blockers.findIndex(k=>overlaps(dot,k,0));
      if(bi>=0){m.el.style.visibility='hidden';if(!blocked.has(bi))blocked.set(bi,[]);blocked.get(bi).push(m);continue;}candidates.push(m);
    }
    // Connected components in screen pixels split naturally as the camera zooms in.
    const groups=[];const unseen=new Set(candidates);
    while(unseen.size){const first=unseen.values().next().value,group=[first];unseen.delete(first);
      for(let i=0;i<group.length;i++)for(const other of [...unseen])if(Math.hypot(group[i].point.x-other.point.x,group[i].point.y-other.point.y)<24){group.push(other);unseen.delete(other);}
      groups.push(group);
    }
    const used=new Set(), clustered=new Set();
    for(const members of groups.filter(g=>g.length>1)){
      const key=members.map(m=>m.s.id).sort().join('|');used.add(key);
      let button=clusterButtons.get(key);if(!button){button=document.createElement('button');button.type='button';button.className='g3-cluster';overlay.append(button);clusterButtons.set(key,button);}
      button.textContent=`+${members.length}`;button.dataset.members=key;button.setAttribute('aria-label',lang==='ko'?`가까운 착륙지 ${members.length}곳 선택`:`Choose among ${members.length} nearby landing sites`);
      button.onclick=e=>{e.stopPropagation();openCluster(button,members);};
      const x=members.reduce((n,m)=>n+m.point.x,0)/members.length,y=members.reduce((n,m)=>n+m.point.y,0)/members.length;
      const bw=button.offsetWidth,bh=button.offsetHeight;
      let px=Math.max(8,Math.min(x,overlay.clientWidth-bw-8)),py=Math.max(8,Math.min(y,overlay.clientHeight-bh-8));
      for(const [dx,dy]of [[0,0],[-bw-8,0],[0,-bh-8],[0,bh+8],[-bw-8,-bh-8]]){const a={x0:origin.left+px+dx,y0:origin.top+py+dy,w:bw,h:bh};if(!kept.some(k=>overlaps(a,k))&&px+dx>=0&&py+dy>=0){px+=dx;py+=dy;break;}}
      button.style.left=`${px}px`;button.style.top=`${py}px`;kept.push({x0:origin.left+px,y0:origin.top+py,w:bw,h:bh});
      for(const m of members){clustered.add(m);m.el.style.visibility='hidden';}
    }
    for(const [bi,members]of blocked){
      const key='under:'+bi+':'+members.map(m=>m.s.id).sort().join('|');used.add(key);
      let button=clusterButtons.get(key);if(!button){button=document.createElement('button');button.type='button';button.className='g3-cluster g3-under';overlay.append(button);clusterButtons.set(key,button);}
      button.textContent=`+${members.length}`;button.dataset.members=members.map(m=>m.s.id).join('|');
      button.setAttribute('aria-label',lang==='ko'?`패널·상자에 가려진 착륙지 ${members.length}곳 선택`:`Choose among ${members.length} landing sites hidden under a panel`);
      button.onclick=e=>{e.stopPropagation();openCluster(button,members);};
      const bw=button.offsetWidth||34,bh=button.offsetHeight||26;
      const mx=members.reduce((n,m)=>n+m.point.x,0)/members.length+origin.left, my=members.reduce((n,m)=>n+m.point.y,0)/members.length+origin.top;   // keep the button near the hidden dots
      const L=labelIns?.left||0,R=labelIns?.right||0,T=labelIns?.top||0,W=overlay.clientWidth,Hh=overlay.clientHeight;
      const k=typeof bi==='number'?blockers[bi]:bi==='left'?{x0:origin.left,y0:origin.top,w:L,h:Hh}:bi==='right'?{x0:origin.left+W-R,y0:origin.top,w:R,h:Hh}:{x0:origin.left,y0:origin.top,w:W,h:T};
      const spots=bi==='left'?[[k.x0+k.w+6,my-bh/2]]:bi==='right'?[[k.x0-bw-6,my-bh/2],[k.x0-bw-6,my+bh+4],[k.x0-bw-6,my-2*bh-4]]:bi==='top'?[[mx-bw/2,k.y0+k.h+6],[mx-bw*1.5-6,k.y0+k.h+6]]
        :[[mx-bw/2,k.y0+k.h+6],[k.x0-bw-6,k.y0+k.h/2-bh/2],[mx-bw/2,k.y0-bh-6],[k.x0+k.w+6,k.y0+k.h/2-bh/2]];
      let pick=null;
      for(const [ax,ay]of spots){const px=Math.max(origin.left+8,Math.min(ax,origin.left+overlay.clientWidth-bw-8)),py=Math.max(origin.top+(labelIns?.top||0)+4,Math.min(ay,origin.top+overlay.clientHeight-bh-8));
        const a={x0:px,y0:py,w:bw,h:bh};if(!kept.some(q=>overlaps(a,q))){pick=[px,py];break;}}
      if(!pick){const ax=Math.max(origin.left+8,Math.min(spots[0][0],origin.left+overlay.clientWidth-bw-8)),ay=spots[0][1];   // walk up and down the same column to the nearest free spot
        for(let i=1;i<40&&!pick;i++)for(const sg of [1,-1]){const py=ay+sg*i*(bh/2+2);if(py<origin.top+(labelIns?.top||0)+4||py>origin.top+overlay.clientHeight-bh-8)continue;
          if(!kept.some(q=>overlaps({x0:ax,y0:py,w:bw,h:bh},q))){pick=[ax,py];break;}}
        if(!pick)pick=[ax,Math.min(ay,origin.top+overlay.clientHeight-bh-8)];}
      button.style.left=`${pick[0]-origin.left}px`;button.style.top=`${pick[1]-origin.top}px`;kept.push({x0:pick[0],y0:pick[1],w:bw,h:bh});
    }
    for(const [key,button]of clusterButtons)if(!used.has(key)){if(activeCluster===button)closeCluster();button.remove();clusterButtons.delete(key);}
    const order=candidates.filter(m=>!clustered.has(m)).sort((a,b)=>(b.el.dataset.n?1:0)-(a.el.dataset.n?1:0));
    for(const m of order){const q=m.el.getBoundingClientRect(),r={x0:q.left,y0:q.top,w:q.width,h:q.height};const collision=kept.some(k=>overlaps(r,k));
      m.el.classList.toggle('g3-dotonly',collision);
      if(collision)m.el.style.transform=`translate(${m.point.x-7}px,${m.point.y-7}px)`;else kept.push(r);
    }
  }
  const declutterTimer=setInterval(()=>{if(!stopped)declutter();},400);
  function edgeChip(el, worldP, labelEl, placed) {
    const pr = project(worldP);
    if (pr.on) { el.style.display = 'none'; labelEl.style.display = ''; labelEl.style.transform = `translate(${pr.x + 14}px,${pr.y - 8}px)`; return null; }
    labelEl.style.display = 'none';
    const pc = worldP.clone().applyMatrix4(camera.matrixWorldInverse);   // camera space: "behind" points the right way
    let dx = pc.x, dy = -pc.y;
    if (Math.hypot(dx, dy) < 1e-9) dy = 1;
    el.style.display = '';
    el.querySelector('.g3-arr').style.transform = `rotate(${Math.atan2(dy, dx) * R2D - 90}deg)`;   // marker-down points down (90°)
    const W = overlay.clientWidth, H = overlay.clientHeight, ins = { top: 0, right: 0, bottom: 0, left: 0, ...((typeof opts.chipInsets === 'function' ? opts.chipInsets() : opts.chipInsets) || {}) };
    const m = 8, cw = el.offsetWidth || 70, ch = el.offsetHeight || 22;
    // centre-line rectangle the chip centre may travel on
    const x0 = ins.left + m + cw / 2, x1 = W - ins.right - m - cw / 2, y0 = ins.top + m + ch / 2, y1 = H - ins.bottom - m - ch / 2;
    if (x1 <= x0 || y1 <= y0) { el.style.display = 'none'; return null; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const s = Math.min((x1 - cx) / Math.max(Math.abs(dx), 1e-9), (y1 - cy) / Math.max(Math.abs(dy), 1e-9));
    const px = cx + dx * s, py = cy + dy * s;
    // perimeter parameter (clockwise from top-left) <-> point
    const Wd = x1 - x0, Hd = y1 - y0, Ptot = 2 * (Wd + Hd);
    const toT = (x, y) => Math.abs(y - y0) < 0.5 ? x - x0 : Math.abs(x - x1) < 0.5 ? Wd + (y - y0) : Math.abs(y - y1) < 0.5 ? Wd + Hd + (x1 - x) : 2 * Wd + Hd + (y1 - y);
    const toP = t => { t = ((t % Ptot) + Ptot) % Ptot; if (t < Wd) return [x0 + t, y0]; t -= Wd; if (t < Hd) return [x1, y0 + t]; t -= Hd; if (t < Wd) return [x1 - t, y1]; t -= Wd; return [x0, y1 - t]; };
    const ob = avoidList().map(e => { if (!e.isConnected || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(), o = overlay.getBoundingClientRect(); return r.width && r.height ? { x: r.left - o.left - 2, y: r.top - o.top - 2, w: r.width + 4, h: r.height + 4 } : null; }).filter(Boolean);
    if (placed) ob.push({ x: placed.x - 4, y: placed.y - 4, w: placed.w + 8, h: placed.h + 8 });   // keep a gap between the two chips
    const t0 = toT(px, py);
    let best = null;
    for (let k = 0; k <= Ptot / 6 + 1 && !best; k++) for (const sgn of k ? [1, -1] : [1]) {
      const [x, y] = toP(t0 + sgn * k * 6), r = { x: x - cw / 2, y: y - ch / 2, w: cw, h: ch };
      if (!ob.some(o => hit(r, o))) { best = r; break; }
    }
    if (!best) { el.style.display = 'none'; return null; }      // no free spot: hide rather than cover UI
    el.style.transform = `translate(${best.x}px,${best.y}px)`;
    return best;
  }

  // ---------------- camera
  function targetPoint() {
    const ll = latLonFromDir(view.tgt);
    const hT = heightAt(ll.lat, ll.lon);
    view.hT = hT;
    return view.tgt.clone().multiplyScalar(R + hT / 1000 * exag);
  }
  function maxTilt() { return view.range < 300 ? 80 : view.range > 4000 ? 0 : 80 * (1 - Math.log(view.range / 300) / Math.log(4000 / 300)); }
  function placeCamera() {
    view.tilt = Math.max(0, Math.min(maxTilt(), view.tilt));
    // keep hvec tangent + unit
    view.hvec.addScaledVector(view.tgt, -view.hvec.dot(view.tgt)).normalize();
    const P = targetPoint(), up = view.tgt, t = view.tilt * D2R;
    const off = up.clone().multiplyScalar(Math.cos(t)).addScaledVector(view.hvec, -Math.sin(t)).multiplyScalar(view.range);
    const pos = P.clone().add(off);
    // keep the camera above the terrain
    const llc = latLonFromDir(pos), floor = R + (heightAt(llc.lat, llc.lon) / 1000) * exag + Math.max(0.02, view.range * 0.02);
    if (pos.length() < floor) pos.setLength(floor);
    camera.position.copy(pos);
    camera.up.copy(up.clone().multiplyScalar(Math.sin(t)).addScaledVector(view.hvec, Math.cos(t)).normalize());
    camera.lookAt(P);
    const alt = pos.length() - R;
    camera.near = Math.max(0.0005, alt * 0.0005); camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // light: shadow box around the target, aligned with the Sun
    const S = Math.min(2400, Math.max(4, view.range * (1.3 + 1.7 * Math.sin(t))));
    const depth = Math.min(view.range > 1500 ? 3600 : 600, S + 250);         // casters up to ~250 km beyond the box toward the Sun
    sun.target.position.copy(P);
    sun.position.copy(P).addScaledVector(sunDir, depth);
    earthshine.target.position.copy(P); earthshine.position.copy(P).add(earthPos.clone().setLength(1000));
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -S; sc.right = sc.top = S; sc.near = 0.5; sc.far = depth + S + 20;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = (2 * S / 4096) * 1.5;
    sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
    // sprites
    sunSprite.position.copy(pos).addScaledVector(sunDir, 2e5);
    const eDir = earthPos.clone().sub(pos).normalize();
    earthSprite.position.copy(pos).addScaledVector(eDir, 1.5e5);
  }

  function getView() {
    const ll = latLonFromDir(view.tgt), { east, north } = enu(view.tgt);
    return { lat: ll.lat, lon: ll.lon, range: view.range, tilt: view.tilt, heading: (Math.atan2(view.hvec.dot(east), view.hvec.dot(north)) * R2D + 360) % 360, exaggeration: exag, hour };
  }
  function setView({ lat, lon, range, tilt, heading }) {
    const cur = getView();
    lat = lat ?? cur.lat; lon = lon ?? cur.lon; heading = heading ?? cur.heading;
    view.tgt = dirFromLatLon(lat, lon);
    const { east, north } = enu(view.tgt);
    view.hvec = north.multiplyScalar(Math.cos(heading * D2R)).addScaledVector(east, Math.sin(heading * D2R));
    if (range != null) view.range = range;
    if (tilt != null) view.tilt = tilt;
    dirty = true;
  }
  function flyTo(dest, ms = 2200) {
    const a = getView();
    const b = { ...a, ...dest };
    if (b.heading - a.heading > 180) b.heading -= 360; else if (a.heading - b.heading > 180) b.heading += 360;
    const d0 = view.tgt.clone(), d1 = dirFromLatLon(b.lat, b.lon), ang = d0.angleTo(d1);
    const peak = Math.max(a.range, b.range, ang * R * 1.2);
    fly = { t0: performance.now(), ms: ang < 1e-6 && Math.abs(a.range - b.range) < 1e-6 ? 600 : ms, a, b, d0, d1, ang, peak };
    return new Promise(res => { fly.done = res; });
  }
  function stepFly(now) {
    if (!fly) return;
    let u = Math.min(1, (now - fly.t0) / fly.ms);
    const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    const { a, b, d0, d1, ang, peak } = fly;
    const tgt = ang > 1e-6 ? d0.clone().multiplyScalar(Math.sin((1 - e) * ang) / Math.sin(ang)).addScaledVector(d1, Math.sin(e * ang) / Math.sin(ang)) : d1.clone();
    const la = Math.log(a.range), lb = Math.log(b.range), lp = Math.log(peak);
    const lr = (1 - e) * (1 - e) * la + 2 * e * (1 - e) * lp + e * e * lb;   // quadratic bezier in log-range
    const ll = latLonFromDir(tgt);
    setView({ lat: ll.lat, lon: ll.lon, range: Math.exp(lr), tilt: a.tilt + (b.tilt - a.tilt) * e, heading: a.heading + (b.heading - a.heading) * e });
    if (u >= 1) { const f = fly; fly = null; f.done?.(); emit('view', getView()); }
  }
  function focusSite(id, o = {}) {
    const s = sites.find(x => x.id === id); if (!s) return Promise.resolve();
    return flyTo({ lat: s.lat, lon: s.lon, range: o.range ?? 40, tilt: o.tilt ?? 60, heading: o.heading ?? getView().heading });
  }

  // ---------------- input
  const el = renderer.domElement;
  const ptrs = new Map();
  let mode = null, last = null, pinch = null;
  const mpp = () => 2 * view.range * Math.tan(camera.fov * D2R / 2) / el.clientHeight;   // km per pixel at the target
  function pan(dxPx, dyPx) {
    const right = v3().crossVectors(view.hvec, view.tgt).normalize();          // screen-right on the ground
    const move = right.multiplyScalar(-dxPx).addScaledVector(view.hvec, dyPx / Math.max(0.3, Math.cos(view.tilt * D2R))).multiplyScalar(mpp());
    const dist = move.length(); if (dist < 1e-12) return;
    const axis = v3().crossVectors(view.tgt, move).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(axis, dist / R);
    view.tgt.applyQuaternion(q).normalize(); view.hvec.applyQuaternion(q);
    dirty = true;
  }
  function rotate(dxPx, dyPx) {
    const q = new THREE.Quaternion().setFromAxisAngle(view.tgt, dxPx * 0.005);
    view.hvec.applyQuaternion(q);
    view.tilt = Math.max(0, Math.min(maxTilt(), view.tilt + dyPx * 0.25));
    dirty = true;
  }
  function zoom(f) { view.range = Math.max(0.05, Math.min(25000, view.range * f)); dirty = true; }
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    el.focus({ preventScroll: true }); fly = null;
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [p, q] = [...ptrs.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), a: Math.atan2(q.y - p.y, q.x - p.x), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
      mode = 'pinch';
    } else {
      mode = (e.button === 2 || e.shiftKey || e.button === 1) ? 'rotate' : 'pan';
      last = { x: e.clientX, y: e.clientY };
    }
  });
  el.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch' && ptrs.size === 2) {
      const [p, q] = [...ptrs.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y), a = Math.atan2(q.y - p.y, q.x - p.x), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      zoom(pinch.d / Math.max(d, 1));
      view.hvec.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(view.tgt, a - pinch.a));
      pan(mx - pinch.mx, my - pinch.my);
      pinch = { d, a, mx, my };
    } else if (last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      if (mode === 'rotate') rotate(dx, dy); else if (mode === 'pan') pan(dx, dy);
    }
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { mode = null; last = null; emit('view', getView()); } else if (ptrs.size === 1) { const p = [...ptrs.values()][0]; last = { x: p.x, y: p.y }; mode = 'pan'; } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // opts.wheelNeedsFocus: on a scrolling page the wheel zooms only after the globe was clicked / focused,
  // otherwise the page scrolls and a 'wheelhint' event lets the page show "click the globe first".
  el.addEventListener('wheel', e => {
    if (opts.wheelNeedsCtrl && !(e.ctrlKey || e.metaKey)) { emit('wheelhint'); return; }      // plain wheel scrolls the page
    if (!opts.wheelNeedsCtrl && opts.wheelNeedsFocus && document.activeElement !== el) { emit('wheelhint'); return; }
    e.preventDefault(); fly = null; zoom(Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
  }, { passive: false });
  el.addEventListener('keydown', e => {
    const k = e.key, step = 60;
    const rot = e.shiftKey;
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (map[k]) { const [x, y] = map[k]; if (rot) rotate(x * 20, -y * 12); else pan(-x * step, -y * step); e.preventDefault(); }
    else if (k === '+' || k === '=' || k === 'PageUp') { zoom(0.8); e.preventDefault(); }
    else if (k === '-' || k === '_' || k === 'PageDown') { zoom(1.25); e.preventDefault(); }
    else if (k === 'n' || k === 'N') { setView({ heading: 0 }); }
    else if (k === 'r' || k === 'R') { flyTo({ tilt: 0, heading: 0 }); }
  });

  // ---------------- resize, loop
  let roW = 0, roH = 0;
  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300; roW = w; roH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // optional: put the projection centre at the middle of the free map area (panels float over the stage)
    const shift = typeof opts.centerShift === 'function' ? Math.round(opts.centerShift(w, h) || 0) : 0;
    if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); dirty = true;
  }
  const ro = new ResizeObserver(() => { if ((container.clientWidth || 300) !== roW || (container.clientHeight || 300) !== roH) resize(); }); ro.observe(container); resize();   // same size: skip

  // Pause completely while the globe is scrolled out of view (the page has panels below it).
  let onScreen = true;
  const io = new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); if (onScreen) dirty = true; });
  io.observe(container);

  // Adaptive quality: if continuous rendering runs below ~25 fps, step down
  // (1: pixel ratio 1, 2: 2048² shadow map, 3: coarser terrain LOD).
  let quality = 0, slowN = 0, lastRender = 0;
  function adapt(now) {
    const dt = now - lastRender; lastRender = now;
    if (dt > 100 || document.hidden) return;              // not continuous (idle gap) -> no measurement
    slowN = dt > 40 ? slowN + 1 : Math.max(0, slowN - 2);
    if (slowN < 45 || quality >= 3) return;
    slowN = 0; quality++;
    if (quality === 1 && renderer.getPixelRatio() <= 1) quality = 2;
    if (quality === 1) { renderer.setPixelRatio(1); resize(); }
    else if (quality === 2) { sun.shadow.mapSize.set(2048, 2048); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    dirty = true; stats.quality = quality;
  }

  // Render on demand: only when something changed (camera, time, tiles, flight) plus a short tail so the HUD settles.
  let raf = 0, fps = 0, fpsT = performance.now(), fpsN = 0, hudT = 0, stopped = false, tailUntil = 0;
  const stats = { fps: 0, tiles: 0, loaded: 0, triangles: 0, geometries: 0, textures: 0, pending: 0, quality: 0, renders: 0 };
  function frame(now, manual = false) {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (!onScreen && !manual) return;
    pumpLoads();
    // build decoded tiles within a time budget so streaming never blocks scrubbing for long
    const tb = performance.now();
    let built = 0;
    while (buildQueue.length && (built === 0 || performance.now() - tb < 6)) { const t = buildQueue.shift(); if (t.state === 'decoded') { buildMesh(t); built++; } }
    if (built) dirty = true;
    stats.pending = queue.size + loading + buildQueue.length + (hiresState === 'loading' ? 1 : 0);
    if (fly) dirty = true;
    if (dirty) { tailUntil = now + 300; dirty = false; }
    else if (now > tailUntil) { fpsN = 0; fpsT = now; return; }   // idle: nothing to draw
    frameNo++; stats.renders++;
    if (!manual) adapt(now);
    stepFly(now);
    placeCamera();
    if (view.range < HIRES_RANGE) loadHires();
    select();
    if (frameNo % 30 === 0) evict();
    // overlays
    const w = el.clientWidth, h = el.clientHeight, camPos = camera.position;
    // visible area for site names: the caller may report panels floating over the globe (opts.labelInsets())
    if (typeof opts.labelInsets === 'function' && (frameNo % 30 === 0 || !labelIns)) labelIns = opts.labelInsets() || {};
    const L0 = (labelIns && labelIns.left) || 0, R0 = w - ((labelIns && labelIns.right) || 0), T0 = (labelIns && labelIns.top) || 0;
    for (const m of siteEls) {
      if (m.h == null || frameNo % 20 === 0) m.h = heightAt(m.s.lat, m.s.lon);
      const p = m.dir.clone().multiplyScalar(R + m.h / 1000 * exag);
      const facing = m.dir.dot(camPos.clone().sub(p)) > 0;
      const pr = project(p);
      const show = facing && pr.on && view.range < 9000;
      m.point = show ? {x:pr.x,y:pr.y} : null;
      m.el.style.display = show ? '' : 'none';
      if (show) {
        // keep the name inside the view: flip it to the left of the dot near the right edge, fade it near top/bottom
        const lw = (frameNo % 60 === 0 || !m.lw) ? (m.lw = m.el.offsetWidth || 80) : m.lw;
        const flip = pr.x + lw > R0 - 6 && pr.x - lw > L0;
        if (flip !== !!m.flip) { m.flip = flip; m.el.classList.toggle('g3-flip', flip); }
        m.el.style.transform = flip && !m.el.classList.contains('g3-dotonly') ? `translate(${pr.x - lw + 7}px,${pr.y - 7}px)` : `translate(${pr.x - 7}px,${pr.y - 7}px)`;
        const edge = Math.min(pr.y - 4 - T0, h - pr.y - 4, flip ? pr.x - lw - L0 : R0 - pr.x - lw, pr.x - L0, R0 - pr.x);
        m.el.style.opacity = edge < 18 ? String(Math.max(0.25, edge / 18)) : '';
        m.box = { x0: flip ? pr.x - lw + 7 : pr.x - 7, y0: pr.y - 7, w: lw, h: 14 };
      } else m.box = null;
    }
    // declutter: names must not overlap. Compared sites (data-n, set by the app) first, then catalogue order;
    // a name that would overlap one already placed shows only its dot (the dot stays on the site).
    if (frameNo % 3 === 0) declutter();
    const placedSun = edgeChip(chipSun, sunSprite.position, labSun, null);
    edgeChip(chipEarth, earthSprite.position, labEarth, placedSun);
    if (now - hudT > 250) {
      hudT = now;
      const v = getView(), upv = view.tgt, { east, north } = enu(upv);
      const P = upv.clone().multiplyScalar(R + (view.hT || 0) / 1000);
      const sEl = Math.asin(sunDir.dot(upv)) * R2D, sAz = (Math.atan2(sunDir.dot(east), sunDir.dot(north)) * R2D + 360) % 360;
      const ev = earthPos.clone().sub(P).normalize();
      const eEl = Math.asin(ev.dot(upv)) * R2D, eAz = (Math.atan2(ev.dot(east), ev.dot(north)) * R2D + 360) % 360;
      if (frameNo % 4 === 0 || !view.hor) {
        view.hor = { s: v.range < 600 ? horizonEl(v.lat, v.lon, sAz, view.hT || 0) : null, e: v.range < 600 ? horizonEl(v.lat, v.lon, eAz, view.hT || 0) : null };
      }
      const vis = (el_, hz) => hz == null ? '' : el_ > hz ? ' ✓ above terrain' : ' ✗ hidden by terrain';
      const time = new Date(T0_MS + hour * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      hud.innerHTML = `${time}<br>target ${v.lat.toFixed(3)}°, ${v.lon.toFixed(3)}° · h ${(view.hT || 0).toFixed(0)} m · range ${v.range < 10 ? v.range.toFixed(2) : v.range.toFixed(0)} km<br>`
        + `<b class="sun">Sun el ${sEl.toFixed(2)}°</b> az ${sAz.toFixed(1)}°${vis(sEl, view.hor.s)}<br>`
        + `<b class="earth">Earth el ${eEl.toFixed(2)}°</b> az ${eAz.toFixed(1)}°${vis(eEl, view.hor.e)}<br>`
        + `exaggeration ×${exag} · ${stats.fps} fps · ${selected.length} tiles`;
      stats.sunEl = sEl; stats.earthEl = eEl; stats.horizon = view.hor;
    }
    renderer.render(scene, camera);
    fpsN++;
    if (now - fpsT > 1000) { stats.fps = fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; }
    stats.tiles = selected.length; stats.loaded = [...tiles.values()].filter(t => t.state === 'ready').length;
    stats.triangles = renderer.info.render.triangles; stats.geometries = renderer.info.memory.geometries; stats.textures = renderer.info.memory.textures;
  }

  function setTime(t) {
    const hNew = t instanceof Date ? (t.getTime() - T0_MS) / 3600e3 : +t;
    if (hNew === hour && hour !== 0) return;
    hour = hNew;
    updateBodies(); dirty = true; emit('time', hour);
  }
  function setExaggeration(x) { exag = x; elevExag.value = x; for (const s of siteEls) s.h = null; updateNote(); dirty = true; }
  function setLang(l) {
    closeCluster();
    lang = l === 'ko' ? 'ko' : 'en';
    for (const m of siteEls) {
      updateSiteLabel(m.s, m.el);
      m.lw = 0;
    }
    updateNote();
    chipSun.lastChild.textContent = lang === 'ko' ? ' 태양' : ' Sun';
    chipEarth.lastChild.textContent = lang === 'ko' ? ' 지구' : ' Earth';
    dirty = true;
    declutter();
  }

  setTime(opts.hour ?? 0);
  if (opts.view) setView(opts.view);
  raf = requestAnimationFrame(frame);

  /** Replace the surface colour by an equirectangular data map (lon -180 at the left edge, same as the colour kit),
   *  e.g. the 2026-2030 mean-sunlight overview; null restores the LROC colour. The layer is drawn at LAYER_OPACITY
   *  over a fixed-light LOLA hillshade (shader above), so terrain stays visible and the selected time's night side
   *  does not darken a long-term average. `flat` is kept for API compatibility. */
  async function setColorMap(url, { flat = true } = {}) {
    if (!baseTex) baseTex = colorTex.value;
    layerUrl = url || null;
    if (!url) {
      layerA.value = 0; layerU.value = null;
      if (layerTex) { layerTex.dispose(); layerTex = null; }
      colorTex.value = baseTex; dirty = true; return;
    }
    const t = typeof url === 'string' ? await texLoader.loadAsync(url) : new THREE.CanvasTexture(url);   // URL or a stitched canvas
    if (layerUrl !== url) { t.dispose(); return; }          // a newer call won
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.generateMipmaps = true;
    if (layerTex) layerTex.dispose();
    layerTex = t; layerU.value = t; layerA.value = LAYER_OPACITY;
    dirty = true;
  }

  /** Elevation layer: colour each fragment by its true LOLA height (the same decoded tile heights as the terrain mesh)
   *  on a ramp of hex colours from min to max km (clamped), over the fixed-light hillshade. null/false turns it off. */
  function setElevation(opt) {
    if (!opt) { elevOn.value = 0; dirty = true; return; }
    const st = opt.stops; elevRange.value.set(opt.min, opt.max);
    for (let k = 0; k < 9; k++) elevRamp.value[k].set(st[Math.round(k * (st.length - 1) / 8)]);   // hex -> linear
    elevExag.value = exag; elevOn.value = 1; dirty = true;
  }

  /** lat/lon (deg) of the terrain under a client (page) pixel, or null when the ray misses the Moon. */
  const ray = new THREE.Raycaster();
  function screenToLatLon(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
    const meshes = []; for (const t of tiles.values()) if (t.mesh && t.mesh.visible) meshes.push(t.mesh);
    const hit = ray.intersectObjects(meshes, false)[0];
    let p = hit ? hit.point : null;
    if (!p) {                                                 // fall back to the mean sphere
      const o = ray.ray.origin, d = ray.ray.direction, b = o.dot(d), c = o.dot(o) - R * R, disc = b * b - c;
      if (disc < 0) return null;
      p = o.clone().addScaledVector(d, -b - Math.sqrt(disc));
    }
    return latLonFromDir(p);
  }

  const api = {
    setTime, flyTo, focusSite, setView, getView, setExaggeration, setLang, setColorMap, setElevation, screenToLatLon,
    maxTextureSize: () => renderer.capabilities.maxTextureSize,
    // manual frames (tests / hidden tabs where requestAnimationFrame is paused); also loads tiles until idle
    async step(maxMs = 20000) {
      const t0 = performance.now(); let calm = 0;
      while (performance.now() - t0 < maxMs) {
        frame(performance.now(), true); cancelAnimationFrame(raf);
        await new Promise(r => setTimeout(r, 16));
        calm = stats.pending === 0 && !fly ? calm + 1 : 0;
        if (calm >= 4) break;
      }
      hudT = 0; view.hor = null; dirty = true;
      for (let k = 0; k < 2; k++) { frame(performance.now(), true); cancelAnimationFrame(raf); }
      raf = requestAnimationFrame(frame);
      return { ...stats, ms: Math.round(performance.now() - t0) };
    },
    get exaggeration() { return exag; },
    heightAt, stats, sites,
    sunDirection: () => sunDir.clone(), earthPosition: () => earthPos.clone(),
    waitIdle: async (timeout = 30000) => { const t0 = performance.now(); let calm = 0; while (performance.now() - t0 < timeout) { await new Promise(r => setTimeout(r, 100)); calm = stats.pending === 0 && !fly ? calm + 1 : 0; if (calm >= 5) return true; } return false; },
    on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter(f => f !== fn); }; },
    dispose() { stopped = true; clearInterval(declutterTimer); colorWorker?.terminate(); colorWorker = null; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); for (const t of tiles.values()) disposeTile(t); colorTex.value?.dispose(); renderer.dispose(); overlay.remove(); el.remove(); },
    _internal: { scene, camera, renderer, tiles },
  };
  return api;
}
