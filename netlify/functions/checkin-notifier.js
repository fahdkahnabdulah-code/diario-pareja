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
    if (data.notificado) {
      return { statusCode: 200, body: 'ya se avisó hoy' };
    }
    if (new Date() < new Date(data.momento)) {
      return { statusCode: 200, body: 'todavía no toca' };
    }

    const subsSnap = await db.collection(`parejas/${PAREJA_ID}/push_subs`).get();
    const payload = JSON.stringify({
      title: '+Dopamina',
      body: '📸 ¡Es la hora de vuestra foto del día!',
      tag: 'checkin'
    });

    const envios = [];
    subsSnap.forEach(docSnap => {
      const sub = docSnap.data()?.sub;
      if (sub && sub.endpoint) {
        envios.push(webpush.sendNotification(sub, payload).catch(() => {}));
      }
    });
    await Promise.all(envios);

    await ref.set({ notificado: true }, { merge: true });

    return { statusCode: 200, body: `avisos enviados: ${envios.length}` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};

exports.config = { schedule: '*/10 * * * *' };
