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
    setInterval(ribbonTick, 33);
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
