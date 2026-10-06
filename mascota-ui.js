/* =========================================================
   +Dopamina · Pestaña "Dopi" — UI interactiva de la mascota compartida.
   Script clásico (sin imports): app.js le pasa Firestore y utilidades.
     MascotaUI.init({ role, partner, displayName, parejaId, people, fb, push, toast })
     MascotaUI.stop()                    al cerrar sesión
     MascotaUI.show()                    al abrir la pestaña
     MascotaUI.reward(kind)              diary | photoCheck | poke
     MascotaUI.weekly(weekKey, racha)    premio de racha semanal (1 vez/semana)
     MascotaUI.react('poke'|'photo')     reacción visual
   fb = { db, doc, collection, runTransaction, updateDoc, onSnapshot }
   Requiere dopi.js y pet-logic.js cargados antes.

   Interacción (estilo Pou):
     · Comer / Jugar / Arropar / Sorpresa: arrastra el objeto hasta Dopi
       (o tócalo y vuela solo).
     · Limpiar: arrastra la esponja y frota; la suciedad se va y salen burbujas.
     · Caricia: desliza el dedo sobre Dopi (siempre disponible).
     · Tocar a Dopi: cosquillas.
   ========================================================= */
(function (root) {
  'use strict';

  var L = root.PetLogic, D = root.Dopi;
  var ctx = null, state = null, unsub = null, timer = null;
  var acting = false, busy = false, wired = false, svg = null;
  var shopSlot = 'hat', shopSel = null, shopKey = '';
  var mode = null, scrub = 0, lastDirt = 0, drag = null;

  var CLEAN_DIST = 520;   // píxeles de frotado para dejarla limpia
  var RUB_DIST = 240;     // píxeles de caricia para que cuente

  var ICON = {
    feed: 'M4 11h16a8 8 0 0 1-16 0ZM9 3.5c0 1.5 1.5 1.5 1.5 3M13.5 3.5c0 1.5 1.5 1.5 1.5 3',
    play: 'M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16ZM4.5 9.5c5 1 10 1 15 0M12 4c-2.5 4-2.5 12 0 16',
    pet: 'M7 13V7a1.5 1.5 0 0 1 3 0v4M10 11V5a1.5 1.5 0 0 1 3 0v6M13 11V6a1.5 1.5 0 0 1 3 0v6M16 12V9a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L7 13',
    clean: 'M12 3C12 3 6 10 6 14a6 6 0 0 0 12 0c0-4-6-11-6-11ZM9.5 15a2.5 2.5 0 0 0 2.5 2.5',
    sleep: 'M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5ZM17 4v3M15.5 5.5h3',
    surprise: 'M4 10h16v10H4ZM3 7h18v3H3ZM12 7v13M12 7C10.5 3.5 6.5 4 7.5 6.5M12 7c1.5-3.5 5.5-3 4.5-.5'
  };
  var ACT_ORDER = ['feed', 'play', 'pet', 'clean', 'sleep', 'surprise'];
  var SHORT = { feed: 'Comer', play: 'Jugar', pet: 'Caricia', clean: 'Limpiar', sleep: 'Arropar', surprise: 'Sorpresa' };
  var COLORS = { hunger: '#D99A2B', mood: '#E0508A', energy: '#17A493', love: '#B04E9A', clean: '#4C9FD6' };
  var TITLES = { happy: 'Está contenta', hungry: 'Tiene hambre', sleepy: 'Durmiendo', sad: 'Os echa de menos', love: 'Está enamorada', sick: 'Está apagadita' };
  var SLOTS = [['hat', 'Gorros'], ['face', 'Gafas'], ['neck', 'Cuello'], ['room', 'Cuarto']];
  var ROOM_SWATCH = { cozy: ['#F7E3DA', '#E7C3AE'], beach: ['#BFE7F1', '#F1DDB0'], garden: ['#CFE8C4', '#9DCB86'], attic: ['#E8CDB4', '#C99B76'] };

  var BLANKET = '<svg viewBox="0 0 48 36" width="52" height="40" aria-hidden="true"><rect x="2" y="4" width="44" height="28" rx="8" fill="#F6A9C6" stroke="#5A1E33" stroke-width="2.5"/><path d="M15 5v26M27 5v26M39 5v26" stroke="#17A493" stroke-width="3"/></svg>';
  var TOOLS = {
    feed: ['🍎', '🍪', '🍓', '🍕'],
    play: ['⚽'],
    sleep: [BLANKET],
    surprise: ['🎁'],
    clean: ['🧽']
  };
  var HINT = {
    feed: 'Arrastra la comida hasta la boca de Dopi',
    play: 'Lánzale la pelota a Dopi',
    sleep: 'Arrastra la manta sobre Dopi',
    surprise: 'Entrégale el regalo a Dopi',
    clean: 'Frota a Dopi con la esponja 🫧',
    pet: 'Acaricia a Dopi frotando de lado a lado ✨ hasta que salga un corazón'
  };
  // manchas: x, y, radio, umbral de suciedad (0-100) a partir del cual aparecen
  var DIRT = [[78, 100, 9, 8], [124, 132, 7, 18], [62, 140, 8, 28], [112, 82, 6, 38], [142, 112, 8, 48], [92, 152, 7, 58], [100, 120, 10, 68]];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(ms) { var m = Math.ceil(ms / 60000); return m >= 60 ? Math.round(m / 60) + ' h' : m + ' min'; }
  function toast(msg) { if (ctx && ctx.toast) ctx.toast(msg); }
  function visible() { var t = $('tab-mascota'); return !!(t && t.classList.contains('active')); }
  function curState() { return state || L.newState(Date.now()); }
  function hourMadrid(t) { return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(t)); }
  function timeOfDay(t) { var h = hourMadrid(t); return h < 7 ? 'night' : h < 12 ? 'morning' : h < 19 ? 'day' : h < 22 ? 'evening' : 'night'; }
  function nameOf(uid) { var p = ctx.people.filter(function (x) { return x.uid === uid; })[0]; return p ? p.name : 'Alguien'; }

  function ensureSvg() {
    var holder = $('pet-holder');
    if (!holder) return null;
    if (!svg || !holder.contains(svg)) {
      var s = curState();
      holder.innerHTML = D.svg({ stage: s.stage, mood: 'happy', mix: s.harmony.mix }) +
        '<svg class="pet-dirt" viewBox="0 0 200 200" aria-hidden="true">' + DIRT.map(function (d) {
          return '<g class="pet-spot" data-thr="' + d[3] + '" opacity="0"><ellipse cx="' + d[0] + '" cy="' + d[1] + '" rx="' + d[2] + '" ry="' + (d[2] * 0.75) + '" fill="#8A6A3F" opacity=".55"/>' +
            '<circle cx="' + (d[0] + d[2] * 0.6) + '" cy="' + (d[1] - d[2] * 0.5) + '" r="' + (d[2] * 0.35) + '" fill="#6E8A4A" opacity=".6"/></g>';
        }).join('') + '</svg>';
      svg = holder.querySelector('.dopi');
    }
    return svg;
  }

  function updateDirt(clean) {
    if (clean != null) lastDirt = 100 - clean;
    var spots = document.querySelectorAll('#pet-holder .pet-spot');
    for (var i = 0; i < spots.length; i++) {
      var thr = +spots[i].getAttribute('data-thr');
      var op = Math.max(0, Math.min(1, (lastDirt - thr) / 14)) * (1 - scrub);
      spots[i].setAttribute('opacity', op.toFixed(2));
    }
  }

  /* ---------- pintado ---------- */
  function render() {
    if (!ctx) return;
    var s = curState(), t = Date.now();
    var r = L.resolveMood(s, t, ctx.people);
    var dot = $('pet-tab-dot');
    if (dot) dot.hidden = !(r.mood === 'hungry' || r.mood === 'sad' || r.mood === 'sick');
    if (!visible()) return;

    var n = L.decay(s, t), day = s.days && s.days[L.dayId(t)];
    ensureSvg();
    if (!acting) D.set(svg, { mood: r.mood });
    D.set(svg, { stage: s.stage, mix: s.harmony.mix, share: s.harmony.share, hat: s.equipped.hat, face: s.equipped.face, neck: s.equipped.neck });
    updateDirt(n.clean);

    var room = $('pet-room');
    room.setAttribute('data-time', timeOfDay(t));
    room.setAttribute('data-room', s.equipped.room || 'cozy');
    $('pet-stage').textContent = D.STAGES[s.stage];
    $('pet-points').textContent = '✦ ' + s.points;
    var team = $('pet-team');
    team.className = 'chip ' + (day && day.team ? 'chip-gold' : 'chip-plain');
    team.textContent = day && day.team ? 'Hoy los dos · XP ×1,5' : 'Falta uno hoy';
    var reason = r.reason;
    if (r.mood === 'happy' && n.clean < 30) reason = 'Necesita un bañito 🫧';
    $('pet-mood-title').textContent = TITLES[r.mood] || '';
    $('pet-mood-reason').textContent = reason === $('pet-mood-title').textContent ? '' : reason;

    // progreso hacia la siguiente etapa
    var pr = L.progress(s), prog;
    pr.pct = Math.max(0, Math.min(100, pr.pct));
    if (s.stage >= 5) {
      prog = '<div class="eyebrow">Evolución</div><div class="pet-prog-text">Ha llegado a su forma final: <b>Alma gemela</b> ✨</div>';
    } else {
      var falta = [];
      if (pr.xpLeft > 0) falta.push(pr.xpLeft + ' XP');
      if (pr.teamLeft > 0) falta.push(pr.teamLeft + (pr.teamLeft === 1 ? ' día' : ' días') + ' cuidándola los dos');
      prog = '<div class="eyebrow">Hacia «' + D.STAGES[s.stage + 1] + '»</div>' +
        '<div class="need-bar" role="meter" aria-label="Progreso de evolución" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pr.pct + '"><i style="width:' + pr.pct + '%;background:#E2A72E"></i></div>' +
        '<div class="pet-prog-text">' + (s.evolvePending ? 'Lista para evolucionar, pero primero tiene que recuperarse 💗' : (falta.length ? 'Falta: ' + falta.join(' y ') : '¡Casi!')) + '</div>';
    }
    $('pet-progress').innerHTML = prog;

    $('pet-needs').innerHTML = L.NEEDS.map(function (k) {
      return '<div class="need' + (n[k] < 30 ? ' is-low' : '') + '"><div class="need-top"><span>' + L.NEED_LABEL[k] + '</span><b>' + n[k] + '</b></div>' +
        '<div class="need-bar" role="meter" aria-label="' + L.NEED_LABEL[k] + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + n[k] + '"><i style="width:' + n[k] + '%;background:' + COLORS[k] + '"></i></div></div>';
    }).join('');

    $('pet-acts').innerHTML = ACT_ORDER.map(function (k) {
      var left = L.cooldownLeft(s, ctx.role, k, t), cd = L.ACTIONS[k].cd;
      var cls = 'act' + (left ? ' is-cooling' : '') + (k === 'surprise' && !left ? ' is-special' : '') + (mode === k ? ' is-active' : '');
      return '<button class="' + cls + '" data-act="' + k + '" aria-label="' + L.ACTIONS[k].label + (left ? ', disponible en ' + fmt(left) : '') + '">' +
        '<span class="act-btn"><span class="act-ring" style="--cd:' + Math.round(left / cd * 100) + '"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico" d="' + ICON[k] + '"/></svg></span>' +
        '<span class="act-label">' + SHORT[k] + '</span><span class="act-time">' + (left ? 'en ' + fmt(left) : 'listo') + '</span></button>';
    }).join('');

    var lines = ctx.people.map(function (p) { var la = s.lastAction && s.lastAction[p.uid]; return la ? { uid: p.uid, type: la.type, at: la.at } : null; })
      .filter(Boolean).sort(function (a, b) { return b.at - a.at; });
    $('pet-log').innerHTML = '<div class="eyebrow">Últimos cuidados</div>' + (lines.length ? lines.map(function (e) {
      return '<div><span class="dot ' + (e.uid === ctx.people[0].uid ? 'dot-a' : 'dot-b') + '"></span><span>' +
        esc(L.logLine(nameOf(e.uid), e.type, e.at, t).split(' · ')[0]) + '</span><time>' + L.ago(t - e.at) + '</time></div>';
    }).join('') : '<div>Todavía nadie ha cuidado de Dopi. ¡Empieza tú!</div>');

    renderShop(s);
  }

  function renderShop(s) {
    var key = JSON.stringify([s.points, s.owned, s.equipped, s.stage, shopSlot, shopSel]);
    if (key === shopKey) return;
    shopKey = key;
    var tabs = SLOTS.map(function (x) {
      return '<button class="pet-slot' + (x[0] === shopSlot ? ' is-on' : '') + '" data-slot="' + x[0] + '">' + x[1] + '</button>';
    }).join('');
    var items = L.SHOP.filter(function (i) { return i.slot === shopSlot; }).map(function (i) {
      var owned = s.owned.indexOf(i.id) >= 0, eq = s.equipped[i.slot] === i.id;
      var locked = !owned && i.stage && s.stage < i.stage;
      var prev;
      if (i.slot === 'room') {
        var c = ROOM_SWATCH[i.id] || ['#eee', '#ccc'];
        prev = '<span class="pet-swatch" style="background:linear-gradient(' + c[0] + ' 0 62%,' + c[1] + ' 62%)"></span>';
      } else {
        var o = { stage: 4, mood: 'happy', still: true }; o[i.slot] = i.id;
        prev = D.svg(o);
      }
      var label = eq ? 'Puesto' : owned ? 'Tuyo' : locked ? '🔒 Etapa ' + i.stage : '✦ ' + i.price;
      return '<button class="pet-item' + (eq ? ' is-eq' : '') + (owned ? ' is-owned' : '') + (locked ? ' is-locked' : '') + (shopSel === i.id ? ' is-sel' : '') +
        '" data-item="' + i.id + '"><span class="pet-item-prev">' + prev + '</span><span class="pet-item-name">' + esc(i.name) + '</span><span class="pet-item-tag">' + label + '</span></button>';
    }).join('');
    var sel = shopSel && L.SHOP.filter(function (i) { return i.id === shopSel; })[0];
    var buy = '';
    if (sel && s.owned.indexOf(sel.id) < 0) {
      var short = sel.price - s.points;
      buy = '<div class="pet-buy"><span>«' + esc(sel.name) + '»</span>' +
        (short > 0 ? '<span class="pet-buy-miss">Te faltan ' + short + ' ✦</span>' : '<button class="pet-buy-btn" data-buy="' + sel.id + '">Comprar por ✦ ' + sel.price + '</button>') + '</div>';
    }
    $('pet-shop').innerHTML = '<div class="eyebrow">Armario y tienda</div><div class="pet-slots">' + tabs + '</div><div class="pet-items">' + items + '</div>' + buy;
  }

  /* ---------- efectos ---------- */
  function floatPts(n) {
    var room = $('pet-room'); if (!room || !n) return;
    var el = document.createElement('span');
    el.className = 'float-pts'; el.textContent = '+' + n + ' ✦';
    el.style.left = '50%'; el.style.bottom = '170px';
    room.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
  }
  function spawn(x, y, text, cls) {
    var room = $('pet-room'); if (!room) return;
    var rc = room.getBoundingClientRect();
    var el = document.createElement('span');
    el.className = 'pet-fx ' + (cls || ''); el.textContent = text;
    el.style.left = (x - rc.left) + 'px'; el.style.top = (y - rc.top) + 'px';
    room.appendChild(el); setTimeout(function () { el.remove(); }, 1100);
  }
  function bounce() {
    var h = $('pet-holder'); if (!h) return;
    h.classList.remove('pet-bounce'); void h.offsetWidth; h.classList.add('pet-bounce');
    setTimeout(function () { h.classList.remove('pet-bounce'); }, 600);
  }
  function inBody(x, y) {
    if (!svg) return false;
    var r = svg.getBoundingClientRect();
    return x > r.left + r.width * 0.15 && x < r.right - r.width * 0.15 && y > r.top + r.height * 0.18 && y < r.bottom;
  }

  /* chispas estilo Pokémon GO + anillo de progreso de la caricia */
  var SPARK_COLORS = ['#FFD54A', '#FF8FB8', '#7FE3D3', '#FFFFFF', '#FFB347'];
  function sparks(x, y, n) {
    var room = $('pet-room'); if (!room) return;
    var rc = room.getBoundingClientRect();
    for (var i = 0; i < n; i++) {
      var el = document.createElement('span');
      var a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 34;
      el.className = 'pet-spark' + (Math.random() < 0.35 ? ' is-dot' : '');
      el.textContent = el.className.indexOf('is-dot') > -1 ? '' : '✦';
      el.style.left = (x - rc.left) + 'px'; el.style.top = (y - rc.top) + 'px';
      el.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
      el.style.setProperty('--dy', Math.round(Math.sin(a) * d - 8) + 'px');
      el.style.color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      el.style.fontSize = (10 + Math.floor(Math.random() * 10)) + 'px';
      room.appendChild(el);
      (function (e) { setTimeout(function () { e.remove(); }, 750); })(el);
    }
  }
  function ringShow(on) {
    var room = $('pet-room'); if (!room) return null;
    var r = room.querySelector('.pet-ring');
    if (!on) { if (r) r.remove(); return null; }
    if (r) return r;
    var h = $('pet-holder'), rc = room.getBoundingClientRect(), hc = h.getBoundingClientRect();
    r = document.createElement('div'); r.className = 'pet-ring';
    r.innerHTML = '<svg viewBox="0 0 100 100"><circle class="pr-bg" cx="50" cy="50" r="44"/><circle class="pr-fg" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg><span class="pr-ico">💗</span>';
    r.style.left = (hc.left - rc.left + hc.width / 2) + 'px'; r.style.top = (hc.top - rc.top + hc.height * 0.17) + 'px';
    room.appendChild(r); return r;
  }
  function ringSet(p) {
    var r = ringShow(true); if (!r) return;
    r.querySelector('.pr-fg').style.strokeDashoffset = String(100 - Math.round(p * 100));
    r.querySelector('.pr-ico').style.transform = 'translate(-50%,-50%) scale(' + (0.55 + p * 0.45).toFixed(2) + ')';
  }
  function bigHeart() {
    var room = $('pet-room'), h = $('pet-holder'); if (!room || !h) return;
    var rc = room.getBoundingClientRect(), hc = h.getBoundingClientRect();
    var el = document.createElement('div'); el.className = 'pet-bigheart'; el.textContent = '💗';
    el.style.left = (hc.left - rc.left + hc.width / 2) + 'px'; el.style.top = (hc.top - rc.top + hc.height * 0.17) + 'px';
    room.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
    sparks(hc.left + hc.width / 2, hc.top + hc.height * 0.4, 14);
  }
  function setTarget(on) { var room = $('pet-room'); if (room) room.classList.toggle('is-target', !!on); }

  function handleEvents(events) {
    (events || []).forEach(function (e) {
      if (e.kind === 'teamDay') toast('Día en equipo: +10 ✦ y XP ×1,5 hoy');
      if (e.kind === 'evolve') {
        toast('¡Dopi ha evolucionado! Ahora es ' + D.STAGES[e.stage] + ' ✨');
        if (svg) D.flash(svg, 'party', 3200);
        if (ctx.push) ctx.push(ctx.partner, '+Dopamina', '✨ ¡Dopi ha evolucionado! Ahora es ' + D.STAGES[e.stage], 'dopi-evolucion');
      }
      if (e.kind === 'evolveWaiting') toast('Dopi quiere evolucionar, pero primero necesita cuidados 💗');
      if (e.reward === 'reunion') toast('¡Reencuentro con Dopi! +10 ✦');
    });
  }

  /* ---------- acciones (escritura en Firestore) ---------- */
  function commit(type) {
    if (busy) return;
    busy = true;
    L.PetStore.act(ctx.fb, ctx.parejaId, ctx.people, ctx.role, type).then(function (r) {
      busy = false;
      if (r.error === 'cooldown') return toast('Aún descansa de eso · vuelve en ' + fmt(r.left));
      if (r.error === 'no-tiene-sueño') return toast('No tiene sueño todavía');
      if (r.error) return toast('No se pudo completar. Inténtalo de nuevo');
      state = r.state;
      var ev = r.events.filter(function (e) { return e.kind === 'action'; })[0];
      if (ev) floatPts(ev.pts);
      if (r.ms && svg) { acting = true; D.flash(svg, r.mood, r.ms); setTimeout(function () { acting = false; render(); }, r.ms); }
      handleEvents(r.events);
      if (type === 'surprise' && ctx.push) ctx.push(ctx.partner, '+Dopamina', '🎁 ' + ctx.displayName + ' le ha dado un mimo sorpresa a Dopi', 'dopi-sorpresa');
      shopKey = ''; render();
    }).catch(function () { busy = false; toast('Sin conexión. Inténtalo de nuevo'); });
  }

  /* ---------- modos de interacción ---------- */
  function showHint(type) {
    var bar = $('pet-hintbar'), tray = $('pet-tray');
    if (!type) { bar.hidden = true; tray.hidden = true; tray.innerHTML = ''; return; }
    $('pet-hint-text').textContent = HINT[type];
    bar.hidden = false;
    var tools = TOOLS[type];
    if (tools) {
      tray.innerHTML = tools.map(function (t, i) { return '<button class="pet-tool" data-tool="' + i + '" aria-label="' + esc(SHORT[type]) + '">' + t + '</button>'; }).join('');
      tray.hidden = false;
    } else { tray.hidden = true; tray.innerHTML = ''; }
  }

  function endMode(silent) {
    mode = null; scrub = 0;
    setTarget(false);
    showHint(null);
    if (!silent) { acting = false; render(); }
  }

  function startMode(type) {
    if (busy) return;
    if (mode === type) return endMode();
    var s = curState(), t = Date.now(), left = L.cooldownLeft(s, ctx.role, type, t), n = L.decay(s, t);
    if (type === 'pet') {
      endMode(true); mode = 'pet'; showHint('pet');
      if (left > 0) toast('Ya está mimadita ahora mismo, pero le encanta igual 💗');
      return render();
    }
    if (left > 0) return toast('Aún descansa de eso · vuelve en ' + fmt(left));
    if (type === 'sleep') {
      var h = hourMadrid(t);
      if (!(h >= 21 || h < 10) && n.energy >= 70) return toast('No tiene sueño todavía');
    }
    if (type === 'clean' && n.clean >= 90) return toast('Está reluciente ✨');
    endMode(true); mode = type; scrub = 0; showHint(type);
    render();
  }

  /* arrastrar herramienta (comida, pelota, manta, regalo, esponja) */
  function startDrag(btn, ev) {
    if (drag || busy || !mode || !TOOLS[mode]) return;
    var type = mode;
    var ghost = document.createElement('div');
    ghost.className = 'pet-ghost'; ghost.innerHTML = btn.innerHTML;
    document.body.appendChild(ghost);
    btn.classList.add('is-dragging');
    drag = { type: type, ghost: ghost, btn: btn, sx: ev.clientX, sy: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: false, over: false, dist: 0, bub: 0, id: ev.pointerId };
    place(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', onDragCancel);
  }
  function place(x, y) { if (drag) { drag.ghost.style.left = x + 'px'; drag.ghost.style.top = (y - 34) + 'px'; } }
  function onDragMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    var d = drag, dx = e.clientX - d.lx, dy = e.clientY - d.ly;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.moved = true;
    place(e.clientX, e.clientY);
    var over = inBody(e.clientX, e.clientY - 34);
    if (over !== d.over) {
      d.over = over; setTarget(over);
      if (d.type === 'feed') { acting = over; if (over) D.set(svg, { mood: 'hungry' }); else render(); }
      if (d.type === 'clean') { acting = over; if (over) D.set(svg, { mood: 'pet' }); else render(); }
    }
    if (d.type === 'clean' && over) {
      var step = Math.hypot(dx, dy);
      d.dist += step; d.bub += step;
      scrub = Math.min(1, d.dist / CLEAN_DIST); updateDirt();
      if (d.bub > 26) { d.bub = 0; spawn(e.clientX + (Math.random() * 30 - 15), e.clientY - 20, '🫧', 'is-bubble'); }
      if (scrub >= 1) { finishDrag(); commit('clean'); endMode(true); return; }
    }
    d.lx = e.clientX; d.ly = e.clientY;
  }
  function finishDrag() {
    if (!drag) return;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragCancel);
    drag.btn.classList.remove('is-dragging');
    drag.ghost.remove();
    setTarget(false);
    drag = null;
  }
  function onDragCancel() { finishDrag(); acting = false; render(); }
  function onDragUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag, type = d.type;
    if (type === 'clean') {          // el progreso se conserva; sigue en modo limpiar
      finishDrag(); acting = false; render(); return;
    }
    if (d.over) {                    // soltado sobre Dopi
      var g = d.ghost; finishDrag(); acting = false;
      g.remove(); eatBurst(type, e.clientX, e.clientY - 34);
      commit(type); endMode(true); return;
    }
    if (!d.moved) {                  // toque simple: el objeto vuela solo hasta Dopi
      var r = svg.getBoundingClientRect();
      var tx = r.left + r.width / 2, ty = r.top + r.height * 0.62;
      var ghost = d.ghost;
      ghost.style.transition = 'left .4s ease-in, top .4s ease-in, transform .4s ease-in, opacity .4s';
      void ghost.offsetWidth;
      ghost.style.left = tx + 'px'; ghost.style.top = ty + 'px';
      ghost.style.transform = 'translate(-50%,-50%) scale(.45)'; ghost.style.opacity = '.3';
      var btn = d.btn;
      window.removeEventListener('pointermove', onDragMove); window.removeEventListener('pointerup', onDragUp); window.removeEventListener('pointercancel', onDragCancel);
      drag = null; btn.classList.remove('is-dragging'); setTarget(false);
      setTimeout(function () { ghost.remove(); eatBurst(type, tx, ty); commit(type); endMode(true); }, 420);
      return;
    }
    finishDrag(); acting = false; render();   // soltado fuera: vuelve a la bandeja
  }
  function eatBurst(type, x, y) {
    var e = { feed: ['😋', '✨', '💗'], play: ['⭐', '✨', '💗'], sleep: ['💤', '🌙', '💗'], surprise: ['🎉', '💗', '✨'] }[type] || ['💗'];
    e.forEach(function (c, i) { setTimeout(function () { spawn(x + (i - 1) * 22, y, c, 'is-heart'); }, i * 90); });
  }

  /* acariciar / cosquillas directamente sobre Dopi */
  var rub = null;
  function onHolderDown(ev) {
    if ((mode && mode !== 'pet') || busy || drag) return;
    ev.preventDefault();
    rub = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, lx: ev.clientX, ly: ev.clientY, dist: 0, rev: 0, dir: 0, fx: 0, done: false, moved: false, t0: Date.now(), warned: false };
    acting = true; D.set(svg, { mood: 'pet' });
    window.addEventListener('pointermove', onRubMove);
    window.addEventListener('pointerup', onRubUp);
    window.addEventListener('pointercancel', onRubUp);
  }
  function onRubMove(e) {
    if (!rub || e.pointerId !== rub.id) return;
    e.preventDefault();
    var dx = e.clientX - rub.lx, dy = e.clientY - rub.ly, step = Math.hypot(dx, dy);
    if (Math.hypot(e.clientX - rub.sx, e.clientY - rub.sy) > 8) rub.moved = true;
    if (Math.abs(dx) > 4) { var dir = dx > 0 ? 1 : -1; if (rub.dir && dir !== rub.dir) rub.rev++; rub.dir = dir; }
    rub.dist += step; rub.fx += step; rub.lx = e.clientX; rub.ly = e.clientY;
    if (rub.fx > 22) { rub.fx = 0; sparks(e.clientX, e.clientY, 3); }
    if (!rub.done) {
      var prog = Math.min(1, rub.dist / RUB_DIST);
      ringSet(rub.rev >= 2 ? prog : Math.min(prog, 0.92));
    }
    if (!rub.done && rub.dist >= RUB_DIST && rub.rev >= 2) {
      rub.done = true;
      var left = L.cooldownLeft(curState(), ctx.role, 'pet', Date.now());
      if (left > 0) {
        var rg = ringShow(true); if (rg) rg.classList.add('is-full');
        sparks(e.clientX, e.clientY, 8);
        if (!rub.warned) { rub.warned = true; toast('Ya está mimadita ahora mismo · otra caricia con premio en ' + fmt(left)); }
      } else {
        var rg2 = ringShow(true); if (rg2) rg2.classList.add('is-done');
        bigHeart(); bounce(); commit('pet'); if (mode === 'pet') endMode(true);
      }
    }
  }
  function onRubUp(e) {
    if (!rub || e.pointerId !== rub.id) return;
    var r = rub; rub = null;
    window.removeEventListener('pointermove', onRubMove);
    window.removeEventListener('pointerup', onRubUp);
    window.removeEventListener('pointercancel', onRubUp);
    var rg3 = document.querySelector('#pet-room .pet-ring');
    if (rg3) { rg3.classList.add('is-out'); setTimeout(function () { ringShow(false); }, r.done ? 900 : 250); }
    if (!r.moved && Date.now() - r.t0 < 400) {      // toque: cosquillas
      bounce(); spawn(r.sx, r.sy - 20, ['💗', '✨', '😄'][Math.floor(Math.random() * 3)], 'is-heart');
    }
    if (!busy) { acting = false; render(); }
  }

  /* ---------- tienda ---------- */
  function onShopClick(ev) {
    var s = curState();
    var slotBtn = ev.target.closest('[data-slot]');
    if (slotBtn) { shopSlot = slotBtn.getAttribute('data-slot'); shopSel = null; return render(); }
    var buyBtn = ev.target.closest('[data-buy]');
    if (buyBtn) {
      var item = L.SHOP.filter(function (i) { return i.id === buyBtn.getAttribute('data-buy'); })[0];
      if (!item || busy) return;
      busy = true;
      L.PetStore.buy(ctx.fb, ctx.parejaId, item).then(function (r) {
        busy = false;
        if (r.error === 'faltan-chispas') return toast('Te faltan ' + r.left + ' ✦');
        if (r.error === 'etapa') return toast('Se desbloquea en la etapa ' + r.stage);
        if (r.error) return toast('No se pudo comprar');
        state = r.state; shopSel = null; toast('¡Comprado: ' + item.name + '!');
        return L.PetStore.equip(ctx.fb, ctx.parejaId, item.slot, item.id).then(function () {
          var eq = {}; eq[item.slot] = item.id;
          state = Object.assign({}, state, { equipped: Object.assign({}, state.equipped, eq) });
          render();
        });
      }).catch(function () { busy = false; toast('Sin conexión. Inténtalo de nuevo'); });
      return;
    }
    var itemBtn = ev.target.closest('[data-item]');
    if (!itemBtn) return;
    var it = L.SHOP.filter(function (i) { return i.id === itemBtn.getAttribute('data-item'); })[0];
    if (!it) return;
    var owned = s.owned.indexOf(it.id) >= 0;
    if (owned) {
      var nuevo = (s.equipped[it.slot] === it.id && it.slot !== 'room') ? 'none' : it.id;
      if (!state) return toast('Cuida primero de Dopi para estrenar el armario');
      L.PetStore.equip(ctx.fb, ctx.parejaId, it.slot, nuevo).catch(function () { toast('Sin conexión. Inténtalo de nuevo'); });
      return;
    }
    if (it.stage && s.stage < it.stage) return toast('Se desbloquea en la etapa ' + it.stage + ' («' + D.STAGES[it.stage] + '»)');
    shopSel = it.id; render();
  }

  function wire() {
    if (wired) return; wired = true;
    $('pet-acts').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (b) startMode(b.getAttribute('data-act'));
    });
    $('pet-tray').addEventListener('pointerdown', function (ev) {
      var b = ev.target.closest('.pet-tool'); if (!b) return;
      ev.preventDefault(); startDrag(b, ev);
    });
    $('pet-hint-cancel').addEventListener('click', function () { endMode(); });
    $('pet-holder').addEventListener('pointerdown', onHolderDown);
    $('pet-shop').addEventListener('click', onShopClick);
    $('pet-reset-btn').addEventListener('click', onResetClick);
  }

  /* reiniciar a Dopi (dos toques para confirmar) */
  var resetTimer = null;
  function resetDisarm() {
    var b = $('pet-reset-btn'); if (!b) return;
    clearTimeout(resetTimer); resetTimer = null;
    b.classList.remove('is-armed'); b.textContent = 'Reiniciar a Dopi';
    var n = $('pet-reset-note'); if (n) n.hidden = true;
  }
  function onResetClick() {
    var b = $('pet-reset-btn');
    if (!b.classList.contains('is-armed')) {
      b.classList.add('is-armed'); b.textContent = 'Toca otra vez para confirmar';
      var n = $('pet-reset-note'); if (n) n.hidden = false;
      resetTimer = setTimeout(resetDisarm, 6000);
      return;
    }
    resetDisarm();
    if (busy) return;
    busy = true; endMode(true);
    L.PetStore.reset(ctx.fb, ctx.parejaId).then(function (r) {
      busy = false; state = r.state; shopKey = ''; shopSel = null; shopSlot = 'hat'; acting = false;
      toast('Dopi ha vuelto a ser un huevito 🥚');
      render();
    }).catch(function () { busy = false; toast('No se pudo reiniciar. Inténtalo de nuevo'); });
  }

  /* ---------- API pública ---------- */
  function init(c) {
    stop();
    ctx = c; state = null; shopKey = ''; acting = false; busy = false; mode = null; scrub = 0;
    wire();
    unsub = ctx.fb.onSnapshot(L.PetStore.ref(ctx.fb, ctx.parejaId), function (snap) {
      state = snap.exists() ? snap.data() : null;
      render();
    }, function () { /* sin permisos o sin red: se queda con lo último */ });
    timer = setInterval(render, 30000);
  }
  function stop() {
    if (unsub) { unsub(); unsub = null; }
    if (timer) { clearInterval(timer); timer = null; }
    if (drag) finishDrag();
    ctx = null; state = null; svg = null; mode = null;
    var dot = $('pet-tab-dot'); if (dot) dot.hidden = true;
  }
  function show() { if (!ctx) return; shopKey = ''; render(); }

  function reward(kind) {
    if (!ctx) return Promise.resolve();
    return L.PetStore.reward(ctx.fb, ctx.parejaId, ctx.people, ctx.role, kind).then(function (r) {
      if (!r || r.error) return;
      var ev = r.events.filter(function (e) { return e.kind === 'reward'; })[0];
      if (ev) toast('Dopi: +' + ev.pts + ' ✦ · ' + (L.REWARDS[kind] ? L.REWARDS[kind].label : kind));
      handleEvents(r.events);
    }).catch(function () { /* un premio fallido nunca debe estorbar a la acción original */ });
  }

  function weekly(weekKey, racha) {
    if (!ctx) return Promise.resolve();
    var fb = ctx.fb, ref = L.PetStore.ref(fb, ctx.parejaId), role = ctx.role;
    return fb.runTransaction(fb.db, function (tx) {
      return tx.get(ref).then(function (snap) {
        var now = Date.now(), s = snap.exists() ? snap.data() : L.newState(now);
        if (s.streak && s.streak.lastWeekId === weekKey) return null;
        var ev = L.award(s, role, 'weeklyStreak', now);
        s.streak = { weeks: racha, lastWeekId: weekKey };
        tx.set(ref, s);
        return ev;
      });
    }).then(function (ev) { if (ev) toast('Racha semanal: +' + ev.pts + ' ✦ para Dopi 🔥'); }).catch(function () { });
  }

  function react(kind) { if (ctx && ensureSvg()) D.react(svg, kind); }

  root.MascotaUI = { init: init, stop: stop, show: show, reward: reward, weekly: weekly, react: react };
})(typeof window !== 'undefined' ? window : globalThis);
