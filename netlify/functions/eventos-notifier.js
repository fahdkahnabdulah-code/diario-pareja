// ─────────────────────────────────────────────
// Función programada (cron, cada 30 minutos): avisos por push de las fechas
// importantes (cumpleaños, aniversarios, San Valentín…) y de los eventos que
// habéis creado en la pestaña "Fechas". A cada evento se le avisa varias veces
// según se acerca (7 días, 3 días, el día anterior y el mismo día), a partir
// de las 09:00 de Madrid. Cada aviso se apunta en Firestore (parejas/<id>/avisos)
// para no repetirlo.
// Necesita FIREBASE_SERVICE_ACCOUNT y las VAPID_* (igual que checkin-notifier).
// Sin ellas no hace nada (no-op seguro).
// ─────────────────────────────────────────────
const PAREJA_ID = process.env.CHECKIN_PAREJA_ID || 'nuestra-pareja';
const HORA_AVISO = 9; // a partir de las 09:00, hora de Madrid

// Inicio de la relación (igual que INICIO_RELACION en app.js): 10 de febrero de 2024
const INICIO = { anio: 2024, mes: 1, dia: 10 }; // mes 0-11

const ROLES = ['fahd', 'cilia'];
const NOMBRES = { fahd: 'Abdu', cilia: 'Alba' };
const OTRO = { fahd: 'cilia', cilia: 'fahd' };

// ── Fechas (todo en días enteros desde 1970, sin horas ni zonas) ──
function diaDeIso(iso) {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return Math.floor(Date.UTC(+p[1], +p[2] - 1, +p[3]) / 86400000);
}
function partes(dia) {
  const d = new Date(dia * 86400000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay() };
}
function diasEnMes(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
function isoDeDia(dia) {
  const p = partes(dia);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

function ahoraMadrid(ahora = new Date()) {
  const ps = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(ahora);
  const g = t => ps.find(p => p.type === t).value;
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, hora: parseInt(g('hour'), 10) };
}

// ── Eventos fijos (los mismos que ve la app en "Fechas") ──
// cae(p): ¿el evento cae en esa fecha?   texto(d, p): mensaje según los días que faltan
const AVISOS_FIJOS = [7, 3, 1, 0];
const AVISOS_CORTOS = [3, 1, 0];

function cuando(d) { return d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`; }

const FIJOS = [
  {
    id: 'aniversario', para: ROLES, offsets: AVISOS_FIJOS,
    cae: p => p.m === INICIO.mes && p.d === INICIO.dia && p.y > INICIO.anio,
    texto: (d, p) => {
      const n = p.y - INICIO.anio;
      const anios = `${n} año${n === 1 ? '' : 's'}`;
      return d === 0 ? `💞 ¡Hoy es vuestro aniversario! ${anios} juntos`
        : d === 1 ? `💞 Mañana es vuestro aniversario: ${anios} juntos`
        : `💞 En ${d} días es vuestro aniversario (${anios} juntos)`;
    }
  },
  {
    id: 'aniversario-mensual', para: ROLES, offsets: [1, 0],
    // en febrero lo sustituye el aniversario anual
    cae: p => p.d === INICIO.dia && p.m !== INICIO.mes && ((p.y - INICIO.anio) * 12 + p.m - INICIO.mes) >= 1,
    texto: (d, p) => {
      const n = (p.y - INICIO.anio) * 12 + p.m - INICIO.mes;
      return d === 0 ? `💞 Hoy hacéis ${n} mes${n === 1 ? '' : 'es'} juntos` : `💞 Mañana hacéis ${n} mes${n === 1 ? '' : 'es'} juntos`;
    }
  },
  { id: 'san-valentin', para: ROLES, offsets: AVISOS_CORTOS, cae: p => p.m === 1 && p.d === 14, texto: d => `💘 ${cuando(d)}: San Valentín` },
  { id: 'flores-amarillas', para: ROLES, offsets: AVISOS_CORTOS, cae: p => p.m === 8 && p.d === 21, texto: d => `🌼 ${cuando(d)}: Día de las Flores Amarillas` },
  { id: 'dia-novia', para: ROLES, offsets: AVISOS_CORTOS, cae: p => p.m === 7 && p.d === 1, texto: d => `👰 ${cuando(d)}: Día de la novia` }
];

// Cumpleaños: la pareja recibe los avisos con antelación; quien cumple, solo el mismo día
const CUMPLES = [
  { id: 'cumple-alba', rol: 'cilia', mes: 3, dia: 5 },    // 5 de abril
  { id: 'cumple-abdu', rol: 'fahd', mes: 11, dia: 12 }    // 12 de diciembre
];

// ── Eventos creados desde la app (parejas/<id>/eventos) ──
function cumpleCustom(ev, p, dia) {
  if (!ev.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(ev.fecha)) return false;
  const base = partes(diaDeIso(ev.fecha));
  switch (ev.frecuencia) {
    case 'unico': return diaDeIso(ev.fecha) === dia;
    case 'anual': return base.m === p.m && Math.min(base.d, diasEnMes(p.y, p.m)) === p.d;
    case 'mensual': return Math.min(base.d, diasEnMes(p.y, p.m)) === p.d;
    case 'semanal': return base.dow === p.dow && diaDeIso(ev.fecha) <= dia;
    default: return false;
  }
}
function offsetsCustom(ev) {
  return ev.frecuencia === 'mensual' ? [1, 0] : ev.frecuencia === 'semanal' ? [0] : AVISOS_FIJOS;
}
// Los aniversarios ya son eventos fijos; si se creó uno a mano no se avisa dos veces
function esAniversarioManual(ev) { return /aniversario/i.test(ev.nombre || ''); }

// ── Lógica pura: qué avisos tocan hoy ──
// hoyIso: fecha de hoy en Madrid; eventosCustom: [{ id, nombre, fecha, frecuencia, visibilidad, autor, emoji }]
// Devuelve [{ key, rol, body }]. La clave identifica el aviso para no repetirlo.
function calcularAvisos(hoyIso, eventosCustom = []) {
  const hoy = diaDeIso(hoyIso);
  const out = [];

  FIJOS.forEach(f => {
    f.offsets.forEach(d => {
      const objetivo = hoy + d;
      const p = partes(objetivo);
      if (!f.cae(p)) return;
      f.para.forEach(rol => out.push({ key: `${f.id}_${isoDeDia(objetivo)}_${d}_${rol}`, rol, body: f.texto(d, p) }));
    });
  });

  CUMPLES.forEach(c => {
    AVISOS_FIJOS.forEach(d => {
      const objetivo = hoy + d;
      const p = partes(objetivo);
      if (p.m !== c.mes || p.d !== c.dia) return;
      const otro = OTRO[c.rol];
      const nombre = NOMBRES[c.rol];
      const body = d === 0 ? `🎂 ¡Hoy es el cumpleaños de ${nombre}!` : d === 1 ? `🎂 Mañana es el cumpleaños de ${nombre}` : `🎂 En ${d} días es el cumpleaños de ${nombre}`;
      out.push({ key: `${c.id}_${isoDeDia(objetivo)}_${d}_${otro}`, rol: otro, body });
      if (d === 0) out.push({ key: `${c.id}_${isoDeDia(objetivo)}_0_${c.rol}`, rol: c.rol, body: `🎂 ¡Feliz cumpleaños, ${nombre}!` });
    });
  });

  eventosCustom.forEach(ev => {
    if (!ev || !ev.nombre || esAniversarioManual(ev)) return;
    const destinatarios = ev.visibilidad === 'propio' ? (ROLES.includes(ev.autor) ? [ev.autor] : []) : ROLES;
    offsetsCustom(ev).forEach(d => {
      const objetivo = hoy + d;
      const p = partes(objetivo);
      if (!cumpleCustom(ev, p, objetivo)) return;
      const body = `${ev.emoji || '⭐'} ${cuando(d)}: ${ev.nombre}`;
      destinatarios.forEach(rol => out.push({ key: `ev-${ev.id}_${isoDeDia(objetivo)}_${d}_${rol}`, rol, body }));
    });
  });
  return out;
}

exports.calcularAvisos = calcularAvisos;
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
    if (hora < HORA_AVISO) return { statusCode: 200, body: 'todavía no es la hora de los avisos' };

    const admin = require('firebase-admin');
    const webpush = require('web-push');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const db = admin.firestore();

    const evSnap = await db.collection(`parejas/${PAREJA_ID}/eventos`).get();
    const eventos = [];
    evSnap.forEach(d => eventos.push({ id: d.id, ...d.data() }));

    const avisos = calcularAvisos(fecha, eventos);
    if (!avisos.length) return { statusCode: 200, body: 'hoy no hay avisos de fechas' };

    const subs = {};
    let enviados = 0;
    for (const a of avisos) {
      const ref = db.doc(`parejas/${PAREJA_ID}/avisos/${a.key.replace(/[\/\s]/g, '_')}`);
      if ((await ref.get()).exists) continue; // ya avisado
      if (!(a.rol in subs)) {
        const s = await db.doc(`parejas/${PAREJA_ID}/push_subs/${a.rol}`).get();
        subs[a.rol] = s.exists ? (s.data().sub || null) : null;
      }
      const sub = subs[a.rol];
      // Si esa persona aún no ha activado las notificaciones, no se apunta: se avisará en cuanto las active
      if (!sub || !sub.endpoint) continue;
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title: '+Dopamina', body: a.body, tag: 'fecha-' + a.key.split('_')[0] }), { TTL: 86400, urgency: 'high' });
        await ref.set({ enviadoEn: new Date().toISOString(), body: a.body });
        enviados++;
      } catch (e) { /* si falla este aviso, se reintenta en la siguiente pasada */ }
    }
    return { statusCode: 200, body: `avisos de fechas enviados: ${enviados}` };
  } catch (e) {
    return { statusCode: 200, body: 'no-op: ' + (e && e.message ? e.message : 'error desconocido') };
  }
};
