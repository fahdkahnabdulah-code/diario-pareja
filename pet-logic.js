/* =========================================================
   DOPI — lógica de juego (pura, sin DOM) + helper de Firestore
   Principio: romántica, no punitiva. Nada muere, nada se pierde:
   las necesidades tienen suelo (FLOOR), los puntos y la XP nunca bajan.
   El tiempo se calcula "en perezoso": se guarda el valor y la hora
   (lastTick) y al leer se aplica el desgaste hasta ahora. Sin cron.
   ========================================================= */
(function (root) {
  'use strict';

  var H = 3600 * 1000, MIN = 60 * 1000;
  var NEEDS = ['hunger', 'mood', 'energy', 'love', 'clean'];
  var NEED_LABEL = { hunger: 'Comida', mood: 'Ánimo', energy: 'Energía', love: 'Cariño', clean: 'Limpieza' };
  var FLOOR = 5;                       // nunca llega a 0
  var DECAY = { hunger: 4, mood: 3, energy: 2.5, love: 2, clean: 2 };   // puntos por hora
  var SLEEP_GAIN = 10;                 // energía por hora mientras duerme

  var ACTIONS = {
    feed:     { label: 'Dar de comer', mood: 'eat',   ms: 2400, cd: 3 * H,  delta: { hunger: 35, mood: 5 },              pts: 3, xp: 5 },
    play:     { label: 'Jugar',        mood: 'play',  ms: 3000, cd: 2 * H,  delta: { mood: 30, energy: -10, hunger: -5 }, pts: 3, xp: 5 },
    pet:      { label: 'Acariciar',    mood: 'pet',   ms: 2200, cd: 30 * MIN, delta: { love: 20, mood: 5 },              pts: 1, xp: 2, dailyMax: 6 },
    clean:    { label: 'Limpiar',      mood: 'pet',   ms: 2200, cd: 4 * H,  delta: { clean: 50, mood: 5 },               pts: 3, xp: 5 },
    sleep:    { label: 'Arropar',      mood: 'sleepy',ms: 0,    cd: 8 * H,  delta: { energy: 10 },                       pts: 3, xp: 5 },
    surprise: { label: 'Mimo sorpresa',mood: 'party', ms: 3200, cd: 24 * H, delta: { hunger: 15, mood: 15, energy: 15, love: 15 }, pts: 5, xp: 10, notify: true }
  };

  // Puntos (chispas ✦) por usar la app de pareja
  var REWARDS = {
    diary:        { pts: 20, xp: 10, dailyMax: 1, label: 'Escribir tu parte del diario' },
    photoCheck:   { pts: 15, xp: 8,  dailyMax: 1, label: 'Completar el check de fotos' },
    poke:         { pts: 2,  xp: 1,  dailyMax: 5, label: 'Enviar un poke' },
    teamDay:      { pts: 10, xp: 0,  dailyMax: 1, label: 'Día en equipo (los dos la cuidáis)' },
    weeklyStreak: { pts: 100, xp: 40, label: 'Racha semanal completa' },
    reunion:      { pts: 10, xp: 0,  label: 'Reencuentro tras 3+ días' }
  };

  // Evolución: XP acumulada (nunca baja) + requisito de días en equipo
  var STAGE_XP = [null, 0, 60, 350, 1000, 2200];
  var STAGE_TEAMDAYS = [null, 0, 1, 5, 15, 30];
  var DAILY_XP_CAP = { solo: 40, team: 80 };
  var TEAM_MULT = 1.5;

  function clamp(v) { return Math.max(FLOOR, Math.min(100, Math.round(v))); }
  function dayId(t) {          // día en Europe/Madrid: 'YYYY-MM-DD'
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date(t));
  }
  function hourMadrid(t) {
    return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(t));
  }

  /* Aplica el desgaste desde lastTick hasta now. Devuelve necesidades nuevas. */
  function decay(state, now) {
    var n = Object.assign({ clean: 80 }, state.needs);   // clean: docs antiguos sin limpieza
    var from = state.lastTick, to = now;
    if (to <= from) return n;
    var sleepEnd = state.sleepingUntil || 0;
    var sleptH = Math.max(0, Math.min(to, sleepEnd) - from) / H;
    var awakeH = (to - from) / H - sleptH;
    NEEDS.forEach(function (k) {
      var rate = DECAY[k];
      var v = n[k] - rate * awakeH - (k === 'energy' ? -SLEEP_GAIN * sleptH : rate * 0.5 * sleptH);
      n[k] = clamp(v);
    });
    return n;
  }

  function isSick(n) {
    var avg = (n.hunger + n.mood + n.energy + n.love) / 4;
    var low = ['hunger', 'mood', 'energy', 'love'].filter(function (k) { return n[k] < 12; }).length;
    return avg < 20 || low >= 3;
  }

  /* Estado de fondo (sin acción en curso). Orden de prioridad documentado. */
  function resolveMood(state, now, people) {
    var n = decay(state, now);
    if (isSick(n)) return { mood: 'sick', reason: 'Necesita a los dos un ratito' };
    if (state.sleepingUntil && state.sleepingUntil > now) return { mood: 'sleepy', reason: 'Está dormida' };
    if (n.hunger < 30) return { mood: 'hungry', reason: 'Tiene hambre' };
    var missing = (people || []).filter(function (p) {
      var la = state.lastAction && state.lastAction[p.uid];
      return !la || now - la.at > 48 * H;
    });
    if (n.love < 30 || missing.length === 1) return { mood: 'sad', reason: missing.length === 1 ? 'Echa de menos a ' + missing[0].name : 'Quiere mimos', missing: missing[0] && missing[0].uid };
    if (n.energy < 25) return { mood: 'sleepy', reason: 'Está cansada' };
    var today = state.days && state.days[dayId(now)];
    if (today && today.team && NEEDS.every(function (k) { return n[k] > 60; })) return { mood: 'love', reason: 'Hoy la habéis cuidado los dos' };
    return { mood: 'happy', reason: 'Está contenta' };
  }

  function cooldownLeft(state, uid, type, now) {
    var c = state.cooldowns && state.cooldowns[uid] && state.cooldowns[uid][type];
    return c ? Math.max(0, c - now) : 0;
  }

  /* Aplica una acción de cuidado. Puro: devuelve { state, events } o { error } */
  function applyAction(state, uid, type, now, people) {
    var A = ACTIONS[type];
    if (!A) return { error: 'acción desconocida' };
    var left = cooldownLeft(state, uid, type, now);
    if (left > 0) return { error: 'cooldown', left: left };
    if (type === 'sleep') {
      var h = hourMadrid(now), n0 = decay(state, now);
      if (!(h >= 21 || h < 10) && n0.energy >= 70) return { error: 'no-tiene-sueño' };
    }
    var s = JSON.parse(JSON.stringify(state));
    var events = [];
    s.needs = decay(state, now);
    Object.keys(A.delta).forEach(function (k) { s.needs[k] = clamp(s.needs[k] + A.delta[k]); });
    s.lastTick = now;
    if (type === 'sleep') s.sleepingUntil = now + 6 * H;
    else if (s.sleepingUntil && s.sleepingUntil > now && type !== 'pet') s.sleepingUntil = now; // despertarla

    s.cooldowns = s.cooldowns || {}; s.cooldowns[uid] = s.cooldowns[uid] || {};
    s.cooldowns[uid][type] = now + A.cd;

    // reencuentro: vuelve tras ≥3 días
    var prev = s.lastAction && s.lastAction[uid];
    if (prev && now - prev.at > 72 * H) events.push(award(s, uid, 'reunion', now));
    s.lastAction = s.lastAction || {}; s.lastAction[uid] = { type: type, at: now };

    // registro del día
    var d = dayFor(s, now);
    d[uid] = d[uid] || { actions: 0, pets: 0 };
    d[uid].actions++;
    var counts = type !== 'pet' || ++d[uid].pets <= A.dailyMax;
    if (counts) { s.points += A.pts; events.push(addXp(s, d, A.xp, now)); }
    events.push({ kind: 'action', type: type, uid: uid, pts: counts ? A.pts : 0 });

    // ¿hoy ya habéis cuidado los dos? -> bonus visible una vez
    var both = (people || []).every(function (p) { return d[p.uid] && d[p.uid].actions > 0; });
    if (both && !d.team) { d.team = true; s.teamDaysTotal = (s.teamDaysTotal || 0) + 1; events.push(award(s, uid, 'teamDay', now)); events.push({ kind: 'teamDay' }); }

    updateHarmony(s, now, people);
    var evo = checkEvolution(s, now);
    if (evo) events.push(evo);
    return { state: s, events: events.filter(Boolean), mood: A.mood, ms: A.ms };
  }

  /* Recompensa por usar la app (diario, fotos, poke, racha) */
  function award(s, uid, kind, now) {
    var R = REWARDS[kind]; if (!R) return null;
    var d = dayFor(s, now);
    d.rewards = d.rewards || {}; var key = uid + ':' + kind;
    if (R.dailyMax && (d.rewards[key] || 0) >= R.dailyMax) return null;
    d.rewards[key] = (d.rewards[key] || 0) + 1;
    s.points += R.pts;
    if (R.xp) addXp(s, d, R.xp, now);
    return { kind: 'reward', reward: kind, uid: uid, pts: R.pts };
  }

  function dayFor(s, now) {
    s.days = s.days || {};
    var id = dayId(now);
    s.days[id] = s.days[id] || { xp: 0 };
    // conserva solo 21 días en el documento (el histórico va a petDays/)
    var keys = Object.keys(s.days).sort();
    while (keys.length > 21) delete s.days[keys.shift()];
    return s.days[id];
  }

  function addXp(s, d, base, now) {
    var team = !!d.team;
    var gain = Math.round(base * (team ? TEAM_MULT : 1));
    var cap = team ? DAILY_XP_CAP.team : DAILY_XP_CAP.solo;
    gain = Math.max(0, Math.min(gain, cap - d.xp));
    d.xp += gain; s.xp += gain;
    return gain ? { kind: 'xp', gain: gain, team: team } : null;
  }

  /* Armonía: mix = días en equipo / días con actividad (14 días)
              share = parte de acciones de la persona A */
  function updateHarmony(s, now, people) {
    var ids = Object.keys(s.days || {}).sort().slice(-14);
    var active = 0, team = 0, a = 0, b = 0;
    var A = people && people[0] && people[0].uid, B = people && people[1] && people[1].uid;
    ids.forEach(function (id) {
      var d = s.days[id];
      var acts = (d[A] ? d[A].actions : 0) + (d[B] ? d[B].actions : 0);
      if (acts) active++;
      if (d.team) team++;
      a += d[A] ? d[A].actions : 0; b += d[B] ? d[B].actions : 0;
    });
    var target = active ? team / active : 0.5;
    s.harmony = {
      mix: +(0.6 * target + 0.4 * ((s.harmony && s.harmony.mix) || 0.5)).toFixed(2),   // suavizado
      share: a + b ? +(a / (a + b)).toFixed(2) : 0.5,
      teamDays14: team
    };
  }

  function checkEvolution(s, now) {
    var next = s.stage + 1;
    if (next > 5) return null;
    if (s.xp < STAGE_XP[next] || (s.teamDaysTotal || 0) < STAGE_TEAMDAYS[next]) return null;
    if (isSick(s.needs)) { s.evolvePending = true; return { kind: 'evolveWaiting' }; }   // espera a que se recupere
    s.stage = next; s.evolvePending = false;
    s.evolvedAt = s.evolvedAt || {}; s.evolvedAt[next] = now;
    return { kind: 'evolve', stage: next };
  }

  function progress(s) {
    if (s.stage >= 5) return { pct: 100, xpLeft: 0, teamLeft: 0 };
    var a = STAGE_XP[s.stage], b = STAGE_XP[s.stage + 1];
    return {
      pct: Math.min(100, Math.round((s.xp - a) / (b - a) * 100)),
      xpLeft: Math.max(0, b - s.xp),
      teamLeft: Math.max(0, STAGE_TEAMDAYS[s.stage + 1] - (s.teamDaysTotal || 0))
    };
  }

  function newState(now) {
    return {
      name: 'Dopi', stage: 1, xp: 0, points: 0,
      needs: { hunger: 80, mood: 80, energy: 80, love: 80, clean: 80 }, lastTick: now, sleepingUntil: 0,
      harmony: { mix: 0.5, share: 0.5, teamDays14: 0 }, teamDaysTotal: 0,
      equipped: { hat: 'none', face: 'none', neck: 'none', room: 'cozy' }, owned: ['cozy'],
      cooldowns: {}, lastAction: {}, days: {}, streak: { weeks: 0, lastWeekId: null }
    };
  }

  /* "Abdu la alimentó hace 2 h" */
  var VERB = { feed: 'le dio de comer', play: 'jugó con ella', pet: 'la acarició', sleep: 'la arropó', surprise: 'le dio un mimo sorpresa' };
  function ago(ms) {
    var m = Math.round(ms / MIN);
    if (m < 1) return 'ahora mismo';
    if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'hace ' + h + ' h';
    var d = Math.round(h / 24); return d === 1 ? 'ayer' : 'hace ' + d + ' días';
  }
  function logLine(name, type, at, now) { return name + ' ' + VERB[type] + ' · ' + ago(now - at); }

  /* -------- Firestore (SDK modular v9+). Pasa las funciones que uses:
     import { doc, runTransaction, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore'
     PetStore.act({ db, doc, runTransaction, collection }, coupleId, people, uid, 'feed')         */
  var PetStore = {
    ref: function (fb, coupleId) { return fb.doc(fb.db, 'parejas', coupleId, 'mascota', 'estado'); },
    act: function (fb, coupleId, people, uid, type) {
      var ref = PetStore.ref(fb, coupleId);
      return fb.runTransaction(fb.db, function (tx) {
        return tx.get(ref).then(function (snap) {
          var now = Date.now();
          var s = snap.exists() ? snap.data() : newState(now);
          var r = applyAction(s, uid, type, now, people);
          if (r.error) return r;
          tx.set(ref, r.state);
          var logRef = fb.doc(fb.collection(fb.db, 'parejas', coupleId, 'mascotaLog'));
          tx.set(logRef, { uid: uid, type: type, at: now, pts: (r.events.find(function (e) { return e.kind === 'action'; }) || {}).pts || 0 });
          var d = r.state.days[dayId(now)];
          tx.set(fb.doc(fb.db, 'parejas', coupleId, 'mascotaDias', dayId(now)), d, { merge: true });
          return r;
        });
      });
    },
    reward: function (fb, coupleId, people, uid, kind) {
      var ref = PetStore.ref(fb, coupleId);
      return fb.runTransaction(fb.db, function (tx) {
        return tx.get(ref).then(function (snap) {
          var now = Date.now(); var s = snap.exists() ? snap.data() : newState(now);
          var ev = award(s, uid, kind, now); if (!ev) return { error: 'límite-diario' };
          var evo = checkEvolution(s, now);
          tx.set(ref, s); return { state: s, events: [ev, evo].filter(Boolean) };
        });
      });
    },
    buy: function (fb, coupleId, item) {
      var ref = PetStore.ref(fb, coupleId);
      return fb.runTransaction(fb.db, function (tx) {
        return tx.get(ref).then(function (snap) {
          var s = snap.data();
          if (s.owned.indexOf(item.id) >= 0) return { error: 'ya-lo-tenéis' };
          if (s.points < item.price) return { error: 'faltan-chispas', left: item.price - s.points };
          if (item.stage && s.stage < item.stage) return { error: 'etapa', stage: item.stage };
          s.points -= item.price; s.owned.push(item.id);
          tx.update(ref, { points: s.points, owned: s.owned }); return { state: s };
        });
      });
    },
    reset: function (fb, coupleId) {
      var ref = PetStore.ref(fb, coupleId);
      return fb.runTransaction(fb.db, function (tx) {
        return tx.get(ref).then(function () {
          var s = newState(Date.now()); s.resetAt = Date.now();
          tx.set(ref, s); return { state: s };
        });
      });
    },
    equip: function (fb, coupleId, slot, id) {
      var patch = {}; patch['equipped.' + slot] = id;
      return fb.updateDoc(PetStore.ref(fb, coupleId), patch);
    }
  };

  /* Catálogo de la tienda (estático en código; en Firestore solo "owned") */
  var SHOP = [
    { id: 'beanie',  slot: 'hat',  name: 'Gorro de lana',     price: 90 },
    { id: 'beret',   slot: 'hat',  name: 'Boina',             price: 120 },
    { id: 'cap',     slot: 'hat',  name: 'Gorra',             price: 90 },
    { id: 'flowers', slot: 'hat',  name: 'Diadema de flores', price: 140 },
    { id: 'horns',   slot: 'hat',  name: 'Cuernitos',         price: 160 },
    { id: 'party',   slot: 'hat',  name: 'Gorro de fiesta',   price: 100 },
    { id: 'crown',   slot: 'hat',  name: 'Corona',            price: 450, stage: 4 },
    { id: 'round',   slot: 'face', name: 'Gafas redondas',    price: 110 },
    { id: 'hearts',  slot: 'face', name: 'Gafas corazón',     price: 160 },
    { id: 'stache',  slot: 'face', name: 'Bigote postizo',    price: 80 },
    { id: 'scarf',   slot: 'neck', name: 'Bufanda a rayas',   price: 120 },
    { id: 'bowtie',  slot: 'neck', name: 'Pajarita',          price: 90 },
    { id: 'collar',  slot: 'neck', name: 'Collar con corazón',price: 220, stage: 3 },
    { id: 'bandana', slot: 'neck', name: 'Pañuelo',           price: 90 },
    { id: 'cozy',    slot: 'room', name: 'Cuarto acogedor',   price: 0 },
    { id: 'beach',   slot: 'room', name: 'Playa',             price: 320 },
    { id: 'garden',  slot: 'room', name: 'Jardín',            price: 280 },
    { id: 'attic',   slot: 'room', name: 'Buhardilla de estrellas', price: 400, stage: 3 }
  ];

  root.PetLogic = {
    NEEDS: NEEDS, NEED_LABEL: NEED_LABEL, ACTIONS: ACTIONS, REWARDS: REWARDS, SHOP: SHOP,
    STAGE_XP: STAGE_XP, STAGE_TEAMDAYS: STAGE_TEAMDAYS,
    newState: newState, decay: decay, resolveMood: resolveMood, applyAction: applyAction, award: award,
    cooldownLeft: cooldownLeft, progress: progress, isSick: isSick, logLine: logLine, ago: ago, dayId: dayId,
    PetStore: PetStore
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PetLogic;
})(typeof window !== 'undefined' ? window : globalThis);
