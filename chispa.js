/* +Dopamina · chispa.js  (extra pequeño: pinta la chispa y lanza la animación de ganar puntos)
   DpChispa.svg({ tam: 16|24|64, borde: true, bloqueada: false, monton: false })  -> string con <svg><use/></svg>
   DpChispa.ganar(contenedor, { cantidad: 10, onFin })  -> sube la chispa, destella y flota «+10» (contenedor con position:relative)
   Necesita el sprite iconos.svg inline en la página y dopamina-art.css. */
(function (root) {
  'use strict';
  var STAGE = `<svg class="dp-ic dp-mn-s64" viewBox="0 0 96 120" aria-hidden="true"><circle class="dp-mn-ring" cx="48" cy="76" r="18"/><g class="dp-mn-p dp-mn-p1"><path class="dp-Fgd" d="M48 71.4Q49.24 74.76 52.6 76Q49.24 77.24 48 80.6Q46.76 77.24 43.4 76Q46.76 74.76 48 71.4Z"/></g><g class="dp-mn-p dp-mn-p2"><path class="dp-Fgd" d="M48 71.4Q49.24 74.76 52.6 76Q49.24 77.24 48 80.6Q46.76 77.24 43.4 76Q46.76 74.76 48 71.4Z"/></g><g class="dp-mn-p dp-mn-p3"><path class="dp-Fgd" d="M48 71.4Q49.24 74.76 52.6 76Q49.24 77.24 48 80.6Q46.76 77.24 43.4 76Q46.76 74.76 48 71.4Z"/></g><g class="dp-mn-p dp-mn-p4"><path class="dp-Fgd" d="M48 71.4Q49.24 74.76 52.6 76Q49.24 77.24 48 80.6Q46.76 77.24 43.4 76Q46.76 74.76 48 71.4Z"/></g><g class="dp-mn-st"><use href="#ic-chispa" x="24" y="52" width="48" height="48"/><use class="dp-mn-fl" href="#ic-chispa-luz" x="24" y="52" width="48" height="48"/></g></svg>`;
  function reducido() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function svg(o) {
    o = o || {};
    var tam = o.tam || 24;
    var clase = tam <= 20 ? 'dp-mn-s16' : (tam <= 40 ? 'dp-mn-s24' : 'dp-mn-s64');
    var id = o.monton ? (o.bloqueada ? 'ic-monton-lock' : 'ic-monton') : (o.bloqueada ? 'ic-chispa-lock' : 'ic-chispa');
    var nom = o.bloqueada ? 'Chispa bloqueada' : (o.monton ? 'Montón de chispas' : 'Chispa');
    return '<svg class="dp-ic ' + clase + (o.borde === false ? ' dp-mn-nb' : '') + '" role="img" aria-label="' + nom + '"><use href="#' + id + '"/></svg>';
  }

  function ganar(contenedor, o) {
    o = o || {};
    var doc = contenedor.ownerDocument;
    var cant = o.cantidad == null ? 10 : o.cantidad;
    var el = doc.createElement('div');
    el.className = 'dp-mn-win';
    el.setAttribute('aria-hidden', 'true');
    el.style.position = 'absolute';
    el.style.left = '50%'; el.style.top = '50%'; el.style.margin = '-96px 0 0 -64px';
    el.style.pointerEvents = 'none';
    el.innerHTML = STAGE + '<span class="dp-mn-num"></span>';
    el.querySelector('.dp-mn-num').textContent = '+' + cant;
    contenedor.appendChild(el);
    void el.offsetWidth;
    el.classList.add('dp-go');
    var fin = function () { if (el.parentNode) el.parentNode.removeChild(el); if (typeof o.onFin === 'function') o.onFin(); };
    setTimeout(fin, reducido() ? 1500 : 1300);
    return el;
  }

  var api = { svg: svg, ganar: ganar };
  root.DpChispa = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
