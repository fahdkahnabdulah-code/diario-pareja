// ─────────────────────────────────────────────
// Buscador de películas y series para «Pelis y series» (Nosotros).
// El navegador llama aquí; la clave de TMDB vive solo en Netlify
// (variable de entorno TMDB_KEY) y nunca llega a la app.
//   GET ?q=titulo             → lista de sugerencias
//   GET ?tipo=movie|tv&id=123 → ficha completa (duración, temporadas, plataformas)
// Sin TMDB_KEY solo busca series (TVMaze, sin clave) y avisa de que faltan las pelis.
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

async function buscarTmdb(q) {
  const d = await tmdb('/search/multi', { query: q, language: 'es-ES', include_adult: 'false', page: '1' });
  return (d.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8).map(deTmdb);
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
