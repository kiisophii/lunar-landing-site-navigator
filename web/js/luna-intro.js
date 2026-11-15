/*!
 * Luna Sight — entry loading screen
 * The craft rides the loading bar; when loading is done it lifts off and lands on the moon,
 * while the Luna Sight logo rises where the bar was.
 * Self-contained, no dependencies. Exposes window.LunaIntro.
 *
 *   LunaIntro.mount();                                       // follows real page loading (window load)
 *   LunaIntro.mount({ waitFor: [texturesReady, dataReady] }); // also waits for your own promises
 *   var i = LunaIntro.mount({ progress: "manual" });         // or drive it yourself:
 *   i.setProgress(0.4); i.complete();
 *
 * Contest build (Team Ginkgo Orbit): Chaei Oh's original intro, with three changes only —
 *   1. the traced logo vector is replaced by a text wordmark in the site font (same as the top bar);
 *      the per-letter rise and the spinning star on the G are kept;
 *   2. class names are prefixed "lsi-" so they cannot clash with the page (.ls-word, .ls-skip exist there);
 *   3. options `el` (render into an existing element, e.g. #ls-intro) and `label` (accessible name).
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    progress: "page",        // "page" = real page load (+ waitFor), "manual" = setProgress()/complete(), "auto" = fixed demo run
    waitFor: [],             // promises to wait for in "page" mode (each one moves the bar forward as it resolves)
    minMs: 900,              // the bar never completes before this (ms) — avoids a flash on very fast loads
    fastMs: 1600,            // if loading is done by this time, the landing plays faster (x0.7) and holds shorter
    autoMs: 1800,            // "auto" mode: how long the simulated load takes
    autoExit: true,          // fade out and remove itself when finished
    holdMs: 600,             // how long the landed moon + wordmark stays
    sessionOnce: false,      // true = play only once per browser session
    skippable: true,         // click / Esc / Enter / Space jumps to the end — only once loading is complete
    loadFonts: true,         // inject the Google Fonts <link> for the HUD mono
    wordmark: "LUNA SIGHT",  // (kept for compatibility; the visible wordmark is WORD in the site font)
    label: "Loading Luna Sight", // accessible name of the progress bar
    font: "var(--font, system-ui, sans-serif)", // wordmark font = the top bar's
    el: null,                // existing element to render into (e.g. #ls-intro); default: a new one on <body>
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    bg: "#000000",
    moon: "#EDEDED",
    accent: "#F5B83D",       // thrusters / touchdown (site's sunlight yellow)
    zIndex: 9999,
    onDone: null
  };

  // Wordmark: plain text in the site font (same as the top bar), one span per letter; the G carries a small star.
  // (The traced brand-logo vector of the original is not used in the contest build.)
  var WORD = "Luna Sight";     // shown upper-case, like the top bar's .ls-word
  var STAR = "M12 0C12.8 7.2 16.8 11.2 24 12C16.8 12.8 12.8 16.8 12 24C11.2 16.8 7.2 12.8 0 12C7.2 11.2 11.2 7.2 12 0Z";

  // timeline (ms). FIN values are relative to the moment the bar reaches 100%.
  var TIMING = {
    moonIn: [0, 600],
    barIn: [200, 700],       // track + craft appear
    bar: 600,                // bar may start filling
    finCollapse: [0, 450],   // bar folds into the center
    finText: 220,            // wordmark rises where the bar was
    finLift: [0, 700],       // lift off from the bar end, arc over the moon
    finDesc: [700, 1350],    // vertical powered descent
    finTouch: 1350,          // touchdown
    finEnd: 1850
  };

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var prog = function (t, r) { return clamp((t - r[0]) / (r[1] - r[0]), 0, 1); };
  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOutQuad = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  var easeInCubic = function (x) { return x * x * x; };
  var easeOutQuad = function (x) { return 1 - (1 - x) * (1 - x); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var cubic = function (p0, p1, p2, p3, k) {
    var u = 1 - k;
    return u * u * u * p0 + 3 * u * u * k * p1 + 3 * u * k * k * p2 + k * k * k * p3;
  };

  // "auto" mode: quick start, two short stalls, steady finish
  function autoCurve(k) {
    var pts = [[0, 0], [0.25, 0.34], [0.4, 0.38], [0.65, 0.7], [0.78, 0.74], [1, 1]];
    for (var i = 1; i < pts.length; i++) {
      if (k <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return lerp(a[1], b[1], easeInOutQuad((k - a[0]) / (b[0] - a[0])));
      }
    }
    return 1;
  }

  function injectStyles(o) {
    if (o.loadFonts && !document.getElementById("ls-intro-fonts")) {
      var l = document.createElement("link");
      l.id = "ls-intro-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap";
      document.head.appendChild(l);
    }
    if (document.getElementById("ls-intro-style")) return;
    var css =
      ".ls-intro{position:fixed;inset:0;overflow:hidden;cursor:default;transition:opacity .5s ease}" +
      ".ls-intro.is-leaving{opacity:0}" +
      ".ls-intro canvas{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform .6s cubic-bezier(.2,.7,.2,1)}" +
      ".ls-intro.is-leaving canvas{transform:scale(1.05)}" +
      ".lsi-word{position:absolute;left:0;top:0;pointer-events:none;display:flex;white-space:nowrap;font-weight:700;line-height:1;letter-spacing:.18em;text-transform:uppercase}" +
      ".lsi-ch{display:block;position:relative;opacity:0;transform:translate(var(--dx),40px);transition:opacity .45s ease,transform 1s cubic-bezier(.2,.7,.2,1)}" +
      ".lsi-ch:last-child{letter-spacing:0}" +
      ".lsi-word.is-in .lsi-ch{opacity:1;transform:none}" +
      ".lsi-star{position:absolute;left:.19em;top:.385em;width:.23em;height:.23em;overflow:visible;transform:scale(0) rotate(-90deg);transition:transform .7s cubic-bezier(.3,1.7,.4,1)}" +
      ".lsi-word.is-star .lsi-star{transform:none}" +
      ".lsi-pct{position:absolute;font-size:11px;letter-spacing:.12em;font-variant-numeric:tabular-nums;pointer-events:none;transition:opacity .3s ease}" +
      ".lsi-hud{position:absolute;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:0;transition:opacity .4s ease;pointer-events:none;font-variant-numeric:tabular-nums}" +
      ".lsi-hud.is-on{opacity:1}" +
      ".lsi-hud b{font-weight:500}" +
      ".lsi-skip{position:absolute;top:24px;right:24px;display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;background:transparent;border:1px solid rgba(255,255,255,.18);border-radius:2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;opacity:.75;transition:opacity .2s,border-color .2s}" +
      ".lsi-skip:hover,.lsi-skip:focus-visible{opacity:1;border-color:rgba(255,255,255,.5);outline:none}" +
      ".lsi-skip[disabled]{opacity:.3;cursor:default}";
    var s = document.createElement("style");
    s.id = "ls-intro-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount(options) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    for (var k2 in (options || {})) o[k2] = options[k2];
    var mode = o.progress;
    var T = Object.assign({}, TIMING);

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (typeof o.onDone === "function") o.onDone();
      try { document.dispatchEvent(new CustomEvent("lunaintro:done")); } catch (e) {}
    }
    var noop = function () {};

    if (o.sessionOnce) {
      try {
        if (sessionStorage.getItem("ls-intro-played")) { finish(); return { setProgress: noop, complete: noop, skip: noop, destroy: noop }; }
        sessionStorage.setItem("ls-intro-played", "1");
      } catch (e) {}
    }

    injectStyles(o);
    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- DOM ----------
    var root = o.el || document.createElement("div");
    root.innerHTML = "";
    root.hidden = false;
    root.className = "ls-intro";
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-label", o.label);
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    root.setAttribute("aria-valuenow", "0");
    root.style.background = o.bg;
    root.style.zIndex = o.zIndex;
    root.style.color = o.moon;

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);

    var word = document.createElement("div");
    word.className = "lsi-word";
    word.setAttribute("aria-hidden", "true");
    word.style.fontFamily = o.font;
    word.style.color = o.moon;
    var chars = WORD.split("").map(function (c, i) {
      var sp = document.createElement("span");
      sp.className = "lsi-ch";
      sp.style.transitionDelay = (i * 40) + "ms";
      sp.textContent = c === " " ? "\u00a0" : c;
      if (c.toUpperCase() === "G") {                    // the G carries the star
        var star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        star.setAttribute("class", "lsi-star");
        star.setAttribute("viewBox", "0 0 24 24");
        star.setAttribute("fill", o.moon);
        star.innerHTML = '<path d="' + STAR + '"/>';
        sp.appendChild(star);
      }
      word.appendChild(sp);
      return sp;
    });
    root.appendChild(word);

    var pct = document.createElement("div");
    pct.className = "lsi-pct";
    pct.style.fontFamily = o.mono;
    pct.style.color = "rgba(237,237,237,.55)";
    pct.style.opacity = "0";
    pct.setAttribute("aria-hidden", "true");
    root.appendChild(pct);

    function hud(pos) {
      var d = document.createElement("div");
      d.className = "lsi-hud";
      d.style.fontFamily = o.mono;
      d.setAttribute("aria-hidden", "true");
      for (var p in pos) d.style[p] = pos[p];
      root.appendChild(d);
      return d;
    }
    var hudClock = hud({ left: "24px", bottom: "24px", color: "rgba(237,237,237,.55)" });
    var hudStat = hud({ right: "24px", bottom: "24px", color: "rgba(237,237,237,.55)", textAlign: "right" });

    var skipBtn = null;
    if (o.skippable) {
      skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "lsi-skip";
      skipBtn.disabled = true;
      skipBtn.style.fontFamily = o.mono;
      skipBtn.style.color = o.moon;
      skipBtn.innerHTML = 'Skip<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 6L10.5 12L4 18Z" fill="currentColor"></path><path d="M12.5 6L19 12L12.5 18Z" fill="currentColor"></path></svg>';
      root.appendChild(skipBtn);
    }

    if (!root.parentNode) document.body.appendChild(root);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // ---------- canvas sizing ----------
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      W = root.clientWidth; H = root.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    global.addEventListener("resize", resize);

    var stars = [];
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (var i = 0; i < 90; i++) stars.push({ x: rnd(), y: rnd(), a: 0.12 + rnd() * 0.35, s: rnd() < 0.15 ? 1.5 : 1, tw: rnd() * 6.28 });

    // ---------- progress sources ----------
    var target = 0;              // where the bar should be (0..1)
    var shown = 0;               // what the bar shows
    var completed = false;       // loading is truly finished
    var finAt = null;            // time the bar reached 100%
    var finScale = 1;            // < 1 when loading was fast: the landing plays quicker
    var start = null, lastT = 0;

    function bump(v) { target = Math.max(target, clamp(v, 0, 1)); }

    var pageLoaded = false, waitTotal = 0, waitDone = 0;
    if (mode === "page") {
      var waits = (o.waitFor || []).filter(function (p) { return p && typeof p.then === "function"; });
      waitTotal = waits.length;
      var checkDone = function () { if (pageLoaded && waitDone >= waitTotal) completed = true; };
      waits.forEach(function (p) {
        var settle = function () { waitDone++; checkDone(); };
        p.then(settle, settle);              // a failed request never blocks the intro
      });
      var onLoad = function () { pageLoaded = true; checkDone(); };
      if (document.readyState === "complete") onLoad();
      else global.addEventListener("load", onLoad, { once: true });
    }

    // the share of the bar that real signals have earned so far ("page" mode)
    function pageProgress(t) {
      var parts = 1 + waitTotal;
      var earned = ((pageLoaded ? 1 : 0) + waitDone) / parts;
      var rs = document.readyState === "loading" ? 0 : 0.1;
      // creep forward while waiting, but never beyond what is still pending
      var creep = (1 - Math.exp(-(t - T.bar) / 2600)) * 0.85;
      return Math.min(0.97, Math.max(rs, earned * 0.97, Math.min(creep, earned + (1 - earned) * 0.85)));
    }

    function geom() {
      var R = clamp(Math.min(W, H) * 0.13, 52, 132);
      var cx = W / 2, cy = H * 0.42;
      var barW = clamp(R * 3.2, 200, 420);
      return { R: R, cx: cx, cy: cy, barW: barW, barX: cx - barW / 2, barY: cy + R + R * 0.78 };
    }

    // wordmark: font size so its width is lw; letters start spread out (as the original's 0.22 × logo units)
    var wordW = 0, wordFs = 0;
    function fitWord(lw) {
      word.style.fontSize = "100px";
      var w100 = word.scrollWidth || 1;
      wordFs = 100 * lw / w100;
      word.style.fontSize = wordFs.toFixed(2) + "px";
      var mid = word.scrollWidth / 2;
      chars.forEach(function (sp) {
        var c = sp.offsetLeft + sp.offsetWidth / 2;
        sp.style.setProperty("--dx", ((c - mid) * 0.22 * 1811 / lw).toFixed(1) + "px");
      });
      wordW = lw;
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { wordW = 0; });

    var trail = [], lastCraft = null, heading = 0, dust = [], dustSpawned = false;

    // ---------- frame ----------
    function draw(t, dt) {
      var g = geom(), R = g.R, cx = g.cx, cy = g.cy;
      var craftS = Math.max(6, R * 0.085);
      var legH = craftS * 0.7;
      ctx.clearRect(0, 0, W, H);

      // progress
      if (t >= T.bar && finAt === null) {
        if (mode === "auto") {
          bump(autoCurve(clamp((t - T.bar) / o.autoMs, 0, 1)));
          if (t - T.bar >= o.autoMs) completed = true;
        } else if (mode === "page") {
          bump(pageProgress(t));
        }
        var goal = (completed && t >= o.minMs) ? 1 : Math.min(target, 0.97);
        // ease toward the goal; never faster than ~9% per 100ms (15% at the very end) so it never jumps
        var step = (goal - shown) * Math.min(1, dt / 160);
        if (goal === 1) step = Math.max(step, 0.0012 * dt);  // no slow crawl at the end once loaded
        shown += clamp(step, 0, Math.min(goal - shown, (completed ? 0.0022 : 0.0009) * dt));
        if (goal === 1 && 1 - shown < 0.003) shown = 1;
        if (shown >= 1) { finAt = t; finScale = t <= o.fastMs ? 0.7 : 1; }
      }
      if (skipBtn && completed && skipBtn.disabled) skipBtn.disabled = false;
      var f = finAt === null ? -1 : (t - finAt) / finScale;
      var tf = finAt === null ? -1 : f - T.finTouch;

      // stars
      var starA = easeOutCubic(prog(t, [0, 800]));
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = st.a * starA * (0.75 + 0.25 * Math.sin(t / 700 + st.tw));
        ctx.fillStyle = "rgba(237,237,237," + a.toFixed(3) + ")";
        ctx.fillRect(Math.round(st.x * W), Math.round(st.y * H), st.s, st.s);
      }

      // moon (+ touchdown wobble)
      var mIn = easeOutCubic(prog(t, T.moonIn));
      var mR = R * lerp(0.86, 1, mIn);
      var kw = tf >= 0 ? clamp(tf / 500, 0, 1) : 0;
      var mcy = cy + (tf >= 0 ? R * 0.035 * Math.sin(kw * Math.PI * 2.5) * (1 - kw) : 0);
      ctx.globalAlpha = mIn;
      ctx.fillStyle = o.moon;
      ctx.beginPath(); ctx.arc(cx, mcy, mR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // bar track + fill
      var appear = easeOutCubic(prog(t, T.barIn));
      var collapse = f >= 0 ? easeInCubic(prog(f, T.finCollapse)) : 0;
      if (appear > 0 && collapse < 1) {
        var half = g.barW / 2 * (1 - collapse) * lerp(0.6, 1, appear);
        ctx.fillStyle = "rgba(237,237,237," + (0.16 * appear * (1 - collapse)).toFixed(3) + ")";
        ctx.fillRect(cx - half, g.barY - 0.5, half * 2, 1);
        if (f < 0) {
          ctx.fillStyle = o.moon;
          ctx.fillRect(g.barX, g.barY - 1, g.barW * shown, 2);
        } else {
          ctx.fillStyle = f < 180 ? o.accent : o.moon;
          ctx.fillRect(cx - half, g.barY - 1, half * 2, 2);
        }
      }

      // craft
      var x = null, y = null, thrust = false, descending = false, landed = false, craftA = 1;
      var hoverY = cy - R * 1.7;
      var landedY = mcy - R - craftS / 2 - legH;
      if (f < 0) {
        if (t >= T.barIn[0]) {
          x = g.barX + g.barW * shown;
          y = g.barY;
          craftA = appear;
          thrust = target > shown + 0.003;
        }
      } else if (f < T.finLift[1]) {
        var l = easeInOutQuad(prog(f, T.finLift));
        var bx = g.barX + g.barW, by = g.barY;
        x = cubic(bx, bx + R * 1.0, cx + R * 1.6, cx, l);
        y = cubic(by, by - R * 0.7, hoverY - R * 0.4, hoverY, l);
        thrust = true;
      } else if (f < T.finDesc[1]) {
        x = cx;
        y = lerp(hoverY, landedY, easeOutQuad(prog(f, T.finDesc)));
        descending = true;
      } else {
        x = cx; y = landedY; landed = true;
      }

      if (x !== null) {
        trail.push({ x: x, y: y, t: t });
        if (lastCraft) {
          var dx = x - lastCraft.x, dy = y - lastCraft.y;
          if (dx * dx + dy * dy > 0.25) heading = Math.atan2(dy, dx);
        }
        lastCraft = { x: x, y: y };
      }
      var keep = 220;
      while (trail.length && t - trail[0].t > keep) trail.shift();
      if (trail.length > 1) {
        ctx.lineCap = "butt";
        for (var j = 1; j < trail.length; j++) {
          var age = (t - trail[j].t) / keep;
          var al = Math.pow(1 - age, 1.6) * craftA;
          ctx.strokeStyle = "rgba(237,237,237," + al.toFixed(3) + ")";
          ctx.lineWidth = craftS * lerp(0.9, 0.25, age);
          ctx.beginPath();
          ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
          ctx.lineTo(trail[j].x, trail[j].y);
          ctx.stroke();
        }
      }

      if (x !== null) {
        var rot = 0;
        if (f >= 0 && f < T.finLift[1]) rot = heading;
        else if (descending) rot = lerp(heading, 0, easeOutCubic(prog(f, [T.finDesc[0], T.finDesc[0] + 260])));
        ctx.fillStyle = o.accent;
        if (thrust) {                                     // flame behind the craft
          var fl = craftS * (0.8 + Math.random() * 1.2);
          ctx.save();
          ctx.globalAlpha = craftA;
          ctx.translate(x, y); ctx.rotate(rot);
          ctx.fillRect(-craftS / 2 - 1 - fl, -craftS * 0.18, fl, craftS * 0.36);
          ctx.restore();
        }
        if (descending) {                                 // retro-thrust pointing down
          var fd = craftS * (1.1 + Math.random() * 1.5) * (1 - prog(f, T.finDesc) * 0.6);
          ctx.fillRect(x - craftS * 0.18, y + craftS / 2 + 1, craftS * 0.36, fd);
        }
        ctx.save();
        ctx.globalAlpha = craftA;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = o.moon;
        ctx.fillRect(-craftS / 2, -craftS / 2, craftS, craftS);
        ctx.restore();

        var legs = f >= 0 ? prog(f, [T.finDesc[1] - 220, T.finDesc[1]]) : 0;
        if (legs > 0) {
          ctx.strokeStyle = o.moon;
          ctx.lineWidth = Math.max(1, craftS * 0.18);
          ctx.lineCap = "square";
          var lby = y + craftS / 2, spread = craftS * lerp(0.4, 0.95, legs), drop = legH * legs;
          ctx.beginPath();
          ctx.moveTo(x - craftS * 0.35, lby); ctx.lineTo(x - spread, lby + drop);
          ctx.moveTo(x + craftS * 0.35, lby); ctx.lineTo(x + spread, lby + drop);
          ctx.stroke();
        }
      }

      // touchdown: dust ring + particles
      if (tf >= 0) {
        var kr = clamp(tf / 700, 0, 1), er = easeOutCubic(kr);
        ctx.strokeStyle = "rgba(245,184,61," + (0.9 * (1 - kr)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, mcy - R, R * 1.15 * er, R * 0.17 * er, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (!dustSpawned) {
          dustSpawned = true;
          for (var nd = 0; nd < 16; nd++) {
            var dir = nd % 2 ? 1 : -1;
            dust.push({ x: cx, y: mcy - R, vx: dir * (0.03 + Math.random() * 0.08) * R / 60, vy: -(0.015 + Math.random() * 0.05) * R / 60, s: 1 + Math.random() * 2, born: t });
          }
        }
      }
      for (var qd = dust.length - 1; qd >= 0; qd--) {
        var pt = dust[qd], life = (t - pt.born) / 700;
        if (life >= 1) { dust.splice(qd, 1); continue; }
        var ddt = t - pt.born;
        ctx.fillStyle = "rgba(237,237,237," + (1 - life).toFixed(3) + ")";
        ctx.fillRect(pt.x + pt.vx * ddt, pt.y + pt.vy * ddt + 0.00006 * R * ddt * ddt / 60, pt.s, pt.s);
      }

      // DOM: wordmark where the bar was, percentage under the bar's right end
      var lw = clamp(R * 4.1, 250, 540);
      if (lw !== wordW) fitWord(lw);
      word.style.left = (cx - lw / 2) + "px";
      word.style.top = (g.barY - wordFs * 0.5) + "px";      // caps centred on the bar line
      if (tf >= 0 && !starShown) { starShown = true; word.classList.add("is-star"); }
      pct.style.left = (g.barX + g.barW - 40) + "px";
      pct.style.width = "40px";
      pct.style.textAlign = "right";
      pct.style.top = (g.barY + 12) + "px";
      pct.style.opacity = (appear > 0.5 && f < 0) ? "1" : "0";
      var n = Math.round(shown * 100);
      pct.textContent = ("00" + n).slice(-3) + "%";
      root.setAttribute("aria-valuenow", String(n));

      // HUD
      hudClock.innerHTML = "T+ <b>" + ("0" + Math.floor(t / 60000)).slice(-2) + ":" + ("0" + (t / 1000 % 60).toFixed(2)).slice(-5) + "</b>";
      if (tf >= 0) hudStat.innerHTML = '<b style="color:' + o.accent + '">Touchdown</b>';
      else if (f >= T.finDesc[0]) hudStat.innerHTML = "ALT <b>" + Math.round(lerp(500, 0, easeOutQuad(prog(f, T.finDesc)))) + " m</b>";
      else if (f >= 0) hudStat.innerHTML = "Descent <b>initiated</b>";
      else hudStat.innerHTML = "Loading <b>" + ("00" + n).slice(-3) + "%</b>";
    }

    // ---------- loop ----------
    var raf = 0, leaving = false, textShown = false, hudShown = false, starShown = false;

    function showText() {
      if (textShown) return;
      textShown = true;
      word.offsetWidth;
      word.classList.add("is-in");
    }

    function leave() {
      if (leaving) return;
      leaving = true;
      if (!o.autoExit) { finish(); return; }
      root.classList.add("is-leaving");
      setTimeout(destroy, 520);
    }

    function frame(now) {
      if (start === null) start = now;
      var t = now - start;
      var dt = Math.min(64, Math.max(0, t - lastT));
      lastT = t;
      if (!hudShown && t > 120) { hudShown = true; hudClock.classList.add("is-on"); hudStat.classList.add("is-on"); }
      draw(t, dt);
      if (finAt !== null) {
        var fe = (t - finAt) / finScale;
        if (fe >= T.finText) showText();
        if (!leaving && fe >= T.finEnd + o.holdMs * finScale) leave();
      }
      if (!done || !o.autoExit) raf = requestAnimationFrame(frame);
    }

    // jump to the landed end state (only once loading is complete)
    function skip() {
      if (leaving || !completed || start === null) return;
      var t = lastT;
      shown = 1; target = 1;
      if (finAt === null || (t - finAt) / finScale < T.finEnd) finAt = t - T.finEnd * finScale;
      trail.length = 0;
      showText();
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); skip(); }
    }
    if (o.skippable) {
      root.addEventListener("click", skip);
      document.addEventListener("keydown", onKey);
    }

    function destroy() {
      cancelAnimationFrame(raf);
      global.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      if (o.el) { root.hidden = true; root.innerHTML = ""; root.className = "ls-intro"; root.removeAttribute("role"); root.removeAttribute("style"); }
      else if (root.parentNode) root.parentNode.removeChild(root);
      finish();
    }

    if (reduced) {                         // reduced motion: no flight, land in place once loaded
      T = Object.assign({}, T, { finLift: [0, 1], finDesc: [1, 2], finTouch: 2, finEnd: 300 });
    }

    raf = requestAnimationFrame(frame);
    return {
      setProgress: function (v) { bump(+v || 0); },
      complete: function () { completed = true; target = 1; },
      skip: skip,
      destroy: destroy
    };
  }

  global.LunaIntro = { mount: mount };
})(window);
