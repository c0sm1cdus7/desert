# Origen

Todo salió de Kenon, commit `ff8aee63c` (foto con `git archive`, sin tocar `~/kenon`).
Fecha de la copia: 2026-11-10.

## Archivos que se copiaron sin cambios (byte a byte)
La copia inicial salió del commit `ff8aee63c`. La tabla usa las ubicaciones actuales en DESERT;
las rutas e importaciones se reordenaron el 16/11 y ya no coinciden con Kenon.

| Ruta actual en DESERT | Líneas |
|---|---|
| src/surface/contract/contract.ts | 166 |
| src/surface/session/screen.ts | 168 |
| src/surface/router/step.ts | 129 |
| src/surface/session/talk.ts | 192 |
| src/surface/acts/walk.ts | 61 |
| src/surface/session/window.ts | 31 |
| src/surface/router/resolve.ts | 80 |
| src/surface/contract/tones.ts | 5 |
| src/doors/terminal/boot.ts | 106 (cambió en el quinto paso) |
| src/doors/terminal/cells.ts | 162 |
| src/doors/terminal/input.ts | 35 |
| src/doors/terminal/paint.ts | 114 |
| src/doors/terminal/thread.ts | 163 |
| src/surface/session/destinations.spec.ts | 146 |
| src/doors/terminal/renderers.spec.ts | 106 |
| src/surface/session/terminal.spec.ts | 150 |
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
- `tests/laws/tree.json`: comenzó con 14 archivos y presupuestos por carpeta; el reorden del 16/11 conserva las descripciones y elimina esos presupuestos.
- `tests/laws/core-size.spec.ts` (en Kenon, ley del árbol): el reorden del 16/11 fija 300 líneas por archivo, mantiene 519 en textos y exige al menos dos archivos de código por carpeta, salvo la raíz.
- `tests/laws/gate.spec.ts`: el gate sin `contract`; el test de "un comando kenon" pasa a comprobar nombre `desert`, privado y engines; la recolección de specs sin `tests/contract`.
- `tests/laws/adapters.spec.ts`: sin el test que agrupa `src/adapters/**` y exige `tools/actors` (no existen).
- `tests/laws/biases.spec.ts`: la lista de exenciones queda vacía (todas apuntaban a archivos del núcleo/adapters).
- `tests/laws/prompts.spec.ts`: la lista de archivos no-TS admitidos queda vacía (era `cards.json`).
- Todas las demás reglas de lint y leyes están igual de estrictas.

## Segundo paso: el journal (derivado de Kenon `ff8aee63c`, con la costura de hechos por programa)
Diseño en `COSTURAS.md`. Las tablas señalan las rutas actuales; ya no son copias byte a byte.

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/journal/vocabulary.ts y src/house/facts.ts | `eventCatalog` se parte: la casa conserva `houseCatalog` (15 hechos de la casa); el programa suma los suyos con `vocabulary()`. Cada hecho lleva `layer`. `Bus`, `Journal` y `Event` son genéricos sobre los hechos del programa. `readEvent` pasa a `vocabulary().read`. `act` sin `evidence`. |
| src/journal/projections.ts | Genérico sobre el tipo de evento; el resto igual. |
| src/journal/clock.ts | Lee solo hechos de la casa (`layer`); recibe `HouseBus`. |
| src/storage/journal-store.ts | Recibe el vocabulario; la fila no guarda `layer` (se deriva del nombre). SQL igual. |
| src/storage/home.ts | Solo `privateDatabase`; nombres y conexión de la terminal vienen con el puente. |
| src/house/own-acts.ts, src/journal/clock.ts y límites junto a sus dueños | Solo lo que usa el journal; sin actos de mente ni límites de modelos. |
| src/texts/journal.texts.ts | Solo los textos del journal; suma `kindTaken`. |
| specs de journal y storage | Portados; usan un programa de prueba (`tests/support/shop.ts`) y suman pruebas de la costura. |
| package.json | Vuelve `@sinclair/typebox` 0.34.52 (misma versión que Kenon). |
| tests/laws/biases.spec.ts | Vuelve la exención del SQL del journal, como en Kenon. |

## Tercer paso: la casa y el motor de herramientas (derivado de Kenon `ff8aee63c`, con la costura de estado por herramienta)

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/house/members.ts, src/house/kit.ts y src/house/scenes.ts | La membresía, el kit y la escena comparten la casa; `HouseView` y `Attention` viven con los miembros. Los canales ya no forman parte del estado actual. |
| src/tools/tool-contract.ts | `Program`, `State<X>`, `Slices<X>`; `Tool`, `ToolAct`, `ActResult`, `ActContext` genéricos sobre el programa; `KeyStore` es un puerto de acá; `MindAct` pasa a `OwnAct`; sin `shownThreads`, `scene`, `process`. |
| src/house/state.ts, src/house/attention.ts y src/tools/start.ts | `emptyTools` pasa a `emptyHouseState` (solo la casa) + `startState(slices)`; `toolsStep` avanza la casa y la parte de cada herramienta; `acts` son los actos abiertos; sin `results`, `framed`, `curl`, `journeys`, `notes`, `webTabs`, `artifacts`, `ledger`. La escalera de avisos igual. |
| src/tools/execute.ts | Sin journeys ni mente: puertos `refuse` (veto del programa) y `own` (actos fuera de herramientas); `act` sin `evidence`. Borrador, causa propia, actos largos, interrupción y actos anidados igual. |
| src/house/attendance.ts y src/tools/act-definition.ts | Genéricos sobre el programa; `mindAct` pasa a `ownAct`. |
| src/house/ids.ts y src/house/own-acts.ts | Solo los ids de la casa; `actCatalog` con atender y dejar de atender. |
| src/texts/tools.texts.ts | Solo los textos del motor, en español. |
| specs | `tools.spec` (escalera de avisos) y `execute.spec` portados; `slices.spec` y `grants.spec` nuevos; banco de pruebas `tests/support/shop.ts` y `shop-rig.ts`. |

## Cuarto paso: el puente de la superficie y la casa en un proceso (derivado de Kenon `ff8aee63c`)

| Ruta | Qué cambia respecto de Kenon |
|---|---|
| src/surface/bridge/ports/house-ports.ts | Genérico sobre el programa; sin `being`, `spent`, `thinkingSince`, `seen`, `fotos`, `calls`, `page`, `invite`; suma `SurfaceWords` y `receipt`. |
| src/surface/bridge/views/any-tool.ts | Las palabras vienen del programa y son obligatorias (sin caer al nombre del acto o del campo); sin marcas ni identidades; el título de una cosa es el de su fila en la lista. |
| src/surface/bridge/views/rows.ts | Sin los casos de identidad, actividad, dispositivo y acto; las etiquetas pasan por las palabras del programa; ya no se pierde un cero ni un «no». |
| src/surface/bridge/assembly/house-tools.ts | Sin las pantallas de Kenon (comunicador, viajes, artifacts, curl, web): el programa pasa las suyas en `Screens`. |
| src/runtime/house-runtime.ts | Solo la casa: sin mente, modelos, puertas, herramientas externas ni comunicador. Suma `localPorts`. |
| src/keychain/redact.ts, secret-vault.ts | Reciben el esquema del vocabulario del programa en lugar del `eventSchema` global. |
| src/texts/generic-surface.texts.ts | Solo lo que el puente dice en cualquier programa. |
| specs | `house-tools.spec`, `rows.spec`, `house-runtime.spec` y `doors/terminal/house-screens.spec` nuevos, sobre el programa de prueba. |

## Quinto paso: el router (nuevo en DESERT; decisión de Franco del 10/11)

| Ruta | Qué es |
|---|---|
| src/surface/router/router.ts | Nuevo. La sesión, correr actos, asentar envíos y avisar cambios salen de `doors/terminal/boot.ts` y quedan en un solo lugar para todos los renderers. |
| src/surface/bridge/assembly/house-router.ts | Nuevo. El router de una casa: herramientas con las palabras del programa, barra y cambios. |
| src/doors/terminal/boot.ts | Ya no es copia byte a byte: `startTerminal(tty, teclado, router)` solo pinta y traduce teclas. En Kenon sigue teniendo la sesión adentro. |
| src/surface/bridge/ports/house-ports.ts | Suma `connection` y `watch`. |

## Fuera, y por qué
- `src/surface/bridge/**`: depende del núcleo (herramientas, casa, journal).
- `src/doors/terminal/house-screens.spec.ts`: importa `runtime/house-runtime.ts`, `journal`, `house` y `tools` del núcleo, y `tests/support/next-tools.ts`.
- Leyes `golden`, `replay`, `walk-*`, `cards`: dependen del journal, de la casa, de evals y de catálogos de Kenon.
- `tests/contract/**` (salvo `json.ts`), `tests/evals`, `tests/fixtures`, `Dockerfile.core`, `scripts`, `docs`: núcleo o despliegue de Kenon.
- La ley de biases se trajo (textos solo en `src/texts/`), pero sin el catálogo de biases del núcleo: se aplica solo a lo que hay.

## Dudas
- `tests/support/sources.ts` y `trace.ts` se trajeron completos aunque las leyes usan parte; `trace.ts` es de las leyes de prompts, no de la superficie.
- Los imports de soporte de los specs quedaron normalizados dentro de la copia al reordenar el 16/11. El alias heredado y `rootDirs` se conservan; retirarlos queda para otro paso.
- El presupuesto actual de textos es 519 líneas. Incluye la utilidad de tratamiento al lector en `src/texts/addressing.ts`.
