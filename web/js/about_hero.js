// about_hero.js — About hero band: a decorative Earth-to-Moon scene driven by the About scroll (Chaei's copy,
// measured motion 11/15 in docs/design_sync/채이사본_동기화_About히어로.md; drawn here from scratch as SVG, no frames
// or practice code).
//   progress p = About scroll / scrollable distance; the scene ends at p 0.85 and stays.
//   The shown value follows the target by 12 % per frame; reduced motion shows the landed scene at once.
//   Every visit to About starts at the launch scene (p 0).
//   Launch (65 % W, 91 % H) -> Moon's lower edge (68.2 % W, 44 % H) on wide screens; 61.5 % -> 72.6 % below 860 px.
//   Effects (p; frame spec 채이사본_동기화_로켓모션.md R-4..R-8): launch flame 0.05-0.25 (largest 0.10), warm Earth limb
//   0.05-0.35, thin warm tail streak 0.25-0.45, 180 deg flip 0.40-0.50 (side-on at 0.45), small landing burn 0.50-0.72,
//   Moon halo +~17 % peaking at 0.65, thin orange landing ring 0.65-0.70 (gone by 0.75), landing legs from 0.58.
//   Dotted path and stars are fixed; a faint film grain moves per frame.
// Decorative only: no data, not to scale.

// fraction of the path covered at p (from the measured rocket heights at 1440 x 249, normalised)
const ALONG = [[0, 0], [0.10, 0], [0.15, 0.034], [0.20, 0.102], [0.25, 0.271], [0.30, 0.449], [0.35, 0.602], [0.40, 0.737], [0.45, 0.831], [0.50, 0.873], [0.55, 0.966], [0.60, 0.992], [0.65, 1]];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (p, a, b) => { const x = ramp(p, a, b); return x * x * (3 - 2 * x); };
const bump = (p, a, b, c, d) => (p <= a || p >= d ? 0 : p < b ? smooth(p, a, b) : p <= c ? 1 : 1 - smooth(p, c, d));
const f2 = v => v.toFixed(2);
function along(p) {
  for (let k = 1; k < ALONG.length; k++) if (p <= ALONG[k][0]) { const [p0, f0] = ALONG[k - 1], [p1, f1] = ALONG[k]; return f0 + (f1 - f0) * ((p - p0) / (p1 - p0)); }
  return 1;
}

/** a 128 px grain tile (white specks of random strength), made once */
let grainURL = '';
function grain() {
  if (grainURL) return grainURL;
  try {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), im = g.createImageData(N, N);
    let x = 7; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N * N; i++) { const v = rnd(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = Math.round(v * v * 60); }
    g.putImageData(im, 0, 0); grainURL = c.toDataURL('image/png');
  } catch (e) { grainURL = ''; }
  return grainURL;
}

let teardown = null;
export function mountHero(host, label) {
  if (!host) return;
  teardown?.();
  const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, geo = null, cur = 0, target = 0, raf = 0, els = null;

  function build() {
    const r = host.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    const narrow = W < 860, s = Math.max(0.8, Math.min(1.4, H / 249)), rs = 1.1 * s;   // rocket ~9 x 15 px at 249
    const L = { x: (narrow ? 0.615 : 0.65) * W, y: 0.91 * H }, A = { x: (narrow ? 0.726 : 0.682) * W, y: 0.44 * H };
    // Moon: radius ~47 at 1440 x 249, its lower edge just above the arrival point, centre a little to the right
    const mR = Math.min(0.19 * H, 0.055 * W), M = { x: A.x + (narrow ? 0.004 : 0.015) * W, y: A.y - mR - 0.025 * H };
    // Earth: a circle whose top sits at ~90.5 % of the height and meets the bottom edge ~8 % of the width either side of
    // the launch point (bright limb ~210 px wide at 1440); below 860 px the contest layout keeps its wide, shallow arc
    const top = (narrow ? 0.92 : 0.905) * H, d = H - top, half = (narrow ? 0.30 : 0.08) * W, eR = (half * half + d * d) / (2 * d), E = { x: L.x, y: top + eR };
    let x = 11; const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    let stars = ''; const n = Math.round(Math.min(90, W * H / 4500));
    for (let k = 0; k < n; k++) { const big = rnd() > 0.9; stars += `<circle cx="${f2(rnd() * W)}" cy="${f2(rnd() * H * 0.9)}" r="${big ? 0.75 : 0.45}" fill="#fff" opacity="${(0.1 + rnd() * 0.45).toFixed(2)}"/>`; }
    const ang = Math.atan2(A.x - L.x, -(A.y - L.y)) * 180 / Math.PI;      // degrees right of vertical
    const hR = mR + 12 * s, h0 = mR / hR;                                    // halo reach and where it starts
    const gR = eR + 9 * s, g0 = eR / gR;                                     // Earth limb glow
    geo = { L, A, M, mR, s, ang };
    host.innerHTML = `<svg class="abh-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
  <defs>
    <radialGradient id="abh-haze" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#6f9fd0" stop-opacity=".42"/><stop offset=".45" stop-color="#4d79a8" stop-opacity=".16"/><stop offset="1" stop-color="#4d79a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="abh-limb" cx="${f2(E.x)}" cy="${f2(E.y)}" r="${f2(gR)}" gradientUnits="userSpaceOnUse">
      <stop offset="${(g0 - 0.0005).toFixed(5)}" stop-color="#b9dcff" stop-opacity=".9"/><stop offset="${(g0 + (1 - g0) * 0.25).toFixed(5)}" stop-color="#7fb0e0" stop-opacity=".35"/><stop offset="1" stop-color="#5a8cc0" stop-opacity="0"/></radialGradient>
    <radialGradient id="abh-limbfade" cx="${f2(L.x)}" cy="${f2(top)}" r="${f2(narrow ? half * 1.45 : half * 1.5)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="abh-limbmask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#abh-limbfade)"/></mask>
    <radialGradient id="abh-warm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".75"/><stop offset=".45" stop-color="#ffb04a" stop-opacity=".3"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
    <radialGradient id="abh-halo" cx="${f2(M.x)}" cy="${f2(M.y)}" r="${f2(hR)}" gradientUnits="userSpaceOnUse">
      <stop offset="${(h0 - 0.001).toFixed(4)}" stop-color="#e4e7ec" stop-opacity=".8"/><stop offset="${(h0 + (1 - h0) * 0.22).toFixed(4)}" stop-color="#c9cdd4" stop-opacity=".36"/><stop offset="${(h0 + (1 - h0) * 0.6).toFixed(4)}" stop-color="#aab0b9" stop-opacity=".09"/><stop offset="1" stop-color="#aab0b9" stop-opacity="0"/></radialGradient>
    <radialGradient id="abh-halow" cx="${f2(M.x)}" cy="${f2(M.y)}" r="${f2(hR + 4 * s)}" gradientUnits="userSpaceOnUse">
      <stop offset="${(mR / (hR + 4 * s) - 0.001).toFixed(4)}" stop-color="#ffe2bf" stop-opacity=".55"/><stop offset="${(mR / (hR + 4 * s) + 0.08).toFixed(4)}" stop-color="#f3d2ad" stop-opacity=".22"/><stop offset="1" stop-color="#f3d2ad" stop-opacity="0"/></radialGradient>
    <linearGradient id="abh-tophalf" x1="0" y1="${f2(M.y - hR)}" x2="0" y2="${f2(M.y + hR)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
    <mask id="abh-moonmask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#abh-tophalf)"/></mask>
    <radialGradient id="abh-fire" cx="50%" cy="25%" r="65%"><stop offset="0" stop-color="#fff6d6"/><stop offset="0.3" stop-color="#ffd166"/><stop offset="0.7" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
    <radialGradient id="abh-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe09a" stop-opacity=".95"/><stop offset=".45" stop-color="#ffbf55" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
    <linearGradient id="abh-tail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe1a3" stop-opacity=".95"/><stop offset=".35" stop-color="#ffb35c" stop-opacity=".6"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#060708"/>
  <g>${stars}</g>
  <ellipse class="abh-hazeel" opacity=".7" cx="${f2(L.x)}" cy="${f2(top)}" rx="${f2(narrow ? half * 1.9 : 0.26 * W)}" ry="${f2(0.25 * H)}" fill="url(#abh-haze)"/>
  <circle class="abh-limbel" opacity=".75" cx="${f2(E.x)}" cy="${f2(E.y)}" r="${f2(gR)}" fill="url(#abh-limb)" mask="url(#abh-limbmask)"/>
  <ellipse class="abh-warm" cx="${f2(L.x)}" cy="${f2(top)}" rx="${f2(narrow ? half * 0.42 : half * 0.95)}" ry="${f2(0.1 * H)}" fill="url(#abh-warm)" opacity="0"/>
  <circle cx="${f2(E.x)}" cy="${f2(E.y)}" r="${f2(eR)}" fill="#0b0e12"/>
  <circle cx="${f2(M.x)}" cy="${f2(M.y)}" r="${f2(hR)}" fill="url(#abh-halo)" mask="url(#abh-moonmask)"/>
  <circle class="abh-halo2" cx="${f2(M.x)}" cy="${f2(M.y)}" r="${f2(hR + 4 * s)}" fill="url(#abh-halow)" opacity="0"/>
  <circle cx="${f2(M.x)}" cy="${f2(M.y)}" r="${f2(mR)}" fill="#090b0e"/>
  <line x1="${f2(L.x)}" y1="${f2(L.y)}" x2="${f2(A.x)}" y2="${f2(A.y)}" stroke="#e6eaf2" stroke-opacity=".2" stroke-width="${f2(1.3 * s)}" stroke-linecap="round" stroke-dasharray="0.1 ${f2(4.5 * s)}"/>
  <ellipse class="abh-ring" rx="${f2(17 * s)}" ry="${f2(7 * s)}" fill="none" stroke="#ff9a3c" stroke-width="${f2(1.1 * s)}" opacity="0"/>
  <g class="abh-rocket">
    <circle class="abh-glow" cx="0" cy="${f2(6 * rs)}" r="${f2(15 * rs)}" fill="url(#abh-glow)" opacity="0"/>
    <rect class="abh-streak" x="${f2(-0.6 * rs)}" y="${f2(6 * rs)}" width="${f2(1.2 * rs)}" height="${f2(40 * rs)}" rx="${f2(0.6 * rs)}" fill="url(#abh-tail)" opacity="0"/>
    <ellipse class="abh-flame" cx="0" cy="${f2(8.5 * rs)}" rx="${f2(2.6 * rs)}" ry="${f2(6 * rs)}" fill="url(#abh-fire)" opacity="0"/>
    <g class="abh-legs" opacity="0" stroke="#eef1f6" stroke-width="${f2(1.1 * rs)}" stroke-linecap="round" fill="none"><path d="M${f2(-1.8 * rs)} ${f2(4 * rs)} L${f2(-6.2 * rs)} ${f2(11 * rs)} M${f2(1.8 * rs)} ${f2(4 * rs)} L${f2(6.2 * rs)} ${f2(11 * rs)}"/></g>
    <path d="M0 ${f2(-7 * rs)} C ${f2(2.5 * rs)} ${f2(-4 * rs)}, ${f2(2.7 * rs)} ${f2(1 * rs)}, ${f2(2.3 * rs)} ${f2(5 * rs)} L ${f2(-2.3 * rs)} ${f2(5 * rs)} C ${f2(-2.7 * rs)} ${f2(1 * rs)}, ${f2(-2.5 * rs)} ${f2(-4 * rs)}, 0 ${f2(-7 * rs)} Z" fill="#f4f6fa"/>
    <path d="M${f2(-2.3 * rs)} ${f2(1.6 * rs)} L${f2(-4.3 * rs)} ${f2(6 * rs)} L${f2(-2.1 * rs)} ${f2(5 * rs)} Z M${f2(2.3 * rs)} ${f2(1.6 * rs)} L${f2(4.3 * rs)} ${f2(6 * rs)} L${f2(2.1 * rs)} ${f2(5 * rs)} Z" fill="#c9ced6"/>
    <circle cx="0" cy="${f2(-2.2 * rs)}" r="${f2(0.9 * rs)}" fill="#0b0e14"/>
  </g>
</svg><div class="abh-grain" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;opacity:.24;background-image:url(${grain()});background-size:128px 128px"></div>`;
    const q = c => host.querySelector(c);
    els = { rocket: q('.abh-rocket'), flame: q('.abh-flame'), glow: q('.abh-glow'), streak: q('.abh-streak'), legs: q('.abh-legs'), warm: q('.abh-warm'), halo: q('.abh-halo2'), haze: q('.abh-hazeel'), limb: q('.abh-limbel'), ring: q('.abh-ring'), grain: q('.abh-grain') };
    draw(cur);
  }

  function draw(p) {
    if (!els || !geo) return;
    const t = Math.min(p, 0.85);                                           // the scene ends at p 0.85 and stays
    const { L, A, ang } = geo, f = along(t);
    const x = L.x + (A.x - L.x) * f, y = L.y + (A.y - L.y) * f;
    const flip = smooth(t, 0.40, 0.50) * 180;                              // flipped from the 0.50 frame on
    els.rocket.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(ang + flip)})`);
    // launch flame largest at p 0.10, gone by 0.25; landing burn small, from the 0.50 frame to ~0.72
    const launch = bump(t, 0.04, 0.09, 0.12, 0.25), land = bump(t, 0.47, 0.50, 0.66, 0.74);
    const big = Math.max(bump(t, 0.04, 0.10, 0.10, 0.20), 0.15 * land);
    els.flame.setAttribute('opacity', Math.max(launch, 0.8 * land).toFixed(3));
    els.flame.setAttribute('transform', `scale(${(0.5 + 0.8 * big).toFixed(3)})`);
    els.glow.setAttribute('opacity', (0.9 * bump(t, 0.04, 0.10, 0.12, 0.25)).toFixed(3));
    els.streak.setAttribute('opacity', (0.85 * bump(t, 0.22, 0.26, 0.40, 0.47)).toFixed(3));
    const lit = bump(t, 0.04, 0.10, 0.20, 0.35);                          // Earth limb lit by the launch (~+35 %)
    els.warm.setAttribute('opacity', (0.85 * lit).toFixed(3));
    els.haze.setAttribute('opacity', (0.7 + 0.3 * lit).toFixed(3)); els.limb.setAttribute('opacity', (0.75 + 0.25 * lit).toFixed(3));
    els.halo.setAttribute('opacity', (0.12 * bump(t, 0.50, 0.65, 0.65, 0.80) + 0.04 * ramp(t, 0.75, 0.85)).toFixed(3));
    const ring = bump(t, 0.62, 0.67, 0.70, 0.75);
    els.ring.setAttribute('opacity', (0.9 * ring).toFixed(3)); els.ring.setAttribute('cx', f2(x)); els.ring.setAttribute('cy', f2(y));
    els.ring.setAttribute('transform', `rotate(${ang.toFixed(1)} ${f2(x)} ${f2(y)})`);
    els.legs.setAttribute('opacity', ramp(t, 0.58, 0.66).toFixed(3));
    if (!still()) els.grain.style.backgroundPosition = `${Math.floor(Math.random() * 128)}px ${Math.floor(Math.random() * 128)}px`;
  }

  const progress = () => { const max = document.documentElement.scrollHeight - window.innerHeight; return max > 0 ? clamp(window.scrollY / max) : 0; };
  const onAbout = () => document.body.classList.contains('on-about') && host.isConnected;
  function tick() {
    raf = 0; if (!onAbout()) return;
    cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.0005) cur = target; else raf = requestAnimationFrame(tick);
    draw(cur);
  }
  function onScroll() {
    if (!onAbout()) return;
    if (still()) { cur = target = 1; draw(cur); return; }
    target = progress();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  // each visit to About starts at the launch scene (the page is scrolled to the top on the way in)
  function onOpen() { cur = target = still() ? 1 : 0; draw(cur); requestAnimationFrame(onScroll); }
  cur = target = still() ? 1 : progress();
  build();
  const ro = new ResizeObserver(() => { const r = host.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== H) build(); });
  ro.observe(host);
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('llsn:about', onOpen);
  mq?.addEventListener?.('change', onScroll);
  teardown = () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('llsn:about', onOpen); mq?.removeEventListener?.('change', onScroll); if (raf) cancelAnimationFrame(raf); };
  // test / debugging hook: set the progress directly (no smoothing)
  host.abhSet = p => { cur = target = clamp(p); draw(cur); };
}
