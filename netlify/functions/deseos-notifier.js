// ─────────────────────────────────────────────
// Función programada (cron, cada 30 minutos): avisos de la misión semanal de deseos.
//  - Lunes, desde las 10:00 (Madrid): "Nueva misión de deseo" a quien aún no ha sacado
//    la de esta semana y cuya pareja tiene deseos pendientes.
//  - Jueves, desde las 18:00 (Madrid): recordatorio a quien se apuntó un deseo y no lo
//    ha marcado como hecho (sin decir cuál, por si es sorpresa).
// Cada aviso se apunta en parejas/<id>/avisos para no repetirse.
// Necesita FIREBASE_SERVICE_ACCOUNT y las VAPID_*; sin ellas no hace nada.
// ─────────────────────────────────────────────
const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const ROLES = ['fahd', 'cilia'];
const otro = r => (r === 'fahd' ? 'cilia' : 'fahd');

function ahoraMadrid(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(ahora);
  const g = t => partes.find(p => p.type === t).value;
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, hora: parseInt(g('hour'), 10) };
}
// Misma semana ISO que isoWeekKey() de app.js
function semanaIso(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function diaSemana(fecha) { // 0 = lunes … 6 = domingo
  const [y, m, d] = fecha.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
function estadoDe(w) { return w.estado || (w.cumplido ? 'hecho' : 'pendiente'); }

// Lógica pura. deseos: [{id,autor,estado,apuntadoPor,…}], sorteos: { rol: {semana} }
function calcularAvisos(fecha, hora, deseos, sorteos) {
  const semana = semanaIso(fecha), dia = diaSemana(fecha), out = [];
  if (dia === 0 && hora >= 10) {
    for (const rol of ROLES) {
      const yaSaco = sorteos[rol] && sorteos[rol].semana === semana;
      const hayPendientes = deseos.some(w => w.autor === otro(rol) && estadoDe(w) === 'pendiente');
      if (!yaSaco && hayPendientes) {
        out.push({ key: `deseo-lunes_${semana}_${rol}`, rol, tag: 'deseo-mision', body: '🎲 Nueva misión de deseo disponible: saca el de esta semana' });
      }
    }
  }
  if (dia === 3 && hora >= 18) {
    for (const w of deseos) {
      if (estadoDe(w) === 'enmarcha' && w.apuntadoPor && ROLES.includes(w.apuntadoPor)) {
        out.push({ key: `deseo-recordatorio_${semana}_${w.id}`, rol: w.apuntadoPor, tag: 'deseo-recordatorio', body: '🎁 Te queda un deseo por cumplir esta semana. ¡Todavía llegas!' });
      }
    }
  }
  return out;
}

exports.calcularAvisos = calcularAvisos;
exports.semanaIso = semanaIso;
exports.ahoraMadrid = ahoraMadrid;

exports.handler = async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@example.com';
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { statusCode: 200, body: 'no-op: falta FIREBASE_SERVICE_ACCOUNT o las variables VAPID en Netlify' };
  }
  try {
    const { fecha, hora } = ahoraMadrid();
    const dia = diaSemana(fecha);
    if (!((dia === 0 && hora >= 10) || (dia === 3 && hora >= 18))) return { statusCode: 200, body: 'hoy no hay avisos de deseos' };

    const admin = require('firebase-admin');
    const webpush = require('web-push');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const db = admin.firestore();

    const deseos = [];
    (await db.collection(`parejas/${PAREJA_ID}/deseos`).get()).forEach(d => deseos.push({ id: d.id, ...d.data() }));
    const sorteos = {};
    for (const rol of ROLES) {
      const s = await db.doc(`parejas/${PAREJA_ID}/deseo_semanal/${rol}`).get();
      if (s.exists) sorteos[rol] = s.data();
    }

    const subs = {};
    let enviados = 0;
    for (const a of calcularAvisos(fecha, hora, deseos, sorteos)) {
      const ref = db.doc(`parejas/${PAREJA_ID}/avisos/${a.key}`);
      if ((await ref.get()).exists) continue;
      if (!(a.rol in subs)) {
        const s = await db.doc(`parejas/${PAREJA_ID}/push_subs/${a.rol}`).get();
        subs[a.rol] = s.exists ? (s.data().sub || null) : null;
      }
      const sub = subs[a.rol];
      if (!sub || !sub.endpoint) continue; // sin notificaciones activadas: se avisará cuando las active
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title: '+Dopamina', body: a.body, tag: a.tag }), { TTL: 86400, urgency: 'high' });
        await ref.set({ enviadoEn: new Date().toISOString(), body: a.body });
        enviados++;
      } catch (e) { /* se reintenta en la siguiente pasada */ }
    }
    return { statusCode: 200, body: `avisos de deseos enviados: ${enviados}` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};
