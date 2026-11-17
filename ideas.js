// ─────────────────────────────────────────────
// Ideas para escribir — el diario sigue teniendo las mismas tres preguntas
// de siempre (cómo me siento / te agradezco / algo que quiero decirte), pero
// cada día se formulan de una manera distinta, hay una "pregunta de hoy" para
// abrir conversación y unas frases para empezar si alguien se queda en blanco.
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
        '¿Qué llevo en la cabeza y en el corazón?',
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
        'Me siento muy cerca de ti cuando…',
        'Una cosa pequeña que me alegró: …'
      ]
    },
    gracias: {
      emoji: '🙏',
      labels: [
        'Te agradezco...',
        'Lo que valoro de ti',
        'Algo que hiciste y me hizo bien',
        'Un detalle tuyo que no quiero olvidar'
      ],
      ideas: [
        'Gracias por cuidarme cuando…',
        'Gracias por hacerme reír con…',
        'Me encantó que…',
        'Te agradezco que me escucharas…',
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
        'Algo que me gustaría que habláramos',
        'Algo que necesito de ti',
        'Algo que quiero proponerte'
      ],
      ideas: [
        'Me gustaría que habláramos de…',
        'Necesito que me ayudes con…',
        'Me dolió un poco que…',
        'Quiero pedirte perdón por…',
        'Hay algo que no te he dicho: …',
        'Me gustaría que hiciéramos más…',
        'Te echo de menos cuando…',
        'Quería proponerte…',
        'Me quedé pensando en…',
        'Un cambio pequeño que me ayudaría: …'
      ]
    },
    hacer: {
      ideas: ['Una escapada a…', 'Cenar en…', 'Ver juntos…', 'Un plan tranquilo: …', 'Probar algo nuevo: …', 'Cocinar juntos…']
    },
    recuerdo: {
      ideas: ['Cuando nos reímos de…', 'Aquel paseo por…', 'El día que…', 'Esa cena en…', 'Aquella vez que…']
    },
    sueno: {
      ideas: ['Algún día viviremos…', 'Quiero que viajemos a…', 'Una meta para este año: …', 'Algo que queremos aprender juntos: …', 'Ahorrar para…']
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
  var CYCLE_MS = 6000;

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
      '.idea-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px}',
      '.idea-chip{border:1px dashed var(--border,rgba(128,128,128,.45));background:transparent;color:var(--text-muted,#888);font:inherit;font-size:12px;line-height:1.25;padding:6px 10px;border-radius:999px;cursor:pointer;text-align:left;animation:idea-in .25s ease both}',
      '.idea-chip:hover,.idea-chip:focus-visible{color:var(--pink-dark,#993556);border-color:var(--pink-dark,#993556)}',
      '.idea-chip:active{transform:scale(.97)}',
      '.idea-more{border:none;background:transparent;color:var(--text-muted,#888);font-size:15px;line-height:1;width:30px;height:30px;border-radius:50%;cursor:pointer;padding:0}',
      '.idea-more:hover,.idea-more:focus-visible{color:var(--pink-dark,#993556)}',
      '.idea-more.is-spin{animation:idea-spin .35s ease}',
      '.person-col.readonly .idea-row,.viewing-full .idea-row{display:none}',
      '.idea-today{display:flex;align-items:center;gap:12px;margin:0 0 14px;padding:10px 14px;border-radius:14px;border:1px dashed var(--border,rgba(128,128,128,.45))}',
      '.idea-today .it-body{flex:1;min-width:0}',
      '.idea-today .it-label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#888)}',
      '.idea-today .it-q{display:block;font-size:14px;line-height:1.35;margin-top:2px}',
      '.idea-today .it-go{flex:none;border:none;background:var(--pink-dark,#993556);color:#fff;font:inherit;font-size:12px;font-weight:600;padding:8px 12px;border-radius:999px;cursor:pointer}',
      '.viewing-full .idea-today{display:none}',
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
      more.textContent = '🔄';
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

  var tarjeta = null;

  function montarPregunta() {
    var cols = document.querySelector('#tab-nueva .cols');
    if (!cols || tarjeta) return;
    tarjeta = document.createElement('div');
    tarjeta.className = 'idea-today';
    tarjeta.innerHTML =
      '<div class="it-body"><span class="it-label">💭 Pregunta de hoy</span><span class="it-q"></span></div>' +
      '<button type="button" class="it-go">Responder</button>';
    cols.parentNode.insertBefore(tarjeta, cols);
    tarjeta.querySelector('.it-go').addEventListener('click', function () {
      var ta = document.getElementById('self_pendiente');
      var q = tarjeta.querySelector('.it-q').textContent;
      if (!ta || ta.disabled || !q) return;
      var marca = '💭 ' + q;
      if (ta.value.indexOf(marca) < 0) insertar(ta, marca, true); else ta.focus();
      if (ta.scrollIntoView) ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
      campos.forEach(function (c) { c.sync(); });
    });
  }

  function aplicarDia(iso) {
    var dia = diaDe(iso);

    // misma pregunta para los dos, con la redacción del día
    ['sentimiento', 'gracias', 'pendiente'].forEach(function (k) {
      var b = BANK[k];
      var texto = b.emoji + ' ' + b.labels[delDia(b.labels.length, dia, hash(k))];
      ['self_', 'partner_'].forEach(function (pre) {
        var ta = document.getElementById(pre + k);
        var lab = ta && ta.parentElement && ta.parentElement.querySelector('label');
        if (lab && lab.textContent !== texto) lab.textContent = texto;
      });
    });

    // pregunta de hoy
    if (tarjeta) {
      var q = PREGUNTAS_DIA[delDia(PREGUNTAS_DIA.length, dia, 4242)];
      var el = tarjeta.querySelector('.it-q');
      if (el.textContent !== q) el.textContent = q;
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
    montarPregunta();

    var fecha = document.getElementById('entry-date');
    var ultima = null;
    function vigilar() {
      var v = fecha ? fecha.value : '';
      if (v !== ultima) { ultima = v; aplicarDia(v); }
      campos.forEach(function (c) { c.sync(); }); // por si la app rellena/vacía los campos
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
