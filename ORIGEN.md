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
| src/doors/terminal/boot.ts | 106 (cambió en el quinto paso) |
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

## Segundo paso: el journal (derivado de Kenon `ff8aee63c`, con la costura de hechos por producto)
Diseño en `COSTURAS.md`. Misma ruta que en Kenon; ya no son copias byte a byte.

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/journal/events.ts | `eventCatalog` se parte: acá queda `houseCatalog` (15 hechos de la casa); el producto suma los suyos con `vocabulary()`. Cada hecho lleva `layer`. `Bus`, `Journal` y `Event` son genéricos sobre los hechos del producto. `readEvent` pasa a `vocabulary().read`. `act` sin `evidence`. |
| src/journal/projections.ts | Genérico sobre el tipo de evento; el resto igual. |
| src/journal/clock.ts | Lee solo hechos de la casa (`layer`); recibe `HouseBus`. |
| src/adapters/storage/journal-store.ts | Recibe el vocabulario; la fila no guarda `layer` (se deriva del nombre). SQL igual. |
| src/adapters/storage/home.ts | Solo `privateDatabase`; nombres y conexión de la terminal vienen con el puente. |
| src/catalogs/acts.ts, levers.ts, time.ts | Solo lo que usa el journal; sin actos de mente ni límites de modelos. |
| src/texts/journal.texts.ts | Solo los textos del journal; suma `kindTaken`. |
| specs de journal y storage | Portados; usan un producto de prueba (`tests/support/shop.ts`) y suman pruebas de la costura. |
| package.json | Vuelve `@sinclair/typebox` 0.34.52 (misma versión que Kenon). |
| tests/laws/biases.spec.ts | Vuelve la exención del SQL del journal, como en Kenon. |

## Tercer paso: la casa y el motor de herramientas (derivado de Kenon `ff8aee63c`, con la costura de estado por herramienta)

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/house/house.ts | Sin dependencia de `tools/`; `visible` e `inChannel` deciden por canal; `allowed` sin la regla de nombres con punto; `HouseView` y `Attention` viven acá. |
| src/tools/tool-contract.ts | `Product`, `State<X>`, `Slices<X>`; `Tool`, `ToolAct`, `ActResult`, `ActContext` genéricos sobre el producto; `KeyStore` es un puerto de acá; `MindAct` pasa a `OwnAct`; sin `shownThreads`, `scene`, `process`. |
| src/tools/tools.ts | `emptyTools` pasa a `emptyHouseState` (solo la casa) + `startState(slices)`; `toolsStep` avanza la casa y la parte de cada herramienta; `acts` son los actos abiertos; sin `results`, `framed`, `curl`, `journeys`, `notes`, `webTabs`, `artifacts`, `ledger`. La escalera de avisos igual. |
| src/tools/execute.ts | Sin journeys ni mente: puertos `refuse` (veto del producto) y `own` (actos fuera de herramientas); `act` sin `evidence`. Borrador, causa propia, actos largos, interrupción y actos anidados igual. |
| src/tools/attendance.ts, act-definition.ts | Genéricos sobre el producto; `mindAct` pasa a `ownAct`. |
| src/catalogs/ids.ts, acts.ts | Solo los ids de la casa; `actCatalog` con atender y dejar de atender. |
| src/texts/tools.texts.ts | Solo los textos del motor, en español. |
| specs | `tools.spec` (escalera de avisos) y `execute.spec` portados; `slices.spec` y `grants.spec` nuevos; banco de pruebas `tests/support/shop.ts` y `shop-rig.ts`. |

## Cuarto paso: el puente de la superficie y la casa en un proceso (derivado de Kenon `ff8aee63c`)

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/surface/bridge/house-ports.ts | Genérico sobre el producto; sin `being`, `spent`, `thinkingSince`, `seen`, `fotos`, `calls`, `page`, `invite`; suma `SurfaceWords` y `receipt`. |
| src/surface/bridge/any-tool.ts | Las palabras vienen del producto y son obligatorias (sin caer al nombre del acto o del campo); sin marcas ni identidades; el título de una cosa es el de su fila en la lista. |
| src/surface/bridge/rows.ts | Sin los casos de identidad, actividad, dispositivo y acto; las etiquetas pasan por las palabras del producto; ya no se pierde un cero ni un «no». |
| src/surface/bridge/house-tools.ts | Sin las pantallas de Kenon (comunicador, viajes, artifacts, curl, web): el producto pasa las suyas en `Screens`. |
| src/programs/house-runtime.ts | Solo la casa: sin mente, modelos, puertas, herramientas externas ni comunicador. Suma `localPorts`. |
| src/adapters/secrets/redact.ts, secret-vault.ts | Reciben el esquema del vocabulario del producto en lugar del `eventSchema` global. |
| src/texts/generic-surface.texts.ts | Solo lo que el puente dice en cualquier producto. |
| specs | `house-tools.spec`, `rows.spec`, `house-runtime.spec` y `doors/terminal/house-screens.spec` nuevos, sobre el producto de prueba. |

## Quinto paso: el router (nuevo en DESERT; decisión de Franco del 10/11)

| Ruta | Qué es |
|---|---|
| src/surface/router.ts | Nuevo. La sesión, correr actos, asentar envíos y avisar cambios salen de `doors/terminal/boot.ts` y quedan en un solo lugar para todos los renderers. |
| src/surface/bridge/house-router.ts | Nuevo. El router de una casa: herramientas con las palabras del producto, barra y cambios. |
| src/doors/terminal/boot.ts | Ya no es copia byte a byte: `startTerminal(tty, teclado, router)` solo pinta y traduce teclas. En Kenon sigue teniendo la sesión adentro. |
| src/surface/bridge/house-ports.ts | Suma `connection` y `watch`. |

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
