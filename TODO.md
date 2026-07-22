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

- [ ] Revisar `script.js`: identificar si hay datos "hardcodeados"
      (sunspot numbers, Kp, FTRT de ejemplo) igual que se corrigió en
      HelioBio-API. Sustituir cualquier valor fijo por llamada real a
      NOAA/NASA DONKI.
- [ ] Verificar manejo de errores de fetch (¿qué pasa si NOAA/NASA
      no responde? ¿hay fallback o la UI se rompe?).
- [ ] Revisar `index.html` por JS inline / manejadores `onclick=""`
      residuales — el commit "Fix: botones del dashboard que no se
      abren" sugiere acoplamiento frágil entre HTML y JS.
- [ ] Documentar en el propio `script.js` la fórmula FTRT usada aquí
      y confirmar que coincide con la normalización corregida
      (M·R☉/d³ vs Jupiter) — evitar el desfase que ya detectamos en
      FTRT-Scientific-Validation.

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
