// ─────────────────────────────────────────────
// Buzón de deseos 2.0
//  · Cada deseo tiene tipo (detalle/plan/regalo/otro), tamaño (fácil/semana/especial)
//    y visibilidad: 🔒 sorpresa (solo sale en el sorteo semanal) o 👀 pista
//    (tu pareja lo ve en su tablero).
//  · Estados: pendiente → en marcha (tu pareja se lo apunta) → cumplido.
//  · Pestañas: 🎁 Misión (el sorteo de la semana), 🗂️ Tablero y ➕ Añadir.
//  · Avisos push (sin spoilers) cuando tu pareja coge o cumple uno de tus deseos
//    y cuando le das las gracias. Cumplir un deseo da ✦ a Dopi.
// Datos: parejas/<id>/deseos/<deseo> y parejas/<id>/deseo_semanal/<rol>.
// Compatible con los deseos antiguos (solo texto): salen como sorpresa pendiente
// o cumplida, según tuvieran el campo "cumplido".
// ─────────────────────────────────────────────
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const TIPOS = [
  { id: 'detalle', emoji: '💝', label: 'Detalle' },
  { id: 'plan', emoji: '🗓️', label: 'Plan' },
  { id: 'regalo', emoji: '🎁', label: 'Regalo' },
  { id: 'otro', emoji: '✨', label: 'Otro' }
];
const TAMANOS = [
  { id: 'facil', emoji: '🌱', label: 'Fácil' },
  { id: 'semana', emoji: '🌿', label: 'Esta semana' },
  { id: 'especial', emoji: '🌳', label: 'Especial' }
];
const IDEAS = {
  detalle: ['Que me prepares un café por la mañana', 'Una notita escondida donde la encuentre', 'Que me escuches sin móvil un rato', 'Un abrazo largo al llegar a casa', 'Que me traigas algo rico sin motivo', 'Que me digas algo bonito hoy'],
  plan: ['Una cena rica los dos solos', 'Peli y manta en casa', 'Un paseo sin prisa con helado', 'Una escapada de fin de semana', 'Cocinar algo nuevo juntos', 'Una tarde sin planes, solo nosotros'],
  regalo: ['Unas flores sin motivo', 'Mi dulce favorito', 'Algo hecho a mano', 'Un libro que te haya gustado', 'Una playlist para mí', 'Un detalle pequeño pero pensado'],
  otro: ['Un día sin prisas juntos', 'Un masaje de los buenos', 'Que me cuentes qué es lo que más te gusta de mí', 'Una foto nuestra impresa', 'Que planeemos algo para dentro de un año', 'Que me dejes elegir a mí todo un día']
};
const GRACIAS_EMOJIS = ['😍', '🥰', '💛', '🙏'];
const MAX_CAMBIOS = 1;

let C = null;           // contexto que pasa app.js
let enlazado = false;
const S = {
  wishes: [], draw: null,
  tab: 'mision', vista: 'mios',
  tipo: 'otro', tamano: 'semana', visible: false,
  ideasIdx: 0, graciasId: null, graciasEmoji: '💛', graciasNota: '',
  msg: ''
};

const $ = id => document.getElementById(id);
const esc = s => C.escapeHtml(String(s == null ? '' : s));
const escA = s => C.escapeAttr(String(s == null ? '' : s));
const rol = () => C.role();
const wishesCol = () => collection(C.db, 'parejas', rol().parejaId, 'deseos');
const wishRef = id => doc(C.db, 'parejas', rol().parejaId, 'deseos', id);
const drawRef = () => doc(C.db, 'parejas', rol().parejaId, 'deseo_semanal', rol().role);
const ahora = () => new Date().toISOString();

function estadoDe(w) { return w.estado || (w.cumplido ? 'hecho' : 'pendiente'); }
function tipoDe(w) { return TIPOS.find(t => t.id === w.tipo); }
function tamanoDe(w) { return TAMANOS.find(t => t.id === w.tamano); }
function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function semanaActual() { return C.isoWeekKey(new Date()); }
function drawActual() { return S.draw && S.draw.semana === semanaActual() ? S.draw : null; }
function deseoDelDraw() {
  const d = drawActual();
  return d ? S.wishes.find(w => w.id === d.wishId) || null : null;
}
function mios() { return S.wishes.filter(w => w.autor === rol().role); }
function suyosPendientes() { return S.wishes.filter(w => w.autor === rol().partner && estadoDe(w) === 'pendiente'); }

async function cargar() {
  try {
    const [snap, d] = await Promise.all([getDocs(wishesCol()), getDoc(drawRef())]);
    const lista = [];
    snap.forEach(x => lista.push({ id: x.id, ...x.data() }));
    S.wishes = lista;
    S.draw = d.exists() ? d.data() : null;
    return true;
  } catch (e) {
    return false;
  }
}

// ── Acciones sobre los deseos ──
async function crear() {
  const texto = ($('dw-texto')?.value || '').trim();
  if (!texto) { S.msg = 'Escribe primero el deseo ✍️'; render(); return; }
  await addDoc(wishesCol(), {
    autor: rol().role, texto: texto.slice(0, 280),
    tipo: S.tipo, tamano: S.tamano, visible: !!S.visible,
    estado: 'pendiente', cumplido: false, cumplidoFecha: null,
    creado: ahora()
  });
  S.msg = S.visible ? '✓ Guardado: tu pareja lo verá en su tablero' : '✓ Guardado como sorpresa: solo le saldrá en el sorteo';
  S.tab = 'tablero'; S.vista = 'mios';
}

async function sacarDeseo() {
  const cand = suyosPendientes();
  if (!cand.length || drawActual()) return;
  const w = cand[Math.floor(Math.random() * cand.length)];
  await setDoc(drawRef(), { semana: semanaActual(), wishId: w.id, texto: w.texto, cambios: 0, fecha: ahora() });
}

async function cambiarDeseo() {
  const d = drawActual();
  if (!d || (d.cambios || 0) >= MAX_CAMBIOS) return;
  const actual = deseoDelDraw();
  if (actual && estadoDe(actual) !== 'pendiente') return;
  const cand = suyosPendientes().filter(w => !actual || w.id !== actual.id);
  if (!cand.length) { S.msg = 'No hay más deseos para cambiar por ahora'; return; }
  const w = cand[Math.floor(Math.random() * cand.length)];
  await setDoc(drawRef(), { semana: d.semana, wishId: w.id, texto: w.texto, cambios: (d.cambios || 0) + 1, fecha: ahora() });
}

async function apuntar(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  await setDoc(wishRef(id), { estado: 'enmarcha', cumplido: false, apuntadoPor: rol().role, apuntadoFecha: ahora() }, { merge: true });
  C.enviarPush(w.autor, '+Dopamina', `🎁 ${rol().displayName} ha cogido uno de tus deseos`, 'deseo-apuntado');
}

async function soltar(id) {
  await setDoc(wishRef(id), { estado: 'pendiente', cumplido: false, apuntadoPor: null, apuntadoFecha: null }, { merge: true });
}

async function marcarHecho(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  const yoHago = w.autor !== rol().role;
  await setDoc(wishRef(id), {
    estado: 'hecho', cumplido: true, cumplidoFecha: ahora(),
    hechoPor: yoHago ? rol().role : (w.apuntadoPor || null)
  }, { merge: true });
  if (yoHago) {
    C.enviarPush(w.autor, '+Dopamina', `✅ ${rol().displayName} ha cumplido uno de tus deseos 💛`, 'deseo-hecho');
    C.premio('wishDone');
  }
}

async function borrar(id) { await deleteDoc(wishRef(id)); }

async function cambiarVisibilidad(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  await setDoc(wishRef(id), { visible: !w.visible }, { merge: true });
}

async function agradecer(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  const nota = (S.graciasNota || '').trim().slice(0, 200);
  await setDoc(wishRef(id), { gracias: { emoji: S.graciasEmoji, nota, fecha: ahora() } }, { merge: true });
  if (w.hechoPor && w.hechoPor !== rol().role) {
    C.enviarPush(w.hechoPor, '+Dopamina', `💛 ${rol().displayName} te ha dado las gracias por un deseo`, 'deseo-gracias');
  }
  S.graciasId = null; S.graciasNota = '';
}

// ── Pintado ──
function chipsDeseo(w) {
  const t = tipoDe(w), z = tamanoDe(w);
  const vis = w.visible ? '<span class="dw-chip dw-chip-vis" title="Tu pareja lo ve">👀 Pista</span>' : '<span class="dw-chip dw-chip-sec" title="Solo sale en el sorteo">🔒 Sorpresa</span>';
  return `<div class="dw-chips">${t ? `<span class="dw-chip">${t.emoji} ${t.label}</span>` : ''}${z ? `<span class="dw-chip">${z.emoji} ${z.label}</span>` : ''}${w.autor === rol().role ? vis : ''}</div>`;
}

function htmlGracias(w) {
  const g = w.gracias;
  if (g) {
    return `<div class="dw-gracias">${esc(g.emoji)} ${g.nota ? `<span>“${esc(g.nota)}”</span>` : '<span>Gracias dadas</span>'}</div>`;
  }
  const soyAutor = w.autor === rol().role;
  if (!soyAutor || !w.hechoPor || w.hechoPor === rol().role) return '';
  if (S.graciasId !== w.id) {
    return `<div class="dw-actions"><button class="dw-btn dw-btn-soft" data-act="gracias-abrir" data-id="${escA(w.id)}">💛 Dar las gracias</button></div>`;
  }
  return `<div class="dw-gracias-form">
      <div class="dw-emojis">${GRACIAS_EMOJIS.map(e => `<button type="button" class="dw-emoji${S.graciasEmoji === e ? ' on' : ''}" data-act="gracias-emoji" data-e="${escA(e)}">${e}</button>`).join('')}</div>
      <input id="dw-gracias-nota" type="text" maxlength="200" placeholder="Una notita (opcional)…" value="${escA(S.graciasNota)}" autocomplete="off" />
      <div class="dw-actions"><button class="dw-btn dw-btn-main" data-act="gracias-enviar" data-id="${escA(w.id)}">Enviar</button><button class="dw-btn" data-act="gracias-cancelar">Cancelar</button></div>
    </div>`;
}

function nombreDe(r) { return C.nombre(r) || 'tu pareja'; }

function tarjetaTablero(w, vista) {
  const est = estadoDe(w);
  const soyAutor = w.autor === rol().role;
  const drawId = drawActual()?.wishId;
  const sorteado = !soyAutor && w.id === drawId;
  let cuerpo = '', acciones = '', pie = '';

  // Quien lo escribió no ve el texto de una sorpresa mientras su pareja se encarga de ella
  const ocultar = soyAutor && est === 'enmarcha' && !w.visible;
  cuerpo = ocultar ? '<div class="dw-texto dw-texto-oculto">🎁 Sorpresa en camino…</div>' : `<div class="dw-texto">${esc(w.texto)}</div>`;

  if (est === 'pendiente') {
    if (soyAutor) {
      acciones = `<button class="dw-btn dw-btn-soft" data-act="vis" data-id="${escA(w.id)}" title="Cambiar entre sorpresa y pista">${w.visible ? '🔒 Hacer sorpresa' : '👀 Que lo vea'}</button>
        <button class="dw-btn" data-act="hecho" data-id="${escA(w.id)}">✓ Ya está</button>
        <button class="dw-btn dw-btn-danger" data-act="borrar" data-id="${escA(w.id)}" aria-label="Eliminar">🗑</button>`;
    } else {
      acciones = `<button class="dw-btn dw-btn-main" data-act="apuntar" data-id="${escA(w.id)}">🙋 Me lo apunto</button>`;
    }
  } else if (est === 'enmarcha') {
    const yo = w.apuntadoPor === rol().role;
    const quien = yo ? 'Tú' : nombreDe(w.apuntadoPor);
    pie = `<div class="dw-pie">🏃 ${esc(quien)} ${yo ? 'te encargas' : 'se encarga'}${w.apuntadoFecha ? ' · desde el ' + esc(fechaCorta(w.apuntadoFecha)) : ''}</div>`;
    if (w.apuntadoPor === rol().role) {
      acciones = `<button class="dw-btn dw-btn-main" data-act="hecho" data-id="${escA(w.id)}">✓ Hecho</button>
        <button class="dw-btn" data-act="soltar" data-id="${escA(w.id)}">↩ Soltar</button>`;
    } else if (soyAutor) {
      acciones = `<button class="dw-btn" data-act="hecho" data-id="${escA(w.id)}">✓ Ya está hecho</button>`;
    }
  } else {
    const por = w.hechoPor ? (w.hechoPor === rol().role ? 'Tú' : nombreDe(w.hechoPor)) : '';
    pie = `<div class="dw-pie">✅ ${por ? 'Cumplido por ' + esc(por) + ' · ' : 'Cumplido · '}${esc(fechaCorta(w.cumplidoFecha))}</div>`;
    acciones = '';
  }
  return `<article class="dw-card dw-estado-${est}${sorteado ? ' dw-sorteado' : ''}">
      ${sorteado ? '<div class="dw-tag">🎲 La de esta semana</div>' : ''}
      ${cuerpo}
      ${ocultar ? '' : chipsDeseo(w)}
      ${pie}
      ${est === 'hecho' ? htmlGracias(w) : ''}
      ${acciones ? `<div class="dw-actions">${acciones}</div>` : ''}
    </article>`;
}

function htmlTablero() {
  const soyYo = S.vista === 'mios';
  const partnerNombre = nombreDe(rol().partner);
  let lista;
  let ocultas = 0;
  if (soyYo) {
    lista = mios();
  } else {
    const drawId = drawActual()?.wishId;
    const todos = S.wishes.filter(w => w.autor === rol().partner);
    lista = todos.filter(w => w.visible || w.id === drawId || w.apuntadoPor === rol().role || w.hechoPor === rol().role);
    ocultas = todos.filter(w => estadoDe(w) === 'pendiente' && !w.visible && w.id !== drawId).length;
  }
  const lanes = [
    { id: 'pendiente', titulo: '💭 Ideas' },
    { id: 'enmarcha', titulo: '🏃 En marcha' },
    { id: 'hecho', titulo: '✅ Cumplidos' }
  ];
  const orden = (a, b) => String(b.creado || '').localeCompare(String(a.creado || ''));
  const columnas = lanes.map(l => {
    const items = lista.filter(w => estadoDe(w) === l.id).sort(l.id === 'hecho' ? (a, b) => String(b.cumplidoFecha || '').localeCompare(String(a.cumplidoFecha || '')) : orden);
    let cuerpo = items.map(w => tarjetaTablero(w, S.vista)).join('');
    if (!cuerpo) cuerpo = `<p class="dw-vacio">${l.id === 'pendiente' ? 'Nada por aquí' : l.id === 'enmarcha' ? 'Nada en marcha' : 'Aún no hay cumplidos'}</p>`;
    if (l.id === 'pendiente' && !soyYo && ocultas > 0) {
      cuerpo += `<p class="dw-secretas">🔒 ${ocultas} sorpresa${ocultas === 1 ? '' : 's'} guardada${ocultas === 1 ? '' : 's'}: salen en el sorteo semanal</p>`;
    }
    return `<section class="dw-lane"><h3 class="dw-lane-t">${l.titulo} <span class="dw-count">${items.length}</span></h3>${cuerpo}</section>`;
  }).join('');
  return `<div class="dw-vista">
      <button class="dw-seg${soyYo ? ' on' : ''}" data-act="vista" data-v="mios">Mis deseos</button>
      <button class="dw-seg${!soyYo ? ' on' : ''}" data-act="vista" data-v="suyos">De ${esc(partnerNombre)}</button>
    </div>
    ${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}
    <div class="dw-board">${columnas}</div>`;
}

function htmlMision() {
  const partnerNombre = nombreDe(rol().partner);
  const d = drawActual();
  const hechosPorMi = S.wishes.filter(w => w.hechoPor === rol().role && estadoDe(w) === 'hecho').length;
  const stats = `<p class="dw-stats">Deseos cumplidos por ti: <strong>${hechosPorMi}</strong> 💛</p>`;
  const cand = suyosPendientes();
  let centro = '';
  if (!d) {
    centro = cand.length
      ? `<div class="dw-hero"><div class="dw-hero-emoji">🎲</div><h3>Tu misión de esta semana</h3><p>Saca al azar uno de los deseos de ${esc(partnerNombre)} y hazlo realidad antes del domingo.</p><button class="dw-btn dw-btn-main dw-btn-big" data-act="sacar">Sacar deseo</button></div>`
      : `<div class="dw-hero"><div class="dw-hero-emoji">🌙</div><h3>Sin misión por ahora</h3><p>Cuando ${esc(partnerNombre)} guarde algún deseo podrás sacar uno aquí.</p></div>`;
  } else {
    const w = deseoDelDraw();
    if (!w) {
      centro = `<div class="dw-hero"><div class="dw-hero-emoji">🤷</div><h3>Ese deseo ya no está</h3><p>${esc(partnerNombre)} lo ha quitado. ¡Puedes sacar otro!</p>${cand.length ? '<button class="dw-btn dw-btn-main dw-btn-big" data-act="sacar-otro">Sacar otro</button>' : ''}</div>`;
    } else {
      const est = estadoDe(w);
      const t = tipoDe(w), z = tamanoDe(w);
      const meta = `<div class="dw-chips dw-chips-c">${t ? `<span class="dw-chip">${t.emoji} ${t.label}</span>` : ''}${z ? `<span class="dw-chip">${z.emoji} ${z.label}</span>` : ''}</div>`;
      let acc = '', estado = '';
      if (est === 'pendiente') {
        const quedan = MAX_CAMBIOS - (d.cambios || 0);
        estado = `<p class="dw-hint">Esta semana te toca este deseo de ${esc(partnerNombre)}. ¿Te animas?</p>`;
        acc = `<button class="dw-btn dw-btn-main dw-btn-big" data-act="apuntar" data-id="${escA(w.id)}">🙋 Me lo apunto</button>
          ${quedan > 0 && cand.length > 1 ? `<button class="dw-btn" data-act="cambiar">🔄 Cambiar por otro (${quedan})</button>` : ''}`;
      } else if (est === 'enmarcha') {
        estado = `<p class="dw-hint">🏃 En marcha${w.apuntadoPor === rol().role ? ': ¡a por ello antes del domingo!' : ''}</p>`;
        acc = w.apuntadoPor === rol().role
          ? `<button class="dw-btn dw-btn-main dw-btn-big" data-act="hecho" data-id="${escA(w.id)}">✓ Hecho</button><button class="dw-btn" data-act="soltar" data-id="${escA(w.id)}">↩ Soltar</button>`
          : '';
      } else {
        estado = `<p class="dw-hint">✅ ¡Cumplido! Buen trabajo 💛</p>`;
        if (w.gracias) estado += `<div class="dw-gracias">${esc(w.gracias.emoji)} ${w.gracias.nota ? `<span>“${esc(w.gracias.nota)}”</span>` : ''}</div>`;
      }
      centro = `<div class="dw-hero dw-hero-deseo"><div class="dw-hero-emoji">🎁</div><h3>Misión de la semana</h3><div class="dw-hero-texto">${esc(w.texto)}</div>${meta}${estado}<div class="dw-actions dw-actions-c">${acc}</div></div>`;
    }
  }
  return `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}${centro}${stats}`;
}

function ideasActuales() {
  const pool = IDEAS[S.tipo] || IDEAS.otro;
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool[(S.ideasIdx + i) % pool.length]);
  return out;
}

function htmlAnadir() {
  const tipos = TIPOS.map(t => `<button type="button" class="dw-pick${S.tipo === t.id ? ' on' : ''}" data-act="tipo" data-v="${t.id}">${t.emoji} ${t.label}</button>`).join('');
  const tam = TAMANOS.map(t => `<button type="button" class="dw-pick${S.tamano === t.id ? ' on' : ''}" data-act="tamano" data-v="${t.id}">${t.emoji} ${t.label}</button>`).join('');
  const ideas = ideasActuales().map(t => `<button type="button" class="dw-idea" data-act="idea" data-txt="${escA(t)}">${esc(t)}</button>`).join('');
  return `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}
    <div class="dw-form">
      <label class="dw-label" for="dw-texto">¿Qué te haría ilusión?</label>
      <textarea id="dw-texto" maxlength="280" placeholder="Un plan, un detalle, lo que sea…"></textarea>
      <div class="dw-ideas-row"><span class="dw-sub">Ideas para empezar</span><button type="button" class="dw-more" data-act="idea-more" aria-label="Otras ideas">🔄</button></div>
      <div class="dw-ideas">${ideas}</div>
      <div class="dw-sub">Tipo</div><div class="dw-picks">${tipos}</div>
      <div class="dw-sub">Tamaño</div><div class="dw-picks">${tam}</div>
      <div class="dw-sub">¿Quién lo ve?</div>
      <div class="dw-picks dw-picks-2">
        <button type="button" class="dw-pick${!S.visible ? ' on' : ''}" data-act="vis-form" data-v="0">🔒 Sorpresa<small>Solo le saldrá en el sorteo</small></button>
        <button type="button" class="dw-pick${S.visible ? ' on' : ''}" data-act="vis-form" data-v="1">👀 Pista<small>Lo verá en su tablero</small></button>
      </div>
      <button class="dw-btn dw-btn-main dw-btn-big" data-act="guardar">Guardar deseo</button>
    </div>`;
}

function render() {
  const body = $('dw-body');
  if (!body) return;
  document.querySelectorAll('#deseos-screen .dw-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  // el texto que se está escribiendo no se pierde al repintar
  const previo = $('dw-texto')?.value || '';
  body.innerHTML = S.tab === 'mision' ? htmlMision() : S.tab === 'tablero' ? htmlTablero() : htmlAnadir();
  if (S.tab === 'anadir' && previo) { const t = $('dw-texto'); if (t) t.value = previo; }
  S.msg = '';
}

// ── Insignias y tarjeta de la pestaña Entrada ──
function pintarInsignias() {
  const n = suyosPendientes().length;
  const badge = $('wishes-badge');
  const pill = $('partner-pending-pill');
  if (n > 0) {
    if (badge) { badge.textContent = String(n); badge.style.display = 'flex'; }
    if (pill) { pill.textContent = `🎁 ${nombreDe(rol().partner)} tiene ${n} deseo${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`; pill.style.display = 'inline-flex'; }
  } else {
    if (badge) badge.style.display = 'none';
    if (pill) pill.style.display = 'none';
  }
}

function pintarTarjeta() {
  const card = $('recommendation-card');
  const btn = $('btn-rec-refresh');
  if (!card || !btn) return;
  const d = drawActual();
  const w = deseoDelDraw();
  if (d && w) {
    const est = estadoDe(w);
    $('rec-text').textContent = w.texto;
    $('rec-sub').textContent = est === 'enmarcha' ? '🏃 En marcha: ¡no se te olvide!' : est === 'hecho' ? '✅ Cumplido. Nueva misión el lunes.' : 'Tu misión de esta semana.';
    btn.textContent = 'Abrir misión';
    btn.disabled = false;
    card.style.display = 'flex';
  } else if (!d && suyosPendientes().length) {
    $('rec-text').textContent = 'Tienes una misión nueva esta semana.';
    $('rec-sub').textContent = `Descubre un deseo pendiente de ${nombreDe(rol().partner)}.`;
    btn.textContent = 'Descubrir deseo';
    btn.disabled = false;
    card.style.display = 'flex';
  } else {
    card.style.display = 'none';
  }
}

async function refrescar() {
  if (!C) return;
  if (await cargar()) { pintarInsignias(); pintarTarjeta(); if (!$('deseos-screen')?.hidden) render(); }
}

async function ejecutar(fn) {
  if (S.busy) return; // evita dobles toques mientras se guarda
  S.busy = true;
  try { await fn(); } catch (e) { S.msg = 'No se pudo guardar. Comprueba tu conexión.'; }
  try { await cargar(); } catch (e) { /* se queda con lo que había */ }
  S.busy = false;
  pintarInsignias(); pintarTarjeta();
  render();
}

async function abrir(tab) {
  const scr = $('deseos-screen');
  if (!scr) return;
  if (tab) S.tab = tab;
  scr.hidden = false;
  document.body.classList.add('dw-abierto');
  $('dw-body').innerHTML = '<p class="dw-vacio">Cargando…</p>';
  await cargar();
  pintarInsignias(); pintarTarjeta();
  render();
}

function cerrar() {
  const scr = $('deseos-screen');
  if (scr) scr.hidden = true;
  document.body.classList.remove('dw-abierto');
  S.graciasId = null;
}

function onClick(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  switch (act) {
    case 'tab': S.tab = el.dataset.tab; S.graciasId = null; render(); break;
    case 'vista': S.vista = el.dataset.v; render(); break;
    case 'tipo': S.tipo = el.dataset.v; S.ideasIdx = 0; render(); break;
    case 'tamano': S.tamano = el.dataset.v; render(); break;
    case 'vis-form': S.visible = el.dataset.v === '1'; render(); break;
    case 'idea': {
      const t = $('dw-texto'); if (!t) break;
      t.value = el.dataset.txt; t.focus(); break;
    }
    case 'idea-more': S.ideasIdx = (S.ideasIdx + 3) % (IDEAS[S.tipo] || IDEAS.otro).length; render(); break;
    case 'guardar': ejecutar(crear); break;
    case 'sacar': ejecutar(sacarDeseo); break;
    case 'sacar-otro': ejecutar(async () => { await setDoc(drawRef(), { semana: '', wishId: '', texto: '' }); await cargar(); await sacarDeseo(); }); break;
    case 'cambiar': ejecutar(cambiarDeseo); break;
    case 'apuntar': ejecutar(() => apuntar(id)); break;
    case 'soltar': ejecutar(() => soltar(id)); break;
    case 'hecho': ejecutar(() => marcarHecho(id)); break;
    case 'borrar': ejecutar(() => borrar(id)); break;
    case 'vis': ejecutar(() => cambiarVisibilidad(id)); break;
    case 'gracias-abrir': S.graciasId = id; S.graciasEmoji = '💛'; S.graciasNota = ''; render(); break;
    case 'gracias-emoji': S.graciasNota = $('dw-gracias-nota')?.value || S.graciasNota; S.graciasEmoji = el.dataset.e; render(); break;
    case 'gracias-enviar': S.graciasNota = $('dw-gracias-nota')?.value || ''; ejecutar(() => agradecer(id)); break;
    case 'gracias-cancelar': S.graciasId = null; render(); break;
    case 'cerrar': cerrar(); break;
  }
}

function init(ctx) {
  C = ctx;
  if (enlazado) { refrescar(); return; }
  enlazado = true;
  $('btn-wishes')?.addEventListener('click', () => abrir('mision'));
  $('btn-close-deseos')?.addEventListener('click', cerrar);
  $('deseos-screen')?.addEventListener('click', onClick);
  $('btn-rec-refresh')?.addEventListener('click', async () => {
    if (!C) return;
    if (!drawActual()) { await cargar(); await ejecutar(sacarDeseo); }
    abrir('mision');
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('deseos-screen')?.hidden) cerrar(); });
  refrescar();
}

export const Deseos = { init, abrir, refrescar };
