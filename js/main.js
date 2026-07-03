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
    var rainbowHue = 0;
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
      if (docEl.classList.contains('adhd')) { /* hard mode: fast rainbow loop overrides heat */
        rainbowHue = (rainbowHue + 9) % 360;
        docEl.style.setProperty('--accent', 'hsl(' + rainbowHue + ',95%,62%)');
        docEl.style.setProperty('--accent-deep', 'hsl(' + rainbowHue + ',80%,36%)');
        docEl.style.setProperty('--heat', '0');
        return;
      }
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

    var TRAIL_MAX = 800;   /* px of line on screen */
    var pts = [];          /* head first */
    var allowed = 0; /* current permitted trail length: earned by movement, spent by retraction */
    var mouseX = -9999, mouseY = -9999, mvx = 0, mvy = 0;
    window.addEventListener('mousemove', function (e) {
      if (mouseX > -9999) { mvx = e.clientX - mouseX; mvy = e.clientY - mouseY; }
      mouseX = e.clientX; mouseY = e.clientY;
      var h = pts[0];
      if (h && Math.abs(h.x - e.clientX) < 1 && Math.abs(h.y - e.clientY) < 1) return;
      if (h) allowed = Math.min(TRAIL_MAX * (docEl.classList.contains('adhd') ? 20 : 1), allowed + Math.hypot(e.clientX - h.x, e.clientY - h.y));
      /* which text block is the cursor inside? entering one flips its layer: under, over, under... */
      var blk = null;
      if (!docEl.classList.contains('adhd')) {
        if (Date.now() - inkAt > 250) refreshInk();
        for (var q = 0; q < inkRects.length; q++) {
          var eq = inkRects[q];
          if (e.clientX >= eq.r.left && e.clientX <= eq.r.right && e.clientY >= eq.r.top && e.clientY <= eq.r.bottom) { blk = eq.el; break; }
        }
        if (blk && blk !== lastTextEl) blk.__inkUnder = !blk.__inkUnder; /* first pass goes under */
        lastTextEl = blk;
      }
      pts.unshift({ x: e.clientX, y: e.clientY, u: blk ? !!blk.__inkUnder : false });
      if (pts.length > 12000) pts.length = 12000;
    }, { passive: true });

    function mixT(a, b, t) {
      return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
    }
    var ORANGE = [255, 122, 26], PURPLE = [108, 92, 231];
    function strokeSegs(list) {
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        tctx.strokeStyle = s.style; tctx.lineWidth = s.w;
        tctx.beginPath(); tctx.moveTo(s.ax, s.ay); tctx.lineTo(s.bx, s.by); tctx.stroke();
      }
    }
    function drawTrail() {
      if (pts.length < 2) { allowed = 0; return; }
      /* no idle decay in either mode: the trail window (800px / 16000px) holds until the mouse moves again */
      if (allowed <= 0) { allowed = 0; pts.length = 1; return; }
      tctx.lineCap = 'round'; tctx.lineJoin = 'round';
      var unders = [], overs = [], run = 0;
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
        (a.u ? unders : overs).push({ ax: a.x, ay: a.y, bx: end.x, by: end.y, w: 3 - 2 * t,
          style: 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha.toFixed(3) + ')' });
        run += seg;
        if (cut) { pts.length = i + 2; pts[i + 1] = end; break; }
      }
      if (docEl.classList.contains('adhd')) { strokeSegs(unders); strokeSegs(overs); return; }
      strokeSegs(unders);      /* these hide beneath the words... */
      maskTrailUnderText();    /* ...the words punch through them... */
      strokeSegs(overs);       /* ...and these lie on top */
    }
    /* ---- click fracture: spider-web crack from the click point, 5s fade ---- */
    var cracks = [], CRACK_MS = 5000;
    function makeCrack(cx, cy) {
      var segs = [], spokePts = [], maxR = 0;
      var size = 0.35 + Math.random() * 2.15; /* wider spread: tiny chips to huge shatters */
      var spokes = 7 + Math.floor(Math.random() * 4);
      for (var s = 0; s < spokes; s++) {
        var ang = (s / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var len = (130 + Math.random() * 200) * size;
        if (len > maxR) maxR = len;
        var x = cx, y = cy, r = 0, n = 4 + Math.floor(Math.random() * 3);
        var along = [{ x: cx, y: cy, r: 0 }];
        for (var i = 1; i <= n; i++) {
          var a2 = ang + (Math.random() - 0.5) * 0.55;
          var step = (len / n) * (0.7 + Math.random() * 0.6);
          var nx = x + Math.cos(a2) * step, ny = y + Math.sin(a2) * step;
          r += step;
          segs.push({ x1: x, y1: y, x2: nx, y2: ny, d: r });
          along.push({ x: nx, y: ny, r: r });
          x = nx; y = ny;
          if (i === 2 && Math.random() < 0.5) { /* occasional side branch */
            var ba = a2 + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.4);
            var bl = step * (0.8 + Math.random() * 0.8);
            segs.push({ x1: x, y1: y, x2: x + Math.cos(ba) * bl, y2: y + Math.sin(ba) * bl, d: r + bl });
          }
        }
        spokePts.push(along);
      }
      /* web rings tying neighbouring spokes together */
      [0.35, 0.68].forEach(function (f) {
        for (var s2 = 0; s2 < spokes; s2++) {
          var A = spokePts[s2], B = spokePts[(s2 + 1) % spokes];
          var pa = A[Math.max(1, Math.round(f * (A.length - 1)))];
          var pb = B[Math.max(1, Math.round(f * (B.length - 1)))];
          if (Math.random() < 0.75) segs.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, d: (pa.r + pb.r) / 2 });
        }
      });
      segs.forEach(function (g) { g.t = Math.min(1, g.d / maxR); });
      return { segs: segs, born: Date.now() };
    }
    window.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var onButton = adhdBtn && adhdBtn.contains(e.target);
      if (!adhdOn() && !onButton) return; /* normal mode: only the ADHD button itself shatters */
      cracks.push(makeCrack(e.clientX, e.clientY));
      if (cracks.length > 12) cracks.shift();
    });
    function drawCracks() {
      if (!cracks.length) return;
      var now = Date.now();
      cracks = cracks.filter(function (c) { return now - c.born < CRACK_MS; });
      cracks.forEach(function (c) {
        var k = (now - c.born) / CRACK_MS;
        var fade = 1 - k * k; /* holds bright, then lets go */
        c.segs.forEach(function (g) {
          var alpha = (g.t < 0.65 ? 1 : Math.max(0, (1 - g.t) / 0.35)) * fade;
          if (alpha <= 0.01) return;
          tctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
          tctx.lineWidth = Math.max(0.2, 1.5 - 1.3 * g.t); /* thinner overall, hairline at the far tips */
          tctx.beginPath(); tctx.moveTo(g.x1, g.y1); tctx.lineTo(g.x2, g.y2); tctx.stroke();
        });
      });
    }
    /* ---- hard mode: white balls with gravity, bouncing off words and boxes ---- */
    var balls = [], spawnTimer = null, obstacles = [], obsAt = 0;
    function adhdOn() { return docEl.classList.contains('adhd'); }
    function refreshObstacles() {
      obstacles = [];
      var H = window.innerHeight;
      /* visible boxes: bounce on the element rect */
      document.querySelectorAll('.card,.pfoot').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 8 && r.top < H && r.bottom > 0) obstacles.push(r);
      });
      /* text collision is handled by live per-letter solids (letterSolids) */
      obsAt = Date.now();
    }
    var SHAPES = ['circle', 'circle', 'star', 'plus', 'square', 'triangle'];
    function spawnBall() {
      if (balls.length >= 130) return;
      balls.push({ x: 30 + Math.random() * (window.innerWidth - 60), y: -12,
        vx: (Math.random() - 0.5) * 4, vy: 0, r: 4 + Math.random() * 6, born: Date.now(),
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.22 });
    }
    function scheduleBall() {
      spawnTimer = setTimeout(function () {
        if (!adhdOn()) return;
        spawnBall(); scheduleBall();
      }, 110 + Math.random() * 320);
    }
    var BALL_LIFE = 25000;
    function drawBalls() {
      if (!balls.length) return;
      var now = Date.now(), W = window.innerWidth, H = window.innerHeight;
      if (now - obsAt > 600) refreshObstacles();
      balls = balls.filter(function (b) { return now - b.born < BALL_LIFE && b.x < W + 60; });
      balls.forEach(function (b) {
        b.vy += 0.45; b.vx += 0.018; /* gravity tips down and a touch right: nothing ever sits still */
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * 0.8; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -b.vy * 0.62; b.vx *= 0.985; }
        if (b.vy > 0) { /* land on boxes */
          for (var i = 0; i < obstacles.length; i++) {
            var o = obstacles[i];
            if (b.x > o.left && b.x < o.right && b.y + b.r > o.top && b.y + b.r < o.top + Math.max(14, b.vy + 2)) {
              b.y = o.top - b.r; b.vy = -b.vy * 0.62; b.vx *= 0.985; break;
            }
          }
        }
        if (b.vy > 0) { /* letters are solid: land on them wherever they currently sit */
          for (var li = 0; li < letterSolids.length; li++) {
            var S = letterSolids[li];
            if (b.x > S.x - S.hw - b.r * 0.4 && b.x < S.x + S.hw + b.r * 0.4) {
              var topEdge = S.y - S.hh;
              if (b.y + b.r > topEdge && b.y + b.r < topEdge + Math.max(14, b.vy + 2)) {
                b.y = topEdge - b.r; b.vy = -b.vy * 0.62; b.vx *= 0.985; break;
              }
            }
          }
        }
        var age = now - b.born;
        var alpha = age > BALL_LIFE - 3000 ? Math.max(0, (BALL_LIFE - age) / 3000) : 1;
        b.rot += b.vr; /* tumbling */
        tctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        if (b.shape === 'circle') {
          tctx.beginPath(); tctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); tctx.fill();
        } else {
          tctx.save(); tctx.translate(b.x, b.y); tctx.rotate(b.rot);
          var r = b.r;
          tctx.beginPath();
          if (b.shape === 'square') {
            tctx.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
          } else if (b.shape === 'triangle') {
            for (var v = 0; v < 3; v++) { var a3 = -Math.PI / 2 + v * 2 * Math.PI / 3;
              tctx[v ? 'lineTo' : 'moveTo'](Math.cos(a3) * r * 1.15, Math.sin(a3) * r * 1.15); }
            tctx.closePath();
          } else if (b.shape === 'plus') {
            var t3 = r * 0.38;
            tctx.rect(-r, -t3, r * 2, t3 * 2); tctx.rect(-t3, -r, t3 * 2, r * 2);
          } else { /* star */
            for (var s5 = 0; s5 < 10; s5++) { var rr = s5 % 2 ? r * 0.45 : r * 1.2;
              var a5 = -Math.PI / 2 + s5 * Math.PI / 5;
              tctx[s5 ? 'lineTo' : 'moveTo'](Math.cos(a5) * rr, Math.sin(a5) * rr); }
            tctx.closePath();
          }
          tctx.fill(); tctx.restore();
        }
      });
    }
    /* ---- letter physics: the cursor shoves letters around, zero-G (ADHD mode) ---- */
    var letters = [], letterized = false, letterSolids = [];
    function letterize() {
      if (letterized) return; letterized = true;
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var p = n.parentElement;
          if (!p || p.closest('svg,script,style,.adhd-btn,.mq-track,.pmq,.lr')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var frag = document.createDocumentFragment(), s = n.nodeValue;
        for (var i = 0; i < s.length; i++) {
          var ch = s[i];
          if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
          var sp = document.createElement('span');
          sp.className = 'phys'; sp.textContent = ch;
          frag.appendChild(sp);
        }
        n.parentNode.replaceChild(frag, n);
      });
      document.querySelectorAll('span.phys, .lr .ch').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        var fixed = !!el.closest('#nav');
        letters.push({ el: el, fixed: fixed, bx: r.left + r.width / 2,
          by: r.top + r.height / 2 + (fixed ? 0 : window.scrollY),
          hw: r.width / 2, hh: r.height / 2,
          x: 0, y: 0, vx: 0, vy: 0 });
      });
    }
    function updateLetters() {
      letterSolids.length = 0;
      if (!letters.length) return;
      var H = window.innerHeight, sy = window.scrollY;
      for (var i = 0; i < letters.length; i++) {
        var L = letters[i];
        var cy = (L.fixed ? L.by : L.by - sy) + L.y;
        var onscreen = cy > -150 && cy < H + 150;
        if (onscreen) {
          var cx = L.bx + L.x;
          var dx = cx - mouseX, dy = cy - mouseY;
          if (dx > -26 && dx < 26 && dy > -26 && dy < 26) { /* only the cursor tip itself pushes */
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d < 26) {
              var f = 1 - d / 26;
              /* momentum-led: letters fly the way the mouse is moving (any direction), radial shove secondary */
              L.vx += mvx * 0.55 * f + (dx / d) * f * 1.3;
              L.vy += mvy * 0.55 * f + (dy / d) * f * 1.3;
            }
          }
          /* letters are solid ground for the falling shapes: publish live position */
          letterSolids.push({ x: cx, y: cy, hw: L.hw, hh: L.hh });
        }
        if (L.vx || L.vy) {
          L.x += L.vx; L.y += L.vy;
          L.vx *= 0.95; L.vy *= 0.95; /* zero gravity: pure drift with space drag */
          if (L.vx > -0.02 && L.vx < 0.02) L.vx = 0;
          if (L.vy > -0.02 && L.vy < 0.02) L.vy = 0;
          L.el.style.transform = 'translate(' + L.x.toFixed(1) + 'px,' + L.y.toFixed(1) + 'px)';
        }
      }
    }
    function lettersHome() {
      letters.forEach(function (L) {
        L.vx = L.vy = 0;
        if (L.x || L.y) {
          L.el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
          L.el.style.transform = '';
          L.x = L.y = 0;
        }
      });
      setTimeout(function () { letters.forEach(function (L) { L.el.style.transition = ''; }); }, 900);
    }
    var adhdBtn = document.getElementById('adhdbtn');
    if (adhdBtn) adhdBtn.addEventListener('click', function () {
      var on = docEl.classList.toggle('adhd');
      adhdBtn.setAttribute('aria-pressed', String(on));
      if (on) { letterize(); refreshObstacles(); for (var i = 0; i < 14; i++) spawnBall(); scheduleBall(); }
      else { clearTimeout(spawnTimer); balls = []; cracks = []; lettersHome(); }
    });
    /* ---- text ink map: the trail passes UNDER words (normal mode) ---- */
    var inkRects = [], inkAt = 0;
    function refreshInk() {
      inkRects = [];
      var H = window.innerHeight;
      var sel = 'h1,h2,h3,p,li,button,.svc b,.svc span,.ctag,.stat,.card h3,.meta,#nav a,.ig-corner,.alllink a,footer a,.pfoot a,.pcopy,.mq-track,.pmq';
      document.querySelectorAll(sel).forEach(function (el) {
        var er = el.getBoundingClientRect();
        if (er.top > H || er.bottom < 0 || er.width === 0) return;
        var rng = document.createRange(); rng.selectNodeContents(el);
        var rs = rng.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          var r = rs[i];
          if (r.width > 4 && r.height > 4 && r.top < H && r.bottom > 0) inkRects.push({ r: r, el: el });
        }
      });
      inkAt = Date.now();
    }
    var inkScrollBound = false, lastTextEl = null;
    function maskTrailUnderText() {
      if (Date.now() - inkAt > 250) refreshInk();
      if (!inkScrollBound) { inkScrollBound = true; window.addEventListener('scroll', function () { inkAt = 0; }, { passive: true }); }
      tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = '#000';
      for (var i = 0; i < inkRects.length; i++) {
        var e = inkRects[i];
        tctx.fillRect(e.r.left, e.r.top, e.r.width, e.r.height);
      }
      tctx.globalCompositeOperation = 'source-over';
    }
    function trailTick() {
      tctx.setTransform(tdpr, 0, 0, tdpr, 0, 0);
      tctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      tctx.lineCap = 'round'; tctx.lineJoin = 'round';
      drawTrail(); /* handles its own under/over layering around text */
      if (adhdOn()) updateLetters(); /* the cursor is a broom; shapes knock letters too */
      mvx *= 0.7; mvy *= 0.7;
      drawCracks();
      drawBalls();
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
