// Magiske effekter på et lerret over hele siden.
//   RH.fx.sparkle(x, y, { n, color, spread })   gnister fra et punkt
//   RH.fx.at(el, opts)                           gnister fra midten av et element
//   RH.fx.outline(el, opts)                      gnister langs kanten av et element
//   RH.fx.trail(x, y)                            litt stjernestøv (bak noe man drar)
//   RH.fx.fireworks(seconds)                     fyrverkeri over hele skjermen
//   RH.fx.ambient(kind, colors)                  rolig bakgrunn etter tema (null slår av)
//     kind: dust, smoke, fireflies, embers, sparks, bubbles, stars, sweets, tears, hearts, wind
window.RH = window.RH || {};
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.createElement('canvas');
  cv.className = 'fx';
  cv.setAttribute('aria-hidden', 'true');
  var cx = cv.getContext('2d'), parts = [], amb = [], raf = 0, W = 0, H = 0, D = 1;
  var ambKind = null, ambColors = null, fwUntil = 0, nextRocket = 0;
  var GOLD = ['#ffd98a', '#f5b941', '#fff6dc', '#ffe9b0'];

  function mount() { if (!cv.parentNode && document.body) { document.body.appendChild(cv); size(); } }
  function size() {
    D = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    cv.width = W * D; cv.height = H * D; cx.setTransform(D, 0, 0, D, 0, 0);
  }
  function pick(c) { return Array.isArray(c) ? c[(Math.random() * c.length) | 0] : c; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function add(p) { parts.push(p); if (parts.length > 1400) parts.splice(0, parts.length - 1400); kick(); }
  function kick() { mount(); if (!raf) raf = requestAnimationFrame(step); }

  function star(x, y, r, a) {
    cx.beginPath();
    for (var i = 0; i < 8; i++) { var ang = a + (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r; cx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
    cx.closePath(); cx.fill();
  }
  function heart(x, y, r) {
    cx.beginPath(); cx.moveTo(x, y + r * 0.9);
    cx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
    cx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    cx.fill();
  }

  /* ---------- Bakgrunn etter tema ---------- */
  var AMB = {
    dust:      { max: 90,  make: function () { return { x: rnd(0, W), y: H + 10, vx: rnd(-0.15, 0.15), vy: rnd(-0.9, -0.35), r: rnd(1, 2.6), life: 1, decay: 0.0025, tw: rnd(0, 6) }; } },
    smoke:     { max: 26,  make: function () { return { x: rnd(-100, W + 100), y: H + 120, vx: rnd(-0.3, 0.3), vy: rnd(-0.6, -0.25), r: rnd(90, 200), life: 1, decay: 0.0018, tw: rnd(0, 6) }; } },
    fireflies: { max: 45,  make: function () { return { x: rnd(0, W), y: rnd(H * 0.3, H), vx: 0, vy: 0, r: rnd(1.6, 3), life: 1, decay: 0.002, tw: rnd(0, 6), sp: rnd(0.4, 1) }; } },
    embers:    { max: 110, make: function () { return { x: rnd(0, W), y: H + 10, vx: rnd(-0.6, 0.6), vy: rnd(-2.6, -1), r: rnd(1, 2.8), life: 1, decay: rnd(0.004, 0.009), tw: rnd(0, 6) }; } },
    sparks:    { max: 70,  make: function () { return { x: rnd(0, W), y: rnd(0, H), vx: 0, vy: rnd(-0.2, 0), r: rnd(2, 6), life: 1, decay: rnd(0.006, 0.014), tw: rnd(0, 6), rot: rnd(0, 6) }; } },
    bubbles:   { max: 60,  make: function () { return { x: rnd(0, W), y: H + 20, vx: 0, vy: rnd(-1.4, -0.5), r: rnd(3, 14), life: 1, decay: 0.002, tw: rnd(0, 6) }; } },
    stars:     { max: 120, make: function () { return { x: rnd(0, W), y: rnd(0, H * 0.75), vx: 0, vy: 0, r: rnd(0.6, 1.8), life: 1, decay: rnd(0.0015, 0.004), tw: rnd(0, 6) }; } },
    sweets:    { max: 70,  make: function () { return { x: rnd(0, W), y: -20, vx: rnd(-0.4, 0.4), vy: rnd(0.5, 1.3), r: rnd(3, 6), life: 1, decay: 0.0015, tw: rnd(0, 6), rot: rnd(0, 6), vr: rnd(-0.05, 0.05) }; } },
    tears:     { max: 60,  make: function () { return { x: rnd(0, W), y: -30, vx: 0, vy: rnd(1.2, 2.6), r: rnd(0.8, 1.6), len: rnd(10, 28), life: 1, decay: 0.002, tw: 0 }; } },
    hearts:    { max: 40,  make: function () { return { x: rnd(0, W), y: H + 20, vx: rnd(-0.3, 0.3), vy: rnd(-1, -0.4), r: rnd(4, 9), life: 1, decay: 0.0025, tw: rnd(0, 6) }; } },
    wind:      { max: 40,  make: function () { return { x: -200, y: rnd(0, H), vx: rnd(6, 13), vy: rnd(-0.3, 0.3), r: rnd(0.6, 1.6), len: rnd(60, 180), life: 1, decay: 0.004, tw: 0 }; } }
  };
  function drawAmb(p, now) {
    var a = Math.min(1, p.life * 3) * Math.min(1, (1 - p.life) * 8 + 0.0001);
    cx.fillStyle = cx.strokeStyle = p.c;
    switch (p.k) {
      case 'smoke': {
        var g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
        cx.globalAlpha = a * 0.13; cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); break;
      }
      case 'fireflies':
        p.x += Math.sin(now / 900 * p.sp + p.tw) * 0.6; p.y += Math.cos(now / 1100 * p.sp + p.tw * 2) * 0.4;
        cx.globalAlpha = a * (0.25 + 0.75 * Math.max(0, Math.sin(now / 500 * p.sp + p.tw)));
        cx.shadowColor = p.c; cx.shadowBlur = 12; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); cx.shadowBlur = 0; break;
      case 'embers':
        p.vx += Math.sin(now / 300 + p.tw) * 0.03;
        cx.globalAlpha = a * (0.6 + 0.4 * Math.sin(now / 90 + p.tw)); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); break;
      case 'sparks':
        cx.globalAlpha = Math.sin(p.life * Math.PI) * 0.9; star(p.x, p.y, p.r * Math.sin(p.life * Math.PI), p.rot + now / 900); break;
      case 'bubbles':
        p.x += Math.sin(now / 400 + p.tw) * 0.4;
        cx.globalAlpha = a * 0.5; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.stroke();
        cx.globalAlpha = a * 0.6; cx.beginPath(); cx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.2, 0, 6.283); cx.fill(); break;
      case 'stars':
        cx.globalAlpha = Math.sin(p.life * Math.PI) * (0.5 + 0.5 * Math.sin(now / 300 + p.tw)); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); break;
      case 'sweets':
        p.rot += p.vr; p.x += Math.sin(now / 700 + p.tw) * 0.3;
        cx.globalAlpha = a * 0.75; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); cx.restore(); break;
      case 'tears':
        cx.globalAlpha = a * 0.35; cx.lineWidth = p.r; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x, p.y - p.len); cx.stroke(); break;
      case 'hearts':
        p.x += Math.sin(now / 600 + p.tw) * 0.5; cx.globalAlpha = a * 0.55; heart(p.x, p.y, p.r); break;
      case 'wind':
        cx.globalAlpha = a * 0.25; cx.lineWidth = p.r; cx.beginPath(); cx.moveTo(p.x, p.y); cx.quadraticCurveTo(p.x - p.len / 2, p.y - 6, p.x - p.len, p.y); cx.stroke(); break;
      default:
        cx.globalAlpha = a * (0.35 + 0.35 * Math.sin(now / 400 + p.tw)); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
    }
  }

  function step() {
    cx.clearRect(0, 0, W, H);
    var now = performance.now();
    // Bakgrunnen
    if (ambKind) {
      var spec = AMB[ambKind];
      if (amb.length < spec.max && Math.random() < 0.5) { var q = spec.make(); q.c = pick(ambColors); q.k = ambKind; amb.push(q); }
    }
    cx.globalCompositeOperation = 'lighter';
    for (var j = amb.length - 1; j >= 0; j--) {
      var b = amb[j];
      b.x += b.vx; b.y += b.vy; b.life -= ambKind ? b.decay : 0.03;
      if (b.life <= 0 || b.y < -250 || b.y > H + 250 || b.x > W + 300) { amb.splice(j, 1); continue; }
      drawAmb(b, now);
    }
    // Gnister og fyrverkeri
    if (now < fwUntil && now > nextRocket) {
      nextRocket = now + 260 + Math.random() * 380;
      add({ x: W * (0.15 + Math.random() * 0.7), y: H + 10, vx: (Math.random() - 0.5) * 2, vy: -(H / 70 + Math.random() * 4), g: 0.12, life: 1, decay: 0.008, r: 2.5, c: '#fff6dc', kind: 'rocket', boomAt: H * (0.12 + Math.random() * 0.35) });
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += p.g; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.kind === 'rocket' && (p.y < p.boomAt || p.vy > -1)) {
        p.life = 0;
        var col = [['#ffd98a', '#f5b941'], ['#e8604f', '#ffb4a8'], ['#7fd39a', '#e8ffef'], ['#4fa6e8', '#cfe8ff'], ['#b583ea', '#ead9ff']][(Math.random() * 5) | 0];
        burst(p.x, p.y, 70, col, 5.5);
        if (RH.music) RH.music.sfx('pop');
      }
      if (p.kind === 'rocket') add({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0.02, life: 0.6, decay: 0.03, r: 1.4, c: '#ffd98a', kind: 'dot' });
      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, p.life));
      cx.globalAlpha = a; cx.fillStyle = p.c;
      if (p.kind === 'star') { p.rot += p.vr; star(p.x, p.y, p.r * (0.6 + a * 0.6), p.rot); }
      else { cx.beginPath(); cx.arc(p.x, p.y, p.r * (p.kind === 'dot' ? a : 1), 0, 6.283); cx.fill(); }
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    raf = parts.length || amb.length || ambKind || now < fwUntil ? requestAnimationFrame(step) : 0;
  }

  function burst(x, y, n, color, speed) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * 6.283, s = (0.3 + Math.random()) * speed;
      add({ x: x, y: y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, g: 0.05, life: 1, decay: 0.012 + Math.random() * 0.012,
        r: i % 3 ? 1.6 + Math.random() * 1.6 : 4 + Math.random() * 3, c: pick(color), kind: i % 3 ? 'dot' : 'star', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
    }
  }

  RH.fx = {
    sparkle: function (x, y, o) { if (reduced) return; o = o || {}; burst(x, y, o.n || 40, o.color || GOLD, o.spread || 4); },
    at: function (el, o) {
      if (reduced || !el || !el.getBoundingClientRect) return;
      var r = el.getBoundingClientRect();
      RH.fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, o);
    },
    outline: function (el, o) {
      if (reduced || !el) return;
      o = o || {};
      var r = el.getBoundingClientRect(), n = o.n || 60, per = 2 * (r.width + r.height);
      for (var i = 0; i < n; i++) {
        var d = (i / n) * per, x, y;
        if (d < r.width) { x = r.left + d; y = r.top; }
        else if (d < r.width + r.height) { x = r.right; y = r.top + d - r.width; }
        else if (d < 2 * r.width + r.height) { x = r.right - (d - r.width - r.height); y = r.bottom; }
        else { x = r.left; y = r.bottom - (d - 2 * r.width - r.height); }
        add({ x: x, y: y, vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 1.8, g: 0.03, life: 1, decay: 0.015 + Math.random() * 0.015, r: 1.5 + Math.random() * 2, c: pick(o.color || GOLD), kind: i % 4 ? 'dot' : 'star', rot: 0, vr: 0.1 });
      }
    },
    trail: function (x, y, color) {
      if (reduced) return;
      for (var i = 0; i < 2; i++) add({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 0.8, g: 0.02, life: 0.9, decay: 0.03, r: 1 + Math.random() * 2, c: pick(color || GOLD), kind: Math.random() < 0.25 ? 'star' : 'dot', rot: 0, vr: 0.1 });
    },
    fireworks: function (secs) { if (reduced) return; fwUntil = performance.now() + (secs || 5) * 1000; nextRocket = 0; kick(); },
    ambient: function (kind, colors) {
      if (reduced) return;
      if (kind === ambKind && String(colors) === String(ambColors)) return;
      ambKind = AMB[kind] ? kind : null; ambColors = colors || GOLD;
      // Det gamle temaet tones ut av seg selv (levetiden synker raskt når temaet er byttet).
      amb.forEach(function (p) { p.life = Math.min(p.life, 0.3); });
      if (ambKind) kick();
    },
    /** Gammelt navn: rolig gullstøv. */
    dust: function (on) { RH.fx.ambient(on ? 'dust' : null); }
  };
  window.addEventListener('resize', function () { if (cv.parentNode) size(); });
})();
