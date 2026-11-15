// minimap.js — where the 3D view is looking (design spec v65 §3.8). A small orthographic Moon drawn from the same
// colour map as the 3D globe (NASA SVS CGI Moon Kit, data/globe/moon_color_2k.jpg); white ring = current view,
// labels = pinned sites. The expand button opens coordinates and catalogue destinations.
// Drag the ball to rotate it; click to fly the 3D view. Box movement/resize lives in minimap_drag.js.
import { t, getLang } from './i18n.js';
import { addStrings, whenReady, setFocus, LLSN, mapSiteColors } from './ui_shared.js';

addStrings({
  mmAria: 'Mini map: where the 3D view is looking. Open for coordinate search.', mmSearch: 'Coordinates', mmPh: 'e.g. −89.45, −136.2 or 89.45S 136.2W',
  mmGo: 'Go', mmAnalyse: 'Analyze this point', mmBadLat: 'Latitude must be −90…90', mmBadLon: 'Longitude must be −180…180', mmBad: 'Use “lat, lon” or “89.45S 136.2W”',
  mmOpen: 'Expand the minimap', mmClose: 'Shrink the minimap', mmPinned: 'Pinned', mmTop: 'Top 5 (current sort)', mmRecent: 'Recently viewed', mmHere: 'Moved to {c}. Press “Analyze this point” to compute its terrain horizon.',
}, {
  mmAria: '미니맵: 3D가 보고 있는 곳. 열면 좌표 검색.', mmSearch: '좌표', mmPh: '예: −89.45, −136.2 또는 89.45S 136.2W',
  mmGo: '이동', mmAnalyse: '이 지점 분석', mmBadLat: '위도는 −90~90', mmBadLon: '경도는 −180~180', mmBad: '"위도, 경도" 또는 "89.45S 136.2W" 형식',
  mmOpen: '미니맵 크게 보기', mmClose: '미니맵 작게', mmPinned: '고정한 후보', mmTop: '대표 후보 (지금 정렬 상위 5)', mmRecent: '최근 방문', mmHere: '{c}(으)로 이동했습니다. "이 지점 분석"을 누르면 지형 지평선을 계산합니다.',
});

addStrings({mmLat:'Lat',mmLon:'Lon',mmGoto:'Go to',mmSouth:'South Pole',mmNorth:'North Pole',mmPole:'Pole',mmTerrain:'Terrain',mmPast:'Past landing',mmLatitude:'Latitude',mmLongitude:'Longitude'}, {mmLat:'위도',mmLon:'경도',mmGoto:'바로 가기',mmSouth:'남극점',mmNorth:'북극점',mmPole:'극지',mmTerrain:'지형',mmPast:'역대 착륙지',mmLatitude:'위도',mmLongitude:'경도'});

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const nameOf = s => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name);
let box, cv, img = null, pix = null, IW = 0, IH = 0, view = { lat: 0, lon: 0, range: 6000 }, own = null, lastPick = null;

/** "lat, lon" | "89.45S 136.2W" | with ° → {lat, lon} or {err}. */
export function parseCoords(str) {
  const s = String(str).trim().replace(/[°º]/g, ' ').replace(/−/g, '-');
  let m = s.match(/^([+-]?\d+(?:\.\d+)?)\s*([NSns])?[\s,;]+([+-]?\d+(?:\.\d+)?)\s*([EWew])?$/);
  if (!m) return { err: 'mmBad' };
  let lat = Number(m[1]), lon = Number(m[3]);
  if (m[2] && /s/i.test(m[2])) lat = -Math.abs(lat);
  if (m[4] && /w/i.test(m[4])) lon = -Math.abs(lon);
  if (!(lat >= -90 && lat <= 90)) return { err: 'mmBadLat' };
  if (!(lon >= -180 && lon <= 180)) return { err: 'mmBadLon' };
  return { lat, lon };
}

function build() {
  box = document.getElementById('ls-minimap'); if (!box) return;
  box.setAttribute('role', 'region');
  box.innerHTML = `<button type="button" class="mm-exp" aria-expanded="false"></button><canvas class="mm-ball"></canvas>
    <div class="mm-side" hidden>
      <form class="mm-coords" novalidate>${[['lat','S','N','00.00',90],['lon','E','W','000.00',180]].map(([axis,a,b,placeholder,max]) => `<div class="mm-coord"><label for="mm-${axis}" data-axis="${axis}"></label><input id="mm-${axis}" type="number" min="0" max="${max}" step="any" inputmode="decimal" placeholder="${placeholder}"><span aria-hidden="true">°</span><div class="mm-hemis" role="group">${[a,b].map((h,i)=>`<button type="button" data-axis="${axis}" data-hemi="${h}" aria-pressed="${i===0}">${h}</button>`).join('')}</div></div>`).join('')}<button type="submit" class="sr mm-submit"></button></form>
      <p class="mm-err" aria-live="polite"></p><button type="button" class="ls-btn mm-an" hidden></button>
      <div class="mm-list-title"></div><div class="mm-lists"></div></div>`;
  cv = box.querySelector('canvas');
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas'); IW = 512; IH = 256; c.width = IW; c.height = IH;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, IW, IH); pix = g.getImageData(0, 0, IW, IH).data; img = im; draw();
  };
  im.src = `${LLSN().state.base}globe/moon_color_2k.jpg`;
  relabel();
  // open / close
  const openIt = () => { if (!box.classList.contains('open')) { box.classList.add('open'); own = null; box.querySelector('.mm-side').hidden = false; sizeBall(); lists(); } };
  // Expand left and down; positioning and size persistence are managed by minimap_drag.js.
  const exp = box.querySelector('.mm-exp');
  const closeIt = () => { box.classList.remove('open'); box.querySelector('.mm-side').hidden = true; own = null; sizeBall(); expLabel(); };
  exp.addEventListener('click', () => { if (box.classList.contains('open')) closeIt(); else { openIt(); expLabel(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) { e.preventDefault(); closeIt(); exp.focus(); } });
  document.addEventListener('pointerdown', e => { if (!box.contains(e.target) && box.classList.contains('open')) closeIt(); });
  // drag rotates the minimap only; a click flies the 3D view there
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: false, c: own || { lat: view.lat, lon: view.lon } }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    if (drag.moved && box.classList.contains('open')) { own = { lat: Math.max(-89, Math.min(89, drag.c.lat + dy * 0.8)), lon: drag.c.lon - dx * 0.8 }; draw(); }
  });
  cv.addEventListener('pointerup', e => {
    if (drag && !drag.moved) { const ll = ballToLatLon(e); if (ll) { lastPick = ll; fly(ll.lat, ll.lon); draw(); } }
    drag = null;
  });
  cv.addEventListener('pointercancel', () => { drag = null; });
  const side = box.querySelector('.mm-side');
  side.querySelector('form').addEventListener('submit', e => { e.preventDefault(); go(); });
  side.querySelectorAll('[data-hemi]').forEach(button => button.addEventListener('click', () => {
    side.querySelectorAll(`[data-hemi][data-axis="${button.dataset.axis}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  side.querySelector('.mm-an').addEventListener('click', () => { if (lastPick) LLSN().pickPoint?.(lastPick.lat, lastPick.lon, { compute: true }); side.querySelector('.mm-an').hidden = true; });
  side.addEventListener('click', e => {
    const b = e.target.closest('[data-site], [data-pole]'); if (!b) return;
    if (b.dataset.pole) { own = {lat:Number(b.dataset.pole),lon:0}; fly(own.lat,0); }
    else { const s = LLSN().state.sites.find(s => s.id === b.dataset.site); if(s) { setFocus(s.id); own = {lat:s.lat,lon:s.lon}; fly(s.lat,s.lon); } }
    draw();
  });
  window.addEventListener('llsn:lang', () => { relabel(); lists(); draw(); });
  window.addEventListener('llsn:pins', () => { draw(); lists(); });
  for (const event of ['llsn:sort', 'llsn:window', 'llsn:sites', 'llsn:relay']) window.addEventListener(event, () => { lists(); draw(); });
  window.addEventListener('llsn:focus', () => { lists(); draw(); });
  let resizeTimer = 0;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(sizeBall, 60); }).observe(box);
  sizeBall();
  window.dispatchEvent(new Event('llsn:minimap-ready'));
  setInterval(() => { const g = LLSN().globe; if (!g) return; const v = g.getView(); if (Math.abs(v.lat - view.lat) + Math.abs(v.lon - view.lon) + Math.abs(v.range - view.range) / 50 > 0.05) { view = v; draw(); } }, 400);
}
function expLabel() {
  const b = box.querySelector('.mm-exp'), open = box.classList.contains('open');
  b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', t(open ? 'mmClose' : 'mmOpen')); b.title = t(open ? 'mmClose' : 'mmOpen');
  b.innerHTML = open ? '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9 7l5-5M10 2h4v4M7 9l-5 5M2 10v4h4" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(180 8 8)"/></svg>'
    : '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14l5-5M2 10v4h4M14 2L9 7M10 2h4v4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
}
function relabel() {
  expLabel();
  box.setAttribute('aria-label', t('mmAria'));
  const s = box.querySelector('.mm-side');
  for (const axis of ['lat','lon']) {
    const label = t(axis === 'lat' ? 'mmLatitude' : 'mmLongitude');
    s.querySelector(`label[data-axis="${axis}"]`).textContent = t(axis === 'lat' ? 'mmLat' : 'mmLon');
    s.querySelector(`#mm-${axis}`).setAttribute('aria-label',label);
    s.querySelector(`#mm-${axis}`).closest('.mm-coord').querySelector('[role="group"]').setAttribute('aria-label',label);
  }
  s.querySelector('.mm-submit').textContent = t('mmGo'); s.querySelector('.mm-an').textContent = t('mmAnalyse');
  s.querySelector('.mm-list-title').innerHTML = `${miniIcon('pin')}<span>${esc(t('mmGoto'))}</span>`;
}
function sizeBall() {
  const open = box.classList.contains('open'), width = box.clientWidth, height = box.clientHeight;
  const panel = open ? Math.min(214, Math.max(150, width * .37)) : 0;
  const d = Math.max(1, Math.floor(Math.min(width - (open ? panel + 34 : 20), height - 26)));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  box.style.setProperty('--mm-panel', panel + 'px');
  box.style.setProperty('--mm-ball', d + 'px');
  cv.width = Math.round(d * dpr); cv.height = Math.round(d * dpr);
  cv.style.width = cv.style.height = d + 'px';
  draw();
}

function center() { return own || view; }
function ballToLatLon(e) {
  const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - ((e.clientY - r.top) / r.height) * 2;
  const rr = x * x + y * y; if (rr > 1) return null;
  const z = Math.sqrt(1 - rr), c = center(), la = c.lat * D2R, lo = c.lon * D2R;
  // inverse orthographic
  const lat = Math.asin(z * Math.sin(la) + y * Math.cos(la)) * R2D;
  const lon = (lo + Math.atan2(x, z * Math.cos(la) - y * Math.sin(la))) * R2D;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}
function project(lat, lon) {
  const c = center(), la = c.lat * D2R, lo = c.lon * D2R, p = lat * D2R, l = lon * D2R;
  const cosc = Math.sin(la) * Math.sin(p) + Math.cos(la) * Math.cos(p) * Math.cos(l - lo);
  return { x: Math.cos(p) * Math.sin(l - lo), y: Math.cos(la) * Math.sin(p) - Math.sin(la) * Math.cos(p) * Math.cos(l - lo), front: cosc > 0 };
}
function draw() {
  if (!cv) return;
  const W = cv.width, H = cv.height, g = cv.getContext('2d'), R = W / 2;
  g.clearRect(0, 0, W, H);
  if (pix) {
    const im = g.createImageData(W, H), c = center(), la = c.lat * D2R, lo = c.lon * D2R, sl = Math.sin(la), cl = Math.cos(la);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) / R - 1, y = 1 - (j + 0.5) / R, rr = x * x + y * y; if (rr > 1) continue;
      const z = Math.sqrt(1 - rr), lat = Math.asin(z * sl + y * cl), lon = lo + Math.atan2(x, z * cl - y * sl);
      const u = ((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1, v = 0.5 - lat / Math.PI;
      const si = (Math.min(IH - 1, Math.floor(v * IH)) * IW + Math.min(IW - 1, Math.floor(u * IW))) * 4, di = (j * W + i) * 4;
      const sh = 0.55 + 0.45 * z;
      im.data[di] = pix[si] * sh; im.data[di + 1] = pix[si + 1] * sh; im.data[di + 2] = pix[si + 2] * sh; im.data[di + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  } else { g.fillStyle = '#555'; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill(); }
  const dpr = W / parseFloat(cv.style.width || W);
  g.strokeStyle = 'rgba(237,237,237,.28)'; g.lineWidth = .75 * dpr;
  const curve = points => { g.beginPath(); let pen=false; for(const [lat,lon] of points) { const q=project(lat,lon); if(!q.front){pen=false;continue;} const x=R+q.x*R,y=R-q.y*R; if(pen)g.lineTo(x,y);else g.moveTo(x,y);pen=true; } g.stroke(); };
  for(let lat=-60;lat<=60;lat+=30)curve(Array.from({length:181},(_,i)=>[lat,i*2-180]));
  for(let lon=-180;lon<180;lon+=30)curve(Array.from({length:91},(_,i)=>[i*2-90,lon]));
  // All candidates share their 3D colours; draw numbered comparison pins last.
  const colors = mapSiteColors(), pins = LLSN().pins?.() || [];
  const pinnedIds = new Set(pins.map(p => p.id));
  for (const s of LLSN().state.sites) {
    if (pinnedIds.has(s.id)) continue;
    const q = project(s.lat, s.lon); if (!q.front) continue;
    g.fillStyle = colors.get(s.id) || '#EDEDED'; g.strokeStyle = '#0a0a0b'; g.lineWidth = dpr;
    g.beginPath(); g.arc(R + q.x * R, R - q.y * R, 2 * dpr, 0, 7); g.fill(); g.stroke();
  }
  // Pinned labels use separate pills, including nearby polar candidates.
  const pills=[];
  // pin numbers in the screen's number font (Geist Mono in English, Oxanium in Korean)
  g.font = `${10 * dpr}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-num').trim() || 'Oxanium, monospace'}`; g.textBaseline = 'middle';
  for (const pn of pins) {
    const s = LLSN().state.sites.find(x => x.id === pn.id); if (!s) continue;
    const q = project(s.lat, s.lon); if (!q.front) continue;
    const x = R + q.x * R, y = R - q.y * R;
    const pc = getComputedStyle(document.documentElement).getPropertyValue('--c' + pn.n).trim() || '#ededed';   // 18-2: the candidate's own colour
    g.fillStyle = pc; g.beginPath(); g.arc(x, y, 2.4 * dpr, 0, 7); g.fill();
    const label=`#${pn.n}`, tw=g.measureText(label).width, tx=Math.min(W-tw-8*dpr,Math.max(4*dpr,x+4*dpr));
    let ty=Math.max(8*dpr,Math.min(H-8*dpr,y));
    while(pills.some(p=>Math.abs(p.y-ty)<16*dpr&&tx<p.x+p.w&&tx+tw+6*dpr>p.x)&&ty>24*dpr)ty-=16*dpr;
    pills.push({x:tx,y:ty,w:tw+6*dpr});
    g.fillStyle=pc; g.beginPath(); g.roundRect(tx-3*dpr,ty-7*dpr,tw+6*dpr,14*dpr,7*dpr); g.fill();g.fillStyle='#0a0a0b';g.fillText(label,tx,ty);
  }
  if(lastPick){const q=project(lastPick.lat,lastPick.lon);if(q.front){g.fillStyle='#fff';g.font=`${16*dpr}px sans-serif`;g.fillText('★',R+q.x*R-7*dpr,R-q.y*R);}}
  const f = LLSN().state.sites.find(x => x.id === LLSN().focus);
  if (f) { const q = project(f.lat, f.lon); if (q.front) { g.strokeStyle = colors.get(f.id) || '#EDEDED'; g.lineWidth = 1.5 * dpr; g.beginPath(); g.arc(R + q.x * R, R - q.y * R, 4 * dpr, 0, 7); g.stroke(); } }
}
function fly(lat, lon) {
  const g = LLSN().globe; if (!g) return;
  g.flyTo({ lat, lon, range: Math.min(view.range, 900), tilt: 30 });
}
function go() {
  const side = box.querySelector('.mm-side'), err = side.querySelector('.mm-err');
  const lat = side.querySelector('#mm-lat').value.trim(), lon = side.querySelector('#mm-lon').value.trim();
  const h = axis => side.querySelector(`[data-hemi][data-axis="${axis}"][aria-pressed="true"]`).dataset.hemi;
  const r = !lat || !lon ? {err:'mmBad'} : Number(lat)<0 || Number(lat)>90 ? {err:'mmBadLat'} : Number(lon)<0 || Number(lon)>180 ? {err:'mmBadLon'} : parseCoords(`${lat}${h('lat')} ${lon}${h('lon')}`);
  if (r.err) { err.textContent = t(r.err); return; }
  err.textContent = ''; own = r; fly(r.lat, r.lon); lastPick = r; draw();
  LLSN().pickPoint?.(r.lat, r.lon, { compute: false });
  side.querySelector('.mm-an').hidden = false;
  err.style.color = 'var(--muted)'; err.textContent = fill(t('mmHere'), { c: `${r.lat.toFixed(4)}°, ${r.lon.toFixed(4)}°` });
  setTimeout(() => { err.style.color = ''; }, 0);
}
const miniIcon = kind => `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${kind==='mountain'?'<path d="M1 13 6 3l4 7 2-4 3 7H1Z M4.5 6l1.5 2 1.5-2"/>':kind==='pin'?'<path d="M8 15s5-5 5-9a5 5 0 1 0-10 0c0 4 5 9 5 9Z"/><circle cx="8" cy="6" r="1.5"/>':'<path d="M3 14V2m0 1c3-3 6 3 10 0v6C9 12 6 6 3 9"/>'}</svg>`;
function lists() {
  const el = box?.querySelector('.mm-lists'); if (!el || !box.classList.contains('open')) return;
  const st = LLSN().state, pins = LLSN().pins?.() || [];
  const coord = s => `${Math.abs(s.lat).toFixed(2)}°${s.lat<0?'S':'N'}, ${Math.abs(s.lon).toFixed(2)}°${s.lon<0?'W':'E'}`;
  const row = (s, tag) => `<button type="button" class="mm-destination" data-site="${esc(s.id)}"><span class="mm-dest-icon" aria-hidden="true">${miniIcon(tag===t('mmPast')?'flag':'mountain')}</span><span class="mm-dest-copy"><span>${esc(nameOf(s))}</span><small>${coord(s)}</small></span><span class="mm-tag">${esc(tag)}</span></button>`;
  const past = s => ['apollo','luna','change','chandrayaan','slim','clps'].includes(s.group);
  const ordered = [...pins.map(p => st.sites.find(s => s.id===p.id)), ...(LLSN().sortedSites?.() || []).slice(0,5), ...st.sites.filter(past)].filter(Boolean);
  const seen = new Set();
  el.innerHTML = [-90,90].map(lat => `<button type="button" class="mm-destination" data-pole="${lat}"><span class="mm-dest-icon" aria-hidden="true">${miniIcon('flag')}</span><span class="mm-dest-copy"><span>${esc(t(lat<0?'mmSouth':'mmNorth'))}</span><small>90.00°${lat<0?'S':'N'}</small></span><span class="mm-tag">${esc(t('mmPole'))}</span></button>`).join('') + ordered.filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true;}).map(s=>row(s,past(s)?t('mmPast'):t('mmTerrain'))).join('');

}

whenReady(build);
