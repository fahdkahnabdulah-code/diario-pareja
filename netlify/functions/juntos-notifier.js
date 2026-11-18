// ─────────────────────────────────────────────
// Función programada (cron, cada 30 minutos): la sección "Juntos" del diario
// solo se abre 1–2 días por semana (al azar pero espaciados). Si hoy toca y
// ya son las 18:00 en Madrid, manda un push a los dos y apunta en Firestore
// que ya se avisó, para no repetir.
// La elección de los días es la misma que hace ideas.js en la app (si se
// cambia una, hay que cambiar la otra).
// Necesita FIREBASE_SERVICE_ACCOUNT y las VAPID_* (igual que checkin-notifier).
// Sin ellas no hace nada (no-op seguro).
// ─────────────────────────────────────────────
const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const HORA_AVISO = 18; // a partir de las 18:00, hora de Madrid

// ── Qué días toca (idéntico a ideas.js) ──
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function semanaDe(dia) { return Math.floor((dia + 3) / 7); } // semanas de lunes a domingo
function diasJuntosSemana(semana) {
  const r = rng(semana * 7919 + 1234);
  if (r() < 0.5) return [1 + Math.floor(r() * 4)];
  return [Math.floor(r() * 3), 4 + Math.floor(r() * 2)];
}
function esDiaJuntos(dia) {
  return diasJuntosSemana(semanaDe(dia)).indexOf((dia + 3) % 7) >= 0;
}
function diaDeIso(iso) {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return Math.floor(Date.UTC(+p[1], +p[2] - 1, +p[3]) / 86400000);
}

// Fecha (YYYY-MM-DD) y hora actuales en Madrid
function ahoraMadrid(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(ahora);
  const g = t => partes.find(p => p.type === t).value;
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, hora: parseInt(g('hour'), 10) };
}

exports.esDiaJuntos = esDiaJuntos;
exports.diaDeIso = diaDeIso;
exports.ahoraMadrid = ahoraMadrid;

exports.handler = async () => {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@example.com';
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { statusCode: 200, body: 'no-op: falta FIREBASE_SERVICE_ACCOUNT o las variables VAPID en Netlify' };
  }
  try {
    const { fecha, hora } = ahoraMadrid();
    if (!esDiaJuntos(diaDeIso(fecha))) return { statusCode: 200, body: 'hoy no toca Juntos' };
    if (hora < HORA_AVISO) return { statusCode: 200, body: 'todavía no es la hora del aviso' };

    const admin = require('firebase-admin');
    const webpush = require('web-push');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const db = admin.firestore();
    const ref = db.doc(`parejas/${PAREJA_ID}/juntos/${fecha}`);
    const snap = await ref.get();
    if (snap.exists && snap.data().notificado) return { statusCode: 200, body: 'ya se avisó hoy' };

    const subsSnap = await db.collection(`parejas/${PAREJA_ID}/push_subs`).get();
    const payload = JSON.stringify({
      title: '+Dopamina',
      body: '✨ Hoy toca «Juntos»: planes, recuerdos y sueños para los dos',
      tag: 'juntos'
    });
    const envios = [];
    subsSnap.forEach(docSnap => {
      const sub = docSnap.data()?.sub;
      if (sub && sub.endpoint) {
        envios.push(webpush.sendNotification(sub, payload, { TTL: 86400, urgency: 'high' }).catch(() => {}));
      }
    });
    await Promise.all(envios);
    await ref.set({ notificado: true, enviadoEn: new Date().toISOString() }, { merge: true });
    return { statusCode: 200, body: `avisos enviados: ${envios.length}` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};
