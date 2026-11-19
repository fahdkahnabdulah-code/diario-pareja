// ─────────────────────────────────────────────
// Buzón de deseos 2.0 (con llaves)
//  · Cada deseo tiene tipo (detalle/plan/regalo/otro) y tamaño (fácil/semana/especial).
//  · Los deseos de tu pareja se ven SIEMPRE bloqueados (texto desenfocado + candado).
//    Cada semana tienes llaves (1 desde el lunes, 2 desde el jueves): una llave
//    desbloquea el deseo que elijas y pasa a "en marcha".
//  · Estados: pendiente (bloqueado) → en marcha (desbloqueado) → cumplido.
//    Un cumplido se puede deshacer; un desbloqueo se puede volver a bloquear
//    (devuelve la llave).
//  · Pestañas: 💝 De <pareja> (llaves y bloqueados), 📝 Míos (estado de los míos) y ➕ Añadir.
//  · Avisos push sin spoilers; cumplir un deseo da ✦ a Dopi.
// Datos: parejas/<id>/deseos/<deseo>. Las llaves se calculan a partir de los
// deseos (desbloqueadoPor + desbloqueadoSemana), no hay otro documento.
// Compatible con los deseos antiguos (solo texto, o con "visible"/"cumplido").
// ─────────────────────────────────────────────
import {
  collection, doc, getDocs, setDoc, addDoc, deleteDoc
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
const LLAVES_LUNES = 1;   // llaves disponibles desde el lunes
const LLAVES_JUEVES = 2;  // llaves en total desde el jueves

let C = null;           // contexto que pasa app.js
let enlazado = false;
const S = {
  wishes: [],
  tab: 'deseos',
  tipo: 'otro', tamano: 'semana',
  ideasIdx: 0, graciasId: null, graciasEmoji: '💛', graciasNota: '',
  confirmId: null, msg: ''
};

const $ = id => document.getElementById(id);
const esc = s => C.escapeHtml(String(s == null ? '' : s));
const escA = s => C.escapeAttr(String(s == null ? '' : s));
const rol = () => C.role();
const wishesCol = () => collection(C.db, 'parejas', rol().parejaId, 'deseos');
const wishRef = id => doc(C.db, 'parejas', rol().parejaId, 'deseos', id);
const ahora = () => new Date().toISOString();

function estadoDe(w) { return w.estado || (w.cumplido ? 'hecho' : 'pendiente'); }
function tipoDe(w) { return TIPOS.find(t => t.id === w.tipo); }
function tamanoDe(w) { return TAMANOS.find(t => t.id === w.tamano); }
function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function semanaActual() { return C.isoWeekKey(new Date()); }
function mios() { return S.wishes.filter(w => w.autor === rol().role); }
function suyos() { return S.wishes.filter(w => w.autor === rol().partner); }
function suyosPendientes() { return suyos().filter(w => estadoDe(w) === 'pendiente'); }
function misEnMarcha() { return suyos().filter(w => estadoDe(w) === 'enmarcha' && w.apuntadoPor === rol().role); }

// ── Llaves: 1 desde el lunes, 2 desde el jueves (semana de lunes a domingo) ──
function llavesTotales(fecha = new Date()) {
  const dia = (fecha.getDay() + 6) % 7; // 0 = lunes
  return dia >= 3 ? LLAVES_JUEVES : LLAVES_LUNES;
}
function llavesUsadas() {
  const sem = semanaActual();
  return suyos().filter(w => w.desbloqueadoPor === rol().role && w.desbloqueadoSemana === sem).length;
}
function llavesLibres() { return Math.max(0, llavesTotales() - llavesUsadas()); }

async function cargar() {
  try {
    const snap = await getDocs(wishesCol());
    const lista = [];
    snap.forEach(x => lista.push({ id: x.id, ...x.data() }));
    S.wishes = lista;
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
    tipo: S.tipo, tamano: S.tamano,
    estado: 'pendiente', cumplido: false, cumplidoFecha: null,
    creado: ahora()
  });
  S.msg = '✓ Guardado: tu pareja lo verá bloqueado hasta que use una llave';
  S.tab = 'mios';
}

async function desbloquear(id) {
  await cargar();
  const w = S.wishes.find(x => x.id === id);
  if (!w || estadoDe(w) !== 'pendiente' || w.autor === rol().role) return;
  if (llavesLibres() < 1) { S.msg = 'No te quedan llaves esta semana 🔑'; return; }
  await setDoc(wishRef(id), {
    estado: 'enmarcha', cumplido: false,
    apuntadoPor: rol().role, apuntadoFecha: ahora(),
    desbloqueadoPor: rol().role, desbloqueadoSemana: semanaActual()
  }, { merge: true });
  S.confirmId = null;
  S.msg = '🔓 Desbloqueado. ¡Ya puedes verlo!';
  C.enviarPush(w.autor, '+Dopamina', `🔑 ${rol().displayName} ha desbloqueado uno de tus deseos`, 'deseo-apuntado');
}

// Vuelve a bloquear un deseo desbloqueado (devuelve la llave)
async function soltar(id) {
  await setDoc(wishRef(id), {
    estado: 'pendiente', cumplido: false,
    apuntadoPor: null, apuntadoFecha: null, desbloqueadoPor: null, desbloqueadoSemana: null
  }, { merge: true });
  S.msg = '🔒 Vuelto a bloquear: tu llave está de nuevo disponible';
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

// Deshace un "hecho" marcado sin querer
async function deshacerHecho(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  await setDoc(wishRef(id), {
    estado: w.apuntadoPor ? 'enmarcha' : 'pendiente',
    cumplido: false, cumplidoFecha: null, hechoPor: null, gracias: null
  }, { merge: true });
  S.msg = '↩ Deshecho: vuelve a estar pendiente';
}

async function borrar(id) { await deleteDoc(wishRef(id)); }


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
  if (!t && !z) return '';
  return `<div class="dw-chips">${t ? `<span class="dw-chip">${t.emoji} ${t.label}</span>` : ''}${z ? `<span class="dw-chip">${z.emoji} ${z.label}</span>` : ''}</div>`;
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

// Texto de relleno para el deseo bloqueado: así el texto real no está en la página
const RELLENO = 'Un deseo muy bonito que te hará mucha ilusión cumplir esta semana con todo el cariño';
function textoBloqueado(w) {
  const n = Math.max(40, Math.min(RELLENO.length, String(w.texto || '').length));
  return RELLENO.slice(0, n);
}

function botonesDesbloqueo(w) {
  if (S.confirmId === w.id) {
    return `<div class="dw-confirm"><span>¿Usar 1 llave para verlo?</span>
      <button class="dw-btn dw-btn-main" data-act="desbloquear" data-id="${escA(w.id)}">🔓 Sí, desbloquear</button>
      <button class="dw-btn" data-act="confirmar-no">Cancelar</button></div>`;
  }
  // Sin llaves no se muestra botón: el aviso de arriba ya lo explica
  return llavesLibres() > 0
    ? `<button class="dw-btn dw-btn-main" data-act="confirmar" data-id="${escA(w.id)}">🔑 Desbloquear</button>`
    : '';
}

function pastilla(clase, html) { return `<div class="dw-estado-pill dw-pill-${clase}">${html}</div>`; }

// Tarjeta de un deseo. Sirve para los de tu pareja (bloqueados / en marcha / cumplidos)
// y para los tuyos (con el estado en que los tiene tu pareja).
function tarjeta(w) {
  const est = estadoDe(w);
  const soyAutor = w.autor === rol().role;
  const otroNombre = nombreDe(rol().partner);
  let cuerpo = '', acciones = '', pill = '';
  let bloqueada = false;

  if (!soyAutor && est === 'pendiente') {
    bloqueada = true;
    cuerpo = `<div class="dw-lockwrap"><div class="dw-texto dw-blur" aria-hidden="true">${esc(textoBloqueado(w))}</div><div class="dw-lockicon" role="img" aria-label="Deseo bloqueado">🔒</div></div>`;
  } else {
    cuerpo = `<div class="dw-texto">${esc(w.texto)}</div>`;
  }

  if (est === 'pendiente') {
    if (soyAutor) {
      pill = pastilla('pendiente', `🔒 Sin revelar · ${esc(otroNombre)} aún no lo ha desbloqueado`);
      acciones = `<button class="dw-btn" data-act="hecho" data-id="${escA(w.id)}">✓ Ya está</button>
        <button class="dw-btn dw-btn-danger" data-act="borrar" data-id="${escA(w.id)}" aria-label="Eliminar">🗑</button>`;
    } else {
      acciones = botonesDesbloqueo(w);
    }
  } else if (est === 'enmarcha') {
    const yo = w.apuntadoPor === rol().role;
    const desde = w.apuntadoFecha ? ' · desde el ' + esc(fechaCorta(w.apuntadoFecha)) : '';
    if (yo) {
      pill = pastilla('enmarcha', `🔓 Desbloqueado por ti${desde}`);
      acciones = `<button class="dw-btn dw-btn-main" data-act="hecho" data-id="${escA(w.id)}">✓ Hecho</button>
        <button class="dw-btn" data-act="soltar" data-id="${escA(w.id)}" title="Vuelve a bloquearlo y recupera la llave">↩ Volver a bloquear</button>`;
    } else {
      pill = pastilla('enmarcha', `🔓 ${esc(nombreDe(w.apuntadoPor))} lo está preparando${desde}`);
      if (soyAutor) acciones = `<button class="dw-btn" data-act="hecho" data-id="${escA(w.id)}">✓ Ya está hecho</button>`;
    }
  } else {
    const por = w.hechoPor ? (w.hechoPor === rol().role ? 'ti' : nombreDe(w.hechoPor)) : '';
    pill = pastilla('hecho', `✅ Cumplido${por ? ' por ' + esc(por) : ''} · ${esc(fechaCorta(w.cumplidoFecha))}`);
    if (soyAutor || w.hechoPor === rol().role) {
      acciones = `<button class="dw-btn" data-act="deshacer" data-id="${escA(w.id)}" title="Si lo marcaste sin querer">↩ Deshacer</button>`;
    }
  }
  return `<article class="dw-card dw-estado-${est}${bloqueada ? ' dw-bloqueada' : ''}">
      ${pill}
      ${cuerpo}
      ${chipsDeseo(w)}
      ${est === 'hecho' ? htmlGracias(w) : ''}
      ${acciones ? `<div class="dw-actions">${acciones}</div>` : ''}
    </article>`;
}

const porFecha = (campo) => (a, b) => String(b[campo] || '').localeCompare(String(a[campo] || ''));

// Pestaña "De <pareja>": tus llaves, lo que tienes en marcha, lo bloqueado y lo ya cumplido
function htmlDeseos() {
  const partnerNombre = nombreDe(rol().partner);
  const libres = llavesLibres(), total = llavesTotales();
  const lista = suyos();
  const bloqueados = lista.filter(w => estadoDe(w) === 'pendiente').sort(porFecha('creado'));
  const enMarcha = misEnMarcha().sort(porFecha('apuntadoFecha'));
  const cumplidos = lista.filter(w => estadoDe(w) === 'hecho' && w.hechoPor === rol().role).sort(porFecha('cumplidoFecha'));

  const llaves = `<div class="dw-llaves${libres > 0 ? '' : ' dw-llaves-0'}">
      <div class="dw-llaves-n">${Array.from({ length: LLAVES_JUEVES }, (_, i) => `<span class="dw-llave${i < libres ? ' on' : ''}">🔑</span>`).join('')}</div>
      <div class="dw-llaves-t">${libres > 0
        ? `Tienes <strong>${libres}</strong> llave${libres === 1 ? '' : 's'}: elige qué deseo de ${esc(partnerNombre)} desbloquear.`
        : (total < LLAVES_JUEVES ? 'Ya has usado tu llave. Tienes otra desde el jueves.' : 'Ya has usado tus llaves. Tendrás nuevas el lunes.')}</div>
    </div>`;

  const sec = (t, n, items) => `<h3 class="dw-sec">${t} <span class="dw-count">${n}</span></h3>${items.map(tarjeta).join('')}`;
  let html = `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}${llaves}`;
  if (enMarcha.length) html += sec('🔓 En marcha', enMarcha.length, enMarcha);
  if (bloqueados.length) {
    html += sec('🔒 Por desbloquear', bloqueados.length, bloqueados);
  } else if (!enMarcha.length) {
    html += `<div class="dw-hero"><div class="dw-hero-emoji">🌙</div><h3>Nada por desbloquear</h3><p>Cuando ${esc(partnerNombre)} guarde deseos aparecerán aquí, bloqueados.</p></div>`;
  }
  if (cumplidos.length) {
    html += `<details class="dw-det"><summary>✅ Cumplidos por ti <span class="dw-count">${cumplidos.length}</span></summary>${cumplidos.map(tarjeta).join('')}</details>`;
  }
  return html;
}

// Pestaña "Míos": mis deseos en una lista, con el estado en que los tiene mi pareja
function htmlMios() {
  const orden = { enmarcha: 0, pendiente: 1, hecho: 2 };
  const lista = mios().sort((a, b) => {
    const d = orden[estadoDe(a)] - orden[estadoDe(b)];
    if (d) return d;
    return estadoDe(a) === 'hecho' ? porFecha('cumplidoFecha')(a, b) : porFecha('creado')(a, b);
  });
  const n = k => lista.filter(w => estadoDe(w) === k).length;
  const resumen = lista.length
    ? `<p class="dw-resumen">🔓 ${n('enmarcha')} en marcha · 🔒 ${n('pendiente')} sin revelar · ✅ ${n('hecho')} cumplidos</p>`
    : '';
  const cuerpo = lista.length
    ? lista.map(tarjeta).join('')
    : `<div class="dw-hero"><div class="dw-hero-emoji">✍️</div><h3>Aún no has escrito deseos</h3><p>Añade uno y ${esc(nombreDe(rol().partner))} lo verá bloqueado hasta que use una llave.</p><button class="dw-btn dw-btn-main" data-act="tab" data-tab="anadir">➕ Añadir deseo</button></div>`;
  return `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}${resumen}${cuerpo}`;
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
      <p class="dw-hint-form">🔒 ${esc(nombreDe(rol().partner))} lo verá bloqueado y borroso hasta que use una llave para desbloquearlo.</p>
      <button class="dw-btn dw-btn-main dw-btn-big" data-act="guardar">Guardar deseo</button>
    </div>`;
}

function render() {
  const body = $('dw-body');
  if (!body) return;
  document.querySelectorAll('#deseos-screen .dw-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  // el texto que se está escribiendo no se pierde al repintar
  const previo = $('dw-texto')?.value || '';
  const tabDeseos = document.querySelector('#deseos-screen .dw-tab[data-tab="deseos"]');
  if (tabDeseos) tabDeseos.textContent = `💝 De ${nombreDe(rol().partner)}`;
  body.innerHTML = S.tab === 'deseos' ? htmlDeseos() : S.tab === 'mios' ? htmlMios() : htmlAnadir();
  if (S.tab === 'anadir' && previo) { const t = $('dw-texto'); if (t) t.value = previo; }
  S.msg = '';
}

// ── Insignias y tarjeta de la pestaña Entrada ──
function pintarInsignias() {
  const n = suyosPendientes().length;
  const libres = llavesLibres();
  const badge = $('wishes-badge');
  const pill = $('partner-pending-pill');
  if (n > 0 && libres > 0) {
    if (badge) { badge.textContent = String(libres); badge.style.display = 'flex'; }
  } else if (badge) badge.style.display = 'none';
  if (pill) {
    if (n > 0) {
      pill.textContent = libres > 0
        ? `🔑 ${libres} llave${libres === 1 ? '' : 's'} para desbloquear un deseo`
        : `🔒 ${nombreDe(rol().partner)} tiene ${n} deseo${n === 1 ? '' : 's'} por desbloquear`;
      pill.style.display = 'inline-flex';
    } else pill.style.display = 'none';
  }
}

function pintarTarjeta() {
  const card = $('recommendation-card');
  const btn = $('btn-rec-refresh');
  if (!card || !btn) return;
  const label = card.querySelector('.rec-label');
  const libres = llavesLibres(), n = suyosPendientes().length, marcha = misEnMarcha().length;
  if (libres > 0 && n > 0) {
    if (label) label.textContent = '🔑 Llave de deseos';
    $('rec-text').textContent = `Tienes ${libres} llave${libres === 1 ? '' : 's'} para desbloquear un deseo.`;
    $('rec-sub').textContent = `${nombreDe(rol().partner)} tiene ${n} esperándote, bloqueado${n === 1 ? '' : 's'}.`;
    btn.textContent = 'Elegir deseo';
    btn.disabled = false;
    card.style.display = 'flex';
  } else if (marcha > 0) {
    if (label) label.textContent = '🔓 Deseo en marcha';
    $('rec-text').textContent = marcha === 1 ? 'Tienes un deseo por cumplir.' : `Tienes ${marcha} deseos por cumplir.`;
    $('rec-sub').textContent = 'Cuando lo hagas, márcalo como hecho.';
    btn.textContent = 'Abrir deseos';
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
    case 'tab': S.tab = el.dataset.tab; S.graciasId = null; S.confirmId = null; render(); break;
    case 'tipo': S.tipo = el.dataset.v; S.ideasIdx = 0; render(); break;
    case 'tamano': S.tamano = el.dataset.v; render(); break;
    case 'idea': {
      const t = $('dw-texto'); if (!t) break;
      t.value = el.dataset.txt; t.focus(); break;
    }
    case 'idea-more': S.ideasIdx = (S.ideasIdx + 3) % (IDEAS[S.tipo] || IDEAS.otro).length; render(); break;
    case 'guardar': ejecutar(crear); break;
    case 'confirmar': S.confirmId = id; render(); break;
    case 'confirmar-no': S.confirmId = null; render(); break;
    case 'desbloquear': ejecutar(() => desbloquear(id)); break;
    case 'soltar': ejecutar(() => soltar(id)); break;
    case 'hecho': ejecutar(() => marcarHecho(id)); break;
    case 'deshacer': ejecutar(() => deshacerHecho(id)); break;
    case 'borrar': ejecutar(() => borrar(id)); break;
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
  $('btn-wishes')?.addEventListener('click', () => abrir('deseos'));
  $('btn-close-deseos')?.addEventListener('click', cerrar);
  $('deseos-screen')?.addEventListener('click', onClick);
  $('btn-rec-refresh')?.addEventListener('click', () => abrir('deseos'));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('deseos-screen')?.hidden) cerrar(); });
  refrescar();
}

export const Deseos = { init, abrir, refrescar };
