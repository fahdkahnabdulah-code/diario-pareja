// ─────────────────────────────────────────────
// Función programada (cron, cada 10 minutos): revisa si ya llegó el momento
// del check-in de hoy y, si es así y aún no se avisó, manda un push real a
// los dos suscriptores (igual que el poke o la entrada completada) y marca
// notificado:true para no repetir el aviso.
// Necesita FIREBASE_SERVICE_ACCOUNT (para leer/escribir Firestore) y las
// mismas VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT que ya usa
// send-push.js. Sin alguna de las dos cosas, no hace nada (no-op seguro).
// ─────────────────────────────────────────────
const admin = require('firebase-admin');
const webpush = require('web-push');

const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@example.com';

let listo = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    listo = true;
  }
} catch (e) {
  listo = false;
}

const AVISO_MIN = 30; // el recordatorio sale cuando quedan ~30 min de la ventana de 2 h

// Envía a un rol y devuelve 'ok' o el motivo del fallo. Borra la suscripción si ya no existe (404/410).
async function enviarARol(db, rol, payload) {
  const ref = db.doc(`parejas/${PAREJA_ID}/push_subs/${rol}`);
  const s = await ref.get();
  const sub = s.exists && s.data() && s.data().sub;
  if (!sub || !sub.endpoint) return 'sin-suscripcion';
  try {
    await webpush.sendNotification(sub, payload);
    return 'ok';
  } catch (e) {
    const code = e && e.statusCode;
    if (code === 404 || code === 410) { await ref.delete().catch(() => {}); return 'suscripcion-caducada'; }
    return 'error-' + (code || 'red');
  }
}

exports.handler = async () => {
  if (!listo) {
    return { statusCode: 200, body: 'no-op: falta FIREBASE_SERVICE_ACCOUNT o las variables VAPID en Netlify' };
  }
  try {
    const db = admin.firestore();
    const dateKey = new Date().toISOString().slice(0, 10);
    const ref = db.doc(`parejas/${PAREJA_ID}/checkins/${dateKey}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return { statusCode: 200, body: 'no hay check-in programado para hoy todavía' };
    }
    const data = snap.data();
    const ahora = new Date();
    const momento = new Date(data.momento);
    if (ahora < momento) {
      return { statusCode: 200, body: 'todavía no toca' };
    }

    // 1) Aviso inicial: "es la hora"
    if (!data.notificado) {
      const payload = JSON.stringify({ title: '+Dopamina', body: '📸 ¡Es la hora de vuestra foto del día!', tag: 'checkin' });
      const resultado = {};
      for (const rol of ['fahd', 'cilia']) resultado[rol] = await enviarARol(db, rol, payload);
      await ref.set({ notificado: true, avisoInicial: { en: ahora.toISOString(), ...resultado } }, { merge: true });
      return { statusCode: 200, body: 'aviso inicial: ' + JSON.stringify(resultado) };
    }

    // 2) Recordatorio: quedan ~30 min de la ventana y falta alguna foto
    if (!data.recordatorio && data.ventanaCierre) {
      const cierre = new Date(data.ventanaCierre);
      const faltan = cierre.getTime() - ahora.getTime();
      if (faltan <= AVISO_MIN * 60000 && faltan > 0) {
        const hecho = rol => !!(data[rol] && data[rol].publicado);
        const resultado = {};
        for (const rol of ['fahd', 'cilia']) {
          if (hecho(rol)) continue;
          const otro = rol === 'fahd' ? 'cilia' : 'fahd';
          const quien = otro === 'cilia' ? 'Alba' : 'Abdu';
          const mins = Math.max(1, Math.round(faltan / 60000));
          const body = hecho(otro)
            ? `⏳ ${quien} ya ha subido su foto. Te quedan unos ${mins} min para hacer la tuya`
            : `⏳ Quedan unos ${mins} min para hacer vuestra foto del día`;
          resultado[rol] = await enviarARol(db, rol, JSON.stringify({ title: '+Dopamina', body, tag: 'checkin-recordatorio' }));
        }
        await ref.set({ recordatorio: true, avisoRecordatorio: { en: ahora.toISOString(), ...resultado } }, { merge: true });
        return { statusCode: 200, body: 'recordatorio: ' + JSON.stringify(resultado) };
      }
    }
    return { statusCode: 200, body: 'ya se avisó hoy' };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};

exports.config = { schedule: '*/10 * * * *' };
