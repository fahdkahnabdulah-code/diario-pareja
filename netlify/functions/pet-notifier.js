// ─────────────────────────────────────────────
// Función programada (cada 30 min): avisos de Dopi y sistema de vidas.
//   · 24 h sin que nadie la cuide → "te echa de menos" (a quien lleva más tiempo sin cuidarla)
//   · pierde una vida (cada 48 h sin cuidados) → aviso a los dos
//   · queda 1 vida → aviso a los dos; y último aviso ~24 h antes de irse
//   · se queda sin vidas → pasa al álbum (se archiva aquí o al abrir la app) y se avisa a los dos
// Solo envía entre las 09:00 y las 22:00 de Madrid. Cada aviso sale una sola vez por "racha de descuido".
// Necesita FIREBASE_SERVICE_ACCOUNT y las variables VAPID (como el resto de notifiers).
// ─────────────────────────────────────────────
const admin = require('firebase-admin');
const webpush = require('web-push');
const L = require('../../pet-logic.js');

const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@example.com';
const ROLES = ['fahd', 'cilia'];
const H = 3600 * 1000;

let listo = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    listo = true;
  }
} catch (e) { listo = false; }

const horaMadrid = t => +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(t));
const horas = ms => { const h = Math.max(1, Math.round(ms / H)); return h >= 36 ? Math.round(h / 24) + ' días' : h + ' h'; };
const pick = a => a[Math.floor(Math.random() * a.length)];

async function enviar(db, rol, title, body, tag) {
  const ref = db.doc(`parejas/${PAREJA_ID}/push_subs/${rol}`);
  const s = await ref.get();
  const sub = s.exists && s.data() && s.data().sub;
  if (!sub || !sub.endpoint) return 'sin-suscripcion';
  try { await webpush.sendNotification(sub, JSON.stringify({ title, body, tag })); return 'ok'; }
  catch (e) {
    const c = e && e.statusCode;
    if (c === 404 || c === 410) { await ref.delete().catch(() => {}); return 'suscripcion-caducada'; }
    return 'error-' + (c || 'red');
  }
}
async function aTodos(db, body, tag) {
  const out = {};
  for (const r of ROLES) out[r] = await enviar(db, r, '+Dopamina', body, tag);
  return out;
}

exports.handler = async () => {
  if (!listo) return { statusCode: 200, body: 'no-op: falta FIREBASE_SERVICE_ACCOUNT o VAPID en Netlify' };
  try {
    const db = admin.firestore();
    const ref = db.doc(`parejas/${PAREJA_ID}/mascota/estado`);
    const now = Date.now();
    const snap = await ref.get();
    if (!snap.exists) return { statusCode: 200, body: 'sin estado de Dopi' };
    let s = snap.data();
    let log = [];

    // 1) ¿se ha quedado sin vidas? Se archiva (transacción: no pisa a un móvil que lo haga a la vez).
    if (L.lifeStatus(s, now).dead) {
      const res = await db.runTransaction(async tx => {
        const cur = await tx.get(ref); const d = cur.data();
        if (!L.lifeStatus(d, now).dead) return null;
        const ns = L.applyDeath(d, now); tx.set(ref, ns); return ns;
      });
      if (res) { s = res; log.push('archivada'); }
      else s = (await ref.get()).data();
    }

    const enHorario = horaMadrid(now) >= 9 && horaMadrid(now) < 22;
    if (!enHorario) return { statusCode: 200, body: 'fuera de horario' + (log.length ? ' · ' + log.join(',') : '') };

    // 2) aviso de que se fue
    const dd = s.lastDeath;
    if (dd && !dd.notified && now - dd.at < 3 * 24 * H) {
      const r = await aTodos(db, `💔 ${dd.name || 'Dopi'} se ha ido porque nadie la cuidó. Está en el álbum: podéis recuperarla con chispas`, 'dopi-adios');
      await ref.set({ lastDeath: Object.assign({}, dd, { notified: true }) }, { merge: true });
      return { statusCode: 200, body: 'adiós: ' + JSON.stringify(r) };
    }

    // 3) avisos de descuido
    const ls = L.lifeStatus(s, now);
    if (!ls.anchor) return { statusCode: 200, body: 'sin Dopi elegida' };
    const name = s.name || 'Dopi';
    const av = s.avisosVida && s.avisosVida.anchor === ls.anchor ? s.avisosVida : { anchor: ls.anchor, sent: {} };
    const sent = av.sent || {};
    let aviso = null;

    if (ls.lives === 1 && ls.diesAt - now <= 24 * H && !sent.ultimo) {
      aviso = { key: 'ultimo', tag: 'dopi-ultimo', body: `⚠️ Último aviso: ${name} se irá mañana si no la cuidáis. Os queda ${horas(ls.diesAt - now)}` };
    } else if (ls.lost >= 1 && ls.lives === 1 && !sent.v1) {
      aviso = { key: 'v1', tag: 'dopi-vida', body: `💔 ${name} solo tiene 1 vida. Cuidadla pronto para que no se vaya` };
    } else if (ls.lost >= 1 && ls.lives === 2 && !sent.v2) {
      aviso = { key: 'v2', tag: 'dopi-vida', body: `💔 ${name} ha perdido una vida porque nadie la ha cuidado. Le quedan 2` };
    } else if (ls.lost === 0 && ls.idle >= 24 * H && !sent.echa) {
      // a quien lleva más tiempo sin cuidarla (si ninguno la ha cuidado nunca, a los dos)
      const la = s.lastAction || {};
      const t = r => (la[r] && la[r].at) || 0;
      const quien = t('fahd') === t('cilia') ? ROLES : [t('fahd') < t('cilia') ? 'fahd' : 'cilia'];
      const body = pick([
        `💤 ${name} te echa de menos… hace ${horas(ls.idle)} que nadie la cuida`,
        `🥺 ${name} se ha quedado sola. ¿Le haces un ratito de compañía?`,
        `💗 ${name} pregunta por ti. Un mimo y se le pasa`
      ]);
      const r = {};
      for (const rol of quien) r[rol] = await enviar(db, rol, '+Dopamina', body, 'dopi-echa-de-menos');
      av.sent = Object.assign({}, sent, { echa: true }); av.anchor = ls.anchor;
      await ref.set({ avisosVida: av }, { merge: true });
      return { statusCode: 200, body: 'echa de menos: ' + JSON.stringify(r) };
    }
    if (aviso) {
      const r = await aTodos(db, aviso.body, aviso.tag);
      av.sent = Object.assign({}, sent, { [aviso.key]: true }); av.anchor = ls.anchor;
      await ref.set({ avisosVida: av }, { merge: true });
      return { statusCode: 200, body: aviso.key + ': ' + JSON.stringify(r) };
    }
    return { statusCode: 200, body: `nada que avisar (vidas ${ls.lives}, sin cuidados ${horas(ls.idle)})` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};
