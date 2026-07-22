# TODO.md — HELIOS: El Oráculo Consciente

Estado actual del repo (`main`): app estática de una sola página —
`index.html` + `script.js` + `style.css`, sin build tool, sin backend,
sin tests, desplegada vía GitHub Pages. 27 commits, JS 50.6% / HTML 30.9% / CSS 18.5%.

Este documento define deuda técnica, próximos pasos y la arquitectura
objetivo para que HELIOS pase de demo estática a plataforma sostenible.

---

## 0. Principios (no negociables)

- [ ] Separar claramente **dato observado** (NASA/NOAA en vivo) de
      **modelo propio** (IRG, FTRT, ICS, IRSE). El README actual mezcla
      ambos como si tuvieran el mismo estatus epistémico.
- [ ] Cada métrica propia debe llevar una etiqueta de nivel de evidencia
      visible en la UI: `ESTABLISHED` / `PARTIAL` / `ACTIVE HYPOTHESIS`
      (mismo patrón que ya usas en noosfera-app).
- [ ] Ningún claim cuantitativo sin fuente o sin nota de "hipótesis
      no validada" junto al número.

---

## 1. Auditoría de código (bloqueante antes de crecer)

Hallazgos confirmados tras revisar `script.js` completo (no son
hipótesis, son bugs reales presentes hoy en `main`):

- [ ] **CRÍTICO — `state` fuera de scope.** Hay dos bloques
      `DOMContentLoaded` separados. El primero (arriba del todo)
      contiene `fetchSolarData()` y escribe en `state.ftrt` /
      `state.kp`, pero `state` está declarado como `const` dentro del
      *segundo* `DOMContentLoaded`. Cuando `fetchSolarData` se ejecuta,
      lanza `ReferenceError: state is not defined`. Unificar en un
      solo listener con un único `state` accesible a ambas funciones.
- [ ] **CRÍTICO — bloque de inicialización anidado dentro de
      `startBioSync`.** `openModal`, `closeModal`, los listeners de
      `.info-trigger`, `window.onclick` del modal, y las funciones
      `simulateDataChange` / `updateSocialFeed` / `generateKondratievChart`
      están definidos *dentro del cuerpo de la función* `startBioSync`,
      después del `catch`. Esto significa que el modal y esos módulos
      solo se registran si `startBioSync()` se llega a ejecutar, no al
      cargar la página. Sacar todo ese bloque fuera de `startBioSync`,
      al nivel del `DOMContentLoaded`.
- [ ] **Bio-Sync no mide nada real.** El BPM se genera con
      `Math.floor(Math.random() * 40) + 60`. Se pide permiso de cámara
      y se enciende el stream, pero nunca se leen píxeles ni se hace
      PPG real — el stream solo se apaga al final. La UI muestra
      "Sincronización Completa" y "Nivel de Coherencia" como si fuera
      una medición. Decidir: (a) implementar PPG real desde
      `canvas.getImageData()` sobre el frame de video, o (b) si se deja
      como demo, marcarlo explícitamente en la UI como simulación —
      no presentar un número aleatorio con la misma autoridad visual
      que el IRG o el FTRT.
- [ ] **Rango de fechas hardcodeado y desactualizado.** `fetchSolarData`
      pide a NASA DONKI el rango `2024-01-01` a `2024-12-31` pese a que
      el comentario dice "últimos 30 días". Cambiar a fechas dinámicas
      (`new Date()` menos 30 días) o los datos mostrados quedan
      congelados en 2024 sin importar cuándo se cargue la app.
- [ ] **FTRT real de `fetchSolarData` no es la fórmula del proyecto.**
      Aquí el valor sale de `1.0 + cmeData.length * 0.1 + (0.5 si algún
      Kp > 5)` — un placeholder sin relación con
      `Σ(M_planeta × R_☉)/d_planeta³` normalizado contra Júpiter.
      Confirma el riesgo ya anotado: esta versión y la de
      `FTRT-Scientific-Validation` van a divergir si no se unifican.
      Sustituir por el motor validado, o renombrar esta métrica interna
      (no reutilizar el nombre "FTRT" para algo que no es esa fórmula).
- [ ] **`API_KEY = 'DEMO_KEY'` en el cliente.** Funciona pero con rate
      limit muy bajo (30 req/hora, 50/día compartido). Si el tráfico
      crece, moverlo a variable de entorno + proxy propio, o documentar
      claramente el límite en README para quien clone el repo.
- [ ] **`window.showModule` depende de `event` global implícito**
      (`event.target.classList.add('active')` sin recibir `event` como
      parámetro). Funciona por comportamiento heredado de navegadores
      antiguos, pero es fragil — pasar el evento explícitamente:
      `onclick="showModule('id', event)"`.
- [ ] Verificar manejo de errores de fetch: hoy el `catch` de
      `fetchSolarData` solo hace `console.error` y comenta "mantenemos
      la simulación", pero no hay ninguna simulación de respaldo
      definida en el código — si falla NASA, el dashboard simplemente
      no actualiza `ftrt`/`kp` y no hay feedback visual al usuario.

## 2. Higiene de repositorio

- [ ] `CONTRIBUTING.md` existe pero el README dice "(próximamente)" —
      resolver la inconsistencia.
- [ ] Añadir `.eslintrc` mínimo (o `biome.json`) — no hay linter ni
      formatter configurado.
- [ ] Añadir GitHub Action de CI que al menos valide HTML/JS en cada
      push (hoy el único workflow es el deploy de Pages).
- [ ] Añadir tests, aunque sean mínimos (ver arquitectura, sección
      "Testing").
- [ ] `package.json` — hoy no existe. Sin él no hay forma estándar de
      instalar dependencias de dev (linter, bundler, test runner).

## 3. Datos en vivo

- [ ] Confirmar qué endpoints usa hoy `script.js` (NOAA Kp, NASA DONKI,
      F10.7) y documentarlos en un `DATA_SOURCES.md`.
- [ ] Añadir caché local (localStorage o IndexedDB) con TTL corto para
      no golpear las APIs en cada carga y degradar con gracia si están
      caídas.
- [ ] Rate limiting / retry con backoff para las llamadas a NOAA/NASA.

## 4. Métricas propias (IRG, FTRT, ICS, IRSE)

- [ ] **IRG**: documentar la fórmula exacta de combinación
      (¿promedio ponderado? ¿qué pesos?) — hoy el README solo da los
      rangos de interpretación, no el cálculo.
- [ ] **FTRT**: reutilizar el motor ya validado en
      `Chizhevsky-Foundation/FTRT-Scientific-Validation` en vez de
      reimplementarlo aquí — evitar tener dos versiones de la misma
      fórmula divergiendo con el tiempo.
- [ ] **ICS** (Índice de Crispación Social): hoy no hay fuente de datos
      social visible en el stack. Decidir: ¿API real (ej. datos
      agregados públicos) o se retira del dashboard hasta tener fuente?
- [ ] **IRSE**: mismo problema — ¿de dónde salen los datos de mercados
      y Ondas de Kondratiev? Si es un placeholder, marcarlo como
      `ACTIVE HYPOTHESIS` explícitamente en la UI, no presentarlo junto
      a datos NOAA en tiempo real como si tuvieran el mismo peso.

## 5. Arquitectura (ver ARCHITECTURE.md)

- [ ] Modularizar `script.js` en módulos ES (hoy es presumiblemente un
      único archivo monolítico, igual que noosfera-app antes de la
      modularización en 8 hooks / 11 componentes).
- [ ] Separar capa de datos (fetchers) de capa de presentación (DOM).
- [ ] Evaluar migrar de manipulación directa del DOM a un enfoque más
      mantenible — no necesariamente un framework pesado, pero al menos
      un patrón de estado central (ver ARCHITECTURE.md).

## 6. UX / Contenido

- [ ] Revisar el tono del README para producción: hoy mezcla lenguaje
      de manifiesto ("HELIOS es el fin de esa mentira") con secciones
      técnicas serias. Esto ya se marcó como problema en
      Heliobiologia.app — mismo patrón aquí. Separar "visión/manifiesto"
      del "qué hace la app y con qué evidencia".
- [ ] Sección "El Legado de Chizhevsky" — verificar y citar fuentes
      históricas concretas, no solo la cita.

## 7. Publicación / próximos pasos

- [ ] Una vez modularizado y con fuente de ICS/IRSE resuelta (o
      retirada), abrir issue de "v1.0 checklist" antes de promocionar
      el repo fuera de GitHub.
- [ ] Enlazar este TODO desde el README para que cualquier colaborador
      vea el estado real del proyecto.

---

*Generado a partir de la revisión del README y estructura de archivos de
`mechmind-dwv/helios-web-app` (rama `main`, 27 commits). No se tuvo
acceso al contenido completo de `script.js` en esta revisión — la
sección 1 debe tratarse como punto de partida de auditoría, no como
lista cerrada.*
