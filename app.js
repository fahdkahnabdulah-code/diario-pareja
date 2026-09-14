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
  'ciliagomezalba@gmail.com': { role: 'cilia', partner: 'fahd', parejaId: 'nuestra-pareja', displayName: 'Alba' },
  'fahdkahnabdulah@gmail.com': { role: 'fahd', partner: 'cilia', parejaId: 'nuestra-pareja', displayName: 'Abdu' },
  'prueba@test.com': { role: 'fahd', partner: 'cilia', parejaId: 'demo', displayName: 'Cuenta de prueba' }
};

function nombrePorRol(rol) {
  const info = Object.values(EMAIL_ROLES).find(r => r.role === rol);
  return info?.displayName || '';
}

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
  if (name === 'fechas') {
    calMonthOffset = 0;
    renderDiasJuntos();
    renderCalendar();
    loadFechasImportantes();
    loadEventosCustom().then(() => { renderCalendar(); loadFechasImportantes(); });
  }
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
  prefillNames();
  setupAvatars();
  setupTabs();
  setupSaveExport();
  setupWishes();
  setupWishesModal();
  setupPoke();
  setupCalendar();
  setupEventos();
  setupAutoGrowTextareas();
  requestNotificationPermission();
  if (currentRole.parejaId === 'demo') await seedDemoData();
  loadRecommendation();
  loadRacha();
}

// ─────────────────────────────────────────────
// Nombres por defecto según la cuenta (tú siempre a la izquierda)
// ─────────────────────────────────────────────
function prefillNames() {
  const nombreSelf = currentRole.displayName || '';
  const nombrePartner = nombrePorRol(currentRole.partner);
  $('name-self').value = nombreSelf;
  $('name-partner').value = nombrePartner;
  $('avatar-self').textContent = nombreSelf ? nombreSelf[0].toUpperCase() : '?';
  $('avatar-partner').textContent = nombrePartner ? nombrePartner[0].toUpperCase() : '?';
}

// ─────────────────────────────────────────────
// Textareas que crecen solas con el contenido
// ─────────────────────────────────────────────
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight, 72) + 'px';
}

function setupAutoGrowTextareas() {
  document.querySelectorAll('textarea').forEach(t => {
    t.addEventListener('input', () => autoGrow(t));
  });
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
  ['name-self', 'name-partner'].forEach(id => {
    const avId = id === 'name-self' ? 'avatar-self' : 'avatar-partner';
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
    nombreSelf: $('name-self').value.trim(),
    nombrePartner: $('name-partner').value.trim(),
    self: {
      sentimiento: $('self_sentimiento').value,
      gracias: $('self_gracias').value,
      pendiente: $('self_pendiente').value
    },
    partner: {
      sentimiento: $('partner_sentimiento').value,
      gracias: $('partner_gracias').value,
      pendiente: $('partner_pendiente').value
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

// Datos de una entrada (nueva o antigua) vistos desde el rol actual:
// siempre devuelve { nombreSelf, nombrePartner, self, partner } sin importar
// qué cuenta guardó qué — así cada uno ve siempre su lado a la izquierda.
function entradaSegunRol(e) {
  const selfRole = currentRole.role;
  const partnerRole = currentRole.partner;
  if (e.respuestas) {
    return {
      nombreSelf: e.autores?.[selfRole] || nombrePorRol(selfRole),
      nombrePartner: e.autores?.[partnerRole] || nombrePorRol(partnerRole),
      self: e.respuestas[selfRole] || {},
      partner: e.respuestas[partnerRole] || {}
    };
  }
  // Formato antiguo (posición fija p1/p2, sin rol) — se muestra tal cual quedó guardado
  return {
    nombreSelf: e.names?.n1 || '',
    nombrePartner: e.names?.n2 || '',
    self: e.p1 || {},
    partner: e.p2 || {}
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
    // Solo se escribe el propio lado (y lo compartido) para no pisar lo que
    // haya guardado ya la otra persona en esta misma fecha.
    await setDoc(ref, {
      date: data.date,
      autores: { [currentRole.role]: data.nombreSelf },
      respuestas: { [currentRole.role]: data.self },
      shared: data.shared,
      savedAt: data.savedAt
    }, { merge: true });
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
  const n1 = d.nombreSelf || 'Persona 1';
  const n2 = d.nombrePartner || 'Persona 2';
  const text = [
    `Diario de pareja — ${d.date}`,
    ``,
    `=== ${n1} ===`,
    `Cómo me siento: ${d.self.sentimiento || '—'}`,
    `Te agradezco: ${d.self.gracias || '—'}`,
    `Algo que quiero decirte: ${d.self.pendiente || '—'}`,
    ``,
    `=== ${n2} ===`,
    `Cómo me siento: ${d.partner.sentimiento || '—'}`,
    `Te agradezco: ${d.partner.gracias || '—'}`,
    `Algo que quiero decirte: ${d.partner.pendiente || '—'}`,
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

      const { nombreSelf: n1, nombrePartner: n2, self } = entradaSegunRol(e);
      const preview = self.sentimiento || e.shared?.hacer || '';

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
  const { nombreSelf, nombrePartner, self, partner } = entradaSegunRol(e);
  $('entry-date').value = e.date || '';
  $('name-self').value = nombreSelf;
  $('name-partner').value = nombrePartner;
  $('avatar-self').textContent = nombreSelf?.[0]?.toUpperCase() || '?';
  $('avatar-partner').textContent = nombrePartner?.[0]?.toUpperCase() || '?';
  $('self_sentimiento').value = self.sentimiento || '';
  $('self_gracias').value = self.gracias || '';
  $('self_pendiente').value = self.pendiente || '';
  $('partner_sentimiento').value = partner.sentimiento || '';
  $('partner_gracias').value = partner.gracias || '';
  $('partner_pendiente').value = partner.pendiente || '';
  $('shared_hacer').value = e.shared?.hacer || '';
  $('shared_recuerdo').value = e.shared?.recuerdo || '';
  $('shared_sueno').value = e.shared?.sueno || '';
  $('shared_logro').value = e.shared?.logro || '';
  showTab('nueva');
  document.querySelectorAll('#tab-nueva textarea').forEach(autoGrow);
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

// La mascota va evolucionando con las semanas seguidas de racha (estilo "Pou")
const ETAPAS_MASCOTA = [
  { min: 0,  nombre: 'Recién nacido' },
  { min: 2,  nombre: 'Despierto' },
  { min: 4,  nombre: 'Feliz' },
  { min: 8,  nombre: 'Enamorado' },
  { min: 12, nombre: 'Alma gemela' },
];

function mascotaRacha(racha) {
  let idx = 0;
  ETAPAS_MASCOTA.forEach((e, i) => { if (racha >= e.min) idx = i; });
  return { ...ETAPAS_MASCOTA[idx], idx };
}

// ── Dibujo de la mascota en SVG (sin imágenes externas, evoluciona por etapas) ──
function mascotaCorazon(cx, cy, s, color) {
  const w = s, h = s;
  return `<path d="M ${cx} ${(cy + h * 0.35).toFixed(2)} C ${(cx - w).toFixed(2)} ${(cy - h * 0.55).toFixed(2)} ${(cx - w * 1.5).toFixed(2)} ${(cy + h * 0.45).toFixed(2)} ${cx} ${(cy + h * 1.3).toFixed(2)} C ${(cx + w * 1.5).toFixed(2)} ${(cy + h * 0.45).toFixed(2)} ${(cx + w).toFixed(2)} ${(cy - h * 0.55).toFixed(2)} ${cx} ${(cy + h * 0.35).toFixed(2)} Z" fill="${color}"/>`;
}

function mascotaFlor(cx, cy, scale, petalo, borde, centro) {
  const pts = [[0, -3.6], [3.42, -1.11], [2.12, 2.91], [-2.12, 2.91], [-3.42, -1.11]];
  const rPetalo = (3 * scale).toFixed(2);
  const rCentro = (2.2 * scale).toFixed(2);
  const petalos = pts.map(([dx, dy]) =>
    `<circle cx="${(cx + dx * scale).toFixed(2)}" cy="${(cy + dy * scale).toFixed(2)}" r="${rPetalo}" fill="${petalo}" stroke="${borde}" stroke-width="0.6"/>`
  ).join('');
  return `${petalos}<circle cx="${cx}" cy="${cy}" r="${rCentro}" fill="${centro}"/>`;
}

function mascotaOjosAbiertos(color) {
  return `<g class="mascota-ojos"><circle cx="24" cy="31" r="3.1" fill="${color}"/><circle cx="25" cy="29.8" r="1" fill="#fff"/><circle cx="40" cy="31" r="3.1" fill="${color}"/><circle cx="41" cy="29.8" r="1" fill="#fff"/></g>`;
}

function mascotaOjosCorazon(color) {
  return `<g class="mascota-ojos">${mascotaCorazon(24, 30, 2.6, color)}${mascotaCorazon(40, 30, 2.6, color)}</g>`;
}

function mascotaSVG(idx) {
  const cuerpos = ['#f6d9e3', '#f2c2d4', '#eba9c4', '#e08cae', '#cf6a91'];
  const bordes  = ['#e3a9c2', '#d1789f', '#b8567f', '#993556', '#7a1f3d'];
  let fondo = '', cara = '', decoracion = '';

  if (idx === 0) {
    cara = `<path d="M19 30 q5 5 10 0" stroke="#99415f" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M35 30 q5 5 10 0" stroke="#99415f" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="42" rx="2" ry="1.6" fill="#99415f" opacity=".5"/>`;
  } else if (idx === 1) {
    cara = `${mascotaOjosAbiertos('#5b2233')}<path d="M27 41 Q32 45 37 41" stroke="#7a2e46" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else if (idx === 2) {
    cara = `<ellipse cx="19" cy="39" rx="4" ry="2.5" fill="#ffb3c6" opacity=".6"/><ellipse cx="45" cy="39" rx="4" ry="2.5" fill="#ffb3c6" opacity=".6"/>${mascotaOjosAbiertos('#5b2233')}<path d="M25 41 Q32 47 39 41" stroke="#7a2e46" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    decoracion = `<line x1="32" y1="19" x2="32" y2="13" stroke="#6fae6f" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="11" r="3.4" fill="#e78fb0" stroke="#c9698f" stroke-width="1"/>`;
  } else if (idx === 3) {
    cara = `<ellipse cx="18" cy="39" rx="4.3" ry="2.7" fill="#ff9dbd" opacity=".7"/><ellipse cx="46" cy="39" rx="4.3" ry="2.7" fill="#ff9dbd" opacity=".7"/>${mascotaOjosAbiertos('#5b2233')}<path d="M24 41 Q32 48 40 41" stroke="#7a2e46" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    decoracion = `<line x1="32" y1="18" x2="32" y2="12" stroke="#6fae6f" stroke-width="2" stroke-linecap="round"/>${mascotaFlor(32, 10, 1, '#ffd9e6', '#c9698f', '#f5c451')}${mascotaCorazon(53, 20, 2.6, '#e0607f')}`;
  } else {
    fondo = `<circle cx="32" cy="38" r="24" fill="#f5c451" opacity=".28" class="mascota-brillo" style="filter:blur(4px)"/>`;
    cara = `<ellipse cx="17" cy="40" rx="4.6" ry="2.9" fill="#ff7fa8" opacity=".75"/><ellipse cx="47" cy="40" rx="4.6" ry="2.9" fill="#ff7fa8" opacity=".75"/>${mascotaOjosCorazon('#7a1f3d')}<path d="M23 41 Q32 49 41 41" stroke="#5c1530" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    decoracion = `<line x1="18" y1="17" x2="16" y2="11" stroke="#6fae6f" stroke-width="1.8" stroke-linecap="round"/><line x1="46" y1="17" x2="48" y2="11" stroke="#6fae6f" stroke-width="1.8" stroke-linecap="round"/><line x1="32" y1="16" x2="32" y2="9" stroke="#6fae6f" stroke-width="1.8" stroke-linecap="round"/>${mascotaFlor(16, 9, 0.75, '#ffd9e6', '#c9698f', '#f5c451')}${mascotaFlor(32, 7, 0.85, '#ffd9e6', '#c9698f', '#f5c451')}${mascotaFlor(48, 9, 0.75, '#ffd9e6', '#c9698f', '#f5c451')}${mascotaCorazon(55, 24, 2.4, '#e0607f')}${mascotaCorazon(9, 24, 2.2, '#e0607f')}`;
  }

  const cuerpo = `<ellipse cx="32" cy="38" rx="22" ry="19" fill="${cuerpos[idx]}" stroke="${bordes[idx]}" stroke-width="2"/>`;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${fondo}${cuerpo}${cara}${decoracion}</svg>`;
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
    if (racha > 0) {
      const etapa = mascotaRacha(racha);
      el.innerHTML = `<span class="mascota-icon">${mascotaSVG(etapa.idx)}</span><span class="mascota-texto">${racha} semana${racha === 1 ? '' : 's'} seguida${racha === 1 ? '' : 's'}</span>`;
      el.title = `${etapa.nombre} — vuestra mascota crece con cada semana seguida`;
    } else {
      el.innerHTML = '';
      el.title = '';
    }
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

// El buzón de deseos vive en un modal (no una pestaña propia) — se abre desde
// el icono 💭 del header y se puede cerrar con la X o tocando fuera de la tarjeta.
function setupWishesModal() {
  const modal = $('modal-deseos');
  $('btn-wishes')?.addEventListener('click', () => {
    if (!modal) return;
    modal.hidden = false;
    loadMyWishes();
  });
  $('btn-close-deseos')?.addEventListener('click', () => {
    if (modal) modal.hidden = true;
  });
  modal?.addEventListener('click', (ev) => {
    if (ev.target === modal) modal.hidden = true;
  });
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
      new Notification('+Dopamina', { body: `💕 ${nombre} está pensando en ti`, icon: '/icon-192.png' });
    }
  });
}

// ─────────────────────────────────────────────
// FECHAS IMPORTANTES
// ─────────────────────────────────────────────
const CUMPLEANOS = [
  // { nombre: 'Cumpleaños de Cilia', mes: 0, dia: 0 }, // pendiente de añadir
];

// ── Eventos personalizados (creados desde la app, guardados en Firestore) ──
let eventosCustomCache = [];

function eventosRef() {
  return collection(db, 'parejas', currentRole.parejaId, 'eventos');
}

async function loadEventosCustom() {
  try {
    const snap = await getDocs(eventosRef());
    const propios = [];
    snap.forEach(d => propios.push({ id: d.id, ...d.data() }));
    eventosCustomCache = propios;
  } catch (e) {
    eventosCustomCache = [];
  }
}

function eventosVisiblesParaMi() {
  return eventosCustomCache.filter(ev => ev.visibilidad !== 'propio' || ev.autor === currentRole.role);
}

// Días del mes (year, month) en los que cae un evento personalizado, según su frecuencia
function diasDelEventoEnMes(ev, year, month) {
  if (!ev.fecha) return [];
  const base = new Date(ev.fecha + 'T00:00:00');
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  if (ev.frecuencia === 'unico') {
    return (base.getFullYear() === year && base.getMonth() === month) ? [base.getDate()] : [];
  }
  if (ev.frecuencia === 'anual') {
    return (base.getMonth() === month) ? [Math.min(base.getDate(), diasEnMes)] : [];
  }
  if (ev.frecuencia === 'mensual') {
    return [Math.min(base.getDate(), diasEnMes)];
  }
  if (ev.frecuencia === 'semanal') {
    const targetDow = base.getDay();
    const dias = [];
    for (let d = 1; d <= diasEnMes; d++) {
      if (new Date(year, month, d).getDay() === targetDow) dias.push(d);
    }
    return dias;
  }
  return [];
}

// Próxima fecha (a partir de hoy) en la que cae un evento personalizado
function proximaOcurrenciaEvento(ev) {
  const base = new Date(ev.fecha + 'T00:00:00');
  const hoy = new Date();
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (ev.frecuencia === 'unico') return base;
  if (ev.frecuencia === 'anual') return proximaFecha(base.getMonth(), base.getDate());
  if (ev.frecuencia === 'mensual') {
    let candidata = new Date(hoy.getFullYear(), hoy.getMonth(), base.getDate());
    if (candidata < hoySinHora) candidata = new Date(hoy.getFullYear(), hoy.getMonth() + 1, base.getDate());
    return candidata;
  }
  if (ev.frecuencia === 'semanal') {
    const targetDow = base.getDay();
    let candidata = new Date(hoySinHora);
    while (candidata.getDay() !== targetDow) candidata.setDate(candidata.getDate() + 1);
    return candidata;
  }
  return base;
}

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
  eventosVisiblesParaMi().forEach(ev => {
    diasDelEventoEnMes(ev, year, month).forEach(dia => {
      eventos.push({ dia, nombre: ev.nombre, emoji: ev.emoji || '⭐' });
    });
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
    let contenido = '';
    let tituloAttr = '';
    if (evs) {
      const principal = evs[0];
      const extra = evs.length - 1;
      const tooltip = evs.map(e => e.nombre).join(' · ');
      tituloAttr = ` title="${tooltip.replace(/"/g, '&quot;')}"`;
      contenido = `<div class="cal-day-events"><span class="cal-event-chip"><span class="cal-event-emoji">${principal.emoji}</span><span class="cal-event-text">${escapeHtml(principal.nombre)}</span></span>${extra > 0 ? `<span class="cal-event-extra">+${extra}</span>` : ''}</div>`;
    }
    html += `<div class="${clases}"${tituloAttr}><span class="cal-day-num">${d}</span>${contenido}</div>`;
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
  eventosVisiblesParaMi().forEach(ev => {
    const fecha = proximaOcurrenciaEvento(ev);
    if (ev.frecuencia === 'unico' && diasHasta(fecha) < 0) return; // eventos puntuales ya pasados
    eventos.push({
      nombre: ev.nombre,
      fecha,
      emoji: ev.emoji || '⭐',
      customId: ev.id,
      propio: ev.visibilidad === 'propio'
    });
  });
  eventos.sort((a, b) => a.fecha - b.fecha);
  list.innerHTML = eventos.map(ev => {
    const d = diasHasta(ev.fecha);
    const cuando = d === 0 ? '¡Hoy!' : d === 1 ? 'Mañana' : `En ${d} días`;
    const etiqueta = ev.propio ? ' <span class="fecha-tag">solo yo</span>' : '';
    const borrar = ev.customId ? `<button class="btn-delete-evento" data-id="${ev.customId}" title="Eliminar evento">✕</button>` : '';
    return `
      <div class="fecha-card">
        <div class="fecha-emoji">${ev.emoji}</div>
        <div class="fecha-info">
          <div class="fecha-nombre">${ev.nombre}${etiqueta}</div>
          <div class="fecha-detalle">${fmtFecha(ev.fecha)} · ${cuando}</div>
        </div>
        ${borrar}
      </div>`;
  }).join('') || '<p class="empty-state">Sin fechas configuradas todavía.</p>';
  wireEventoDeleteButtons();
}

function wireEventoDeleteButtons() {
  document.querySelectorAll('.btn-delete-evento').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!id) return;
      try {
        await deleteDoc(doc(db, 'parejas', currentRole.parejaId, 'eventos', id));
        await loadEventosCustom();
        renderCalendar();
        loadFechasImportantes();
      } catch (e) {
        // silencioso
      }
    });
  });
}

function setupEventos() {
  $('btn-add-evento')?.addEventListener('click', () => {
    const card = $('evento-form-card');
    card.style.display = card.style.display === 'none' ? 'flex' : 'none';
  });
  $('btn-evento-cancelar')?.addEventListener('click', () => {
    $('evento-form-card').style.display = 'none';
  });
  $('btn-evento-guardar')?.addEventListener('click', async () => {
    const nombre = $('evento-nombre').value.trim();
    const fecha = $('evento-fecha').value;
    if (!nombre || !fecha) return;
    const frecuencia = $('evento-frecuencia').value;
    const visibilidad = $('evento-visibilidad').value;
    const emoji = $('evento-emoji').value.trim() || '⭐';
    try {
      await addDoc(eventosRef(), {
        nombre, fecha, frecuencia, visibilidad, emoji,
        autor: currentRole.role,
        creado: new Date().toISOString()
      });
      $('evento-nombre').value = '';
      $('evento-fecha').value = '';
      $('evento-emoji').value = '';
      $('evento-frecuencia').value = 'unico';
      $('evento-visibilidad').value = 'compartido';
      $('evento-form-card').style.display = 'none';
      await loadEventosCustom();
      renderCalendar();
      loadFechasImportantes();
    } catch (e) {
      // silencioso
    }
  });
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
