# Origen

Todo salió de Kenon, commit `ff8aee63c` (foto con `git archive`, sin tocar `~/kenon`).
Fecha de la copia: 2026-11-10.

## Archivos copiados sin cambios (byte a byte)
Misma ruta en DESERT y en Kenon; commit `ff8aee63c`.

| Ruta (igual en ambos) | Líneas |
|---|---|
| src/surface/contract.ts | 166 |
| src/surface/screen.ts | 168 |
| src/surface/step.ts | 129 |
| src/surface/talk.ts | 192 |
| src/surface/walk.ts | 61 |
| src/surface/window.ts | 31 |
| src/surface/resolve.ts | 80 |
| src/surface/tones.ts | 5 |
| src/doors/terminal/boot.ts | 106 |
| src/doors/terminal/cells.ts | 162 |
| src/doors/terminal/input.ts | 35 |
| src/doors/terminal/paint.ts | 114 |
| src/doors/terminal/thread.ts | 163 |
| src/doors/terminal/destinations.spec.ts | 146 |
| src/doors/terminal/renderers.spec.ts | 106 |
| src/doors/terminal/terminal.spec.ts | 150 |
| src/texts/surface.texts.ts | 59 |
| tests/support/surface-rules.ts | 80 |
| tests/support/surface-walk.ts | 86 |
| tests/support/sources.ts | 76 |
| tests/support/trace.ts | 20 (solo `isNormative`) |
| tests/contract/json.ts | 8 (`field`, usado por las leyes) |
| tests/laws/cycles.spec.ts, imports.spec.ts, size.spec.ts, tree.ts | sin cambios |
| .gitignore, .prettierrc.json, .prettierignore, .nvmrc, tsconfig.json, eslint.config.js | sin cambios |

No existen `*.spec.ts` para `src/surface/*` en Kenon (la superficie se prueba desde los specs de terminal).

## Archivos adaptados (derivados de Kenon `ff8aee63c`)
- `package.json`: nombre `desert`, privado; sin `bin`, `files`, `build`, `prepack`, `kenon`, `eval:*`, `contract`; gate sin `pnpm contract`; sin dependencias de producción (typebox, linkedom, playwright-core, ws, readability) ni `@types/ws`.
- `pnpm-lock.yaml`: el de Kenon, recortado con `pnpm install --offline` tras sacar esas dependencias.
- `vitest.config.ts`: sin el proyecto `contract` (no hay specs de contrato).
- `tsconfig.build.json`: no se copió (no hay build todavía).
- `tests/laws/tree.json`: solo las 14 entradas de archivos y las 3 carpetas (`surface` 839, `doors/terminal` 594, `texts` 518) que existen acá; mismos presupuestos que en Kenon.
- `tests/laws/core-size.spec.ts` (en Kenon, ley del árbol): sin los tests de `catalogs/` (no hay catálogos ni `next-sources.ts`). Límites de 200 líneas y de 518 en textos intactos.
- `tests/laws/gate.spec.ts`: el gate sin `contract`; el test de "un comando kenon" pasa a comprobar nombre `desert`, privado y engines; la recolección de specs sin `tests/contract`.
- `tests/laws/adapters.spec.ts`: sin el test que agrupa `src/adapters/**` y exige `tools/actors` (no existen).
- `tests/laws/biases.spec.ts`: la lista de exenciones queda vacía (todas apuntaban a archivos del núcleo/adapters).
- `tests/laws/prompts.spec.ts`: la lista de archivos no-TS admitidos queda vacía (era `cards.json`).
- Todas las demás reglas de lint y leyes están igual de estrictas.

## Fuera, y por qué
- `src/surface/bridge/**`: depende del núcleo (herramientas, casa, journal).
- `src/doors/terminal/house-screens.spec.ts`: importa `programs/house-runtime`, `journal`, `house` y `tools` del núcleo, y `tests/support/next-tools.ts`.
- Leyes `golden`, `replay`, `walk-*`, `cards`: dependen del journal, de la casa, de evals y de catálogos de Kenon.
- `tests/contract/**` (salvo `json.ts`), `tests/evals`, `tests/fixtures`, `Dockerfile.core`, `scripts`, `docs`: núcleo o despliegue de Kenon.
- La ley de biases se trajo (textos solo en `src/texts/`), pero sin el catálogo de biases del núcleo: se aplica solo a lo que hay.

## Dudas
- `tests/support/sources.ts` y `trace.ts` se trajeron completos aunque las leyes usan parte; `trace.ts` es de las leyes de prompts, no de la superficie.
- Los specs `terminal.spec.ts` y `renderers.spec.ts` importan `../../../../tests/support/...` (cuatro niveles, fuera del repo); funcionan por el alias de `vitest.config.ts` y `rootDirs` de `tsconfig.json`, heredados de Kenon. Conviene normalizarlos cuando se pueda modificar el código copiado.
- Presupuesto de textos 518 líneas: era el de todo Kenon; acá hay 59. No se aflojó ni se bajó.
