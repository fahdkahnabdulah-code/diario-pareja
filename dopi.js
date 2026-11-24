/* =========================================================
   DOPI — componente SVG reutilizable (sin dependencias)
   Uso:
     el.innerHTML = Dopi.svg({ stage: 4, mood: 'happy', mix: .7, share: .5,
                               hat: 'beanie', face: 'none', neck: 'scarf' });
     Dopi.set(el.querySelector('.dopi'), { mood: 'eat' });   // cambia en caliente
     Dopi.flash(svgEl, 'eat', 2400);   // estado temporal y vuelve al anterior
     Dopi.react(svgEl, 'photo');       // reacción de 1,6 s (poke | photo)
   Requiere dopi.css cargado en la página.
   ========================================================= */
(function (root) {
  'use strict';

  var HEART = 'M0 6C-7 1-9-3-7-6C-5-9-1-8 0-5C1-8 5-9 7-6C9-3 7 1 0 6Z';
  var SPARK = 'M0-8Q1.5-1.5 8 0Q1.5 1.5 0 8Q-1.5 1.5-8 0Q-1.5-1.5 0-8Z';
  var ZED = 'M-5-6h10l-10 12h10';

  function at(x, y, inner) { return '<g transform="translate(' + x + ' ' + y + ')">' + inner + '</g>'; }


  /* ---------- accesorios (se colocan con los anclajes de cada especie y fase) ---------- */
  var ACC_HAT = [
    '<g class="acc a-hat-beanie"><path class="a-pink ln" d="M58 74C58 38 142 38 142 74Z"/><path class="a-stripe-w" d="M76 50L80 70M100 44V70M124 50L120 70"/><rect class="a-teal ln" x="54" y="68" width="92" height="14" rx="7"/><circle class="a-teal ln" cx="100" cy="36" r="8"/></g>',
    '<g class="acc a-hat-beret"><ellipse class="a-wine ln" cx="94" cy="60" rx="48" ry="14" transform="rotate(-9 94 60)"/><path class="a-wire" d="M96 47L99 38"/></g>',
    '<g class="acc a-hat-cap"><path class="a-teal ln" d="M60 74C60 42 140 42 140 74Z"/><path class="a-teal ln" d="M130 70C148 66 168 68 172 76C160 80 142 80 130 77Z"/><circle class="a-pink" cx="100" cy="46" r="4.5"/></g>',
    '<g class="acc a-hat-crown"><path class="a-gold ln" d="M74 60L72 32L88 46L100 26L112 46L128 32L126 60Z"/><circle class="c-a" cx="88" cy="53" r="3.2"/><circle class="c-b" cx="112" cy="53" r="3.2"/><circle class="a-cream" cx="100" cy="51" r="3.6"/></g>',
    '<g class="acc a-hat-flowers"><path class="a-band" d="M58 74Q100 48 142 74"/>',
      at(66, 66, '<circle class="a-pink ln-thin" r="7"/><circle class="a-gold" r="2.6"/>'),
      at(84, 57, '<circle class="a-teal ln-thin" r="6"/><circle class="a-gold" r="2.3"/>'),
      at(116, 57, '<circle class="a-pink ln-thin" r="6"/><circle class="a-gold" r="2.3"/>'),
      at(134, 66, '<circle class="a-teal ln-thin" r="7"/><circle class="a-gold" r="2.6"/>'),
    '</g>',
    '<g class="acc a-hat-horns"><path class="a-horn ln" d="M70 66C62 56 62 44 68 36C71 47 77 54 86 58Z"/><path class="a-horn ln" d="M130 66C138 56 138 44 132 36C129 47 123 54 114 58Z"/></g>',
    '<g class="acc a-hat-party" transform="rotate(12 104 40)"><path class="a-pink ln" d="M84 58L104 12L124 58Z"/><path class="a-stripe-b" d="M93 40L115 40M99 26L109 26"/><circle class="a-gold ln" cx="104" cy="12" r="6"/></g>'
  ].join('');
  var ACC_FACE = [
    '<g class="acc a-face-round"><circle class="a-lens ln" cx="78" cy="98" r="14"/><circle class="a-lens ln" cx="122" cy="98" r="14"/><path class="a-wire" d="M92 97Q100 91 108 97M64 95L48 90M136 95L152 90"/></g>',
    '<g class="acc a-face-hearts"><path class="a-sun ln-thin" d="M78 113C63 105 59 96 61 90C63 82 74 81 78 89C82 81 93 82 95 90C97 96 93 105 78 113Z"/><path class="a-sun ln-thin" d="M122 113C107 105 103 96 105 90C107 82 118 81 122 89C126 81 137 82 139 90C141 96 137 105 122 113Z"/><path class="a-wire" d="M95 92Q100 89 105 92"/><path class="a-stripe-w" d="M68 90L72 87M112 90L116 87"/></g>',
    '<g class="acc a-face-stache"><path class="a-dark" d="M100 113C94 107 83 107 78 115C86 113 92 117 100 117C108 117 114 113 122 115C117 107 106 107 100 113Z"/></g>'
  ].join('');
  var ACC_NECK = [
    '<g class="acc a-neck-scarf"><path class="a-pink ln" d="M46 134Q100 158 154 134L156 148Q100 172 44 148Z"/><path class="a-stripe-b" d="M64 143L62 154M84 149L83 160M116 149L117 160M136 143L138 154"/><path class="a-pink ln" d="M126 152L140 180L124 182L116 156Z"/></g>',
    '<g class="acc a-neck-bowtie"><path class="a-teal ln" d="M100 141L80 130L80 152Z"/><path class="a-teal ln" d="M100 141L120 130L120 152Z"/><circle class="a-pink ln" cx="100" cy="141" r="5.5"/></g>',
    '<g class="acc a-neck-collar"><path class="a-collar" d="M52 134Q100 156 148 134"/>',
      at(100, 152, '<path class="a-gold ln-thin" transform="scale(1.3)" d="' + HEART + '"/>'),
    '</g>',
    '<g class="acc a-neck-bandana"><path class="a-teal ln" d="M48 134Q100 152 152 134L100 172Z"/><circle class="a-cream" cx="88" cy="148" r="2.5"/><circle class="a-cream" cx="112" cy="148" r="2.5"/><circle class="a-cream" cx="100" cy="160" r="2.5"/></g>'
  ].join('');

  /* ---------- partículas por estado ---------- */
  var FX = [
    '<g class="fx">',
      // contento: destello suelto
      '<g class="m-happy">', at(158, 58, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'), at(42, 74, '<path class="fx-spark fx-twinkle dl2" transform="scale(.6)" d="' + SPARK + '"/>'), '</g>',
      // hambriento: bocadillo con galleta + tripa que ruge
      '<g class="m-hungry">',
        '<circle class="fx-bub" cx="146" cy="64" r="3"/><circle class="fx-bub" cx="154" cy="52" r="5"/>',
        '<ellipse class="fx-bub" cx="172" cy="30" rx="19" ry="15"/>',
        '<circle class="fx-cookie" cx="172" cy="30" r="9"/><circle class="fx-chip" cx="169" cy="27" r="1.7"/><circle class="fx-chip" cx="175" cy="33" r="1.7"/><circle class="fx-chip" cx="174" cy="26" r="1.3"/>',
        '<path class="fx-rumble fx-twinkle" d="M30 148l-9-2M28 156h-10M30 164l-9 2"/>',
        '<path class="fx-rumble fx-twinkle dl1" d="M170 148l9-2M172 156h10M170 164l9 2"/>',
      '</g>',
      // durmiendo: zetas
      '<g class="m-sleepy">', at(148, 66, '<path class="fx-z fx-float" d="' + ZED + '"/>'), at(158, 50, '<path class="fx-z fx-float dl2" transform="scale(1.3)" d="' + ZED + '"/>'), at(168, 32, '<path class="fx-z fx-float dl3" transform="scale(1.6)" d="' + ZED + '"/>'), '</g>',
      // triste: nubecita
      '<g class="m-sad">',
        '<g class="fx-twinkle"><ellipse class="fx-cloud" cx="160" cy="40" rx="18" ry="10"/><circle class="fx-cloud" cx="152" cy="34" r="9"/><circle class="fx-cloud" cx="166" cy="32" r="10"/></g>',
        at(154, 56, '<path class="fx-drop fx-fall" d="M0-4Q3 1 0 3Q-3 1 0-4Z"/>'), at(166, 56, '<path class="fx-drop fx-fall dl1" d="M0-4Q3 1 0 3Q-3 1 0-4Z"/>'),
      '</g>',
      // enamorado: corazones rosa y teal
      '<g class="m-love">', at(40, 92, '<path class="fx-heart-a fx-rise" d="' + HEART + '"/>'), at(162, 84, '<path class="fx-heart-b fx-rise dl1" transform="scale(1.2)" d="' + HEART + '"/>'), at(150, 44, '<path class="fx-heart-a fx-rise dl2" transform="scale(.8)" d="' + HEART + '"/>'), at(54, 50, '<path class="fx-heart-b fx-rise dl3" transform="scale(.9)" d="' + HEART + '"/>'), '</g>',
      // enfermo: nube mareada
      '<g class="m-sick">', '<ellipse class="fx-sick" cx="160" cy="40" rx="16" ry="9"/><circle class="fx-sick" cx="152" cy="34" r="8"/><circle class="fx-sick" cx="166" cy="33" r="8"/>', '<path class="fx-swirl" d="M156 40a4 4 0 1 1 6 0a7 7 0 1 1-10-2"/>', '</g>',
      // comiendo: galleta mordida + migas
      '<g class="m-eat">',
        '<path class="fx-cookie" d="M150 120a14 14 0 1 0 2 14a5 5 0 0 1-4-6a5 5 0 0 1 2-8Z"/>',
        '<circle class="fx-chip" cx="142" cy="128" r="2"/><circle class="fx-chip" cx="148" cy="138" r="1.7"/>',
        at(118, 140, '<circle class="fx-crumb fx-fall" r="2.2"/>'), at(126, 136, '<circle class="fx-crumb fx-fall dl1" r="1.8"/>'), at(110, 142, '<circle class="fx-crumb fx-fall dl2" r="1.6"/>'),
      '</g>',
      // jugando: pelota de los dos colores
      '<g class="m-play"><g class="fx-bounce">', '<circle class="fx-heart-a" cx="176" cy="166" r="12"/><path class="fx-heart-b" d="M164 166a12 12 0 0 0 24 0Z"/><circle class="fx-ball-line" cx="176" cy="166" r="12"/>', '</g></g>',
      // caricias: destellos y corazoncitos
      '<g class="m-pet">', at(36, 80, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'), at(164, 70, '<path class="fx-spark fx-twinkle dl1" d="' + SPARK + '"/>'), at(100, 22, '<path class="fx-heart-a fx-rise" transform="scale(.9)" d="' + HEART + '"/>'), at(118, 28, '<path class="fx-heart-b fx-rise dl2" transform="scale(.7)" d="' + HEART + '"/>'), '</g>',
      // celebrando: confeti
      '<g class="m-party">',
        at(40, 30, '<rect class="fx-conf-a fx-fall" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(70, 18, '<rect class="fx-conf-b fx-fall dl1" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(130, 16, '<rect class="fx-conf-g fx-fall dl2" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(162, 30, '<rect class="fx-conf-a fx-fall dl3" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(24, 70, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'),
        at(178, 76, '<path class="fx-spark fx-twinkle dl1" d="' + SPARK + '"/>'),
        at(150, 20, '<circle class="fx-conf-b fx-fall dl1" r="3"/>'),
        at(52, 22, '<circle class="fx-conf-g fx-fall dl3" r="3"/>'),
      '</g>',
      // reacción: poke recibido
      '<g class="r-poke"><circle class="fx-poke" cx="160" cy="48" r="14"/><rect class="fx-poke-mark" x="158" y="38" width="4" height="12" rx="2"/><circle class="fx-poke-mark" cx="160" cy="55" r="2.4"/></g>',
      // reacción: llega el check de fotos (polaroid que cae)
      '<g class="r-photo"><g class="fx-drop-in"><rect class="fx-photo-card" x="146" y="22" width="40" height="46" rx="3"/><rect class="fx-photo-img" x="151" y="27" width="30" height="28"/><circle class="fx-photo-sun" cx="173" cy="34" r="4"/><path class="fx-photo-hill" d="M151 55L162 42L170 50L176 45L181 55Z"/></g></g>',
    '</g>'
  ].join('');

  var MOODS = ['happy', 'hungry', 'sleepy', 'sad', 'love', 'sick', 'eat', 'play', 'pet', 'party'];
  var MOOD_LABEL = { happy: 'contenta', hungry: 'con hambre', sleepy: 'durmiendo', sad: 'echándoos de menos', love: 'enamorada', sick: 'apagada', eat: 'comiendo', play: 'jugando', pet: 'recibiendo mimos', party: 'celebrando' };
  var STAGES = [null, 'Huevo', 'Grieta', 'Recién nacida', 'Bebé', 'Cría', 'Niña', 'Joven', 'Adulta', 'Adulta radiante', 'Alma gemela'];
  var SPECIES = {
    a: { name: 'Mochi', tag: 'Una gota blandita con hoja que acaba floreciendo' },
    b: { name: 'Orejitas', tag: 'Un animalito suave con orejas y cola' },
    c: { name: 'Estrella', tag: 'Un espíritu de nube que se vuelve estrella' }
  };

  /* ---------- cara: cada estado = boca + cejas + párpados + mirada ---------- */
  // c: cierre de párpados (0 abiertos, 1 cerrados); g: guiño ('d'|'i'); ce: [dyI, gradosI, dyD, gradosD]; m: mirada [x, y]
  var FACES = {
    happy:  { boca: 'feliz' },
    hungry: { ov: ['cuenco'], boca: 'o', ce: [-2, -10, -2, 10], m: [0, .35] },
    sleepy: { ov: ['zzz'], boca: 'neutra', c: 1 },
    sad:    { ov: ['lagrima'], boca: 'triste', ce: [-1, 14, -1, -14], m: [-.2, .7] },
    love:   { ov: ['corazoncitos', 'rubor'], boca: 'feliz', ce: [-2, 0, -2, 0], c: .15 },
    sick:   { ov: ['vendaje', 'sudor'], boca: 'onda', ce: [0, 12, 0, -12], c: .45, m: [0, .5] },
    eat:    { boca: 'mastica', c: .55 },
    play:   { ov: ['notas'], boca: 'abierta', g: 'd', ce: [-2, 0, 0, 0] },
    pet:    { ov: ['rubor'], boca: 'gato', c: .85 },
    party:  { ov: ['chispas-orgullo'], boca: 'abierta', ce: [-3, 0, -3, 0] },
    surprise: { ov: ['exclamacion'], boca: 'o-grande', ce: [-5, 0, -5, 0], m: [0, -.2] },
    curious: { ov: ['interrogacion'], boca: 'lado', ce: [-3, 0, 0, 0], m: [.9, -.3] },
    // extras para reacciones puntuales
    dizzy:  { ov: ['espirales'], boca: 'onda', ce: [0, 8, 0, -8] },
    amazed: { ov: ['ojos-estrella', 'chispas-orgullo'], boca: 'abierta' },
    smitten: { ov: ['ojos-corazon', 'corazoncitos', 'rubor'], boca: 'feliz' },
    drool:  { ov: ['babeo'], boca: 'abierta', ce: [-2, -8, -2, 8], m: [0, .4] }
  };
  /* sobrecapas de expresión (expresiones.svg): se clonan del sprite y se colocan con el anclaje */
  function overlays(el, names) {
    Array.prototype.slice.call(el.querySelectorAll('.dp-sobre')).forEach(function (g) { g.parentNode.removeChild(g); });
    if (!names || !names.length) return;
    var sp = el.getAttribute('data-species'), st = +el.getAttribute('data-stage');
    var a = anchor(sp, st); if (!a || !a.sobre) return;
    var host = el.querySelector('.d-scale') || el;
    names.forEach(function (n) {
      var src = document.getElementById('sobre-' + n); if (!src) return;
      var g = src.cloneNode(true); g.removeAttribute('id');
      g.setAttribute('class', (g.getAttribute('class') || '') + ' dp-sobre');
      g.setAttribute('transform', a.sobre);
      host.appendChild(g);
    });
  }
  function faceApply(el, name) {
    var O = root.DopiOjos; if (!el || !O) return;
    var stage = +el.getAttribute('data-stage'); if (stage < 3) return;
    var f = FACES[name] || FACES.happy;
    O.cerrar(el, f.c || 0, 0);
    O.cerrarOjo(el, 'i', f.g === 'i' ? 1 : (f.c || 0), 0);
    O.cerrarOjo(el, 'd', f.g === 'd' ? 1 : (f.c || 0), 0);
    var m = f.m || [0, 0]; el._gaze = m; O.mirar(el, m[0], m[1], 0);
    var ce = f.ce || [0, 0, 0, 0];
    O.ceja(el, 'i', ce[0], ce[1]); O.ceja(el, 'd', ce[2], ce[3]);
    O.boca(el, f.boca);
    overlays(el, f.ov);
    el._face = name;
  }

  /* ---------- montaje ---------- */
  var uid = 0;
  function art(species, stage) {
    var A = (root.DOPI_ART || {})[species] || (root.DOPI_ART || {}).a;
    return (A && A[stage]) || '';
  }
  function anchor(species, stage) {
    var T = root.DOPI_ANCHORS || {};
    return (T[species] && T[species][stage]) || null;
  }
  // accesorio: transform para llevar un dibujo pensado para la Dopi antigua (coronilla 100,52 · cara 100,98 · cuello 100,140) al sitio de esta
  function place(a, kind) {
    if (!a || !a[kind]) return '';
    var p = a[kind];                       // [x, y, escala]
    var ref = kind === 'hat' ? [100, 76] : kind === 'face' ? [100, 98] : [100, 140];
    return ' transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + (p[2] || 1) + ') translate(' + (-ref[0]) + ' ' + (-ref[1]) + ')"';
  }
  function body(o) {
    var sp = o.species || 'a', st = o.stage || 1, a = anchor(sp, st);
    var n = ++uid;
    var inner = art(sp, st).replace(/clip-ojo-([id])/g, 'clip-ojo-$1-' + n);
    return '<g class="d-rig"><g class="d-scale"><g class="d-body">' + inner + '</g>' +
      '<g class="d-slot s-neck"' + place(a, 'neck') + '>' + ACC_NECK + '</g>' +
      '<g class="d-slot s-face"' + place(a, 'face') + '>' + ACC_FACE + '</g>' +
      '<g class="d-slot s-hat"' + place(a, 'hat') + '>' + ACC_HAT + '</g>' +
      '</g></g><g class="fx">' + FX + '</g>';
  }
  function node(o) {
    o = o || {};
    var species = o.species || 'a', stage = o.stage || 1, mood = o.mood || 'happy';
    var mix = o.mix == null ? 0.5 : o.mix, share = o.share == null ? 0.5 : o.share;
    var label = 'Dopi, ' + STAGES[stage] + ', ' + (MOOD_LABEL[mood] || mood);
    var d = document.createElement('div');
    d.innerHTML = '<svg class="dopi' + (o.still ? ' is-still' : '') + '" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"' +
      ' data-species="' + species + '" data-stage="' + stage + '" data-mood="' + mood + '"' +
      ' data-hat="' + (o.hat || 'none') + '" data-face="' + (o.face || 'none') + '" data-neck="' + (o.neck || 'none') + '"' +
      ' data-react="none" style="--mix:' + mix + ';--share:' + share + '" role="img" aria-label="' + label + '">' +
      body({ species: species, stage: stage }) + '</svg>';
    var el = d.firstChild;
    faceApply(el, mood);
    return el;
  }
  function svg(o) { return node(o).outerHTML; }

  function set(el, o) {
    if (!el) return;
    var rebuild = false;
    if (o.species != null && o.species !== el.getAttribute('data-species')) { el.setAttribute('data-species', o.species); rebuild = true; }
    if (o.stage != null && String(o.stage) !== el.getAttribute('data-stage')) { el.setAttribute('data-stage', o.stage); rebuild = true; }
    if (rebuild) {
      var tmp = document.createElement('div');
      tmp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + body({ species: el.getAttribute('data-species'), stage: +el.getAttribute('data-stage') }) + '</svg>';
      while (el.firstChild) el.removeChild(el.firstChild);
      while (tmp.firstChild.firstChild) el.appendChild(tmp.firstChild.firstChild);
    }
    ['mood', 'hat', 'face', 'neck', 'react'].forEach(function (k) { if (o[k] != null) el.setAttribute('data-' + k, o[k]); });
    if (o.mix != null) el.style.setProperty('--mix', o.mix);
    if (o.share != null) el.style.setProperty('--share', o.share);
    var s = +el.getAttribute('data-stage'), m = el.getAttribute('data-mood');
    el.setAttribute('aria-label', 'Dopi, ' + STAGES[s] + ', ' + (MOOD_LABEL[m] || m));
    if (rebuild || (o.mood != null && !el._override)) faceApply(el, el._override || m);
  }

  // Estado temporal (acción) y vuelta al estado de fondo
  function flash(el, mood, ms) {
    if (!el) return;
    var base = el.getAttribute('data-base-mood') || el.getAttribute('data-mood');
    el.setAttribute('data-base-mood', base);
    set(el, { mood: mood });
    clearTimeout(el._dopiT);
    el._dopiT = setTimeout(function () { set(el, { mood: el.getAttribute('data-base-mood') }); el.removeAttribute('data-base-mood'); }, ms || 2400);
  }

  // cara temporal (sorpresa, curiosidad...) sin cambiar el estado de fondo
  function express(el, name, ms) {
    if (!el) return;
    el._override = name; faceApply(el, name);
    clearTimeout(el._dopiE);
    el._dopiE = setTimeout(function () { el._override = null; faceApply(el, el.getAttribute('data-mood')); }, ms || 1400);
  }

  function react(el, kind, ms) {
    if (!el) return;
    set(el, { react: kind });
    if (kind === 'poke') express(el, 'surprise', ms || 1100);
    clearTimeout(el._dopiR);
    el._dopiR = setTimeout(function () { set(el, { react: 'none' }); }, ms || 1600);
  }

  /* ---------- mirada ---------- */
  function lookAt(el, clientX, clientY, ms) {
    var O = root.DopiOjos; if (!O || !el || +el.getAttribute('data-stage') < 3) return;
    var m = el.getAttribute('data-mood'); if (m === 'sleepy' && !el._override) return;
    var r = el.getBoundingClientRect(); if (!r.width) return;
    var gx = (clientX - (r.left + r.width / 2)) / (r.width * 0.5);
    var gy = (clientY - (r.top + r.height * 0.6)) / (r.height * 0.5);
    gx = Math.max(-1, Math.min(1, gx)); gy = Math.max(-1, Math.min(1, gy));
    el._gaze = [gx, gy]; el._lastLook = Date.now();
    O.mirar(el, gx, gy, ms == null ? 70 : ms);
  }
  // vida propia: te sigue con la mirada, parpadea y curiosea cuando nadie la toca
  function live(el) {
    if (!el || el._live) return el && el._live;
    var O = root.DopiOjos; if (!O) return function () { };
    function onMove(e) { lookAt(el, e.clientX, e.clientY); }
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onMove, { passive: true });
    var blinkT, wanderT, alive = true;
    function blink() {
      blinkT = setTimeout(function () {
        if (!alive || !el.isConnected) return stop();
        if (+el.getAttribute('data-stage') >= 3 && !(FACES[el._face] && FACES[el._face].c >= .8)) {
          var f = FACES[el._face] || {}, base = f.c || 0;
          O.cerrar(el, 1, 90); setTimeout(function () { O.cerrar(el, base, 120); }, 130);
        }
        blink();
      }, 2200 + Math.random() * 3600);
    }
    function wander() {
      wanderT = setTimeout(function () {
        if (!alive || !el.isConnected) return stop();
        var quiet = Date.now() - (el._lastLook || 0) > 3500;
        if (quiet && +el.getAttribute('data-stage') >= 3 && el.getAttribute('data-mood') !== 'sleepy' && !el._override) {
          var x = (Math.random() * 1.6 - .8), y = (Math.random() * 1.2 - .5);
          var base = (FACES[el._face] || {}).m || [0, 0];
          O.mirar(el, Math.random() < .35 ? base[0] : x, Math.random() < .35 ? base[1] : y, 260);
        }
        wander();
      }, 1800 + Math.random() * 2600);
    }
    function stop() {
      alive = false; clearTimeout(blinkT); clearTimeout(wanderT);
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerdown', onMove);
      el._live = null;
    }
    el._live = stop; blink(); wander();
    return stop;
  }

  root.Dopi = {
    svg: svg, node: node, set: set, flash: flash, react: react, express: express, lookAt: lookAt, live: live,
    MOODS: MOODS, MOOD_LABEL: MOOD_LABEL, STAGES: STAGES, SPECIES: SPECIES, FACES: FACES, MAX_STAGE: 10
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Dopi;
})(typeof window !== 'undefined' ? window : globalThis);
