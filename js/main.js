/* Cravin' Adventure Studios site: motion system.
   Zero dependencies. CSS drives all animation (wall-clock safe in
   background tabs); JS only toggles classes, sizes the knockout,
   runs countups, and manages video playback. */

(function () {
  var docEl = document.documentElement;
  docEl.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) docEl.classList.add('motion-off');

  /* ---------- knockout text sizing ---------- */
  var svg = document.querySelector('.knockout');
  var kts = document.querySelectorAll('.kt');
  function fitKnockout() {
    if (!svg || !kts.length) return;
    var w = svg.clientWidth || window.innerWidth;
    var hgt = svg.clientHeight || window.innerHeight;
    var pad = Math.max(w * 0.02, 12);
    var sizes = [];
    kts.forEach(function (t) {
      t.setAttribute('font-size', '100');
      var len = t.getComputedTextLength();
      var fs = len > 0 ? 100 * (w - pad * 2) / len : 100;
      t.setAttribute('font-size', String(fs));
      sizes.push(fs);
    });
    /* equal VISUAL gaps: lines differ in cap height, so space by cap height, not fixed % */
    if (kts.length === 3) {
      var CAP = 0.72; /* Archivo cap-height ratio */
      var caps = sizes.map(function (s) { return s * CAP; });
      var portrait = hgt > w * 1.05;
      var gap, topCap;
      if (portrait) {
        /* compact block, upper-centered: no giant voids on tall screens */
        gap = caps[1] * 0.55;
        var block = caps[0] + caps[1] + caps[2] + gap * 2;
        topCap = Math.max(hgt * 0.14, (hgt * 0.72 - block) / 2 + hgt * 0.10);
      } else {
        topCap = hgt * 0.13;
        var bottomBase = hgt * 0.815;
        gap = (bottomBase - topCap - caps[0] - caps[1] - caps[2]) / 2;
      }
      var y1 = topCap + caps[0];
      var y2 = y1 + gap + caps[1];
      var y3 = y2 + gap + caps[2];
      kts[0].setAttribute('y', String(y1));
      kts[1].setAttribute('y', String(y2));
      kts[2].setAttribute('y', String(y3));
    }
  }

  /* ---------- letter-roll: split link text into per-letter spans ---------- */
  document.querySelectorAll('.lr').forEach(function (link) {
    var text = link.textContent;
    link.textContent = '';
    link.setAttribute('aria-label', text);
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      var glyph = ch === ' ' ? '\u00A0' : ch; /* inline-block collapses plain spaces */
      s.setAttribute('data-ch', glyph);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = glyph;
      link.appendChild(s);
    });
  });

  /* ---------- video playback: only while in view ---------- */
  var vids = document.querySelectorAll('video');
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && !reduceMotion) {
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.2 });
    vids.forEach(function (v) { vio.observe(v); });
  }
  /* paint a real frame (not a black lead-in) while paused */
  vids.forEach(function (v) {
    function nudge() { if (v.paused && v.currentTime < 0.5) { try { v.currentTime = 1.5; } catch (e) {} } }
    if (!v.hasAttribute('poster')) v.addEventListener('loadedmetadata', nudge);
    v.addEventListener('pause', nudge); /* covers poster videos that started then paused on a black frame */
  });
  /* ---------- scroll roll-ups + countups (IO toggles a class; CSS animates) ---------- */
  function countUp(el) {
    var from = parseInt(el.getAttribute('data-from') || '0', 10);
    var to = parseInt(el.getAttribute('data-to') || el.textContent, 10);
    var dur = 1200, t0 = null;
    el.textContent = String(from);
    function tick(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / dur, 1);
      k = 1 - Math.pow(1 - k, 3); /* ease-out cubic */
      el.textContent = String(Math.round(from + (to - from) * k));
      if (k < 1) requestAnimationFrame(tick); else el.textContent = String(to);
    }
    requestAnimationFrame(tick);
    /* wall-clock safety: guarantee the final value even if rAF is throttled */
    setTimeout(function () { el.textContent = String(to); }, dur + 200);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('.count').forEach(countUp);
        rio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- exit transition on outbound links ---------- */
  var veil = document.getElementById('exit-veil');
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      if (reduceMotion || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      var href = a.href;
      veil.classList.add('on');
      setTimeout(function () {
        window.open(href, '_blank', 'noopener');
        setTimeout(function () { veil.classList.remove('on'); }, 350);
      }, 300);
    });
  });

  /* hero reel: 2s cuts from every animation in the library, back to back */

  /* ---------- curved ribbon marquee: text rides the path ---------- */
  var tp = document.getElementById('ribbonTP');
  if (tp && !reduceMotion) {
    var third = 0;
    function ribbonMeasure() {
      try { var t = tp.getComputedTextLength(); if (t) third = t / 3; } catch (e) {}
    }
    ribbonMeasure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ribbonMeasure);
    function ribbonTick() {
      if (!third) { ribbonMeasure(); return; }
      /* left-to-right: offset climbs from -third up to 0, then wraps */
      var speed = 230; /* path units per second */
      var off = -third + ((Date.now() / 1000 * speed) % third);
      tp.setAttribute('startOffset', String(off));
    }
    /* scroll-velocity heat: purple -> orange, grainy dissolve back */
    var grainA = document.getElementById('grainA');
    var grainT = document.getElementById('grainT');
    var heat = 0, lastY = window.scrollY, lastT = Date.now(), wasCold = true;
    window.addEventListener('scroll', function () {
      var now = Date.now(), y = window.scrollY;
      var dt = Math.max(now - lastT, 1);
      var v = Math.abs(y - lastY) / dt * 1000; /* px per second */
      lastY = y; lastT = now;
      var target = Math.min(1, v / 1300);
      if (target > heat) {
        if (wasCold && grainT) { /* new gust: new random grain pattern */
          grainT.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
          wasCold = false;
        }
        heat = target;
      }
    }, { passive: true });
    /* page-wide heat: the accent variable itself glides purple -> orange */
    function mixHex(a, b, t) {
      var pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
      var pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
      var m = pa.map(function (x, i) { return Math.round(x + (pb[i] - x) * t); });
      return 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')';
    }
    var lastFrameAt = 0;
    function frame() {
      lastFrameAt = Date.now();
      ribbonTick(); /* text motion only: frame-synced, no jitter */
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    setInterval(function () { if (Date.now() - lastFrameAt > 500) ribbonTick(); }, 400);

    /* heat: its own steady clock so color reacts DURING the scroll */
    setInterval(function () {
      var now = Date.now(), y = window.scrollY;
      var dt = Math.max(now - lastT, 1);
      var v = Math.abs(y - lastY) / dt * 1000;
      lastY = y; lastT = now;
      var target = Math.min(1, v / 1300);
      if (target > heat) {
        if (wasCold && grainT) { grainT.setAttribute('seed', String(Math.floor(Math.random() * 1000))); }
        wasCold = false;
        heat = target;
      }
      heat *= 0.965;
      if (heat < 0.006) { heat = 0; wasCold = true; }
      docEl.style.setProperty('--accent', mixHex('#6C5CE7', '#ff7a1a', heat));
      docEl.style.setProperty('--accent-deep', mixHex('#41348f', '#b35110', heat));
      docEl.style.setProperty('--heat', String(heat.toFixed(3)));
      if (grainA) grainA.setAttribute('intercept', String((heat * 3.0 - 2.6).toFixed(3)));
    }, 33);
  }

  /* ---------- cursor trail: orange head, purple fade, erases itself ---------- */
  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    var tc = document.createElement('canvas');
    tc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:300;pointer-events:none';
    tc.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tc);
    var tctx = tc.getContext('2d');
    var tdpr = 1;
    function sizeTrail() {
      tdpr = Math.min(window.devicePixelRatio || 1, 2);
      tc.width = window.innerWidth * tdpr; tc.height = window.innerHeight * tdpr;
    }
    sizeTrail();
    window.addEventListener('resize', sizeTrail);

    var TRAIL_MAX = 100;   /* px of line on screen */
    var RETRACT = 3.5;     /* px eaten from the tail every frame: the self-erase */
    var pts = [];          /* head first */
    window.addEventListener('mousemove', function (e) {
      var h = pts[0];
      if (h && Math.abs(h.x - e.clientX) < 1 && Math.abs(h.y - e.clientY) < 1) return;
      pts.unshift({ x: e.clientX, y: e.clientY });
      if (pts.length > 300) pts.length = 300;
    }, { passive: true });

    var allowed = 0; /* current permitted trail length */
    function mixT(a, b, t) {
      return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
    }
    var ORANGE = [255, 122, 26], PURPLE = [108, 92, 231];
    function trailTick() {
      tctx.setTransform(tdpr, 0, 0, tdpr, 0, 0);
      tctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (pts.length < 2) { allowed = 0; return; }
      /* grow toward the cap while moving, always retract: net effect erases when idle */
      allowed = Math.min(allowed + 24, TRAIL_MAX) - RETRACT;
      if (allowed <= 0) { allowed = 0; pts.length = 1; return; }
      tctx.lineCap = 'round'; tctx.lineJoin = 'round';
      var run = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var seg = Math.sqrt(dx * dx + dy * dy);
        if (seg === 0) continue;
        var end = b, cut = false;
        if (run + seg > allowed) { /* trim the tail mid-segment */
          var k = (allowed - run) / seg;
          end = { x: a.x + dx * k, y: a.y + dy * k };
          cut = true;
        }
        var t = Math.min(1, (run + seg / 2) / allowed); /* 0 head -> 1 tail */
        var col = mixT(ORANGE, PURPLE, Math.min(1, t / 0.55));
        var alpha = t < 0.65 ? 1 : Math.max(0, (1 - t) / 0.35); /* purple sinks to black */
        tctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha.toFixed(3) + ')';
        tctx.lineWidth = 3 - 2 * t;
        tctx.beginPath(); tctx.moveTo(a.x, a.y); tctx.lineTo(end.x, end.y); tctx.stroke();
        run += seg;
        if (cut) { pts.length = i + 2; pts[i + 1] = end; break; }
      }
    }
    var lastTrailAt = 0;
    function trailFrame() { lastTrailAt = Date.now(); trailTick(); requestAnimationFrame(trailFrame); }
    requestAnimationFrame(trailFrame);
    setInterval(function () { if (Date.now() - lastTrailAt > 500) trailTick(); }, 250);
  }

  /* ---------- boot ---------- */
  function boot() {
    fitKnockout();
    window.addEventListener('resize', fitKnockout);
    document.body.classList.add('loaded');
    var hv = document.getElementById('herovid');
    if (hv && !reduceMotion) { var hp = hv.play(); if (hp && hp.catch) hp.catch(function () {}); }
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    /* safety: never let a hung font promise keep the page dark */
    setTimeout(boot, 2500);
  } else {
    window.addEventListener('load', boot);
  }
})();
