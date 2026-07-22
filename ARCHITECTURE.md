# ARCHITECTURE.md — HELIOS

Arquitectura objetivo para evolucionar HELIOS desde app estática de un
solo archivo a una app estática **modular y mantenible**, sin salir del
modelo "sin backend propio" que ya tienes (coherente con tu flujo en
Termux/Android, sin entorno de escritorio).

No se propone framework pesado (React/Vue) salvo que tú lo pidas — el
objetivo es orden, no reescritura. Vanilla JS modular + Vite como único
paso de build es suficiente para este tamaño de proyecto y sigue siendo
100% compatible con GitHub Pages.

---

## 1. Vista general

```

Usuario (navegador)
      │
      ▼
 index.html  ──────────────▶  GitHub Pages (estático, sin servidor propio)
      │
      ├── src/main.js  (entrypoint, orquesta módulos)
      │
      ├── src/data/            → capa de datos (fetch + caché)
      │     ├── noaa.js        (Kp index, F10.7)
      │     ├── nasaDonki.js   (eventos solares, CME, flares)
      │     └── cache.js       (TTL cache sobre localStorage)
      │
      ├── src/metrics/         → capa de cálculo (motor propio)
      │     ├── irg.js         (Índice de Resonancia Global)
      │     ├── ftrt.js        (reusa fórmula de FTRT-Scientific-Validation)
      │     ├── ics.js         (marcado ACTIVE HYPOTHESIS hasta tener fuente)
      │     └── irse.js        (marcado ACTIVE HYPOTHESIS hasta tener fuente)
      │
      ├── src/ui/              → capa de presentación (DOM, sin lógica de negocio)
      │     ├── dashboard.js
      │     ├── oraculoFtrt.js
      │     ├── bioSync.js
      │     └── legado.js
      │
      └── src/state/
            └── store.js        (estado central simple: objeto + pub/sub)

```

**Regla de dependencia:** `ui/` solo puede llamar a `state/` y
`metrics/`. `metrics/` solo puede llamar a `data/`. `data/` no conoce
nada de UI. Esto evita el acoplamiento que causó el bug de "botones que
no se abren" (handlers de UI mezclados con lógica de fetch/cálculo).

---

## 2. Capa de datos (`src/data/`)

Responsabilidad única: obtener datos externos, cachear, degradar con
gracia si la fuente falla. Nunca calcula métricas propias ni toca el DOM.

```js
// src/data/noaa.js
export async function getKpIndex() {
  const cached = cache.get('kp_index', TTL_15MIN);
  if (cached) return cached;

  try {
    const res = await fetch(NOAA_KP_ENDPOINT);
    const data = await res.json();
    cache.set('kp_index', data);
    return data;
  } catch (err) {
    return cache.getStale('kp_index') ?? { error: true, source: 'noaa' };
  }
}
```

Cada fetcher expone la misma forma de retorno (`{ data, error, source,
fetchedAt }`) para que la capa de UI pueda mostrar "dato no disponible"
de forma uniforme en vez de romperse.

---

## 3. Capa de métricas (`src/metrics/`)

Cada métrica es una función pura: recibe datos crudos, devuelve un
resultado **con su nivel de evidencia adjunto**.

```js
// src/metrics/ftrt.js
import { FTRT_WEIGHTS, JUPITER_REFERENCE } from './ftrt.constants.js';

export function calculateFTRT(planetaryPositions) {
  const raw = planetaryPositions.reduce(
    (sum, p) => sum + (p.mass * SUN_RADIUS) / Math.pow(p.distance, 3),
    0
  );
  return {
    value: raw / JUPITER_REFERENCE,
    evidenceLevel: 'PARTIAL', // ver FTRT-Scientific-Validation, p=0.0071
    formula: 'Σ(M_planeta × R_☉) / d_planeta³, normalizado vs Júpiter',
  };
}
```

```js
// src/metrics/ics.js
export function calculateICS(socialData) {
  if (!socialData) {
    return {
      value: null,
      evidenceLevel: 'ACTIVE_HYPOTHESIS',
      note: 'Sin fuente de datos social conectada aún.',
    };
  }
  // ... cálculo real cuando exista fuente
}
```

Esto resuelve directamente el TODO #4: IRG y FTRT con fórmula
documentada, ICS/IRSE explícitamente marcados como hipótesis activa en
vez de mostrarse con la misma autoridad visual que datos NOAA en vivo.

---

## 4. Estado central (`src/state/store.js`)

No hace falta Redux. Un store mínimo con pub/sub basta:

```js
// src/state/store.js
const state = {};
const listeners = new Set();

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}
```

`main.js` orquesta: pide datos → calcula métricas → `setState()` → los
módulos de `ui/` suscritos redibujan solo lo que les corresponde.

---

## 5. Capa de UI (`src/ui/`)

Solo DOM. Sin `fetch()`, sin fórmulas. Un módulo por sección del
dashboard (Oráculo FTRT, Bio-Sync, Conciencia, Flujo), como ya describe
el README. Cada módulo expone `render(state)` y se suscribe al store.

---

## 6. Build y tooling

- **Vite** como único paso de build (dev server + bundle estático para
  Pages). Cero configuración de servidor: el output sigue siendo
  HTML/JS/CSS estático.
- **ESLint + Prettier** con config mínima compartida.
- **Vitest** para las funciones puras de `src/metrics/` — son las más
  fáciles y valiosas de testear porque no tocan red ni DOM:

```js
// src/metrics/ftrt.test.js
import { describe, it, expect } from 'vitest';
import { calculateFTRT } from './ftrt.js';

describe('calculateFTRT', () => {
  it('reproduce el valor de referencia Carrington 1859', () => {
    const result = calculateFTRT(carrington1859Positions);
    expect(result.value).toBeCloseTo(3.21, 1);
  });
});
```

- **GitHub Actions**: workflow nuevo `ci.yml` que corre lint + test en
  cada push/PR, separado del workflow existente de deploy a Pages.

---

## 7. Compatibilidad con tu flujo Termux

Todo lo anterior corre en Termux sin entorno gráfico:
`npm install`, `npm run dev` (Vite sirve por red local si hace falta
verlo desde el navegador del móvil), `npm run build` genera el
`dist/` estático que Pages sirve igual que hoy. Mismo patrón EOF +
`sed -i` + `git commit/push` que ya usas te sigue sirviendo para
crear cada módulo nuevo.

---

## 8. Migración incremental sugerida

1. Añadir `package.json` + Vite, sin mover código todavía (build del
   `index.html`/`script.js` actual tal cual).
2. Extraer capa de datos (`src/data/`) del `script.js` monolítico.
3. Extraer capa de métricas, añadiendo evidence levels.
4. Extraer capa de UI módulo por módulo.
5. Introducir `store.js` una vez que UI y métricas ya estén separadas.
6. Añadir CI (lint + test) al final, cuando ya haya algo que testear.

No es necesario parar el deploy de Pages en ningún punto de esta
migración: cada paso es compatible con el estado anterior.
