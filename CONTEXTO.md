# +Dopamina — Contexto compartido del proyecto

> Fuente de verdad para todos los chats del proyecto (diseño, flujo, bugs…).
> Léelo entero antes de proponer o cambiar nada. Se actualiza en cada cambio desplegado.
> **Última actualización:** 2026-11-24 · **Estado:** en producción.

## 0. Cómo trabajar con este archivo

- **Un solo escritor:** solo el chat que despliega (Cowork, con acceso al repo y a GitHub) edita este archivo, en el mismo commit que el cambio. Los demás chats **proponen** y al terminar entregan una *entrada de registro* (ver §12) para que se incorpore.
- Si algo de aquí contradice el código, manda el código: avisa y se corrige este archivo.
- Idioma de la app y del equipo: **español** (tuteo, tono cercano). Respuestas del usuario: directas y concisas.
- Secciones: 1 Visión · 2 Personas y cuentas · 3 Stack e infraestructura · 4 Estructura del repo · 5 Modelo de datos · 6 Funcionalidades · 7 Notificaciones · 8 Reglas de negocio · 9 Diseño/UX · 10 Flujo de despliegue y pruebas · 11 Pendientes y riesgos · 12 Registro de cambios.

---

## 1. Visión

PWA **privada** para dos personas: un diario compartido de pareja ("Diario de Alba y Abdu"). Objetivo: crear un hábito semanal/diario de conexión (escribir, fotos, detalles, planes) con toques de juego (mascota, llaves, racha) sin presión ni castigos. Nada es público; solo dos cuentas autorizadas.

Principios que se han repetido en las decisiones del usuario:
- Sensación de **app**, no de "formulario de trabajo".
- **Sorpresa y misterio** (revelaciones, candados, check estilo BeReal).
- Dopi tiene 3 vidas: si nadie la cuida pierde 1 cada 48 h y sin vidas se va al álbum (recuperable con chispas); los puntos nunca bajan.
- Cada cambio ha de poder **deshacerse** si se pulsa sin querer (cumplidos, desbloqueos, cierre de sesión con confirmación).
- Simetría visual: textos y controles equilibrados (hubo varias rondas de ajuste de tamaños en iPhone).

## 2. Personas y cuentas

| Persona | Rol interno | Correo | Color |
|---|---|---|---|
| Abdu (el usuario que construye la app) | `fahd` | fahdkahnabdulah@gmail.com | rosa |
| Alba (su pareja) | `cilia` | ciliagomezalba@gmail.com | verde azulado (teal) |
| Cuenta de prueba | `fahd` con `parejaId: 'demo'` | prueba@test.com | datos separados, para ver la UI |

- `parejaId` real: `nuestra-pareja`. La cuenta demo escribe en `parejas/demo/...` (con datos de ejemplo sembrados por `seedDemoData`).
- Los roles están **fijos en el código** (`EMAIL_ROLES` en `app.js`); cualquier otro correo es rechazado en login/registro.
- Cada persona siempre se ve a sí misma a la izquierda y a su pareja a la derecha (columnas dinámicas por rol).
- Fechas fijas: cumpleaños de **Alba 5 abril**, de **Abdu 12 diciembre**; relación desde el **10 febrero 2024** (el usuario dudó del año → ver §11); Día de las Flores Amarillas (21 sep); Día de la novia (1 ago); aniversario mensual día 10.
- Alba **aún no tiene la app instalada ni notificaciones activadas**: el check con foto, la mascota Dopi y otras cosas son una **sorpresa** para ella (ver §11).
- Dispositivos: Abdu usa iPhone (PWA en iOS); Alba parece usar Android (hubo dudas de instalación en Android).

## 3. Stack e infraestructura

- **Frontend:** HTML/CSS/JS plano, sin framework ni bundler. Módulos ES con CDN de Firebase 10.12.0 (`app.js` y `deseos.js` son `type="module"`; `dopi.js`, `pet-logic.js`, `mascota-ui.js`, `ideas.js` son scripts clásicos).
- **Firebase** (proyecto `planning-with-ai-7a738`): Auth (email+contraseña), Firestore, Storage (fotos del check). Plan **Blaze en prueba gratuita hasta el 3 ene 2027** → hay que pasar a facturación de pago antes.
- **Hosting:** Netlify (sitio `dreamy-souffle-b80689.netlify.app`, equipo en plan Personal). Despliegue automático al hacer commit en `main` (tarda ~30–60 s).
- **Repo:** github.com/fahdkahnabdulah-code/diario-pareja, rama `main`.
- **Funciones serverless (Netlify):** `netlify/functions/*` con `firebase-admin` y `web-push`. Las programadas se declaran en `netlify.toml` (`[functions."nombre"] schedule = "..."`); el `exports.config` dentro del .js **no** lo reconoce Netlify.
- **Variables de entorno en Netlify** (solo nombres): `FIREBASE_SERVICE_ACCOUNT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CHECKIN_PAREJA_ID` (opcional, por defecto `nuestra-pareja`), `SECRETS_SCAN_OMIT_KEYS` (para que el escáner de secretos no rompa el despliegue). Cuidado: el escáner puede fallar si un valor del código coincide con una variable secreta.
- **PWA:** `manifest.json` (nombre "+Dopamina", `display: standalone`, tema rosa `#993556`) y `sw.js` (caché `diario-pareja-v5`, red primero y caché de respaldo, listeners de push y clic en notificación). `ASSETS` del SW no incluye `deseos.js`, `deseos.css` ni `ideas.js` (sin offline para esos; no es bloqueante).
- **Zona horaria de negocio:** Europe/Madrid (cron y avisos).

## 4. Estructura del repo

```
index.html            Pantallas (cargando, login, app), pestañas, modales y pantalla de Deseos
style.css             Estilos globales (tokens de color, claro/oscuro, app-shell de escritorio)
app.js                Núcleo: auth, entrada diaria, historial, fotos, racha, poke, push, fechas/eventos, check
ideas.js              Preguntas del día, frases para empezar, sección "Juntos" (1–2 días/semana)
deseos.js / .css      Buzón de deseos 2.0 (pantalla completa, llaves, bloqueo)
nosotros.js / .css    Pestaña Nosotros: Lista, Planes, Cartas (sobre + pop-up) y Logros
dopamina-art.css      Arte «pegatina blanda» de Design: tokens --d-*, iconos, insignias, chispa (el sprite iconos.svg va INLINE en index.html entre <!--ICONOS-->)
logros.js             Los 24 logros (id, nombre, pista, condición, puntos, svg) + DpLogros (exporta a window)
sobre.js / .css       DpSobre.montar(): sobre que se rasga arrastrando
chispa.js             DpChispa: svg de la moneda y animación de ganar puntos
iconos.svg            Fuente del sprite de iconos (no se sirve; está inlinado en index.html)
dopi.js / dopi.css    Componente SVG de la mascota Dopi
pet-logic.js          Lógica pura de Dopi (necesidades, puntos, tienda) + helper de Firestore
juegos.js / .css      Juegos a pantalla completa de Dopi en <canvas>: coche (Hill Drive: gasolina, chispas, volteretas) y saltos de plataformas. DopiJuegos.start(kind, opts)
mascota-ui.js         UI interactiva de la pestaña "Dopi" (arrastrar, limpiar, tienda…)
pet-ui.css            Estilos de la pestaña Dopi
sw.js, manifest.json, iconos
netlify.toml          Cron de las funciones programadas
netlify/functions/
  send-push.js          Relay de push (cliente → un suscriptor)
  schedule-checkin.js   Cron diario 00:05 UTC: elige la hora aleatoria del check
  checkin-notifier.js   Cron cada 10 min: manda el push del check cuando llega la hora
  juntos-notifier.js    Cron cada 30 min: aviso de los días "Juntos"
  eventos-notifier.js   Cron cada 30 min: avisos de fechas/eventos
  deseos-notifier.js    Cron cada 30 min: llave nueva (lunes) y recordatorio (sábado)
CONTEXTO.md           Este archivo
```

## 5. Modelo de datos (Firestore)

Todo cuelga de `parejas/{parejaId}/...`. **Las reglas de seguridad de Firestore no están versionadas en el repo** (no se pueden ver desde aquí): lo observado es que lectura/escritura funcionan para las cuentas autorizadas, incluido que la pareja actualice campos de un deseo ajeno.

| Colección / doc | Contenido |
|---|---|
| `entradas/{YYYY-MM-DD}` | `date`, `respuestas.{fahd,cilia}.{sentimiento,gracias,pendiente,pregunta}`, `autores`, `completado.{rol}`, `preguntaDia`, `shared.{hacer,recuerdo,sueno,logro}` (sección Juntos), `savedAt`. Existe un formato **antiguo** (`p1`/`p2`/`names`) que se muestra tal cual y cuenta como completo. |
| `checkins/{YYYY-MM-DD}` | Lo crea `schedule-checkin`: `momento`, `ventanaCierre`, `notificado`. Por rol: `{fahd,cilia}.{publicado,fotoUrl,pie,tarde}`; además `reacciones` y `comentarios[]`. Foto en Storage: `checkins/{parejaId}/{fecha}/{rol}.jpg`. |
| `deseos/{id}` | `texto`, `autor`, `tipo` (detalle/plan/regalo/otro), `tamano` (= **dificultad**: `facil`/`semana`=media/`especial`=difícil), `estado` (`pendiente`/`enmarcha`/`hecho`), `cumplido`, `cumplidoFecha`, `apuntadoPor`, `apuntadoFecha`, `desbloqueadoPor`, `desbloqueadoSemana` (clave ISO `2026-W47`), `soltadoPor`, `soltadoSemana`, `hechoPor`, `gracias.{emoji,nota,fecha}`, `creado`. Deseos antiguos solo tienen texto/`cumplido`/`visible` (se tratan como pendiente o hecho; `visible` ya no se usa). |
| `eventos/{id}` | Eventos personalizados: `nombre`, `fecha`, `frecuencia` (`unico`/`anual`/`mensual`/`semanal`), `visibilidad` (`compartido`/`propio`), `autor`, `emoji`. |
| `pokes/latest` | Último poke (💌) para el toast en tiempo real. |
| `push_subs/{rol}` | `{ sub }` = suscripción Web Push del dispositivo. |
| `avisos/{clave}` | Marcas de "aviso ya enviado" de las funciones (evitan repetir). |
| `juntos/{YYYY-MM-DD}` | `notificado` (aviso de Juntos ya enviado). |
| `mascota/estado`, `mascotaLog/*` | Estado compartido de Dopi y su registro de eventos. |
| `planes/{id}` | Lista y Planes: `texto`, `autor`, `tipo` (`hacer`=lista / `futuro`=plan a futuro), `categoria` (viaje/cita/hogar/regalo/otro), `horizonte` (`ano`/`proximos`/`algun`, solo futuro), `estado` (`pendiente`/`hecho`), `hechoPor`, `hechoFecha`, `creado`. |
| `cartas/{id}` | `de`, `para`, `titulo`, `texto`, `creado`, `abiertaEn` (vacío = sin abrir). El texto solo se enseña al abrir el sobre. |
| `logros/{logroId}` | Se crea una sola vez al cumplirse: `fecha`, `por`, `puntos`, `visto_fahd`, `visto_cilia` (false = aún por celebrar a esa persona). Suma los puntos a `mascota/estado` en la misma transacción. |
| `nosotros/stats` | Contadores: `pokes_{rol}`, `dia10_{rol}`. |
| `deseo_semanal/{rol}` | **Obsoleto** (sorteo semanal eliminado). Puede quedar basura. |

## 6. Funcionalidades (por pantalla)

**Login / arranque.** Pantalla "Iniciando sesión" mientras Firebase decide (sin flash de login). Registro y login solo con los 3 correos autorizados. La ✕ del header abre un recuadro de confirmación (Cancelar/Aceptar) antes de cerrar sesión.

**Header.** Racha (mascota SVG de la racha), botones 💭 Deseos (con insignia), 📸 Check, 💌 Poke, ✕ Cerrar sesión.

**Pestaña Entrada.** Tres preguntas de siempre (cómo me siento / te agradezco / algo que quiero decirte) cuyo **enunciado varía cada día** (`ideas.js`), con frases-chip para empezar (rotan cada 20 s). **Pregunta del día** como apartado propio con su campo. Sección **Juntos** (hacer / recuerdo / sueño / logro), solo abierta 1–2 días a la semana (azar determinista por semana, igual para los dos). Cada uno solo ve **su** columna mientras escribe; la del otro aparece cuando la entrada está completa por los dos. Tarjeta de "Llave de deseos" / "Deseo en marcha" (§6 Deseos). Banner de estado ("esperando a…", "te toca completar").

**Pestaña Historial.** Subpestañas **Entradas** y **Fotos**. Las entradas incompletas salen 🔒 bloqueadas (modal explicativo). Fotos: una por día, con reacciones (emoji) y comentarios entre los dos.

**Check del día (📸, estilo BeReal).** `schedule-checkin` elige una hora aleatoria 10:00–21:00 Madrid; a esa hora llega push. Captura **secuencial** (cámara frontal y luego trasera), composición en canvas (la frontal en miniatura), pie de foto opcional. La foto de la pareja permanece oculta hasta que subes la tuya. Reacciones ❤️ 😍 😂 🥺 (sin push) y comentarios con push al otro.

**Pestaña Fechas.** Días juntos (años/meses/días), calendario mensual navegable con emoji + nombre del evento (tooltip), "Próximas fechas" con cuenta atrás, cumpleaños fijos, aniversario anual fijo (10 feb, "Aniversario (N años)"), aniversario mensual (día 10), eventos personalizados (alta/baja). Las notificaciones de eventos avisan a 7 días, 3 días, el día anterior y el mismo día.

**Pestaña Nosotros (5.ª pestaña).** Subpestañas **Lista** (cosas por hacer juntos: texto + categoría, check reversible, "Hechas juntos" plegable, borrar con confirmación en línea), **Planes** (igual + horizonte Este año / Próximos años / Algún día), **Cartas** y **Logros**.
- **Cartas:** se escribe título opcional + texto (máx. 2500), se envía **cerrada** (no editable). Al recibir (push sin spoiler) y **al entrar o volver a la app** sale un pop-up con el **sobre** (`DpSobre`): se rasga arrastrando o con "Abrir sin deslizar"; al abrirse se lee la carta, se marca `abiertaEn`, push al autor y botón "Guardar en nuestro archivo". "Más tarde" pospone hasta que se reabra la app (sin contadores rojos, solo un punto en la pestaña). Las leídas quedan en "Nuestro archivo"; las enviadas muestran si se abrieron.
- **Logros (24, en `logros.js`):** compartidos por la pareja; se evalúan al abrir la app, al abrir la subpestaña Logros y tras acciones relevantes (plan hecho, carta, poke, entrada, check). Al desbloquear: transacción crea `logros/{id}` y **suma los puntos a Dopi**; cada persona ve una celebración la primera vez (`visto_{rol}`) y push "Habéis desbloqueado un logro". Bloqueados = gris con candado; **4 secretos** salen como `???`. Los de días juntos cuentan desde 10-feb-2024 (`inicio` pasado por `app.js`). Condiciones: ver `cumple()` en `nosotros.js` (Dopi nace = etapa ≥2, crece ≥3, alma gemela = 5; "pensando en ti" = 10 pokes entre los dos desde que existen los contadores; "buzón lleno" = 10 cartas; "día señalado" = poke/carta/entrada el día 10).
- Al estrenarse hay **4 logros de días ya cumplidos** (100/365/500/1000 = +530 ✦ a Dopi) que se celebran en cola la primera vez.

**Pestaña Dopi.** Mascota compartida (huevo → cría → joven → adulta → alma gemela). Necesidades: comida, ánimo, energía, cariño, limpieza (con suelo, nunca llegan a 0; el desgaste se calcula "en perezoso" al leer). Interacción tipo Pou: arrastrar comida/pelota/manta/regalo; esponja para limpiar; caricias; cosquillas al tocar. Puntos ✦ por: escribir diario (12), check (10), poke (1, máx. 3/día), cumplir un deseo (15), día en equipo (10), racha semanal (100), reencuentro tras 3+ días (10) y logros; tope de 60 ✦/persona/día (ver §8). Tienda de accesorios y habitaciones. Estado en `mascota/estado`.

**Racha.** Semanas ISO consecutivas con al menos una entrada; con margen de gracia (si esta semana aún no hay entrada cuenta desde la anterior). Alimenta la mascota de la racha y el premio semanal de Dopi.

**Poke 💌.** "Pensando en ti": toast en tiempo real + push.

**Deseos 2.0 (💭, pantalla completa).** Tres pestañas: **💝 De {pareja}**, **📝 Míos**, **➕ Añadir**. Cabecera fija (título, ✕, pestañas). Ver §8 para las reglas.

## 7. Notificaciones push (Web Push + VAPID)

Cliente: `suscribirsePush` guarda la suscripción en `push_subs/{rol}`; `enviarPush(rol, título, cuerpo, tag)` llama a `/.netlify/functions/send-push`.

| Evento | Origen | Cuándo |
|---|---|---|
| Entrada completada (`entrada-completada`) | cliente | al guardar tu parte |
| Poke (`poke`) | cliente | al pulsar 💌 |
| Comentario en el check (`checkin-comentario`) | cliente | al comentar |
| Deseo desbloqueado / cumplido / gracias (`deseo-apuntado`, `deseo-hecho`, `deseo-gracias`) | cliente | al hacerlo (sin revelar cuál) |
| Check del día | `checkin-notifier` | a la hora aleatoria |
| Día "Juntos" | `juntos-notifier` | a partir de las 18:00 Madrid, 1 vez |
| Fechas/eventos | `eventos-notifier` | desde las 09:00 Madrid; 7d/3d/1d/mismo día; cumpleaños: la pareja con antelación, el cumpleañero solo el día |
| Llave de deseos nueva | `deseos-notifier` | lunes ≥10:00 Madrid, si no la ha usado y hay deseos bloqueados |
| Recordatorio de deseo desbloqueado | `deseos-notifier` | sábado ≥12:00 Madrid |

Todas las funciones son **no-op seguras** si faltan las variables de entorno. Los avisos del servidor se deduplican con docs en `avisos/`. Si alguien no tiene push activado, su aviso no se marca como enviado (se reenviará cuando lo active).

## 8. Reglas de negocio

**Entrada.** Cada persona completa su parte (`completado.{rol}`); la entrada del otro no se ve hasta que ambos completan. Las entradas se guardan por fecha (`YYYY-MM-DD`).

**Juntos.** `semanaDe(dia)=floor((dia+3)/7)` (semanas de lunes a domingo); RNG con semilla `semana*7919+1234`: con prob. 0,5 hay 1 día (entre martes y viernes) y si no 2 días (uno entre lunes y miércoles y otro entre viernes y sábado). `ideas.js` y `juntos-notifier.js` usan **la misma lógica; si cambia una hay que cambiar la otra**.

**Deseos — llaves y bloqueo.**
- Los deseos de tu pareja se ven **siempre bloqueados**: texto desenfocado con relleno (el texto real no está en el DOM) + 🔒, más tipo, dificultad y "Añadido el …".
- **1 llave por semana** (lunes–domingo; se renueva el lunes). Se calcula a partir de los deseos (`desbloqueadoPor` + `desbloqueadoSemana`), no hay otro documento.
- Desbloquear (con confirmación) pasa el deseo a **en marcha** y apuntado por ti; el autor recibe push sin texto.
- Si tocas un candado sin llave sale un mensaje en esa tarjeta.
- **Volver a bloquear** (con confirmación) devuelve la llave si el desbloqueo era de esta semana, pero **solo una vez por semana** (`soltadoSemana`). Si el desbloqueo es de otra semana, se puede volver a bloquear sin devolver llave y sin gastar el cupo semanal.
- **Cumplir** ("Hecho") pasa a cumplido, push al autor y +15 ✦ a Dopi (máx. 1/día). El autor puede dar las gracias (emoji + nota) → push a quien lo hizo. **Cumplido se puede deshacer** (autor o quien lo cumplió): vuelve a en marcha (o pendiente) y se borran las gracias.
- El autor ve sus deseos con el **estado** en que los tiene su pareja: 🔒 Sin revelar · 🔓 {pareja} lo está preparando · ✅ Cumplido por {pareja}. Ve el texto en todos (sabe cuál cogió), la sorpresa es cómo y cuándo.
- Orden de "Por desbloquear": por antigüedad (el más antiguo primero). Secciones En marcha / Por desbloquear / Cumplidos por ti **plegables** (se recuerda el estado mientras la app está abierta).
- Dificultad: 🟢 Fácil, 🟡 Media, 🔴 Difícil (ids antiguos `facil`/`semana`/`especial` se conservan).

**Dopi.** Principio "romántica, no punitiva": suelo de necesidades, puntos y XP que nunca bajan, sin cron (desgaste perezoso).
- **Economía endurecida (2026-11-24):** recompensas diario 12, check 10, deseo cumplido 15, poke 1 (máx. 3/día); **tope de 60 ✦ por persona y día** (`DAILY_PTS_CAP`, campo `days.{fecha}.{uid}.earned`); fuera del tope: racha semanal (100), reencuentro (10) y logros. Cosméticos ×3 (sombreros 270–480, corona 1350, cuartos 840–1200); comida y juguetes sin cambios. Evolución: XP por etapa 0/60/600/1800/4000 y días en equipo 0/1/8/25/50.
- **Moneda:** la chispa propia (`#ic-chispa`, `DpChispa`) sustituye al símbolo ✦ en la interfaz (pestaña Dopi, tienda, toasts, logros).

## 9. Diseño y UX

- **Arte propio (2026-11-24):** estilo «pegatina blanda» diseñado en Claude Design (proyecto "Diseño visual de +Dopamina"). Los emojis de Apple del header y de las pestañas se sustituyeron por iconos propios (`<svg class="dp-ic"><use href="#ic-…"/></svg>`); los emojis quedan solo en reacciones, el mundo de Dopi (comida, juegos), calendario y algunos textos/avisos. Etiquetas de las preguntas del diario, títulos de Deseos/Check/Historial y la «Llave de deseos» ya usan iconos (`.dp-lbl-ic`, ver final de `style.css`). El chip de «N semanas seguidas» de la cabecera se quitó (la racha semanal sigue dando ✦ a Dopi desde `loadRacha`). Los colores de `dopamina-art.css` (`--d-*`) apuntan a los tokens de `style.css`. Para cambiar un icono o logro: pedirlo a Design, que exporta ficheros limpios, y volver a inlinar el sprite en `index.html`.

- Paleta: rosa (`--pink-*`), verde azulado (`--teal-*`), dorado (`--gold-*`); modo claro y oscuro por `prefers-color-scheme`; tokens separados para superficie de tarjeta y fondo de inputs.
- Móvil primero; en escritorio (≥700 px) la app se centra como tarjeta flotante de ancho fluido (`clamp(560px, 70vw, 640px)`).
- **iOS:** inputs a 16 px forzados (evita zoom); placeholders pueden ser menores; el teclado se oculta al tocar fuera; hay que respetar `env(safe-area-inset-*)`.
- Pantallas de pantalla completa (Deseos) con cabecera fija y fondo sólido; modales con `modal-overlay`; atributo `[hidden]` necesita reglas explícitas (varios contenedores usan `display:flex`).
- Tono: cercano, sin tecnicismos ("Check", no "check-in"; "Juntos", "Dopi", "llave").
- Lo que el usuario ha pedido en repetidas ocasiones: centrado, simetría de tamaños, botones grandes y claros, mensajes explicativos en vez de botones muertos.

## 10. Flujo de despliegue y pruebas

- **Cómo se despliega:** commit en `main` → Netlify. En la práctica el chat que despliega sube archivos con la página de subida de GitHub (`/upload/main`, y `/upload/main/netlify/functions` para funciones; **la función antes que la app**) y verifica leyendo los archivos servidos (`fetch(file?cb=…)`), luego recarga con `?v=N`.
- **Comprobaciones antes de dar algo por hecho:** pruebas locales con Playwright y un Firebase simulado (almacén local `fakefs`), con las dos cuentas; después, verificación en la web real con la cuenta demo. **No se ha probado en los móviles reales** salvo capturas que envía el usuario: pedirlas cuando importe la visual.
- No afirmar que algo está hecho sin verificarlo en el archivo desplegado.
- Tras desplegar, el usuario debe **cerrar y reabrir la app** (PWA/caché).

## 11. Pendientes, riesgos y notas

- **Blaze** termina el 3 ene 2027 → pasar a pago o la subida de fotos/funciones puede fallar.
- **Reglas de Firestore/Storage:** no versionadas; las de Storage no están endurecidas. Conviene revisarlas y guardarlas en el repo.
- **Sorpresas para Alba:** ocultar 📸 y la pestaña Dopi para ella hasta el momento de la sorpresa; hoy ve todo en cuanto instale la app. Alba **no ha activado notificaciones** aún.
- **Avisos del servidor sin probar en producción:** primera llave de deseos el lunes 23 nov 2026 (10:00); "Juntos" y eventos (5 y 10 dic) dependen del cron y de las variables de Netlify.
- **Fecha de relación:** 10 feb 2024 es una suposición del usuario ("creo que fue este año"); confirmar.
- **Historial en escritorio:** la segunda columna queda vacía.
- `deseo_semanal` en Firestore es basura heredada; limpiar cuando convenga.
- `sw.js`: añadir `deseos.js`, `deseos.css` e `ideas.js` a `ASSETS` si se quiere offline.
- Sistema de puntos para **personalizar** la mascota fue una idea aplazada ("lo exploraremos más adelante"); la tienda de Dopi ya existe.
- El correo por EmailJS se eliminó; ya no hay avisos por email (solo push).

## 12. Registro de cambios (más reciente primero)

Formato de cada entrada: `AAAA-MM-DD · área · qué cambió · archivos · por qué/decisión del usuario`.

- 2026-11-24 · Nosotros · **Buscador de pelis y series**: al escribir el título salen sugerencias con carátula, año y nota; al elegir una se guarda con sinopsis, duración/temporadas, géneros y plataformas (se pre-marca la plataforma) y la fila muestra la carátula; tocar la fila despliega los detalles. Función de Netlify `netlify/functions/peli-search.js` (la app nunca ve la clave). Usa **TMDB** con la variable de entorno `TMDB_KEY` (v3 o token de lectura v4); **sin clave solo busca series** (TVMaze). Datos extra en el doc de `planes` bajo `meta`. · `nosotros.js`, `nosotros.css`, `netlify/functions/peli-search.js`.
- 2026-11-28 · Dopi · **Vidas y avisos**: Dopi tiene 3 vidas (`lives`, `lifeAt`); si NADIE la cuida pierde 1 cada 48 h (se calcula en perezoso desde el último cuidado de cualquiera, `lifeStatus`); un día en equipo devuelve 1. Sin vidas pasa al álbum con `died:true` y llega un huevo sin elegir (`applyDeath`, lo hace `pet-notifier` o el primer móvil que abra la app con `PetStore.checkDeath`); se recupera por 600 chispas como siempre. Las vidas empiezan a contar desde `LIFE_START` (29-nov-2026 12:00 UTC). Nueva función programada `pet-notifier` (cada 30 min, solo 09–22 h Madrid): «te echa de menos» a las 24 h (a quien lleva más sin cuidarla), aviso al perder vida, al quedar 1 vida, último aviso ~24 h antes de irse y despedida; marca en `mascota/estado.avisosVida` para no repetir. Tarjeta «Vidas» en la pestaña Dopi. **Cambia el principio «nada muere»** · `pet-logic.js`, `mascota-ui.js`, `pet-ui.css`, `netlify/functions/pet-notifier.js`, `netlify.toml`, `sw.js` (v10).
- 2026-11-24 · Dopi · **Rediseño completo**: 3 especies (A Mochi, B Orejitas, C Estrella) × **10 fases** (~4–5 meses hasta la 10; XP y días en equipo por fase en `pet-logic.js`), nombre y elección de huevo la primera vez, ojos dinámicos (siguen el dedo, parpadean, reaccionan) y 15 sobrecapas de expresión (zzz, lágrimas, interrogación, ojos de corazón/estrella, mareo…). Al llegar a la fase 10 se elige **seguir o ciclo nuevo**; el Dopi anterior pasa al **álbum** y se recupera por **600 ✦** (intercambia con el actual, no se pierde nada). Se quita el botón «Reiniciar a Dopi»; reinicio único automático (`RESET_VER=2`, conserva récords). Logros nuevos: `ciclo-nuevo`, `vuelve-a-casa`, `tres-especies` (27 en total). Barras de necesidades `.dp-nb` con iconos propios. · `dopi.js` (reescrito), `dopi-especies.js` (arte generado), `ojos.js`, `dopamina-art3.css`, `expresiones.css`, sprites `iconos-necesidades`/`iconos3`/`expresiones` inlineados en `index.html`, `pet-logic.js`, `mascota-ui.js`, `pet-ui.css`, `nosotros.js`, `logros.js`, `sw.js` (v7) · decisión del usuario: las 3 especies se pueden tener, nunca a la vez.
- 2026-11-24 · Diseño · **Emojis sustituidos por iconos del Design** en Deseos, Dopi (comida, juguetes, necesidades, suciedad, herramientas), Entrada, Historial y toasts: segundo sprite `iconos2.svg` (51 símbolos, inlineado en `index.html` entre `<!--ICONOS2-->` y `<!--/ICONOS2-->`) + `dopamina-art2.css`; el chip de racha de arriba a la izquierda se elimina. En `mascota-ui.js` helpers `ico()`, `EMO2IC`, `noEmo()` y tokens `{{id:px}}`. Se mantienen emojis solo en reacciones, eventos de calendario y textos push (✦ ✓ ✕ también) · `index.html`, `app.js`, `ideas.js`, `deseos.js`, `mascota-ui.js`, `pet-logic.js`, `style.css`, `dopamina-art2.css`.
- 2026-11-24 · Dopi/Nosotros · **Juegos nuevos**: coche (pedales Acelerar/Frenar, gasolina, chispas) y saltos de plataformas (nube que se rompe, resortes, arañas); se mantienen Atrapa (pelota) y Reflejos (consola); se eliminan globos, ovillo, frisbi y peluche. **Récords por juguete** en `mascota/estado.records[juguete][rol]` (el marcador enseña tu récord y el de tu pareja; batir el propio da +3 ✦ con el tope diario). Coche y saltos son gratis, Reflejos 50 ✦. **Lista > Pelis y series** (guardadas en `planes` con `tipo:'pelis'`, campos formato/plataforma, nota 1-5 de cada uno) · `juegos.js/.css`, `pet-logic.js`, `mascota-ui.js`, `nosotros.js/.css`, `index.html`.
- 2026-11-24 · Nosotros · Nueva 5.ª pestaña: **Lista**, **Planes**, **Cartas** (sobre que se rasga + pop-up al entrar, push, "Más tarde") y **24 Logros** que suman ✦ a Dopi · `nosotros.js/.css`, `logros.js`, `sobre.js/.css`, `chispa.js`, `dopamina-art.css`, `index.html`, `app.js`.
- 2026-11-24 · Diseño · Iconos propios (header, pestañas) y **chispa** como moneda en vez de ✦ · `index.html`, `mascota-ui.js`, `pet-ui.css`, `app.js`.
- 2026-11-24 · Dopi · **Economía más difícil**: recompensas más bajas, tope 60 ✦/persona/día, cosméticos ×3, evolución más lenta · `pet-logic.js`.
- 2026-11-21 · Proyecto · Se crea `CONTEXTO.md` como memoria compartida del proyecto de Claude (decisión: vive en el repo y un solo chat lo escribe).
- 2026-11-20 · Login · La ✕ del header pide confirmación (Cancelar/Aceptar) antes de cerrar sesión · `index.html`, `app.js`, `style.css`.
- 2026-11-20 · Deseos · Cabecera fija (título + ✕ + pestañas) con fondo sólido; corrige capa que tapaba el título y la ✕ · `index.html`, `deseos.css`.
- 2026-11-19 · Deseos · **1 llave/semana**; mensaje al tocar candado sin llave; secciones plegables; orden por antigüedad con "Añadido el…"; "tamaño" → **nivel de dificultad** (🟢🟡🔴); volver a bloquear con confirmación y **1 devolución/semana**; aviso push solo el lunes · `deseos.js`, `deseos.css`, `deseos-notifier.js`, `netlify.toml`.
- 2026-11-19 · Deseos · Pestañas **De {pareja} / Míos / Añadir** (se elimina el Tablero con columnas); en Míos, estado por deseo; todo centrado · `deseos.js`, `deseos.css`, `index.html`, `app.js`.
- 2026-11-19 · Deseos · **Se elimina el sorteo/misión semanal**: los deseos de la pareja se ven bloqueados (borrosos + candado) y se desbloquean con llaves; cumplidos reversibles; sin "sorpresa/pista" · `deseos.js`, `deseos.css`, `deseos-notifier.js`.
- 2026-11-18 · Deseos 2.0 · Nueva pantalla completa de deseos con tipo, estados y gracias, notifier de deseos (`deseos-notifier.js`), `wishDone` en Dopi · `deseos.js`, `deseos.css`, `index.html`, `app.js`, `pet-logic.js`.
- 2026-11-18 · Fechas · Cumpleaños fijos (Alba 5 abr, Abdu 12 dic), aniversario anual fijo, `eventos-notifier` con avisos escalonados · `app.js`, `eventos-notifier.js`, `netlify.toml`.
- 2026-11-18 · Historial/Entrada · Fotos en su propia subpestaña con reacciones y comentarios; pregunta del día como apartado propio; "Juntos" 1–2 días/semana con push (`juntos-notifier`) · `ideas.js`, `app.js`, `index.html`, `style.css`, `juntos-notifier.js`.
- 2026-11-17 · Entrada · Preguntas con enunciado distinto cada día, frases-chip rotativas (20 s), tamaños de texto equilibrados en iPhone · `ideas.js`, `style.css`.
- Anteriores (resumen): diario con entradas bloqueadas hasta completar ambos; racha semanal; poke; fechas y calendario; eventos personalizados; push real (Netlify + VAPID); check de fotos BeReal con funciones programadas; reacciones y comentarios del check; mascota Dopi con necesidades, tienda e interacción tipo Pou; renombrado a "+Dopamina".
