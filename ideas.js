// ─────────────────────────────────────────────
// Ideas para escribir — el diario sigue teniendo las mismas tres preguntas
// de siempre (cómo me siento / te agradezco / algo que quiero decirte), pero
// cada día se formulan de una manera distinta, la "pregunta del día" (apartado
// propio, con su campo de respuesta) abre conversación, hay unas frases para
// empezar si alguien se queda en blanco y la sección "Juntos" solo se abre 1–2
// días por semana (al azar pero espaciados, igual para los dos).
// Todo se elige a partir de la fecha de la entrada: los dos ven lo mismo, y
// no se guarda nada nuevo. Independiente de app.js.
// ─────────────────────────────────────────────
(function () {
  'use strict';

  // Misma intención, distinto enunciado (el primero es el original)
  var BANK = {
    sentimiento: {
      emoji: '🌤️',
      labels: [
        '¿Cómo me siento?',
        '¿Cómo ha ido mi día?',
        '¿Cómo estoy de verdad?',
        '¿Qué llevo en la cabeza?',
        '¿Con qué energía llego hoy?'
      ],
      ideas: [
        'Me siento en calma porque…',
        'Tengo la cabeza llena de…',
        'Lo que más me ha pesado es…',
        'Lo mejor de mi semana fue…',
        'Me ha hecho ilusión…',
        'Me noto con ganas de…',
        'Me preocupa un poco…',
        'Me ha costado…',
        'Me ha sorprendido…',
        'Necesito descansar de…',
        'Me siento cerca de ti cuando…',
        'Algo que me alegró: …'
      ]
    },
    gracias: {
      emoji: '🙏',
      labels: [
        'Te agradezco...',
        'Lo que valoro de ti',
        'Algo que hiciste y me hizo bien',
        'Un detalle tuyo que valoro'
      ],
      ideas: [
        'Gracias por cuidarme cuando…',
        'Gracias por hacerme reír con…',
        'Me encantó que…',
        'Gracias por escucharme…',
        'Gracias por tu paciencia con…',
        'Valoro mucho que…',
        'Gracias por ese detalle de…',
        'Me hizo bien que…',
        'Gracias por estar cuando…',
        'Gracias por acordarte de…'
      ]
    },
    pendiente: {
      emoji: '💬',
      labels: [
        'Algo que quiero decirte',
        'Algo que quiero hablar contigo',
        'Algo que necesito de ti',
        'Algo que quiero proponerte'
      ],
      ideas: [
        'Quiero que hablemos de…',
        'Necesito que me ayudes con…',
        'Me dolió un poco que…',
        'Quiero pedirte perdón por…',
        'Aún no te he contado…',
        'Me gustaría que hiciéramos…',
        'Te echo de menos cuando…',
        'Quería proponerte…',
        'Me quedé pensando en…',
        'Me ayudaría que…'
      ]
    },
    hacer: {
      ideas: ['Una escapada a…', 'Cenar en…', 'Ver juntos…', 'Un plan tranquilo: …', 'Probar algo nuevo: …', 'Cocinar juntos…']
    },
    recuerdo: {
      ideas: ['Cuando nos reímos de…', 'Aquel paseo por…', 'El día que…', 'Esa cena en…', 'Aquella vez que…']
    },
    sueno: {
      ideas: ['Algún día viviremos…', 'Quiero que viajemos a…', 'Una meta para este año: …', 'Aprender algo juntos: …', 'Ahorrar para…']
    },
    logro: {
      ideas: ['Qué orgullo que hayamos…', 'Lo conseguimos: …', 'Un paso pequeño que dimos: …', 'Superamos…', 'Me enorgullece que…']
    }
  };

  // Una sola pregunta al día, pensada para abrir conversación entre los dos
  var PREGUNTAS_DIA = [
    '¿Qué fue lo mejor de tu día y qué fue lo peor?',
    '¿Hay algo que te gustaría que hiciera más a menudo?',
    '¿Qué te hizo sonreír hoy?',
    '¿En qué momento de esta semana te sentiste más cerca de mí?',
    '¿Qué necesitas de mí ahora mismo?',
    '¿Qué plan pequeño te haría ilusión esta semana?',
    '¿Hay algo que te ronda la cabeza y todavía no me has contado?',
    '¿Qué detalle mío te sentó bien últimamente?',
    '¿Qué es lo que más te gusta de cómo estamos ahora?',
    '¿Qué te gustaría mejorar en nosotros este mes?',
    '¿Qué recuerdo nuestro te viene hoy a la cabeza?',
    '¿Qué te preocupa y en qué podría ayudarte?',
    '¿Qué cosa nueva te gustaría que probáramos juntos?',
    '¿Cómo ha estado tu energía esta semana y qué la ha movido?',
    '¿Qué te gustaría que supiera de ti que quizá no sé?',
    '¿Qué te hizo sentir orgullo esta semana?',
    '¿Cuál es tu momento favorito del día conmigo?',
    '¿Hay algo que quieras agradecerme y se me haya pasado?',
    '¿Qué te haría el día de mañana más fácil?',
    '¿Qué canción o película te recuerda a nosotros ahora mismo?',
    '¿Prefieres un finde de calma o de aventura?',
    '¿Qué sueño pequeño tienes para este mes?',
    '¿Cuándo sientes que te escucho de verdad?',
    '¿Qué te gustaría preguntarme que aún no me has preguntado?'
  ];

  var CHIPS_PROPIOS = 2;
  var CYCLE_MS = 20000;

  // ── Selección determinista por día (igual para los dos, sin repetir en un ciclo) ──
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function perm(n, seed) {
    var a = [], i, r = rng(seed);
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function hash(s) {
    var h = 7;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  // elemento del día: recorre todos antes de repetir y nunca repite de un día al siguiente
  function delDia(n, dia, sal) {
    var ciclo = Math.floor(dia / n), pos = dia % n;
    var o = perm(n, ciclo * 7919 + sal);
    if (ciclo > 0) { // el primero del ciclo nunca coincide con el último del anterior
      var anterior = perm(n, (ciclo - 1) * 7919 + sal)[n - 1];
      if (o[0] === anterior) { var t = o[0]; o[0] = o[1]; o[1] = t; }
    }
    return o[pos];
  }
  function diaDe(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    var d;
    if (p) d = Date.UTC(+p[1], +p[2] - 1, +p[3]);
    else { var n = new Date(); d = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); }
    return Math.floor(d / 86400000);
  }

  function injectCss() {
    var css = [
      '.idea-row{display:grid;grid-template-columns:minmax(0,1fr) 32px;align-items:center;gap:6px 4px;margin-top:8px}',
      '.idea-chip{grid-column:1;box-sizing:border-box;width:100%;min-height:34px;border:1px dashed var(--border,rgba(128,128,128,.45));background:transparent;color:var(--text-muted,#888);font:inherit;font-size:13px;line-height:1.2;padding:0 12px;border-radius:10px;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:idea-in .25s ease both}',
      '.idea-chip:hover,.idea-chip:focus-visible{color:var(--pink-dark,#993556);border-color:var(--pink-dark,#993556)}',
      '.idea-chip:active{transform:scale(.98)}',
      '.idea-more{grid-column:2;grid-row:1 / span 2;justify-self:center;border:none;background:transparent;color:var(--text-muted,#888);font-size:15px;line-height:1;width:32px;height:32px;border-radius:50%;cursor:pointer;padding:0}',
      '.idea-more:hover,.idea-more:focus-visible{color:var(--pink-dark,#993556)}',
      '.idea-more.is-spin{animation:idea-spin .35s ease}',
      '.person-col.readonly .idea-row,.viewing-full .idea-row{display:none}',
      '#tab-nueva .person-col label,#tab-nueva .shared-section label{font-size:14px;font-weight:600}',
      '#tab-nueva textarea::placeholder{font-size:14px}',
      '#tab-nueva:not(.viewing-full) .cols{grid-template-columns:1fr}',
      '@keyframes idea-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}',
      '@keyframes idea-spin{to{transform:rotate(360deg)}}',
      '@media (prefers-reduced-motion:reduce){.idea-chip,.idea-more.is-spin{animation:none}}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'ideas-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function otras(pool, n, evitar) {
    var libres = pool.filter(function (x) { return evitar.indexOf(x) < 0; });
    if (libres.length < n) libres = pool.slice();
    var out = [];
    while (out.length < n && libres.length) {
      out.push(libres.splice(Math.floor(Math.random() * libres.length), 1)[0]);
    }
    return out;
  }

  function insertar(ta, texto, salto) {
    if (!ta || ta.disabled || ta.readOnly) return;
    var v = ta.value.replace(/\s+$/, '');
    ta.value = (v ? v + '\n' : '') + texto + (salto ? '\n' : '');
    ta.focus();
    var n = ta.value.length;
    try { ta.setSelectionRange(n, n); } catch (e) {}
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  var campos = []; // { ta, row, ideas, idx, ... }

  function montarCampo(ta, ideas, nChips, conChips) {
    if (!ta || ta.dataset.ideas === '1') return;
    ta.dataset.ideas = '1';
    var c = { ta: ta, ideas: ideas, row: null, idx: 0 };
    campos.push(c);

    if (conChips) {
      var row = document.createElement('div');
      row.className = 'idea-row';
      var mostradas = [];
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'idea-more';
      more.title = 'Otras ideas';
      more.setAttribute('aria-label', 'Otras ideas');
      more.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/></svg>';
      row.appendChild(more);

      var pintar = function (lista) {
        mostradas = lista;
        row.querySelectorAll('.idea-chip').forEach(function (x) { x.remove(); });
        lista.forEach(function (txt) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'idea-chip';
          b.textContent = txt;
          b.addEventListener('click', function () {
            insertar(ta, txt, false);
            c.sync();
          });
          row.insertBefore(b, more);
        });
      };
      c.reponer = function (dia) {
        var sal = hash(ta.id);
        pintar(perm(ideas.length, dia * 131 + sal).slice(0, nChips).map(function (i) { return ideas[i]; }));
      };
      more.addEventListener('click', function () {
        more.classList.remove('is-spin');
        void more.offsetWidth;
        more.classList.add('is-spin');
        pintar(otras(ideas, nChips, mostradas));
      });
      ta.insertAdjacentElement('afterend', row);
      c.row = row;
    }

    // las frases solo se ofrecen mientras el campo está vacío
    c.sync = function () { if (c.row) c.row.style.display = ta.value ? 'none' : ''; };
    ta.addEventListener('input', c.sync);
    c.sync();
  }

  // ── Juntos: 1–2 días por semana, al azar pero espaciados (igual para los dos) ──
  // Misma lógica que netlify/functions/juntos-notifier.js (que manda el aviso).
  function semanaDe(dia) { return Math.floor((dia + 3) / 7); } // semanas de lunes a domingo
  function diasJuntosSemana(semana) {
    var r = rng(semana * 7919 + 1234);
    if (r() < 0.5) return [1 + Math.floor(r() * 4)];                       // 1 día: martes–viernes
    return [Math.floor(r() * 3), 4 + Math.floor(r() * 2)];                  // 2 días: lunes–miércoles y viernes–sábado
  }
  function esDiaJuntos(dia) {
    return diasJuntosSemana(semanaDe(dia)).indexOf((dia + 3) % 7) >= 0;
  }
  function proximoJuntos(dia) {
    for (var i = 1; i <= 14; i++) if (esDiaJuntos(dia + i)) return dia + i;
    return dia + 7;
  }
  function nombreDia(dia) {
    var d = new Date(dia * 86400000);
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return dias[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + meses[d.getUTCMonth()];
  }
  window.Juntos = { esDia: function (iso) { return esDiaJuntos(diaDe(iso)); } };

  function aplicarJuntos(iso) {
    var sec = document.getElementById('shared-section');
    var aviso = document.getElementById('juntos-aviso');
    if (!sec || !aviso) return;
    var dia = diaDe(iso);
    var conTexto = ['hacer', 'recuerdo', 'sueno', 'logro'].some(function (k) {
      var t = document.getElementById('shared_' + k);
      return t && t.value.trim();
    });
    var toca = esDiaJuntos(dia);
    var estado = (toca || conTexto) ? 'abierto' : 'cerrado';
    var texto = toca
      ? '✨ Hoy toca «Juntos»: planes, recuerdos y sueños para los dos.'
      : (conTexto ? '' : '🔒 «Juntos» se abre 1–2 días por semana. La próxima vez: ' + nombreDia(proximoJuntos(dia)) + '.');
    // al ver una entrada ya cerrada, "Juntos" solo se enseña si tenía algo escrito
    var tab = document.getElementById('tab-nueva');
    sec.hidden = !!(tab && tab.classList.contains('viewing-full')) && !conTexto;
    if (sec.dataset.estado !== estado) sec.dataset.estado = estado;
    if (aviso.textContent !== texto) aviso.textContent = texto;
    aviso.hidden = !texto;
  }

  function aplicarDia(iso) {
    var dia = diaDe(iso);

    // misma pregunta para los dos, con la redacción del día
    ['sentimiento', 'gracias', 'pendiente'].forEach(function (k) {
      var b = BANK[k];
      var texto = b.labels[delDia(b.labels.length, dia, hash(k))];
      ['self_', 'partner_'].forEach(function (pre) {
        var ta = document.getElementById(pre + k);
        var lab = ta && ta.parentElement && ta.parentElement.querySelector('label');
        var t = lab && lab.querySelector('.dp-lbl-t');
        if (t && t.textContent !== texto) t.textContent = texto;
      });
    });

    // pregunta del día (si la entrada ya tiene la suya guardada, app.js la fija y aquí no se toca)
    var pq = document.getElementById('pd-question');
    var psec = document.getElementById('pregunta-section');
    if (pq && psec && !pq.dataset.fija) {
      var q = PREGUNTAS_DIA[delDia(PREGUNTAS_DIA.length, dia, 4242)];
      if (pq.textContent !== q) pq.textContent = q;
      psec.hidden = false;
    }

    // frases del día (si se tocó 🔄 se mantienen las que salieron hasta cambiar de fecha)
    campos.forEach(function (c) {
      if (c.reponer) c.reponer(dia);
      c.idx = delDia(c.ideas.length, dia, hash(c.ta.id));
      if (!c.ta.value && document.activeElement !== c.ta && c.ta.id.indexOf('partner_') !== 0) {
        c.ta.placeholder = c.ideas[c.idx];
      }
      c.sync();
    });
  }

  function init() {
    injectCss();
    ['sentimiento', 'gracias', 'pendiente'].forEach(function (k) {
      montarCampo(document.getElementById('self_' + k), BANK[k].ideas, CHIPS_PROPIOS, true);
    });
    ['hacer', 'recuerdo', 'sueno', 'logro'].forEach(function (k) {
      // en "Juntos" solo rota el texto de ayuda, sin botones, para no recargar
      montarCampo(document.getElementById('shared_' + k), BANK[k].ideas, 0, false);
    });

    var fecha = document.getElementById('entry-date');
    var ultima = null;
    function vigilar() {
      var v = fecha ? fecha.value : '';
      if (v !== ultima) { ultima = v; aplicarDia(v); }
      campos.forEach(function (c) { c.sync(); }); // por si la app rellena/vacía los campos
      aplicarJuntos(v);
      // la pregunta del día puede quedar libre otra vez (al volver a escribir hoy)
      var pq2 = document.getElementById('pd-question');
      if (pq2 && !pq2.dataset.fija && !pq2.textContent) aplicarDia(v);
    }
    vigilar();
    setInterval(vigilar, 800);

    // el texto de ayuda va cambiando mientras el campo está vacío
    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducido) {
      setInterval(function () {
        campos.forEach(function (c) {
          if (c.ta.value || document.activeElement === c.ta || c.ta.disabled) return;
          c.idx = (c.idx + 1) % c.ideas.length;
          c.ta.placeholder = c.ideas[c.idx];
        });
      }, CYCLE_MS);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
