// ─────────────────────────────────────────────
// Configuración de Firebase
// ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmU2l0p_o1JGeDkereu3uUFDhAVpEYlAw",
  authDomain: "planning-with-ai-7a738.firebaseapp.com",
  projectId: "planning-with-ai-7a738",
  storageBucket: "planning-with-ai-7a738.firebasestorage.app",
  messagingSenderId: "686867753267",
  appId: "1:686867753267:web:1c3b67cd135494b711f646"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ─────────────────────────────────────────────
// Roles fijos — solo estos correos tienen acceso
// ─────────────────────────────────────────────
const EMAIL_ROLES = {
  'ciliagomezalba@gmail.com': { role: 'cilia', partner: 'fahd', parejaId: 'nuestra-pareja', displayName: 'Cilia' },
  'fahdkahnabdulah@gmail.com': { role: 'fahd', partner: 'cilia', parejaId: 'nuestra-pareja', displayName: 'Fahd' },
  'prueba@test.com': { role: 'fahd', partner: 'cilia', parejaId: 'demo', displayName: 'Cuenta de prueba' }
};

let currentRole = null; // se rellena en onAuthStateChanged
let pokeUnsub = null; // desuscriptor del listener de pokes

// ─────────────────────────────────────────────
// Utilidades DOM
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add('active');
  $(`tab-${name}`).classList.add('active');
  if (name === 'historial') loadHistory();
  if (name === 'deseos') loadMyWishes();
  if (name === 'fechas') { calMonthOffset = 0; renderDiasJuntos(); renderCalendar(); loadFechasImportantes(); }
}

function setMsg(id, text, color = 'var(--text-muted)') {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

// ─────────────────────────────────────────────
// Autenticación
// ─────────────────────────────────────────────
$('btn-login').addEventListener('click', async () => {
  const email = $('login-email').value.trim().toLowerCase();
  const pass = $('login-password').value;
  if (!EMAIL_ROLES[email]) {
    setMsg('login-error', 'Este correo no tiene acceso a esta app.', '#a32d2d');
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    setMsg('login-error', 'Correo o contraseña incorrectos.', '#a32d2d');
  }
});

$('btn-register').addEventListener('click', async () => {
  const email = $('login-email').value.trim().toLowerCase();
  const pass = $('login-password').value;
  if (!EMAIL_ROLES[email]) {
    setMsg('login-error', 'Este correo no tiene acceso a esta app.', '#a32d2d');
    return;
  }
  if (pass.length < 6) { setMsg('login-error', 'La contraseña debe tener al menos 6 caracteres.', '#a32d2d'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    setMsg('login-error', 'No se pudo crear la cuenta. ¿Ya existe?', '#a32d2d');
  }
});

$('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    const email = (user.email || '').toLowerCase();
    const roleInfo = EMAIL_ROLES[email];
    if (!roleInfo) {
      // Correo no autorizado — se cierra sesión inmediatamente
      signOut(auth);
      setMsg('login-error', 'Este correo no tiene acceso a esta app.', '#a32d2d');
      return;
    }
    currentRole = roleInfo;
    showScreen('app');
    initApp();
  } else {
    currentRole = null;
    if (pokeUnsub) { pokeUnsub(); pokeUnsub = null; }
    showScreen('login');
  }
});

// ─────────────────────────────────────────────
// Inicialización de la app tras login
// ─────────────────────────────────────────────
async function initApp() {
  setTodayDate();
  setupAvatars();
  setupTabs();
  setupSaveExport();
  setupWishes();
  setupPoke();
  setupCalendar();
  requestNotificationPermission();
  if (currentRole.parejaId === 'demo') await seedDemoData();
  loadRecommendation();
  loadRacha();
}

// ─────────────────────────────────────────────
// Fecha de hoy
// ─────────────────────────────────────────────
function setTodayDate() {
  const today = new Date().toISOString().slice(0, 10);
  $('entry-date').value = today;
}

// ─────────────────────────────────────────────
// Avatares dinámicos según nombre
// ─────────────────────────────────────────────
function setupAvatars() {
  ['name1', 'name2'].forEach(id => {
    const avId = id === 'name1' ? 'av1' : 'av2';
    $(id).addEventListener('input', () => {
      const val = $(id).value.trim();
      $(avId).textContent = val ? val[0].toUpperCase() : '?';
    });
  });
}

// ─────────────────────────────────────────────
// Navegación por tabs
// ─────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
}

// ─────────────────────────────────────────────
// Recoger datos del formulario de entrada
// ─────────────────────────────────────────────
function getFormData() {
  return {
    date: $('entry-date').value,
    names: {
      n1: $('name1').value.trim(),
      n2: $('name2').value.trim()
    },
    p1: {
      sentimiento: $('p1_sentimiento').value,
      gracias: $('p1_gracias').value,
      pendiente: $('p1_pendiente').value
    },
    p2: {
      sentimiento: $('p2_sentimiento').value,
      gracias: $('p2_gracias').value,
      pendiente: $('p2_pendiente').value
    },
    shared: {
      hacer: $('shared_hacer').value,
      recuerdo: $('shared_recuerdo').value,
      sueno: $('shared_sueno').value,
      logro: $('shared_logro').value
    },
    savedAt: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────
// Guardar entrada en Firestore (espacio compartido)
// ─────────────────────────────────────────────
async function saveEntry() {
  const data = getFormData();
  if (!data.date) { setMsg('save-msg', 'Selecciona una fecha primero.', '#a32d2d'); return; }
  try {
    const ref = doc(db, 'parejas', currentRole.parejaId, 'entradas', data.date);
    await setDoc(ref, data, { merge: true });
    setMsg('save-msg', '✓ Entrada guardada y sincronizada', '#0f6e56');
    setTimeout(() => setMsg('save-msg', ''), 3000);
    loadRacha();
  } catch (e) {
    setMsg('save-msg', 'Error al guardar. Comprueba tu conexión.', '#a32d2d');
  }
}

// ─────────────────────────────────────────────
// Exportar a texto plano
// ─────────────────────────────────────────────
function exportEntry() {
  const d = getFormData();
  const n1 = d.names.n1 || 'Persona 1';
  const n2 = d.names.n2 || 'Persona 2';
  const text = [
    `Diario de pareja — ${d.date}`,
    ``,
    `=== ${n1} ===`,
    `Cómo me siento: ${d.p1.sentimiento || '—'}`,
    `Te agradezco: ${d.p1.gracias || '—'}`,
    `Algo que quiero decirte: ${d.p1.pendiente || '—'}`,
    ``,
    `=== ${n2} ===`,
    `Cómo me siento: ${d.p2.sentimiento || '—'}`,
    `Te agradezco: ${d.p2.gracias || '—'}`,
    `Algo que quiero decirte: ${d.p2.pendiente || '—'}`,
    ``,
    `=== Juntos ===`,
    `Qué nos gustaría hacer: ${d.shared.hacer || '—'}`,
    `Recuerdo favorito: ${d.shared.recuerdo || '—'}`,
    `Nuevo sueño / meta: ${d.shared.sueno || '—'}`,
    `Objetivo cumplido: ${d.shared.logro || '—'}`
  ].join('\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diario-pareja-${d.date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function setupSaveExport() {
  $('btn-save').addEventListener('click', saveEntry);
  $('btn-export').addEventListener('click', exportEntry);
}

// ─────────────────────────────────────────────
// Cargar historial desde Firestore
// ─────────────────────────────────────────────
async function loadHistory() {
  const list = $('history-list');
  list.innerHTML = '<p class="empty-state">Cargando...</p>';
  try {
    const ref = collection(db, 'parejas', currentRole.parejaId, 'entradas');
    const q = query(ref, orderBy('date', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<p class="empty-state">Aún no hay entradas guardadas.</p>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(docSnap => {
      const e = docSnap.data();
      const card = document.createElement('div');
      card.className = 'entry-card';

      const n1 = e.names?.n1 || '';
      const n2 = e.names?.n2 || '';
      const preview = e.p1?.sentimiento || e.shared?.hacer || '';

      card.innerHTML = `
        <div class="entry-date">${e.date}</div>
        <div class="entry-names">${[n1, n2].filter(Boolean).join(' & ')}</div>
        <div class="entry-preview">${preview || 'Sin texto'}</div>
        <div class="entry-reactions" data-date="${e.date}">${renderReactions(e.reacciones)}</div>
      `;
      card.querySelector('.entry-date').addEventListener('click', () => loadEntry(e));
      card.querySelector('.entry-names').addEventListener('click', () => loadEntry(e));
      card.querySelector('.entry-preview').addEventListener('click', () => loadEntry(e));
      wireReactionButtons(card.querySelector('.entry-reactions'), e.date, e.reacciones);
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Error al cargar. Comprueba tu conexión.</p>';
  }
}

function loadEntry(e) {
  $('entry-date').value = e.date || '';
  $('name1').value = e.names?.n1 || '';
  $('name2').value = e.names?.n2 || '';
  $('av1').textContent = e.names?.n1?.[0]?.toUpperCase() || '?';
  $('av2').textContent = e.names?.n2?.[0]?.toUpperCase() || '?';
  $('p1_sentimiento').value = e.p1?.sentimiento || '';
  $('p1_gracias').value = e.p1?.gracias || '';
  $('p1_pendiente').value = e.p1?.pendiente || '';
  $('p2_sentimiento').value = e.p2?.sentimiento || '';
  $('p2_gracias').value = e.p2?.gracias || '';
  $('p2_pendiente').value = e.p2?.pendiente || '';
  $('shared_hacer').value = e.shared?.hacer || '';
  $('shared_recuerdo').value = e.shared?.recuerdo || '';
  $('shared_sueno').value = e.shared?.sueno || '';
  $('shared_logro').value = e.shared?.logro || '';
  showTab('nueva');
}

// ─────────────────────────────────────────────
// REACCIONES a entradas del historial
// ─────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '😂', '🥰', '👏', '😮'];

function renderReactions(reacciones) {
  const r = reacciones || {};
  const chips = Object.entries(r).filter(([rol, emoji]) => !!emoji).map(([rol, emoji]) => `<span class="reaction-chip">${emoji}</span>`).join('');
  return `<div class="reaction-chips">${chips}</div><div class="reaction-picker">${REACTION_EMOJIS.map(em => `<button class="reaction-btn" data-emoji="${em}">${em}</button>`).join('')}</div>`;
}

function wireReactionButtons(container, date, reaccionesActuales) {
  if (!container) return;
  container.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const emoji = btn.dataset.emoji;
      try {
        const ref = doc(db, 'parejas', currentRole.parejaId, 'entradas', date);
        const actual = (reaccionesActuales && reaccionesActuales[currentRole.role]) || null;
        const nuevo = actual === emoji ? null : emoji; // tocar el mismo emoji lo quita
        await setDoc(ref, { reacciones: { [currentRole.role]: nuevo } }, { merge: true });
        loadHistory();
      } catch (e) {
        // silencioso
      }
    });
  });
}

// ─────────────────────────────────────────────
// RACHA — semanas ISO consecutivas con entrada
// ─────────────────────────────────────────────
function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function loadRacha() {
  const el = $('racha-indicador');
  if (!el) return;
  try {
    const ref = collection(db, 'parejas', currentRole.parejaId, 'entradas');
    const snap = await getDocs(ref);
    const semanas = new Set();
    snap.forEach(d => {
      const data = d.data();
      if (data.date) semanas.add(isoWeekKey(new Date(data.date + 'T00:00:00')));
    });
    let racha = 0;
    let cursor = new Date();
    // margen de gracia: si esta semana aún no hay entrada, empieza a contar desde la semana pasada
    if (!semanas.has(isoWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
    while (semanas.has(isoWeekKey(cursor))) {
      racha++;
      cursor.setDate(cursor.getDate() - 7);
    }
    el.textContent = racha > 0 ? `🔥 ${racha} semana${racha === 1 ? '' : 's'} seguida${racha === 1 ? '' : 's'}` : '';
    el.style.display = racha > 0 ? 'inline-flex' : 'none';
  } catch (e) {
    el.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
// BUZÓN DE DESEOS
// ─────────────────────────────────────────────
function wishesRef() {
  return collection(db, 'parejas', currentRole.parejaId, 'deseos');
}

async function addWish() {
  const texto = $('wish-input').value.trim();
  if (!texto) return;
  try {
    await addDoc(wishesRef(), {
      autor: currentRole.role,
      texto,
      creado: new Date().toISOString()
    });
    $('wish-input').value = '';
    loadMyWishes();
  } catch (e) {
    // silencioso — se reintenta al recargar
  }
}

async function loadMyWishes() {
  const list = $('wish-list');
  list.innerHTML = '<p class="empty-state">Cargando...</p>';
  try {
    const snap = await getDocs(wishesRef());
    const mine = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.autor === currentRole.role) mine.push({ id: d.id, ...data });
    });
    if (mine.length === 0) {
      list.innerHTML = '<p class="empty-state">Aún no has añadido nada.</p>';
      return;
    }
    mine.sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
    list.innerHTML = '';
    mine.forEach(w => {
      const card = document.createElement('div');
      card.className = 'wish-card';
      card.innerHTML = `<span class="wish-text">${escapeHtml(w.texto)}</span>
        <button class="btn-delete" title="Eliminar">✕</button>`;
      card.querySelector('.btn-delete').addEventListener('click', async () => {
        await deleteDoc(doc(db, 'parejas', currentRole.parejaId, 'deseos', w.id));
        loadMyWishes();
      });
      list.appendChild(card);
    });
  } catch (e) {
    list.innerHTML = '<p class="empty-state">Error al cargar.</p>';
  }
}

function setupWishes() {
  $('btn-wish-add').addEventListener('click', addWish);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─────────────────────────────────────────────
// POKE — "pensando en ti" en tiempo real (sin backend)
// ─────────────────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    // se pide en un gesto del usuario más adelante también, pero probamos ya por si acaso
    Notification.requestPermission().catch(() => {});
  }
}

function pokeDocRef() {
  return doc(db, 'parejas', currentRole.parejaId, 'pokes', 'latest');
}

function showPokeToast(texto) {
  let toast = $('poke-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'poke-toast';
    toast.className = 'poke-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = texto;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function setupPoke() {
  const btn = $('btn-poke');
  if (btn) {
    btn.addEventListener('click', async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      try {
        await setDoc(pokeDocRef(), { de: currentRole.role, ts: Date.now() });
        showPokeToast('💌 Le has dicho que piensas en ella/él');
      } catch (e) {
        // silencioso
      }
    });
  }

  if (pokeUnsub) pokeUnsub();
  pokeUnsub = onSnapshot(pokeDocRef(), snap => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data || data.de === currentRole.role) return;
    if (Date.now() - data.ts > 15000) return; // ignora pokes viejos al cargar la app
    const nombre = EMAIL_ROLES[Object.keys(EMAIL_ROLES).find(k => EMAIL_ROLES[k].role === data.de)]?.displayName || 'Tu pareja';
    showPokeToast(`💕 ${nombre} está pensando en ti`);
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('Diario en Dúo', { body: `💕 ${nombre} está pensando en ti`, icon: '/icon-192.png' });
    }
  });
}

// ─────────────────────────────────────────────
// FECHAS IMPORTANTES
// ─────────────────────────────────────────────
const CUMPLEANOS = [
  // { nombre: 'Cumpleaños de Cilia', mes: 0, dia: 0 }, // pendiente de añadir
];

function proximaFecha(mes, dia) {
  const hoy = new Date();
  const y = hoy.getFullYear();
  let fecha = new Date(y, mes, dia);
  if (fecha < new Date(y, hoy.getMonth(), hoy.getDate())) fecha = new Date(y + 1, mes, dia);
  return fecha;
}

function proximoAniversarioMensual() {
  const hoy = new Date();
  let fecha = new Date(hoy.getFullYear(), hoy.getMonth(), 10);
  if (fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
    fecha = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 10);
  }
  return fecha;
}

function diasHasta(fecha) {
  const hoy = new Date();
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((b - a) / 86400000);
}

function fmtFecha(fecha) {
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

// ─────────────────────────────────────────────
// DÍAS JUNTOS — contador desde el inicio de la relación
// ─────────────────────────────────────────────
const INICIO_RELACION = new Date(2024, 1, 10); // 10 de febrero de 2024

function calcularTiempoJuntos() {
  const hoy = new Date();
  const inicio = INICIO_RELACION;
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioSinHora = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const totalDias = Math.round((hoySinHora - inicioSinHora) / 86400000);

  let years = hoy.getFullYear() - inicio.getFullYear();
  let months = hoy.getMonth() - inicio.getMonth();
  let days = hoy.getDate() - inicio.getDate();
  if (days < 0) {
    months--;
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    days += mesAnterior.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { totalDias, years, months, days };
}

function renderDiasJuntos() {
  const numEl = $('dias-juntos-numero');
  const detEl = $('dias-juntos-detalle');
  if (!numEl || !detEl) return;
  const t = calcularTiempoJuntos();
  numEl.textContent = t.totalDias.toLocaleString('es-ES');
  const partes = [];
  if (t.years > 0) partes.push(`${t.years} año${t.years === 1 ? '' : 's'}`);
  if (t.months > 0) partes.push(`${t.months} mes${t.months === 1 ? '' : 'es'}`);
  if (t.days > 0 || partes.length === 0) partes.push(`${t.days} día${t.days === 1 ? '' : 's'}`);
  detEl.textContent = partes.join(', ');
}

// ─────────────────────────────────────────────
// CALENDARIO — vista tipo calendario para las fechas importantes
// ─────────────────────────────────────────────
let calMonthOffset = 0;

function eventosDelMes(year, month) {
  // month: 0 = enero ... 11 = diciembre
  const eventos = [{ dia: 10, nombre: 'Aniversario mensual', emoji: '💞' }];
  if (month === 1) eventos.push({ dia: 14, nombre: 'San Valentín', emoji: '💘' });
  if (month === 8) eventos.push({ dia: 21, nombre: 'Día de las Flores Amarillas', emoji: '🌼' });
  CUMPLEANOS.forEach(c => {
    if (c.mes === month) eventos.push({ dia: c.dia, nombre: c.nombre, emoji: '🎂' });
  });
  return eventos;
}

function renderCalendar() {
  const grid = $('calendar-grid');
  const label = $('cal-month-label');
  if (!grid || !label) return;

  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth() + calMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const nombresMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  label.textContent = `${nombresMes[month]} ${year}`;

  const eventosPorDia = {};
  eventosDelMes(year, month).forEach(ev => {
    (eventosPorDia[ev.dia] = eventosPorDia[ev.dia] || []).push(ev);
  });

  const primerDia = new Date(year, month, 1);
  let inicio = primerDia.getDay() - 1; // semana empieza en lunes
  if (inicio < 0) inicio = 6;
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const esMesActual = hoy.getFullYear() === year && hoy.getMonth() === month;

  let html = '';
  for (let i = 0; i < inicio; i++) html += `<div class="cal-cell cal-cell-empty"></div>`;
  for (let d = 1; d <= diasEnMes; d++) {
    const evs = eventosPorDia[d];
    const esHoy = esMesActual && hoy.getDate() === d;
    let clases = 'cal-cell';
    if (esHoy) clases += ' cal-cell-today';
    if (evs) clases += ' cal-cell-event';
    const puntos = evs
      ? `<div class="cal-day-events">${evs.map(e => `<span class="cal-dot" title="${e.nombre}">${e.emoji}</span>`).join('')}</div>`
      : '';
    html += `<div class="${clases}"><span class="cal-day-num">${d}</span>${puntos}</div>`;
  }
  grid.innerHTML = html;
}

function setupCalendar() {
  $('cal-prev')?.addEventListener('click', () => { calMonthOffset--; renderCalendar(); });
  $('cal-next')?.addEventListener('click', () => { calMonthOffset++; renderCalendar(); });
}

function loadFechasImportantes() {
  const list = $('fechas-list');
  if (!list) return;
  const eventos = [
    { nombre: 'Aniversario mensual', fecha: proximoAniversarioMensual(), emoji: '💞' },
    { nombre: 'San Valentín', fecha: proximaFecha(1, 14), emoji: '💘' },
    { nombre: 'Día de las Flores Amarillas', fecha: proximaFecha(8, 21), emoji: '🌼' },
    ...CUMPLEANOS.map(c => ({ nombre: c.nombre, fecha: proximaFecha(c.mes, c.dia), emoji: '🎂' }))
  ];
  eventos.sort((a, b) => a.fecha - b.fecha);
  list.innerHTML = eventos.map(ev => {
    const d = diasHasta(ev.fecha);
    const cuando = d === 0 ? '¡Hoy!' : d === 1 ? 'Mañana' : `En ${d} días`;
    return `
      <div class="fecha-card">
        <div class="fecha-emoji">${ev.emoji}</div>
        <div class="fecha-info">
          <div class="fecha-nombre">${ev.nombre}</div>
          <div class="fecha-detalle">${fmtFecha(ev.fecha)} · ${cuando}</div>
        </div>
      </div>`;
  }).join('') || '<p class="empty-state">Sin fechas configuradas todavía.</p>';
}

// ─────────────────────────────────────────────
// RECOMENDACIÓN CRUZADA
// ─────────────────────────────────────────────
async function loadRecommendation() {
  try {
    const snap = await getDocs(wishesRef());
    const partnerWishes = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.autor === currentRole.partner) partnerWishes.push(data.texto);
    });
    const card = $('recommendation-card');
    if (partnerWishes.length === 0) {
      card.style.display = 'none';
      return;
    }
    const pick = partnerWishes[Math.floor(Math.random() * partnerWishes.length)];
    $('rec-text').textContent = pick;
    card.style.display = 'flex';
  } catch (e) {
    $('recommendation-card').style.display = 'none';
  }
}

$('btn-rec-refresh')?.addEventListener('click', loadRecommendation);

// ─────────────────────────────────────────────
// DATOS DE PRUEBA (solo cuenta demo)
// ─────────────────────────────────────────────
async function seedDemoData() {
  try {
    const snap = await getDocs(wishesRef());
    if (!snap.empty) return; // ya tiene datos, no volver a sembrar

    const ejemplos = [
      'Ir a ver una peli al cine un finde',
      'Que me traigas el desayuno un domingo',
      'Una escapada de un fin de semana a la montaña'
    ];
    for (const texto of ejemplos) {
      await addDoc(wishesRef(), { autor: 'cilia', texto, creado: new Date().toISOString() });
    }

    const entryRef = doc(db, 'parejas', currentRole.parejaId, 'entradas', new Date().toISOString().slice(0, 10));
    await setDoc(entryRef, {
      date: new Date().toISOString().slice(0, 10),
      names: { n1: 'Fahd', n2: 'Cilia' },
      p1: { sentimiento: 'Contento, con ganas de plan', gracias: 'Por escucharme ayer', pendiente: '' },
      p2: { sentimiento: 'Cansada pero bien', gracias: 'Por la sorpresa del café', pendiente: '' },
      shared: { hacer: 'Cenar fuera este finde', recuerdo: 'El paseo del sábado', sueno: 'Viajar juntos el año que viene', logro: 'Terminar de montar la app' },
      savedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    // si falla el sembrado no bloqueamos el resto de la app
  }
}

// ─────────────────────────────────────────────
// PWA: registro del Service Worker
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
