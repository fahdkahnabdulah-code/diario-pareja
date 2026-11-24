// ─────────────────────────────────────────────
// Juegos de Dopi a pantalla completa:
//   · 'car'  — Dopi conduce un coche por colinas (estilo Hill Drive): gasolina, chispas y volteretas.
//   · 'jump' — Dopi salta de plataforma en plataforma hacia arriba; si falla, cae y se acaba.
// Todo se dibuja en <canvas> (sin imágenes ni emojis). Este fichero no toca Firestore: avisa con
// onDone(score) y mascota-ui.js guarda puntos y récords.
//
//   DopiJuegos.start('car' | 'jump', {
//     dopi: '<svg…>', dopiSad: '<svg…>',      // marcado de Dopi (dopi.js)
//     best: { me: n, partner: n }, partnerName: 'Alba',
//     stars: [a, b, c],                        // umbrales de estrellas
//     onDone(score, info), onExit()
//   })
// ─────────────────────────────────────────────
(function (root) {
  'use strict';

  var PAL = {
    sky1: '#BFE7F1', sky2: '#FDEBDD', hill1: '#CFE8C4', hill2: '#9DCB86', grass: '#6FAE6F', grassDk: '#4F8E55',
    dirt: '#C99B76', dirtDk: '#A97A57', ink: '#5A1E33', pink: '#E0508A', pinkLt: '#F6A9C6', teal: '#17A493', gold: '#F5C451', goldDk: '#B88A1E',
    white: '#FFFFFF', cloud: '#FFFFFF', spider: '#6A4B7A'
  };

  var ov = null, G = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function spark(c, x, y, r, rot) {          // chispa de cuatro puntas (la moneda de la app)
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * 0.42 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.goldDk; c.lineJoin = 'round'; c.stroke(); c.restore();
  }
  function star(c, x, y, r, fill, stroke) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 2; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke();
  }
  function starSvg(on) {
    return '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 6 20.9l1.3-6.7-5-4.7 6.8-.8Z" fill="' + (on ? '#F5C451' : '#E6DFD6') + '" stroke="' + (on ? '#B88A1E' : '#BDB3A6') + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  /* ---------- armazón común ---------- */
  function start(kind, o) {
    if (ov) stop(true);
    o = o || {};
    ov = document.createElement('div');
    ov.className = 'jg-ov jg-' + kind;
    var best = o.best || { me: 0, partner: 0 };
    ov.innerHTML =
      '<canvas class="jg-cv"></canvas>' +
      '<div class="jg-dopi" aria-hidden="true">' + (o.dopi || '') + '</div>' +
      '<div class="jg-hud"><div class="jg-score"><b id="jg-sc">0</b><span id="jg-unit"></span></div>' +
      '<div class="jg-rec"><span class="jg-chip">Tu récord <b>' + (best.me | 0) + '</b></span>' +
      (o.partnerName ? '<span class="jg-chip jg-chip-p">' + esc(o.partnerName) + ' <b>' + (best.partner | 0) + '</b></span>' : '') + '</div>' +
      '<button type="button" class="jg-x" aria-label="Salir"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#5A1E33" stroke-width="2.6" stroke-linecap="round"/></svg></button></div>' +
      '<div class="jg-fuelwrap" hidden><span>Gasolina</span><div class="jg-fuel"><i id="jg-fuel"></i></div><span class="jg-coins" id="jg-coins"></span></div>' +
      '<div class="jg-count" id="jg-count"></div>' +
      '<div class="jg-pedals" hidden><div class="jg-pedal jg-brake" data-p="brake"><span>Frenar</span></div><div class="jg-pedal jg-gas" data-p="gas"><span>Acelerar</span></div></div>' +
      '<div class="jg-help" id="jg-help"></div>';
    document.body.appendChild(ov);
    var cv = ov.querySelector('canvas'), dpr = Math.min(2, root.devicePixelRatio || 1);
    var W = ov.clientWidth || root.innerWidth, H = ov.clientHeight || root.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    G = {
      kind: kind, o: o, W: W, H: H, c: c, cv: cv, best: best, dopiEl: ov.querySelector('.jg-dopi'), done: false, started: false,
      keys: { left: false, right: false, gas: false, brake: false }, ptr: { gas: false, brake: false, x: null },
      raf: 0, last: 0, timers: [], score: 0, S: null, time: 0
    };
    ov.querySelector('.jg-x').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); finish(true); });
    bind();
    G.S = kind === 'car' ? carInit() : jumpInit();
    ov.querySelector('#jg-unit').textContent = ' pts';
    if (kind === 'car') { ov.querySelector('.jg-fuelwrap').hidden = false; ov.querySelector('.jg-pedals').hidden = false; }
    ov.querySelector('#jg-help').textContent = kind === 'car' ? 'Mantén pulsado Acelerar; Frenar para ir despacio. En el aire, inclínate con los pedales.' : 'Arrastra el dedo a izquierda y derecha. Rebota de plataforma en plataforma sin caer.';
    draw();                                   // primer fotograma bajo la cuenta atrás
    var cnt = ov.querySelector('#jg-count'), seq = ['3', '2', '1', '¡Ya!'];
    seq.forEach(function (t, i) {
      G.timers.push(setTimeout(function () {
        if (!G) return; cnt.textContent = t; cnt.classList.remove('is-pop'); void cnt.offsetWidth; cnt.classList.add('is-pop');
        if (i === seq.length - 1) G.timers.push(setTimeout(function () {
          if (!G) return; cnt.textContent = ''; ov.querySelector('#jg-help').textContent = ''; G.started = true; G.last = performance.now(); G.raf = requestAnimationFrame(loop);
        }, 450));
      }, 400 + i * 650));
    });
    return { stop: function () { stop(true); } };
  }

  function bind() {
    var el = ov;
    function pedal(e, on) { var p = e.target.closest && e.target.closest('.jg-pedal'); if (p) { G.ptr[p.getAttribute('data-p')] = on; e.preventDefault(); } }
    el.addEventListener('pointerdown', function (e) {
      if (!G) return;
      if (G.kind === 'car') { pedal(e, true); }
      else { G.ptr.x = e.clientX; }
    });
    el.addEventListener('pointermove', function (e) { if (G && G.kind === 'jump' && e.buttons !== 0) G.ptr.x = e.clientX; else if (G && G.kind === 'jump' && e.pointerType !== 'mouse') G.ptr.x = e.clientX; });
    function up(e) { if (!G) return; G.ptr.gas = false; G.ptr.brake = false; }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    G.kd = function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') { G.keys.left = true; G.keys.brake = true; }
      if (k === 'ArrowRight' || k === 'd') { G.keys.right = true; G.keys.gas = true; }
      if (k === 'ArrowUp') G.keys.gas = true; if (k === 'ArrowDown') G.keys.brake = true;
    };
    G.ku = function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') { G.keys.left = false; G.keys.brake = false; }
      if (k === 'ArrowRight' || k === 'd') { G.keys.right = false; G.keys.gas = false; }
      if (k === 'ArrowUp') G.keys.gas = false; if (k === 'ArrowDown') G.keys.brake = false;
    };
    root.addEventListener('keydown', G.kd); root.addEventListener('keyup', G.ku);
    el.style.touchAction = 'none';
  }

  function stop(silent) {
    if (!G) return;
    cancelAnimationFrame(G.raf); G.timers.forEach(clearTimeout);
    root.removeEventListener('keydown', G.kd); root.removeEventListener('keyup', G.ku);
    var o = G.o; G = null;
    if (ov) { ov.remove(); ov = null; }
    if (!silent && o.onExit) o.onExit();
  }

  function setScore(n) {
    G.score = n; var e = ov && ov.querySelector('#jg-sc'); if (e) e.textContent = String(n);
  }

  function finish(cancel) {
    if (!G || G.done) return;
    G.done = true; cancelAnimationFrame(G.raf);
    var o = G.o;
    if (cancel) { var ex = o.onExit; stop(true); if (ex) ex(); return; }
    var score = Math.max(0, Math.round(G.score)), best = G.best, T = o.stars || [1, 2, 3];
    var stars = score >= T[2] ? 3 : score >= T[1] ? 2 : score >= T[0] ? 1 : 0;
    var nuevo = score > (best.me | 0) && score > 0, supera = o.partnerName && best.partner > 0 && score > best.partner;
    var msg = ['¡Buen intento!', '¡Bien jugado!', '¡Genial!', '¡Increíble!'][stars];
    var box = document.createElement('div'); box.className = 'jg-result';
    box.innerHTML = '<div class="jg-card"><b class="jg-title">' + msg + '</b>' +
      '<div class="jg-stars">' + [0, 1, 2].map(function (i) { return starSvg(i < stars); }).join('') + '</div>' +
      '<div class="jg-big">' + score + '<small>' + ' puntos' + '</small></div>' +
      '<div class="jg-lines">' +
      (nuevo ? '<p class="jg-new">¡Nuevo récord tuyo!</p>' : '<p>Tu récord: <b>' + (best.me | 0) + '</b></p>') +
      (o.partnerName ? '<p>' + (supera ? '¡Has superado el récord de ' + esc(o.partnerName) + '!' : 'Récord de ' + esc(o.partnerName) + ': <b>' + (best.partner | 0) + '</b>') + '</p>' : '') +
      '</div><button type="button" class="jg-ok">Listo</button></div>';
    ov.appendChild(box);
    ov.querySelector('.jg-ok').addEventListener('click', function () { stop(true); if (o.onClose) o.onClose(); });
    if (o.onDone) o.onDone(score, { stars: stars, nuevo: nuevo, supera: supera });
  }

  function loop(now) {
    if (!G || G.done) return;
    var dt = Math.min(0.033, (now - G.last) / 1000); G.last = now; G.time += dt;
    if (G.kind === 'car') carStep(dt); else jumpStep(dt);
    if (G && !G.done) { draw(); G.raf = requestAnimationFrame(loop); }
  }
  function draw() { if (!G) return; if (G.kind === 'car') carDraw(); else jumpDraw(); }

  function placeDopi(x, y, rot, s) {
    var d = G.dopiEl; if (!d) return;
    d.style.transform = 'translate(' + (x - 36) + 'px,' + (y - 36) + 'px) rotate(' + (rot || 0) + 'rad) scale(' + (s || 1) + ')';
  }
  function setDopi(html) { if (G && G.dopiEl && G.dopiHtml !== html) { G.dopiEl.innerHTML = html; G.dopiHtml = html; } }

  function sky(c, W, H, camX, camY) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, PAL.sky1); g.addColorStop(1, PAL.sky2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sol suave
    c.fillStyle = 'rgba(255,236,170,.75)'; c.beginPath(); c.arc(W * 0.8, H * 0.14, 34, 0, 7); c.fill();
    // nubes lejanas con paralaje
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (var i = 0; i < 6; i++) {
      var cx = ((i * 230 - camX * 0.12) % (W + 260) + (W + 260)) % (W + 260) - 130, cy = 60 + (i * 47) % 150 - camY * 0.02;
      c.beginPath(); c.arc(cx, cy, 18, 0, 7); c.arc(cx + 20, cy - 8, 22, 0, 7); c.arc(cx + 44, cy, 17, 0, 7); c.fill();
    }
  }

  /* ═════════════ COCHE ═════════════ */
  var CAR = { L: 36, R: 16, G: 900, ACC: 300, VMAX: 430, FUEL_IDLE: 3.4, FUEL_GAS: 4.8 };

  function terr(x, H) {
    var amp = 22 + Math.min(58, x / 90), k = clamp(x / 420, 0, 1); k = k * k * (3 - 2 * k);
    var base = H * 0.64;
    return base - k * (Math.sin(x / 230) * amp + Math.sin(x / 97 + 1.3) * amp * 0.3 + Math.sin(x / 43) * amp * 0.05) + (1 - k) * 0;
  }

  function carInit() {
    var H = G.H;
    var S = { x: 90, y: 0, vx: 0, vy: 0, ang: 0, av: 0, air: false, fuel: 100, coins: 0, dist: 0, crashed: false, crashT: 0, camX: 0, camY: 0, wheel: 0, items: [], nextItem: 360, parts: [], idle: 0, lastGround: 0 };
    S.y = terr(S.x, H) - CAR.R; S.camX = S.x - G.W * 0.3; S.camY = S.y - H * 0.58;
    return S;
  }
  function carItems(S, upto) {
    var H = G.H;
    while (S.nextItem < upto) {
      var x = S.nextItem, r = Math.random();
      if (r < 0.16 && x > 700) S.items.push({ t: 'fuel', x: x, y: terr(x, H) - 46, got: false });
      else { var n = 3 + (Math.random() * 3 | 0); for (var i = 0; i < n; i++) { var xx = x + i * 38; S.items.push({ t: 'coin', x: xx, y: terr(xx, H) - 40 - Math.sin(i / (n - 1 || 1) * Math.PI) * 26, got: false }); } S.nextItem += n * 38; }
      S.nextItem += 300 + Math.random() * 280;
    }
  }

  function carStep(dt) {
    var S = G.S, H = G.H, gas = G.ptr.gas || G.keys.gas, brake = G.ptr.brake || G.keys.brake;
    if (S.crashed) { S.crashT += dt; S.av += 0; S.ang += S.av * dt; S.vy += CAR.G * dt; S.y += S.vy * dt * 0.3; if (S.crashT > 1.1) finish(false); return; }
    var steps = 2, h = dt / steps;
    for (var st = 0; st < steps; st++) {
      var hR = terr(S.x - CAR.L * Math.cos(S.ang), H), hF = terr(S.x + CAR.L * Math.cos(S.ang), H);
      var target = (hR + hF) / 2 - CAR.R, slope = Math.atan2(hF - hR, CAR.L * 2);
      if (!S.air) {
        // en el suelo
        var a = 0;
        if (S.fuel > 0 && gas) a += CAR.ACC; if (brake) a -= (S.vx > 8 ? 380 : 90);
        a += CAR.G * 0.55 * Math.sin(slope);                // cuesta abajo acelera, cuesta arriba frena
        a -= S.vx * (gas && S.fuel > 0 ? 0.35 : 0.9);
        S.vx = clamp(S.vx + a * h, -90, CAR.VMAX);
        S.x += S.vx * h * Math.cos(slope);
        var nh = (terr(S.x - CAR.L * Math.cos(slope), H) + terr(S.x + CAR.L * Math.cos(slope), H)) / 2 - CAR.R;
        if (nh - S.y > 3 && S.vx > 70) {                     // cresta: despega
          S.air = true; S.vy = (S.y - nh) * 0 + S.vx * Math.tan(slope) * 0.9; S.av = 0;
        } else { S.y = nh; S.ang += (slope - S.ang) * Math.min(1, h * 16); S.vy = 0; }
        S.wheel += S.vx * h / CAR.R;
      } else {
        S.x += S.vx * h; S.vy += CAR.G * h; S.y += S.vy * h;
        if (S.fuel > 0 && gas) S.av -= 5.5 * h; if (brake) S.av += 5.5 * h;      // gas: morro arriba
        S.av *= (1 - 0.6 * h); S.ang += S.av * h; S.wheel += S.vx * h / CAR.R * 0.6;
        var t2 = (terr(S.x - CAR.L * Math.cos(S.ang), H) + terr(S.x + CAR.L * Math.cos(S.ang), H)) / 2 - CAR.R;
        if (S.y >= t2 && S.vy >= 0) {
          var sl = Math.atan2(terr(S.x + CAR.L, H) - terr(S.x - CAR.L, H), CAR.L * 2), rel = Math.atan2(Math.sin(S.ang - sl), Math.cos(S.ang - sl));
          if (Math.abs(rel) > 0.95) { crash(S); return; }
          S.air = false; S.y = t2; S.vy = 0; S.av = 0;
          S.vx *= Math.cos(rel) > 0.8 ? 1 : 0.8;
        }
      }
    }
    // gasolina
    S.fuel = Math.max(0, S.fuel - (gas ? CAR.FUEL_GAS : CAR.FUEL_IDLE) * dt);
    // objetos
    carItems(S, S.x + G.W * 1.4);
    for (var i = S.items.length - 1; i >= 0; i--) {
      var it = S.items[i];
      if (it.x < S.x - G.W) { S.items.splice(i, 1); continue; }
      if (!it.got && Math.abs(it.x - S.x) < 34 && Math.abs(it.y - (S.y - 20)) < 40) {
        it.got = true; S.items.splice(i, 1);
        if (it.t === 'fuel') { S.fuel = Math.min(100, S.fuel + 38); burst(S, it.x, it.y, PAL.teal); }
        else { S.coins++; burst(S, it.x, it.y, PAL.gold); }
      }
    }
    for (var p = S.parts.length - 1; p >= 0; p--) { var q = S.parts[p]; q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; if (q.t <= 0) S.parts.splice(p, 1); }
    S.dist = Math.max(S.dist, (S.x - 90) / 40);
    setScore(Math.floor(S.dist) + S.coins * 5);
    var f = ov.querySelector('#jg-fuel'); if (f) { f.style.width = S.fuel + '%'; f.className = S.fuel < 22 ? 'low' : ''; }
    var cc = ov.querySelector('#jg-coins'); if (cc) cc.textContent = S.coins + ' chispas';
    // fin: sin gasolina y casi parado
    if (S.fuel <= 0 && Math.abs(S.vx) < 12 && !S.air) { S.idle += dt; if (S.idle > 0.8) finish(false); } else S.idle = 0;
    // cámara
    S.camX += (S.x - G.W * 0.3 - S.camX) * Math.min(1, dt * 6);
    S.camY += (S.y - H * 0.58 - S.camY) * Math.min(1, dt * 3.5);
  }
  function crash(S) { S.crashed = true; S.crashT = 0; S.av = (S.ang > 0 ? 1 : -1) * 3; S.vy = -180; setDopi(G.o.dopiSad || G.o.dopi); burst(S, S.x, S.y - 20, PAL.pink); }
  function burst(S, x, y, col) { for (var i = 0; i < 9; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, t: 0.5 + Math.random() * 0.3, col: col }); }

  function carDraw() {
    var c = G.c, W = G.W, H = G.H, S = G.S, cx = S.camX, cy = S.camY;
    sky(c, W, H, cx, cy);
    // colinas lejanas
    for (var layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? PAL.hill2 : PAL.hill1; c.beginPath(); c.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) {
        var wx = x + cx * (layer ? 0.35 : 0.18), y = H * (layer ? 0.62 : 0.54) - cy * (layer ? 0.1 : 0.05) + Math.sin(wx / (layer ? 120 : 190)) * (layer ? 26 : 38) + Math.sin(wx / 53) * 7;
        c.lineTo(x, y);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    // terreno
    c.beginPath(); c.moveTo(-2, H + 4);
    for (var sx = -2; sx <= W + 6; sx += 4) c.lineTo(sx, terr(cx + sx, H) - cy);
    c.lineTo(W + 6, H + 4); c.closePath();
    var gd = c.createLinearGradient(0, 0, 0, H); gd.addColorStop(0, PAL.dirt); gd.addColorStop(1, PAL.dirtDk); c.fillStyle = gd; c.fill();
    c.lineWidth = 9; c.lineJoin = 'round'; c.strokeStyle = PAL.grass; c.beginPath();
    for (var sx2 = -2; sx2 <= W + 6; sx2 += 4) { var yy = terr(cx + sx2, H) - cy; if (sx2 === -2) c.moveTo(sx2, yy); else c.lineTo(sx2, yy); }
    c.stroke();
    // objetos
    for (var i = 0; i < S.items.length; i++) {
      var it = S.items[i], px = it.x - cx, py = it.y - cy; if (px < -30 || px > W + 30) continue;
      if (it.t === 'coin') spark(c, px, py + Math.sin(G.time * 4 + it.x) * 2, 11, G.time * 1.4);
      else { // bidón de gasolina
        c.save(); c.translate(px, py); c.fillStyle = PAL.teal; c.strokeStyle = PAL.ink; c.lineWidth = 2.4; rrect(c, -13, -15, 26, 30, 6); c.fill(); c.stroke();
        c.fillStyle = PAL.white; c.fillRect(-7, -4, 14, 4); c.fillRect(-2, -9, 4, 14); c.fillStyle = PAL.ink; rrect(c, -5, -21, 10, 7, 2); c.fill(); c.restore();
      }
    }
    // partículas
    for (var p = 0; p < S.parts.length; p++) { var q = S.parts[p]; c.globalAlpha = Math.max(0, q.t * 2); c.fillStyle = q.col; c.beginPath(); c.arc(q.x - cx, q.y - cy, 3.5, 0, 7); c.fill(); } c.globalAlpha = 1;
    // coche
    drawCar(c, S.x - cx, S.y - cy, S.ang, S.wheel);
    var sd = Math.sin(S.ang), cd = Math.cos(S.ang);
    placeDopi(S.x - cx + sd * 38 - cd * 2, S.y - cy - cd * 38 - sd * 2, S.ang * 0.6, 0.92);
    setDopi(S.crashed ? (G.o.dopiSad || G.o.dopi) : G.o.dopi);
  }
  function drawCar(c, x, y, ang, wheel) {
    c.save(); c.translate(x, y); c.rotate(ang);
    // cuerpo
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = PAL.ink;
    c.fillStyle = PAL.pink; rrect(c, -50, -30, 100, 28, 11); c.fill(); c.stroke();
    c.fillStyle = PAL.pinkLt; rrect(c, -44, -24, 88, 7, 3.5); c.fill();
    c.fillStyle = PAL.pink; rrect(c, -24, -44, 46, 18, 8); c.fill(); c.stroke();                    // cabina baja (Dopi asoma por encima)
    c.fillStyle = PAL.gold; c.beginPath(); c.arc(46, -16, 5, 0, 7); c.fill(); c.stroke();           // faro
    c.fillStyle = PAL.teal; rrect(c, -52, -16, 7, 10, 3); c.fill(); c.stroke();                      // piloto
    // ruedas
    [-CAR.L, CAR.L].forEach(function (wx) {
      c.save(); c.translate(wx, 0); c.rotate(wheel);
      c.fillStyle = '#3B2A33'; c.beginPath(); c.arc(0, 0, CAR.R, 0, 7); c.fill(); c.stroke();
      c.fillStyle = PAL.teal; c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
      c.strokeStyle = PAL.white; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.moveTo(0, -5); c.lineTo(0, 5); c.stroke();
      c.restore();
    });
    c.restore();
  }

  /* ═════════════ SALTOS ═════════════ */
  var JP = { G: 1900, V: 760, VS: 1180, R: 26, PW: 74, PH: 14 };

  function jumpInit() {
    var W = G.W, H = G.H;
    var S = { x: W / 2, y: H - 140, vy: -JP.V, face: 1, minY: H - 140, camY: 0, plats: [], enemies: [], coins: [], coinN: 0, topY: 0, falling: false, parts: [] };
    S.topY = H - 70;
    S.plats.push({ x: W / 2 - JP.PW / 2, y: H - 70, t: 'cloud', dir: 0 });
    jumpGen(S, -H * 1.4);
    return S;
  }
  function jumpGen(S, untilY) {
    var W = G.W;
    while (S.topY > untilY) {
      var h = -S.topY / 10, gap = clamp(62 + h * 0.06, 62, 118) * (0.8 + Math.random() * 0.4);
      S.topY -= gap;
      var r = Math.random(), t = 'grass';
      if (h > 60 && r < 0.17) t = 'cloud'; else if (h > 250 && r < 0.34) t = 'move';
      var p = { x: 8 + Math.random() * (W - JP.PW - 16), y: S.topY, t: t, dir: t === 'move' ? (Math.random() < 0.5 ? 1 : -1) : 0, spring: t === 'grass' && Math.random() < 0.09, broke: false, bt: 0 };
      S.plats.push(p);
      if (t === 'grass' && !p.spring && Math.random() < 0.18) S.coins.push({ x: p.x + JP.PW / 2, y: p.y - 56, got: false });
      if (h > 120 && Math.random() < 0.07 && gap < 100) S.enemies.push({ x: 30 + Math.random() * (W - 60), y: S.topY - 40, dir: Math.random() < 0.5 ? 1 : -1, dead: false });
      // plataforma "de seguridad" si se acumulan muchas nubes
      if (t === 'cloud' && S.plats.length > 2 && S.plats[S.plats.length - 2].t === 'cloud') p.t = 'grass';
    }
  }
  function jumpStep(dt) {
    var S = G.S, W = G.W, H = G.H;
    // control
    var target = null;
    if (G.ptr.x != null) target = G.ptr.x;
    var dir = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0);
    if (dir) S.x += dir * 380 * dt;
    else if (target != null) { var d = target - S.x; S.x += clamp(d * 12, -560, 560) * dt; if (Math.abs(d) > 4) S.face = d > 0 ? 1 : -1; }
    if (dir) S.face = dir;
    if (S.x < -10) S.x = W + 10; if (S.x > W + 10) S.x = -10;
    // física
    var prevY = S.y;
    S.vy += JP.G * dt; S.y += S.vy * dt;
    if (S.vy > 0) {
      for (var i = 0; i < S.plats.length; i++) {
        var p = S.plats[i]; if (p.broke) continue;
        var feet0 = prevY + JP.R, feet1 = S.y + JP.R;
        if (feet0 <= p.y + 4 && feet1 >= p.y && S.x > p.x - 10 && S.x < p.x + JP.PW + 10) {
          S.y = p.y - JP.R;
          if (p.t === 'cloud') { p.broke = true; p.bt = 0; }
          S.vy = p.spring ? -JP.VS : -JP.V; if (p.spring) { p.sp = 0.3; }
          pf(S, S.x, p.y, p.spring ? PAL.teal : PAL.white);
          break;
        }
      }
    }
    for (var m = 0; m < S.plats.length; m++) { var q = S.plats[m]; if (q.t === 'move') { q.x += q.dir * 60 * dt; if (q.x < 0 || q.x > W - JP.PW) q.dir *= -1; } if (q.broke) q.bt += dt; if (q.sp) q.sp = Math.max(0, q.sp - dt); }
    // enemigos y monedas
    for (var e = 0; e < S.enemies.length; e++) {
      var en = S.enemies[e]; if (en.dead) continue; en.x += en.dir * 40 * dt; if (en.x < 24 || en.x > W - 24) en.dir *= -1;
      var dx = en.x - S.x, dy = en.y - S.y;
      if (dx * dx + dy * dy < 40 * 40) {
        if (S.vy > 120 && S.y < en.y - 6) { en.dead = true; S.vy = -JP.V * 0.95; S.coinN += 2; pf(S, en.x, en.y, PAL.pink); }
        else if (!S.falling) { S.falling = true; S.vy = 200; setDopi(G.o.dopiSad || G.o.dopi); }
      }
    }
    for (var k = S.coins.length - 1; k >= 0; k--) { var cn = S.coins[k]; if (!cn.got && Math.abs(cn.x - S.x) < 30 && Math.abs(cn.y - S.y) < 34) { cn.got = true; S.coinN++; pf(S, cn.x, cn.y, PAL.gold); } }
    for (var pp = S.parts.length - 1; pp >= 0; pp--) { var pa = S.parts[pp]; pa.t -= dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 400 * dt; if (pa.t <= 0) S.parts.splice(pp, 1); }
    // cámara solo hacia arriba
    S.minY = Math.min(S.minY, S.y);
    var want = S.minY - H * 0.42; if (want < S.camY) S.camY += (want - S.camY) * Math.min(1, dt * 10);
    jumpGen(S, S.camY - H * 0.6);
    S.plats = S.plats.filter(function (p) { return p.y < S.camY + H + 80; });
    S.coins = S.coins.filter(function (p) { return !p.got && p.y < S.camY + H + 80; });
    S.enemies = S.enemies.filter(function (p) { return p.y < S.camY + H + 120; });
    setScore(Math.max(0, Math.floor((H - 140 - S.minY) / 10)) + S.coinN * 5);
    if (S.y - S.camY > H + 70) finish(false);
  }
  function pf(S, x, y, col) { for (var i = 0; i < 8; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, t: 0.45, col: col }); }

  function jumpDraw() {
    var c = G.c, W = G.W, H = G.H, S = G.S, cy = S.camY;
    sky(c, W, H, 0, cy * 0.5);
    // plataformas
    for (var i = 0; i < S.plats.length; i++) {
      var p = S.plats[i], y = p.y - cy; if (y < -30 || y > H + 30) continue;
      var a = p.broke ? Math.max(0, 1 - p.bt * 2.2) : 1; if (a <= 0) continue;
      c.globalAlpha = a; var oy = p.broke ? p.bt * 160 : 0;
      c.lineWidth = 3; c.strokeStyle = PAL.ink; c.lineJoin = 'round';
      if (p.t === 'cloud') { c.fillStyle = PAL.cloud; rrect(c, p.x, y + oy - 4, JP.PW, JP.PH + 4, 9); c.fill(); c.stroke(); c.fillStyle = '#E4F3FA'; c.fillRect(p.x + 10, y + oy + 6, JP.PW - 20, 3); }
      else if (p.t === 'move') { c.fillStyle = PAL.pinkLt; rrect(c, p.x, y, JP.PW, JP.PH, 7); c.fill(); c.stroke(); c.fillStyle = PAL.pink; c.fillRect(p.x + 8, y + 4, JP.PW - 16, 3); }
      else { c.fillStyle = PAL.dirt; rrect(c, p.x, y, JP.PW, JP.PH, 7); c.fill(); c.stroke(); c.fillStyle = PAL.grass; rrect(c, p.x + 1, y - 1, JP.PW - 2, 7, 4); c.fill(); }
      if (p.spring) { var sq = p.sp ? 0.5 : 1; c.strokeStyle = PAL.ink; c.lineWidth = 3; c.fillStyle = PAL.teal; c.beginPath(); c.moveTo(p.x + JP.PW / 2 - 9, y); c.lineTo(p.x + JP.PW / 2 + 9, y); c.lineTo(p.x + JP.PW / 2 + 6, y - 16 * sq); c.lineTo(p.x + JP.PW / 2 - 6, y - 16 * sq); c.closePath(); c.fill(); c.stroke(); }
      c.globalAlpha = 1;
    }
    for (var k = 0; k < S.coins.length; k++) { var cn = S.coins[k]; spark(c, cn.x, cn.y - cy + Math.sin(G.time * 4 + cn.x) * 3, 11, G.time * 1.5); }
    for (var e = 0; e < S.enemies.length; e++) {
      var en = S.enemies[e]; if (en.dead) continue; var ex = en.x, ey = en.y - cy;
      c.strokeStyle = PAL.spider; c.lineWidth = 3; c.lineCap = 'round';
      for (var l = -1; l <= 1; l += 2) for (var j = 0; j < 3; j++) { c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + l * (14 + j * 3), ey - 6 + j * 7 + Math.sin(G.time * 8 + j) * 3); c.lineTo(ex + l * (22 + j * 2), ey + 4 + j * 6); c.stroke(); }
      c.fillStyle = PAL.spider; c.beginPath(); c.arc(ex, ey, 14, 0, 7); c.fill(); c.strokeStyle = PAL.ink; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 5, ey - 3, 3.4, 0, 7); c.arc(ex + 5, ey - 3, 3.4, 0, 7); c.fill(); c.fillStyle = PAL.ink; c.beginPath(); c.arc(ex - 5, ey - 3, 1.5, 0, 7); c.arc(ex + 5, ey - 3, 1.5, 0, 7); c.fill();
    }
    for (var pp = 0; pp < S.parts.length; pp++) { var pa = S.parts[pp]; c.globalAlpha = Math.max(0, pa.t * 2.2); c.fillStyle = pa.col; c.beginPath(); c.arc(pa.x, pa.y - cy, 3.5, 0, 7); c.fill(); } c.globalAlpha = 1;
    var squash = S.vy < 0 ? 1 + Math.min(0.12, -S.vy / 7000) : 1 - Math.min(0.06, S.vy / 9000);
    placeDopi(S.x, S.y - cy, 0, 0.9 * 1);
    G.dopiEl.style.transform += ' scale(' + (S.face || 1) + ',' + squash + ')';
    setDopi(S.falling ? (G.o.dopiSad || G.o.dopi) : G.o.dopi);
  }

  root.DopiJuegos = { start: start, stop: function () { stop(true); }, active: function () { return !!G; } };
})(typeof window !== 'undefined' ? window : globalThis);
