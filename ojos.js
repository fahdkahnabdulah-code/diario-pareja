/* +Dopamina · ojos.js (PROPUESTA)
   Anima los grupos con id de los SVG de Dopi (dopi/*.svg, fases 3 a 10). El SVG debe ir INLINE en la página.
   API (global DopiOjos):
     DopiOjos.mirar(svg, gx, gy, ms)     pupila y brillos; gx, gy entre -1 y 1 (0,0 = centro)
     DopiOjos.cerrar(svg, c, ms)         párpados: c 0 = abiertos, 1 = cerrados (los dos ojos)
     DopiOjos.cerrarOjo(svg, 'i'|'d', c, ms)   un solo ojo (guiño)
     DopiOjos.parpadear(svg)             cierra y abre en ~240 ms
     DopiOjos.boca(svg, 'feliz')         feliz, abierta, o, o-grande, neutra, triste, gato, lado, onda, miedo, bostezo, mastica
     DopiOjos.ceja(svg, 'i'|'d', dy, grados)   desplaza/gira la ceja respecto a su posición de reposo
     DopiOjos.seguir(svg, zona)          la pupila sigue el puntero/dedo dentro de `zona` (por defecto, document); devuelve stop()
     DopiOjos.vida(svg)                  parpadeo aleatorio cada 2,5–6 s; devuelve stop() */
(function (g) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(svg, id) { return svg.querySelector('#' + id); }
  function dur(ms) { return reduce ? 0 : (ms == null ? 120 : ms); }
  function mover(el, x, y, ms) {
    if (!el) return;
    el.style.transition = ms ? 'transform ' + ms + 'ms ease-out' : 'none';
    el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function datos(svg, lado) {
    var o = $(svg, 'ojo-' + lado);
    if (!o) return null;
    return { mx: +o.getAttribute('data-mx'), my: +o.getAttribute('data-my'), ry: +o.getAttribute('data-ry') };
  }
  function mirar(svg, gx, gy, ms) {
    gx = Math.max(-1, Math.min(1, gx || 0)); gy = Math.max(-1, Math.min(1, gy || 0));
    ['i', 'd'].forEach(function (l) {
      var d = datos(svg, l); if (!d) return;
      mover($(svg, 'pupila-' + l), +(gx * d.mx).toFixed(2), +(gy * d.my).toFixed(2), dur(ms));
    });
  }
  function cerrarOjo(svg, lado, c, ms) {
    var d = datos(svg, lado); if (!d) return;
    c = Math.max(0, Math.min(1, c));
    var far = d.ry + 5, m = d.ry * 0.1;
    mover($(svg, 'parpado-sup-' + lado), 0, +(-far + c * (m + far)).toFixed(2), dur(ms));
    mover($(svg, 'parpado-inf-' + lado), 0, +(far - c * (far - m)).toFixed(2), dur(ms));
  }
  function cerrar(svg, c, ms) { cerrarOjo(svg, 'i', c, ms); cerrarOjo(svg, 'd', c, ms); }
  function parpadear(svg) {
    cerrar(svg, 1, 110);
    setTimeout(function () { cerrar(svg, 0, 130); }, reduce ? 0 : 140);
  }
  function boca(svg, nombre) {
    var b = $(svg, 'boca'); if (!b) return;
    Array.prototype.forEach.call(b.children, function (n) {
      if (n.id && n.id.indexOf('boca-') === 0) n.setAttribute('display', n.id === 'boca-' + nombre ? 'inline' : 'none');
    });
  }
  function ceja(svg, lado, dy, grados) {
    var c = $(svg, 'ceja-' + lado); if (!c) return;
    if (!c.__base) {
      var m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(c.getAttribute('transform') || '');
      c.__base = m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
    }
    var b = c.__base;
    c.setAttribute('transform', 'translate(' + b[0] + ' ' + (b[1] + (dy || 0)) + ') rotate(' + (b[2] + (grados || 0)) + ')');
  }
  function seguir(svg, zona) {
    zona = zona || document;
    function f(e) {
      var r = svg.getBoundingClientRect();
      var gx = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.5);
      var gy = (e.clientY - (r.top + r.height * 0.6)) / (r.height * 0.5);
      mirar(svg, gx, gy, 80);
    }
    zona.addEventListener('pointermove', f);
    return function stop() { zona.removeEventListener('pointermove', f); mirar(svg, 0, 0, 200); };
  }
  function vida(svg) {
    var t, vivo = true;
    (function sig() {
      t = setTimeout(function () { if (!vivo) return; parpadear(svg); sig(); }, 2500 + Math.random() * 3500);
    })();
    return function stop() { vivo = false; clearTimeout(t); };
  }
  g.DopiOjos = { mirar: mirar, cerrar: cerrar, cerrarOjo: cerrarOjo, parpadear: parpadear, boca: boca, ceja: ceja, seguir: seguir, vida: vida };
})(window);
