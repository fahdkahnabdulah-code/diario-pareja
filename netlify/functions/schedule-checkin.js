// ─────────────────────────────────────────────
// Función programada (cron): se ejecuta una vez al día (00:05 UTC) y elige
// una hora aleatoria — entre las 10:00 y las 21:00, hora de Madrid — para el
// check-in con foto de hoy. Escribe el documento en Firestore para que:
//   - checkin-notifier.js sepa cuándo mandar el aviso push
//   - app.js sepa cuándo activar el botón de "hacer mi foto"
// Necesita una cuenta de servicio de Firebase (variable de entorno
// FIREBASE_SERVICE_ACCOUNT, el JSON completo como string) para poder
// escribir en Firestore desde el servidor sin depender de que la app esté
// abierta. Sin esa variable, esta función no hace nada (no rompe el resto).
// ─────────────────────────────────────────────
const admin = require('firebase-admin');

const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const HORA_INICIO = 10; // 10:00 hora de Madrid
const HORA_FIN = 21;    // 21:00 hora de Madrid
const VENTANA_HORAS = 2;

let listo = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    listo = true;
  }
} catch (e) {
  listo = false;
}

function horaMadridAUtc(fechaBase, horaLocal, minutoLocal) {
  // Aproximación sencilla: Europe/Madrid es UTC+1 (invierno) o UTC+2 (verano).
  // Usamos Intl para calcular el offset real del día en cuestión.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset'
  });
  const parte = fmt.formatToParts(fechaBase).find(p => p.type === 'timeZoneName');
  const match = /GMT([+-]\d+)/.exec(parte?.value || 'GMT+1');
  const offset = match ? parseInt(match[1], 10) : 1;
  const d = new Date(fechaBase);
  d.setUTCHours(horaLocal - offset, minutoLocal, 0, 0);
  return d;
}

exports.handler = async () => {
  if (!listo) {
    return { statusCode: 200, body: 'no-op: falta FIREBASE_SERVICE_ACCOUNT en Netlify' };
  }
  try {
    const db = admin.firestore();
    const hoy = new Date();
    const dateKey = hoy.toISOString().slice(0, 10);
    const ref = db.doc(`parejas/${PAREJA_ID}/checkins/${dateKey}`);

    const existente = await ref.get();
    if (existente.exists) {
      return { statusCode: 200, body: 'ya existía el check-in de hoy' };
    }

    const minutosVentana = (HORA_FIN - HORA_INICIO) * 60;
    const minutoAleatorio = Math.floor(Math.random() * minutosVentana);
    const horaBase = HORA_INICIO + Math.floor(minutoAleatorio / 60);
    const minutoBase = minutoAleatorio % 60;
    const momento = horaMadridAUtc(hoy, horaBase, minutoBase);
    const ventanaCierre = new Date(momento.getTime() + VENTANA_HORAS * 60 * 60 * 1000);

    await ref.set({
      momento: momento.toISOString(),
      ventanaCierre: ventanaCierre.toISOString(),
      notificado: false
    });

    return { statusCode: 200, body: `check-in programado para ${momento.toISOString()}` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};

exports.config = { schedule: '5 0 * * *' };
