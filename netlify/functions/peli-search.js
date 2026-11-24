// ─────────────────────────────────────────────
// Buscador de películas y series para «Pelis y series» (Nosotros).
// El navegador llama aquí; la clave de TMDB vive solo en Netlify
// (variable de entorno TMDB_KEY) y nunca llega a la app.
//   GET ?q=titulo             → lista de sugerencias
//   GET ?tipo=movie|tv&id=123 → ficha completa (duración, temporadas, plataformas)
// Sin TMDB_KEY solo busca series (TVMaze, sin clave) y avisa de que faltan las pelis.
// Con clave: busca en español e inglés, sin tildes y sin exigir el título exacto.
// ─────────────────────────────────────────────
const KEY = process.env.TMDB_KEY || '';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';

const json = (code, obj) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  body: JSON.stringify(obj)
});

async function tmdb(path, params) {
  const u = new URL(TMDB + path);
  const headers = { Accept: 'application/json' };
  if (KEY.length > 40) headers.Authorization = 'Bearer ' + KEY;   // token de lectura (v4)
  else u.searchParams.set('api_key', KEY);                          // clave v3
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers });
  if (!r.ok) throw new Error('TMDB ' + r.status);
  return r.json();
}
const anio = s => (s || '').slice(0, 4);
const nota = n => (typeof n === 'number' && n > 0 ? Math.round(n * 10) / 10 : null);

function deTmdb(r) {
  const tipo = r.media_type || (r.first_air_date !== undefined ? 'tv' : 'movie');
  return {
    fuente: 'tmdb', id: r.id, tipo,
    titulo: r.title || r.name || '',
    anio: anio(r.release_date || r.first_air_date),
    poster: r.poster_path ? IMG + 'w185' + r.poster_path : '',
    sinopsis: r.overview || '',
    nota: nota(r.vote_average)
  };
}

// Búsqueda flexible: sin tildes, ignora palabras de relleno (de, con, el…),
// busca en español e inglés y, si no sale nada claro, prueba palabra a palabra.
const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const RELLENO = new Set('de del la el los las lo con en y e a un una unos unas por para al the of and in on to with at'.split(' '));
const claves = q => norm(q).split(' ').filter(w => w && !RELLENO.has(w));

function puntuar(r, toks) {
  if (!toks.length) return 0;
  const txt = ' ' + norm([r.title, r.name, r.original_title, r.original_name].join(' ')) + ' ';
  let ok = 0;
  toks.forEach(w => { if (txt.includes(' ' + w) || (w.length > 4 && txt.includes(w.slice(0, -1)))) ok++; });
  return ok / toks.length;
}

async function buscarTmdb(q) {
  const toks = claves(q), limpia = toks.join(' ');
  const consultas = new Set([q]);
  if (limpia && limpia !== norm(q)) consultas.add(limpia);
  const unicos = new Map();
  const lanzar = async (consulta, lang) => {
    try {
      const d = await tmdb('/search/multi', { query: consulta, language: lang, include_adult: 'false', page: '1' });
      (d.results || []).forEach(r => {
        if (r.media_type !== 'movie' && r.media_type !== 'tv') return;
        const k = r.media_type + r.id;
        if (!unicos.has(k) || lang === 'es-ES') unicos.set(k, r);   // preferimos el título en español
      });
    } catch (e) { if (!unicos.size && consulta === q && lang === 'es-ES') throw e; }
  };
  await Promise.all([...consultas].flatMap(c => ['es-ES', 'en-US'].map(l => lanzar(c, l))));
  const mejor = () => Math.max(0, ...[...unicos.values()].map(r => puntuar(r, toks)));
  if (unicos.size < 3 || mejor() < 0.75) {
    const palabras = toks.filter(w => w.length >= 4).sort((x, y) => y.length - x.length).slice(0, 3);
    await Promise.all(palabras.flatMap(w => ['es-ES', 'en-US'].map(l => lanzar(w, l))));
  }
  return [...unicos.values()]
    .map(r => ({ r, p: puntuar(r, toks) + Math.min(0.2, (r.popularity || 0) / 500) }))
    .sort((x, y) => y.p - x.p)
    .slice(0, 10)
    .map(x => deTmdb(x.r));
}

async function fichaTmdb(tipo, id) {
  const t = tipo === 'tv' ? 'tv' : 'movie';
  const [d, prov] = await Promise.all([
    tmdb('/' + t + '/' + encodeURIComponent(id), { language: 'es-ES' }),
    tmdb('/' + t + '/' + encodeURIComponent(id) + '/watch/providers', {}).catch(() => ({}))
  ]);
  const es = (prov.results && prov.results.ES) || {};
  const plataformas = [];
  ['flatrate', 'free', 'ads'].forEach(k => (es[k] || []).forEach(p => { if (!plataformas.includes(p.provider_name)) plataformas.push(p.provider_name); }));
  const base = deTmdb(Object.assign({ media_type: t }, d));
  base.poster = d.poster_path ? IMG + 'w342' + d.poster_path : base.poster;
  base.duracion = t === 'movie' ? (d.runtime || null) : ((d.episode_run_time && d.episode_run_time[0]) || null);
  base.temporadas = t === 'tv' ? (d.number_of_seasons || null) : null;
  base.generos = (d.genres || []).map(g => g.name).slice(0, 3);
  base.plataformas = plataformas.slice(0, 5);
  return base;
}

// ── sin clave: solo series con TVMaze ──
const limpiar = h => (h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function deTvmaze(s) {
  return {
    fuente: 'tvmaze', id: s.id, tipo: 'tv', titulo: s.name || '', anio: anio(s.premiered),
    poster: (s.image && (s.image.medium || s.image.original) || '').replace('http://', 'https://'),
    sinopsis: limpiar(s.summary), nota: nota(s.rating && s.rating.average),
    duracion: s.averageRuntime || s.runtime || null, temporadas: null,
    generos: (s.genres || []).slice(0, 3),
    plataformas: [s.webChannel && s.webChannel.name, s.network && s.network.name].filter(Boolean)
  };
}
async function buscarTvmaze(q) {
  const r = await fetch('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('TVMaze ' + r.status);
  return (await r.json()).slice(0, 8).map(x => deTvmaze(x.show));
}

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'GET') return json(405, { error: 'metodo' });
  const p = event.queryStringParameters || {};
  try {
    if (p.id) {
      if (!KEY) return json(200, { error: 'sin-clave' });
      return json(200, { ficha: await fichaTmdb(p.tipo, p.id) });
    }
    const q = (p.q || '').trim().slice(0, 80);
    if (q.length < 2) return json(200, { resultados: [] });
    if (!KEY) return json(200, { sinClave: true, resultados: await buscarTvmaze(q) });
    return json(200, { resultados: await buscarTmdb(q) });
  } catch (e) {
    return json(502, { error: 'fuente', detalle: String(e.message || e) });
  }
};
