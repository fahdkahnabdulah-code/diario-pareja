// ─────────────────────────────────────────────
// PASO 1: Pega aquí tu configuración de Firebase
// (la encontrarás en Firebase Console → Configuración del proyecto → Tu app web)
// ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "PEGA_AQUI_TU_API_KEY",
  authDomain:        "PEGA_AQUI_TU_AUTH_DOMAIN",
  projectId:         "PEGA_AQUI_TU_PROJECT_ID",
  storageBucket:     "PEGA_AQUI_TU_STORAGE_BUCKET",
  messagingSenderId: "PEGA_AQUI_TU_MESSAGING_SENDER_ID",
  appId:             "PEGA_AQUI_TU_APP_ID"
};

// ─────────────────────────────────────────────
// Inicialización Firebase
// ─────────────────────────────────────────────
const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

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
  const email = $('login-email').value.trim();
  const pass  = $('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    setMsg('login-error', 'Correo o contraseña incorrectos.', '#a32d2d');
  }
});

$('btn-register').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const pass  = $('login-password').value;
  if (pass.length < 6) { setMsg('login-error', 'La contraseña debe tener al menos 6 caracteres.', '#a32d2d'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    setMsg('login-error', 'No se pudo crear la cuenta. ¿El correo ya existe?', '#a32d2d');
  }
});

$('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    showScreen('app');
    initApp();
  } else {
    showScreen('login');
  }
});

// ─────────────────────────────────────────────
// Inicialización de la app tras login
// ─────────────────────────────────────────────
function initApp() {
  setTodayDate();
  setupAvatars();
  setupTabs();
  setupSaveExport();
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
// Recoger datos del formulario
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
// Guardar en Firestore
// ─────────────────────────────────────────────
async function saveEntry() {
  const data = getFormData();
  if (!data.date) { setMsg('save-msg', 'Selecciona una fecha primero.', '#a32d2d'); return; }
  try {
    const user  = auth.currentUser;
    const ref   = doc(db, 'parejas', user.uid, 'entradas', data.date);
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
    const user = auth.currentUser;
    const ref  = collection(db, 'parejas', user.uid, 'entradas');
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

// ─────────────────────────────────────────────
// Cargar entrada en el formulario
// ─────────────────────────────────────────────
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
// PWA: registro del Service Worker
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
