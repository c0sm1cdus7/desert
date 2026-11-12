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
| Sus palabras | `Shown.words[herramienta]`: `name`, `key`, y `system` o `inside`; si lista cosas, `empty`, `listed`, `reads` y `presents`; si lee datos propios, `itself`. | `src/surface/bridge/house-ports.ts` |
| Su país | `Shown.locale`: cómo se escribe la plata y el día. `Shown.day` (qué día es un instante, como lo cuenta su país) y `Shown.moment`: obligatorio `day` si alguna pregunta sugiere hoy o no admite futuro (no compone sin él). | `src/surface/masks.ts` |

El programa exporta `program` (una `Composition`: `words`, `registry`, `slices`) y `shown`, y dice en su
`package.json` dónde están (`"desert": { "program": "src/…" }`). Con eso la base lo corre y lo comprueba.

## Lo que la base hace con eso

- **La organización** (`house`): quién administra, qué herramientas enteras tiene cada usuario, sus preferencias. Quien
  administra da y quita herramientas (`granted`), saca a alguien (`removed`) y pasa la administración (`handed`):
  la base pliega esos hechos y cuida sus reglas; la acción que los escribe (y su pantalla) es del programa.
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
- Un día que ya pasó no puede ser posterior a hoy: `day(pregunta, "today", "today")` lo rechaza donde se escribe.
- Lo que una acción confirma (`confirms(input, estado, cosa, instante)`) o contesta puede decirse en varias líneas:
  cada corte de línea es un renglón, sin volver a cortar (una vista previa, un impreso). Lo que contesta dice qué
  hizo en la primera línea («Verbo · Objeto · Detalle»), y así se promete en un caso.
- Lo que una acción crea queda en el Registro de cada cosa creada: ningún programa guarda quién creó qué.
- Una acción puede decir por qué lo contestado hasta ahí no puede seguir: `stops: (respondido, estado, cosa) =>
  motivo`. La pantalla lo dice en la pregunta que se acaba de contestar; **la base lo rechaza igual antes de correr
  la acción, por cualquier puerta**, con ese mismo motivo (que va en `refuses`, con su caso). La acción no lo repite.
- Donde una pregunta elige una cosa de otra herramienta (`thing`), la acción puede decir cuáles toma según lo ya
  contestado: `among: (respondido, estado, cosa) => ({ productos: id => … })` (por herramienta, no por campo: dos
  preguntas de la misma herramienta reciben la misma función). La lista ofrece solo esas, también a quien busca, y
  **la base rechaza las demás antes de correr la acción, por cualquier puerta**, con su propio motivo («no es de lo
  que se puede elegir»), que la acción no declara; un caso puede prometerlo. La acción no lo repite.
- Donde se elige una cosa se puede hacer una nueva ahí mismo: `thing(pregunta, herramienta, ninguna?, acción)`. Esa
  acción es de la herramienta (`on: "tool"`) y lo que contesta dice qué cosa hizo (`target`): esa es la respuesta. Si
  la acción no existe, el programa no compone.
- Una acción dice si se ofrece sabiendo qué momento es (`offered(estado, cosa, instante)`): lo que hoy no se puede
  hacer queda apagado con su motivo.

## Los registros que se guardan
- Un programa puede guardar registros que organizaciones reales escribieron con él en una carpeta que nombra en
  `package.json`: `"desert": { "program": …, "journals": "tests/journals" }`. Cada uno es una copia de su
  `journal.sqlite` (nunca `secrets.sqlite`; lo secreto no está en el registro, que guarda cada hecho ya sin sus
  valores secretos, pero sí están los datos de la organización: no guardes el de una organización real en un
  repositorio público).
- La compuerta abre cada copia con el programa de hoy, sin lo que traía plegado: cada hecho se lee y se pliega desde
  el primero, y cada cosa se lee como la lee quien administra. Un cambio que no los lea frena ahí.
- El único remedio que la base tiene hoy es no romper la lectura: un hecho que cambia de forma es un hecho nuevo, con
  otro nombre, y el viejo se sigue leyendo y plegando. No hay lectura versionada de un hecho viejo.
- Ojo: una organización en uso guarda su estado plegado y lo vuelve a usar mientras el programa no cambie sus hechos
  ni su estado inicial. Si cambia solo cómo pliega un hecho, la organización sigue con lo plegado antes: cambiar un
  pliegue pide cambiar también el hecho (o el estado inicial) para que se vuelva a plegar todo.

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

## Una herramienta que lee datos propios

- Una herramienta que no lista cosas sino que lee datos suyos (los ajustes de algo, un resumen) declara en `itself`
  los grupos en que van, igual que los de un objeto. `view(estado, herramienta)` devuelve en su primera línea un JSON
  con esas claves. No trae pantalla propia: la base reparte los datos.
- Un dato que una acción cambia (`changes`, `on: "tool"`) es la fila que empieza esa acción, con su tecla y lo que
  el dato es hoy. Lo que la lectura nombra como `{ id, text, detail? }` abre ese objeto. Un grupo sin nada dice su
  vacío. Un dato que ningún grupo tiene es un defecto del programa.
- Una herramienta puede hacer las dos cosas: primero sus datos (`itself`), después la lista de sus cosas.

## Lo que la base todavía no hace (lo que un programa va a pedir)

- La puerta para otros dispositivos, la de agentes y muchas organizaciones en un servidor.
- Una acción que hoy solo puede rechazar (exige al menos un caso aceptado).
- Dar un paso en memoria como operación de la base (Capibara lo arma con piezas para recorrer todos los caminos).
- Separar en la acción los motivos que dependen de lo que se responde de los que dependen del estado.
- Leer un texto largo que envuelva y se desplace (Capibara lo pagina en su herramienta de normas).
- Que una herramienta que vive dentro de otra se dé junto con la que la contiene; y que una viva dentro de otra que
  no está en el Menú.
- Preguntar según el estado de la casa, y no solo según lo respondido antes (`when` mira lo respondido): una alícuota
  solo si la organización es Responsable inscripto. Y un campo que se pregunte según lo respondido y además sea
  opcional.
- Opciones de una pregunta que salen del estado o de afuera (los puntos de venta que dice el fisco): hoy se resuelven
  volviéndolas cosas de la herramienta.
- Un valor sugerido para una pregunta que no sea «lo que el dato es hoy» (`today` marca además «actual» y rechaza «sin
  cambios»): sugerir en «editar condición» la que dice el padrón; que una pregunta que no es la primera abra con un
  valor que da la acción (`also.opens` solo sirve para las primeras).
- Menús en una herramienta que no tiene cosas (hoy un menú cuelga de una cosa).
- Una vista previa con forma propia: hoy lo que se confirma es texto, en una o varias líneas.
- Disparar una acción por fecha (un abono que genera a una hora): la casa tiene reloj para sus recordatorios, no para
  las acciones de un programa.
- Suprimir de verdad un dato del registro, dejando el hecho (un pedido de supresión de datos personales).
- **Lo que una acción escribe queda entero o nada, salvo en un caso:** una acción que alguien ejecuta dentro de un
  oyente de un hecho suelto (uno que no vino de una acción: un despertar, un arranque) cierra su escritura antes de
  que sus propios oyentes la oigan; si uno de ellos falla, la acción ya contestó que sí. Un ser que actúa al oír
  hechos (Kenon) lo va a necesitar resuelto.
- Un oyente con estado propio (el reloj y sus temporizadores, una pantalla) no se deshace cuando se deshace lo
  escrito: puede quedar un temporizador de un hecho que no existe.
- Un pliegue tiene que ser puro: si cambia su estado en el lugar (`mapa.set(…)`), deshacer lo escrito no lo deshace.
  La base todavía no lo comprueba.
- Un día que no admite futuro (`last: "today"`) se rechaza donde se escribe; por otra puerta, la acción tiene que
  rechazarlo ella.
- Una tecla que no elige nada en una lista (un número sin fila) no dice nada; solo los campos escritos dicen que una
  tecla no va.
- Una devolución de plata sin cosas, un rechazo que deje escrito lo que contestó el fisco, un motivo con un dato
  variable: pedidos de Capibara que hoy se resuelven del lado del programa.
