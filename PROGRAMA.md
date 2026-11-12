# Cómo se arma un programa sobre DESERT

Escrito el 11/11/2026 con lo que hoy hace Capibara sobre esta base. Es lo que tiene que saber quien suba otro
programa (Kenon). Lo que una regla hace cumplir está en `GARANTIAS.md`; las leyes, en `LEYES.md`.

## Lo que el programa declara

| Qué | Con qué | Dónde mirarlo |
|---|---|---|
| Sus hechos | `vocabulary(catálogo)`: cada hecho con su forma (TypeBox). La base suma los suyos. | `src/journal/events.ts` |
| Lo que guarda cada herramienta | `Slices`: un valor inicial y un paso por herramienta (hecho → nuevo estado). | `src/tools/tool-contract.ts` |
| Cada herramienta | `ProgramTool`: `id`, `purpose`, `targets`, `view`, `summary`, `acts`, y si hace falta `menus`, `closed`, `needs`, `words`, `start`. | `src/tools/promises.ts` |
| Cada acción | `programAct({ name, enter, undoable, purpose, key, on, input, run, cases, … })`. | `src/tools/promises.ts` |
| Lo que promete | `cases`: dado esto, al hacer esto, pasa esto (dice, escribe, se lee, pide atención) o se rechaza con un motivo. | `src/tools/promises.ts` |
| Sus palabras | `Shown.words[herramienta]`: `name`, `key`, `empty`, `listed`, `reads`, `presents`, y `system` o `inside`. | `src/surface/bridge/house-ports.ts` |
| Su país | `Shown.locale`: cómo se escribe la plata y el día. | `src/surface/masks.ts` |

El programa exporta `program` (una `Composition`: `words`, `registry`, `slices`) y `shown`, y dice en su
`package.json` dónde están (`"desert": { "program": "src/…" }`). Con eso la base lo corre y lo comprueba.

## Lo que la base hace con eso

- **La organización** (`house`): quién administra, qué herramientas enteras tiene cada usuario, sus preferencias.
- **El registro**: solo se agrega; cada hecho con autor e instante; el estado es el registro plegado.
- **La superficie**: Menú, lista de cada herramienta, objeto abierto y pregunta; un router único para cualquier
  dibujante (hoy la terminal). Atención y Actividad en cada menú; buscar con espacio; Preferencias.
- **Las pruebas**: de cada caso sale la prueba sobre la organización y el recorrido con teclas desde el Menú; de
  cada acción, que rechace lo que su forma no admite, que su fila apagada diga su motivo, que lo que deja se
  encuentre buscando. El programa no escribe ninguna de esas (`tests/program/program.checks.ts`).

## Una acción

- `on: "tool"` (crea o actúa sobre la herramienta) o `on: "thing"` (sobre un objeto). `under: "<menú>"` la pone
  dentro de un menú del objeto (Editar). `changes: "<dato>"` la pone en la fila del dato que cambia (solo datos de la
  herramienta, no de un objeto).
- `offered(estado, objeto)` devuelve el motivo por el que ahora no se puede (la fila queda apagada diciéndolo, y la
  base rechaza con el mismo motivo). `refuses` lista todos los motivos; cada uno necesita su caso.
- `today(estado, objeto)` da lo que el objeto vale hoy: la pregunta abre con eso, encendido entero, y escribir lo
  reemplaza. Dejarlo igual se rechaza solo («sin cambios»).
- `confirms` pone algo a confirmar. Lo irreversible (`undoable: false`) confirma con «volver» primero.
- `also` la ofrece además entre las acciones de los objetos de otra herramienta (cobrar, desde una venta).
- `run` puede ser `async`; `reach: "world"` dice que sale de la organización. El contexto trae `execute` para
  hacer otra acción por el mismo camino.
- Un campo lleva siempre máscara o placeholder y tope; lo que el campo sabe que está mal se dice donde se escribe.
- Un campo puede decir cuándo se pregunta, según lo respondido antes (`when(campo, respondido => …)`).

## Un objeto

- La herramienta declara en `presents` los grupos de sus objetos, en orden, cada uno con su título, lo que dice
  vacío y las claves de la lectura que lleva. `view(estado, objeto)` devuelve en su primera línea un JSON con esas
  claves. La base dibuja el objeto: los grupos siempre en el mismo lugar, el vacío dicho, las acciones al final.
- Lo que la lectura nombra como `{ id, text, detail? }` es otro objeto: la base le pone número (1 a 9) y lo abre,
  sea de la herramienta que sea. Ninguna pantalla del programa dibuja un objeto.
- Una herramienta presenta una sola clase de objeto. Otra clase es otra herramienta, que puede vivir dentro de
  la primera (`inside`): no tiene fila en el Menú, y la lista y la abre la herramienta en la que vive.
- Un objeto nunca se ofrece en la lista de la que elige una acción sobre él mismo.
- Lo que no entra en la pantalla se alcanza con ↑ y ↓, también lo que solo se lee.

## Lo que la base todavía no hace (lo que un programa va a pedir)

- La puerta para otros dispositivos, la de agentes y muchas organizaciones en un servidor.
- Sacar a alguien de la organización y transferir la administración (hoy: dar herramientas, y nada más).
- Una acción que hoy solo puede rechazar (exige al menos un caso aceptado).
- Dar un paso en memoria como operación de la base (Capibara lo arma con piezas para recorrer todos los caminos).
- Separar en la acción los motivos que dependen de lo que se responde de los que dependen del estado.
- Leer un texto largo que envuelva y se desplace (Capibara lo pagina en su herramienta de normas).
- Que una herramienta que vive dentro de otra se dé junto con la que la contiene.
