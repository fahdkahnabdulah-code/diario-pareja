// ─────────────────────────────────────────────
// Envía una notificación push real a un único suscriptor.
// El cliente (app.js) lee la suscripción de Firestore y la manda aquí junto
// con el texto — esta función nunca toca Firestore, solo reenvía el push
// usando las claves VAPID (privadas, solo viven aquí como variables de
// entorno de Netlify, nunca en el navegador).
// ─────────────────────────────────────────────
const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:abdulahfahdkhan@gmail.com';

let vapidListo = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidListo = true;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  if (!vapidListo) {
    return { statusCode: 200, body: 'no-op: faltan las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Netlify' };
  }
  try {
    const { subscription, title, body, tag } = JSON.parse(event.body || '{}');
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, body: 'Falta la suscripción' };
    }
    const payload = JSON.stringify({
      title: title || '+Dopamina',
      body: body || '',
      tag: tag || 'dopamina'
    });
    await webpush.sendNotification(subscription, payload);
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    // Un fallo aquí (suscripción caducada, red, etc.) no debe romper nada
    // en el cliente — solo lo dejamos registrado en los logs de Netlify.
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};
