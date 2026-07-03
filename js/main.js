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
    var pad = Math.max(w * 0.02, 12);
    kts.forEach(function (t) {
      t.setAttribute('font-size', '100');
      var len = t.getComputedTextLength();
      if (len > 0) t.setAttribute('font-size', String(100 * (w - pad * 2) / len));
    });
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
      s.setAttribute('data-ch', ch);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
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
    var lastApplied = -1;
    var lastFrameAt = 0;
    function tickWork() {
      /* ribbon text: frame-synced, time-based (no interval jitter) */
      ribbonTick();
      /* velocity by position polling */
      var now = Date.now(), y = window.scrollY;
      var dt = Math.max(now - lastT, 1);
      if (dt >= 30) {
        var v = Math.abs(y - lastY) / dt * 1000;
        lastY = y; lastT = now;
        var target = Math.min(1, v / 1300);
        if (target > heat) {
          if (wasCold && grainT) { grainT.setAttribute('seed', String(Math.floor(Math.random() * 1000))); }
          wasCold = false;
          heat = target;
        }
        heat *= 0.94;
        if (heat < 0.05) { heat = 0; wasCold = true; }
        if (heat !== lastApplied) { /* only touch page-wide styles when something changed */
          docEl.style.setProperty('--accent', mixHex('#6C5CE7', '#ff7a1a', heat));
          docEl.style.setProperty('--accent-deep', mixHex('#41348f', '#b35110', heat));
          docEl.style.setProperty('--heat', String(heat.toFixed(3)));
          if (grainA) grainA.setAttribute('intercept', String((heat * 3.4 - 2.6).toFixed(3)));
          lastApplied = heat;
        }
      }
    }
    function frame() {
      lastFrameAt = Date.now();
      tickWork();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    /* fallback: if rAF is throttled/suspended, keep coarse motion alive (work only, no extra rAF chain) */
    setInterval(function () { if (Date.now() - lastFrameAt > 500) tickWork(); }, 400);
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
