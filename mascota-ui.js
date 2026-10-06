/* =========================================================
   +Dopamina · Pestaña "Dopi" — UI de la mascota compartida.
   Script clásico (sin imports): app.js le pasa Firestore y utilidades.
     MascotaUI.init({ role, partner, displayName, parejaId, people, fb, push, toast })
     MascotaUI.stop()                    al cerrar sesión
     MascotaUI.show()                    al abrir la pestaña
     MascotaUI.reward(kind)              diary | photoCheck | poke
     MascotaUI.weekly(weekKey, racha)    premio de racha semanal (1 vez/semana)
     MascotaUI.react('poke'|'photo')     reacción visual
   fb = { db, doc, collection, runTransaction, updateDoc, onSnapshot }
   Requiere dopi.js y pet-logic.js cargados antes.
   ========================================================= */
(function (root) {
  'use strict';

  var L = root.PetLogic, D = root.Dopi;
  var ctx = null, state = null, unsub = null, timer = null;
  var acting = false, busy = false, wired = false, svg = null;
  var shopSlot = 'hat', shopSel = null, shopKey = '';

  var ICON = {
    feed: 'M4 11h16a8 8 0 0 1-16 0ZM9 3.5c0 1.5 1.5 1.5 1.5 3M13.5 3.5c0 1.5 1.5 1.5 1.5 3',
    play: 'M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16ZM4.5 9.5c5 1 10 1 15 0M12 4c-2.5 4-2.5 12 0 16',
    pet: 'M7 13V7a1.5 1.5 0 0 1 3 0v4M10 11V5a1.5 1.5 0 0 1 3 0v6M13 11V6a1.5 1.5 0 0 1 3 0v6M16 12V9a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L7 13',
    sleep: 'M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5ZM17 4v3M15.5 5.5h3',
    surprise: 'M4 10h16v10H4ZM3 7h18v3H3ZM12 7v13M12 7C10.5 3.5 6.5 4 7.5 6.5M12 7c1.5-3.5 5.5-3 4.5-.5'
  };
  var SHORT = { feed: 'Comer', play: 'Jugar', pet: 'Caricia', sleep: 'Arropar', surprise: 'Sorpresa' };
  var COLORS = { hunger: '#D99A2B', mood: '#E0508A', energy: '#17A493', love: '#B04E9A' };
  var TITLES = { happy: 'Está contenta', hungry: 'Tiene hambre', sleepy: 'Durmiendo', sad: 'Os echa de menos', love: 'Está enamorada', sick: 'Está apagadita' };
  var SLOTS = [['hat', 'Gorros'], ['face', 'Gafas'], ['neck', 'Cuello'], ['room', 'Cuarto']];
  var ROOM_SWATCH = { cozy: ['#F7E3DA', '#E7C3AE'], beach: ['#BFE7F1', '#F1DDB0'], garden: ['#CFE8C4', '#9DCB86'], attic: ['#E8CDB4', '#C99B76'] };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(ms) { var m = Math.ceil(ms / 60000); return m >= 60 ? Math.round(m / 60) + ' h' : m + ' min'; }
  function toast(msg) { if (ctx && ctx.toast) ctx.toast(msg); }
  function visible() { var t = $('tab-mascota'); return !!(t && t.classList.contains('active')); }
  function curState() { return state || L.newState(Date.now()); }
  function timeOfDay(t) {
    var h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(t));
    return h < 7 ? 'night' : h < 12 ? 'morning' : h < 19 ? 'day' : h < 22 ? 'evening' : 'night';
  }
  function nameOf(uid) {
    var p = ctx.people.filter(function (x) { return x.uid === uid; })[0];
    return p ? p.name : 'Alguien';
  }

  function ensureSvg() {
    var holder = $('pet-holder');
    if (!holder) return null;
    if (!svg || !holder.contains(svg)) {
      var s = curState();
      holder.innerHTML = D.svg({ stage: s.stage, mood: 'happy', mix: s.harmony.mix });
      svg = holder.querySelector('.dopi');
    }
    return svg;
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

    var room = $('pet-room');
    room.setAttribute('data-time', timeOfDay(t));
    room.setAttribute('data-room', s.equipped.room || 'cozy');
    $('pet-stage').textContent = D.STAGES[s.stage];
    $('pet-points').textContent = '✦ ' + s.points;
    var team = $('pet-team');
    team.className = 'chip ' + (day && day.team ? 'chip-gold' : 'chip-plain');
    team.textContent = day && day.team ? 'Hoy los dos · XP ×1,5' : 'Falta uno hoy';
    $('pet-mood-title').textContent = TITLES[r.mood] || '';
    $('pet-mood-reason').textContent = r.reason === $('pet-mood-title').textContent ? '' : r.reason;

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

    $('pet-acts').innerHTML = Object.keys(L.ACTIONS).map(function (k) {
      var left = L.cooldownLeft(s, ctx.role, k, t), cd = L.ACTIONS[k].cd;
      var cls = 'act' + (left ? ' is-cooling' : '') + (k === 'surprise' && !left ? ' is-special' : '');
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

  /* ---------- acciones ---------- */
  function floatPts(n) {
    var room = $('pet-room'); if (!room || !n) return;
    var el = document.createElement('span');
    el.className = 'float-pts'; el.textContent = '+' + n + ' ✦';
    el.style.left = '50%'; el.style.bottom = '170px';
    room.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
  }

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

  function onAct(type) {
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
          state = Object.assign({}, state, { equipped: Object.assign({}, state.equipped, (function () { var o = {}; o[item.slot] = item.id; return o; })()) });
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
      var b = ev.target.closest('[data-act]'); if (b) onAct(b.getAttribute('data-act'));
    });
    $('pet-shop').addEventListener('click', onShopClick);
  }

  /* ---------- API pública ---------- */
  function init(c) {
    stop();
    ctx = c; state = null; shopKey = ''; acting = false; busy = false;
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
    ctx = null; state = null; svg = null;
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
