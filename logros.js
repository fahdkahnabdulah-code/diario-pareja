/* +Dopamina · logros.js
   24 logros con su insignia SVG (desbloqueada). Para pintar uno bloqueado usa DpLogros.svg(logro, true).
   - puntos: entre 20 y 500 según dificultad (cámbialos aquí cuando ajustes la economía de Dopi).
   - secreto: bloqueado se enseña «???» en nombre y pista (la silueta del svg ya va en gris).
   - dias: solo en los 7 logros de días juntos; se calculan desde la fecha de inicio configurable (por defecto 10-feb-2024).
   Necesita dopamina-art.css. Sin dependencias. */
const DP_LOGROS = [
  {
    id: "dias-100", nombre: "Primeros 100",
    pista: "Un pasito, y otro, y ya van cien días.",
    condicion: "100 días juntos",
    categoria: "Tiempo", nivel: "normal", puntos: 30, secreto: false, dias: 100,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primeros 100"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><ellipse class="dp-pk2" cx="64" cy="44" rx="22" ry="26"/><path class="dp-pk3" d="M64 70l-5 7h10z"/></g><g class="dp-det"><path class="dp-nf dp-Lpk" d="M64 77q-5 3 0 6"/><ellipse class="dp-bril" cx="53" cy="33" rx="4.5" ry="8" transform="rotate(25 53 33)"/><path class="dp-Fpk" d="M64 55C52 47.5 47.5 41.5 49 36.25C50.5 31 59.5 31 64 38.5C68.5 31 77.5 31 79 36.25C80.5 41.5 76 47.5 64 55Z"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">100</text></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-365", nombre: "Un año de nosotros",
    pista: "Una vuelta entera al sol, de la mano.",
    condicion: "1 año juntos (365 días)",
    categoria: "Tiempo", nivel: "oro", puntos: 100, secreto: false, dias: 365,
    svg: `<svg class="dp-art dp-oro dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Un año de nosotros"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><ellipse class="dp-gd2" cx="64" cy="78" rx="36" ry="6"/><rect class="dp-pk2" x="38" y="58" width="52" height="20" rx="6"/><rect class="dp-pk1" x="48" y="42" width="32" height="16" rx="5"/></g><g class="dp-det"><rect class="dp-gd2" x="62" y="28" width="4" height="14" rx="1.5"/><path class="dp-gd1" d="M64 18Q69 24 64 29Q59 24 64 18Z"/><path class="dp-nf dp-Lpk" d="M43 64q3 5 6 0q3 5 6 0q3 5 6 0q3 5 6 0q3 5 6 0q3 5 6 0q3 5 6 0"/><circle class="dp-Fgd" cx="54" cy="50" r="2"/><circle class="dp-Fgd" cx="64" cy="48" r="2"/><circle class="dp-Fgd" cx="74" cy="50" r="2"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">365</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-500", nombre: "Medio millar",
    pista: "Medio camino hasta los mil.",
    condicion: "500 días juntos",
    categoria: "Tiempo", nivel: "oro", puntos: 150, secreto: false, dias: 500,
    svg: `<svg class="dp-art dp-oro dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Medio millar"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-pk2" d="M48 54L44 84L54 78L60 88L62 58Z"/><path class="dp-tl2" d="M80 54L84 84L74 78L68 88L66 58Z"/><circle class="dp-gd2" cx="64" cy="42" r="22"/></g><g class="dp-det"><circle class="dp-Lgd" cx="64" cy="42" r="15"/><path class="dp-Fgd3" d="M64 28.4Q66.55 39.45 77.6 42Q66.55 44.55 64 55.6Q61.45 44.55 50.4 42Q61.45 39.45 64 28.4Z"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">500</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-1000", nombre: "Mil días",
    pista: "Mil amaneceres compartidos.",
    condicion: "1.000 días juntos",
    categoria: "Tiempo", nivel: "oro", puntos: 250, secreto: false, dias: 1000,
    svg: `<svg class="dp-art dp-oro dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mil días"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-gd2" x="38" y="20" width="52" height="8" rx="4"/><rect class="dp-gd2" x="38" y="76" width="52" height="8" rx="4"/><path class="dp-tl1" d="M44 28H84C84 44 72 48 64 52C72 56 84 60 84 76H44C44 60 56 56 64 52C56 48 44 44 44 28Z"/></g><g class="dp-det"><path class="dp-gd2" d="M50 30H78C77 39 70 43 64 47C58 43 51 39 50 30Z"/><path class="dp-gd2" d="M50 74C53 66 59 63 64 62C69 63 75 66 78 74Z"/><path class="dp-nf dp-Lgd" d="M64 48V62"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">1000</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-2000", nombre: "Dos mil",
    pista: "Dos mil días y los que os quedan.",
    condicion: "2.000 días juntos",
    categoria: "Tiempo", nivel: "oro", puntos: 350, secreto: false, dias: 2000,
    svg: `<svg class="dp-art dp-oro dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dos mil"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-tl2" d="M24 82L54 34L84 82Z"/><path class="dp-pk2" d="M62 82L84 52L106 82Z"/><path class="dp-nf dp-Ltx" d="M54 34V18"/></g><g class="dp-det"><path class="dp-pp" d="M54 34L45 49L50 47L54 52L59 47L63 49Z"/><path class="dp-gd2" d="M54 18H68L63 23L68 28H54Z"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">2000</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-5000", nombre: "Cinco mil",
    pista: "Cinco mil días: ya es casi una leyenda.",
    condicion: "5.000 días juntos",
    categoria: "Tiempo", nivel: "holo", puntos: 450, secreto: false, dias: 5000,
    svg: `<svg class="dp-art dp-holo dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cinco mil"><defs><linearGradient id="dp-hg-dias-5000" x1="0" y1="0" x2="1" y2="1"><stop class="dp-hs0" offset="0"/><stop class="dp-hs1" offset=".35"/><stop class="dp-hs2" offset=".7"/><stop class="dp-hs0" offset="1"/></linearGradient></defs><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-ring-holo" cx="64" cy="64" r="61" fill="none" stroke="url(#dp-hg-dias-5000)" stroke-width="3.5"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-gd2" d="M58 86V60H70V86Z"/><circle class="dp-tl2" cx="64" cy="38" r="19"/><circle class="dp-tl2" cx="45" cy="54" r="14"/><circle class="dp-tl2" cx="83" cy="54" r="14"/><circle class="dp-tl2" cx="64" cy="55" r="15"/><circle class="dp-tl2 dp-fo" cx="64" cy="38" r="19"/><circle class="dp-tl2 dp-fo" cx="45" cy="54" r="14"/><circle class="dp-tl2 dp-fo" cx="83" cy="54" r="14"/><circle class="dp-tl2 dp-fo" cx="64" cy="55" r="15"/></g><g class="dp-det"><path class="dp-Fpk" d="M56 47.8C45.6 41.3 41.7 36.1 43 31.55C44.3 27 52.1 27 56 33.5C59.9 27 67.7 27 69 31.55C70.3 36.1 66.4 41.3 56 47.8Z"/><path class="dp-Fpk" d="M76 58C68 53 65 49 66 45.5C67 42 73 42 76 47C79 42 85 42 86 45.5C87 49 84 53 76 58Z"/><ellipse class="dp-bril" cx="55" cy="28" rx="6" ry="3" transform="rotate(-25 55 28)"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">5000</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/><path class="dp-Fgd" d="M24 21.6Q25.2 26.8 30.4 28Q25.2 29.2 24 34.4Q22.8 29.2 17.6 28Q22.8 26.8 24 21.6Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dias-10000", nombre: "Diez mil",
    pista: "Diez mil días. Lo que dura una historia de las grandes.",
    condicion: "10.000 días juntos",
    categoria: "Tiempo", nivel: "holo", puntos: 500, secreto: false, dias: 10000,
    svg: `<svg class="dp-art dp-holo dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diez mil"><defs><linearGradient id="dp-hg-dias-10000" x1="0" y1="0" x2="1" y2="1"><stop class="dp-hs0" offset="0"/><stop class="dp-hs1" offset=".35"/><stop class="dp-hs2" offset=".7"/><stop class="dp-hs0" offset="1"/></linearGradient></defs><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-ring-holo" cx="64" cy="64" r="61" fill="none" stroke="url(#dp-hg-dias-10000)" stroke-width="3.5"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-pk2" d="M44 32Q47.75 48.25 64 52Q47.75 55.75 44 72Q40.25 55.75 24 52Q40.25 48.25 44 32Z"/><path class="dp-tl2" d="M84 27.2Q87.15 40.85 100.8 44Q87.15 47.15 84 60.8Q80.85 47.15 67.2 44Q80.85 40.85 84 27.2Z"/></g><g class="dp-det"><path class="dp-nf dp-Lgd" d="M60 51L69 47" stroke-dasharray="2 4"/><path class="dp-Fgd" d="M64 16.8Q65.35 22.65 71.2 24Q65.35 25.35 64 31.2Q62.65 25.35 56.8 24Q62.65 22.65 64 16.8Z"/><path class="dp-Fgd" d="M100 63.6Q101.2 68.8 106.4 70Q101.2 71.2 100 76.4Q98.8 71.2 93.6 70Q98.8 68.8 100 63.6Z"/><path class="dp-Fgd" d="M26 72.4Q27.05 76.95 31.6 78Q27.05 79.05 26 83.6Q24.95 79.05 20.4 78Q24.95 76.95 26 72.4Z"/><circle class="dp-Fgd" cx="62" cy="72" r="2"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">10000</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/><path class="dp-Fgd" d="M24 21.6Q25.2 26.8 30.4 28Q25.2 29.2 24 34.4Q22.8 29.2 17.6 28Q22.8 26.8 24 21.6Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "primera-pagina", nombre: "Primera página",
    pista: "Escribid juntos la primera hoja del diario.",
    condicion: "Completáis la primera entrada del diario el mismo día",
    categoria: "Diario", nivel: "normal", puntos: 20, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primera página"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pk2" x="20" y="38" width="88" height="52" rx="8"/><path class="dp-pp" d="M26 44Q44 40 62 48V84Q44 76 26 80Z"/><path class="dp-pp" d="M102 44Q84 40 66 48V84Q84 76 102 80Z"/><path class="dp-gd2" d="M80 30V52L85 47L90 52V30Z"/></g><g class="dp-det"><path class="dp-nf dp-Ltx" d="M32 56H52M32 64H52M32 72H46"/><path class="dp-Fpk" d="M82 75.2C72.4 69.2 68.8 64.4 70 60.2C71.2 56 78.4 56 82 62C85.6 56 92.8 56 94 60.2C95.2 64.4 91.6 69.2 82 75.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "mes-sin-soltarnos", nombre: "Un mes sin soltarnos",
    pista: "Cuatro semanas seguidas cuidando la racha.",
    condicion: "Racha de 4 semanas seguidas",
    categoria: "Diario", nivel: "normal", puntos: 60, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Un mes sin soltarnos"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><g transform="translate(0 -6)"><path class="dp-gd2" d="M64 22C70 38 86 44 84 64C83 80 75 90 64 90C53 90 45 80 44 64C43 52 50 48 54 38C58 44 60 48 62 48C62 40 62 30 64 22Z"/></g></g><g class="dp-det"><g transform="translate(0 -6)"><path class="dp-pk2" d="M64 52C68 62 76 66 74 76C73 83 69 86 64 86C59 86 55 83 54 76C53 68 60 64 64 52Z"/></g><ellipse class="dp-bril" cx="52" cy="58" rx="3" ry="6" transform="rotate(12 52 58)"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">4 sem</text></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "constantes", nombre: "Constantes",
    pista: "Doce semanas de diario sin faltar. Qué constancia.",
    condicion: "Racha de 12 semanas seguidas",
    categoria: "Diario", nivel: "oro", puntos: 120, secreto: false,
    svg: `<svg class="dp-art dp-oro dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Constantes"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><g transform="translate(0 -6)"><path class="dp-pk2" d="M64 22C70 38 86 44 84 64C83 80 75 90 64 90C53 90 45 80 44 64C43 52 50 48 54 38C58 44 60 48 62 48C62 40 62 30 64 22Z"/></g></g><g class="dp-det"><g transform="translate(0 -6)"><path class="dp-gd2" d="M64 52C68 62 76 66 74 76C73 83 69 86 64 86C59 86 55 83 54 76C53 68 60 64 64 52Z"/></g><path class="dp-Fpk" d="M64 78C56 73 53 69 54 65.5C55 62 61 62 64 67C67 62 73 62 74 65.5C75 69 72 73 64 78Z"/><path class="dp-Fgd" d="M34 32.8Q35.35 38.65 41.2 40Q35.35 41.35 34 47.2Q32.65 41.35 26.8 40Q32.65 38.65 34 32.8Z"/><path class="dp-Fgd" d="M94 38Q95.5 44.5 102 46Q95.5 47.5 94 54Q92.5 47.5 86 46Q92.5 44.5 94 38Z"/><rect class="dp-gd1" x="36" y="93" width="56" height="17" rx="8.5"/><text class="dp-Tgd" x="64" y="105.5">12 sem</text><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "primer-check", nombre: "Primer check",
    pista: "Una foto cada uno, el mismo día.",
    condicion: "Subís el primer check del día los dos",
    categoria: "Diario", nivel: "normal", puntos: 20, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primer check"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pk2" x="46" y="26" width="36" height="14" rx="5"/><rect class="dp-pk2" x="22" y="36" width="84" height="52" rx="10"/><circle class="dp-tl2" cx="62" cy="62" r="19"/><rect class="dp-gd2" x="86" y="44" width="12" height="8" rx="3"/></g><g class="dp-det"><circle class="dp-tl1" cx="62" cy="62" r="11"/><ellipse class="dp-bril" cx="57" cy="57" rx="4" ry="3"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "pensando-en-ti", nombre: "Pensando en ti",
    pista: "Hay una forma de decir «estoy aquí» sin palabras.",
    condicion: "Envías 10 pokes",
    categoria: "Diario", nivel: "normal", puntos: 40, secreto: true,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pensando en ti"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-pk2" d="M64 74C40 59 31 47 34 36.5C37 26 55 26 64 41C73 26 91 26 94 36.5C97 47 88 59 64 74Z"/></g><g class="dp-det"><ellipse class="dp-bril" cx="46" cy="42" rx="7" ry="3.5" transform="rotate(-30 46 42)"/><path class="dp-nf dp-Lpk" d="M26 48Q20 58 26 68M102 48Q108 58 102 68"/><path class="dp-Fgd" d="M98 20.8Q99.35 26.65 105.2 28Q99.35 29.35 98 35.2Q96.65 29.35 90.8 28Q96.65 26.65 98 20.8Z"/><path class="dp-Fgd" d="M30 24.4Q31.05 28.95 35.6 30Q31.05 31.05 30 35.6Q28.95 31.05 24.4 30Q28.95 28.95 30 24.4Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "primera-carta", nombre: "Primera carta",
    pista: "Escribe algo que merezca un sobre.",
    condicion: "Envías tu primera carta cerrada",
    categoria: "Cartas", nivel: "normal", puntos: 30, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primera carta"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pk2" x="26" y="38" width="76" height="52" rx="8"/><circle class="dp-gd2" cx="64" cy="66" r="11"/></g><g class="dp-det"><path class="dp-nf dp-Lpk" d="M28 42L64 64L100 42M28 88L52 62M100 88L76 62"/><path class="dp-Fpk" d="M64 72.1C57.2 67.85 54.65 64.45 55.5 61.48C56.35 58.5 61.45 58.5 64 62.75C66.55 58.5 71.65 58.5 72.5 61.48C73.35 64.45 70.8 67.85 64 72.1Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "sello-roto", nombre: "Sello roto",
    pista: "Rompe un sello con tus propios dedos.",
    condicion: "Abres tu primera carta",
    categoria: "Cartas", nivel: "normal", puntos: 30, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sello roto"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-pk1" d="M26 52L64 24L102 52Z"/><rect class="dp-pp" x="40" y="30" width="48" height="40" rx="5"/><path class="dp-pk2" d="M26 52L64 76L102 52V88a6 6 0 0 1 -6 6H32a6 6 0 0 1 -6 -6Z"/></g><g class="dp-det"><path class="dp-nf dp-Ltx" d="M48 42H80M48 52H72"/><path class="dp-nf dp-Lgd" d="M64 14V8M44 20L40 14M84 20L88 14"/><path class="dp-gd2" d="M46 82l6 -4 3 6z"/><path class="dp-gd2" d="M74 84l7 -3 1 7z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "buzon-lleno", nombre: "Buzón lleno",
    pista: "El buzón guarda más de lo que parece.",
    condicion: "10 cartas intercambiadas",
    categoria: "Cartas", nivel: "oro", puntos: 120, secreto: true,
    svg: `<svg class="dp-art dp-oro dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Buzón lleno"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pp" x="42" y="22" width="24" height="16" rx="2" transform="rotate(-10 54 30)"/><rect class="dp-pp" x="60" y="20" width="24" height="16" rx="2" transform="rotate(9 72 28)"/><rect class="dp-gd2" x="60" y="70" width="8" height="20" rx="2"/><path class="dp-tl2" d="M32 72V52C32 40 42 32 54 32H74C86 32 96 40 96 52V72Z"/><rect class="dp-pk2" x="96" y="30" width="14" height="10" rx="2"/></g><g class="dp-det"><rect class="dp-tl1" x="48" y="48" width="32" height="6" rx="3"/><path class="dp-nf dp-Ltl" d="M44 72V60"/><path class="dp-nf dp-Lpk" d="M98 34V56"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dopi-nace", nombre: "Dopi nace",
    pista: "Cuida el huevo hasta que se abra.",
    condicion: "El huevo de Dopi eclosiona",
    categoria: "Dopi", nivel: "normal", puntos: 20, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dopi nace"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-pk2" d="M 64 25.36C 80.72 25.36 90.4 52.64 90.4 66.72C 90.4 81.68 78.96 90.48 64 90.48C 49.04 90.48 37.6 81.68 37.6 66.72C 37.6 52.64 47.28 25.36 64 25.36Z"/></g><g class="dp-det"><path class="dp-nf dp-Lpk" d="M 39.36 72L 45.52 68.48L 50.8 73.76L 56.96 68.48L 64 73.76L 71.04 68.48L 77.2 73.76L 82.48 68.48L 88.64 72"/><circle class="dp-Fpk" cx="50.8" cy="80.8" r="2.64"/><circle class="dp-Ftl" cx="78.08" cy="79.92" r="2.2"/><circle class="dp-Ftl" cx="59.6" cy="86.08" r="1.54"/><circle class="dp-Fpk" cx="70.16" cy="85.2" r="1.54"/><ellipse class="dp-bril" cx="51.68" cy="39.44" rx="4.4" ry="2.64" transform="rotate(-40 51.68 39.44)"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dopi-crece", nombre: "Dopi crece",
    pista: "Dopi ya no es tan pequeña.",
    condicion: "Dopi llega a la etapa joven",
    categoria: "Dopi", nivel: "oro", puntos: 80, secreto: false,
    svg: `<svg class="dp-art dp-oro dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dopi crece"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><ellipse class="dp-pk2" cx="36.72" cy="72.24" rx="3.96" ry="6.6"/><ellipse class="dp-pk2" cx="91.28" cy="72.24" rx="3.96" ry="6.6"/><path class="dp-pk2" d="M 64 35.28C 84.24 35.28 91.28 52 91.28 67.84C 91.28 82.8 79.84 90.72 64 90.72C 48.16 90.72 36.72 82.8 36.72 67.84C 36.72 52 43.76 35.28 64 35.28Z"/><path class="dp-nf dp-Lpk" d="M 64 36.16C 64 33.52 64 32.2 64.44 30.44"/><path class="dp-pk3" d="M 64 30.88C 60.48 31.32 56.96 29.12 55.64 25.16C 60.04 24.72 63.12 26.92 64 30.88Z"/><path class="dp-tl3" d="M 64.44 30.88C 67.96 31.32 71.48 29.12 72.8 25.16C 68.4 24.72 65.32 26.92 64.44 30.88Z"/></g><g class="dp-det"><ellipse class="dp-Fink" cx="54.32" cy="55.52" rx="2.64" ry="3.52"/><ellipse class="dp-Fink" cx="73.68" cy="55.52" rx="2.64" ry="3.52"/><circle class="dp-Fwh" cx="55.42" cy="53.76" r="0.97"/><circle class="dp-Fwh" cx="74.78" cy="53.76" r="0.97"/><ellipse class="dp-Fpk dp-op5" cx="48.16" cy="63.44" rx="3.96" ry="2.42"/><ellipse class="dp-Fpk dp-op5" cx="79.84" cy="63.44" rx="3.96" ry="2.42"/><path class="dp-nf dp-Ltx" d="M 59.6 64.32Q 64 68.72 68.4 64.32"/><ellipse class="dp-bril" cx="49.92" cy="46.72" rx="4.84" ry="2.64" transform="rotate(-32 49.92 46.72)"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "alma-gemela", nombre: "Alma gemela",
    pista: "La última etapa de Dopi. Solo se llega juntos.",
    condicion: "Dopi llega a alma gemela",
    categoria: "Dopi", nivel: "holo", puntos: 300, secreto: false,
    svg: `<svg class="dp-art dp-holo dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alma gemela"><defs><linearGradient id="dp-hg-alma-gemela" x1="0" y1="0" x2="1" y2="1"><stop class="dp-hs0" offset="0"/><stop class="dp-hs1" offset=".35"/><stop class="dp-hs2" offset=".7"/><stop class="dp-hs0" offset="1"/></linearGradient></defs><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-ring-holo" cx="64" cy="64" r="61" fill="none" stroke="url(#dp-hg-alma-gemela)" stroke-width="3.5"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-det"><circle class="dp-gd1 dp-op6" cx="64" cy="60.74" r="36.12"/></g><g class="dp-base"><ellipse class="dp-pk2" cx="37.96" cy="70.82" rx="3.78" ry="6.3"/><ellipse class="dp-pk2" cx="90.04" cy="70.82" rx="3.78" ry="6.3"/><path class="dp-pk2" d="M 64 35.54C 83.32 35.54 90.04 51.5 90.04 66.62C 90.04 80.9 79.12 88.46 64 88.46C 48.88 88.46 37.96 80.9 37.96 66.62C 37.96 51.5 44.68 35.54 64 35.54Z"/><path class="dp-hl" d="M 64 34.7C 60.64 32.18 57.28 29.66 57.7 26.3C 58.12 23.36 61.9 22.94 64 25.88Z"/><path class="dp-hr" d="M 64 34.7C 67.36 32.18 70.72 29.66 70.3 26.3C 69.88 23.36 66.1 22.94 64 25.88Z"/></g><g class="dp-det"><ellipse class="dp-Fink" cx="54.76" cy="54.86" rx="2.52" ry="3.36"/><ellipse class="dp-Fink" cx="73.24" cy="54.86" rx="2.52" ry="3.36"/><circle class="dp-Fwh" cx="55.81" cy="53.18" r="0.92"/><circle class="dp-Fwh" cx="74.29" cy="53.18" r="0.92"/><ellipse class="dp-Fpk dp-op5" cx="48.88" cy="62.42" rx="3.78" ry="2.31"/><ellipse class="dp-Fpk dp-op5" cx="79.12" cy="62.42" rx="3.78" ry="2.31"/><path class="dp-nf dp-Ltx" d="M 59.8 63.26Q 64 67.46 68.2 63.26"/><ellipse class="dp-bril" cx="50.56" cy="46.46" rx="4.62" ry="2.52" transform="rotate(-32 50.56 46.46)"/><circle class="dp-Fgd" cx="45.52" cy="56.54" r="0.76"/><circle class="dp-Fgd" cx="48.04" cy="54.02" r="0.59"/><circle class="dp-Fgd" cx="82.48" cy="56.54" r="0.76"/><circle class="dp-Fgd" cx="79.96" cy="54.02" r="0.59"/><circle class="dp-pk3" cx="38.8" cy="43.94" r="2.52"/><circle class="dp-tl3" cx="89.2" cy="43.1" r="2.52"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/><path class="dp-Fgd" d="M24 21.6Q25.2 26.8 30.4 28Q25.2 29.2 24 34.4Q22.8 29.2 17.6 28Q22.8 26.8 24 21.6Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "sonadores", nombre: "Soñadores",
    pista: "Diez planes en la lista: ya sois dos soñadores.",
    condicion: "10 planes en la lista",
    categoria: "Planes", nivel: "normal", puntos: 30, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soñadores"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><circle class="dp-pp" cx="46" cy="58" r="12"/><circle class="dp-pp" cx="62" cy="46" r="16"/><circle class="dp-pp" cx="82" cy="50" r="14"/><circle class="dp-pp" cx="94" cy="62" r="10"/><rect class="dp-pp" x="40" y="56" width="60" height="20" rx="10"/><circle class="dp-pp dp-fo" cx="46" cy="58" r="12"/><circle class="dp-pp dp-fo" cx="62" cy="46" r="16"/><circle class="dp-pp dp-fo" cx="82" cy="50" r="14"/><circle class="dp-pp dp-fo" cx="94" cy="62" r="10"/><rect class="dp-pp dp-fo" x="40" y="56" width="60" height="20" rx="10"/><circle class="dp-pp" cx="38" cy="86" r="5"/><circle class="dp-pp" cx="28" cy="94" r="3"/></g><g class="dp-det"><path class="dp-gd2" d="M70 40Q73 53 86 56Q73 59 70 72Q67 59 54 56Q67 53 70 40Z"/><path class="dp-Fgd" d="M48 52Q49.5 58.5 56 60Q49.5 61.5 48 68Q46.5 61.5 40 60Q46.5 58.5 48 52Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "primer-plan", nombre: "Primer plan cumplido",
    pista: "Tacha el primero de la lista.",
    condicion: "Marcáis el primer plan como cumplido",
    categoria: "Planes", nivel: "normal", puntos: 30, secreto: false,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primer plan cumplido"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pp" x="34" y="28" width="56" height="62" rx="8"/><rect class="dp-gd2" x="50" y="22" width="24" height="12" rx="5"/><circle class="dp-tl2" cx="86" cy="80" r="15"/></g><g class="dp-det"><path class="dp-nf dp-Ltx" d="M42 46H78M42 58H78M42 70H62"/><path class="dp-nf dp-Lwh" d="M79 80L85 86L94 74"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "primer-viaje", nombre: "Primer viaje juntos",
    pista: "Hacer la maleta para dos.",
    condicion: "Cumplís un plan de categoría Viaje",
    categoria: "Planes", nivel: "oro", puntos: 150, secreto: false,
    svg: `<svg class="dp-art dp-oro dp-h-tl" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Primer viaje juntos"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><path class="dp-nf dp-Lpk" d="M50 46V34a6 6 0 0 1 6 -6H72a6 6 0 0 1 6 6V46"/><rect class="dp-pk2" x="28" y="44" width="72" height="46" rx="9"/></g><g class="dp-det"><path class="dp-nf dp-Lpk" d="M46 44V90M82 44V90"/><rect class="dp-gd2" x="58" y="58" width="12" height="14" rx="3"/><ellipse class="dp-bril" cx="38" cy="54" rx="3" ry="6" transform="rotate(10 38 54)"/><path class="dp-Fgd" d="M98 20.8Q99.35 26.65 105.2 28Q99.35 29.35 98 35.2Q96.65 29.35 90.8 28Q96.65 26.65 98 20.8Z"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "rincon-nuestro", nombre: "Un rincón nuestro",
    pista: "Algunos sueños tienen techo y puertas.",
    condicion: "Cumplís un plan de categoría Hogar",
    categoria: "Planes", nivel: "oro", puntos: 100, secreto: true,
    svg: `<svg class="dp-art dp-oro dp-h-gd" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Un rincón nuestro"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pk2" x="80" y="26" width="10" height="20" rx="2"/><rect class="dp-pp" x="34" y="52" width="60" height="38" rx="4"/><path class="dp-pk2" d="M26 56L64 24L102 56Z"/><path class="dp-tl2" d="M55 90V76a9 9 0 0 1 18 0V90Z"/></g><g class="dp-det"><rect class="dp-gd1" x="40" y="62" width="11" height="11" rx="2"/><rect class="dp-gd1" x="77" y="62" width="11" height="11" rx="2"/><path class="dp-Fwh" d="M64 50.6C55.2 45.1 51.9 40.7 53 36.85C54.1 33 60.7 33 64 38.5C67.3 33 73.9 33 75 36.85C76.1 40.7 72.8 45.1 64 50.6Z"/><circle class="dp-Fgd" cx="69" cy="80" r="1.6"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "cumplidores", nombre: "Cumplidores",
    pista: "Diez planes cumplidos. ¡Qué equipo!",
    condicion: "10 planes cumplidos",
    categoria: "Planes", nivel: "oro", puntos: 200, secreto: false,
    svg: `<svg class="dp-art dp-oro dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cumplidores"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><ellipse class="dp-gd1" cx="38" cy="42" rx="9" ry="11"/><ellipse class="dp-gd1" cx="90" cy="42" rx="9" ry="11"/><path class="dp-gd2" d="M42 24H86V44C86 58 76 68 64 68C52 68 42 58 42 44Z"/><rect class="dp-gd2" x="58" y="68" width="12" height="10" rx="2"/><rect class="dp-pk2" x="46" y="78" width="36" height="10" rx="4"/></g><g class="dp-det"><path class="dp-bril" d="M50 30V44C50 50 53 55 57 58C53 52 52 44 52 30Z"/><path class="dp-Fpk" d="M64 56.8C49.6 47.8 44.2 40.6 46 34.3C47.8 28 58.6 28 64 37C69.4 28 80.2 28 82 34.3C83.8 40.6 78.4 47.8 64 56.8Z"/><path class="dp-Fgd" d="M103 13.2Q104.65 20.35 111.8 22Q104.65 23.65 103 30.8Q101.35 23.65 94.2 22Q101.35 20.35 103 13.2Z"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  },
  {
    id: "dia-senalado", nombre: "Día señalado",
    pista: "Algunos días del mes pesan más que otros.",
    condicion: "Dejas algo (poke, carta o entrada) el día 10 de un mes",
    categoria: "Fechas", nivel: "normal", puntos: 50, secreto: true,
    svg: `<svg class="dp-art dp-normal dp-h-pk" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Día señalado"><circle class="dp-ring" cx="64" cy="64" r="61"/><circle class="dp-disc" cx="64" cy="64" r="56"/><g class="dp-base"><rect class="dp-pp" x="30" y="30" width="68" height="60" rx="9"/><path class="dp-pk2" d="M30 48V39a9 9 0 0 1 9 -9H89a9 9 0 0 1 9 9V48Z"/><rect class="dp-gd2" x="44" y="22" width="6" height="14" rx="3"/><rect class="dp-gd2" x="78" y="22" width="6" height="14" rx="3"/></g><g class="dp-det"><path class="dp-pk2" d="M64 84.8C45.6 73.3 38.7 64.1 41 56.05C43.3 48 57.1 48 64 59.5C70.9 48 84.7 48 87 56.05C89.3 64.1 82.4 73.3 64 84.8Z"/><circle class="dp-Fgd" cx="42" cy="58" r="2"/><circle class="dp-Fgd" cx="54" cy="58" r="2"/><circle class="dp-Fgd" cx="74" cy="58" r="2"/><circle class="dp-Fgd" cx="86" cy="58" r="2"/><circle class="dp-Fgd" cx="42" cy="82" r="2"/><circle class="dp-Fgd" cx="86" cy="82" r="2"/></g><g class="dp-cand"><circle cx="98" cy="98" r="13"/><rect x="92" y="97" width="12" height="9" rx="2"/><path d="M94.5 97V94a3.5 3.5 0 0 1 7 0V97"/></g></svg>`
  }
];

const DpLogros = (function () {
  var n = 0;
  var INICIO = '2024-02-10';
  function aFecha(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dif(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
  return {
    inicio: INICIO,
    lista: DP_LOGROS,
    porId: function (id) { return DP_LOGROS.filter(function (l) { return l.id === id; })[0] || null; },
    /* días juntos contando el día de inicio como 0 (el 23-nov-2026 son 1017) */
    diasJuntos: function (inicio, hoy) { return Math.max(0, dif(aFecha(inicio || INICIO), hoy || new Date())); },
    /* fecha (Date) en la que se cumple un logro de días; null si no es de días */
    fechaDias: function (logro, inicio) {
      if (!logro || !logro.dias) return null;
      var d = aFecha(inicio || INICIO); d.setDate(d.getDate() + logro.dias); return d;
    },
    /* SVG listo para insertar. bloqueado=true añade .is-locked y cambia el aria-label. Evita ids repetidos del degradado holo. */
    svg: function (logro, bloqueado) {
      var s = logro.svg;
      n += 1;
      s = s.replace(/dp-hg-[\w-]+/g, function (m) { return m + '-' + n; });
      if (bloqueado) {
        var nom = logro.secreto ? 'Logro secreto' : logro.nombre;
        s = s.replace('class="dp-art ', 'class="dp-art is-locked ').replace(/aria-label="[^"]*"/, 'aria-label="' + nom + ' (bloqueado)"');
      }
      return s;
    },
    /* texto que se enseña según el estado */
    textos: function (logro, desbloqueado) {
      var oculto = logro.secreto && !desbloqueado;
      return { nombre: oculto ? '???' : logro.nombre, pista: oculto ? '???' : logro.pista, condicion: oculto ? '???' : logro.condicion };
    },
    total: function () { return DP_LOGROS.reduce(function (a, l) { return a + l.puntos; }, 0); }
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { DP_LOGROS: DP_LOGROS, DpLogros: DpLogros }; }

/* Exponerlos en window (las const de un script clásico no son propiedades de window) */
if (typeof window !== "undefined") { window.DP_LOGROS = DP_LOGROS; window.DpLogros = DpLogros; }
