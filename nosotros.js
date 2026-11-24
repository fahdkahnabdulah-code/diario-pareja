// ─────────────────────────────────────────────
// Nosotros: lista de cosas por hacer juntos, planes a futuro, cartas cerradas y logros.
//  · Lista y Planes comparten colección: parejas/<id>/planes/<plan>
//      { texto, autor, tipo: 'hacer'|'futuro', categoria, horizonte, estado: 'pendiente'|'hecho',
//        hechoPor, hechoFecha, creado }
//  · Cartas: parejas/<id>/cartas/<carta>
//      { de, para, titulo, texto, creado, abiertaEn }   (el texto solo se enseña al abrir el sobre)
//  · Logros: parejas/<id>/logros/<logroId>
//      { fecha, por, puntos, visto_fahd, visto_cilia }  (se crea una sola vez; suma ✦ a Dopi)
//  · Contadores: parejas/<id>/nosotros/stats  { pokes_<rol>, dia10_<rol> }
// El arte (iconos, insignias, sobre, chispa) viene de dopamina-art.css, logros.js, sobre.js y chispa.js.
// ─────────────────────────────────────────────
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, updateDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CATEGORIAS = [
  { id: 'viaje', icono: 'viaje', label: 'Viaje' },
  { id: 'cita', icono: 'cita', label: 'Cita' },
  { id: 'hogar', icono: 'hogar', label: 'Hogar' },
  { id: 'regalo', icono: 'regalo', label: 'Regalo' },
  { id: 'otro', icono: 'estrella', label: 'Otro' }
];
const HORIZONTES = [
  { id: 'ano', label: 'Este año' },
  { id: 'proximos', label: 'Próximos años' },
  { id: 'algun', label: 'Algún día' }
];
const MAX_CARTA = 2500;
// Pelis y series (dentro de Lista): se guardan en la misma colección 'planes' con tipo 'pelis'
//   { texto: título, tipo: 'pelis', formato: 'peli'|'serie', plataforma, autor, estado, hechoFecha, creado, nota_fahd, nota_cilia }
const FORMATOS = [
  { id: 'peli', label: 'Película', icono: ['clapper', 'foto'] },
  { id: 'serie', label: 'Serie', icono: ['tv', 'lista'] }
];
const PLATAFORMAS = ['Netflix', 'HBO Max', 'Disney+', 'Prime Video', 'Apple TV+', 'Cine', 'Otra'];

let C = null;
let enlazado = false;
const S = {
  sub: 'lista', lista: 'cosas', formato: 'peli', plat: '',
  q: '', res: [], sel: null, sinClave: false, buscando: false, detId: null,
  planes: [], cartas: [], logros: {},
  cat: 'otro', horizonte: 'proximos',
  borrarId: null, redactando: false, msg: '',
  abiertos: { vistas: false, hechasLista: false, hechasPlanes: false, enviadas: true, archivo: true },
  cargado: false,
  pospuesta: false,          // "Más tarde" del pop-up: hasta la próxima vez que se abra la app
  cola: [],                  // logros por celebrar
  celebrando: false
};
let evaluando = false;
let cacheDatos = null, cacheAt = 0;

const $ = id => document.getElementById(id);
const esc = s => C.escapeHtml(String(s == null ? '' : s));
const rol = () => C.role();
const col = nombre => collection(C.db, 'parejas', rol().parejaId, nombre);
const ref = (nombre, id) => doc(C.db, 'parejas', rol().parejaId, nombre, id);
const ahora = () => new Date().toISOString();
const nombreDe = r => C.nombre(r) || 'tu pareja';
const icOr = (nombres, s) => ic([].concat(nombres).find(n => document.getElementById('ic-' + n)) || [].concat(nombres).slice(-1)[0], s);
const ic = (n, s) => `<svg class="dp-ic"${s ? ` style="--ic:${s}px"` : ''} aria-hidden="true"><use href="#ic-${n}"/></svg>`;
const chispa = n => `<span class="nos-pts">${n}${window.DpChispa ? DpChispa.svg({ tam: 16, borde: false }) : '✦'}</span>`;
function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function fechaLarga(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
function catDe(id) { return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1]; }
const ordenarPorCreado = (a, b) => String(a.creado || '').localeCompare(String(b.creado || ''));

// ─────────────────────────────────────────────
// Carga
// ─────────────────────────────────────────────
async function cargar() {
  if (!rol()) return;
  try {
    const [p, c, l] = await Promise.all([getDocs(col('planes')), getDocs(col('cartas')), getDocs(col('logros'))]);
    S.planes = []; p.forEach(d => S.planes.push({ id: d.id, ...d.data() }));
    S.cartas = []; c.forEach(d => S.cartas.push({ id: d.id, ...d.data() }));
    S.logros = {}; l.forEach(d => { S.logros[d.id] = d.data(); });
    S.cargado = true;
  } catch (e) { console.warn('Nosotros: no se pudo cargar', e); }
}
async function refrescar() {
  await cargar();
  pintarPuntos();
  if ($('tab-nosotros')?.classList.contains('active')) render();
}

// ─────────────────────────────────────────────
// Planes (lista + planes a futuro)
// ─────────────────────────────────────────────
const planesDe = tipo => S.planes.filter(p => (p.tipo || 'hacer') === tipo);
const deLista = () => S.planes.filter(p => p.tipo !== 'pelis');
const estaHecho = p => p.estado === 'hecho';

async function crearPlan(tipo) {
  const inp = $('nos-texto');
  const texto = (inp?.value || '').trim();
  if (!texto) { S.msg = 'Escribe primero qué os apetece.'; return render(); }
  const plan = {
    texto: texto.slice(0, 160), autor: rol().role, tipo, categoria: S.cat,
    estado: 'pendiente', creado: ahora()
  };
  if (tipo === 'futuro') plan.horizonte = S.horizonte;
  try {
    const r = await addDoc(col('planes'), plan);
    S.planes.push({ id: r.id, ...plan });
    S.msg = ''; if (inp) inp.value = '';
    C.enviarPush(rol().partner, '+Dopamina', `${rol().displayName} ha añadido algo a vuestra lista juntos`, 'plan-nuevo');
  } catch (e) { S.msg = 'No se pudo guardar. Inténtalo de nuevo.'; }
  render();
  evaluar();
}
async function alternarPlan(id) {
  const p = S.planes.find(x => x.id === id); if (!p) return;
  const hecho = !estaHecho(p);
  const cambios = hecho
    ? { estado: 'hecho', hechoPor: rol().role, hechoFecha: ahora() }
    : { estado: 'pendiente', hechoPor: '', hechoFecha: '' };
  Object.assign(p, cambios);
  render();
  try { await updateDoc(ref('planes', id), cambios); } catch (e) { await refrescar(); return; }
  if (hecho && p.tipo !== 'pelis') {
    C.enviarPush(rol().partner, '+Dopamina', `Habéis cumplido algo de vuestra lista: ${p.texto.slice(0, 60)}`, 'plan-hecho');
    evaluar();
  }
}
async function borrarPlan(id) {
  S.planes = S.planes.filter(p => p.id !== id); S.borrarId = null; render();
  try { await deleteDoc(ref('planes', id)); } catch (e) { await refrescar(); }
}

function filaPlan(p) {
  const hecho = estaHecho(p), c = catDe(p.categoria);
  const meta = [nombreDe(p.autor), hecho ? 'cumplido ' + fechaCorta(p.hechoFecha) : fechaCorta(p.creado)];
  if (p.tipo === 'futuro' && p.horizonte) meta.unshift(HORIZONTES.find(h => h.id === p.horizonte)?.label || '');
  const confirmar = S.borrarId === p.id;
  return `<li class="nos-item ${hecho ? 'is-hecho' : ''} ${p.autor === rol().role ? 'es-mio' : 'es-suyo'}">
    <button type="button" class="nos-check" data-act="toggle" data-id="${esc(p.id)}" aria-pressed="${hecho}" aria-label="${hecho ? 'Desmarcar' : 'Marcar como cumplido'}">${hecho ? ic('check', 18) : ''}</button>
    <span class="nos-item-ic">${ic(c.icono, 22)}</span>
    <span class="nos-item-main"><span class="nos-item-t">${esc(p.texto)}</span><span class="nos-item-m">${esc(meta.filter(Boolean).join(' · '))}</span></span>
    ${confirmar
      ? `<span class="nos-conf"><button type="button" class="nos-mini nos-mini-no" data-act="borrar-no">No</button><button type="button" class="nos-mini nos-mini-si" data-act="borrar-si" data-id="${esc(p.id)}">Borrar</button></span>`
      : `<button type="button" class="nos-del" data-act="borrar-pedir" data-id="${esc(p.id)}" aria-label="Borrar">${ic('cerrar', 14)}</button>`}
  </li>`;
}
function formPlan(tipo) {
  const chips = CATEGORIAS.map(c => `<button type="button" class="nos-chip ${S.cat === c.id ? 'on' : ''}" data-act="cat" data-v="${c.id}">${ic(c.icono, 18)}<span>${c.label}</span></button>`).join('');
  const hor = tipo === 'futuro'
    ? `<div class="nos-chips nos-chips-h">${HORIZONTES.map(h => `<button type="button" class="nos-chip nos-chip-txt ${S.horizonte === h.id ? 'on' : ''}" data-act="hor" data-v="${h.id}">${h.label}</button>`).join('')}</div>` : '';
  const ph = tipo === 'futuro' ? 'Un plan a futuro: ver la aurora boreal…' : 'Algo por hacer juntos: ver el atardecer en…';
  return `<div class="nos-form">
    <div class="nos-row"><input id="nos-texto" type="text" maxlength="160" placeholder="${ph}" autocomplete="off" /><button type="button" class="btn-primary nos-add" data-act="${tipo === 'futuro' ? 'crear-futuro' : 'crear-hacer'}">Añadir</button></div>
    <div class="nos-chips">${chips}</div>${hor}
    ${S.msg ? `<p class="nos-msg">${esc(S.msg)}</p>` : ''}
  </div>`;
}
function seccionHechas(lista, clave, titulo) {
  if (!lista.length) return '';
  const abierto = S.abiertos[clave];
  return `<details class="nos-det" ${abierto ? 'open' : ''}><summary data-act="sec" data-k="${clave}">${titulo} <span class="nos-cnt">${lista.length}</span></summary><ul class="nos-list">${lista.map(filaPlan).join('')}</ul></details>`;
}
function selectorLista() {
  const b = (id, t) => `<button type="button" class="nos-seg-b ${S.lista === id ? 'on' : ''}" data-act="lista" data-v="${id}">${t}</button>`;
  return `<div class="nos-seg" role="tablist">${b('cosas', 'Por hacer')}${b('pelis', 'Pelis y series')}</div>`;
}
// ── Pelis y series ──
const pelisPend = () => planesDe('pelis').filter(p => !estaHecho(p)).sort(ordenarPorCreado);
const pelisVistas = () => planesDe('pelis').filter(estaHecho).sort((a, b) => String(b.hechoFecha || '').localeCompare(String(a.hechoFecha || '')));
const formatoDe = id => FORMATOS.find(f => f.id === id) || FORMATOS[0];

// ── Buscador de pelis y series (función de Netlify «peli-search»; la clave de TMDB vive allí) ──
const PLAT_ALIAS = [[/netflix/i, 'Netflix'], [/\bmax\b|hbo/i, 'HBO Max'], [/disney/i, 'Disney+'], [/prime/i, 'Prime Video'], [/apple/i, 'Apple TV+']];
const platDe = lista => { for (const n of lista || []) for (const [re, v] of PLAT_ALIAS) if (re.test(n)) return v; return ''; };
const coma = n => Number(n).toFixed(1).replace('.', ',');
const duracionTxt = (m, tv) => !m ? '' : tv ? `${m} min/ep` : (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`);
const estrellaNota = n => n ? `<span class="nos-nota"><svg class="dp-ic" style="--ic:14px" aria-hidden="true"><use href="#ic-estrella"/></svg>${coma(n)}</span>` : '';
const imgPoster = (u, cls) => u ? `<img class="${cls}" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
const metaFicha = f => [f.tipo === 'tv' ? 'Serie' : 'Película', f.anio, duracionTxt(f.duracion, f.tipo === 'tv'), f.temporadas ? f.temporadas + (f.temporadas === 1 ? ' temporada' : ' temporadas') : ''].filter(Boolean).join(' · ');
let seqBusca = 0, tBusca = null;
function htmlRes() {
  if (S.sel) return '';
  if (S.buscando && !S.res.length) return '<div class="nos-res"><p class="nos-res-m">Buscando…</p></div>';
  if (!S.res.length) return S.q.length >= 2 && S.msgBusca ? `<div class="nos-res"><p class="nos-res-m">${esc(S.msgBusca)}</p></div>` : '';
  return `<div class="nos-res" role="listbox">${S.res.map((f, i) => `<button type="button" class="nos-res-i" data-act="elegir" data-i="${i}" role="option">
    ${imgPoster(f.poster, 'nos-res-img') || `<span class="nos-res-img nos-res-ph">${icOr(f.tipo === 'tv' ? ['tv', 'lista'] : ['clapper', 'foto'], 22)}</span>`}
    <span class="nos-res-t"><b>${esc(f.titulo)}</b><small>${esc([f.tipo === 'tv' ? 'Serie' : 'Película', f.anio].filter(Boolean).join(' · '))} ${estrellaNota(f.nota)}</small></span></button>`).join('')}
    ${S.sinClave ? '<p class="nos-res-m">Búsqueda básica: solo series. Para pelis hay que activar TMDB en Netlify.</p>' : ''}</div>`;
}
function htmlSel() {
  const f = S.sel; if (!f) return '';
  const plat = (f.plataformas || []).length ? `<div class="nos-sel-pl"><span>Dónde verla</span>${f.plataformas.map(p => `<i>${esc(p)}</i>`).join('')}</div>` : '';
  return `<div class="nos-sel">${imgPoster(f.poster, 'nos-sel-img')}
    <div class="nos-sel-main"><b class="nos-sel-t">${esc(f.titulo)}</b>
      <span class="nos-sel-m">${esc(metaFicha(f))} ${estrellaNota(f.nota)}</span>
      ${(f.generos || []).length ? `<span class="nos-sel-g">${esc(f.generos.join(' · '))}</span>` : ''}
      ${f.sinopsis ? `<p class="nos-sel-s">${esc(f.sinopsis)}</p>` : ''}${plat}</div>
    <button type="button" class="nos-del" data-act="quitar-sel" aria-label="Quitar selección">${ic('cerrar', 14)}</button></div>`;
}
function pintarBusca() {
  const a = $('nos-sel'), b = $('nos-res');
  if (a) a.innerHTML = htmlSel();
  if (b) b.innerHTML = htmlRes();
}
async function buscar(q) {
  const mi = ++seqBusca;
  S.buscando = true; S.msgBusca = ''; pintarBusca();
  try {
    const r = await fetch('/.netlify/functions/peli-search?q=' + encodeURIComponent(q));
    const d = await r.json(); if (mi !== seqBusca) return;
    if (!r.ok) throw new Error(d.error || r.status);
    S.res = d.resultados || []; S.sinClave = !!d.sinClave;
    S.msgBusca = S.res.length ? '' : 'Sin resultados: podéis añadirlo a mano.';
  } catch (e) {
    if (mi !== seqBusca) return;
    S.res = []; S.msgBusca = 'No se pudo buscar ahora. Podéis escribir el título y añadirlo igualmente.';
  }
  S.buscando = false; pintarBusca();
}
function alEscribirPeli(ev) {
  if (ev.target.id !== 'nos-texto' || S.sub !== 'lista' || S.lista !== 'pelis') return;
  const q = ev.target.value.trim(); S.q = q;
  if (S.sel && q !== S.sel.titulo) { S.sel = null; }
  clearTimeout(tBusca);
  if (q.length < 2) { seqBusca++; S.res = []; S.buscando = false; S.msgBusca = ''; return pintarBusca(); }
  if (S.sel) return pintarBusca();
  tBusca = setTimeout(() => buscar(q), 350);
}
async function elegirResultado(i) {
  const f = S.res[i]; if (!f) return;
  S.sel = { ...f }; S.res = []; S.q = f.titulo; S.formato = f.tipo === 'tv' ? 'serie' : 'peli';
  const inp = $('nos-texto'); if (inp) inp.value = f.titulo;
  render();
  if (f.fuente !== 'tmdb') { const p = platDe(f.plataformas); if (p && !S.plat) { S.plat = p; render(); } return; }
  try {
    const r = await fetch(`/.netlify/functions/peli-search?tipo=${f.tipo}&id=${encodeURIComponent(f.id)}`);
    const d = await r.json();
    if (d.ficha && S.sel && S.sel.id === f.id) {
      S.sel = { ...S.sel, ...d.ficha };
      const p = platDe(S.sel.plataformas); if (p && !S.plat) S.plat = p;
      render();
    }
  } catch (e) { /* se queda con lo básico */ }
}
const metaGuardar = f => f ? {
  fuente: f.fuente || '', id: f.id == null ? '' : f.id, tipo: f.tipo || '', anio: f.anio || '', poster: f.poster || '',
  sinopsis: (f.sinopsis || '').slice(0, 700), nota: f.nota || 0, duracion: f.duracion || 0, temporadas: f.temporadas || 0,
  generos: f.generos || [], plataformas: f.plataformas || []
} : null;
async function crearPeli() {
  const inp = $('nos-texto'), texto = (inp?.value || '').trim();
  if (!texto) { S.msg = 'Escribe el título.'; return render(); }
  const p = { texto: texto.slice(0, 100), autor: rol().role, tipo: 'pelis', formato: S.formato, plataforma: S.plat, estado: 'pendiente', creado: ahora() };
  if (S.sel && S.sel.titulo === texto) p.meta = metaGuardar(S.sel);
  try {
    const r = await addDoc(col('planes'), p); S.planes.push({ id: r.id, ...p });
    S.msg = ''; if (inp) inp.value = ''; S.sel = null; S.res = []; S.q = ''; S.msgBusca = ''; S.plat = '';
    C.enviarPush(rol().partner, '+Dopamina', `${rol().displayName} ha añadido ${S.formato === 'serie' ? 'una serie' : 'una peli'} para ver juntos`, 'peli-nueva');
  } catch (e) { S.msg = 'No se pudo guardar. Inténtalo de nuevo.'; }
  render();
}
async function ponerNota(id, v) {
  const p = S.planes.find(x => x.id === id); if (!p) return;
  const k = 'nota_' + rol().role, nueva = p[k] === v ? 0 : v;
  p[k] = nueva; render();
  try { await updateDoc(ref('planes', id), { [k]: nueva }); } catch (e) { await refrescar(); }
}
function estrellas(p, quien) {
  const k = 'nota_' + quien, n = p[k] || 0, mio = quien === rol().role;
  let h = '';
  for (let i = 1; i <= 5; i++) {
    const svg = `<svg class="dp-ic ${i <= n ? '' : 'nos-off'}" style="--ic:${mio ? 22 : 16}px" aria-hidden="true"><use href="#ic-estrella"/></svg>`;
    h += mio ? `<button type="button" class="nos-star" data-act="nota" data-id="${esc(p.id)}" data-v="${i}" aria-label="${i} de 5">${svg}</button>` : `<span class="nos-star">${svg}</span>`;
  }
  return `<span class="nos-rate"><span class="nos-rate-n">${mio ? 'Tú' : esc(nombreDe(quien))}</span><span class="nos-stars">${h}</span></span>`;
}
function filaPeli(p) {
  const hecho = estaHecho(p), f = formatoDe(p.formato), confirmar = S.borrarId === p.id;
  const m = p.meta || null;
  const meta = [f.label, m && m.anio, p.plataforma, nombreDe(p.autor), hecho ? 'vista ' + fechaCorta(p.hechoFecha) : ''].filter(Boolean).join(' · ');
  const otro = rol().partner, abierto = S.detId === p.id && m;
  const det = abierto ? `<span class="nos-det-in">${[duracionTxt(m.duracion, m.tipo === 'tv'), m.temporadas ? m.temporadas + (m.temporadas === 1 ? ' temporada' : ' temporadas') : '', (m.generos || []).join(' · ')].filter(Boolean).length ? `<span class="nos-det-m">${esc([duracionTxt(m.duracion, m.tipo === 'tv'), m.temporadas ? m.temporadas + (m.temporadas === 1 ? ' temporada' : ' temporadas') : '', (m.generos || []).join(' · ')].filter(Boolean).join(' · '))}</span>` : ''}${m.sinopsis ? `<span class="nos-det-s">${esc(m.sinopsis)}</span>` : ''}${(m.plataformas || []).length ? `<span class="nos-sel-pl"><span>Dónde verla</span>${m.plataformas.map(x => `<i>${esc(x)}</i>`).join('')}</span>` : ''}</span>` : '';
  return `<li class="nos-item nos-peli ${hecho ? 'is-hecho is-vista' : ''} ${p.autor === rol().role ? 'es-mio' : 'es-suyo'}">
    <button type="button" class="nos-check" data-act="toggle" data-id="${esc(p.id)}" aria-pressed="${hecho}" aria-label="${hecho ? 'Marcar como pendiente' : 'Marcar como vista'}">${hecho ? ic('check', 18) : ''}</button>
    ${m && m.poster ? imgPoster(m.poster, 'nos-poster') : `<span class="nos-item-ic">${icOr(f.icono, 22)}</span>`}
    <span class="nos-item-main"${m ? ` data-act="det" data-id="${esc(p.id)}"` : ''}><span class="nos-item-t">${esc(p.texto)}${m && m.nota ? ' ' + estrellaNota(m.nota) : ''}</span><span class="nos-item-m">${esc(meta)}</span>${det}${hecho ? `<span class="nos-rates">${estrellas(p, rol().role)}${estrellas(p, otro)}</span>` : ''}</span>
    ${confirmar
      ? `<span class="nos-conf"><button type="button" class="nos-mini nos-mini-no" data-act="borrar-no">No</button><button type="button" class="nos-mini nos-mini-si" data-act="borrar-si" data-id="${esc(p.id)}">Borrar</button></span>`
      : `<button type="button" class="nos-del" data-act="borrar-pedir" data-id="${esc(p.id)}" aria-label="Borrar">${ic('cerrar', 14)}</button>`}
  </li>`;
}
function htmlPelis() {
  const fmt = FORMATOS.map(f => `<button type="button" class="nos-chip ${S.formato === f.id ? 'on' : ''}" data-act="formato" data-v="${f.id}">${icOr(f.icono, 18)}<span>${f.label}</span></button>`).join('');
  const plat = PLATAFORMAS.map(n => `<button type="button" class="nos-chip nos-chip-txt ${S.plat === n ? 'on' : ''}" data-act="plat" data-v="${esc(n)}">${esc(n)}</button>`).join('');
  const pend = pelisPend(), vistas = pelisVistas();
  const vacio = !pend.length && !vistas.length ? `<div class="nos-vacio">${icOr(['clapper', 'foto'], 40)}<p>Apuntad aquí las pelis y series que queréis ver juntos. Al verlas, cada uno les pone nota.</p></div>` : '';
  return selectorLista() + `<div class="nos-form">
    <div class="nos-row"><input id="nos-texto" type="text" enterkeyhint="search" maxlength="100" placeholder="Busca una peli o serie…" autocomplete="off" autocapitalize="sentences" /><button type="button" class="btn-primary nos-add" data-act="crear-peli">Añadir</button></div>
    <div id="nos-sel">${htmlSel()}</div><div id="nos-res">${htmlRes()}</div>
    <div class="nos-chips">${fmt}</div><div class="nos-chips nos-chips-h">${plat}</div>
    ${S.msg ? `<p class="nos-msg">${esc(S.msg)}</p>` : ''}</div>` +
    (pend.length ? `<h3 class="nos-h">Por ver</h3><ul class="nos-list">${pend.map(filaPeli).join('')}</ul>` : '') + vacio +
    (vistas.length ? `<details class="nos-det" ${S.abiertos.vistas ? 'open' : ''}><summary data-act="sec" data-k="vistas">Vistas juntos <span class="nos-cnt">${vistas.length}</span></summary><ul class="nos-list">${vistas.map(filaPeli).join('')}</ul></details>` : '');
}
function htmlLista() {
  if (S.lista === 'pelis') return htmlPelis();
  const todos = planesDe('hacer').sort(ordenarPorCreado);
  const pend = todos.filter(p => !estaHecho(p)), hechos = todos.filter(estaHecho).reverse();
  const vacio = !todos.length ? `<div class="nos-vacio">${ic('lista', 40)}<p>Aquí van las cosas que queréis hacer juntos, grandes o pequeñas.</p></div>` : '';
  return selectorLista() + formPlan('hacer') +
    (pend.length ? `<ul class="nos-list">${pend.map(filaPlan).join('')}</ul>` : '') + vacio +
    seccionHechas(hechos, 'hechasLista', 'Hechas juntos');
}
function htmlPlanes() {
  const todos = planesDe('futuro').sort(ordenarPorCreado);
  const pend = todos.filter(p => !estaHecho(p)), hechos = todos.filter(estaHecho).reverse();
  const grupos = HORIZONTES.map(h => {
    const l = pend.filter(p => (p.horizonte || 'proximos') === h.id);
    return l.length ? `<h3 class="nos-h">${h.label}</h3><ul class="nos-list">${l.map(filaPlan).join('')}</ul>` : '';
  }).join('');
  const vacio = !todos.length ? `<div class="nos-vacio">${ic('pin', 40)}<p>Los sueños grandes también caben aquí: un viaje, una casa, un año nuevo juntos.</p></div>` : '';
  return formPlan('futuro') + grupos + vacio + seccionHechas(hechos, 'hechasPlanes', 'Cumplidos');
}

// ─────────────────────────────────────────────
// Cartas
// ─────────────────────────────────────────────
const paraMi = () => S.cartas.filter(c => c.para === rol().role).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
const mias = () => S.cartas.filter(c => c.de === rol().role).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
const sinAbrir = () => paraMi().filter(c => !c.abiertaEn);

async function enviarCarta() {
  const texto = ($('nos-carta-texto')?.value || '').trim();
  const titulo = ($('nos-carta-titulo')?.value || '').trim().slice(0, 60);
  if (!texto) { S.msg = 'Escribe algo dentro del sobre.'; return render(); }
  const carta = { de: rol().role, para: rol().partner, titulo, texto: texto.slice(0, MAX_CARTA), creado: ahora(), abiertaEn: '' };
  try {
    const r = await addDoc(col('cartas'), carta);
    S.cartas.push({ id: r.id, ...carta });
    S.redactando = false; S.msg = 'Tu carta va camino de ' + nombreDe(rol().partner) + ', bien cerrada.';
    C.enviarPush(rol().partner, '+Dopamina', `Tienes una carta de ${rol().displayName}`, 'carta-nueva');
    registrar('carta');
  } catch (e) { S.msg = 'No se pudo enviar. Inténtalo de nuevo.'; }
  render(); pintarPuntos();
  evaluar();
}
async function marcarAbierta(id) {
  const c = S.cartas.find(x => x.id === id); if (!c || c.abiertaEn) return;
  c.abiertaEn = ahora();
  try { await updateDoc(ref('cartas', id), { abiertaEn: c.abiertaEn }); } catch (e) { /* se reintenta al refrescar */ }
  C.enviarPush(c.de, '+Dopamina', `${rol().displayName} ha abierto tu carta`, 'carta-abierta');
  pintarPuntos(); render(); evaluar();
}

function htmlCarta(c) {
  const soyDe = c.de === rol().role;
  return `<article class="carta-papel">
    ${c.titulo ? `<h3 class="carta-titulo">${esc(c.titulo)}</h3>` : ''}
    <p class="carta-texto">${esc(c.texto)}</p>
    <p class="carta-firma">${ic('corazon', 16)} ${esc(nombreDe(c.de))} · ${esc(fechaLarga(c.creado))}${soyDe ? '' : ''}</p>
  </article>`;
}
function cerrarCarta() { $('modal-carta').hidden = true; $('carta-stage').textContent = ''; $('carta-actions').textContent = ''; }
function leerCarta(id) {
  const c = S.cartas.find(x => x.id === id); if (!c) return;
  $('carta-stage').innerHTML = htmlCarta(c);
  $('carta-actions').innerHTML = `<button type="button" class="btn-primary" data-carta="cerrar">Cerrar</button>`;
  $('modal-carta').hidden = false;
}
let sobreActivo = null;
function abrirSobre(id) {
  const c = S.cartas.find(x => x.id === id); if (!c) return;
  if (c.abiertaEn) return leerCarta(id);
  sobreActivo?.destruir();
  const stage = $('carta-stage'), acts = $('carta-actions');
  stage.textContent = ''; acts.textContent = '';
  const caja = document.createElement('div'); caja.className = 'carta-sobre-caja'; stage.appendChild(caja);
  acts.innerHTML = `<button type="button" class="btn-secondary" data-carta="mas-tarde">Más tarde</button>`;
  $('modal-carta').hidden = false;
  sobreActivo = DpSobre.montar(caja, {
    remitente: nombreDe(c.de),
    color: c.de === 'cilia' ? 'alba' : 'abdu',
    onAbierto: () => {
      marcarAbierta(id);
      stage.innerHTML = htmlCarta(c);
      const quedan = sinAbrir().filter(x => x.id !== id).length;
      acts.innerHTML = `<button type="button" class="btn-primary" data-carta="guardar">Guardar en nuestro archivo</button>`;
      acts.dataset.quedan = String(quedan);
    }
  });
}
// Pop-up al entrar en la app (o al volver a ella): primera carta sin abrir
function avisoCartas() {
  if (!S.cargado || S.pospuesta || !$('modal-carta')?.hidden || !$('modal-logro')?.hidden) return;
  const c = sinAbrir().sort(ordenarPorCreado)[0];
  if (c) abrirSobre(c.id);
}

function htmlCartas() {
  if (S.redactando) {
    return `<div class="nos-redactar">
      <h3 class="nos-h">Carta para ${esc(nombreDe(rol().partner))}</h3>
      <input id="nos-carta-titulo" type="text" maxlength="60" placeholder="Título (opcional)" autocomplete="off" />
      <textarea id="nos-carta-texto" maxlength="${MAX_CARTA}" rows="9" placeholder="Escribe lo que quieras que lea cuando abra el sobre…"></textarea>
      ${S.msg ? `<p class="nos-msg">${esc(S.msg)}</p>` : ''}
      <p class="nos-aviso">Se enviará cerrada. ${esc(nombreDe(rol().partner))} tendrá que abrir el sobre para leerla, y tú no podrás cambiarla después.</p>
      <div class="nos-actions"><button type="button" class="btn-secondary" data-act="cancelar-carta">Cancelar</button><button type="button" class="btn-primary" data-act="enviar-carta">Cerrar sobre y enviar</button></div>
    </div>`;
  }
  const pend = sinAbrir().sort(ordenarPorCreado), leidas = paraMi().filter(c => c.abiertaEn), env = mias();
  const bloquePend = pend.length ? `<h3 class="nos-h">Sin abrir</h3><ul class="nos-list">${pend.map(c => `
    <li class="nos-carta sin-abrir"><span class="nos-carta-ic">${ic('sobre', 34)}</span>
      <span class="nos-item-main"><span class="nos-item-t">Carta de ${esc(nombreDe(c.de))}</span><span class="nos-item-m">${esc(fechaCorta(c.creado))} · sin abrir</span></span>
      <button type="button" class="btn-primary nos-abrir" data-act="abrir" data-id="${esc(c.id)}">Abrir</button></li>`).join('')}</ul>` : '';
  const bloqueLeidas = leidas.length ? `<details class="nos-det" ${S.abiertos.archivo ? 'open' : ''}><summary data-act="sec" data-k="archivo">Nuestro archivo <span class="nos-cnt">${leidas.length}</span></summary><ul class="nos-list">${leidas.map(c => `
    <li class="nos-carta"><span class="nos-carta-ic">${ic('sobre-abierto', 34)}</span>
      <button type="button" class="nos-item-main nos-link" data-act="leer" data-id="${esc(c.id)}"><span class="nos-item-t">${esc(c.titulo || 'Carta de ' + nombreDe(c.de))}</span><span class="nos-item-m">${esc(nombreDe(c.de))} · abierta el ${esc(fechaCorta(c.abiertaEn))}</span></button></li>`).join('')}</ul></details>` : '';
  const bloqueEnv = env.length ? `<details class="nos-det" ${S.abiertos.enviadas ? 'open' : ''}><summary data-act="sec" data-k="enviadas">Enviadas por ti <span class="nos-cnt">${env.length}</span></summary><ul class="nos-list">${env.map(c => `
    <li class="nos-carta"><span class="nos-carta-ic">${ic(c.abiertaEn ? 'sobre-abierto' : 'sello', 34)}</span>
      <button type="button" class="nos-item-main nos-link" data-act="leer" data-id="${esc(c.id)}"><span class="nos-item-t">${esc(c.titulo || 'Carta para ' + nombreDe(c.para))}</span><span class="nos-item-m">${c.abiertaEn ? 'La abrió el ' + esc(fechaCorta(c.abiertaEn)) : 'Aún sin abrir'} · ${esc(fechaCorta(c.creado))}</span></button></li>`).join('')}</ul></details>` : '';
  const vacio = !S.cartas.length ? `<div class="nos-vacio">${ic('sobre', 40)}<p>Escribid cartas que llegan cerradas: la otra persona tiene que abrirlas.</p></div>` : '';
  return `${S.msg ? `<p class="nos-msg ok">${esc(S.msg)}</p>` : ''}
    <button type="button" class="btn-primary nos-escribir" data-act="escribir">${ic('pluma', 20)} Escribir una carta</button>
    ${bloquePend}${bloqueLeidas}${bloqueEnv}${vacio}`;
}

// ─────────────────────────────────────────────
// Logros
// ─────────────────────────────────────────────
const lista = () => (window.DP_LOGROS || []);
const desbloqueado = id => !!S.logros[id];

function textosDe(l, abierto) {
  return window.DpLogros ? DpLogros.textos(l, abierto) : { nombre: l.nombre, pista: l.pista, condicion: l.condicion };
}
function htmlLogros() {
  const L = lista();
  const ganados = L.filter(l => desbloqueado(l.id));
  const pts = ganados.reduce((s, l) => s + (S.logros[l.id].puntos || l.puntos || 0), 0);
  const cats = [...new Set(L.map(l => l.categoria))];
  const bloques = cats.map(cat => {
    const items = L.filter(l => l.categoria === cat).map(l => {
      const ok = desbloqueado(l.id), t = textosDe(l, ok);
      return `<button type="button" class="nos-logro ${ok ? 'ok' : ''}" data-act="logro" data-id="${esc(l.id)}" aria-label="${esc(t.nombre)}${ok ? '' : ', bloqueado'}">
        <span class="nos-logro-art">${DpLogros.svg(l, !ok)}</span><span class="nos-logro-n">${esc(t.nombre)}</span></button>`;
    }).join('');
    return `<h3 class="nos-h">${esc(cat)}</h3><div class="nos-logros-grid">${items}</div>`;
  }).join('');
  return `<div class="nos-resumen"><span class="nos-resumen-ic">${ic('trofeo', 30)}</span>
    <span class="nos-resumen-t"><b>${ganados.length}</b> de ${L.length} logros</span>
    <span class="nos-resumen-p">${chispa(pts)} ganadas</span></div>${bloques}`;
}
function faltaTexto(l) {
  if (!l.dias || !window.DpLogros) return '';
  const d = DpLogros.diasJuntos(C.inicio, new Date());
  const f = DpLogros.fechaDias(l, C.inicio);
  const faltan = l.dias - d;
  if (faltan <= 0) return '';
  return `<p class="logro-falta">Faltan ${faltan.toLocaleString('es-ES')} días · el ${esc(f.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>`;
}
function detalleLogro(id) {
  const l = lista().find(x => x.id === id); if (!l) return;
  const ok = desbloqueado(id), t = textosDe(l, ok), d = S.logros[id];
  $('logro-stage').innerHTML = `<div class="logro-art ${ok ? '' : 'bloq'}">${DpLogros.svg(l, !ok)}</div>
    <h3 class="logro-nombre">${esc(t.nombre)}</h3>
    <p class="logro-pista">${esc(t.pista)}</p>
    <p class="logro-cond">${esc(t.condicion)}</p>
    ${ok ? `<p class="logro-fecha">Desbloqueado el ${esc(fechaLarga(d.fecha))}</p>` : faltaTexto(l)}
    <div class="logro-puntos">${chispa(l.puntos)}</div>
    <button type="button" class="btn-primary" data-logro="cerrar">Cerrar</button>`;
  $('modal-logro').hidden = false;
}
function celebrar() {
  if (S.celebrando || !S.cola.length || !$('modal-carta').hidden) return;
  const l = S.cola.shift();
  S.celebrando = true;
  $('logro-stage').innerHTML = `<p class="logro-kicker">¡Logro desbloqueado!</p>
    <div class="logro-art logro-art-big">${DpLogros.svg(l, false)}</div>
    <h3 class="logro-nombre">${esc(l.nombre)}</h3>
    <p class="logro-pista">${esc(l.pista)}</p>
    <div class="logro-win"></div>
    <div class="logro-puntos">+${chispa(l.puntos)} para Dopi</div>
    <button type="button" class="btn-primary" data-logro="siguiente">Genial</button>`;
  $('modal-logro').hidden = false;
  const win = $('logro-stage').querySelector('.logro-win');
  if (window.DpChispa) DpChispa.ganar(win, { cantidad: l.puntos });
}
function cerrarLogro(siguiente) {
  $('modal-logro').hidden = true; $('logro-stage').textContent = '';
  S.celebrando = false;
  if (siguiente && S.cola.length) setTimeout(celebrar, 350);
  else setTimeout(avisoCartas, 400);
}

// ── Estadísticas y condiciones ──
async function registrar(tipo) {
  if (!rol()) return;
  try {
    const r = ref('nosotros', 'stats');
    const snap = await getDoc(r);
    const s = snap.exists() ? snap.data() : {};
    const cambios = {};
    if (tipo === 'poke') cambios['pokes_' + rol().role] = (s['pokes_' + rol().role] || 0) + 1;
    if (tipo !== 'check' && new Date().getDate() === 10) cambios['dia10_' + rol().role] = true;
    if (Object.keys(cambios).length) await setDoc(r, cambios, { merge: true });
  } catch (e) { /* los contadores nunca estorban */ }
  cacheDatos = null;
}
async function datosLogros() {
  if (cacheDatos && Date.now() - cacheAt < 60000) return cacheDatos;
  const d = { stats: {}, entradas: [], checkins: [], stage: 1 };
  const leer = async (nombre, fn) => { try { fn(await getDocs(col(nombre))); } catch (e) { /* esa condición se queda sin cumplir */ } };
  await leer('entradas', q => q.forEach(x => d.entradas.push(x.data())));
  await leer('checkins', q => q.forEach(x => d.checkins.push(x.data())));
  try { const s = await getDoc(ref('nosotros', 'stats')); if (s.exists()) d.stats = s.data(); } catch (e) { }
  try { const m = await getDoc(ref('mascota', 'estado')); if (m.exists()) { const md = m.data(); d.stage = md.stage || 1; d.cycles = md.cycles || 0; d.recovered = md.recovered || 0; d.speciesDone = md.speciesDone || []; } } catch (e) { }
  cacheDatos = d; cacheAt = Date.now();
  return d;
}
function rachaSemanas(entradas) {
  const semanas = new Set();
  entradas.forEach(e => { if (e.date) semanas.add(C.isoWeekKey(new Date(e.date + 'T00:00:00'))); });
  let racha = 0, cursor = new Date();
  if (!semanas.has(C.isoWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (semanas.has(C.isoWeekKey(cursor))) { racha++; cursor.setDate(cursor.getDate() - 7); }
  return racha;
}
function cumple(l, d) {
  const hechos = deLista().filter(estaHecho);
  switch (l.id) {
    case 'primera-pagina': return d.entradas.some(e => e.completado && e.completado.fahd && e.completado.cilia);
    case 'mes-sin-soltarnos': return d.racha >= 4;
    case 'constantes': return d.racha >= 12;
    case 'primer-check': return d.checkins.some(c => c.fahd?.publicado && c.cilia?.publicado);
    case 'pensando-en-ti': return (d.stats.pokes_fahd || 0) + (d.stats.pokes_cilia || 0) >= 10;
    case 'primera-carta': return S.cartas.length >= 1;
    case 'sello-roto': return S.cartas.some(c => c.abiertaEn);
    case 'buzon-lleno': return S.cartas.length >= 10;
    case 'dopi-nace': return d.stage >= 3;            // eclosiona (fase 3 de 10)
    case 'dopi-crece': return d.stage >= 7;           // joven
    case 'alma-gemela': return d.stage >= 10;         // forma final
    case 'ciclo-nuevo': return (d.cycles || 0) >= 1;
    case 'vuelve-a-casa': return (d.recovered || 0) >= 1;
    case 'tres-especies': return ['a', 'b', 'c'].every(k => (d.speciesDone || []).includes(k));
    case 'sonadores': return deLista().length >= 10;
    case 'primer-plan': return hechos.length >= 1;
    case 'primer-viaje': return hechos.some(p => p.categoria === 'viaje');
    case 'rincon-nuestro': return hechos.some(p => p.categoria === 'hogar');
    case 'cumplidores': return hechos.length >= 10;
    case 'dia-senalado': return !!(d.stats.dia10_fahd || d.stats.dia10_cilia);
    default:
      if (l.dias) return DpLogros.diasJuntos(C.inicio, new Date()) >= l.dias;
      return false;
  }
}
async function desbloquear(l) {
  const yo = rol().role, otro = rol().partner;
  const lr = ref('logros', l.id), mr = ref('mascota', 'estado');
  const nuevo = await runTransaction(C.db, async tx => {
    const a = await tx.get(lr);
    if (a.exists()) return false;
    const m = await tx.get(mr);
    const estado = m.exists() ? m.data() : (window.PetLogic ? PetLogic.newState(Date.now()) : { points: 0 });
    estado.points = (estado.points || 0) + l.puntos;
    tx.set(lr, { fecha: ahora(), por: yo, puntos: l.puntos, ['visto_' + yo]: false, ['visto_' + otro]: false });
    tx.set(mr, estado);
    return true;
  });
  return nuevo;
}
async function evaluar() {
  if (evaluando || !rol() || !window.DP_LOGROS) return;
  evaluando = true;
  try {
    if (!S.cargado) await cargar();
    const d = await datosLogros();
    d.racha = rachaSemanas(d.entradas);
    for (const l of lista()) {
      if (S.logros[l.id] || !cumple(l, d)) continue;
      try {
        const nuevo = await desbloquear(l);
        if (nuevo) C.enviarPush(rol().partner, '+Dopamina', 'Habéis desbloqueado un logro', 'logro');
      } catch (e) { /* se reintenta en la próxima evaluación */ }
    }
    const l2 = await getDocs(col('logros')); S.logros = {}; l2.forEach(x => { S.logros[x.id] = x.data(); });
    // ¿alguno que yo aún no he visto?
    const yo = 'visto_' + rol().role, nuevos = [];
    for (const l of lista()) {
      const g = S.logros[l.id];
      if (g && g[yo] === false) { nuevos.push(l); try { await updateDoc(ref('logros', l.id), { [yo]: true }); S.logros[l.id][yo] = true; } catch (e) { } }
    }
    if (nuevos.length) { S.cola.push(...nuevos); celebrar(); if (window.MascotaUI) MascotaUI.refresh?.(); }
    if ($('tab-nosotros')?.classList.contains('active')) render();
  } finally { evaluando = false; }
}

// ─────────────────────────────────────────────
// Render y eventos
// ─────────────────────────────────────────────
function pintarPuntos() {
  const n = sinAbrir().length;
  $('nos-cartas-dot').hidden = n === 0;
  $('nos-tab-dot').hidden = n === 0;
}
function render() {
  const body = $('nos-body'); if (!body) return;
  document.querySelectorAll('.nos-subtab').forEach(b => b.classList.toggle('on', b.dataset.nos === S.sub));
  // no pisar lo que se está escribiendo
  const texto = $('nos-texto')?.value, ct = $('nos-carta-texto')?.value, ctt = $('nos-carta-titulo')?.value;
  body.innerHTML = S.sub === 'lista' ? htmlLista() : S.sub === 'planes' ? htmlPlanes() : S.sub === 'cartas' ? htmlCartas() : htmlLogros();
  if (texto && $('nos-texto')) $('nos-texto').value = texto;
  if (ct && $('nos-carta-texto')) $('nos-carta-texto').value = ct;
  if (ctt && $('nos-carta-titulo')) $('nos-carta-titulo').value = ctt;
}
function onClick(ev) {
  const modalCarta = ev.target.closest('[data-carta]');
  if (modalCarta) {
    const a = modalCarta.dataset.carta;
    if (a === 'mas-tarde') { S.pospuesta = true; sobreActivo?.destruir(); sobreActivo = null; cerrarCarta(); }
    else if (a === 'guardar' || a === 'cerrar') {
      const quedan = +($('carta-actions').dataset.quedan || 0);
      sobreActivo?.destruir(); sobreActivo = null; cerrarCarta();
      if (a === 'guardar' && quedan > 0) setTimeout(avisoCartas, 450);
      else if (S.cola.length) setTimeout(celebrar, 450);
    }
    return;
  }
  const modalLogro = ev.target.closest('[data-logro]');
  if (modalLogro) return cerrarLogro(modalLogro.dataset.logro === 'siguiente');
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (a === 'sec') { ev.preventDefault(); const d = el.parentElement; S.abiertos[el.dataset.k] = !d.open; d.open = !d.open; return; }
  if (a === 'cat') { S.cat = el.dataset.v; return render(); }
  if (a === 'hor') { S.horizonte = el.dataset.v; return render(); }
  if (a === 'lista') { S.lista = el.dataset.v; S.msg = ''; S.borrarId = null; return render(); }
  if (a === 'formato') { S.formato = el.dataset.v; return render(); }
  if (a === 'plat') { S.plat = S.plat === el.dataset.v ? '' : el.dataset.v; return render(); }
  if (a === 'elegir') return elegirResultado(+el.dataset.i);
  if (a === 'quitar-sel') { S.sel = null; S.res = []; const i = $('nos-texto'); if (i) i.value = ''; S.q = ''; return render(); }
  if (a === 'det') { S.detId = S.detId === id ? null : id; return render(); }
  if (a === 'crear-peli') return crearPeli();
  if (a === 'nota') return ponerNota(id, +el.dataset.v);
  if (a === 'crear-hacer') return crearPlan('hacer');
  if (a === 'crear-futuro') return crearPlan('futuro');
  if (a === 'toggle') return alternarPlan(id);
  if (a === 'borrar-pedir') { S.borrarId = id; return render(); }
  if (a === 'borrar-no') { S.borrarId = null; return render(); }
  if (a === 'borrar-si') return borrarPlan(id);
  if (a === 'escribir') { S.redactando = true; S.msg = ''; return render(); }
  if (a === 'cancelar-carta') { S.redactando = false; S.msg = ''; return render(); }
  if (a === 'enviar-carta') return enviarCarta();
  if (a === 'abrir') return abrirSobre(id);
  if (a === 'leer') return leerCarta(id);
  if (a === 'logro') return detalleLogro(id);
}
function mostrar() {
  S.msg = '';
  render();
  refrescar().then(() => { render(); evaluar(); });
}
function irA(sub) { S.sub = sub; S.msg = ''; S.borrarId = null; render(); if (sub === 'logros') evaluar(); }

function init(ctx) {
  C = ctx;
  if (enlazado) { refrescar(); return; }
  enlazado = true;
  document.querySelectorAll('.nos-subtab').forEach(b => b.addEventListener('click', () => irA(b.dataset.nos)));
  $('tab-nosotros')?.addEventListener('click', onClick);
  $('tab-nosotros')?.addEventListener('input', alEscribirPeli);
  $('modal-carta')?.addEventListener('click', onClick);
  $('modal-logro')?.addEventListener('click', ev => { if (ev.target === $('modal-logro')) cerrarLogro(false); else onClick(ev); });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (!$('modal-logro').hidden) cerrarLogro(false);
    else if (!$('modal-carta').hidden) { S.pospuesta = true; sobreActivo?.destruir(); sobreActivo = null; cerrarCarta(); }
  });
  // al volver a la app desde segundo plano, mira si ha llegado una carta
  document.addEventListener('visibilitychange', () => { if (!document.hidden && rol()) refrescar().then(avisoCartas); });
  refrescar().then(() => { avisoCartas(); setTimeout(evaluar, 2500); });
}

export const Nosotros = { init, mostrar, refrescar, registrar, avisoCartas, evaluar };
