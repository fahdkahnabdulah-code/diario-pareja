/* +Dopamina · sobre.js
   DpSobre.montar(contenedor, { remitente, color, onAbierto })
   Sobre cerrado que se rasga arrastrando: sello que se agrieta, tira que sale, carta que sube y confeti.
   Autocontenido: sin dependencias. Necesita sobre.css (y los tokens de style.css). */
(function (root) {
  'use strict';

  var SVG = `<svg class="dpsb-art" viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sobre de carta"><g class="dpsb-rays"><path d="M120 150L108 -40L132 -40Z" transform="rotate(0 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(30 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(60 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(90 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(120 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(150 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(180 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(210 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(240 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(270 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(300 120 150)"/><path d="M120 150L108 -40L132 -40Z" transform="rotate(330 120 150)"/></g><g class="dpsb-card"><rect class="dpsb-pp" x="44" y="140" width="152" height="104" rx="8"/><path class="dpsb-nf dpsb-Ltx dpsb-op5" d="M62 166H178M62 180H178M62 194H150"/><path class="dpsb-Fpk" d="M166 229.2C156.4 223.2 152.8 218.4 154 214.2C155.2 210 162.4 210 166 216C169.6 210 176.8 210 178 214.2C179.2 218.4 175.6 223.2 166 229.2Z"/></g><g class="dpsb-body"><rect class="dpsb-bodyr" x="20" y="136" width="200" height="134" rx="16"/><path class="dpsb-fold" d="M26 266L96 206M214 266L144 206"/><path class="dpsb-flap" d="M26 142H214L120 216Z"/><g class="dpsb-seal"><g class="dpsb-shake"><circle class="dpsb-gd2" cx="120" cy="216" r="19"/><path class="dpsb-Fpk" d="M120 226C108 218.5 103.5 212.5 105 207.25C106.5 202 115.5 202 120 209.5C124.5 202 133.5 202 135 207.25C136.5 212.5 132 218.5 120 226Z"/><path class="dpsb-crack" d="M106 207L116 214L111 221L121 228M129 204L124 214"/></g></g></g><g class="dpsb-strip"><path class="dpsb-gd2" d="M20 140a14 14 0 0 1 14 -14H206a14 14 0 0 1 14 14V150L210 156L200 150L190 156L180 150L170 156L160 150L150 156L140 150L130 156L120 150L110 156L100 150L90 156L80 150L70 156L60 150L50 156L40 150L30 156L20 150Z"/><path class="dpsb-nf dpsb-Lwh" d="M32 138H208" stroke-dasharray="7 7"/></g><g class="dpsb-flash"><path class="dpsb-Fgd" d="M120 122Q124.5 141.5 144 146Q124.5 150.5 120 170Q115.5 150.5 96 146Q115.5 141.5 120 122Z"/><path class="dpsb-Fgd" d="M66 137.2Q68.4 147.6 78.8 150Q68.4 152.4 66 162.8Q63.6 152.4 53.2 150Q63.6 147.6 66 137.2Z"/><path class="dpsb-Fgd" d="M176 131.6Q178.7 143.3 190.4 146Q178.7 148.7 176 160.4Q173.3 148.7 161.6 146Q173.3 143.3 176 131.6Z"/></g><g class="dpsb-letter"><rect class="dpsb-pp" x="30" y="24" width="180" height="252" rx="14"/><rect class="dpsb-tl1" x="46" y="40" width="148" height="92" rx="8"/><path class="dpsb-tl2 dpsb-fo" d="M47 131V122L84 84L110 110L134 92L193 128V131Z"/><circle class="dpsb-Fgd" cx="168" cy="64" r="9"/><rect class="dpsb-nf dpsb-Ltl" x="46" y="40" width="148" height="92" rx="8"/><rect class="dpsb-ln" x="46" y="150" width="148" height="8" rx="4"/><rect class="dpsb-ln" x="46" y="166" width="148" height="8" rx="4"/><rect class="dpsb-ln" x="46" y="182" width="148" height="8" rx="4"/><rect class="dpsb-ln" x="46" y="198" width="96" height="8" rx="4"/><circle class="dpsb-gd2" cx="62" cy="246" r="13"/><path class="dpsb-Fpk" d="M62 253C54 248 51 244 52 240.5C53 237 59 237 62 242C65 237 71 237 72 240.5C73 244 70 248 62 253Z"/><path class="dpsb-pk2" d="M176 254.2C162.4 245.7 157.3 238.9 159 232.95C160.7 227 170.9 227 176 235.5C181.1 227 191.3 227 193 232.95C194.7 238.9 189.6 245.7 176 254.2Z"/></g></svg>`;
  var COLORES = { rosa: '', abdu: '', teal: 'dpsb-tl', alba: 'dpsb-tl', oro: 'dpsb-oro', dorado: 'dpsb-oro' };

  function reducido() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function montar(contenedor, opts) {
    if (!contenedor || !contenedor.ownerDocument) throw new Error('DpSobre.montar: falta el contenedor');
    opts = opts || {};
    var doc = contenedor.ownerDocument;
    var remitente = typeof opts.remitente === 'string' ? opts.remitente.trim() : '';
    var color = Object.prototype.hasOwnProperty.call(COLORES, opts.color) ? opts.color : 'rosa';
    var onAbierto = typeof opts.onAbierto === 'function' ? opts.onAbierto : null;
    var onProgreso = typeof opts.onProgreso === 'function' ? opts.onProgreso : null;

    var S = { t: 0, r: 0, o: 0 };
    var estado = 'listo';            // listo | arrastrando | abriendo | abierta | destruido
    var timers = [];
    var x0 = 0, ancho = 320;

    contenedor.textContent = '';
    var wrap = doc.createElement('div');
    wrap.className = 'dpsb-wrap';
    wrap.setAttribute('role', 'group');
    function etiqueta(abierta) {
      return (remitente ? 'Carta de ' + remitente : 'Carta') + (abierta ? ', abierta' : ', sin abrir');
    }
    wrap.setAttribute('aria-label', etiqueta(false));

    var de = doc.createElement('p');
    de.className = 'dpsb-from';
    de.textContent = remitente ? 'Carta de ' + remitente : 'Tienes una carta';

    var env = doc.createElement('div');
    env.className = 'dpsb' + (COLORES[color] ? ' ' + COLORES[color] : '');
    env.setAttribute('data-drag', '0');
    env.innerHTML = SVG;

    var pista = doc.createElement('p');
    pista.className = 'dpsb-hint';
    pista.setAttribute('aria-live', 'polite');
    pista.textContent = 'Desliza para rasgar el sobre';

    var boton = doc.createElement('button');
    boton.type = 'button';
    boton.className = 'dpsb-btn';
    boton.textContent = 'Abrir sin deslizar';

    var capa = doc.createElement('div');
    capa.className = 'dpsb-cfl';
    capa.setAttribute('aria-hidden', 'true');

    wrap.appendChild(de); wrap.appendChild(env); wrap.appendChild(pista); wrap.appendChild(boton); wrap.appendChild(capa);
    contenedor.appendChild(wrap);

    function pintar() {
      env.style.setProperty('--t', String(S.t));
      env.style.setProperty('--r', String(S.r));
      env.style.setProperty('--o', String(S.o));
    }
    pintar();

    function despues(fn, ms) {
      var id = setTimeout(function () {
        var i = timers.indexOf(id); if (i > -1) timers.splice(i, 1);
        if (estado !== 'destruido') fn();
      }, ms);
      timers.push(id);
    }
    function vibrar(p) { try { if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) {} }

    function confeti() {
      if (reducido() || typeof env.animate !== 'function') return;
      var colores = ['dpsb-c0', 'dpsb-c1', 'dpsb-c2', 'dpsb-c3', 'dpsb-c4'];
      for (var i = 0; i < 36; i++) {
        var p = doc.createElement('i');
        p.className = 'dpsb-cf ' + colores[i % colores.length] + (i % 3 === 0 ? ' dpsb-rd' : '');
        capa.appendChild(p);
        var ang = (Math.PI * 2 * i) / 36 + Math.random() * 0.5;
        var f = 70 + Math.random() * 110;
        var dx = Math.cos(ang) * f, dy = Math.sin(ang) * f * 0.8 - 40;
        var rot = (Math.random() * 720 - 360);
        var a = p.animate([
          { opacity: 1, transform: 'translate(0,0) rotate(0deg) scale(.6)' },
          { opacity: 1, transform: 'translate(' + dx * 0.8 + 'px,' + dy + 'px) rotate(' + rot * 0.6 + 'deg) scale(1)', offset: 0.45 },
          { opacity: 0, transform: 'translate(' + dx + 'px,' + (dy + 150 + Math.random() * 90) + 'px) rotate(' + rot + 'deg) scale(.9)' }
        ], { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        a.onfinish = (function (el) { return function () { if (el.parentNode) el.parentNode.removeChild(el); }; })(p);
      }
    }

    function terminar() {
      estado = 'abierta';
      pista.textContent = 'Carta abierta';
      wrap.setAttribute('aria-label', etiqueta(true));
      if (onAbierto) {
        try { onAbierto({ remitente: remitente, color: color }); } catch (e) { if (root.console) root.console.error(e); }
      }
    }

    function abrir() {
      if (estado !== 'listo' && estado !== 'arrastrando') return;
      estado = 'abriendo';
      env.setAttribute('data-drag', '0');
      boton.disabled = true;
      pista.textContent = '';
      if (reducido()) {
        S.t = 1; S.r = 1; S.o = 1; pintar();
        despues(terminar, 250);
        return;
      }
      S.t = 1; pintar(); vibrar(12);
      despues(function () { S.r = 1; pintar(); confeti(); vibrar([10, 30, 10]); }, 350);
      despues(function () { S.o = 1; pintar(); }, 1700);
      despues(terminar, 2250);
    }

    function alBajar(e) {
      if (estado !== 'listo' || (e.button != null && e.button > 0)) return;
      x0 = e.clientX;
      var r = env.getBoundingClientRect();
      ancho = r.width || 320;
      try { env.setPointerCapture(e.pointerId); } catch (x) {}
      estado = 'arrastrando';
      env.setAttribute('data-drag', '1');
    }
    function alMover(e) {
      if (estado !== 'arrastrando') return;
      S.t = clamp(Math.abs(e.clientX - x0) / (ancho * 0.7), 0, 1);
      pintar();
      if (onProgreso) onProgreso(S.t);
    }
    function alSoltar(e) {
      if (estado !== 'arrastrando') return;
      env.setAttribute('data-drag', '0');
      if (e.type === 'pointerup' && S.t >= 0.65) { abrir(); return; }
      estado = 'listo';
      S.t = 0; pintar();
      if (onProgreso) onProgreso(0);
    }
    env.addEventListener('pointerdown', alBajar);
    env.addEventListener('pointermove', alMover);
    env.addEventListener('pointerup', alSoltar);
    env.addEventListener('pointercancel', alSoltar);
    boton.addEventListener('click', abrir);

    function destruir() {
      if (estado === 'destruido') return;
      estado = 'destruido';
      timers.forEach(clearTimeout); timers = [];
      env.removeEventListener('pointerdown', alBajar);
      env.removeEventListener('pointermove', alMover);
      env.removeEventListener('pointerup', alSoltar);
      env.removeEventListener('pointercancel', alSoltar);
      boton.removeEventListener('click', abrir);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    return {
      abrir: abrir,
      destruir: destruir,
      get estado() { return estado; }
    };
  }

  var api = { montar: montar, version: '1.0' };
  root.DpSobre = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
