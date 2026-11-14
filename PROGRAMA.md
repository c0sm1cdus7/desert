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
  `kit-set` suma el recorte de acciones; `scene` guarda la última descripción de cada identidad o mente.
- **El registro**: solo se agrega; cada hecho con autor e instante; el estado es el registro plegado.
- **La superficie**: Menú, lista de cada herramienta, objeto abierto y pregunta; un router único para cualquier
  dibujante (hoy la terminal). Atención y Actividad en cada menú; buscar con espacio; Preferencias.
- **Las pruebas**: de cada caso sale la prueba sobre la organización y el recorrido con teclas desde el Menú; de
  cada acción, que rechace lo que su forma no admite, que su fila apagada diga su motivo, que lo que deja se
  encuentre buscando. Las garantías bajan por listas y menús hasta leer la fila, también en la ventana mínima;
  comparan motivos enteros en filas apagadas o bajo la pregunta. Un dato que no se puede escribir queda sin
  Enter, error ni motivo de la acción. También se prueba que todas las filas fijen una respuesta incompatible;
  sin esa evidencia positiva, una ruta ausente falla indicando la pregunta y la fila que queda abierta.
  El programa no escribe ninguna de esas: la base las reparte por posición en ocho archivos
  (`tests/program/part-*.checks.ts`), también los recorridos de registros guardados. Cada comprobación corre una
  sola vez y conserva su grupo y nombre. Al subir de base no se cambia la configuración: el patrón
  `tests/program/**/*.checks.ts` ya encuentra todas las partes. El número vive en `tests/program/parts.ts`.
  Para comparar una actualización, guardá antes y después `pnpm vitest list --staticParse=false --json=lista.json`:
  compará los nombres completos como multiconjunto, sin la ruta del archivo ni el orden. Deben ser los mismos;
  una parte sin comprobaciones agrega solamente «this part has no derived checks» bajo «derived checks».
  El armado de la lista se repite en cada parte; no ejecuta las comprobaciones.

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
  texto 3, sin «Error» y sin `enter`. Enter sobre un valor inválido agrega su motivo sin avanzar; una tecla que no entra conserva el campo.
  Un prefijo numérico como «0», que todavía puede crecer, no agrega «mínimo» ni «mayor a».
  «Error» en coral queda para el resultado de una acción que corrió.
- `money(pregunta, mínimo, moneda)` conserva el dato como centavos enteros. El tercer argumento es opcional:
  un símbolo (`"US$"`) o `(respondido, estado, destino, instante) => símboloOIndefinido`. Sin símbolo usa
  `locale.currency`; conserva los separadores del país. Para tipar el estado, usar `money<State<MiPrograma>>(…)`
  o una función cuyo segundo parámetro ya tenga ese tipo. La función recibe el estado actual y el destino de la
  acción, como `among` y `stops`; puede usar la moneda elegida antes o buscar la venta/factura sobre la que actúa.
  En una entrada `also`, la cosa elegida está en las respuestas que fija `also.with`; el destino sigue siendo
  el de la acción. Dentro de objetos, listas y alternativas, recibe lo respondido antes en los niveles exteriores
  y en el objeto actual; el nombre del nivel más cercano prevalece. No recibe campos todavía sin contestar.
  El símbolo aparece en el campo vacío, al escribir, en sus límites, en el eco y en la fila del valor actual.
  Las preguntas derivadas de los casos usan el estado y el destino de cada caso. `confirms` sigue siendo texto
  del programa: debe usar esa misma decisión de moneda. La base no garantiza ese texto.
  No hace falta envolver `next` para cambiar la máscara.
  La base distingue monedas por su símbolo: dos monedas con el mismo símbolo son la misma para la base.
  Todo importe se escribe y muestra con dos decimales; el dato guardado sigue siendo centavos enteros.
  El símbolo, incluido el del país, ocupa de una a ocho columnas del pintor, sin marcas combinantes,
  controles, saltos ni espacios al borde. `US$` ocupa tres columnas; `ＵＳ＄`, seis; `￥`, dos.
  Un símbolo literal inválido impide componer las preguntas y el diagnóstico nombra la pregunta y el valor;
  si es el del país, dice «Símbolo de moneda inválido para el país», seguido del valor.
  Uno calculado se valida al resolverlo con el estado y destino reales,
  también en las comprobaciones derivadas. Es un defecto del programa: la acción queda sin poder abrirse,
  con el código del defecto, la pregunta y el símbolo visibles; las otras acciones de la herramienta siguen disponibles.
  Si la moneda cambia, un importe escrito o propuesto se vuelve a preguntar vacío, sin convertir ni reutilizar
  sus centavos. También se comprueba al escribir y al confirmar si cambió el estado. Volver atrás sin cambiar
  la moneda conserva lo escrito. Si el estado cambia su moneda durante el recorrido, se dice «cambió la moneda».
  Mostrar el importe vacío actualiza la sesión de ese dispositivo: aunque el símbolo vuelva antes de la
  siguiente tecla, el valor anterior no reaparece. Una acción en vuelo conserva los centavos enviados;
  si falla después de cambiar el símbolo, se ven el Error y «cambió la moneda», juntos.
  Al vaciar por cambio de moneda se conservan el Error de la acción y los avisos de teclas descartadas,
  y se agrega «cambió la moneda». Los motivos del valor se recalculan sobre el vacío en la moneda nueva:
  desaparecen el mínimo, el tope o el motivo del programa que ya no correspondan. Si ya había un motivo de validación
  guardado, se vuelve a validar el vacío como confirmado: un importe obligatorio dice «falta completar».
  Si sigue correspondiendo un motivo del valor, se muestra actualizado, incluso junto al Error de la acción.
  La memoria de una acción sigue siendo local: reiniciar el dispositivo la pierde.
- Un campo puede decir cuándo se pregunta, según lo respondido antes (`when(campo, (respondido, instante) => …)`).
- `holding(campo, (valor, instante) => motivoOIndefinido)` recibe el mismo reloj que `run`, `stops` y `among`.
  Conserva los motivos que el campo ya tenía: primero comprueba el campo y después la regla agregada, solo si
  el campo acepta. Por ejemplo, agregar una regla a `day` no permite guardar un día inexistente. Se pueden
  encadenar reglas; se muestra el primer motivo que aplique, en el orden en que se agregaron.
  Al Enter, todo valor inválido dice el motivo: «falta completar» si es obligatorio vacío, «día incompleto»,
  «dígitos incompletos», el mínimo de caracteres o el límite numérico. Mientras se escribe, un prefijo que
  puede completarse no molesta. Un campo opcional vacío sigue aceptando «nada».
  Un carácter que el campo descarta dice por qué debajo de la pregunta, una sola vez por motivo distinto.
  Borrar en vacío, mover el cursor o repetir cero sobre cero no borra motivos ni el Error anterior.
  El cero que no agrega ningún dígito dice «cero inicial descartado». Sólo una edición que cambia el
  valor limpia los avisos de edición; los motivos propios del valor se vuelven a comprobar.
  El texto libre también explica el tope y los espacios iniciales o dobles. Un pegado conserva el
  primer motivo interior hasta terminar ese pegado, después de recortar espacios y saltos de los bordes;
  la siguiente edición que cambia el valor lo limpia. Un carácter permitido que excede el largo dice el tope. El valor
  aceptado no cambia; un motivo anterior, incluido el Error de una acción fallida, sigue a la vista
  con el aviso de la tecla debajo.
  Un día inexistente dice eso antes de comprobar si es futuro.
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

## Los registros que se guardan
- Un programa puede guardar registros que organizaciones reales escribieron con él en una carpeta que nombra en
  `package.json`: `"desert": { "program": …, "journals": "tests/journals" }`. Cada uno es una copia de su
  `journal.sqlite` (nunca `secrets.sqlite`; lo secreto no está en el registro, que guarda cada hecho ya sin sus
  valores secretos, pero sí están los datos de la organización: no guardes el de una organización real en un
  repositorio público).
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
- Cada composición y apertura declara `projectionVersion`. Hay dos modos explícitos: un string no vacío es una
  versión **manual**; `codeProjectionVersion(rutas, extensiones)` de `src/programs/calculation-version.ts` devuelve
  una versión **de código**, con su declaración y huella calculadas por la base. No se elige el modo por el texto
  del string. `projectionVersion(rutas, extensiones)` sigue disponible como huella string; usar ese string solo
  constituye modo manual y conserva sus exigencias de evidencia.
- En modo manual, cambiar un cálculo exige cambiar la versión. El control abre cada registro guardado sobre una
  copia con sus plegados y compara estado completo y reloj con reconstruir. Informa **REUTILIZADO** o
  **RECONSTRUIDO**, y el motivo real de la apertura. La misma decisión de compatibilidad sirve al control y a la
  apertura. Además, tiene que haber **al menos un registro reutilizado por la candidata**: si ninguno se reutiliza,
  incluso si falta la carpeta declarada, falla por falta de evidencia. Un plegado en secuencia cero no acredita
  cálculos anteriores. Un formato anterior legible o plegados de dos
  entregas atrás no acreditan esa reutilización. Los registros se renuevan con los plegados de **cada entrega**;
  conservá la evidencia anterior durante su control, y renovala como parte de publicar esa entrega. Un cambio
  deliberado de identidad necesita también evidencia reutilizable de esa identidad; no alcanza comparar dos
  reconstrucciones. No regeneres a ciegas todos los registros con la candidata para hacer pasar el control.
  Para renovar la entrega ya verificada usá `renewKeptJournals(program, carpeta)`, exportada por `src/testing.ts`.
  Reconstruye y comprueba los plegados de todos sus registros, sin arranque, servicios ni hechos nuevos; devuelve
  sus nombres. Una carpeta vacía falla. Conservá los registros anteriores hasta terminar el control de actualización.
  Los auxiliares `*.writer.sqlite*`, `*.sqlite-wal`, `*.sqlite-shm` y `*.sqlite-journal` no son registros guardados:
  excluilos del control de versiones de la carpeta de pruebas.
- En modo de código no se exigen plegados reutilizables: los cambios dentro del código declarado cambian su
  identidad y reconstruyen. El control modifica una copia del código, comprueba que cambia la huella y que esa
  identidad reconstruye plegados reales; también funciona sin carpeta de registros guardados. Cada registro que sí
  se guarda se compara con reconstruir y dice qué probó. Si el código cambió después de componer, el control falla:
  componé una entrega inmutable. La base mantiene además su propia `baseProjectionVersion`.
  `codeProjectionVersion` fija la primera huella de cada declaración de rutas y extensiones en el proceso:
  componer de nuevo o abrir otra organización no vuelve a leer el código. Calculala al cargar la composición.
  Desplegá reemplazando la entrega y reiniciando los procesos, nunca editando archivos debajo de uno que corre.
  Si igual cambian, ese proceso conserva su primera huella; la compuerta compara contra los bytes actuales y falla.
  El proceso siguiente toma la nueva huella y reconstruye. Cambiar archivos entre importar el cálculo y tomar
  su primera huella queda fuera de este contrato: la entrega debe permanecer inmutable desde su carga.
  La función de bajo nivel `projectionVersion` calcula los bytes actuales para verificaciones de la compuerta.
- La huella cubre nombres relativos y bytes de **archivos regulares**, en orden fijo, más la versión de Node.
  Por defecto admite `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts` y `.cts`. Podés declarar otra lista de
  extensiones para carpetas y archivos sueltos: `codeProjectionVersion([src, baseSrc, lockfile])`.
  Un archivo suelto declarado entra cualquiera sea su extensión; un archivo privado o de almacenamiento se rechaza.
  No lee el contenido de archivos ocultos; inspecciona metadatos de carpetas ocultas para detectar registros; las extensiones que no declaraste quedan afuera. Los archivos de pruebas
  con extensiones declaradas sí participan. No sigue enlaces simbólicos ni acepta enlaces duros. Primero revisa
  los metadatos de **toda** la declaración; si contiene un registro SQLite o está debajo de una organización,
  falla antes de leer bytes. Nunca apuntes a una organización, a una carpeta de registros o a sus auxiliares.
- Lo que el programa carga **fuera de los árboles o archivos declarados** no queda cubierto: dependencias instaladas
  por enlaces, configuración, datos externos y cambios de zona horaria no entran solos. El archivo de versiones de
  dependencias cubre sus bytes, no prueba que lo instalado coincida. Declarar archivos regulares adicionales sirve
  para esos insumos; la zona horaria y las dependencias efectivamente cargadas deben quedar fijas en la entrega.
  Incluí sus árboles reales si intervienen en los cálculos; no uses el repositorio entero como atajo.
  La compuerta revisa imports locales, reexportaciones, `require`, imports dinámicos literales y alias `#` del código
  declarado: si apuntan fuera de la huella (también a una carpeta oculta), falla nombrando el archivo. Un import
  calculado que no puede enumerar también falla. Los archivos de pruebas entran en la huella pero no se examinan
  como raíces de cálculos; si el cálculo los importa, sí se recorren sus dependencias. La composición declarada
  en `desert.program` también debe estar incluida. Los paquetes externos siguen sujetos al contrato de la entrega.
- Medición del 13/11/2026, Node 24.16.0, sobre `capibara-obra/src` y `capibara-obra/desert/src`:
  tres procesos nuevos tardaron **109,60 / 46,13 / 46,12 ms** en la primera `codeProjectionVersion`;
  repetirla con la misma declaración tardó **0,016–0,020 ms**, conservando la primera huella.
  Es frío de proceso; frío de caché de disco del sistema: **no comprobado**. Como supera 50 ms, una mejora propuesta,
  todavía no implementada, es calcular un manifiesto de hashes durante la construcción de la entrega inmutable,
  empaquetarlo con ella y verificar la correspondencia de código y manifiesto antes de publicarla. No alcanza
  cachear por fecha o tamaño ni confiar en un manifiesto de una carpeta que se pueda modificar después.
- Los cálculos devuelven estado nuevo: **no modifican en el lugar el estado que reciben**, ni sus objetos, arrays,
  mapas o conjuntos anidados. La compuerta derivada de casos, recorridos y registros guardados pliega los hechos
  sobre estado congelado y verifica que el anterior siga igual. Un cálculo que lo modifica falla la compuerta.
  El registro conserva además una copia de su marca de vuelta atrás: un reintento de una reconstrucción fallida
  dentro de la misma instancia no duplica estado. Una reconstrucción fallida impide guardar plegados durante toda
  esa instancia, aun si un reintento termina bien; una instancia nueva puede reconstruir y guardar normalmente.

## Un objeto

- La ventana `recentLines` limita las filas recientes que la herramienta entrega para listar; no define qué
  objetos existen. `targets` sigue declarando todos los objetos, y un objeto anterior se puede nombrar, buscar,
  elegir y abrir desde Atención, Actividad, una referencia o una acción aunque ya no esté entre esas filas.
- Para resolver nombres, la base pide la lectura completa con `recentLines: Number.MAX_SAFE_INTEGER` y arma
  un índice compartido por herramienta, versión del estado e instante de lectura. `houseRouter` fija ese instante
  durante cada pintado o intención; un nuevo estado o instante renueva el índice. La búsqueda usa la misma lectura.
  Los datos propios de `itself` siguen separados de las filas de objetos. No cambia lo guardado ni hace falta
  adaptar las herramientas: la lectura completa ya era la que usaba la búsqueda.
- Que el objeto no exista, o que falte su nombre en la lectura completa, sigue siendo un defecto o una ausencia
  explícita según la entrada; no se inventa un nombre para ocultarlo. El listado reciente no agrega filas antiguas
  con identificadores usados como nombres. El recorte visual por altura sigue dejando recorrer las filas listadas.
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
- Un valor sugerido o una forma de campo, fuera de la moneda de `money`, que dependan de una respuesta anterior
  o del estado (la cantidad que queda por devolver de ESE artículo).

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

La configuración de Vitest de quien usa la base debe incluir `desert/tests/program/setup.ts` en `globalSetup`
del proyecto que ejecuta las ocho partes. El coordinador resume una vez sus grupos y nombres en orden, incluyendo
repeticiones; cada parte compara su lista con ese resumen antes de registrar pruebas. Si cambió, falla esa parte.
Una carpeta `desert.journals` nombrada vacía o inexistente falla en ambos modos, contando registros regulares,
no controles ni auxiliares. Cada registro aporta apertura, recorrido y actualización; el paso de tres posiciones
reparte los nueve recorridos 1/1/2/1/1/1/1/1 entre las ocho partes, sin cambiar sus nombres.

## Un solo escritor y recuperación del estado

Una organización abre una sola vez por almacenamiento, aunque se llegue por un enlace simbólico, una ruta
relativa, otro hilo u otro proceso. Otro escritor recibe `WriterAlreadyOpen` (`WRITER_ALREADY_OPEN`), con el rechazo habitual y no altera al que ya está abierto.
El lector de hechos puede seguir leyendo. Se rechazan enlaces duros y enlaces simbólicos colgantes; las bases
en memoria siguen siendo independientes. Dos archivos distintos también son independientes dentro de una carpeta.

Para subir desde la versión anterior hay que detener **todos** los procesos que usan la organización y recién
entonces actualizar y abrir. No se admite mezclar versiones en ejecución. No cambia ningún hecho ni hace falta
cambiar el vocabulario o los pliegues por A03. La primera apertura reconstruye los plegados del formato anterior:
recupera lo que el registro conservó aunque el estado guardado estuviera incompleto, sin repetir las acciones.

La toma exige una escritura SQLite real en el auxiliar, dentro de la transacción que se mantiene hasta cerrar.
Si el auxiliar o su carpeta no permiten escribir, SQLite se queda sin espacio, está dañado o es un enlace, abrir
falla con `WriterLeaseUnavailable` (`WRITER_LEASE_UNAVAILABLE`, con la causa original). No se cambian sus permisos
para arreglarlo. Un auxiliar nuevo se crea con modo `600` mediante SQLite (`modeof`), sin abrirlo con funciones de archivos.
También se rechazan enlaces y archivos no regulares en sus vecinos `-journal`, `-wal` y `-shm`,
antes de que SQLite los abra; la misma revisión protege las entradas del registro y de la apertura privada. Se exige un archivo regular sin enlaces duros y se fija el modo de journal del auxiliar a DELETE;
no se acepta que `BEGIN IMMEDIATE` sobre una conexión de solo lectura aparente haber tomado la exclusión.
Un vecino con cero enlaces está siendo borrado y se considera ausente, no un enlace inválido.
El sistema libera la exclusión si el dueño muere, incluso con SIGKILL. No hay que borrar candados ni buscar un
PID. El archivo auxiliar `journal.sqlite.writer.sqlite` debe permanecer junto al registro: no se borra para
abrir. Borrar ese archivo con la organización abierta rompe la exclusión; reemplazarlo también. Otro proceso
podría tomar el archivo nuevo. Antes de escribir y antes de confirmar una transacción, el dueño comprueba que
la ruta conserva el mismo archivo regular, sin enlaces duros, dispositivo, inodo e instante de creación: si no, rechaza con `WriterLeaseLost`, código
`WRITER_LEASE_LOST`, revierte la transacción y deja de escribir durante toda esa instancia. El cierre libera
recursos, sin guardar plegados, y también informa esa pérdida. Renombrar la carpeta de una organización abierta
hace que el dueño deje de escribir con ese error; cerrá antes de moverla. Hay que cerrar y volver a abrir. Esta comprobación
no autoriza a modificar archivos mientras la organización está abierta ni sincroniza cambios externos a SQLite.

Un proceso que abre por su cuenta el archivo de la exclusión con funciones de archivos (leerlo o copiar la
carpeta de una organización abierta) suelta su propia exclusión POSIX. La base nunca lo hace. Para copiar el
registro de una organización abierta usá `copyJournal(origen, destino)` de `src/adapters/storage/copy-journal.ts`:
la copia de SQLite incluye lo confirmado en WAL. No uses `readFile`, `copyFile` ni `cp` sobre el auxiliar.
Si igual ocurre y otro escribe, el dueño detecta el avance del registro dentro de su próxima transacción:
lanza `WriterLeaseLost`, esa escritura no deja nada y la instancia no vuelve a escribir ni guarda plegados.
También lo informa si encuentra otra transacción de escritura ocupando el registro. La pérdida por lectura ajena
no es observable por la identidad del archivo antes de que otro tome la escritura; no se promete detectarla al leer.

`journal.lock` ya no es un puente: no se crea ni se lee. Uno anterior se ignora y se borra después de tomar la
exclusión del auxiliar; el cierre no lo toca. Este cambio de contrato modifica a propósito las pruebas y los
papeles que antes exigían el puente. Actualizar sigue exigiendo detener todos los procesos.

Los plegados guardados tienen formato 4 y se aceptan en un solo punto (`journal/snapshot-format.ts`). Cada
registro recibe una identidad propia persistente al nacer; uno anterior la recibe en su primera apertura de escritura
o mantenimiento con esta versión. Cada plegado lleva esa identidad: copiar solo un plegado de otra organización obliga a reconstruir.
Una copia completa del registro conserva su identidad, y se puede mover o restaurar sin perderla.
Un formato incompatible o una secuencia inválida obliga a reconstruir el grupo entero. Un salto al plegar aborta
toda la escritura; el grupo se guarda en una transacción después de restaurarse. La identidad de cálculos incluye
la versión del programa y de la base, además del vocabulario y los iniciales. Un plegado sin esas identidades se
reconstruye una vez. El sobre lleva SHA-256 de los bytes serializados del plegado completo: si falta o no coincide,
se descarta, se reconstruye y se avisa. Los plegados de formato 3 sin suma se reconstruyen una vez.
Una suma de control detecta daño, no autentica archivos: alterar el estado y recalcular también su suma a propósito
sigue fuera de lo garantizado en ejecución; la comparación de la compuerta contra el registro sí lo detecta.

Cada descarte dice el nombre del plegado y el motivo: formato anterior o desconocido, bytes ilegibles, secuencia
inválida o adelantada, otro registro, cálculos distintos, nombre retirado o un grupo dependiente incompleto.
Son avisos `SAVED_FOLD_REBUILT`, no fallas. Durante el arranque salen por la salida de diagnósticos (stderr,
`StorageNotice`) y quedan disponibles en `house.storageNotices()`, en la instancia que abrió. No son hechos,
no escriben `tool-entry` ni agregan historia por reconstruir. Diez aperturas del almacenamiento, alternando
identidades, dejan exactamente los mismos hechos. El arranque de `startHouse` conserva su hecho de ciclo de vida
`boot`, independiente de los avisos; también siguen siendo hechos los resultados reales de las herramientas.
Los pares de estado y reloj se conservan por identidad dentro de la misma versión de cálculos: cada identidad
reconstruye la primera vez y después retoma desde su último hecho, aunque otras hayan abierto en el medio.
No se comparten estados calculados para personas distintas. Un cambio de versión retira los pares anteriores.
Una apertura sin descartes no repite el aviso. Quien usa `SqliteJournal` directamente recibe stderr o pasa un
receptor de diagnósticos como tercer argumento.

Solo SQLite abre y cierra los archivos del auxiliar, del registro y de la bóveda. Las comprobaciones de registros
conservados también copian mediante SQLite, incluyendo WAL, sin abrir descriptores propios sobre el registro.

Las pruebas derivadas de cada caso y recorrido comparan estado completo y reloj tras cerrar y abrir con otra
apertura después de borrar los plegados guardados. Los registros conservados hacen esa comparación antes de
recorrerlos; el archivo auxiliar del escritor no se toma como un registro conservado.


## El kit, la escena y el destinatario de la atención (14/11)

`granted` conserva su sentido: dar una herramienta entera. `kit-set` toma `{ holder, tool, acts }`, escrito por
quien administra: con una lista deja solo esas acciones; con `[]` ninguna, manteniendo la herramienta; con `null`
todas. Una identidad sin kit puede todas las acciones de la herramienta que tiene. No se da kit a un extraño ni
para una herramienta que no tiene; el kit dirigido a quien administra se ignora y nunca le recorta acciones.
Al sacar una herramienta se borra su kit; al devolverla llega entera. Al salir de la casa se pierden los kits.
Al recibir la administración se borran todos los kits de quien la recibe. Si después la devuelve, sus herramientas
siguen enteras hasta que quien administra le dé otro kit.

`mindOf(tool)` y `mindTool(actor)`, en `house/house.ts`, nombran a la mente como `mind:<herramienta>`.
No es una identidad: no recibe `granted`, canales ni administración. Solo puede actuar si su herramienta existe
en el registro, sobre ella o sus cosas y con las acciones que le dio quien administra. Sin kit no puede actuar;
`null` le da todas las de su herramienta. No necesita atenderla ni tiene preferencias o actos de atender.
Los actos que el programa ofrece por `own` son solo para identidades; a la mente la casa le ofrece únicamente `scene`.
`allowedAct(house, by, tool, act)` comprueba ambos niveles; toda acción anidada conserva autor y pasa de nuevo
por ese control con el estado vigente. Un acto ya iniciado puede terminar si cambia el kit; una ejecución anidada
que todavía no empezó vuelve a comprobarlo. El resultado y la entrada quedan a nombre de la mente.

La acción propia `scene`, sin destino explícito, toma `{ general, to? }`; `to` es un mapa de identidad a texto.
El autor lo fija la ejecución. Cada identidad o mente escribe solo la suya, aun sin kit de acciones.
El general tiene hasta 4.000 caracteres, cada parte hasta 1.000, con hasta 64 partes y nombres de hasta 160 caracteres.
El esquema rechaza nombres y textos vacíos o compuestos solo por espacios o los caracteres de ancho cero
U+200B–U+200D, U+2060 y U+FEFF. Antes de escribir, la acción comprueba que cada nombre sea una identidad presente
en la casa: rechaza un ausente o una mente y dice a quién no pudo dirigir la parte.
`house.scenes` guarda el último hecho de cada autor,
con instante y secuencia; `identityView` lo comparte entero, incluidas las partes dirigidas. El historial queda
en el registro. La última escena de quien sale queda guardada. El pliegue no conoce el registro de herramientas:
un escritor directo puede guardar la escena de `mind:ausente`; la ejecución la rechaza.

`Need` gana `to?: string`. Sin él Atención sigue llegando a quienes tienen la herramienta; con él solo a esa
identidad, si está en la casa y tiene la herramienta. Si no cumple esas condiciones, la necesidad se muestra a
quienes tienen la herramienta, igual que una sin destinatario. Cada caso que promete necesidades debe incluir ese
mismo destinatario; la garantía de la casa compara el dato completo y la de Atención mira desde quien hace el caso
y desde cada destinatario prometido. Si este no puede verla, falla diciendo a quién iba. La escena explica: no crea
necesidades ni cambia quién puede leer entradas privadas o canales. No hay pantallas nuevas; apagar las acciones
fuera del kit con su motivo queda como deuda 224 para lectura y kit.

Un programa que no usa estas adiciones no tiene que cambiar sus herramientas ni casos. Quedan reservados los
nombres de hechos `scene` y `kit-set`, y el prefijo de actor `mind:`; si los usaba, necesita resolver la colisión
antes de subir. `mind:` es un nombre reservado: ninguna identidad puede llamarse con ese prefijo. Un registro
anterior que tenga una identidad `mind:…` se pliega distinto; no se corrige ni renombra en el plegado. En particular,
si `mind:jefe` creó la casa, ese `house-created` se ignora y un siguiente `house-created` de `ana` deja a Ana como
administradora. Los `granted` para `mind:…` quedan en el registro pero no incorporan esa identidad a la casa.
No se agrega `message`. Quien construye `House` a mano agrega `kits` y `scenes` vacíos o parte de
`emptyHouse`. `Need.to` es opcional y la entrada `testing.ts` no suma exportaciones.
La versión de cálculos de la base pasa a `desert/3`: al actualizar se reconstruyen los plegados, también los de
la primera vuelta (`desert/2`), para borrar los kits al recibir la administración. En versión manual,
la evidencia guardada debe renovarse con la entrega comprobada, conservando la anterior durante su control.
