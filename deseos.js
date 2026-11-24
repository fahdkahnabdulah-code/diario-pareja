// ─────────────────────────────────────────────
// Buzón de deseos 2.0 (con llaves)
//  · Cada deseo tiene tipo (detalle/plan/regalo/otro) y nivel de dificultad (fácil/media/difícil).
//  · Los deseos de tu pareja se ven SIEMPRE bloqueados (texto desenfocado + candado).
//    Cada semana (de lunes a domingo) tienes 1 llave: desbloquea el deseo que elijas
//    y pasa a "en marcha".
//  · Estados: pendiente (bloqueado) → en marcha (desbloqueado) → cumplido.
//    Un cumplido se puede deshacer; un desbloqueo se puede volver a bloquear
//    (devuelve la llave), pero solo una vez por semana.
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
  { id: 'detalle', ic: 'corazon', label: 'Detalle' },
  { id: 'plan', ic: 'calendario', label: 'Plan' },
  { id: 'regalo', ic: 'regalo', label: 'Regalo' },
  { id: 'otro', ic: 'estrella', label: 'Otro' }
];
const TAMANOS = [   // nivel de dificultad (se conservan los ids antiguos)
  { id: 'facil', emoji: '🟢', label: 'Fácil' },
  { id: 'semana', emoji: '🟡', label: 'Media' },
  { id: 'especial', emoji: '🔴', label: 'Difícil' }
];
const IDEAS = {
  detalle: ['Que me prepares un café por la mañana', 'Una notita escondida donde la encuentre', 'Que me escuches sin móvil un rato', 'Un abrazo largo al llegar a casa', 'Que me traigas algo rico sin motivo', 'Que me digas algo bonito hoy'],
  plan: ['Una cena rica los dos solos', 'Peli y manta en casa', 'Un paseo sin prisa con helado', 'Una escapada de fin de semana', 'Cocinar algo nuevo juntos', 'Una tarde sin planes, solo nosotros'],
  regalo: ['Unas flores sin motivo', 'Mi dulce favorito', 'Algo hecho a mano', 'Un libro que te haya gustado', 'Una playlist para mí', 'Un detalle pequeño pero pensado'],
  otro: ['Un día sin prisas juntos', 'Un masaje de los buenos', 'Que me cuentes qué es lo que más te gusta de mí', 'Una foto nuestra impresa', 'Que planeemos algo para dentro de un año', 'Que me dejes elegir a mí todo un día']
};
const GRACIAS_EMOJIS = ['😍', '🥰', '💛', '🙏'];
const LLAVES_SEMANA = 1;  // llaves que se renuevan cada lunes

let C = null;           // contexto que pasa app.js
let enlazado = false;
const S = {
  wishes: [],
  tab: 'deseos',
  tipo: 'otro', tamano: 'semana',
  abiertos: { marcha: true, bloq: true, cumpl: false },
  sinLlaveId: null, soltarId: null,
  ideasIdx: 0, graciasId: null, graciasEmoji: '💛', graciasNota: '',
  confirmId: null, msg: ''
};

const $ = id => document.getElementById(id);
const ICO = (n, sz) => `<svg class="dp-ic dp-lbl-ic" style="--ic:${sz || 16}px" aria-hidden="true"><use href="#ic-${n}"/></svg>`;
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

// ── Llaves: 1 por semana (de lunes a domingo) ──
function llavesTotales() { return LLAVES_SEMANA; }
function llavesUsadas() {
  const sem = semanaActual();
  return suyos().filter(w => w.desbloqueadoPor === rol().role && w.desbloqueadoSemana === sem).length;
}
function llavesLibres() { return Math.max(0, llavesTotales() - llavesUsadas()); }
// Volver a bloquear (y recuperar la llave) solo se puede una vez por semana
function devolucionUsada() {
  const sem = semanaActual();
  return suyos().some(w => w.soltadoPor === rol().role && w.soltadoSemana === sem);
}

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

// Vuelve a bloquear un deseo desbloqueado. Si se había desbloqueado con la llave de esta
// semana, la devuelve (solo una vez por semana).
async function soltar(id) {
  await cargar();
  const w = S.wishes.find(x => x.id === id);
  if (!w || estadoDe(w) !== 'enmarcha' || w.apuntadoPor !== rol().role) return;
  const devuelve = w.desbloqueadoSemana === semanaActual();
  if (devuelve && devolucionUsada()) { S.msg = 'Esta semana ya has recuperado una llave 🔑'; return; }
  const cambios = {
    estado: 'pendiente', cumplido: false,
    apuntadoPor: null, apuntadoFecha: null, desbloqueadoPor: null, desbloqueadoSemana: null
  };
  if (devuelve) { cambios.soltadoPor = rol().role; cambios.soltadoSemana = semanaActual(); }
  await setDoc(wishRef(id), cambios, { merge: true });
  S.soltarId = null;
  S.msg = devuelve ? '🔒 Vuelto a bloquear: tu llave está de nuevo disponible' : '🔒 Vuelto a bloquear';
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
  return `<div class="dw-chips">${t ? `<span class="dw-chip">${ICO(t.ic, 14)}${t.label}</span>` : ''}${z ? `<span class="dw-chip" title="Nivel de dificultad">${z.emoji} Dificultad ${z.label.toLowerCase()}</span>` : ''}</div>`;
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
    return `<div class="dw-confirm"><span>¿Usar tu llave de la semana para verlo?</span>
      <button class="dw-btn dw-btn-main" data-act="desbloquear" data-id="${escA(w.id)}">${ICO('llave')}Sí, desbloquear</button>
      <button class="dw-btn" data-act="confirmar-no">Cancelar</button></div>`;
  }
  // Sin llave el botón sigue ahí: al tocarlo sale un mensaje explicando por qué no se puede
  const sinLlave = S.sinLlaveId === w.id
    ? `<p class="dw-sinllave">${ICO('llave')}Ya has usado tu llave de esta semana. Tendrás una nueva el lunes.</p>` : '';
  return `${sinLlave}<button class="dw-btn ${llavesLibres() > 0 ? 'dw-btn-main' : 'dw-btn-off'}" data-act="candado" data-id="${escA(w.id)}">${ICO('llave')}Desbloquear</button>`;
}

function botonesSoltar(w) {
  const devuelve = w.desbloqueadoSemana === semanaActual();
  if (S.soltarId === w.id) {
    return `<div class="dw-confirm"><span>${devuelve
      ? '¿Volver a bloquearlo y recuperar la llave? Solo puedes hacerlo una vez por semana.'
      : '¿Volver a bloquearlo? (Este desbloqueo es de otra semana: no recuperas llave.)'}</span>
      <button class="dw-btn dw-btn-main" data-act="soltar-si" data-id="${escA(w.id)}">↩ Sí, volver a bloquear</button>
      <button class="dw-btn" data-act="soltar-no">Cancelar</button></div>`;
  }
  const bloqueado = devuelve && devolucionUsada();
  return `<button class="dw-btn${bloqueado ? ' dw-btn-off' : ''}" data-act="${bloqueado ? 'soltar-ya' : 'soltar-pedir'}" data-id="${escA(w.id)}">↩ Volver a bloquear</button>
    ${S.sinLlaveId === 'soltar-' + w.id ? '<p class="dw-sinllave">Esta semana ya has recuperado una llave. Podrás volver a hacerlo la semana que viene.</p>' : ''}`;
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
    cuerpo = `<div class="dw-lockwrap" data-act="candado" data-id="${escA(w.id)}"><div class="dw-texto dw-blur" aria-hidden="true">${esc(textoBloqueado(w))}</div><div class="dw-lockicon" role="img" aria-label="Deseo bloqueado">🔒</div></div>`;
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
      acciones = `<button class="dw-btn dw-btn-main" data-act="hecho" data-id="${escA(w.id)}">✓ Hecho</button>${botonesSoltar(w)}`;
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
      ${bloqueada && w.creado ? `<div class="dw-pie">📅 Añadido el ${esc(fechaCorta(w.creado))}</div>` : ''}
      ${est === 'hecho' ? htmlGracias(w) : ''}
      ${acciones ? `<div class="dw-actions">${acciones}</div>` : ''}
    </article>`;
}

const porFecha = (campo) => (a, b) => String(b[campo] || '').localeCompare(String(a[campo] || ''));

// Orden en que se fueron añadiendo (los más antiguos primero)
const porAntiguedad = (a, b) => String(a.creado || '9999').localeCompare(String(b.creado || '9999'));

// Pestaña "De <pareja>": tu llave, lo que tienes en marcha, lo bloqueado y lo ya cumplido
function htmlDeseos() {
  const partnerNombre = nombreDe(rol().partner);
  const libres = llavesLibres();
  const lista = suyos();
  const bloqueados = lista.filter(w => estadoDe(w) === 'pendiente').sort(porAntiguedad);
  const enMarcha = misEnMarcha().sort(porFecha('apuntadoFecha'));
  const cumplidos = lista.filter(w => estadoDe(w) === 'hecho' && w.hechoPor === rol().role).sort(porFecha('cumplidoFecha'));

  const llaves = `<div class="dw-llaves${libres > 0 ? '' : ' dw-llaves-0'}">
      <div class="dw-llaves-n"><span class="dw-llave${libres > 0 ? ' on' : ''}">${ICO('llave', 34)}</span></div>
      <div class="dw-llaves-t">${libres > 0
        ? `Tienes <strong>1 llave</strong> esta semana: elige qué deseo de ${esc(partnerNombre)} desbloquear.`
        : 'Ya has usado tu llave de esta semana. Tendrás una nueva el lunes.'}</div>
    </div>`;

  const sec = (k, titulo, items) => `<details class="dw-det"${S.abiertos[k] ? ' open' : ''}><summary data-act="sec" data-k="${k}">${titulo} <span class="dw-count">${items.length}</span></summary>${items.map(tarjeta).join('')}</details>`;
  let html = `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}${llaves}`;
  if (enMarcha.length) html += sec('marcha', '🔓 En marcha', enMarcha);
  if (bloqueados.length) {
    html += sec('bloq', '🔒 Por desbloquear', bloqueados);
  } else if (!enMarcha.length) {
    html += `<div class="dw-hero"><div class="dw-hero-emoji">${ICO('candado', 48)}</div><h3>Nada por desbloquear</h3><p>Cuando ${esc(partnerNombre)} guarde deseos aparecerán aquí, bloqueados.</p></div>`;
  }
  if (cumplidos.length) html += sec('cumpl', '✅ Cumplidos por ti', cumplidos);
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
    : `<div class="dw-hero"><div class="dw-hero-emoji">${ICO('pluma', 48)}</div><h3>Aún no has escrito deseos</h3><p>Añade uno y ${esc(nombreDe(rol().partner))} lo verá bloqueado hasta que use una llave.</p><button class="dw-btn dw-btn-main" data-act="tab" data-tab="anadir">➕ Añadir deseo</button></div>`;
  return `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}${resumen}${cuerpo}`;
}

function ideasActuales() {
  const pool = IDEAS[S.tipo] || IDEAS.otro;
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool[(S.ideasIdx + i) % pool.length]);
  return out;
}

function htmlAnadir() {
  const tipos = TIPOS.map(t => `<button type="button" class="dw-pick${S.tipo === t.id ? ' on' : ''}" data-act="tipo" data-v="${t.id}">${ICO(t.ic, 16)}${t.label}</button>`).join('');
  const tam = TAMANOS.map(t => `<button type="button" class="dw-pick${S.tamano === t.id ? ' on' : ''}" data-act="tamano" data-v="${t.id}">${t.emoji} ${t.label}</button>`).join('');
  const ideas = ideasActuales().map(t => `<button type="button" class="dw-idea" data-act="idea" data-txt="${escA(t)}">${esc(t)}</button>`).join('');
  return `${S.msg ? `<p class="dw-msg">${esc(S.msg)}</p>` : ''}
    <div class="dw-form">
      <label class="dw-label" for="dw-texto">¿Qué te haría ilusión?</label>
      <textarea id="dw-texto" maxlength="280" placeholder="Un plan, un detalle, lo que sea…"></textarea>
      <div class="dw-ideas-row"><span class="dw-sub">Ideas para empezar</span><button type="button" class="dw-more" data-act="idea-more" aria-label="Otras ideas"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/></svg></button></div>
      <div class="dw-ideas">${ideas}</div>
      <div class="dw-sub">Tipo</div><div class="dw-picks">${tipos}</div>
      <div class="dw-sub">Nivel de dificultad</div><div class="dw-picks">${tam}</div>
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
  if (tabDeseos) tabDeseos.innerHTML = '<svg class="dp-ic dp-lbl-ic" style="--ic:15px" aria-hidden="true"><use href="#ic-corazon"/></svg>De ' + esc(nombreDe(rol().partner));
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
      pill.innerHTML = libres > 0
        ? `${ICO('llave', 14)}${libres} llave${libres === 1 ? '' : 's'} para desbloquear un deseo`
        : `${ICO('candado', 14)}${esc(nombreDe(rol().partner))} tiene ${n} deseo${n === 1 ? '' : 's'} por desbloquear`;
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
    if (label) label.innerHTML = ICO('llave') + 'Llave de deseos';
    $('rec-text').textContent = `Tienes ${libres} llave${libres === 1 ? '' : 's'} para desbloquear un deseo.`;
    $('rec-sub').textContent = `${nombreDe(rol().partner)} tiene ${n} esperándote, bloqueado${n === 1 ? '' : 's'}.`;
    btn.textContent = 'Elegir deseo';
    btn.disabled = false;
    card.style.display = 'flex';
  } else if (marcha > 0) {
    if (label) label.innerHTML = ICO('llave') + 'Deseo en marcha';
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
    case 'tab': S.tab = el.dataset.tab; S.graciasId = null; S.confirmId = null; S.sinLlaveId = null; S.soltarId = null; render(); break;
    case 'tipo': S.tipo = el.dataset.v; S.ideasIdx = 0; render(); break;
    case 'tamano': S.tamano = el.dataset.v; render(); break;
    case 'idea': {
      const t = $('dw-texto'); if (!t) break;
      t.value = el.dataset.txt; t.focus(); break;
    }
    case 'idea-more': S.ideasIdx = (S.ideasIdx + 3) % (IDEAS[S.tipo] || IDEAS.otro).length; render(); break;
    case 'guardar': ejecutar(crear); break;
    case 'candado':
      if (llavesLibres() > 0) { S.confirmId = id; S.sinLlaveId = null; } else { S.sinLlaveId = id; S.confirmId = null; }
      render(); break;
    case 'confirmar': S.confirmId = id; render(); break;
    case 'sec': ev.preventDefault(); S.abiertos[el.dataset.k] = !S.abiertos[el.dataset.k]; render(); break;
    case 'soltar-pedir': S.soltarId = id; render(); break;
    case 'soltar-no': S.soltarId = null; render(); break;
    case 'soltar-ya': S.sinLlaveId = 'soltar-' + id; render(); break;
    case 'soltar-si': ejecutar(() => soltar(id)); break;
    case 'confirmar-no': S.confirmId = null; render(); break;
    case 'desbloquear': ejecutar(() => desbloquear(id)); break;
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
