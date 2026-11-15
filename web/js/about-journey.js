/*!
 * Luna Sight — About page hero graphic: Earth → Moon journey (silhouette style)
 * Self-contained canvas renderer. Exposes window.LunaJourney.
 *
 *   LunaJourney.mount(containerEl, { mode: "loop" });     // plays on its own, loops
 *   LunaJourney.mount(containerEl, { mode: "scroll" });   // progress follows the section's scroll position
 *   var j = LunaJourney.mount(el, { mode: "manual" }); j.seek(0.5);
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    mode: "loop",            // "loop" | "scroll" | "manual"
    showLabels: true,        // step labels + distance readout in the corners
    labels: ["Launch", "Translunar", "Descent", "Touchdown"],
    earthGlow: "120,165,210",// rgb of Earth's rim light (cool, desaturated blue)
    moonGlow: "200,200,205", // rgb of the Moon's rim light
    flame: "245,184,61",     // rgb of thrusters (site's sunlight yellow)
    grain: 0.075,            // film grain strength (0 = off)
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
  };

  // virtual scene (cover-fitted into the container)
  var VW = 1200, VH = 900;
  var CRAFT_H = 32;                          // craft height in virtual px
  var LEG = 9;                               // landing-leg reach below the engine
  var EARTH = { x: 560, y: 1520, r: 900 };   // big dark dome along the bottom
  var MOON = { x: 735, y: 250, r: 100 };
  var P0 = { x: 590, y: EARTH.y - Math.sqrt(EARTH.r * EARTH.r - 30 * 30) };  // launch pad on Earth's top limb

  // one straight line: pad → the Moon's limb facing Earth. k = 0..1 places the craft's engine end along it.
  var LINE = (function () {
    var dx = MOON.x - P0.x, dy = MOON.y - P0.y, d = Math.hypot(dx, dy);
    var ux = dx / d, uy = dy / d;
    return { ux: ux, uy: uy, len: d - MOON.r - CRAFT_H - LEG - 2, ang: Math.atan2(uy, ux) };
  })();
  var FOCUS_X = (P0.x + MOON.x) / 2 + 20;   // horizontal centre of interest for narrow panels
  var LAND = { x: MOON.x - LINE.ux * MOON.r, y: MOON.y - LINE.uy * MOON.r };   // touchdown point on the surface
  function at(k) { return { x: P0.x + LINE.ux * LINE.len * k, y: P0.y + LINE.uy * LINE.len * k }; }

  // timeline (ms) of one journey
  var T = {
    fadeIn: [0, 900],
    ignite: [700, 1500],
    launch: [1300, 3000],    // heavy burn, accelerating
    coast: [3000, 6000],
    flip: [6000, 6800],      // turns 180° to burn against the direction of travel
    descent: [6800, 8800],
    touch: 8800,
    hold: [8800, 11500],
    fadeOut: [11500, 12300],
    total: 12300
  };
  var K = { launch: 0.16, coast: 0.84, flip: 0.875 };

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var prog = function (t, r) { return clamp((t - r[0]) / (r[1] - r[0]), 0, 1); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var easeInQuad = function (x) { return x * x; };
  var easeOutQuad = function (x) { return 1 - (1 - x) * (1 - x); };
  var easeInOutSine = function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; };
  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };

  // position along the line at journey time t
  function kAt(t) {
    if (t < T.launch[0]) return 0;
    if (t < T.launch[1]) return K.launch * easeInQuad(prog(t, T.launch));
    if (t < T.coast[1]) { var c = prog(t, T.coast); return lerp(K.launch, K.coast, c * (1 - 0.25 * c) / 0.75); }
    if (t < T.flip[1]) return lerp(K.coast, K.flip, easeOutQuad(prog(t, T.flip)));
    if (t < T.descent[1]) return lerp(K.flip, 1, easeOutCubic(prog(t, T.descent)));
    return 1;
  }

  // rocket silhouette, nose up (−y), 26 units tall
  var ROCKET = [[0, -13], [2.6, -8.5], [3.4, -3], [3.4, 6], [7, 11], [7, 13], [2.6, 10.5], [-2.6, 10.5], [-7, 13], [-7, 11], [-3.4, 6], [-3.4, -3], [-2.6, -8.5]];

  function mount(container, options) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    for (var k2 in (options || {})) o[k2] = options[k2];

    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.background = "#000";
    if (!container.hasAttribute("role")) {
      container.setAttribute("role", "img");
      container.setAttribute("aria-label", "우주선이 지구에서 출발해 달에 착륙하는 과정을 그린 그래픽");
    }

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    container.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    // corner labels
    var labelsEl = null, distEl = null, stepEls = [];
    if (o.showLabels) {
      labelsEl = document.createElement("ol");
      labelsEl.setAttribute("aria-hidden", "true");
      labelsEl.style.cssText = "position:absolute;left:24px;bottom:22px;margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;font:500 11px/1 " + o.mono + ";letter-spacing:.12em;text-transform:uppercase;pointer-events:none";
      o.labels.forEach(function (txt, i) {
        var li = document.createElement("li");
        li.style.cssText = "display:flex;align-items:center;gap:8px;color:rgba(237,237,237,.3);transition:color .4s ease";
        li.innerHTML = '<span style="display:inline-block;width:12px;height:1px;background:currentColor"></span>' + ("0" + (i + 1)).slice(-2) + " " + txt;
        labelsEl.appendChild(li);
        stepEls.push(li);
      });
      container.appendChild(labelsEl);
      distEl = document.createElement("div");
      distEl.setAttribute("aria-hidden", "true");
      distEl.style.cssText = "position:absolute;right:24px;top:22px;text-align:right;font:500 11px/1.6 " + o.mono + ";letter-spacing:.12em;text-transform:uppercase;color:rgba(237,237,237,.45);pointer-events:none;font-variant-numeric:tabular-nums";
      container.appendChild(distEl);
    }

    var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;
    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      W = container.clientWidth; H = container.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (o.fit === "band") {
        // short, wide strip: fit the band from just above the Moon to just below the launch pad
        var bTop = MOON.y - MOON.r - (o.bandPadTop == null ? 70 : o.bandPadTop), bBot = P0.y + (o.bandPadBot == null ? 70 : o.bandPadBot);
        S = Math.min(H / (bBot - bTop), W / 520);
        OY = (H - (bTop + bBot) * S) / 2;
        OX = W * (o.focusAt || 0.5) - FOCUS_X * S;
      } else {
      S = Math.max(W / VW, H / VH);       // cover
      // keep the flight path centred when the panel is narrow, without exposing the scene's edges
      OX = clamp(W / 2 - FOCUS_X * S, W - VW * S, 0);
      OY = (H - VH * S) / 2;
      }
      if (labelsEl) labelsEl.style.flexDirection = W < 560 ? "column" : "row";
    }
    resize();
    var ro = global.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else global.addEventListener("resize", resize);

    // stars (virtual space)
    var seed = 11;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var stars = [];
    var band = o.fit === "band"; for (var i = 0; i < (band ? 900 : 260); i++) stars.push({ x: band ? -2 * VW + rnd() * 5 * VW : rnd() * VW, y: rnd() * VH, a: 0.08 + Math.pow(rnd(), 3) * 0.6, s: rnd() < 0.08 ? 1.6 : 0.9, tw: rnd() * 6.28 });

    // grain tile
    var grain = document.createElement("canvas");
    grain.width = grain.height = 160;
    (function () {
      var g = grain.getContext("2d"), im = g.createImageData(160, 160);
      for (var p = 0; p < im.data.length; p += 4) {
        var v = Math.random() * 255 | 0;
        im.data[p] = im.data[p + 1] = im.data[p + 2] = v;
        im.data[p + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    })();
    var grainPattern = null;

    // ---------- drawing helpers (virtual coords) ----------
    function V(x, y) { return [OX + x * S, OY + y * S]; }

    function planet(c, rgb, strength, lift, spread) {
      var p = V(c.x, c.y), r = c.r * S;
      // halo: its centre sits above the body, so light spills over the top limb and fades down the sides
      var hx = p[0], hy = p[1] - lift * S, hr = r + spread * S;
      var g = ctx.createRadialGradient(hx, hy, r * 0.97, hx, hy, hr);
      g.addColorStop(0, "rgba(" + rgb + "," + (0.5 * strength).toFixed(3) + ")");
      g.addColorStop(0.12, "rgba(" + rgb + "," + (0.2 * strength).toFixed(3) + ")");
      g.addColorStop(0.45, "rgba(" + rgb + "," + (0.05 * strength).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
      // body
      ctx.fillStyle = "#020203";
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
      // thin limb highlight, fading toward the bottom
      var lg = ctx.createLinearGradient(0, p[1] - r, 0, p[1] - r * 0.15);
      lg.addColorStop(0, "rgba(" + rgb + "," + (0.9 * strength).toFixed(3) + ")");
      lg.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.strokeStyle = lg;
      ctx.lineWidth = Math.max(1, 1.4 * S);
      ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0.1, r - 0.5), 0, Math.PI * 2); ctx.stroke();
    }

    function glow(x, y, rad, rgb, a) {
      var p = V(x, y), R = rad * S;
      var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
      g.addColorStop(0, "rgba(" + rgb + "," + a.toFixed(3) + ")");
      g.addColorStop(0.35, "rgba(" + rgb + "," + (a * 0.35).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, Math.PI * 2); ctx.fill();
    }

    function streak(x, y, dx, dy, len, width, rgbHead, aHead) {
      var a = V(x, y), b = V(x + dx * len, y + dy * len);
      var g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      g.addColorStop(0, "rgba(" + rgbHead + "," + aHead.toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + rgbHead + ",0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(0.8, width * S);
      ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    // ---------- one frame at journey time t ----------
    function render(t, now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      var vis = easeOutCubic(prog(t, T.fadeIn)) * (1 - prog(t, T.fadeOut));
      var sceneA = 0.25 + 0.75 * easeOutCubic(prog(t, T.fadeIn));   // planets stay faintly visible across the loop seam

      // stars
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = st.a * (0.7 + 0.3 * Math.sin(now / 900 + st.tw)) * sceneA;
        var p = V(st.x, st.y);
        ctx.fillStyle = "rgba(237,237,237," + a.toFixed(3) + ")";
        ctx.fillRect(Math.round(p[0]), Math.round(p[1]), st.s, st.s);
      }

      var kNow = kAt(t);
      var base = at(kNow);                                       // engine end of the craft, on the line
      var away = { x: -LINE.ux, y: -LINE.uy };                   // back toward Earth
      var ignite = prog(t, T.ignite);
      var flip = easeInOutSine(prog(t, T.flip));                 // 0 nose-to-Moon, 1 nose-to-Earth
      var landed = t >= T.touch;
      var craftA = vis;                                          // the rocket waits on the pad from the start

      // light the Earth's limb at launch, the Moon's near limb during descent
      var earthBoost = 1 + 1.1 * ignite * (1 - prog(t, [T.launch[1] - 300, T.coast[0] + 1500]));
      var moonLit = t >= T.flip[1] && t < T.touch + 1000 ? (t < T.touch ? prog(t, T.descent) : 1 - prog(t, [T.touch, T.touch + 1000])) : 0;
      planet(EARTH, o.earthGlow, sceneA * Math.min(1.6, 0.62 * earthBoost), 30, 210);
      planet(MOON, o.moonGlow, sceneA * 0.7, 14, 70);
      if (moonLit > 0) glow(LAND.x, LAND.y, 120, o.flame, 0.16 * moonLit * vis);

      // the planned course: one faint straight dotted line
      ctx.save();
      ctx.setLineDash([2 * S, 7 * S]);
      ctx.strokeStyle = "rgba(237,237,237," + (0.22 * vis).toFixed(3) + ")";
      ctx.lineWidth = Math.max(1, S);
      var g0 = V(P0.x, P0.y), g1 = V(LAND.x, LAND.y);
      ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.stroke();
      ctx.restore();

      // pad ignition glow
      var ig = ignite * (1 - prog(t, [T.launch[0] + 500, T.coast[0] + 600]));
      if (ig > 0) glow(P0.x, P0.y, 150, o.flame, 0.4 * ig * vis);

      // exhaust: a long straight streak behind the craft (launch + coast)
      if (t >= T.launch[0] && t < T.flip[0] + 300) {
        var burn = t < T.launch[1] ? 1 : 1 - prog(t, [T.launch[1], T.launch[1] + 500]) * 0.75;   // engine throttles back after launch
        var trailFade = 1 - prog(t, [T.coast[1] - 600, T.flip[0] + 300]);
        var tail = at(Math.max(0, kNow - lerp(0.05, 0.42, prog(t, [T.launch[0], T.launch[1] + 600]))));
        var a0 = V(base.x, base.y), a1 = V(tail.x, tail.y);
        var gl = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
        gl.addColorStop(0, "rgba(255,236,205," + (0.95 * trailFade * vis).toFixed(3) + ")");
        gl.addColorStop(0.25, "rgba(" + o.flame + "," + (0.55 * trailFade * vis).toFixed(3) + ")");
        gl.addColorStop(1, "rgba(" + o.flame + ",0)");
        ctx.strokeStyle = gl;
        ctx.lineCap = "butt";
        ctx.lineWidth = Math.max(1, 2.2 * S);
        ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
        glow(base.x, base.y, lerp(26, 60, burn), o.flame, 0.5 * burn * trailFade * vis);
        var fl = CRAFT_H * (0.6 + Math.random() * 0.5) * burn * trailFade;
        streak(base.x, base.y, away.x, away.y, fl, 4, "255,246,230", 0.95 * vis);
      }

      // retro burn: after the flip the engine faces the Moon
      if (t >= T.flip[0] + 500 && t < T.touch) {
        var eng = { x: base.x + LINE.ux * CRAFT_H, y: base.y + LINE.uy * CRAFT_H };
        var rb = t < T.descent[0] ? prog(t, [T.flip[0] + 500, T.flip[1]]) : 1 - 0.45 * prog(t, T.descent);
        var fr = CRAFT_H * (0.7 + Math.random() * 0.6) * rb;
        streak(eng.x, eng.y, LINE.ux, LINE.uy, fr, 4.5, "255,246,230", 0.95 * vis);
        streak(eng.x, eng.y, LINE.ux, LINE.uy, fr * 1.8, 9, o.flame, 0.35 * vis);
        glow(eng.x + LINE.ux * 6, eng.y + LINE.uy * 6, 46, o.flame, 0.35 * rb * vis);
      }

      // the craft
      if (craftA > 0) {
        var rot = LINE.ang + Math.PI / 2 + Math.PI * flip;      // nose toward the Moon, then flipped
        var c = V(base.x + LINE.ux * CRAFT_H / 2, base.y + LINE.uy * CRAFT_H / 2), sc = CRAFT_H / 26 * S;
        ctx.save();
        ctx.translate(c[0], c[1]);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        ctx.globalAlpha = craftA;
        ctx.fillStyle = "#F2F2F2";
        ctx.beginPath();
        for (var pi = 0; pi < ROCKET.length; pi++) { var pt = ROCKET[pi]; if (pi === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#0b0b0c";
        ctx.fillRect(-1.2, -5, 2.4, 2.4);                       // window
        var legs = prog(t, [T.descent[1] - 900, T.descent[1] - 200]);
        if (legs > 0) {
          ctx.strokeStyle = "#F2F2F2";
          ctx.lineWidth = 1.4;
          ctx.lineCap = "square";
          var spread = lerp(3.5, 9, legs), drop = LEG * legs;
          ctx.beginPath();
          ctx.moveTo(3.4, 7); ctx.lineTo(spread, 13 + drop);
          ctx.moveTo(-3.4, 7); ctx.lineTo(-spread, 13 + drop);
          ctx.moveTo(spread - 2, 13 + drop); ctx.lineTo(spread + 2, 13 + drop);
          ctx.moveTo(-spread - 2, 13 + drop); ctx.lineTo(-spread + 2, 13 + drop);
          ctx.stroke();
        }
        ctx.restore();
      }

      // touchdown: dust flash along the limb, then a blinking light on the craft's nose
      if (landed) {
        var kt = prog(t, [T.touch, T.touch + 1200]);
        var lp = V(LAND.x, LAND.y), mc = V(MOON.x, MOON.y);
        ctx.save();
        ctx.beginPath();                                      // keep the dust outside the Moon's disc
        ctx.rect(0, 0, W, H);
        ctx.arc(mc[0], mc[1], MOON.r * S, 0, Math.PI * 2, true);
        ctx.clip("evenodd");
        ctx.translate(lp[0], lp[1]);
        ctx.rotate(LINE.ang + Math.PI / 2);
        ctx.strokeStyle = "rgba(" + o.flame + "," + (0.8 * (1 - kt) * vis).toFixed(3) + ")";
        ctx.lineWidth = Math.max(1, 1.2 * S);
        ctx.beginPath();
        ctx.ellipse(0, 0, 70 * S * easeOutCubic(kt), 14 * S * easeOutCubic(kt), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        glow(LAND.x, LAND.y, 70, o.flame, 0.45 * (1 - kt) * vis);
        var blink = (Math.floor((t - T.touch) / 700) % 2 === 0) ? 1 : 0.2;
        var tip = at(0);
        tip = { x: base.x - LINE.ux * 2, y: base.y - LINE.uy * 2 };
        glow(tip.x, tip.y, 12, "255,246,230", 0.7 * blink * vis);
      }

      // film grain
      if (o.grain > 0) {
        if (!grainPattern) grainPattern = ctx.createPattern(grain, "repeat");
        ctx.save();
        ctx.globalAlpha = o.grain;
        ctx.globalCompositeOperation = "screen";
        ctx.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0);
        ctx.fillStyle = grainPattern;
        ctx.fillRect(-160, -160, W + 320, H + 320);
        ctx.restore();
      }

      // labels
      if (o.showLabels) {
        var step = t < T.coast[0] ? 0 : t < T.flip[0] ? 1 : t < T.touch ? 2 : 3;
        for (var si = 0; si < stepEls.length; si++) stepEls[si].style.color = si === step ? "rgba(237,237,237,.95)" : si < step ? "rgba(237,237,237,.5)" : "rgba(237,237,237,.25)";
        var total = 384400, kmLeft;
        if (t < T.coast[1]) kmLeft = total - (total - 15) * (kNow / K.coast);
        else if (t < T.touch) kmLeft = 15 * (1 - prog(t, [T.coast[1], T.touch]));
        else kmLeft = 0;
        var kmTxt = kmLeft >= 100 ? Math.round(kmLeft).toLocaleString("en-US") + " km" : kmLeft > 0 ? kmLeft.toFixed(1) + " km" : "0 km";
        distEl.innerHTML = "Earth → Moon<br><span style=\"color:rgba(237,237,237,.9)\">" + kmTxt + "</span>";
        labelsEl.style.opacity = String(0.3 + 0.7 * sceneA);
        distEl.style.opacity = labelsEl.style.opacity;
      }
    }

    // ---------- driving ----------
    var raf = 0, start = null, manualT = 0, paused = false, pauseAt = 0;
    var DUR = T.total;

    function scrollT() {
      var r = container.getBoundingClientRect(), vh = global.innerHeight || 1;
      // 0 when the panel's top reaches the bottom of the viewport, 1 when its bottom reaches the top third
      var p = clamp((vh - r.top) / (r.height + vh * 0.66), 0, 1);
      return p * T.hold[0] + (p >= 1 ? 600 : 0);
    }

    function frame(now) {
      if (start === null) start = now;
      var t;
      if (o.mode === "loop") t = reduced ? T.hold[0] + 1200 : ((paused ? pauseAt : now) - start) % DUR;
      else if (o.mode === "scroll") t = Math.min(scrollT(), T.hold[1] - 1);
      else t = manualT;
      render(t, now);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      seekTime: function (ms) { manualT = Math.max(0, ms); o.mode = "manual"; },
      seek: function (p) { manualT = clamp(p, 0, 1) * (T.hold[0] + 1200); if (o.mode !== "manual") o.mode = "manual"; },
      play: function () { if (o.mode !== "loop") { o.mode = "loop"; start = null; } if (paused) { start += performance.now() - pauseAt; paused = false; } },
      pause: function () { if (!paused) { paused = true; pauseAt = performance.now(); } },
      destroy: function () {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else global.removeEventListener("resize", resize);
        [canvas, labelsEl, distEl].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
      },
      timeline: T
    };
  }

  global.LunaJourney = { mount: mount };
})(window);
