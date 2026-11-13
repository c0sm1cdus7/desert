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
| Su país | `Shown.locale`: cómo se escribe la plata y el día. `Shown.day` (qué día es un instante, como lo cuenta su país) y `Shown.moment`: obligatorio `day` si hay alguna pregunta de fecha, aunque no sugiera hoy ni limite el futuro (no compone sin él). | `src/surface/masks.ts` |

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
  encuentre buscando. Las garantías bajan por listas y menús hasta leer la fila, también en la ventana mínima;
  comparan motivos enteros en filas apagadas o bajo la pregunta. Un dato que no se puede escribir queda sin
  Enter, error ni motivo de la acción. También se prueba que todas las filas fijen una respuesta incompatible;
  sin esa evidencia positiva, una ruta ausente falla indicando la pregunta y la fila que queda abierta.
  El programa no escribe ninguna de esas (`tests/program/program.checks.ts`).

## Una acción

- `on: "tool"` (crea o actúa sobre la herramienta) o `on: "thing"` (sobre un objeto). `under: "<menú>"` la pone
  dentro de un menú del objeto (Editar). `changes: "<dato>"` la pone en la fila del dato que cambia (solo datos de la
  herramienta, no de un objeto).
- `offered(estado, objeto, instante)` devuelve el motivo por el que ahora no se puede (la fila queda apagada diciéndolo, y la
  base rechaza con el mismo motivo). `refuses` lista los motivos previos a correr; `outside`, los que solo produce el mundo. Cada causa necesita su caso.
- `today(estado, objeto, instante)` da lo que el objeto vale hoy: toda caminata nace con eso, incluso desde `Acciones`,
  una fila, un menú o una acción ofrecida por otra herramienta. El texto abre encendido entero y escribir lo
  reemplaza. Lo vigente se marca «actual»: se apaga si elegirlo terminaría sin cambios. En texto, `enter`
  se ofrece solo cuando cambiaría algo al terminar. Por otras puertas, la base sigue rechazando «sin cambios»
  antes de correr. `datum` y `today` deben leer la misma fuente: la fila no puede decir «no» mientras la
  pregunta abre con «sí · actual». Separar el valor editable de las condiciones que explican su disponibilidad.
- `confirms` pone algo a confirmar. Lo irreversible (`undoable: false`) confirma con «volver» primero.
- `also` la ofrece además entre las acciones de los objetos de otra herramienta (cobrar, desde una venta).
  `also.with(estado, cosa, instante)` decide si aparece y fija respuestas; `also.off(estado, cosa, instante)` dice
  por qué está apagada; su causa también se declara en `refuses`, con un caso que la alcance desde `from`.
  `closed(estado, cosa, instante)` oculta la cosa en las preguntas que la eligen, incluso si era el valor vigente. Usan el mismo reloj
  de la casa que `offered`, `stops` y `among`, también cuando cambia el día sin hechos nuevos.
- `run` puede ser `async`; solo devuelve `accepted` o `rejected` con una causa literal de `outside`, opcionalmente
  seguida de ` · dato`. Sin `outside`, no devuelve rechazos. Una causa ajena a esa lista no compila; si código
  sin tipos la introduce igual, la base termina con el defecto fijo del catálogo. Lo lanzado o una promesa rechazada
  dentro de `run` también es un defecto, aunque el texto coincida con `outside`. Actividad y el registro guardan
  el detalle técnico; el resultado de la acción no lo muestra. Ningún defecto se reintenta automáticamente.
  Una acción anidada puede haber escrito antes del defecto: el mensaje no promete que no se guardó nada. `reach: "world"` dice que sale de la organización.
  El contexto trae `execute` para hacer otra acción por el mismo camino; su resultado amplio no se reenvía a ciegas.
- Un campo lleva siempre máscara o placeholder y tope. Lo incompleto muestra la parte de la forma que falta en
  texto 3, dentro de la Entrada. Lo completo que `wrong` o `stops` no permite dice su motivo bajo la pregunta, en
  texto 3, sin «Error» y sin `enter`. Enter no hace nada si no se ofrece; una tecla que no entra conserva el campo.
  Un prefijo numérico como «0», que todavía puede crecer, no agrega «mínimo» ni «mayor a».
  «Error» en coral queda para el resultado de una acción que corrió.
- Un campo puede decir cuándo se pregunta, según lo respondido antes (`when(campo, (respondido, instante) => …)`).
- `holding(campo, (valor, instante) => motivoOIndefinido)` recibe el mismo reloj que `run`, `stops` y `among`.
  No usar `Date.now()` en esas reglas: el instante lo da la casa y los casos lo pueden fijar.
- `day(pregunta, "today", "today")` limita la Entrada; la regla del programa contra fechas futuras va también
  en `stops` o `holding`, con su causa en `refuses`. Así se rechaza antes de `run` por cualquier puerta.
  El programa convierte el instante a su día local con la misma función que declara en `shown.day`.
- Un caso puede declarar `at: Date.UTC(2026, 10, 13, 1)`: fija el reloj antes de sus pasos `given`. Sin `at` usa
  el instante fijo de la base. Los pasos `{ days: n }` avanzan desde allí y reabrir conserva la hora.
  Prometer ayer aceptado, mañana rechazado y ese mismo día aceptado al avanzar el reloj prueba las dos puertas.
- Lo que una acción confirma (`confirms(input, estado, cosa, instante)`) o contesta puede decirse en varias líneas:
  cada corte de línea es un renglón, sin volver a cortar (una vista previa, un impreso). Lo que contesta dice qué
  hizo en la primera línea («Verbo · Objeto · Detalle»), y así se promete en un caso.
- Lo que una acción crea queda en el Registro de cada cosa creada: ningún programa guarda quién creó qué.
- Una acción puede decir por qué lo contestado hasta ahí no puede seguir: `stops: (respondido, estado, cosa, instante) =>
  motivo`. La pantalla lo dice en vivo, antes de enviar la respuesta; **la base lo rechaza igual antes de correr
  la acción, por cualquier puerta**, con ese mismo motivo (que va en `refuses`, con su caso). En la pregunta el
  motivo puede sumar un dato después («supera lo que falta · $ 9.525,75»): por otra puerta se rechaza con el motivo
  declarado. La acción no lo repite.
- Donde una pregunta elige una cosa de otra herramienta (`thing`), la acción puede decir cuáles toma según lo ya
  contestado: `among: (respondido, estado, cosa, instante) => ({ productos: id => motivoOIndefinido })`. Cada función devuelve
  `undefined` si toma la cosa, o su motivo si no. Por herramienta, no por campo. La lista muestra primero lo elegible
  y después las cosas apagadas, sin número y con su motivo, después de marcar también lo vigente; buscar también
  las encuentra. Las opciones fijas conservan su orden. Al llegar al extremo de lo elegible, las flechas permiten
  leer todas las filas sin elegir las apagadas; Enter vuelve primero al cursor. La preferencia de ocultar
  acciones apagadas oculta esas cosas. Por otras puertas se rechaza con ese mismo motivo antes de correr; se declara
  en `refuses`, con su caso. `stops` también se consulta para cada opción de una pregunta, con lo ya contestado más
  esa opción: lo que frenaría queda apagado con su motivo antes de elegirlo.
- Donde se elige una cosa se puede hacer una nueva ahí mismo: `thing(pregunta, herramienta, ninguna?, acción)`. Esa
  acción es de la herramienta (`on: "tool"`) y lo que contesta dice qué cosa hizo (`target`): esa es la respuesta. Si
  la acción no existe, el programa no compone. Antes de tomar lo creado, la base vuelve a consultar la pregunta
  contra el estado nuevo: `among`, `valid` y `stops`. Si no sirve, permanece en esa pregunta con su motivo y la
  cosa aparece apagada con ese motivo; si sirve avanza; si no hubo destino vuelve sin responder.
  Eso vale para los motivos de `among` y `stops`. Si lo recién creado está cerrado o `valid` lo rechaza sin motivo,
  es un defecto `E-PROG-1`, con diagnóstico: «datos inválidos» nunca explica una fila apagada.
  Las cosas cerradas que ya existían no aparecen en las preguntas ni al buscar.
- Todo campo `thing` sin `makes` declara `empty`, el motivo de no tener ninguna cosa elegible:
  `thing("Venta", "sales", undefined, undefined, "sin ventas para cobrar")`. Sin ese motivo, vacío o con uno que
  no sirve como dato corto, el programa no compone. `none` sigue nombrando la opción de no elegir ninguna; no
  reemplaza a `empty`. Si la primera pregunta no tiene ninguna respuesta elegible ni una fila disponible para
  crear, la acción sale apagada en el menú con `empty`, incluso si hay cosas pero ninguna se toma.
  Se vuelve a habilitar cuando aparece algo elegible.
  En una acción ofrecida por otra herramienta se comprueba la primera pregunta que queda después de sus respuestas
  fijas. El motivo se decide una sola vez: primero que la identidad no tenga la herramienta, después `offered`,
  después `also.off` y por último `empty`. La fila y las garantías derivadas usan ese mismo orden.
- Una acción dice si se ofrece sabiendo qué momento es (`offered(estado, cosa, instante)`): lo que hoy no se puede
  hacer queda apagado con su motivo.
- `stops` puede devolver `toolTexts.unchanged` cuando lo vigente depende de una respuesta anterior y `today` no
  alcanza. La base interpreta el mismo hecho: en opciones y referencias dice «actual», apagado; en texto no hay
  Enter ni motivo bajo la pregunta. En varias marcas conserva el conjunto marcado, sin Enter ni rechazo;
  la garantía derivada comprueba todas las combinaciones. No agregarlo a `outside` ni repetirlo en `run`.
  Otra regla que apaga lo vigente conserva su motivo. Si `today` declara otro valor, devolver «sin cambios» para
  una opción distinta es un defecto `E-PROG-1`; sin `today`, `stops` afirma qué respuesta es la vigente.
  Dos respuestas distintas de una pregunta no pueden ser «actual»: la base detecta el defecto al pintar,
  también sin `today` y antes de ocultar las filas apagadas. Las garantías derivadas comprueban esa unicidad.
- Una causa de `offered`, `also.off`, `stops`, `wrong` o `among` que no pertenece a `refuses` ni a las causas de la base es un
  defecto del programa: `E-PROG-1`, con diagnóstico en el registro. Lo mismo vale si una regla lanza, falla una
  lectura de pantalla o el pliegue escrito por el programa, incluidas sus reacciones (`effects`), el arranque,
  sus escuchas y el cierre que devuelve. Los callbacks de una pantalla personalizada conservan ese origen;
  las operaciones que la base le presta conservan el suyo. El resultado no muestra el detalle técnico.
- Si falla el diario, el disco o una escucha interna de la base, se ve `E-BASE-1 · Falló la base` y se registra
  el diagnóstico. Si falla la escritura del propio diagnóstico, se ve ese código y el detalle limpio sale por
  el canal de errores del proceso. `esc` vuelve al lugar anterior sin repetir la operación fallida.
- Un puerto externo que se corta termina como resultado `Error`: el adaptador puede dar una causa pública de su
  catálogo con `PortFailure`, de `src/tools/failures/port-failure.ts`. Solo una falla marcada por el adaptador
  como `PortFailure` sin causa pública muestra «sin conexión con el servicio». `PortFailure(causa, detalle)`
  conserva el diagnóstico técnico; sin causa pública, usar `PortFailure(undefined, detalle)`. Toda falla de
  puerto también queda en el registro. Una excepción sin esa marca es defecto del programa (`E-PROG-1`)
  o de la base (`E-BASE-1`), según el código que falló, y siempre deja diagnóstico.
  Esto se clasifica al llamar el puerto, no dentro del `run` del programa:
  lanzar dentro de `run`, incluso un error de puerto, sigue siendo un defecto; usar `outside` para su resultado.
- Se retiró `Execution.refuse`, el gancho opcional de la casa que rechazaba después de responder y que no tenía
  consumidor de producción en esta base. Una condición previa va en `offered`, `stops`, `among` o `holding`,
  compartida por pantalla y ejecución; no agregar un segundo predicado al armar la casa.
- `today` recibe el instante porque también decide si se puede enviar. `when` lo recibe para elegir las preguntas;
  `draft(estado, hasta, input, cosa, instante)` lo recibe para detectar conflictos. Las funciones que no lo usan
  pueden conservar menos parámetros. `datum`, `words` y `also.opens` conservan sus firmas descriptivas.
- Quien arma preguntas con `asking` trae `now: () => number` y `today: () => string` en `AskWords`: son obligatorios.
  `questionWords(reloj, shown)` arma ese contexto con el reloj de la casa. `shown.day` sigue siendo obligatorio
  al componer cualquier programa con preguntas de fecha: no se adivina un calendario ausente.
  `ViewLimits.now` es obligatorio: cada lectura recibe el instante de la casa, también la de un caso derivado.
  Los puertos propios implementan `HousePorts.defect` y `RouterSource.defect` para registrar defectos de pantalla;
  `localPorts` ya lo hace y hereda el reloj de la casa. `defectReporter` está en `src/tools/failures/defect-reporter.ts`.
  El aparejo `shopRig.ports` recibe el reloj explícitamente. El router no reintenta automáticamente.



## Migrar una acción a la separación de rechazos (12/11)

La persona solo puede terminar en `Listo` o en `Error` por una causa de afuera. El orden para migrar es este:

1. **Mover cada rechazo interno fuera de `run`.** Si depende del estado, va en `offered`; si depende de la cosa
   elegida, en `among`; si combina respuestas o estado, en `stops`; si pertenece al dato mismo, en `holding` (`wrong`).
   Se conserva la causa en `refuses` y su caso. `stops` recibe respuestas parciales: comprobar los tipos antes de
   comparar. No repetir el rechazo dentro de `run` ni hacerlo pasar por una falla de afuera.

   ```ts
   // Antes, dentro de run:
   if (input.paid > input.total) return { status: "rejected", reason: "overpaid" };
   // Después, junto a run; run solo hace el cambio:
   refuses: ["overpaid"],
   stops: ({ paid, total }) =>
     typeof paid === "number" && typeof total === "number" && paid > total ? "overpaid" : undefined,
   ```

2. **Cambiar los predicados de `among`.** Antes devolvían booleanos; ahora devuelven el motivo o `undefined`.
   Conservar el motivo en `refuses` y prometerlo en un caso. Se ve apagado tanto en la lista como al buscar.

   ```ts
   // Antes:
   among: (_, state) => ({ sales: id => eligible(state, id) }),
   // Después:
   among: (_, state) => ({ sales: id => eligible(state, id) ? undefined : "venta no elegible" }),
   refuses: ["venta no elegible"],
   ```

3. **Dar `empty` a cada `thing` sin `makes`.** Es el quinto argumento; no cambia `none` ni el cuarto argumento,
   que nombra al creador. El motivo describe por qué esa acción no tiene ninguna cosa elegible. El campo se audita
   también dentro de esquemas anidados. Si hay creador pero está apagado, no cuenta como salida.

   ```ts
   // Antes:
   thing("Venta", "sales")
   // Después:
   thing("Venta", "sales", undefined, undefined, "sin ventas para cobrar")
   // Una referencia opcional sigue pudiendo contestar ninguna:
   Type.Optional(thing("Venta", "sales", "sin venta", undefined, "sin ventas"))
   // Con creador disponible se conserva esta forma:
   thing("Venta", "sales", undefined, "register")
   ```

4. **Separar las causas de afuera.** `outside` es una tupla literal; no se anota como `string[]`. Se sacan esas causas
   de `refuses`, que queda para los rechazos previos. Cuando se indican los tipos de programa e input explícitamente,
   se agrega el tercer parámetro `typeof outside`. Sin `outside`, `run` solo puede devolver `accepted`.

   ```ts
   // Antes: refuses incluía "printer offline" y run podía devolver cualquier ActResult<Shop>.
   const input = object({ receipt: text("Recibo", "Nombre del recibo") });
   const outside = ["printer offline"] as const;
   const print = programAct<Shop, typeof input, typeof outside>({
     ...offer, input, outside,
     run: ({ receipt }) => receipt === "offline"
       ? { status: "rejected", reason: "printer offline · desk" }
       : { status: "accepted", text: "Impreso · Recibo" },
     cases: [
       { promise: "prints", input: { receipt: "receipt" }, then: { says: "Impreso · Recibo", facts: [] } },
       { promise: "offline", input: { receipt: "offline" }, then: { refused: "printer offline · desk" } },
     ],
   });
   ```

   Este ejemplo usa una impresora determinista de prueba. La acción real conserva un caso aceptado y casos para
   cada causa de `refuses` y `outside`. `outside` declara la causa; el resultado puede agregar ` · dato`. El caso promete la
   respuesta completa. `reach: "world"` sigue diciendo que sale de la organización: no reemplaza a `outside`.
   Declarar algo como externo es responsabilidad del programa; la base no puede inferir de su nombre si viene
   realmente de un puerto. Una credencial ausente que el estado ya conoce se cierra antes, como cualquier rechazo
   interno. Una respuesta válida sin novedades es un éxito si no hay una falla del mundo.

5. **Estrechar los helpers de `run`.** Antes: `ActResult<Shop>`; después: `RunResult<Shop, typeof outside>`, de
   `src/tools/outside.ts`; sin causas externas, `RunResult<Shop, readonly []>`. No usar aserciones para forzar el tipo.
   Un helper que devuelve `reason: string` pierde la unión literal: devolver el objeto contextualizado por ese tipo,
   o conservar el literal en el helper. `ProgramAct<X, typeof outside>` conserva ese resultado literal; el registro
   conserva una marca opaca para que un spread no pueda sustituir `run` o `outside` por partes sin comprobar.
   Para cambiar el cuerpo o las causas, declarar la acción con `programAct` otra vez.
   Una rama imposible del cuerpo lanza `new OutsideDefect(detalle)`, importado de `tools/outside.ts`: el
   defecto queda a la vista y la compuerta falla. No devolver un rechazo interno ni un éxito vacío.
   Si el helper es compartido con un canal, conservar su resultado de dominio y convertir el motivo residual
   en defecto en el cuerpo de la acción, después de compartir su predicado puro con las reglas previas. La casa valida las reglas
   actuales antes de entrar al cuerpo, incluso si código sin tipos armó el acto a mano.
   No reenviar directamente `context.execute`: sus rechazos previos no son automáticamente fallas de afuera. Compartir la implementación
   de éxito o tratar explícitamente el resultado y clasificar la causa externa. `inconclusive` e `interrupted` no
   son resultados de `run` de un programa; los estados de la infraestructura siguen en el contrato de la casa.

6. **Revisar `today` y las superficies personalizadas.** Recibe el instante como tercer argumento y devuelve el input completo que
   representa lo vigente, o `undefined` si no lo hay. No usarlo para una sugerencia que todavía no es verdad.
   Al envolver una acción de superficie, conservar `...act`, incluidos `today`, `same`, `next` y `stops`.
   Una opción vigente intermedia sigue elegible; la última que dejaría todo igual se apaga, o deja el texto sin
   Enter. `wrong` y `stops` devuelven motivos sin anteponer «Error». No hay que agregar un rechazo a `run` para
   lo vigente. La prueba de «sin cambios» por otras puertas sigue; en pantalla se prueba que no se envíe.

7. **Completar los casos y correr la compuerta.** Cada rechazo interno necesita un caso y su causa declarada.
   Cuando la persona puede intentar elegir esa respuesta, el motivo tiene que verse en la fila apagada,
   en la opción/cosa apagada o bajo la pregunta. Si la primera referencia no tiene candidatos, se ve el `empty` del campo. Un id inexistente por
   otra puerta no reemplaza un caso de una cosa visible no elegible. Conservar ambos en `cases`: la referencia
   inexistente se rechaza antes de correr con su motivo; por teclas se comprueba que no tenga fila ni aparezca
   al buscar, sin pedir su nombre ni exigir un motivo en una fila que no existe. No reemplazar el caso por una
   cosa inventada ni por una prueba manual de una sola puerta. Un caso aceptado que cambia dos datos necesita un
   recorrido que permita cambiarlos. Un rechazo puede quedar cerrado por construcción aunque cada fila pregunte
   un dato distinto: basta con que cada una fije al menos una respuesta incompatible con ese caso.
   Ninguna pregunta alcanzable puede quedarse sin opciones, incluidas las posteriores. Cerrar esa rama antes de
   ofrecerla, o la acción con `offered`, según lo que ya se sabe. Cada causa externa debe correr y terminar en
   `Error` con su causa; cada caso aceptado tiene que llegar sin líneas de `Error`. La base cuenta los envíos,
   aunque una acción defectuosa no escriba ningún hecho. No se retira un caso para ocultar un camino defectuoso.

El programa de pruebas debe usar puertos deterministas de prueba. La base ejecuta sus acciones tal como se compusieron:
no cambia un proveedor real por uno simulado ni promete que `reach: "world"` impida salir a la red.

## Pegar y las teclas que llegan partidas (13/11)

- Una superficie manda `paste` con el texto entero cuando la persona pega: la base lo escribe donde se está
  escribiendo (la respuesta de una pregunta de texto, lo que se busca, un mensaje), con cada salto de línea o
  tabulación como un espacio y sin los de las puntas. En un menú, en una pregunta que se contesta eligiendo o en una
  confirmación no hace nada: nunca confirma, nunca elige y nunca es un atajo. Un dibujante nuevo traduce su pegado a
  `paste`, nunca a una ráfaga de `type`.
- La terminal lee las teclas como llegan: una flecha o un carácter partidos entre dos trozos son una sola tecla.
- **El criterio de la tecla escape es de tiempo, y solo vale para un escape que está solo.** Si queda solo 50 ms es
  la tecla escape. Una secuencia que ya empezó (un escape y algo más) no tiene tiempo: espera su final, tarde lo que
  tarde y llegue en los trozos que llegue, así que ningún trozo suyo se lee como una tecla suelta. Una espera que se
  cumplió mientras el programa estaba ocupado no cuenta como silencio: antes de dar el escape por solo se lee lo que
  ya había llegado. En una terminal que no dice qué tecla fue no hay otra forma de distinguir la tecla escape.
- **Lo que la terminal marca como pegado es texto, tarde lo que tarde y llegue como llegue.** Nada de lo que llega
  entre la marca de comienzo y la de cierre es una tecla. Las dos marcas se reconocen en cualquier cantidad de trozos
  y con cualquier espera entre ellos; si el primer byte del comienzo (un escape) quedó solo más de 50 ms, ese escape
  ya fue la tecla escape y lo que sigue igual empieza un pegado. Si el cierre no llegó en un segundo se lo sigue
  esperando, y desde entonces la única tecla que se atiende es ctrl c (salir): un pegado que no termina nunca no
  escribe nada. De un pegado se guardan, como mucho, 100.000 caracteres.
- Lo que eso cuesta, a propósito: después de la tecla escape, un «[» escrito a mano recién aparece con la tecla
  siguiente (podía ser el comienzo de un pegado); y después de alt + «[» o alt + «O» la tecla siguiente se pierde,
  porque termina esa secuencia.
- Sin demostrar: una terminal que no marca lo pegado (ahí un pegado llega como teclas y no hay cómo saberlo).
- Las comprobaciones derivadas mandan intenciones al router: no ven lo que pasa antes, en la lectura del teclado. Lo
  que depende de la entrada de verdad se comprueba con `realTerminal`, que corre el programa por su propia entrada.

## Lo declarado secreto
- `secret: true` en un campo string garantiza la posición declarada, siempre y por estructura: al escribir
  una acción o un hecho, esa posición lleva una referencia `secret:<UUID>`. Vale para el vacío, una sola letra,
  cualquier largo, palabras del vocabulario y texto multilínea. La entrada original se valida antes de escribir
  hechos; la lectura admite referencias en esas posiciones aunque no cumplan el largo o patrón del valor original.
- La misma acción limpia la repetición literal de los valores que entraron por sus posiciones secretas en sus
  hechos (también campos no marcados), resultado, borrador, errores y causas, y actividad. No busca todos los
  secretos de la bóveda contra todo texto. El vacío se reemplaza en su posición pero no se busca en texto libre.
  Nombres de campos, discriminantes del esquema, procedencia e identificadores del protocolo conservan su función.
- Se recorren objetos, listas, tuplas, opcionales y las ramas válidas de uniones. Una entrada cuya rama secreta
  no se pueda resolver se omite al escribirla; sus fragmentos de texto tampoco van al diagnóstico. Declaraciones
  secretas de otros tipos o bajo combinaciones no soportadas se rechazan con `E-SECRET-SCHEMA`.
  `secretInput: false` no desactiva una marca declarada.
- La acción sigue recibiendo el valor original. Sus validaciones, normalización, borrador, cuerpo y los puertos
  que ella llame pueden leerlo. **La marca no garantiza una transformación del secreto hecha por el programa**:
  por ejemplo, cambiar saltos de línea por separadores puede dejar el texto transformado a la vista.
  Tampoco se garantiza acá el tapado de la pregunta ni una limpieza final de pantallas o callbacks del programa:
  esa deuda sigue abierta. Un programa no debe copiar ni transformar el valor para mostrarlo.
- Los plegados en memoria y guardados se conservan: se construyen con los hechos que ya llevan referencias.
  La invalidación de plegados de versiones anteriores depende de la versión de su formato, fuera de esta protección.
- Al abrir un registro sin `secret-protection.json`, la base revisa sus acciones en solo lectura con el catálogo
  actual, antes de abrir la bóveda, restaurar plegados o agregar un arranque. Si encuentra un valor en una posición
  hoy declarada secreta, devuelve `E-SECRET-HISTORY` con la acción, posición y número de hecho, nunca el valor,
  y no escribe nada. No reescribe hechos: el registro sigue siendo aditivo.
- Si no encuentra valores, deja la marca de protección versión 1 con `reviewed` (acciones revisadas) y
  `unreviewable` (acciones sin declaración disponible). Lo no revisable no frena la apertura y queda contado en
  la marca; no equivale a declarar limpio ese contenido. Una casa nueva empieza con ambas cuentas en cero.
- Al actualizar, mantené las marcas en los campos, aceptá referencias en los plegados y tratá el rechazo histórico
  sin reintentar escribiendo sobre el registro. La revisión no recupera esquemas desaparecidos ni certifica salidas
  transformadas o datos no declarados. La bóveda separada no ofrece cifrado ni convierte al programa en un lector
  de referencias opacas; ese cambio de contrato se diseña aparte.

## Los registros que se guardan
- Un programa puede guardar registros que organizaciones reales escribieron con él en una carpeta que nombra en
  `package.json`: `"desert": { "program": …, "journals": "tests/journals" }`. Cada uno es una copia de su
  `journal.sqlite` (nunca `secrets.sqlite`). La protección alcanza las posiciones declaradas y las repeticiones
  literales dentro de la misma acción, con los límites explicados arriba. Un histórico no revisado, una
  transformación o un dato no declarado puede conservar material sensible; además están los datos de la
  organización: no guardes el de una organización real en un repositorio público.
- La compuerta abre cada copia con el programa de hoy, sin lo que traía plegado: cada hecho se lee y se pliega desde
  el primero, y cada cosa se lee como la lee quien administra. Un cambio que no los lea frena ahí.
- Además recorre lo ofrecido en anchura: cada camino vuelve a una copia limpia del registro, con el reloj quieto.
  Los dos primeros niveles se recorren enteros: cada fila del Menú y cada fila de lo que abre, sean las que sean (un
  registro guardado con miles de cosas tarda lo que tarda: se guarda uno chico). Más allá prueba hasta 64 caminos, 24
  niveles de decisiones y 16 alternativas por estado. Acepta opciones, marcas y texto que ya se ofrece y puede
  enviarse; no inventa texto ni escribe secretos, y no recorre conversaciones. Un error interno, una pregunta de
  opciones sin respuesta elegible o una fila apagada sin motivo hacen fallar la compuerta. Las fallas declaradas en
  `outside` pueden terminar en `Error` con su causa.
- Lo que el recorrido cubrió se lee en la salida de la compuerta, una línea por registro: cuántos caminos, cuántos
  lugares y cuántas respuestas ofrecidas quedaron sin recorrer. Es una muestra acotada, no una prueba de todos los
  estados posibles: las garantías derivadas de los casos siguen siendo obligatorias.
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
- Un valor sugerido para una pregunta que no sea «lo que el dato es hoy» (`today` marca además «actual» e impide
  enviar lo vigente): sugerir en «editar condición» la que dice el padrón; que una pregunta que no es la primera abra con un
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
- Una devolución de plata sin cosas y un rechazo que deje escrito lo que contestó el fisco: pedidos de Capibara que
  hoy se resuelven del lado del programa.
- Un importe que se escribe en otra moneda: la máscara de plata muestra siempre el signo del país («$»), aunque la
  respuesta anterior, o la cosa elegida, diga dólares. Y, en general, un valor sugerido o una forma de campo que
  dependan de una respuesta anterior o del estado (la cantidad que queda por devolver de ESE artículo).

## Las casas temporales de las pruebas

Cada caso elimina su casa al terminar, también si falla al abrir o cerrar. Al empezar la corrida se recuperan las
casas abandonadas del mismo workspace: el nombre incluye su huella y el proceso dueño; solo se elimina un directorio
de más de 24 horas si ese proceso ya terminó. No se siguen enlaces ni se borran casas activas, prefijos de otros
workspaces o carpetas históricas cuyo nombre no permite reconocer al dueño. La misma limpieza se aplica al primer
caso cuando las garantías se usan fuera del runner de este repositorio.


## Los cuatro resultados de recorrer un rechazo

- **Cerrado por causa declarada:** la persona lee el motivo en la fila de esa cosa o bajo su pregunta;
  la acción no se envía. El motivo de una fila vecina no sirve de prueba.
- **Cerrado por el dato:** la respuesta no se puede terminar de escribir, o la referencia no existe entre
  lo elegible. No aparece Enter, error ni motivo de la acción bajo esa pregunta.
- **Sin camino:** falla. La garantía indica la pregunta y la fila que deja abiertas las respuestas del caso,
  o que ninguna fila ofrece la acción. No encontrar un recorrido no demuestra que el programa esté bien.
- **Cerrado por construcción:** la pantalla nunca hace esa pregunta. Se recorren todas las entradas alcanzables
  desde el Menú, también las búsquedas, los menús anidados y las entradas desde otra herramienta. Tiene que haber
  al menos una fila para esa acción sobre esa cosa, y cada una debe fijar un valor distinto al del caso en alguna
  respuesta que no pregunta. La respuesta incompatible puede ser distinta en cada fila. Se comprueba además,
  por llamada directa, el rechazo con su causa declarada y que no cambien los hechos ni el estado del programa.

Esto último vale solo para rechazos: una promesa aceptada sin camino siempre falla. No hace falta inventar una
fila para el artículo inexistente ni permitir cambiar dos datos a la vez para mostrar un rechazo imposible de
formular. Sí hace falta ofrecer la acción en alguna fila real. Cada comprobación por teclas expone `report()`:
tras `run()` dice qué cierre encontró, o conserva el diagnóstico si falló. Las causas externas siguen siendo
resultados de una ejecución: se prueban como tales, con su error visible.

## Una entrada estable para las pruebas del programa

Importar desde **`#desert/testing.ts`**. No hace falta conocer dónde guarda la base cada implementación.
`tests/laws/testing-api.spec.ts` fija los nombres exportados, incluidos los tipos: quitar o renombrar uno falla
primero en la base. Los caminos internos existentes conservan sus exportaciones y firmas; no son la entrada
recomendada para pruebas nuevas. El antiguo `promised-current.ts`, ya ausente antes de esta corrida, se reemplaza
al migrar el import de `currentCloses` a esta entrada.

| Para qué | Exportaciones |
|---|---|
| Garantías | `programChecks`, `promisedChecks`, `walkedChecks`, `currentCloses`, `quietEntry`, `quietScreen` |
| Casa y casos | `staged`, `given`, `perform`, `cast`, `wroteSince`, `localPorts`, `startHouse` |
| Recorrer | `seated`, `goTo`, `actRow`, `openRows`, `type`, `view`, `fitsSmallest`, `keysTo` |
| Por una terminal de verdad | `realTerminal` (el programa corriendo con su propia entrada en una pseudo-terminal: `press` manda bytes, `until` espera un texto en pantalla, `screen` la lee), `screenOf`, `RealTerminal` |
| Superficie | `asking`, `questionWords`, `offeredOn`, `houseRouter`, `houseTools`, `startRouter`, `begin`, `fieldOf`, `walkBody`, `walking` |
| Estado y hechos | `createHouse`, `identityView`, `houseStep`, `Bus`, `effect`, `vocabulary`, `houseCatalog`, `startState`, `startTools`, `toolsStep` |
| Declarar datos y comprobar causas | `object`, `text`, `ids`, `caseInstant`, `programAct`, `OutsideDefect`, `outsideCause`, `MissingView`, `toolTexts`, `genericTexts` |
| Tipos | `Aim`, `Check`, `Decided`, `Doing`, `House`, `Seat`, `Body`, `Screen`, `Choice`, `Session`, `Walk`, `Router`, `Shown`, `Tool`, `Emission`, `Case`, `Composition`, `ProgramAct`, `ProgramTool`, `Step`, `KeyStore`, `Program`, `State` |

Los callbacks declarados como métodos conservan su objeto como `this`, tanto al leer una herramienta como al
preguntar o ejecutar una acción. Si una lectura falla, la base conserva su diagnóstico como defecto del programa;
solo una ausencia explícita (`MissingView`, también exportada por `surface/shown-tool.ts`) se presenta como
una cosa que ya no está. Una pantalla propia que detecta esa ausencia lanza `new MissingView(tool, target)`;
un `Error` común conserva su condición de defecto.

También están los campos y sus reglas (`count`, `day`, `digits`, `handle`, `holding`, `many`, `money`, `oneOf`,
`option`, `padded`, `quantity`, `quantityDecimals`, `someOf`, `textLimit`, `thing`, `usually`, `when`, `wrongIn`),
los formatos (`formats`, `shaped`, `paddedMask`) y los ayudantes de pantalla (`anyToolScreen`, `section`,
`menuTarget`, `matches`, `startTerminal`). Así las pruebas pueden componer las mismas piezas que el programa.
Se suman los tipos `ViewLimits`, `HouseState`, `TimeSource`, `Catalog`, `Event`, `ProgramFacts`, `ProgramScreen`,
`SurfacePorts`, `ScreenActs`, `Start`, `Locale`, `ViewRow`, `RunResult`, `Also`, `Need`, `Offered`, `Told`,
`ActContext`, `ActResult` y `Slices`. Para evitar dos nombres iguales, `House` es la casa de pruebas y `HouseState`
es el estado de la organización; `padded` declara el campo y `paddedMask` arma su formato de escritura.
