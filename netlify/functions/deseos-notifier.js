// ─────────────────────────────────────────────
// Función programada (cron, cada 30 minutos): avisos de las llaves de deseos.
//  - Lunes, desde las 10:00 (Madrid): llega la 1ª llave de la semana.
//  - Jueves, desde las 10:00: llega la 2ª llave.
//    (aviso solo si le queda alguna llave sin usar y su pareja tiene deseos bloqueados)
//  - Sábado, desde las 12:00: recordatorio a quien tiene un deseo desbloqueado
//    y aún no lo ha marcado como hecho (sin decir cuál).
// Cada aviso se apunta en parejas/<id>/avisos para no repetirse.
// Las llaves se calculan igual que en deseos.js (desbloqueadoPor + desbloqueadoSemana).
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

// Lógica pura. deseos: [{id,autor,estado,apuntadoPor,desbloqueadoPor,desbloqueadoSemana,…}]
function calcularAvisos(fecha, hora, deseos) {
  const semana = semanaIso(fecha), dia = diaSemana(fecha), out = [];
  const llavesTotales = dia >= 3 ? 2 : 1;
  const enLlave = (dia === 0 && hora >= 10) || (dia === 3 && hora >= 10);
  if (enLlave) {
    for (const rol of ROLES) {
      const usadas = deseos.filter(w => w.autor === otro(rol) && w.desbloqueadoPor === rol && w.desbloqueadoSemana === semana).length;
      const libres = llavesTotales - usadas;
      const hayBloqueados = deseos.some(w => w.autor === otro(rol) && estadoDe(w) === 'pendiente');
      if (libres > 0 && hayBloqueados) {
        out.push({
          key: `deseo-llave${dia === 0 ? 1 : 2}_${semana}_${rol}`, rol, tag: 'deseo-llave',
          body: libres === 1 ? '🔑 Tienes una llave para desbloquear un deseo de tu pareja' : '🔑 Tienes 2 llaves para desbloquear deseos de tu pareja'
        });
      }
    }
  }
  if (dia === 5 && hora >= 12) {
    for (const w of deseos) {
      if (estadoDe(w) === 'enmarcha' && w.apuntadoPor && ROLES.includes(w.apuntadoPor) && w.autor !== w.apuntadoPor) {
        out.push({ key: `deseo-recordatorio_${semana}_${w.id}`, rol: w.apuntadoPor, tag: 'deseo-recordatorio', body: '🎁 Tienes un deseo desbloqueado por cumplir. ¿Lo haces este finde?' });
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
    if (!((dia === 0 && hora >= 10) || (dia === 3 && hora >= 10) || (dia === 5 && hora >= 12))) return { statusCode: 200, body: 'hoy no hay avisos de deseos' };

    const admin = require('firebase-admin');
    const webpush = require('web-push');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const db = admin.firestore();

    const deseos = [];
    (await db.collection(`parejas/${PAREJA_ID}/deseos`).get()).forEach(d => deseos.push({ id: d.id, ...d.data() }));
    const subs = {};
    let enviados = 0;
    for (const a of calcularAvisos(fecha, hora, deseos)) {
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
