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
  getDocs, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAmU2l0p_o1JGeDkereu3uUFDhAVpEYlAw",
  authDomain:        "planning-with-ai-7a738.firebaseapp.com",
  projectId:         "planning-with-ai-7a738",
  storageBucket:     "planning-with-ai-7a738.firebasestorage.app",
  messagingSenderId: "686867753267",
  appId:             "1:686867753267:web:1c3b67cd135494b711f646"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// ─────────────────────────────────────────────
// Roles fijos — solo estos correos tienen acceso
// ─────────────────────────────────────────────
const EMAIL_ROLES = {
  'ciliagomezalba@gmail.com':  { role: 'cilia', partner: 'fahd',  parejaId: 'nuestra-pareja', displayName: 'Cilia' },
  'fahdkahnabdulah@gmail.com': { role: 'fahd',  partner: 'cilia', parejaId: 'nuestra-pareja', displayName: 'Fahd' },
  'prueba@test.com':           { role: 'fahd',  partner: 'cilia', parejaId: 'demo',           displayName: 'Cuenta de prueba' }
};

let currentRole = null; // se rellena en onAuthStateChanged

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
  const pass  = $('login-password').value;
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
  const pass  = $('login-password').value;
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
  if (currentRole.parejaId === 'demo') await seedDemoData();
  loadRecommendation();
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
      gracias:     $('p1_gracias').value,
      pendiente:   $('p1_pendiente').value
    },
    p2: {
      sentimiento: $('p2_sentimiento').value,
      gracias:     $('p2_gracias').value,
      pendiente:   $('p2_pendiente').value
    },
    shared: {
      hacer:    $('shared_hacer').value,
      recuerdo: $('shared_recuerdo').value,
      sueno:    $('shared_sueno').value,
      logro:    $('shared_logro').value
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
  } catch (e) {
    setMsg('save-msg', 'Error al guardar. Comprueba tu conexión.', '#a32d2d');
  }
}

// ─────────────────────────────────────────────
// Exportar a texto plano
// ─────────────────────────────────────────────
function exportEntry() {
  const d    = getFormData();
  const n1   = d.names.n1 || 'Persona 1';
  const n2   = d.names.n2 || 'Persona 2';
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
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
    const ref  = collection(db, 'parejas', currentRole.parejaId, 'entradas');
    const q    = query(ref, orderBy('date', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<p class="empty-state">Aún no hay entradas guardadas.</p>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(docSnap => {
      const e    = docSnap.data();
      const card = document.createElement('div');
      card.className = 'entry-card';

      const n1      = e.names?.n1 || '';
      const n2      = e.names?.n2 || '';
      const preview = e.p1?.sentimiento || e.shared?.hacer || '';

      card.innerHTML = `
        <div class="entry-date">${e.date}</div>
        <div class="entry-names">${[n1, n2].filter(Boolean).join(' & ')}</div>
        <div class="entry-preview">${preview || 'Sin texto'}</div>
      `;
      card.addEventListener('click', () => loadEntry(e));
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Error al cargar. Comprueba tu conexión.</p>';
  }
}

function loadEntry(e) {
  $('entry-date').value       = e.date || '';
  $('name1').value            = e.names?.n1 || '';
  $('name2').value            = e.names?.n2 || '';
  $('av1').textContent        = e.names?.n1?.[0]?.toUpperCase() || '?';
  $('av2').textContent        = e.names?.n2?.[0]?.toUpperCase() || '?';
  $('p1_sentimiento').value   = e.p1?.sentimiento || '';
  $('p1_gracias').value       = e.p1?.gracias || '';
  $('p1_pendiente').value     = e.p1?.pendiente || '';
  $('p2_sentimiento').value   = e.p2?.sentimiento || '';
  $('p2_gracias').value       = e.p2?.gracias || '';
  $('p2_pendiente').value     = e.p2?.pendiente || '';
  $('shared_hacer').value     = e.shared?.hacer || '';
  $('shared_recuerdo').value  = e.shared?.recuerdo || '';
  $('shared_sueno').value     = e.shared?.sueno || '';
  $('shared_logro').value     = e.shared?.logro || '';
  showTab('nueva');
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
