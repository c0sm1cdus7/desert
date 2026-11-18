# Cómo se arma un programa sobre DESERT

Escrito el 11/11/2026 con lo que hoy hace Capibara sobre esta base. Es lo que tiene que saber quien suba otro
programa (Kenon). Lo que una regla hace cumplir está en `GARANTIAS.md`; las leyes, en `LEYES.md`.

## Lo que el programa declara

| Qué | Con qué | Dónde mirarlo |
|---|---|---|
| Sus hechos | `vocabulary(catálogo)`: cada hecho con su forma (TypeBox). La base suma los suyos. | `src/journal/vocabulary.ts` |
| Lo que guarda cada herramienta | `Slices`: un valor inicial y un paso por herramienta (hecho → nuevo estado). | `src/tools/tool-contract.ts` |
| Cada herramienta | `ProgramTool`: `id`, `purpose`, `facts`, `targets`, `view`, `summary`, `acts`, y si hace falta `menus`, `closed`, `needs`, `words`, `start`. | `src/tools/promises.ts` |
| Cada acción | `programAct({ name, enter, undoable, purpose, key, on, input, run, cases, … })`. | `src/tools/promises.ts` |
| Lo que promete | `cases`: dado esto, al hacer esto, pasa esto (dice, escribe, se lee, pide atención) o se rechaza con un motivo. | `src/tools/promises.ts` |
| Sus palabras | `Shown.words[herramienta]`: `name`, `key`, y `system` o `inside`; si lista cosas, `empty`, `listed`, `reads` y `presents`; si lee datos propios, `itself`. | `src/surface/bridge/ports/house-ports.ts` |
| Su país | `Shown.locale`: cómo se escribe la plata y el día. `Shown.day` (qué día es un instante, como lo cuenta su país) y `Shown.moment`: obligatorio `day` si hay alguna pregunta de fecha, aunque no sugiera hoy ni limite el futuro (no compone sin él). | `src/surface/formats/masks.ts` |

El programa exporta `program` (una `Composition`: `words`, `registry`, `slices`) y `shown`, y dice en su
`package.json` dónde están (`"desert": { "program": "src/…" }`). Con eso la base lo corre y lo comprueba.

## Lo que la base hace con eso

- **La organización** (`house`): quién administra, quién pertenece, las selecciones de kit de cada identidad y sus preferencias. Quien
  administra da y quita herramientas (`granted`), saca a alguien (`removed`) y pasa la administración (`handed`):
  la base pliega esos hechos y cuida sus reglas; los escriben sus actos propios y sus piezas del core.
  `kit-set` reemplaza la selección del titular; `scene` guarda la última descripción de cada identidad o mente.
- **El registro**: solo se agrega; cada hecho con autor e instante; el estado es el registro plegado.
- **La superficie**: Menú, lista de cada herramienta, objeto abierto y pregunta; un router único para cualquier
  dibujante (hoy la terminal). Cada identidad puede leer y buscar todas las herramientas y sus objetos; las acciones
  fuera del kit quedan apagadas. Atención se limita a las herramientas de las que tiene al menos una acción, y Actividad muestra lo de las demás
  personas; buscar con espacio; Preferencias. La superficie comprueba cada acción del kit.
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

## Quién escribe los hechos de un acto

| Quién actúa y por dónde | Qué puede devolver en `effects` | Autor |
|---|---|---|
| Identidad, en una herramienta de programa | Solo hechos de programa declarados en `Tool.facts` de esa herramienta. | La identidad que actúa. |
| Mente, en su herramienta | Los mismos hechos propios, con una acción dada en su kit. | `mind:<herramienta>`. |
| Acto propio del programa (`own`) | Solo hechos de la herramienta de su objeto; sin herramienta, ningún hecho. | Quien actúa. |
| Pieza del core `identities`, con administración | Hechos de la casa; `kit-set` se valida antes de escribir. | Quien actúa. |
| Pieza del core sobre `identities/<actor>` | Su propia `scene` o `named`, también sin administrar. | Quien actúa; `named.identity` coincide con él. |
| Actos que ofrece la casa y motor | Sus hechos de escena, preferencias, lectura, ejecución, avisos y reloj. | El autor que corresponde a cada acto de la casa. |

`facts` enumera los nombres del catálogo de programa que pertenecen a la herramienta. Omitirlo equivale a `[]`.
Dos herramientas no pueden declarar el mismo hecho, ni una declarar un nombre reservado para la casa.
La composición rechaza esos casos. Una pieza del core se reconoce por el identificador reservado `identities`,
con `identities: true`; no existe una marca pública que convierta otra herramienta en core.
La pieza se agrega al registro de herramientas de la casa. Sus objetos propios usan `identities/<actor>`.
No necesita un escritor alternativo: sus acciones devuelven efectos y pasan por la misma ejecución.
Empezar un acto de `identities` lo decide solo `allowedAct`, igual para la ejecución y para la fila apagada: quien
no administra puede únicamente `scene`, y sobre su propia fila. La autoridad de efectos admite además `named` propio
sobre sí, pero hoy ninguna acción de la pieza lo ofrece a quien no administra.

El lote devuelto se comprueba entero antes de escribir, también si el resultado dice rechazo, interrupción o
inconcluso. Un efecto de casa, ajeno a la herramienta o con otro autor rechaza el lote con
`Efecto no permitido · <tipo> · <motivo>`; no se escriben sus hechos ni su entrada de éxito.
El registro conserva el pedido, el inicio y el rechazo de la ejecución. Un acto anidado que ya terminó conserva
lo escrito; no se deshace el mundo exterior. Los comandos opacos que devuelve `context.credentials` siguen siendo
pedidos a la custodia: solo su préstamo original los reconoce; una copia de una entrada no tiene esa autoridad.

Un `kit-set` V2 exige titular presente (o mente de programa existente) y selecciones declaradas sin repeticiones.
Una selección positiva nombra un programa, una herramienta o una acción. La mente permanece en su propio programa;
quien administra no recibe recortes. Quitar la última acción conserva la pertenencia. La autoridad se vuelve a
leer al terminar una espera. Los hechos históricos siguen leyéndose con su alcance original, sin reescribirlos.

Un acto `own` no puede tener el mismo objeto y nombre que una acción declarada de una herramienta: falla al
componer, con ambos nombres. Se comprueba el puerto para cada identidad presente y también cada oferta que produce
al cambiar el estado; no hay una resolución por prioridad que habilite tapar una acción.

Al actualizar, cada herramienta que escribe hechos declara `facts`. Los actos de programa que daban herramientas,
kit o administración pasan a las acciones del core; una acción que necesita otra herramienta la ejecuta por
`context.execute`, con el mismo actor y sus permisos, o deja un hecho propio que las otras partes pueden leer.
La tienda de prueba declara los hechos de Ventas y Pagos; saldar escribe `sale-settled`, que ambas partes leen.

## Reacciones deterministas

Una reacción se declara en `Tool.reactions` con un id estable y `{ when: "tipo-de-aviso", act: "acción-propia" }`.
El motor entrega los datos del aviso como entrada a esa acción, sobre la herramienta que la declara. En este
contrato de la base esa herramienta identifica al programa y a su actor `mind:<id>`; el ensamblado de programas
con varias herramientas debe conservar ese dueño al adaptar la declaración. La suscripción no concede permisos:
la mente necesita el kit vigente de la acción. No requiere pensamiento ni carta de modelo.

El aviso confirmado agenda un acto posterior, sin heredar el proceso de quien lo produjo. Revocar al autor humano
del aviso no revoca a la mente; revocar la acción de la mente impide la marca. El ejecutor común comprueba presencia, destino, entrada, condiciones y
propiedad de efectos. El acto lleva el aviso como causa; los hechos de programa de la reacción llevan esa misma
causa directa y autor `mind:<id>`. La correlación entre acto, reacción y aviso queda en `act.data.reaction`.

Las reacciones usan acciones locales (`reach: "house"`). No reciben `context.execute`: la marca y el recibo de
finalización tienen que entrar juntos, sin escrituras anidadas adelantadas. Un rechazo no confirma efectos de
programa. Su motivo queda en `act-result`, en una entrada visible de Actividad «Reacción pendiente» y en
`tools.pendingReactions()`. Un defecto conserva además su diagnóstico habitual.

El par (id de herramienta e id de reacción, id del aviso) deduplica. El motor confirma los efectos y `act-result`
en una transacción; repetir la entrega o reabrir no repite una reacción aceptada. Reconstruir pliegues no ejecuta
acciones. Después de restaurar, el arranque recupera pendientes; también se reintenta al cambiar el kit o con
`tools.recoverReactions()`. Un aviso nuevo no reintenta los rechazos de avisos anteriores: conservan su motivo
visible hasta esa recuperación. Una falla de almacenamiento revierte marca y recibo. Si el aviso se revierte, tampoco
se ejecuta su trabajo diferido. Las acciones pendientes vuelven a comprobar el permiso al terminar una espera.

Al migrar, reemplazá `Tool.effects` por una acción propia y una declaración en `reactions`, y otorgá explícitamente
su kit a la mente. Una declaración vieja `effects` no se ejecuta y deja un diagnóstico de migración. Conservá los
ids de reacción entre versiones. Los hechos anteriores se leen intactos; un aviso histórico sin recibo de esta
reacción se considera pendiente, por lo que la acción debe comprobar también su correlación de negocio antes de
marcar. Los consumidores directos de `startTools` entregan `history` con el diario restaurado completo; tanto la
casa como la inspección de copias y el banco de pruebas usan esa misma entrada.

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
  `also.opens` propone valores iniciales válidos para sus campos: las comprobaciones derivadas los revisan
  sobre los estados de cada caso y las cosas de origen disponibles, incluso sin un caso `from`.
  Los valores iniciales escritos también deben pasar la validación del campo, incluida su precisión y `wrong`.
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
  La vista y el texto propios del programa también deben convertir los centavos al mostrarlos. La tienda de prueba
  usa `shownMoney(String(centavos), locale)` con el mismo `locale` de sus campos. Recibe una cadena de centavos
  enteros entre 0 y 9.999.999.999.999, sin ceros iniciales salvo `"0"`; rechaza cualquier otro valor con un
  error que muestra lo recibido, incluso una cadena vacía o espacios.
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
  «dígitos incompletos», el mínimo de caracteres, «texto con algo visible» si un texto libre no tiene nada que
  se vea, o el límite numérico. Mientras se escribe, un prefijo que
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
  lectura de pantalla o el pliegue escrito por el programa, incluidas las acciones de sus reacciones, el arranque,
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
   Una rama imposible del cuerpo lanza `new OutsideDefect(detalle)`, importado de `fields/program-call.ts`: el
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
- `secret: true` en un campo string garantiza la posición declarada por estructura: al escribir una acción o
  un hecho, esa posición lleva una referencia `secret:<UUID>`. Vale para vacío, una letra, cualquier largo,
  vocabulario y multilínea. La entrada original se valida antes de escribir hechos; al leer se admiten referencias
  aunque excedan el largo o patrón original. La apertura común `houseJournal` se usa en la casa viva,
  la comparación final de casos, la lectura de conservados, su renovación, las subidas y el mantenimiento.
  Dos escrituras del mismo valor reciben referencias distintas, también
  dentro de una acción y después de reiniciar. Las referencias ya escritas se conservan al releer.
- No hay búsqueda ni reemplazo de repeticiones literales. Un secreto «a» no altera «banana», «ana», los nombres
  del vocabulario ni los mensajes de la base. Una acción solo puede copiar o transformar la referencia recibida,
  incluso como nombre de propiedad, destino, resultado, error o entrada de otra acción. Lo enviado expresamente
  por un programa a un campo público sigue siendo público: la base no busca coincidencias con material privado.
- Se recorren objetos, listas, tuplas, opcionales y las ramas válidas de uniones. Si un contenedor marcado no
  coincide con el esquema, una posición secreta no es string o la unión marcada no resuelve, se omite **toda la
  entrada** como `[secret]`. Sus fragmentos se omiten en los diagnósticos sin ingresarlos a custodia. Los esquemas
  secretos no soportados fallan con `E-SECRET-SCHEMA`. `secretInput: false` no desactiva una marca.
  `ToolAct.secretInputs` y `secretLimits.minLength` salieron del contrato: no tenían efecto. Usá el esquema.
- La base comprueba las restricciones del material y lo sustituye **antes** de normalización, borrador,
  condiciones, validadores, confirmación, motivos de freno y ejecución. Esos callbacks reciben referencias.
  Los esquemas de ejecución validan referencias en esas posiciones; largo y patrón originales se aplican al
  material en el ingreso. Un texto escrito que parece `secret:<UUID>` es material nuevo, nunca autorización.
- La pregunta secreta pertenece a la base: oculta teclas y pegados con marcas, conserva espacios y varios
  renglones y muestra puntos al volver o confirmar. Al Enter, un secreto inválido dice «falta completar»,
  «mínimo N caracteres», «máximo N caracteres» o «formato inválido», calculado por largo y esquema sin generar
  referencias ni repetir el material. Un opcional vacío avanza. El editor secreto no tiene tope de ingreso:
  conserva entero lo pegado para no cortar una credencial en silencio; el máximo del esquema impide avanzar y
  se explica al Enter. Se puede borrar y corregir sin volver a pegar.
  `holding` recibe la referencia; si necesitás comprobar
  contenido, hacelo en un adaptador declarado. Antes de ejecutar, las referencias de preguntas son provisionales
  en memoria y no resuelven custodia. Cancelar o cerrar no deja material en disco. Solo `submit` arma un
  traspaso privado de un uso al motor; `input`, condiciones y confirmaciones nunca llevan ese traspaso.
- Un registro conservado con credenciales abre en **modo de inspección**, como evidencia de prueba.
  Se recorre lo que no usa credenciales ni adaptadores. Si una acción ofrecida llega a un adaptador o intenta usar,
  capturar, reemplazar o liberar una credencial, se corta esa rama y se cuenta como «no recorrible en inspección».
  El informe da la cantidad de ramas cortadas, con acción y motivo, aunque ninguna acción pueda completarse.
  Se copia solo la evidencia cerrada del registro a una carpeta temporal; no se abre el archivo de secretos, ningún proveedor de llaves
  ni el llavero. Los lotes se leen como hechos con referencias y se comprueba su forma, **no su autenticación
  contra la llave del registro original**: esa llave no forma parte de la evidencia conservada.
  Este modo no abre una casa viva: no es una opción de `startHouse`, trabaja únicamente sobre una copia desechable
  y no habilita material. Esos intentos lanzan `InspectionUnavailable`, con código `E-CUSTODY-DENIED` y motivo;
  el recorrido reconoce la identidad del error, nunca su texto. Cualquier otra falla de una acción sigue haciendo
  fallar la comprobación. Las fábricas de adaptadores no se abren. Leer referencias vigentes y su revisión sí se permite.
  La casa viva sigue exigiendo proveedor, material, autenticación y ancla. La copia temporal se borra al terminar,
  también si falla la apertura o el recorrido; no se crean auxiliares junto a la evidencia original.
- `programChecks` deriva una comprobación por acción secreta, ejecuta todos sus casos y observa la frontera
  real. Cada posición, opcional, elemento de lista y rama necesita al menos un caso ejecutado con referencia;
  una posición sin cobertura falla. Retirar la sustitución hace fallar el centinela de la compuerta.
- Los plegados en memoria y guardados conservan las referencias de los hechos. La invalidación de plegados de
  versiones anteriores depende de la versión de su formato, fuera de esta protección. Al abrir, la vigilancia y
  restauración de los plegados preceden a cualquier limpieza de la custodia: recuperar material huérfano conserva
  los pares de estado y reloj de otras identidades de la misma versión y no avisa un cambio de cálculo inexistente.
  El mantenimiento con la casa cerrada agrega sin restaurar: aceptar, reintentar, adoptar y descartar dejan todos
  los plegados guardados intactos y no emiten avisos. La próxima apertura los reutiliza y pliega la cola pendiente.
- Al abrir sin marca, o con una marca válida de versión 1, la base revisa acciones **y hechos del programa** con
  los esquemas actuales, antes de abrir la bóveda, restaurar plegados o agregar un arranque. Un valor en una posición
  secreta impide abrir: `E-SECRET-HISTORY` nombra acción o tipo de hecho, posición y número de hecho, nunca el valor.
  No modifica los bytes del registro ni de la bóveda. La conexión de lectura SQLite puede crear los auxiliares
  `journal.sqlite-shm` (índice compartido) y `journal.sqlite-wal` vacío; eso no agrega hechos ni cambia la bóveda.
- Ventana pendiente de la revisión histórica (H4): hoy se revisa con un lector antes de tomar la exclusión de
  escritor. Si una versión anterior escribe material en claro y cierra justo entre esa revisión y la adquisición,
  la nueva puede marcar versión 2 sin haber visto ese último hecho; las aperturas siguientes omiten la revisión.
  La exclusión posterior no hace segura esa ventana. Hasta cerrar este punto, detener la versión anterior antes de
  abrir la nueva sobre la misma casa. Falta mover la revisión bajo la exclusión o volver a verificar antes de marcar,
  conservando el rechazo sin modificaciones de la historia. Este paso documenta la ventana; no la corrige.
- Si no encuentra valores deja una marca versión 2: `reviewed` cuenta acciones revisadas, `reviewedFacts` hechos
  del programa revisados y `unreviewable` acciones sin declaración disponible. Lo no revisable no frena la apertura
  ni se certifica limpio. Una casa nueva empieza con las tres cuentas en cero. Una marca ilegible o de formato
  desconocido falla con `E-SECRET-PROTECTION`, que nombra el archivo sin mostrar su contenido.
- Resolver una declaración no filtra toda la actividad salvo que el callback del programa consulte `entries`;
  esa vista se calcula una vez por resolución. La revisión pasa una vez por los hechos; el costo de los plegados
  y callbacks que aporta un programa depende de ese programa.
- Al actualizar, quitá las declaraciones sin efecto, mantené las marcas de esquema y aceptá referencias en los
  plegados. Tratá el rechazo histórico sin escribir sobre el registro. Las marcas v1 se revisan otra vez porque
  no incluían los hechos del programa. No se recuperan esquemas desaparecidos ni se certifican datos no declarados.
- El ingreso por acciones llega como texto y esa cadena original no puede ponerse en cero. El ingreso de acciones usa la sesión de custodia de la acción: vincular conserva su material; rechazo,
  borrador o final sin vínculo libera el provisional al cerrar el préstamo. Las escrituras directas antiguas
  por el bus conservan la retención para adopción explícita. No se deduplican posiciones por su valor.

## Hospedar una casa en la nube

La composición del programa abre una sola casa con `startCloudHouse(programa, carpeta, entorno, variable)` de
`src/runtime/cloud-house.ts`. `programa` contiene las opciones habituales de `startHouse`, incluidos `by`,
`creation`, vocabulario, registro, cálculos y adaptadores; la función compone `secretKeys` con la raíz recibida.
Quien hospeda proporciona una variable de **64 caracteres hexadecimales**, exactamente 32 bytes, y conserva
esa misma raíz para las reaperturas. El programa entrega el entorno explícitamente: ninguna función de llaves
lee `process.env` por su cuenta. Una variable ausente, vacía o inválida impide abrir y el error nombra solo
la variable, sin su valor.

```ts
import { startCloudHouse } from "./src/runtime/cloud-house.ts";
import { environmentDoorKeys } from "./src/doors/socket/peers/environment-door-keys.ts";

const llaves = environmentDoorKeys(process.env, [
  { identity: "ana", door: "terminal", variable: "ANA_TERMINAL_KEY" },
  { identity: "ana", door: "agente", variable: "ANA_AGENTE_KEY" },
]);
const casa = startCloudHouse(programa, carpeta, process.env, "HOUSE_ROOT_KEY");
```

`llaves` tiene el contrato existente `ReadonlyMap<string, DoorKey>`: cada llave acredita la identidad y la
puerta declaradas por el programa. Cada variable contiene al menos 32 bytes, como hexadecimal de largo par
(al menos 64 caracteres) o base64url canónico sin relleno (al menos 43). Los textos formados solo por dígitos
hexadecimales de largo par y al menos 64 caracteres se interpretan como hexadecimal; los demás se validan
como base64url. Las llaves repetidas se rechazan incluso si cambian mayúsculas
o codificación; el error nombra la variable repetida. La autenticación de cada puerta sigue comprobando que
la identidad pertenezca a la casa. La declaración y la raíz pertenecen a la composición confiable.

Después de autenticar, la composición conecta esa identidad a `casa.ports(identidad, { recentLines: 20 })`.
Son los `HousePorts` existentes para leer, observar y actuar. Ni la casa devuelta ni esos puertos entregan
`close`, `stop`, diario, custodia o proveedor. Cerrar una conexión no cierra la casa. El proceso sigue vivo aun
sin conexiones ni despertares pendientes; quien hospeda lo termina con SIGTERM o SIGINT. Esa salida cierra
los recursos y borra la copia de la raíz. Una apertura fallida también la borra. No se modifica la apertura
local ni el proveedor de macOS; esta entrada no instala ni publica una puerta de red.

`RootHouseKeys(raíz, carpeta)` de `src/keychain/cloud/root-house-keys.ts` también sirve a la composición que
necesita el proveedor explícito. Copia los 32 bytes recibidos; quien lo creó borra su entrada y llama `dispose()`
cuando ya no queda ningún usuario de custodia. Cada préstamo deriva 32 bytes con HKDF-SHA256, sal fija
`desert.house-custody.hkdf.v1` e `info` igual al nombre de cuenta. Cada llamada entrega un búfer nuevo que
la custodia borra después del uso. `environmentRootKey(entorno, nombre)` devuelve bytes cuya propiedad pasa
al llamador. Las cadenas originales del entorno no se pueden poner en cero; las llaves de puerta permanecen
como cadenas en el mapa que exige su contrato. Los búferes temporales decodificados de las puertas sí se borran.

`custody-keys.json`, dentro de la carpeta, guarda únicamente versión, nombres de cuentas y cabezas autenticadas.
Se reemplaza mediante un temporal con modo 0600, sincronización y renombre; no guarda raíz, llaves derivadas
ni material de custodia. Se relee en cada operación: otra instancia del proveedor ve lo confirmado. Un documento
dañado falla sin reemplazarse; el escritor único sigue siendo el de la casa. Una cuenta ausente no se deriva
con `create: false`. Olvidar poda la cuenta; olvidar la casa retira también su ancla y conserva las otras casas.

**Límite aceptado para nube:** las cabezas están en el mismo disco que el diario. Retroceder solo el diario
se detecta, pero restaurar juntos el diario y sus metadatos no se detecta. El paso 5 revisa esta diferencia con
macOS. Además, conservar la raíz permite volver a derivar una cuenta conocida: olvidar su presencia no equivale
al borrado criptográfico de una llave independiente del llavero. La copia del disco sola no trae la raíz;
recuperar una casa requiere su raíz original y sus metadatos. Este paso no implementa rotación de la raíz.

## Custodia de credenciales · contrato de memoria, disco y cortes

Un programa sin posiciones secretas y una casa sin material abre sin proveedor.

Contrato de la custodia, incluida la aceptación y el mantenimiento con la casa cerrada. `Kregistro` solo autentica el registro y los sobres cifrados;
`Ksecreto(ref)` cifra exclusivamente ese secreto. Cada llave es un elemento independiente del proveedor externo.
El proveedor de macOS guarda además el ancla `(cantidad de renglones, último autenticador)` fuera de la carpeta,
en un elemento propio de 81 bytes; la lista pública de cuentas vive en otro elemento. El proveedor de nube
guarda esos metadatos en la carpeta, con el límite de restauración completa explicado abajo.
Un agregado es una escritura atómica: una fila o un lote completo con tamaño e índice autenticados.

| Operación | En claro en el proceso y duración | Disco de la casa | Llavero | Si el proceso muere |
|---|---|---|---|---|
| Ingresar | Búfer recibido y Ksecreto solo durante cifrado; copia prestada se borra al terminar. Kregistro solo durante autenticación. | Intención con referencia antes de crear la llave; luego sobre AES-GCM autenticado, sin autoridad. | Se crea Ksecreto independiente; Kregistro y ancla inicial si es el primer ingreso. | Antes de intención no hay nada; entre intención, creación y sobre queda provisional que se purga al abrir. Nunca se inventa llave para un sobre existente. |
| Vincular | Ningún secreto; Kregistro mientras se verifica y firma. | Un agregado autenticado da autoridad a referencias presentes. | Ancla avanza después del commit; si falla, queda `anchorPending` a la vista sin rechazar lo escrito. | Antes del commit no hay vínculo; después del commit y antes del ancla se admite exactamente un agregado íntegro y se reancla. |
| Usar | Solo los secretos pedidos en búferes durante el callback; cada llave se borra apenas termina de descifrar. Los materiales se ponen en cero al resolver, rechazar o fallar la preparación parcial. Kregistro solo durante verificación. | Reserva en memoria; sin copia en claro. | Se piden únicamente las llaves de las referencias usadas, sin caché. | El uso externo puede haber ocurrido; no se reintenta automáticamente. No quedan reservas tras reiniciar. |
| Reemplazar | Ningún secreto; Kregistro transitoria. Un uso ya empezado conserva sus búferes hasta terminar. | Nueva revisión atómica; la anterior pierde autoridad. | Ancla después del commit; llaves anteriores hasta su purga. | Rollback conserva la revisión anterior; commit conserva la nueva. Un agregado por delante se recupera; el material anterior sin raíces se purga. |
| Liberar | Ningún secreto; Kregistro transitoria. | Revocación durable, luego pendiente de purga. | Ancla de revocación; llave del secreto hasta purga. | La revocación no se deshace por falla de borrado. La acción devuelve su resultado con `cleanupPending: true`; la API directa de borrado comunica `E-CUSTODY-CLEANUP`. |
| Purgar | Ningún secreto ni llave de secreto; Kregistro durante marcas. | Pendiente antes de borrar; eliminación segura con diario truncado; recibo al completar. | Se elimina la llave de esa referencia y después se poda su cuenta del índice, antes del recibo. | Antes/después de cada eliminación se reintenta idempotentemente; nunca se declara terminado antes de borrar disco y llave. |
| Adoptar bóveda anterior en claro | Una fila por vez leída como BLOB; búfer y llave propia durante cifrado y comparación, borrados en finally. | Conserva IDs; original hasta verificar todas las copias; retiro seguro y compactación recuperables. | Una llave por fila adoptada. | Intención sin sobre se retoma; sobre existente se compara sin regenerar llave. Tabla vieja vacía significa compactación pendiente. Sin proveedor y con filas falla antes de escribir. |
| Adoptar retención | Ningún secreto; Kregistro transitoria. | Vínculo con dueño y propósito explícitos; se retira la retención anterior. | Ancla del vínculo. | Antes del commit sigue retenido sin autoridad; después el vínculo manda aunque falte retirar la marca de retención. |
| Abrir | Ningún secreto ni llave de secreto. Kregistro solo al verificar registro y sobres; no queda entre operaciones. | Verifica primero la cadena y el ancla, después sobres y presencia; recoge provisionales y reintenta pendientes. | Lee Kregistro/ancla; consulta presencia sin extraer Ksecreto. | Fallar integridad impide usar; fallar un borrado deja pendiente visible y permite abrir. Un registro recortado/restaurado falla con indicación de aceptación explícita. |
| Aceptar copia restaurada | Ningún secreto; Kregistro mientras verifica cadena y sobres y autentica las marcas. | Exige la cabeza revisada; marca `credential-unusable` y aumenta la revisión de cada vínculo sin llave; escribe pendientes y recibos de purga del material sin llave. | Reancla al terminar, incluso si faltaba el ancla. Nunca recrea llaves de secretos. | Un corte se retoma revisando y aceptando la nueva cabeza durable; no repite inutilizaciones ni recibos. Después abre, conserva los vínculos con llave y muestra cualquier borrado pendiente. |
| Cerrar | No hay llaves retenidas; los búferes de usos en curso se borran inmediatamente al cerrar y nuevamente al terminar; esos usos rechazan con `E-CUSTODY-DENIED`, aunque el adaptador devuelva un resultado. | Cierra bloqueo; provisionales se recogen al próximo inicio. | Sin cambios. | Equivale a un cierre interrumpido: se reconstruye de lo durable. |
| Olvidar casa | Ningún secreto; solo identificación pública. | No se borra ni cambia la carpeta. | Enumera cuentas propias del índice, filas e historia de la carpeta; borra esas llaves, después Kregistro, ancla e índice; reintento idempotente. | Un olvido parcial ya puede dejar material ilegible; se continúa con la misma identidad. Antes de ejecutarlo se advierte que también quedan ilegibles otras copias de esa casa en esta máquina. |

La apertura sin descifrado es la del formato v2. Si encuentra la bóveda anterior en claro, el primer ingreso
ejecuta la adopción de la tabla: cifra y compara una fila por vez antes de retirar el original. Esa comparación
no se repite al abrir materiales ya adoptados.

Durante un uso, el secreto en uso y su llave están en la memoria del proceso; un programa de la misma cuenta de
usuario puede pedirle al llavero lo mismo que la custodia. La custodia no conserva llaves entre usos ni convierte
material o llaves a texto. Los búferes que controla se ponen en cero; no promete borrar copias que cree un adaptador,
memoria interna del motor criptográfico, páginas del sistema operativo ni texto previo del editor o de un proveedor
antiguo. El adaptador confiable recibe bytes y es responsable de sus propias copias. Comprometer una Ksecreto no
permite descifrar otra referencia. Comprometer Kregistro no permite descifrar ninguna. Pero con esa llave y escritura en la carpeta se puede hacer usar cualquier secreto a cualquier herramienta. Kregistro está en la memoria del proceso durante cada verificación. Atar cada vínculo también a la llave del secreto chocaría con abrir sin descifrar y queda pendiente de decisión del dueño.

La identidad aleatoria de la casa persiste al mover, renombrar, cambiar mayúsculas o acceder por enlace. Copiar
la carpeta conserva esa identidad; solo una copia por máquina puede escribir; en otra máquina hay que trasladar las llaves y el ancla al proveedor. Una casa
nueva en una ruta reutilizada recibe otra identidad. Una llave ausente nunca se regenera para material ya cifrado.
El formato experimental anterior con una llave por casa nunca se unió ni guardó datos reales: se rechaza, no se
convierte. Sí se adopta la bóveda en claro de la base de partida, con una llave por secreto y sin cambiar IDs.

El registro autentica casa, posición, contenido y autenticador anterior. El ancla externa detecta renglones quitados
y copias viejas, incluso un registro vacío. Solo se recupera automáticamente un agregado completo por delante;
ni dos agregados, ni una cabeza distinta, ni un prefijo corto son aceptados. La aceptación de una restauración es
una operación explícita de composición sin pantalla. No recupera llaves purgadas ni garantiza leer un respaldo
cuyo material ya fue eliminado del llavero. Los cortes admitidos son: antes/después de intención; alta de cuenta
en el índice externo; creación de llave;
guardado de sobre; commit del agregado; actualización del ancla; marca pendiente; eliminación física; eliminación
de llave; recibo; retiro y compactación del legado; cada eliminación del olvido (secretos, registro, ancla e índice).
Cada uno conserva el paso durable anterior para reintentar. Las escrituras del índice y del ancla se releen antes de darlas por confirmadas. El corte entre borrar la llave
y podar el índice conserva una cuenta sobrante que el reintento elimina. Una restauración registra primero
los vínculos inutilizables y el pendiente; elimina material y llave, escribe recibos y recién entonces reancla.
Si falla el borrado físico, el pendiente queda visible y la casa puede abrir con ese vínculo inutilizable.
En una apertura normal sin vuelta atrás, una llave ausente sigue siendo una falla: no se acepta sola.

Lo retenido tiene tres raíces: vínculo vigente hasta liberar/reemplazar; retención explícita por propósito hasta
`releaseRetention`; ingreso anterior sin dueño hasta `adopt` o `discardLegacy`. Un provisional dura la sesión;
al cancelar o reiniciar se recoge. Un uso iniciado demora la purga hasta terminar. El historial por sí solo no
retiene material. Las escrituras directas antiguas del bus usan retención sin dueño: el programa debe decidir
adopción o descarte; no hay vencimiento inferido. Los pendientes se ven en `facts()`; `cleanupPending()` informa fallas de mantenimiento aun si no se pudo escribir su recibo. Se reintentan con `collect()`
y al abrir. Un borrado ajeno fallido nunca tapa el resultado de un adaptador ni impide abrir; quien pidió borrar
recibe `E-CUSTODY-CLEANUP` por la API directa. Una acción conserva su resultado y añade `cleanupPending: true`,
también cuando otra acción la ejecuta; el aviso no agrega material ni llaves al resultado. No se anuncian borradas las copias fuera de la carpeta o del proveedor actual.

Si el ancla falla después del commit, la acción conserva estado, efectos y resultado y añade `anchorPending: true`,
también en acciones anidadas. `SecretCustody.anchorPending()` y el estado del mantenimiento permiten consultarlo.
La próxima lectura o apertura compara el ancla y vuelve a intentar escribirla. La advertencia de la acción conserva
el aviso aunque el cierre del préstamo ya haya podido reanclar. Mientras no se pueda anclar, una segunda escritura
falla antes de agregar otro lote; leer lo confirmado sigue permitido si se puede comprobar el ancla anterior.
La purga espera a que su marca pendiente quede anclada. Ninguna falla posterior del ancla se presenta como rechazo
de lo ya confirmado. Si tampoco se puede leer el llavero, la consulta falla con `E-CUSTODY-KEY`; el pendiente sigue
consultable sin acceder al proveedor.

El proveedor se exige al componer posiciones secretas y al ingresar por una acción ofrecida más tarde. La interfaz
entrega copias de llaves, consulta presencia sin extraerlas y lee/escribe anclas. El comando macOS es inyectado,
recibe argumentos públicos y entrada/salida en búferes separados, con tiempo máximo obligatorio. Nunca se pasa
una llave por argumentos, nunca se usa shell y los errores no llevan línea, entrada, salida ni causa originales.
Las pruebas usan exclusivamente comandos falsos. No hay proveedor real implícito.

La composición confiable acredita persona, herramienta, objeto y propósito antes de abrir una sesión. Una acción
recibe referencias y efectos de vínculo; el adaptador declarado recibe `capture(bytes)` y `use(refs, callback)`.
El callback recibe búferes prestados, no strings, y no debe devolverlos como resultado público. `revision(slot)`
conserva la tumba después de liberar; reemplazar exige esa revisión, incluso para reconectar. Un lote rechazado
no cambia vínculos; la recolección espera al commit. Ni la custodia ni la bóveda exponen llaves con JSON o inspect.

### Subir a este contrato

- `capture`, `keep`, `importLegacy` y el resolvedor del adaptador reciben `Uint8Array`; transfieren el búfer y lo
  ponen en cero aun si falla el ingreso. `use` entrega `Readonly<Record<string, Uint8Array>>` prestado hasta el
  final del callback. Leé archivos como bytes; si una biblioteca obliga a crear texto, esa copia pertenece al adaptador.
- `HouseKeyProvider.key(cuenta, crear)` usa la identidad de casa para Kregistro y `casa-secret-UUID` para Ksecreto.
  Sumá `has(cuenta)` sin extraer la llave, `head(casa)`, `anchor(casa, cabeza)` durable e idempotente y
  `forgetHouse(casa, cuentasConocidas?)`, que combina las cuentas propias del índice con las de la carpeta.
  `forget(cuenta)` elimina una llave y después poda su cuenta; no reemplaza olvidar toda la casa.
- `MacOSHouseKeys` usa servicios v3: llaves, índice y ancla separados. La versión v2 del llavero nunca se usó
  con datos de nadie: no se convierte. El sobre cifrado sigue siendo v2. El índice contiene cuentas pendientes
  o vivas y se poda después de borrar cada llave; los nombres históricos permanecen solo en el registro.
  El índice es público: se escribe por argumentos, codificado en hexadecimal, nunca por la entrada interactiva.
  Tiene un máximo de 120.000 bytes codificados; excederlo falla antes de escribir índice o llave nueva.
  Las cuentas admiten hasta 128 caracteres; toda línea interactiva se limita a 4.095 bytes antes del salto.
  El ancla tiene 81 bytes constantes (contador hexadecimal de 16 dígitos, separador y autenticador de 64).
  El ejecutor recibe `{ timeout: 5000 }`, entrada y salida en búferes. `systemKeychainCommand` es optativo;
  nunca se elige solo. `-U` se usa únicamente para metadata pública, nunca para sobrescribir llaves.
- La casa comprueba su exclusión antes de pasar una emisión a custodia y antes de cada operación de una sesión
  de custodia, incluidos los adaptadores ya abiertos. Si el auxiliar fue borrado o reemplazado, falla con
  `WRITER_LEASE_LOST` antes de retener material o crear su llave; cerrar sigue liberando los recursos.
  Un `CredentialLedger` propio puede ofrecer `check()` para imponer la exclusión de su registro antes de operar.
  `startHouse` y `maintainHouseCustody` lo conectan; la custodia independiente conserva su contrato anterior.
- Los `CredentialLedger` propios deben implementar `appendBatch` atómico. Si participan de una transacción externa,
  `pending()` dice que todavía no confirmó y `afterCommit` se ejecuta solo tras el commit, nunca tras rollback.
  `startHouse` ya lo conecta. Tanto acciones como `bus.together` de un arranque reúnen los vínculos en un solo
  `custodyBatch` reservado; no lo fabriques. Un segundo agregado dentro de una transacción abierta da
  `E-CUSTODY-TRANSACTION` antes del commit. La API directa no purga dentro de una transacción: reuní confirmaciones
  con `deferCleanup` dentro de la transacción del registro y terminá el préstamo después del commit.
  Un registro propio puede ofrecer `factsAfter(count)` solo bajo exclusión de escritor y con prefijo inmutable;
  devuelve las filas posteriores a esa cantidad, sin omitir ni alterar ninguna. Sin ese método se verifica todo.
  Al cerrar se descarta el punto verificado; la apertura siguiente vuelve a comprobar la historia completa.
- Con una casa de `startHouse`, usá `maintainHouseCustody(home, options, request)` desde la composición, con
  la casa cerrada. Toma la exclusión del registro del motor, conecta sus hechos de custodia y cierra ambos recursos
  al terminar. No ejecuta herramientas, adaptadores, arranques, proyecciones ni reloj. No es un puerto de herramientas.
  Agrega sin restaurar ni borrar plegados guardados y sin avisos de reconstrucción.
  `request.operation` permite `review`, `accept`, `status`, `retry`, `adopt`, `discard` y `forget`.
  `review` verifica sin cambiar el ancla y devuelve `head`, vínculos, referencias sin llave y vínculos inutilizables;
  `accept` exige esa `head` con cantidad y autenticador. Una cabeza distinta da `E-CUSTODY-CONFLICT` sin escribir.
  El resultado nombra los vínculos inutilizables por persona, herramienta, objeto, slot, revisión y referencias.
  `status` enumera retenciones, marcas pendientes y `pendingRefs`, incluso si falló escribir la marca, sin reintentar; `retry` reintenta y devuelve lo que sigue pendiente.
  `adopt` recibe `scope`, `slot`, `refs` y `expected`; `discard`, la `ref` retenida que se descarta.
  `forget` exige `acknowledgement` igual a `forgetWarning` de la revisión y devuelve `{ forgotten: true }`.
  Puede reintentarse aun después de perder llaves o el ancla, sin abrir la casa primero.
- Para custodia independiente, `SecretCustody.acceptRestoredCopy(file, casa, keys, head, ledger?)` también exige
  nombrar la cabeza. `maintainCustody` ofrece la misma revisión y mantenimiento para quien integra su propio registro.
  Aceptar no recupera llaves borradas. Con índice perdido o dañado, olvidar usa además filas e historia de la carpeta;
  descarta cuentas ajenas o malformadas del índice. Sin índice íntegro ni carpeta que enumere una cuenta, esa llave no es localizable:
  no se promete eliminar llaves que no aparecen en ninguna de las dos fuentes. No se toca otra casa.
- `finish(session)` es el cierre de mantenimiento del préstamo y conserva el resultado; `cancel`, `collect`,
  `release`, `replace`, `discardLegacy` y `releaseRetention` comunican las fallas de borrado a quien los pidió.

Costo medido con el comando falso, una referencia vigente y sin pendientes: una firma por `startHouse` hace
**4 idas al llavero y 2 lecturas incrementales del diario**, tanto con 0 como con 60 o 600 rotaciones posteriores
al vínculo inicial. Una lectura fija la vista inicial de credenciales y otra autoriza el uso: cada una compara el
ancla. Las otras dos idas verifican el sobre con Kregistro y descifran con Ksecreto. La API directa de uso cuesta
**3 idas** y una lectura incremental, porque no pide además la vista de la acción. Repetir una referencia en varios
campos no vuelve a descifrarla. No hay caché de llaves.

La llave del registro se pide una vez por pasada de verificación y se borra al terminar, también si falla una fila.
Dentro de una operación sincrónica se comparte la lectura verificada, nunca la llave. Con ambos registros tomados
en exclusiva se conservan solo hechos públicos, cantidad verificada, autenticador y cursor del diario; se verifican
únicamente las filas nuevas y se sigue comparando el ancla. La vista inicial de una acción se fija al empezar; su
primera consulta realiza la verificación. Una acción que no toca secretos, incluso rechazada, no consulta el
llavero ni recorre el diario de custodia. La limpieza se ejecuta cuando hubo ingreso o cambios, al terminar un uso
que demoró una purga, explícitamente o al abrir.

La prueba de casa cuenta todas las llamadas a `replay`, incluidas las de apertura del motor. Cada celda indica
**idas al llavero / lecturas del diario**; «0 rotaciones» ya tiene su primer vínculo:

| Rotaciones | Abrir | Acto sin secretos | Acto rechazado sin secretos | Firma |
|---|---:|---:|---:|---:|
| 0 | 5 / 3 | 0 / 0 | 0 / 0 | 4 / 2 |
| 60 | 5 / 3 | 0 / 0 | 0 / 0 | 4 / 2 |
| 600 | 5 / 3 | 0 / 0 | 0 / 0 | 4 / 2 |

Abrir sigue leyendo y verificando toda la historia y los sobres vigentes: su trabajo total es proporcional a esos
renglones, aunque las idas al llavero no crezcan con las rotaciones de una sola referencia. Las lecturas posteriores
usan el cursor y no vuelven a traer la historia. La prueba cuenta además los renglones devueltos al firmar para
impedir que dos lecturas completas pasen por incrementales. Pendientes, retenciones y varias referencias suman
su trabajo propio. No se midieron tiempo, permisos ni diálogos del llavero real.

Con custodia independiente, una referencia vigente y sin pendientes, las invocaciones del comando falso son:

| Historia | Abrir | Usar | Aceptar la cabeza revisada | Olvidar |
|---|---:|---:|---:|---:|
| 1 vínculo, 1 cuenta creada | 5 | 3 | 8 | 5 |
| 10 ingresos, 28 renglones, 10 cuentas creadas | 5 | 3 | 8 | 14 |

Olvidar sigue costando `C + 4`, donde C es la unión de cuentas propias del índice, filas e historia, incluso las que
ya no existen: cada borrado ausente es idempotente. Aceptar material ausente agrega marcas y purgas; el mantenimiento
de la casa agrega su revisión de salida. Cada escritura individual del llavero conserva su límite de tamaño.

## Adaptadores declarados y referencias en las acciones (A01, paso 2)

`ActContext` tiene `ports` y `credentials`; no tiene `keys`, custodia ni resolvedor. `Tool.start` recibe
`ToolStartup`: esos mismos puertos públicos, `state`, `now`, `live`, `act` como su propia mente y un bus reducido
a `on`, `emit` y `together`. `emit` solo publica comandos originales de sus credenciales y despertares propios.
`act` no recibe autor y devuelve una promesa con estado y, cuando lo hay, motivo.
No recibe el objeto `Execution`. El tipo `KeyStore` anterior se adapta a un borde que entregue bytes antes de llamar a `importLegacyKeys`.

El programa declara `adapters` y `credentialSlots` en `Composition` o `HouseOptions`. Cada adaptador tiene
`methods` y `open(resolver)`. Cada método declara `input`, `output` y `permissions: { tools, slots, capture }`.
Declarar ingreso de material o slots exige también `secretKeys` antes de abrir recursos.
Los esquemas admitidos describen datos JSON; los objetos son cerrados, también los anidados. Se copian esquemas y
permisos al componer. La fábrica se abre para cada llamada, con un resolvedor limitado a esa operación; los métodos
no declarados no se publican. `resolver.capture` requiere permiso de ingreso y deja una referencia provisional;
`resolver.use` reserva el material de referencias autorizadas mientras termina su callback. Un resolvedor guardado
no funciona después de terminar la llamada. La acción recibe únicamente el resultado público validado.

Los métodos se llaman por `context.ports.nombre.metodo(entrada)` y devuelven promesas de datos públicos. Con
`noUncheckedIndexedAccess`, comprobá la existencia del adaptador y del método; el resultado es `unknown`, que el
programa puede comprobar con el esquema público. Las fallas salen como códigos cerrados: `E-ADAPTER-INPUT`,
`E-ADAPTER-OUTPUT`, `E-ADAPTER-DENIED`, `E-ADAPTER-FAILED` o, al componer, `E-ADAPTER-DECLARATION`.
Nunca cruzan el mensaje, causa ni traza originales. La confianza en el adaptador sigue siendo necesaria: un esquema
no demuestra que un string público no esconda una transformación del material.

`credentials.current(slot)` y `revision(slot)` leen la revisión tomada al abrir la acción o el arranque. Devuelven
referencias y números, nunca material. `replace` y `release` devuelven efectos: agregalos al `effects` del resultado
aceptado. El motor verifica alcance y revisión antes de confirmar. Un rechazo descarta esos efectos; una copia de
un efecto no lleva autoridad. Desde el arranque, se publican con su `bus.emit`. La revisión de un slot liberado no
vuelve a cero: usá `revision`, incluso cuando `current` no tenga credencial.

```ts
const refs = await importarConElAdaptador(context.ports);
return { status: "accepted", effects: [
  context.credentials.replace("firma", refs, context.credentials.revision("firma")),
] };
```

Una acción presta sus capacidades hasta terminar, incluso si rechaza, falla, propone un borrador o se interrumpe.
El arranque las presta hasta su cierre; su actor es `mind:<herramienta>` y su objeto es la propia herramienta.
Sus vínculos pertenecen a esa mente. Resolver material exige `holds`: la herramienta de la mente debe existir;
para una identidad, debe tener la herramienta en la casa. Un uso ya iniciado termina
con su versión; cerrar o revocar impide nuevos usos. Las referencias de otra casa, identidad u objeto no autorizan.

Al migrar: quitá `keys` de `startHouse`, `startTools` y los contextos de pruebas directas. Para una prueba directa
sin servicios, agregá `...noCapabilities`; está en `testing.ts`, junto con los tipos públicos y de composición.
`staged` usa un proveedor de casa en memoria propio de cada caso, conservado durante sus reaperturas. El lector
histórico sustituye las fábricas por operaciones indisponibles; no llama servicios reales.

La marca `secret: true` garantiza que los callbacks del programa reciben referencias y que solo un adaptador
que la composición declara puede cambiarlas por material. El ingreso, el editor y la custodia de la base sí
procesan el material. La marca de revisión histórica v2 tiene otro alcance: registra lo revisado con los esquemas
actuales y cuenta lo no revisable; no certifica toda la historia ni los datos públicos.

La ley 212 parte de la composición indicada por `desert.program` y sigue su grafo de imports, reexportaciones,
alias, imports dinámicos literales y tipos, también fuera de `src/`, en archivos de pruebas y en `.mts`, `.cts`
o `.tsx`. Todo archivo alcanzado que no sea la composición, un adaptador de `src/adapters/` o la frontera pública
revisada de la base se revisa como fuente de herramienta. Un JSON importado es dato; un archivo o dependencia que no se pueda revisar falla
cerrado; un import no literal también. Los imports públicos son nombrados según `tests/laws/secret-public-api.ts`;
`testing.ts` no habilita fábricas para herramientas. Un `import type` de un módulo no público se rechaza igual que un import de valor. Los alias vienen de `paths` y la resolución local de TypeScript.

Además rastrea el valor de la composición, incluso los retornos de funciones del programa, y cada elemento del
`registry` hasta el valor o fábrica que lo define. Admite arreglos literales, `as const`, `Object.freeze` de la
biblioteca y referencias a propiedades de objetos literales o a un `export default` literal de herramientas.
Rechaza herramientas definidas en la composición o un adaptador y registros calculados que no puede seguir,
como `Object.entries(...).map(...)` u `Object.fromEntries`. También admite alias y spreads de arreglos rastreables;
una fábrica que devuelve un parámetro falla cerrada. La ley no ejecuta la composición para descubrir valores.
La composición es confiable por diseño: si quien compone esconde una herramienta mediante una fábrica aparte que
devuelve una copia, una reasignación o un agregado posterior, la ley no la ve; es un acto de quien compone.
Una herramienta no puede importar custodia, fábrica, resolvedor ni composición, ni hacer I/O directo, leer entorno
o evaluar código por los caminos que esta regla reconoce. `Reflect` y `module` son capacidades del ambiente.
Toda lectura con clave calculada no literal se juzga igual: corchetes, desestructuración en una declaración,
asignación o parámetro. Lo que decide es el valor elegido: se rechaza si es invocable o construible, `any`,
`unknown`, `object`, `{}` o un genérico sin una cota que permita comprobarlo. El objeto del que se lee no puede
ser `any`, `unknown`, una función, un constructor de clase ni un objeto del ambiente.
Tener métodos no convierte un objeto en una función: se admiten fechas, mapas, conjuntos, expresiones regulares,
errores, promesas, bytes, instancias de clase y filas con métodos. También se admiten arreglos, tuplas, texto y
registros, sin exigir que todas sus propiedades sean datos. Si la clave es una unión de literales, solo cuentan
las propiedades que puede elegir; `v?.xs[i]` no agrega al tipo de `xs` el `null` del eslabón anterior.
La ley usa las declaraciones de tipos ya instaladas; no habilitan imports ni dependencias nuevas.
Siempre rechaza leer `constructor`, `__proto__` o `prototype`: con punto, corchetes, desestructuración o claves
conocidas por su texto, concatenación, alias o tipo literal. Esas propiedades permiten llegar a evaluar código.

Una conversión dentro de una fuente de herramienta no habilita el acceso: la ley sigue objeto y clave por alias,
asignaciones, desestructuración y llamadas a auxiliares, también importadas. Rechaza `as any`, `as never`, dobles
conversiones por `unknown` y otras aserciones de tipo en ese recorrido, incluso con clave literal. Conserva
`as const` y `satisfies`: no inventan un tipo incompatible. Las coerciones primitivas estándar no heredan
aserciones de sus argumentos; una aserción que conserva exactamente el tipo de esa coerción también se admite.
Esto se comprueba por la declaración de la biblioteca, no por el nombre: un homónimo local no obtiene la excepción.
El recorrido restante es conservador: considera las asignaciones
y los cuerpos de auxiliares, sin demostrar qué rama se ejecutará. La composición confiable mantiene su frontera.
El chequeo estricto de tipos ya frena accesos inválidos, exige estrechar `unknown` y contempla índices ausentes;
el lint y la ley 12 ya prohíben aserciones inseguras y el lint rechaza `any` explícito y sus usos inseguros.
La ley 212 agrega la comprobación del valor elegido, las claves prohibidas y el rastreo del origen convertido
al grafo alcanzado. Los caminos hacia `Function` que pasan por `any`, como `getOwnPropertyDescriptor` o
`getPrototypeOf`, quedan al lint: esta ley no los cierra por sí sola. El lint del programa tiene que cubrir
**todo** lo que la ley recorre, incluidos auxiliares fuera de `src/`, `.mts` y `.cts`. Los globs actuales de la
base no cubren `.mts` ni `.cts`; esa cobertura no está garantizada hoy. No reemplaza tipos ni lint.
La base también comprueba que una fábrica no devuelva el resolvedor anidado.

La composición es confiable: puede pasar custodia a una fábrica de herramienta; ese paso es su propio acto y la ley
no analiza el flujo de capacidades que decide entregar. Importar un `.js` sin tipos ya falla con el chequeo estricto
de tipos, sin `allowJs`; no se atribuye esa detección a esta ley. Las fuentes sin formato revisable también se rechazan.
Cada archivo se clasifica una sola vez por corrida. Cada lugar y regla producen un solo mensaje con posición
y una cadena de imports de ejemplo, aunque varias herramientas lleguen al mismo archivo.
La compuerta incluye esta ley una vez entre sus ocho partes (`tests/program/registration.ts`). Un paquete nuevo
requiere revisar su API y agregar una frontera explícita; instalarlo no alcanza. Quedan fuera del análisis el código
no alcanzado desde la composición, las mutaciones posteriores en ejecución y la intención de los adaptadores.

Esta ley frena el descuido y los caminos conocidos: es una regla de fuentes y contratos, no aislamiento de
JavaScript frente a código hostil o dependencias alteradas. No ejecuta claves arbitrarias ni prueba que los tipos
sean honestos en ejecución. No demuestra que el adaptador firme bien, autorice bien al destinatario ni que un string
público no codifique material privado. No borra copias externas, respaldos, memoria del proveedor ni páginas históricas del
disco. Restaurar una copia completa anterior puede revivir material revocado. Estas limitaciones siguen vigentes.

### Una llave de firma, de ingreso a desconexión

1. Componé un `HouseKeyProvider` con una llave por secreto y otra para el registro, conservadas fuera de la carpeta. Entregalo como
   `secretKeys`. Para pruebas usá `MemoryHouseKeys`; para el llavero, inyectá el ejecutor en la composición confiable.
2. Definí el objeto de la credencial con organización, ambiente y propósito. Declaralo en `credentialSlots` para
   la herramienta fiscal. La base no interpreta «homologación», «producción» ni CUIT: esos límites los fija el programa.
3. Declarar certificado y privada como strings `secret: true` hace que el editor de la base los oculte y conserve
   multilínea. Si la persona elige archivos, el adaptador los lee con un transporte explícito y devuelve referencias
   de `resolver.capture`; el método declara `capture: true`. Ninguna acción lee el archivo ni recibe sus bytes.
4. Declarar métodos de inspección y firma exige `input`, `output` JSON cerrado y permisos de herramienta, slots e
   ingreso. Solo `open(resolver)` usa `resolver.use(refs, material => ...)`. Parseo, correspondencia y firma viven ahí.
   El resultado devuelve validez y metadatos públicos; nunca privada, certificados completos, tickets o errores crudos.
5. En la misma acción, inspeccioná el candidato por `context.ports`, usando referencias. Si falla, rechazá: la
   sesión libera sus provisionales y conserva el vínculo anterior. Si aceptás, incluí el efecto
   `credentials.replace(slot, refs, credentials.revision(slot))`; el par queda como una versión en el lote durable.
   No guardes una referencia provisional para usarla en otra acción sin vincularla. Una confirmación en otra acción
   necesita un slot de candidato y su posterior liberación explícita.
6. Para firmar, tomá `credentials.current(slot)` y llamá al puerto con sus referencias. Verificá permisos fiscales,
   representado, ambiente y servicio en el adaptador. Una inspección local válida no acredita autorización del fisco.
   La base no implementa ARCA ni hace durable por sí sola un envío externo: prepará y reconciliá esos pedidos aparte.
7. Para renovar, repetí ingreso e inspección y reemplazá contra la revisión observada. Dos reemplazos no se pisan;
   el que perdió debe volver a leer. Una firma iniciada termina con su versión; la siguiente usa la nueva. El programa
   invalida sus tickets y cachés asociados y conserva el contexto de los pedidos pendientes.
8. Para desconectar, aceptá el efecto `credentials.release(slot, credentials.revision(slot))`, incluidos slots de
   candidatos. Pausá emisiones e invalidá tickets del programa. Nuevos usos quedan denegados; la limpieza fallida queda
   pendiente y se retoma al abrir. No anuncies que se borraron copias que estén fuera de la casa.
9. Probá con marcadores inventados, nunca credenciales reales: permisos, referencias ajenas, errores de parser,
   reemplazos en paralelo, reinicio, rechazo, cancelación y desconexión durante firma. Los casos declarados deben
   cubrir cada posición secreta, opcional, lista y rama; la compuerta observa qué recibe cada acción.

### Probar el adaptador y subir desde la base anterior

`testing.ts` exporta `adapterTest`, `MemoryHouseKeys`, `HouseKeyProvider`, `CredentialScope`, los tipos de adaptador,
`SecretRef`, las operaciones públicas y `noCapabilities`. `adapterTest(composition, scope, materialSintetico)` devuelve
`refs`, `ports` y `close()`: abre una custodia temporal cifrada con proveedor en memoria y atraviesa la declaración,
los permisos, los esquemas y la revocación reales. Siempre cerralo en `finally`. Inyectá transportes falsos al adaptador:
el ayudante no bloquea la red de código que vos le entregues. Para lotes, vínculos y reapertura usá `startHouse` con
`MemoryHouseKeys`, o los casos de `programChecks`; el ayudante no simula esos lotes.

Al actualizar un programa:
- El estado recibido, incluido el de cada cálculo, es de solo lectura hasta el fondo. No lo uses como memoria del
  proceso ni cambies mapas, listas, conjuntos u objetos recibidos. Para calcular, devolvé valores nuevos; para
  cambiar la casa, pedí una acción autorizada. Las conversiones de tipo y `Object.assign` también fallan al correr.
- Las vistas usan proxies: `structuredClone` o serializadores nativos sobre la vista recibida no son una copia
  pública del estado. Armá los datos propios que necesitás con sus campos, listas y mapas. La base sí convierte
  internamente las partes de estado devueltas como datos de un resultado antes de guardarlas.

- Los conservados con credenciales se inspeccionan sin proveedor ni archivo de secretos; no copies llaves ni material.
  Sus lotes no se autentican contra la llave original. Se recorre lo que no usa credenciales ni adaptadores;
  las demás ramas se cortan y el informe las cuenta con acción y motivo. Conservá las acciones del programa:
  no hace falta retirarlas ni inventarles causas `outside`. Un error ajeno a la inspección sigue fallando.
  Renovar sigue comprobando los plegados y no abre custodia.
- Para la ley 212, separá cada herramienta de composición y adaptadores, declarala en un registro rastreable y
  revisá también los módulos importados fuera de `src/` o desde pruebas. Quitá `Reflect` y `module` de las herramientas.
  Conservá las lecturas calculadas cuyo valor elegido no sea invocable ni opaco, incluso al desestructurar;
  tipá y estrechá lo desconocido. Los métodos de otras propiedades no obligan a reescribir una tabla.
  Separá las tablas de funciones, quitá accesos a `constructor`, `__proto__` y `prototype`, y reemplazá las
  conversiones de objeto o clave por comprobaciones de tipos. Cubrí con lint todo el grafo alcanzado, también
  `.mts`, `.cts` y auxiliares fuera de `src/`: los caminos con `any` hacia `Function` dependen de ese control.
- Quitá `keys` de opciones, contextos y arranques; `KeyStore` solo queda para adopción explícita. Cambiá `Tool.start`
  a `ToolStartup` y las pruebas directas a `noCapabilities` cuando no necesiten servicios. El arranque no accede al registro ni recibe `Execution`: pide acciones con `act`, siempre como la mente de su
  propia herramienta. Expresá los cambios del programa como efectos de una acción de su kit pedida por `act`;
  pedí la escena también por `act`. El bus solo acepta sus credenciales originales y sus despertares, sin autor
  elegido por el programa; cualquier otro hecho se rechaza también dentro de `together`.
- Mové lectura, validación del material, firma, I/O y resolución a adaptadores declarados. Las acciones y callbacks
  trabajan con referencias; conservá `secret: true` y quitá `secretInputs` y `secretLimits.minLength` sin efecto.
- Agregá `secretKeys`, métodos con esquemas cerrados y permisos, y `credentialSlots`. Usá `revision(slot)`, incluso
  después de liberar; incorporá los efectos de vínculo al resultado aceptado. No publiques copias de esos efectos.
- Separá composición, adaptadores y herramientas en archivos. Sustituí imports internos, namespaces y barrels que
  arrastren capacidades por imports públicos nombrados. Conservá todas las pruebas de programa, incluida la ley 212.
- Cubrí todas las posiciones y ramas secretas con casos ejecutados. Actualizá pruebas que esperaban material o
  limpieza literal de texto: los campos públicos siguen públicos y sus repeticiones no se borran.
- Conservá IDs y adoptá lo anterior con manifiesto de dueño y propósito. Ante `E-SECRET-HISTORY`, tratá la historia
  expuesta sin sobrescribirla ni declarar limpio lo no revisable. La bóveda en claro se cifra antes de retirarla;
  para proveedores anteriores, adaptá `get` a `Promise<Uint8Array | undefined>`: `importLegacyKeys` verifica destinos antes de borrar orígenes.
- Prevé recuperación de las llaves y el ancla externas, revisión de pendientes, borrado pendiente y restauraciones de respaldos.
  La apertura verifica toda la historia y los sobres: su costo crece con ellos; el índice público crece con las cuentas vigentes y tiene un límite de tamaño. Olvidar consulta las cuentas de la historia aunque ya se hayan purgado.
  Las referencias no invalidan snapshots de otra versión ni acreditan autorización de servicios externos.

## Los registros que se guardan
- Un programa puede guardar registros que organizaciones reales escribieron con él en una carpeta que nombra en
  `package.json`: `"desert": { "program": …, "journals": "tests/journals" }`. Cada uno es una copia de su
  `journal.sqlite` (nunca `secrets.sqlite`). La protección actual sustituye las posiciones declaradas antes de que el programa las reciba.
  Un histórico no revisado o un dato no declarado puede conservar material sensible; además están los datos de la
  organización: no guardes el de una organización real en un repositorio público.
- La compuerta abre cada copia en inspección con el programa de hoy, también con credenciales, sin lo que traía plegado: cada hecho se lee y se pliega desde
  el primero, y cada cosa se lee como la lee quien administra. Un cambio que no los lea frena ahí.
- Además recorre lo ofrecido en anchura: cada camino vuelve a una copia limpia del registro, con el reloj quieto.
  Los dos primeros niveles se recorren enteros: cada fila del Menú y cada fila de lo que abre, sean las que sean (un
  registro guardado con miles de cosas tarda lo que tarda: se guarda uno chico). Más allá prueba hasta 64 caminos, 24
  niveles de decisiones y 16 alternativas por estado. Acepta opciones, marcas y texto que ya se ofrece y puede
  enviarse; no inventa texto ni escribe secretos, y no recorre conversaciones. Un error interno, una pregunta de
  opciones sin respuesta elegible o una fila apagada sin motivo hacen fallar la compuerta. Las fallas declaradas en
  `outside` pueden terminar en `Error` con su causa. Un `InspectionUnavailable` al ejecutar una acción corta
  solamente esa rama: el informe cuenta las ramas no recorribles con acción y motivo, separadas de los cortes
  por los topes del recorrido. No equivale a haber ejecutado esas acciones, aunque la comprobación termine bien.
- Lo que el recorrido cubrió se lee en la salida de la compuerta, una línea por registro: cuántos caminos, cuántos
  lugares y cuántas respuestas ofrecidas quedaron sin recorrer. Es una muestra acotada, no una prueba de todos los
  estados posibles: las garantías derivadas de los casos siguen siendo obligatorias.
- El único remedio que la base tiene hoy es no romper la lectura: un hecho que cambia de forma es un hecho nuevo, con
  otro nombre, y el viejo se sigue leyendo y plegando. No hay lectura versionada de un hecho viejo.
- Cada composición y apertura declara `projectionVersion`. Hay dos modos explícitos: un string no vacío es una
  versión **manual**; `codeProjectionVersion(rutas, extensiones)` de `src/runtime/calculation-version.ts` devuelve
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
- Suprimir de verdad un dato del registro, dejando el hecho (un pedido de supresión de datos personales).
- Una llamada interna directa a `execute` dentro de un oyente de un hecho suelto todavía puede cerrar su escritura
  antes de oír a sus propios oyentes. El puerto `ToolStartup.act` resuelve este caso para la mente: difiere la
  ejecución hasta salir de la entrega del hecho y recién contesta después de escribir con sus oyentes.
- Los efectos externos o la memoria privada que un oyente cambió antes de que falle una escritura no se revierten
  con el registro. Los hechos que aún esperaban en la cola sí se retiran: nunca se entregan después de deshacerse.
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
| Validar identidades | `identityNameProblem`: comparte con el programa la regla aplicada a identificadores nuevos. |
| Probar Identidades | `identitiesTool` e `identityWords`: incorporan la pieza optativa a los casos derivados de una composición. |
| Estado y hechos | `createHouse`, `identityView`, `houseStep`, `Bus`, `effect`, `vocabulary`, `houseCatalog`, `startState`, `startTools`, `toolsStep` |
| Declarar datos y comprobar causas | `object`, `text`, `ids`, `caseInstant`, `programAct`, `OutsideDefect`, `outsideCause`, `MissingView`, `toolTexts`, `genericTexts` |
| Tipos | `Aim`, `Check`, `Decided`, `Doing`, `House`, `Seat`, `Body`, `Screen`, `Choice`, `Session`, `Walk`, `Router`, `Shown`, `Tool`, `Emission`, `Case`, `Composition`, `ProgramAct`, `ProgramTool`, `Step`, `KeyStore`, `Program`, `State` |

Los callbacks declarados como métodos conservan su objeto como `this`, tanto al leer una herramienta como al
preguntar o ejecutar una acción. Si una lectura falla, la base conserva su diagnóstico como defecto del programa;
solo una ausencia explícita (`MissingView`, también exportada por `surface/contract/shown-tool.ts`) se presenta como
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

Las comprobaciones de sugerencias calculadas usan la superficie declarada del programa: las mismas preguntas,
listas, creadores de opciones, calendario, identidad, destino e instante que la fila encadenada. Si la fila está
apagada, no calculan su sugerencia; `undefined` significa que no hay sugerencia. Una sugerencia presente que no
cumple su campo falla nombrando campo y valor. `programChecks(programa, mostrado)` conserva su firma;
quien invoque por separado `promisedChecks` ahora pasa también `mostrado` como segundo argumento.

Los hechos anteriores con campos de texto libre siguen leyéndose con la regla anterior: al menos un carácter
que no sea espacio según `\S`. Los hechos nuevos deben cumplir la regla actual de texto visible.

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
registro de una organización abierta usá `copyJournal(origen, destino)` de `src/storage/copy-journal.ts`:
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
Una suma de control detecta daño, no prueba que el estado corresponda al registro. Antes de usar una instantánea
al abrir la casa, la base vuelve a plegar el prefijo desde cero y compara estado completo y reloj. Si difieren,
la descarta, lo dice por `SAVED_FOLD_REBUILT` y reconstruye el grupo antes del arranque del programa y de la cola
posterior. Esto incluye instantáneas de versiones anteriores con suma válida y autoridad cambiada sin hechos.
La comprobación ocurre también si la instantánea declara secuencia cero. Abrir tiene el costo de ese plegado;
una instantánea válida ya no evita verificar el prefijo. Las pruebas de actualización siguen rechazando una
instantánea divergente como evidencia de un cálculo correcto, aunque la casa pueda repararla al abrir.

Cada descarte dice el nombre del plegado y el motivo: formato anterior o desconocido, bytes ilegibles, secuencia
inválida o adelantada, otro registro, cálculos distintos, nombre retirado o un grupo dependiente incompleto.
Son avisos `SAVED_FOLD_REBUILT`, no fallas. Quedan disponibles en `house.storageNotices()` y en
`storage-notices.jsonl`, dentro de la casa, con nombre y motivo técnico por renglón y modo 0600 al crearlo.
No se emiten warnings de Node ni se escribe en stdout o stderr. La superficie local muestra al abrir un hilo
«Sistema» con «Reconstruido · Estado de la casa»; Enter continúa al Menú. El aviso dura esa apertura.
La puerta HTTP conserva el mismo registro sin dibujar una pantalla. No son hechos,
no escriben `tool-entry` ni agregan historia por reconstruir. Diez aperturas del almacenamiento, alternando
identidades, dejan exactamente los mismos hechos. El arranque de `startHouse` conserva su hecho de ciclo de vida
`boot`, independiente de los avisos; también siguen siendo hechos los resultados reales de las herramientas.
Los pares de estado y reloj se conservan por identidad dentro de la misma versión de cálculos: cada identidad
reconstruye la primera vez y después verifica su prefijo y procesa la cola, aunque otras hayan abierto en el medio.
No se comparten estados calculados para personas distintas. Un cambio de versión retira los pares anteriores.
Una apertura sin descartes no repite el aviso. Quien usa `SqliteJournal` directamente consulta
`restoration().warnings` o pasa un receptor de diagnósticos como tercer argumento; tampoco imprime.
`src/doors/terminal/storage-notices.spec.ts` comprueba los bytes de una terminal real, el cambio de cálculos,
un formato viejo, la segunda apertura y la conservación de datos y autor. `storage-http.spec.ts`, en esa
misma carpeta, comprueba el manejador HTTP sin sockets, su registro y la ausencia de salida de pantalla.

En una casa viva, solo SQLite abre y cierra los archivos del auxiliar, del registro y de la bóveda.
`copyJournal` sigue copiando el registro vivo mediante SQLite, incluyendo WAL, sin descriptores propios que
liberen sus bloqueos. La inspección y la comparación de conservados reciben evidencia cerrada e inmóvil:
copian su archivo y, si fue conservado, su WAL a una carpeta privada antes de abrir SQLite allí. El índice `-shm`
se reconstruye solo en esa copia. Ese copiado de evidencia no se usa para sacar respaldos de una casa abierta.

Las pruebas derivadas de cada caso y recorrido comparan estado completo y reloj tras cerrar y abrir con otra
apertura después de borrar los plegados guardados. Los registros conservados hacen esa comparación antes de
recorrerlos; el archivo auxiliar del escritor no se toma como un registro conservado.

## La casa como servidor local (paso 1)

Un programa puede abrir una sola casa con `startHouse(home, opciones)` y pasar ese resultado a
`serveHouse(casa, home, llaves)` (`src/doors/socket/server/serve.ts`). La tabla de prueba es un `ReadonlyMap` de llave a
`{ identity, door: "terminal" | "agente" }`; no es el almacenamiento definitivo de llaves. La identidad debe seguir
perteneciendo a la casa. La llave decide identidad y puerta: el cliente no puede declararlas en su saludo. Una llave que nombra
una mente (`mind:…`) se rechaza siempre: las mentes no entran por la puerta.

Solo el servidor abre almacenamiento. La composición debe dejar salir `WriterAlreadyOpen` con su texto y código
no cero, sin reintentar; la prueba de proceso muestra ese arranque en `tests/support/socket-server-process.ts`.
Después de tomar el escritor y verificar que pertenece a esa carpeta se reemplaza el socket viejo, se escucha en `<home>/casa.sock` (0600, carpeta 0700) y
se escribe `casa.pid` (0600). La ruta completa debe entrar en los 103 bytes útiles de macOS: el error la nombra.
`close()`, SIGINT, SIGTERM o `apagar` de quien administra dejan de aceptar, avisan y esperan hasta diez segundos;
el cierre informa la cantidad de actos pendientes y libera la casa antes de borrar socket y pid.

Los programas existentes pueden seguir usando sus puertos locales:
`HousePorts`, `localPorts`, el router y `startHouse` conservan su contrato. La adopción del cliente se describe en
«Terminal cliente de la casa (paso 2)». La sesión de agentes llega aparte: en este paso se autentica, pero no recibe estado ni ejecuta pedidos de
terminal. Las llaves reales y su revocación individual llegan en el paso 3; sacar la identidad ya corta su conexión.

El marco lleva largo uint32 big-endian (cuenta el byte de tipo y el cuerpo), un byte de tipo y el cuerpo.
Tipo 0: JSON UTF-8 válido, hasta `actLimits.inputBytes` (1 MiB, el tope de los datos de un acto) más 64 KiB para el
sobre, validado con TypeBox de ambos lados. Tipo 1: tramos de 64 KiB de un
mensaje `node:v8`, solo de la casa al cliente terminal; cada marco sigue limitado a 16 MiB, el estado completo no. Un cliente nunca puede enviar tipo 1. `hola` autentica primero y recién después exige igualdad de protocolo y
versión completa de Node; quien no entró no recibe esas versiones. El protocolo actual es 3; los límites y la versión están en `src/doors/socket/wire/protocol.ts`. Los esquemas exactos están en
`src/doors/socket/wire/protocol.ts`. Todos los objetos JSON llevan `tipo` y rechazan propiedades adicionales:

| Dirección | `tipo` | Campos además de `tipo` |
|---|---|---|
| Cliente | `hola` | `protocolo: entero`, `node: texto`, `token: texto`; primero y dentro de 5 s |
| Cliente | `acto` | `id`, `act`, `target?`, `input`, `through: secuencia` |
| Cliente | `leer` | `id`, `qué`, `desde?`; `catalogo` devuelve nombres y acciones, `pedido` recupera el acto con ese `id` |
| Cliente | `esperar` | `id`, `hasta: instante`; espera un hecho o el plazo, hasta 240 s, sin sondeo |
| Cliente | `defecto` | `tool`, `target`, `option`; la casa exige la acción en el kit y arma la entrada con su catálogo |
| Cliente | `sincronizar` | ninguno; pide estado completo; el primer pedido deja un único aviso por terminal |
| Cliente | `apagar`, `chau` | ninguno |
| Casa | `bienvenida` | `protocolo`, `identidad`, `admin: booleano`, `ahora`, `seq`; luego `estado` solo a terminal |
| Casa | `estado` | `seq`, `ahora`, `base` (secuencia o `null` para completo), `huella` SHA-256, `bytes`; luego sus tramos tipo 1 |
| Casa | `resultado` | `id`, `status`, `reason?`, `private?`, `efectos` |
| Casa | `respuesta` | `id`, `seq`, `datos`; la espera dice `{ cambio: booleano }` |
| Casa | `rechazo` | `id?`, `motivo` |
| Casa | `cortado` | `motivo` |
| Casa | `cerrando` | ninguno |

Los nombres e identificadores admiten de 1 a 256 caracteres; los números son enteros seguros no negativos.
`desde` queda reservado: este paso no pagina el catálogo ni entrega el diario. Un `leer` de pedido ausente se
rechaza. `status` es `accepted`, `rejected`, `draft`, `inconclusive`, `interrupted` o `processing`.
`efectos` lleva solamente el texto de `tool-entry` con herramienta, destino y autor, y el objeto, acción y texto de
`act-done`; no lleva todos los hechos ni diagnósticos. `defecto` responde con `id: "defecto"`.

Cada terminal recibe `identityView` con secuencia, agrupando los cambios del turno. Al entrar se manda completa;
luego viajan solo los campos y claves que cambiaron, y de las listas que crecen, el agregado. Los campos y mapas
siguen la estructura real del estado: eso conserva las herramientas opacas y evita volver a mandar el historial.
Una huella semántica SHA-256 del estado entero acompaña cada envío; no depende de los alias internos de v8
ni de que un número esté guardado como entero o double. Se compone de huellas de partes inmutables: se reutilizan
las partes sin cambios y se recalculan las que cambiaron y sus contenedores. Los escalares se escriben directamente
en la parte que los contiene, sin serialización V8 ni un SHA por cada escalar. El parche compara con ese mismo
criterio de valor. La primera lectura completa sigue siendo proporcional al tamaño del estado.

La codificación usa etiquetas de tipo y separadores: `null;`, `undefined:undefined;`, booleanos `true`/`false`,
números con `String(n)` (incluidos `NaN`, `Infinity`, `-Infinity`; `-0` tiene el valor de `0`), bigint decimal y
cadenas con escape JSON, incluidos los sustitutos Unicode aislados. Los objetos recorren claves propias en orden
lexicográfico UTF-16 fijo, sin depender del locale; las listas conservan longitud, posiciones y huecos. Map y Set
conservan el orden observable de iteración. Cada objeto hijo aporta su SHA-256, independientemente de sus alias.
Date aporta milisegundos, RegExp fuente y banderas; los binarios aportan tipo y bytes, y Float32/Float64 sus valores
numéricos canónicos. Buffer y Uint8Array son tipos distintos. Son partes acíclicas e inmutables; un tipo no admitido
falla con el aviso de envío, nunca genera una huella a partir de bytes internos de V8.

Por esta puerta los pedidos aceptan solo árboles de datos JSON: `null`, booleanos, texto, números finitos,
listas densas y objetos de claves de texto. Se rechazan `-0` (también por subdesborde), números no finitos, undefined,
bigint, funciones, símbolos, fechas, mapas, conjuntos, huecos, accesores, ciclos y propiedades que JSON omitiría.
El rechazo dice «El pedido tiene datos inválidos. No se escribió nada.» y ocurre antes de registrar el pedido o
escribir hechos. El mismo identificador puede corregirse: no se reservó. No cambia la puerta de un solo proceso.

La terminal arma aparte y publica solo después de verificar huella, secuencia e identidad. Si difiere, conserva la
última vista válida, muestra una vez el texto del catálogo, suspende los actos y pide `sincronizar`. Tres estados
inválidos consecutivos en la misma secuencia agotan la recuperación: son dos pedidos como máximo; un estado válido
reinicia la cuenta. La terminal termina con código 1 y «No se pudo comprobar el estado de la casa. Se cerró la
terminal. Volvé a abrirla.», también si ya había entrado. La casa escribe un solo aviso de resincronización por
conexión, aunque cambie la secuencia: el archivo no crece con cada vuelta.
Desde el envío de `hola` hasta el primer estado comprobado hay cinco segundos totales. Ningún encabezado, tramo
ni resincronización reinicia ese plazo; al vencer, la terminal sale con su texto del catálogo y código 1.
El protocolo 3 identifica esta nueva codificación: casa y terminal deben actualizarse juntas; un cliente de
protocolo 2 autenticado recibe el rechazo de versión, antes de intercambiar estado.
La vista y su codificación se comparten entre las conexiones de la misma identidad y secuencia. El resultado sale
después del estado que contiene sus efectos. Cada conexión respeta backpressure: el plazo de un segundo sin
drenaje cuenta solo el tiempo ocioso del bucle de la casa (`eventLoopUtilization().idle`), no el tiempo que la
casa pasa trabajando. Al vencer, o con más de 1 MiB de envíos posteriores pendientes, se corta con aviso. Un estado inicial grande se
transmite por tramos, sin contar su tamaño total como cola pendiente. Ninguna conexión espera a otra.
Hay hasta 32 conexiones sin presentarse: una nueva desplaza la más antigua que todavía no entró, sin cortar
miembros. Cada conexión atiende hasta 16 marcos por vuelta del bucle y pausa su entrada entre vueltas para
dejar pasar el drenaje y las demás conexiones. Cada cuerpo incompleto vence en cinco segundos, también después del hola. Entre miembros esa vista conserva los datos que la casa ya muestra; no sirve como
frontera de permisos. Antes de entrar no hay estado, catálogo ni resultados. Una identidad retirada deja de recibir.

El cliente elige un `id` estable por intento lógico de actuar. La causa del acto conserva
`socket-request:` seguido de la representación JSON de `[identidad, id]`. Repetir el pedido devuelve su resultado,
o `processing` solo mientras siga en curso; cambiar el contenido conservando el identificador recibe un rechazo
explícito. Una huella canónica del contenido viaja como segunda causa `socket-content:`. Si no se pudo escribir
el acto, la respuesta termina con el rechazo de la base o interrumpida; ese resultado queda en memoria para
repetir y consultar en ese proceso. Si el almacenamiento no guardó ningún hecho, ese pedido no sobrevive al reinicio.
Otra identidad o identificador constituye otro acto. Al reabrir se reconstruye el índice desde el diario, incluidos
los resultados `interrupted` que escribe el arranque. Los registros anteriores, sin esa causa, siguen siendo válidos.
El recibo `private` se conserva solo en memoria: tras un reinicio se recuperan estado, motivo y efectos públicos,
nunca se persiste ni se vuelve a emitir una credencial para reconstruir un recibo perdido.

## Terminal cliente de la casa (paso 2)

El programa puede abrir `openProgramTerminal(raízDelPrograma, carpetaDeCasa, llave, program, shown)` desde
`src/doors/terminal/open-terminal.ts`. `program` y `shown` son imports estáticos de su composición. La llave se entrega
en memoria; nunca se pasa en argumentos del proceso servidor. Su provisión definitiva corresponde al paso 3.
Los programas locales existentes y `shop-open.ts` siguen compilando y funcionando. `HousePorts` suma
`observe?`, opcional, para los actos del dibujo; sin ese puerto se usa el mismo `act` local de siempre.

La función prueba `<carpetaDeCasa>/casa.sock`. Si falta, ejecuta con Node el archivo declarado en
`package.json → desert.program`, pasándole únicamente la carpeta de la casa. Ese archivo sigue exportando
`program` y `shown` y, cuando `import.meta.main`, llama `runProgramServer(program, opciones, carpeta)` de
`src/doors/socket/server/server-process.ts`. Las opciones son `by`, `creation`, `keys` (tabla del paso 1) y, si corresponde,
`secretKeys`. Ver `tests/support/shop-program.ts` para una composición completa con custodia solo de prueba.
El programa usa sus proveedores de custodia reales en su composición; la terminal no abre el almacenamiento.

El arranque tiene cinco segundos para confirmar por IPC que escucha. Después, el proceso queda independiente.
Un relevo independiente recoge stdout y stderr del hijo, incluidos mensajes nativos, en `<home>/casa.log`,
en modo 0600 dentro de la carpeta 0700. Se conservan al relanzar mientras entren en 1 MiB. Al exceder ese tope
se trunca el mismo descriptor, se escribe «Se alcanzó el tope de la salida. Se conserva el tramo más reciente.»
y se guarda el tramo reciente que entre; no se acumulan archivos rotados. Un archivo de la versión anterior
que ya exceda el tope se reemplaza por ese aviso al abrir el relevo.
El archivo no sigue enlaces ni admite enlaces duros. Toda falla al abrir se traduce a una línea del catálogo y
salida distinta de cero; ninguna traza cruda llega a la terminal. Un arranque fallido no dice «Casa cerrada»:
el hijo escribe primero la causa segura (el código del sistema, cuando existe), y el relevo recoge su salida
antes de devolver el rechazo. Si el propio archivo no se puede abrir, la terminal conserva su rechazo visible.
Cerrar la terminal no apaga la casa, según la decisión de la obra.
Un escritor sin socket devuelve literalmente `This house is already open in a running process`: este paso
conserva ese texto en inglés. Una ruta de socket demasiado larga falla nombrándola, sin acortarla.
Al perder una casa ya conectada, la terminal intenta reconectarse cada 500 ms y no vuelve a lanzarla.

`socketConnection` conserva la última vista y `socketPorts` implementa el contrato existente. La Barra usa los
cuatro iconos y colores de siempre, sin palabras nuevas. `now` suma a la hora fresca de la bienvenida de esta
conexión el tiempo monotónico transcurrido. La hora del encabezado `estado` se conserva por compatibilidad
del protocolo, pero nunca ajusta el reloj: puede pertenecer a un envío guardado. Reconectar toma otra bienvenida. Solo las observaciones automáticas del dibujo comparten promesa; cada acto de la persona, incluido
`attend` antes de actuar, tiene un pedido nuevo. Un corte resuelve con `interrupted` y
«Se cortó antes de la respuesta: fijate en Actividad si se hizo.». Los identificadores inciertos se consultan
al reconectar y cuando llega otro estado; nunca se reenvían automáticamente sus actos. El resultado recibido
para esa consulta no reemplaza el mensaje de corte que ya vio la persona: Actividad y la vista de la casa
siguen siendo la forma de comprobarlo. Los identificadores se conservan durante la vida de esa terminal. Una consulta rechazada por cupo conserva
su identificador incierto y se vuelve a consultar al segundo, con un único temporizador para el conjunto;
perder la conexión cancela ese temporizador. Nunca se reenvía el acto.

`defecto` lleva solo `tool`, `target` y `option`: la casa verifica el destino, que la acción sea una propiedad
propia de la herramienta y su kit, y arma texto y autor. `constructor`, `toString`, `__proto__` y
`hasOwnProperty` heredados no son acciones. No acepta entrada, atención, texto elegido, made, draft ni silent. La excepción del cliente no viaja.
El diagnóstico ya presente en `identityView` sigue viajando como en local; este carril no cambia quién lee qué.
Los marcos locales y remotos se comparan después de aquietar el router y recibir el estado de sus actos,
incluidos los que dispara un dibujo. También se comparan los hechos `act` del registro.

Los pedidos autenticados que no son actos (`defecto`, `esperar`, lecturas, `sincronizar`, `apagar`) comparten
32 admisiones por conexión en una ventana móvil de un segundo; hay como máximo ocho esperas simultáneas.
Un rechazo lleva el identificador del pedido, o su tipo cuando no tiene identificador, y dice «Llegaste al tope
de pedidos de esta conexión. Esperá un segundo y volvé a intentar.». No escribe ni reserva otra espera.
La terminal muestra ese aviso como máximo una vez por segundo y sigue conectada.
Terminar una espera o cortar su conexión libera el lugar. Los actos y `chau` quedan fuera de ese cupo.
La prueba del costo compara bytes y cantidad de envíos, con un envío de estado por terminal y pago; alterna
el camino local y remoto para informar sus tiempos y relación, sin un umbral de milisegundos dependiente de la máquina.

## El kit, la escena y el destinatario de la atención (historia del 14/11)

La forma vigente del kit es V2, documentada más abajo. Este apartado conserva la interpretación de los hechos anteriores.

`granted` conserva su sentido: dar una herramienta entera. `kit-set` toma `{ holder, tool, acts }`, escrito por
quien administra: con una lista deja solo esas acciones; con `[]` ninguna, manteniendo la herramienta; con `null`
todas. Una identidad sin kit puede todas las acciones de la herramienta que tiene. No se da kit a un extraño ni
para una herramienta que no tiene; el kit dirigido a quien administra se ignora y nunca le recorta acciones.
Al sacar una herramienta se borra su kit; al devolverla llega entera. Al salir de la casa se pierden los kits.
Al recibir la administración se borran todos los kits de quien la recibe. Si después la devuelve, sus herramientas
siguen enteras hasta que quien administra le dé otro kit.

`mindOf(tool)` y `mindTool(actor)`, en `house/kit.ts`, nombran a la mente como `mind:<herramienta>`.
No es una identidad: no recibe `granted` ni administración. Solo puede actuar si su herramienta existe
en el registro, sobre ella o sus cosas y con las acciones que le dio quien administra. Sin kit no puede actuar;
`null` le da todas las de su herramienta. No necesita atenderla ni tiene preferencias o actos de atender.
Los actos que el programa ofrece por `own` son solo para identidades; a la mente la casa le ofrece únicamente `scene`.
`allowedAct(house, by, tool, act)` comprueba ambos niveles; toda acción anidada conserva autor y pasa de nuevo
por ese control con el estado vigente. Sacar una acción corta también sus actos en curso, de identidad o mente;
volver a darla habilita actos nuevos, sin resucitar los cortados. El resultado y la entrada quedan a nombre de la mente.
Con la custodia, la mente usa los adaptadores declarados de su propia herramienta como una identidad que la tiene
(`holds` en `house/kit.ts`). Los vínculos de credenciales son por actor, herramienta y destino: la mente solo ve
los que ella misma vinculó, y una identidad, los suyos (salvo la colisión de nombres anteriores que se explica abajo).

El contexto ofrece `signal?: AbortSignal`: los contextos existentes siguen compilando. Una acción larga puede
escucharla o pasarla a operaciones que admitan corte. El oyente vivo reevalúa cada hecho de la casa, sin lista de
tipos: también corta cuando pasar la administración retira una acción. Reconstruir el estado no emite cortes.
El corte alcanza a los hijos que el acto inició y a sus descendientes, aunque conserven su propia acción.
Dos actos independientes del mismo actor no se cortan entre sí si el otro conserva su acción.
La base impide entrar al cuerpo si el corte llegó al anunciar el inicio, iniciar anidados desde el acto cortado,
y usar sus adaptadores o vínculos después del corte, también si el método quedó guardado antes.
`context.execute` devuelve `{ status: "interrupted", reason: "sacada" }` si el padre ya estaba cortado, sin
iniciar nada, o si el anidado en curso fue interrumpido: no rechaza la promesa con un texto suelto. El control llega
hasta un adaptador pendiente que todavía no empezó a usar material. `holds` conserva su significado para los actos
que siguen habilitados: el kit recorta acciones, no métodos.

El punto de cierre es antes de empezar a escribir el lote del resultado: `finish` vuelve a comprobar el kit.
Si la acción fue sacada, termina `interrupted`, dice `sacada` y no escribe sus hechos ni entrega su recibo privado.
Si el programa además falló por su cuenta, su diagnóstico se escribe y genera los mismos avisos que sin corte,
según quién conserve acciones; el resultado sigue siendo `interrupted · sacada`, con la marca de defecto.
El motivo de la señal y el rechazo de un adaptador por el corte no dejan un defecto.
Lo que un anidado ya escribió queda. Si el recorte llega con el lote ya en escritura, el lote termina entero y
el cierre dice `sacada`. Si un acto `reach: "world"` devuelve éxito porque ya hizo lo suyo afuera, su resultado
se conserva con `sacada` al lado, también en pantalla. La base no deshace efectos externos: el programa debe atender
la señal antes de un efecto directo que aún no hizo; JavaScript en curso no se detiene por la fuerza.
Un reinicio cierra una sola vez los actos colgados como `acción interrumpida`; no reconstruye señales ni los repite.
La fila abierta se apaga al viajar el estado; una pregunta pendiente se rechaza al confirmar con `fuera del kit`.

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

`Need` gana `to?: string`. Sin él Atención sigue llegando a quienes tienen al menos una acción de la herramienta; con él solo a esa
identidad, si está en la casa y tiene al menos una acción de la herramienta. Si no cumple esas condiciones, la necesidad se muestra a
quienes tienen al menos una acción de la herramienta, igual que una sin destinatario. Cada caso que promete necesidades debe incluir ese
mismo destinatario; la garantía de la casa compara el dato completo y la de Atención mira desde quien hace el caso
y desde cada destinatario prometido. Si este no puede verla, falla diciendo a quién iba. La escena explica: no crea
necesidades ni cambia quién puede actuar. Las identidades leen todas las entradas de actividad, incluso las que una
versión anterior dirigía a otra. `private` sigue devolviendo un recibo solo al actor y no se escribe en el registro.
`identityView` deja pasar esos hechos históricos; el catálogo actual ya no permite escribir canales ni destinatarios
en `tool-entry` o `act-done`. Ninguna acción ni efecto nuevo produce esos datos. Al subir, un programa que usaba
`channel-created` o campos `recipient` debe dejar de producirlos y asumir que todas las identidades leen cada entrada,
incluidas las que un registro viejo dirigía a otra. `private` conserva el recibo efímero que solo recibe quien actuó;
los secretos siguen fuera de la actividad mediante la custodia estructural. No hay pantallas nuevas; apagar las acciones
fuera del kit con su motivo cumple la garantía 224 para lectura y kit.

Además de declarar `facts`, un programa que no usa estas adiciones no necesita cambiar sus casos. Quedan reservados los
nombres de hechos `scene` y `kit-set`, y el prefijo de actor `mind:`; si los usaba, necesita resolver la colisión
antes de subir. `mind:` es un nombre reservado: ninguna identidad puede llamarse con ese prefijo. Un registro
anterior que tenga una identidad `mind:…` se pliega distinto; no se corrige ni renombra en el plegado. En particular,
si `mind:jefe` creó la casa, ese `house-created` se ignora y un siguiente `house-created` de `ana` deja a Ana como
administradora. Los `granted` para `mind:…` quedan en el registro pero no incorporan esa identidad a la casa.
Las credenciales de aquella identidad sí quedan en el mismo alcance: actor, herramienta y destino son los mismos
textos. Si una identidad anterior `mind:vault` vinculó una credencial de `vault`, la mente de `vault` la puede usar
cuando recibe el kit para esa acción. Sin kit se rechaza antes de usar el adaptador. No se renombra ni se corrige
esa colisión en el plegado: el programa debe resolverla antes de subir.
No se agrega `message`. Quien construye `House` a mano agrega `kits` y `scenes` vacíos o parte de
`emptyHouse`. `Need.to` es opcional y la entrada `testing.ts` no suma exportaciones.
La versión de cálculos de la base pasa a `desert/7`, nueva en la unión del kit, el servidor y la mente (ninguna rama
la usó): al actualizar se reconstruyen los plegados anteriores, también los de la primera vuelta (`desert/2`) y
los de `desert/3` a `desert/6`, para borrar los kits al recibir la administración, reconocer el nombre que una
identidad escribe sobre sí y conservar el primer dueño de cada despertar. En versión manual,
la evidencia guardada debe renovarse con la entrega comprobada, conservando la anterior durante su control.

La composición puede pedir `identities: true`: quien administra tiene todas las acciones de cada herramienta, sin asignación; también recibe sus recordatorios. Sin esa opción, la asignación de herramientas conserva su comportamiento anterior. Un recorte sin acciones apaga los recordatorios y excluye la herramienta de Atención, aunque siga en el kit para la preferencia de lo ajeno. La superficie y la ejecución consultan el mismo permiso por acción.


### Identificadores y nombres de identidades

Al subir, usá `identityNameProblem(identificador, nombreDeLaCasa)` de
`src/house/identities/identity-name.ts` para validar a quien abre: devuelve `undefined` si es válido o un motivo sin repetir el valor.
El identificador empieza con una letra minúscula ASCII, tiene entre 1 y 64 caracteres, y solo admite letras
minúsculas ASCII, dígitos, puntos y guiones; debe ser distinto del nombre con que corre la casa. La casa aplica
la regla al crearla, dar herramientas, readmitir y pasar la administración antes de escribir.

La regla no se aplica al plegar historia: un `granted` anterior a `Ana​` conserva exactamente esa identidad y sus
herramientas, y un `handed` anterior puede dejarla como administradora. Los hechos que antes ignoraban a una mente
siguen ignorándose. Para escribir nuevos hechos de esas puertas se exige la regla actual incluso a identidades antiguas.
`named` guarda un nombre libre con texto visible de hasta 160 unidades; lo establece quien administra o, sobre sí,
la propia identidad (6c), y
`identityDisplayName` devuelve el identificador cuando falta el nombre. Sacar conserva el nombre y la identidad en
`removed`; readmitir con herramientas vacías la devuelve sin herramientas ni kit.

### Autoría en la superficie humana (18/11)

Atención, Actividad, avisos y Registro muestran el nombre de la identidad, con el identificador como respaldo
cuando no tiene nombre. Sacarla conserva el último nombre, también después de reabrir. Las mentes se leen como
«mente de» más el nombre declarado del programa, igual que en Identidades; los asistentes conservan su nombre
y el de su titular. Cambiar un nombre actualiza la lectura sin reescribir hechos ni cambiar destinos o permisos.

Las lecturas genéricas presentan los campos `by` y `author` como nombres en listas y fichas. Conservá los ids en
los datos; `id`, destinos, `detail` y texto libre no se traducen. En un hilo, el primer span de `Said.who` contiene
el autor: la superficie resuelve ese id y conserva los otros spans (dispositivo, hora y estado), estilos y foco.
Las referencias que arma la Entrada usan esa cabecera. Una cita ya escrita por el programa sigue siendo texto
libre. La puerta MCP conserva los ids en avisos y lecturas, sin adoptar esta presentación humana.

### Identidades del core (pasos 5b y 5d)

`identities: true` en la composición incorpora `identities` al registro de ejecución. Sin ese pedido no existe.
La superficie recibe automáticamente sus palabras y la ofrece en Sistema con `i`, sin pantalla personalizada.
El id queda reservado: un programa no puede declararlo por su cuenta. No tiene slice, `start` ni mente;
`mind:identities` no es un actor. `granted` y `kit-set` rechazan ese id antes de escribir, y `assigned` lo excluye
incluso para quien administra. Los programas que calculan «todas» desde su registro deben excluir `identities`.

La lista conserva presentes y sacados. La ficha muestra identificador, nombre, estado, kit y escena.
`new` pide Identificador, Nombre opcional y Herramientas; escribe `granted` y, si hay nombre, `named`, en el mismo
lote. El identificador se valida con `identityNameProblem`, también en la pregunta, sin recortar lo escrito.
`remove` conserva la fila y borra herramientas; `readmit` escribe `granted` vacío; `hand` escribe `handed`.
Sacar y pasar confirman con `volver` elegido. Ninguna acción depende del kit: crear, sacar, readmitir, pasar y editar el kit exigen administrar;
las demás identidades leen esas acciones apagadas con `solo quien administra`. La excepción es `scene`,
que cada identidad presente puede ejecutar solo sobre su propia fila, incluso quien administra. El cambio de administración se consulta de nuevo al ejecutar una pregunta abierta.
El nombre conserva el tope del campo de texto corto (120); los nombres históricos de hasta 160 se siguen leyendo.

Las pruebas de una composición que pide la pieza pueden incluir `identitiesTool(registry, nombreDeLaCasa)` de
`src/tools/identities/identities.ts` en su registro y `identityWords` de `identity-reading.ts` en `shown.words`.
Eso hace que `programChecks` derive también sus casos. La ejecución recompone esa declaración con el nombre real
con que corre la casa. `tests/support/identities-program.ts` muestra ese programa adicional; el programa original
`tests/support/shop-program.ts` sigue sin pedir Identidades. No se vuelve a subir la versión del cálculo de 5a.

El campo declarado `verbatim: true` conserva espacios y saltos al escribir, pegar y convertir la respuesta.
Identificador lo usa para rechazar el valor completo con la regla compartida; los campos comunes conservan su
normalización anterior. No es una composición ni un control nuevos.

### Kit por carpetas y hechos V2 (18/11)

En Identidades se recorren programas, herramientas y acciones con listas, flechas, Enter y Esc.
Los números son atajos para las primeras nueve acciones, sin limitar las filas. Cada carpeta dice
«Todo, también lo nuevo», «Algunas acciones» o «Sin acciones». Una acción heredada lo indica;
al quitarla se confirma que esa carpeta será reemplazada por hermanas y acciones restantes y dejará de recibir
acciones nuevas en esa rama. La edición usa el estado vigente y conserva las otras ramas, incluidas selecciones retiradas.
La ficha de quien administra explica que este kit no lo restringe. Escena, atender y preferir son actos propios,
fuera del catálogo otorgable. La mente recibe escena; atender y preferir siguen siendo de identidades.

`Selection` usa identificadores en inglés: `{ kind: "program", program }`, `{ kind: "tool", program, tool }`
o `{ kind: "action", program, tool, action }`. `SelectionKit` es `{ version: 2, selections }`.
Una carpeta sigue siendo carpeta aunque tenga una sola acción; enumerar todas las acciones nunca la convierte en carpeta.
`effectiveKit(house, actor, registry, process?)` devuelve acciones instaladas y vigentes. Para un asistente cruza
su delegación, el permiso actual del dueño y las capacidades de su carta. Para un journey también cruza el alcance
del proceso y conserva su cierre y autor. Administrar no convierte al asistente propio en administrador.
Al pasar la administración, una selección V2 se conserva para cuando su titular deje de administrar;
los hechos históricos mantienen la limpieza de restricciones antiguas que ya tenía `handed`.

El puerto transitorio es `herramientaDe(program, action, layout)` en `house/kit-selection.ts`.
Cada `Tool` actual representa un programa; `actionTools` declara la herramienta de cada acción. Sin ese mapa,
la herramienta histórica tiene el mismo id que el programa. El integrador debe conectar el adaptador de programas
instalables con este mapa, y pasar registro y correspondencias a los cálculos. El mapa entra en la huella de proyección.

Solo se escriben estas formas: `granted { version: 2, identity, kit }`, `kit-set { version: 2, holder, kit }`,
`assistant-kit-set { version: 2, owner, kit }` y `journey-opened { version: 2, goal, kit }`.
`granted` incorpora o reincorpora y establece la selección; `kit-set` no incorpora miembros.
`house.selections` guarda las selecciones. Las claves de `grants` conservan pertenencia; sus valores y `kits`
son compatibilidad histórica, no el permiso vigente: consultá `holderKit`, `allowedAct` o `effectiveKit`.
Los estados de asistentes y journeys tienen `selections`; su campo `kit` conserva únicamente las listas históricas.

El lector conserva los hechos originales, con id, autor, causas y proceso. Un `granted { identity, tools }`
antiguo retiene las restricciones de ámbitos conservados y elimina las retiradas. Un `kit-set` antiguo con `null`
da solo su herramienta histórica, nunca un programa nuevo con herramientas hermanas; una lista, incluso vacía,
da únicamente esas acciones. Las listas antiguas de asistentes y journeys tampoco se convierten en carpetas.
El escritor acepta pedidos antiguos como adaptación de llamadas existentes y los convierte contra el diario vigente
antes de anexar V2; no modifica ningún registro anterior. Los productores del core ya entregan V2 directamente.
La versión del cálculo de la base es `desert/9`; una proyección vieja se reconstruye.

La composición admite `kitMigration`, con versión, `scopes`, `actions` y `retired`. `scopes` declara el alcance
herramienta antigua → herramienta de un programa nuevo; `actions` declara renombres o movimientos de igual significado
dentro del mismo programa. No se infiere nada por rótulos ni se traslada autoridad entre publicadores.
Las correspondencias ambiguas, destinos encadenados y reutilización de ids retirados se rechazan. Conservá
permanentemente las correspondencias y retiros al publicar nuevas versiones. Sin correspondencia, una selección
retirada no habilita acciones y la pantalla dice «ya no está disponible»; el diario conserva su selección.

Las acciones de edición son `kit:<programa>`, `kit:<programa>/<herramienta>` y `kit:<programa>:<acción>`;
reciben `{ value: "yes" | "no" }`. No hay una acción pública que permita escribir ids arbitrarios.
Las confirmaciones declaradas pueden devolver `undefined` cuando esa respuesta no necesita confirmación.
`JourneyAccess` admite `layout` y `migration` para resolver carpetas e historia con el mismo catálogo que el motor.

### Palabras del kit y Atención (18/11)

El alta pide **Programas** por su nombre declarado. En la ficha, **Kit** distingue la selección guardada:
«2 programas», «1 programa · 2 acciones» o «1 programa · 1 herramienta · 1 acción». Seleccionar acciones
sueltas no las convierte en carpeta. Una ficha vacía dice «Sin acciones». El enlace `programas` explica
«acciones que puede hacer».

Los programas instalables llevan `palabras.name` al registro como `Tool.name` y los nombres de sus herramientas
como `Tool.toolNames`. El kit, sus títulos, las confirmaciones, el resultado guardado y las mentes usan esos nombres;
los ids conservan su función en destinos y permisos. Las composiciones anteriores pueden declarar esos dos campos
sin cambiar sus ids. Una fila de acción respeta las minúsculas de las reglas de terminal.

Dar o sacar una carpeta confirma «Kit · Nombre de la carpeta · Titular», con `dar`, `sacar` y `volver`.
El valor actual queda apagado; `volver` no escribe. Una carpeta parcial permite ambas operaciones.
El comando sigue recibiendo `{ value: "yes" | "no" }`; solo cambian los rótulos de su pregunta.
El identificador vacío muestra un ejemplo corto, sin regla ni error; la regla aparece al escribir un valor inválido.

La fila del programa conserva el resumen y suma «Requiere atención» cuando Atención tiene un destino pendiente.
Las novedades no silenciosas de otra identidad aparecen allí hasta leer su destino, también después de reabrir.
Abrir solo el programa no da por leídos sus objetos. Los avisos propios que piden atención también se muestran;
Actividad sigue reservada a lo de otras identidades. Los cambios de Identidades permanecen en Actividad.

### Escena propia desde Identidades (paso 5d)

La composición sigue pidiendo únicamente `identities: true`; no incorpora otro proceso, estado ni herramienta.
La acción declarada `scene` sobre `identities/<autor>` pregunta General y escribe el hecho de casa `scene`
a nombre de quien actúa. `allowedAct` exceptúa únicamente esa acción del permiso de administrar; su declaración
comprueba la fila propia una sola vez para la superficie y la ejecución. Una identidad sacada no puede escribir;
quien administra tampoco escribe por otra. La fila ajena conserva la acción apagada con `solo la escena propia`.

General tiene el tope del contrato (4.000 caracteres) y exige texto con algo visible; un texto invisible se queda
en la pregunta con su motivo. Escribir reemplaza la escena completa anterior, incluidas sus partes dirigidas.
El acto propio de casa sigue aceptando `to` por las otras puertas: hasta 64 identidades presentes, nombres de hasta
160 y textos de hasta 1.000. La terminal no pregunta esas partes en este paso: el conjunto dinámico de identidades
y un texto por cada elegida quedan pendientes del dueño, sin otro tipo de pregunta ni pantalla inventados.

La lista usa la última escena general como dato; sin escena mantiene el estado o dato del kit anterior. En el
objeto se lee entera y solo la parte dirigida a quien mira. En Mentes se lee igual, junto a sus acciones del kit.
La lectura usa renglones existentes de hasta 36 columnas y el scroll común, también en terminal de 40×16.
Las partes dirigidas siguen siendo datos compartidos del contrato; esta selección es la presentación del objeto,
no una promesa de confidencialidad ni un cambio del frame o del acceso a los hechos.

Al subir, no hay migración ni nueva versión del cálculo: los hechos `scene` anteriores se leen igual. El programa
que adopta Identidades reserva su id fuera de sus kits, valida identificadores nuevos con `identityNameProblem`,
usa `names` para el nombre mostrado y conserva los sacados desde `removed`; la reapertura no renombra la historia.
Los programas sin el pedido conservan su composición. No se exige trasladar Usuarios de otro programa en este paso.
El lugar de escritura de escenas, el stack Mentes, más de nueve filas de edición, la llave mostrada una sola vez
y la ubicación de la puerta siguen pendientes del dueño o del carril correspondiente.


## La mente de una herramienta desde su proceso

El programa le da una mente en cero a la herramienta implementando `start(ports)`: escucha un hecho y pide
`ports.act({ act: "anotar", target: "notas", input: {} })`. La casa fija `mind:notas`; el programa no pasa ni
elige autor. Puede pedir acciones declaradas de Notas, incluidas las de sus cosas, según su kit, y su propia
`scene` sin kit. Otra herramienta, los actos propios del programa y las preferencias siguen fuera de su alcance.
Los rechazos son los mismos de `execute`: por ejemplo, sin kit o fuera de él dice «fuera del kit», una herramienta
que ya no está dice «sin acceso», y la forma inválida dice «datos inválidos». La acción recibe sus adaptadores con el alcance de la mente, no el del proceso que abrió la casa.
Los adaptadores del arranque y sus credenciales se prestan a la misma mente; su objeto es la propia herramienta.

```ts
start({ bus, act, now }) {
  const stop = bus.on("woke", event => {
    if (event.layer === "house" && event.data.id === "notas:revisar") {
      void act({ act: "anotar", target: "notas", input: {} }).then(resultado => {
        // El proceso recibe el estado final y, si lo hay, el motivo del rechazo.
      });
    }
  });
  bus.emit({ layer: "house", kind: "wake-at", data: { id: "notas:revisar", at: now() + 60_000 } });
  return stop;
}
```

El reloj persiste `wake-at`; al reabrir programa lo pendiente, aunque ya venció, y un `woke` entregado no se repite.
Un ID nuevo empieza por `encodeURIComponent(idDeHerramienta) + ":"`. El primer pedido fija su dueño en el
registro, incluso después de cancelarlo o reabrir. Los IDs anteriores conservan ese primer autor. Si fue una mente,
esa mente puede reprogramarlos aunque no usaran
el prefijo nuevo. Si fue una identidad, quien administra puede cancelarlos mediante
`house.cancelInheritedWake(identidadAutenticada, id)`; ninguna mente puede hacerlo. La identidad debe provenir de
la puerta autenticada, igual que en las demás operaciones de la casa. La mente sigue con un ID propio. El espacio
`attention:[…]` de las personas está reservado. Por el bus del arranque otra herramienta no puede reemplazar ni
cancelar ese despertar ni escribir `woke`. Los efectos de sus acciones pasan por la autoridad del kit (garantía 219):
con otro autor, un hecho de la casa o uno de otra herramienta rechazan el lote entero; solo se escriben los hechos que
declara su herramienta en `facts`, a nombre de la mente.
Volver a escribir el ID propio reemplaza su fecha; `at: null` lo cancela. El ejemplo
programa una fecha nueva cada vez que arranca; para mantener una fecha de negocio entre arranques, el programa la
pide sólo cuando corresponde según su estado plegado. No hay reintento automático del acto.
Un despertar puede quedar consumido justo al cerrar, antes de ejecutar el acto diferido. Por eso el programa
no depende solo de oír `woke`: conserva el trabajo pendiente en su estado, lo revisa al arrancar y ejecuta una
acción que lo marca cumplido junto con su resultado. `tests/support/zero-mind.ts` y `zero-house.ts` lo prueban
con una reapertura en la misma tarea del despertar, y una segunda reapertura que no repite el trabajo.

`act` siempre resuelve su promesa con estado y motivo opcional; nunca la rechaza. Una entrada cíclica, con
`BigInt`, accesores, conversiones propias, instancias, `Map`, `Set`, fechas o `-0` devuelve «datos inválidos».
La entrada admite hasta `actLimits.inputBytes` (1 MiB) de bytes JSON del acto, su destino y su entrada, el mismo
tope de los datos de un acto en toda puerta; se rechazan los datos que exceden ese límite. Un marco JSON del socket
admite ese tope más 64 KiB para el sobre, así que lo que la mente puede pedir también entra por la terminal. Que la casa
exija el tope en la ejecución para toda puerta queda para el paso de contratos: hoy la terminal todavía lleva un acto
entre los dos topes. Una falla interna
devuelve «E-BASE-1 · Falló la base»
y deja un diagnóstico; si el registro también falla, se intenta informar esa pérdida por la salida de diagnóstico.
La petición se ejecuta en otra tarea, después de terminar la entrega del hecho y su transacción, por `execute`
como primer nivel. Conserva la causa del hecho que se estaba oyendo cuando nació el pedido, también si una
continuación termina más tarde o la libera otro hecho. Fuera de una escucha no inventa causa. Si esa escritura
o el `together` del pedido se deshacen, rechaza sin escribir nada a nombre de la mente. Cada acto cede una tarea
para intercalar personas y reloj. Una cadena de actos de la misma mente causada por sus propios actos llega
a 32; el siguiente se rechaza con el motivo de límite de cadena, sin ejecutarse, y deja un diagnóstico a nombre
de la mente. El tope solo cuenta cadenas causadas por actos propios: un proceso que actúa por su propio reloj no
tiene ese tope y recibe el turno que le da la casa. Al ejecutar consulta el kit
vigente. Lo escrito por la acción y por sus oyentes se confirma junto o se deshace junto; la mente recibe el
rechazo si un oyente falla. Quedan el intento y su resultado/diagnóstico como para una persona. Los efectos sobre
el mundo o la memoria privada de un oyente no son una transacción del registro.

Cerrar el proceso invalida su puerto, incluidas peticiones todavía diferidas. Un acto ya iniciado queda en el
registro; si la casa se reinicia a mitad, el arranque lo cierra como interrumpido. No se entrega `Execution`, registro
de herramientas, custodia ni resolvedor, ni en el resultado de `act`. El bus solo admite los comandos originales
de `credentials.replace`/`release` y `wake-at` propio. La casa fija el autor; otro autor o cualquier otro hecho
—del programa o de la casa, incluida `scene`— se rechaza antes de guardar nada. El rechazo de un hecho
indica usar `act`; el de un despertar inválido o ajeno indica pedir un despertar propio por el bus. El tipo impide
publicar hechos comunes, fabricar credenciales o elegir autor.


### Escrituras conjuntas, también dentro de otras

`bus.together(() => …)` escribe entero o nada: al fallar restaura los hechos, la secuencia y los plegados.
Cada escritura anidada tiene su propio punto de guardado. Si la interna falla y el programa atrapa el error,
la externa conserva lo anterior y puede seguir; si falla la externa, también desaparece lo que confirmaron
las internas. Confirmar la interna todavía no confirma la externa.

Cuando se escribe desde un oyente, los hechos nuevos esperan en la cola. Si esa escritura se deshace,
sus hechos salen de la cola antes de continuar la entrega: no llegan después al reloj, a los oyentes ni a los
cálculos que escuchan el bus. Se conserva el orden de lo que sí quedó. Cerrar y reabrir no revive lo deshecho.
Los pliegues del registro y el estado del reloj se restauran al punto de guardado: deshacer un pedido, un
reemplazo o una cancelación recupera la fecha anterior, sin dejar un temporizador huérfano. Los oyentes que
ya participaron de la escritura siguen siendo sincrónicos; sus efectos externos no se deshacen con SQLite.

El pedido diferido de una mente conserva la confirmación de su causa y de todas las escrituras que lo rodean.
Si alguna se deshace, rechaza sin escribir; si la causa quedó guardada, otra escritura fallida no la invalida.
La confirmación pertenece a la escritura, no solo al ID: un ID retirado puede reutilizarse al reintentar.
Las casas de prueba comprueban al cerrar cada instancia que toda causa de todo hecho existe en ese registro.
No cambia la firma de `together`; un programa que atrapaba un fallo interno ahora ve realmente retirado lo
que se escribió dentro, tanto en el estado vivo como al reabrir.

La causa interna de un dato de custodia identifica una sesión o un motivo de mantenimiento. Se conserva allí,
pero el recibo que lo lleva al registro no la repite como si fuera el ID de un hecho. Los registros ya escritos
no se reescriben ni se inventan hechos para completar referencias antiguas.


## El estado que lee un programa

`State<X>` es de solo lectura hasta el fondo: objetos, listas, mapas, conjuntos y valores dentro de ellos.
Esto vale para `start().state()`, vistas y pantallas propias, resúmenes, necesidades, ofertas, actos y sus
validadores, efectos y los argumentos de `Slices.step`, también en una terminal conectada por socket. Cambiar una referencia recibida lanza `TypeError`,
incluidos los accesos por iteradores, `forEach`, descriptores o métodos nativos de colección. La autoridad
sigue siendo la del registro: una mente no se da un kit ni cambia la administración desde una lectura.
Los errores del programa conservan el diagnóstico habitual de la puerta que los recibió.

La base mantiene vistas por referencia y protege cada parte al leerla. No copia ni recorre la casa en cada
`state()`: releer una misma parte reutiliza su vista. Una lectura anterior sigue mostrando su pliegue anterior;
para ver un acto posterior, volvé a pedir el estado. Un cálculo puede reutilizar partes de su entrada o crear
mapas y objetos nuevos; la base se queda con sus datos nuevos, sin dejar que una referencia mutable retenida
por el cálculo cambie después lo guardado. Los callbacks deben seguir siendo puros: la verificación al abrir
puede llamarlos otra vez. Un cambio válido siempre nace de los hechos, no de modificar la lectura.

Los iniciales, el plegado interno y las instantáneas quedan bajo control de la base. Al deshacer una escritura
se restauran esos datos, y la siguiente lectura recibe la vista de ese pliegue. Al cerrar y reabrir se verifica
el estado guardado contra el registro antes de entregarlo a cualquier arranque.

## Las leyes del repositorio

Al adoptar esta versión, la compuerta de la base corre también las siete leyes de repositorio desde
`tests/program/registration.ts`. Las opciones se declaran en `package.json`, en `desert.laws`:

```json
{
  "code": ["src", "arranque"],
  "base": "desert",
  "adapters": [],
  "adapterUsers": {},
  "mayTalkOutside": {},
  "catalog": ["src/palabras.ts"],
  "exemptWords": {},
  "exemptRules": {},
  "data": {},
  "maxLines": 300
}
```

Todos esos campos son obligatorios, también los vacíos. Una opción ausente o inválida falla nombrando el campo.
`code` enumera carpetas reales con TypeScript; una ausente, vacía o con solo pruebas falla. El código que compila el
programa debe estar cubierto por esas carpetas. `base` es la ruta relativa de la base, que tiene que existir, o `null`
para la base misma. Las raíces `adapters`, `storage` y `keychain` de esa base siempre se reconocen como adaptadores.
`adapters` agrega las raíces propias del programa; cada una tiene que existir. `catalog` admite carpetas terminadas
en `/` o archivos de palabras, nunca una carpeta de código entera ni una que la contenga.

`adapterUsers`, `mayTalkOutside`, `exemptWords` y `data` son objetos de ruta a motivo. Los dos primeros admiten
carpetas terminadas en `/`; `exemptWords` y `data` nombran archivos. `exemptRules` nombra cada archivo y declara
`{ "reason": "motivo técnico", "texts": ["token exacto"] }`. Una exención sin motivo, ausente o cuyo texto dejó de
existir falla. Los textos de instrucciones fuera de esos tokens siguen fallando. `maxLines` es un entero entre 1 y
300: un programa puede pedirse archivos más cortos que la base, nunca más largos ni sin tope. La base declara 300.

El runner declara inclusiones literales, en orden: los patrones `<carpeta>/**/*.spec.ts` de `code`, seguidos de
`desert/tests/program/**/*.checks.ts` en el proyecto de specs; `tests/laws/**/*.spec.ts` en el proyecto de leyes.
La ruta de las partes sigue el valor de `base`. El chequeo de archivos de partes de la base sigue siendo propio.

La entrada `#desert/laws.ts` permite usar las mismas funciones en pruebas propias; las funciones devuelven una
lista vacía cuando se cumple la ley. `readLint(repo)` obtiene la lectura asíncrona completa de ESLint que reciben
`ignoredFiles` y `looseRules`. `programLaws(root)` lee las opciones y corre todo. `#desert/testing.ts` conserva su
entrada separada. Los programas que fijan una versión anterior recién reciben esto al actualizar su base.

## La puerta MCP por HTTP

Un programa puede servir la misma casa a un cliente MCP por HTTP. La puerta se arma sobre una casa ya abierta;
no crea otra casa ni guarda sesiones MCP. El mapa de llaves vincula cada llave con una identidad presente y la
puerta `agente`. Las llaves de `terminal` no sirven para entrar por MCP.

```ts
import { mcpDoor } from "./src/doors/mcp/mcp-handler.ts";
import { serveMcp } from "./src/doors/mcp/mcp-http.ts";

// house es la casa ya abierta; keys es su ReadonlyMap<string, DoorKey>.
const door = mcpDoor(house, keys, {
  name: "Mi programa",
  version: "1.0.0",
  limits: { recentLines: 40 },
});
const http = await serveMcp(door, { host: "0.0.0.0", port: 3000 });
// Cuando el programa termina de atender HTTP:
await http.close();
// El programa sigue siendo dueño de cerrar house después de sus otras puertas.
```

La dirección y el puerto los decide el programa. Railway termina TLS y reenvía HTTP a ese puerto.
`GET /salud` responde `200` con `ok`, sin llave ni datos de la casa. El protocolo entra por `POST /mcp`;
`GET /mcp` responde `405` porque no hay SSE. Las demás combinaciones de método y ruta responden `404`.
Para conectar Claude:

```sh
claude mcp add --transport http <nombre> <url>/mcp --header "Authorization: Bearer <llave>"
```

Cada pedido lleva la llave. Antes de consumir el cuerpo, la puerta compara hashes SHA-256 de igual tamaño con
`timingSafeEqual`, recorriendo todas las llaves; exige una identidad presente y una llave de `agente`.
Si falla, responde `401`, `WWW-Authenticate: Bearer` y cuerpo vacío. Comprueba la longitud declarada y corta la
lectura por fragmentos al superar `socketLimits.json` (`413`). El cuerpo requiere `application/json` (`415`);
se admite el parámetro de codificación habitual. Al terminar de leer y antes de responder comprueba nuevamente
la autorización, para respetar una llave retirada o una identidad removida durante el pedido.

Hay un solo mensaje JSON-RPC 2.0 por pedido; una lista recibe `-32600`. `initialize` repite una de las versiones
`2025-03-26`, `2025-06-18` o `2025-11-25` si fue la solicitada; ante otra, ofrece `2025-11-25`. Publica el nombre y
la versión indicados por el programa, `{ tools: { listChanged: false } }` y la orientación del catálogo.
`ping` devuelve `{}`; `notifications/*` recibe `202` sin cuerpo. No hay `Mcp-Session-Id` ni una inicialización
obligatoria entre pedidos. Un método desconocido recibe `-32601`; argumentos inválidos, `-32602`.

Las herramientas MCP publicadas son siempre `leer`, `acciones`, `actuar` y `esperar`. La casa reúne
identidades y programas; cada programa tiene herramientas con acciones. El parámetro que elige el programa se
llama `programa`. Mandar `herramienta` en cualquiera de las tres primeras recibe `-32602` con el nombre nuevo,
incluso si también se manda `programa`: no hay alias de compatibilidad.

- `leer { programa?: string, objetivo?: string }` muestra la identidad, la secuencia `desde`, las escenas generales
  con la parte dirigida a quien lee, los `programas` asignados y sus avisos (cada aviso identifica su `programa`).
  Con `programa`, muestra su lectura textual, sin códigos de terminal. En un programa instalable, esa lectura
  lista sus herramientas con ids. Por ejemplo: `leer { programa: "notas" }` lista las carpetas;
  `leer { programa: "notas", objetivo: "notas/notas" }` lista los objetos de esa herramienta;
  `leer { programa: "notas", objetivo: "notas/notas/<id>" }` lee el objeto. `objetivo` requiere `programa` y debe
  pertenecer a él: destinos inexistentes o de otro programa reciben un rechazo claro. Cualquier identidad presente
  puede leer un programa instalable aunque no lo tenga en su kit. Las piezas del sistema se leen igual:
  `leer { programa: "identities" }` lista Identidades; `objetivo: "identities/ana"` lee a Ana.
  Usa `localPorts`, las lecturas de identidad y los avisos de la terminal.
- `acciones { programa?: string, objetivo?: string }` muestra `programa`, `herramienta` (id de la carpeta, como
  `notas/notas`), `accion` (identificador ejecutable, como `notas/add`), nombre, propósito, si se hace sobre una
  herramienta o una cosa, objetivo, esquema TypeBox serializado como JSON Schema y motivo de indisponibilidad.
  Las posiciones secretas conservan `secret: true`. Si todavía no hay cosas, la acción de cosa aparece con ese
  motivo y sin objetivo. En programas instalables muestra también las acciones ajenas, apagadas con el motivo
  del kit. Cada acción aparece sólo en su carpeta u objetos correspondientes; `objetivo` filtra por uno de esos
  mismos ids que aceptan `leer` y `actuar`, y requiere `programa`. Las piezas sin grupos, como Identidades,
  conservan su id de raíz como `herramienta`. Los `Tool` comunes conservan el filtro por kit y su lectura sin
  objetivo. Ninguna lectura concede escritura.
- `actuar { programa, accion, objetivo?, datos }` toma el programa como objetivo cuando no se indica otro.
  Para ejecutar una acción publicada, copiá sus campos `programa`, `accion` y `objetivo`, y agregá `datos`.
  Atiende el objetivo y ejecuta mediante `requestBook`, el mismo camino del socket, con los chequeos de kit y el
  tope de datos de la casa. Devuelve el texto aceptado o el motivo del rechazo con `isError: true`. Los recibos
  privados no se exponen por esta puerta. Cada llamada es un acto nuevo: el ID JSON-RPC correlaciona la respuesta,
  no sirve como clave de deduplicación para reintentar una escritura.
- `esperar { desde, segundos }` devuelve texto JSON con `seq` y `cambio`. Responde inmediatamente si la secuencia
  ya avanzó; en otro caso espera un cambio posterior a `desde` o el plazo, limitado a 60 segundos. Al desconectar
  o cerrar la puerta se liberan la escucha y el temporizador. Comparte la espera con el socket.

Esta puerta no ofrece apagar, sincronizar ni declarar defectos. `http.close()` deja de escuchar, corta conexiones
y espera los pedidos admitidos antes de soltar el libro de actos; no cierra la casa. El manejador `door.handle`
recibe método, ruta, encabezados y una función que entrega fragmentos del cuerpo: esa función no se invoca para
pedidos sin autorización. Así se prueban protocolo y herramientas sin abrir sockets; `mcp-http.spec.ts` comprueba
el adaptador con un puerto real en un entorno que permita escuchar.

## Mensajes por idioma, skills y capacidades de la carta (17/11)

Un mensaje declara `id`, `kind`, `parameters` (un objeto TypeBox) y `texts`, con una traducción por idioma.
`src/fields/languages.ts` declara hoy solamente `es`. Quien lee llama `mensaje.text(idiomaDeLaCasa, parámetros)`:
no hay idioma global, idioma implícito ni reemplazo cuando falta una traducción. Incluso un mensaje sin parámetros
se lee con `{}`. Los tipos y la validación en ejecución comprueban los parámetros; el error nombra el mensaje y
la posición inválida. La elección y persistencia del idioma de una casa corresponden a su composición; este
contrato lo recibe explícitamente, sin deducirlo del país de `Shown.locale`.

Para migrar un texto, dejalo en `src/texts/`, importá `defineMessage` de `../fields/messages.ts` y reemplazá el
literal o la función por una declaración como esta:

```ts
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
export const noteCount = defineMessage({
  id: "notes.count",
  kind: "text",
  parameters: Type.Object({ count: Type.Number() }, { additionalProperties: false }),
  texts: { es: ({ count }) => `${count} notas` },
});
// Quien pide el texto recibe language como argumento de su casa.
const shown = noteCount.text(language, { count: 3 });
```

Usá un id estable y único, y mantené `id`, `kind` y `texts` explícitos en la declaración: la ley los lee sin
correr el programa. No se esconden traducciones en un spread ni en una variable externa. El catálogo existente
sigue disponible: este corte agrega la skill de Identidades como mensaje; migrar los demás textos es otro encargo.
Para sumar un idioma, agregalo a `languages` y completá `texts` en cada mensaje; los parámetros mantienen su tipo.
La ley `messageCoverage` falla nombrando archivo, mensaje e idioma faltante. Corre con las leyes de la base y
con `programLaws`; también se exporta desde `src/laws.ts` para una comprobación propia.

`kind: "text"` identifica palabras comunes. La ley 15 permite instrucciones de conducta únicamente dentro de
`texts` de mensajes con `kind: "skill"`, `"house"` o `"mind"`: respectivamente, cómo usar una herramienta,
la capa fija de casa y la capa fija de mente del system prompt. Los ids, parámetros, propósitos y textos vecinos
siguen controlados, aunque estén en el mismo archivo. Esas marcas describen el destino del mensaje; no crean
una mente, no arman el turno ni otorgan permisos.

`Tool.purpose` conserva su texto descriptivo. `Tool.skill?: Skill` es un mensaje sin parámetros variables, con
`kind: "skill"`, que la mente que trabaja con esa herramienta puede leer con `tool.skill.text(language, {})`.
Es opcional porque una herramienta sin mente no la necesita. Identidades declara su skill en
`src/texts/tool-skills.texts.ts`; declararla no la agrega a las lecturas ni a las puertas de las personas.
La selección de skills para el marco y las reescrituras firmadas de la casa pertenecen al armado de la mente.

Cada `ToolAct` puede declarar `needs?: readonly Capability[]`. El vocabulario exacto vive en
`src/fields/capabilities.ts`: `sees` para imágenes y `hears` para audio. Toda carta escribe; omitir `needs` o dar
`[]` significa que escribir alcanza. `["sees", "hears"]` necesita ambas capacidades. No se cambia el `needs`
de `ProgramTool`, que sigue declarando otras necesidades del programa.

`programAct({ ..., needs: ["sees"] })` y `ownAct(objeto, opción, { input, purpose, needs }, ejecución)` conservan
la lista. El constructor de bajo nivel acepta `toolAct(input, ejecución, alcance, normalización, needs)`;
`reading(acto)` también la conserva. Los actos anteriores siguen funcionando sin agregar una declaración.
Este contrato comunica requisitos: elegir cartas y filtrar actos por capacidades corresponde al carril de mentes.

## Cartas y adaptador de modelos

El catálogo `src/adapters/models/catalog.ts` declara quince cartas: cada uno de los cinco modelos de Anthropic
con esfuerzo `low`, `medium` o `high`. Todas ven imágenes; ninguna oye audio. `cardsFor` exige todas las capacidades
de los actos y `lostActs` devuelve los actos que la carta no alcanza. El resultado del banco registra rol, casos,
escenas, aprobación, costo, duración, fecha y huellas de casos, skill y textos del marco; empieza vacío.

`costUsd` recibe tokens de entrada, escritura y lectura de caché y salida. Haiku usa el segundo precio si la suma
de tokens de entrada supera 100.000. Los precios no informados figuran como `null`: una cantidad positiva con
precio desconocido no se calcula. `withinCap` exige gasto y tope, y calcula la entrada al precio más alto posible
entre entrada común, escritura y lectura, más la salida máxima; si necesita un precio desconocido, falla. Hoy no se
conoce la escritura de caché de ninguna carta, de modo que no se puede autorizar una llamada con entrada positiva.
El programa debe comprobar el tope antes de llamar; el transporte no lo comprueba por su cuenta.

`requestBody` arma cuatro capas de sistema y un único mensaje de usuario; `callAnthropic` recibe una llave y un
transporte inyectable. `readResponse` devuelve el primer bloque de texto JSON validado y el uso separado; informa
rechazo, corte por máximo, JSON inválido, esquema inválido, fallo HTTP y transporte. Se reducen las restricciones que
el proveedor no admite y se comprueban al leer. Los esquemas con vocabulario que el validador no reconoce fallan;
la aceptación del esquema reducido por el servicio real queda sin comprobar hasta la llamada exterior.

## Contratos y autoridad del asistente (17/11, etapa 1)

Una identidad puede tener un asistente habilitado por quien administra. Su actor estable es
`assistant:<titular>`; `assistantOf(owner)` lo construye y `parseMindActor` distingue asistente y mente de
herramienta. El nombre visible no cambia su titular. Un asistente no recibe `granted`, administración ni
preferencias, no atiende herramientas y no entra por MCP ni por el socket como identidad. Puede escribir su
escena propia. Las mentes `mind:<herramienta>` conservan su kit y su ejecución actuales, sin modelos.

`house.assistants` conserva el nombre, la habilitación, la delegación y, si hubo adopción, la identidad anterior.
`assistant-enabled` y `assistant-disabled` exigen al administrador; `assistant-kit-set` exige al titular.
El kit enumera herramientas y actos concretos: no hereda acciones nuevas. `assistantOfIdentity` conserva también
al asistente deshabilitado para leer historia. `effectiveAssistantKit(house, owner, registry)` cruza lo delegado,
los permisos que tiene hoy el titular y las capacidades de la carta asignada. Sin carta no ofrece actos de trabajo.
`allowedAct` exige además `registry` cuando el actor es un asistente, para comprobar los requisitos de cada acto;
las llamadas anteriores para identidades y mentes de herramienta no cambian. `holds` aplica la misma intersección
al acceso a adaptadores. Los vínculos de credenciales siguen siendo del actor, herramienta y destino propios:
ser asistente no concede los vínculos del titular.

El lugar de ejecución reconoce `delegate-assistant` sobre `identities/<titular>` para que el titular pueda
escribir únicamente su delegación. Los hechos administrativos requieren sus actos específicos: `enable-assistant`,
`disable-assistant`, `adopt-assistant` y `assign-mind-card`. Un acto cualquiera de Identidades no puede esconder
estos efectos. Las acciones y pantallas concretas se agregan en la etapa 2A; acá queda la autoridad para recibirlas.
El retiro del kit, de la habilitación, del titular o de una capacidad corta el acto pendiente y sus anidados.
Devolver el permiso habilita trabajo nuevo y no revive las señales ya cortadas.

La adopción se escribe como un lote explícito: `removed` de la identidad anterior, habilitación y
`assistant-adopted { owner, legacy }`. El vínculo exige una identidad anterior removida, sin colisiones con otro
asistente; repetir el mismo vínculo no cambia su significado. Un administrador distinto no delega por el titular.
Los hechos antiguos conservan su `by`, incluidas notas o escenas escritas como `nora`: no pasan a ser de
`assistant:franco`. No se ejecuta una migración de casas al importar estos contratos.

`mind-card-assigned { mind, card, version, capabilities }` lleva firma administrativa, también para asistentes.
`house.mindAssignments` guarda esa configuración; la elegibilidad de la carta y su banco pertenecen a la etapa 2E.
La configuración y `house.modelCalls` están separados de `house.minds`, que contiene el hilo público. Los contratos
`MindDefinition`, `MindScope` y `TurnContext` no incluyen cartas, precios ni gasto. El contexto declara un contador
compartido y `TurnLimits`: doce intentos físicos, una corrección y una consulta. `ReviewPort` reserva el lugar de
las reglas y del supervisor; este corte no implementa el turno ni llama modelos.

`MindAnswer` tiene `scene`, `consulta: { question } | null` y `acts: [{ act, target, input }]`. `answerSchema(menu)`
cierra también los objetos de entrada del menú y conserva sus restricciones locales; el adaptador de modelos ya
reduce las restricciones de transporte al armar el pedido. `validateAnswer` comprueba texto visible, hasta 4.000
caracteres por escena o pregunta, hasta 32 actos, destinos exactos, permisos actuales, consulta única y alcance.
La consciencia recibe comunicación y apertura; el journey recibe controles y trabajo dentro de su kit. Los campos
extra `by` y `process` se rechazan. La ejecución los obtiene del contexto confiable y de los hechos, incluso en
anidados. No se persiste el cuerpo crudo de una respuesta inválida: se guardan códigos y posiciones.

Los hechos nuevos de turno son `mind-turn-opened`, `mind-answer-invalid`, `mind-consultation-requested`,
`mind-consultation-answered`, `mind-review-recorded`, `mind-turn-closed`, `mind-scene` y `mind-message`.
La consulta retiene los actos propuestos; la revisión conserva propuesta, actos, versión de reglas y resultado.
`mindStep` rechaza consultas duplicadas, respuestas sin consulta, autores o procesos cambiados y escrituras tardías.
`journeyStep` pliega `journey-opened`, `journey-plan-written`, `journey-step-done`, `journey-waiting` y
`journey-closed`. El plan se escribe una vez; un paso ausente o repetido falla. El journey conserva su `by` y su
id en `process`; las causas apuntan a hechos del diario, incluida su apertura. La ejecución comprueba el kit del
journey además del kit actual del actor y rechaza un proceso cerrado o ajeno. Los controles que abren y terminan
journeys corresponden a la etapa 2D.

Las llamadas declaran `model-call-reserved`, `model-call-started`, `model-call-settled`, `model-call-uncertain` y
`model-call-cancelled`. Los montos son enteros seguros en milmillonésimas de dólar (`NanoUsd`), sin redondeo a
centavos. `modelAccount` suma gasto liquidado y reservas pendientes por cuenta; una llamada incierta mantiene su
reserva hasta recibir consumo comprobado. Solo se cancela antes de enviar. Una cancelación no consume un intento;
un envío incierto o pendiente impide reservar el siguiente del mismo turno. Mente y supervisor comparten los
números del turno. El control del saldo y el transporte se implementan después; estos pliegues no gastan crédito.

La versión de cálculos pasa a `desert/8` para reconstruir los estados anteriores con los nuevos campos de casa.
Quien construya `House` a mano parte de `emptyHouse` o agrega `assistants`, `mindAssignments`, `minds`, `journeys`
y `modelCalls`. Quedan reservados los nombres de hechos enumerados y el prefijo `assistant:`; una identidad
histórica con ese prefijo no adquiere derechos de asistente ni de identidad al plegar. Los registros y sus
credenciales no se renombran: la composición debe resolver esa colisión explícitamente antes de adoptar la base.

## Programas instalables y distribuciones (18/11)

DESERT es el sistema operativo. Una distribución reúne versiones exactas de programas y elige sus mentes.
Un programa agrupa herramientas; cada herramienta agrupa acciones. La terminal entra por **Menú › Programas**,
conserva **Sistema** y, al abrir un programa, muestra la pila **Herramientas**. Una sola herramienta conserva
los tres niveles. `componer({ ..., atajoUnaHerramienta: true })` abre directamente esa herramienta desde el Menú;
el interruptor es opcional y viene apagado. No cambia sus acciones, destinos ni permisos.

`programa(metadata, body)` se importa de `desert/programa`. La metadata declara `id`, `version`, `desert`,
`codigo`, `hechos` e `inicial`; el cuerpo declara `purpose`, `skill`, `palabras`, `herramientas`, `plegar` y
`summary`. Cada herramienta lleva sus palabras, lecturas y acciones creadas con `programAct`, con sus casos.
La entrada de metadata mantiene sus herramientas en archivos propios; la frontera de secretos rastrea
`programa` hasta esas declaraciones y conserva separadas composición, herramientas y adaptadores.
El programa recibe su estado bajo `tools.own`; el adaptador conserva los destinos de sus herramientas y objetos.
Los hechos pertenecen al espacio de nombres del programa. Los rechazos de destino que agrega el adaptador
se comprueban por ejecución y ausencia de filas sobre cada destino ajeno; el autor no necesita inventar
un rechazo de negocio para ese límite.

Quien no tiene un programa puede abrir y leer sus objetos. Las acciones de cada objeto siguen visibles,
apagadas con el motivo del kit, aunque además exijan ser su autora. Quien tiene la acción ve el motivo de
autoría cuando corresponde. La preferencia de esconder lo ajeno retira el programa del Menú; al desactivarla
vuelve. La compuerta recorre cada acción en los destinos de su herramienta: una acción sobre objetos no se
exige en la carpeta ni en objetos de otra herramienta. El chequeo de kit parcial usa selecciones V2 y conserva
las demás acciones y programas.

`componer`, de `desert/componer`, recibe `programas`, `identidades`, `mentes` y `presentacion`. La presentación
incluye el país en `locale` y las rutas de cálculo en `codigo`. Devuelve `program`, `shown`, `manifest`,
`calculation` y `mentes`. Rechaza ids y hechos repetidos, hechos ajenos, contratos DESERT distintos, mentes
inexistentes o repetidas, asistentes sin identidades y dependencias de distribuciones. Los diagnósticos incluyen
cada camino y motivo. Rechaza `effects` de programas instalables: no los ejecuta por fuera del motor.
Las `reactions` de cada herramienta sí se instalan: su identificador y acción quedan bajo el nombre de la
herramienta, su destino es la carpeta y su actor es `mind:<programa>`. Una reacción sin destino de objeto no puede
invocar una acción sobre objetos: esa declaración se rechaza al componer.
Dos herramientas pueden repetir un nombre local de reacción y de acción. El motor conserva los pendientes,
reintenta con el kit vigente y no repite una reacción ya aceptada para el mismo aviso. Una acción o aviso
inexistente se rechaza al componer. Prueba: `src/runtime/distributions/house-reactions.spec.ts`.

**Qué garantiza el tipo.** `CompositionErrors` y `RequireValid` comprueban tuplas y literales de metadatos,
contrato DESERT, ids y hechos repetidos, propiedad de hechos, mentes existentes y no repetidas, asistentes
con identidades, dependencias de distribuciones y `effects` no admitidos. No comparan las formas de las
mitades contractuales ni recorren ciclos. `src/runtime/distributions/types.spec.ts`, «types the independent
positive and reports exactly each isolated static negative», comprueba los rechazos aislados y demuestra
que un ciclo contractual puede compilar: su alias `RuntimeCycle` no tiene errores estáticos.

**Qué comprueba la ejecución de la composición.** `diagnostico` y `componer` repiten las comprobaciones
centrales, exigen proveedor único, recorren el grafo para rechazar ciclos, comparan entradas, salidas,
rechazos, objetos y avisos, y verifican la evidencia de los casos para los artefactos instalados.
`src/runtime/distributions/contracts.spec.ts` lo comprueba en «preserves all contract paths alongside the
core composition diagnostics», «rejects both routes of a cycle when composing independently valid halves»
y «does not accept evidence from another executor or copied rows». `src/runtime/contracts/negatives.spec.ts`
comprueba los negativos contractuales aislados. Que TypeScript acepte una llamada no acredita esas condiciones;
la composición debe ejecutarse y puede rechazarla antes de abrir la casa.

**El generador del esbozo queda retirado.** `negativos.py` y sus 24 archivos `neg-*.ts` del esbozo `dist-2` no se
entregan ni se mantienen: los sustituyen pruebas versionadas que corren con la compuerta y comparan el conjunto exacto
de motivos. Correspondencia:
- 01 a 10, 13 a 18 y 24 (ciclo, con sus dos recorridos): negativos al componer en
  `src/runtime/contracts/negatives.spec.ts`; 11 y 12, en la misma prueba («11 new case and 12 evidence for another
  offer»). 13 a 16 también son errores estáticos en `src/runtime/distributions/types.spec.ts`.
- 19 y 20 (leer una dependencia no pedida o al proveedor): ya no son motivos de tipo; la lectura los rechaza al
  correr, en `src/runtime/contracts/readings.spec.ts` («cannot invent cuts, name undeclared dependencies…»).
- 21 y 22 (asistentes sin identidades, mente ausente): errores estáticos en `types.spec.ts`.
- 23 (kit de la mente con una acción inexistente): el kit de una mente se da al correr, no al componer; con
  `mind:desk`, una acción inexistente no da nada, se rechaza y sigue así al reabrir, en
  `src/house/mind-kit-unknown.spec.ts`.

Límite: cada negativo se prueba aislado sobre el positivo; las combinaciones, solo donde una prueba lo dice («lists
three independent incompatible fields»).

`mentes: { asistentes: false, programas: [] }` conserva el arranque determinista `mind:<programa>` y el plegado
de hechos históricos. No inicia pensamiento ni carga módulos de turno, catálogo de cartas o adaptadores de
modelos. `asistentes: false` retira del registro efectivo habilitar, deshabilitar, delegar y adoptar asistentes:
no aparecen en la terminal ni en MCP y no se agregan al kit. La elección se conserva en `program.mentes` y en
el manifiesto. Habilitar nombres en `programas` declara la selección para el ensamblador de pensamiento; esta
API no configura transportes ni inicia llamadas por sí sola. Las composiciones anteriores que omiten `mentes`
conservan su comportamiento de Identidades, por compatibilidad.

Los paquetes viven fuera de `node_modules`, fijados por commit, y se enlazan desde ahí. Un programa declara a
`desert` como dependencia par y lo importa por sus `exports`; nunca instala una copia propia mediante alias.
Las entradas públicas son `desert/programa`, `desert/componer`, `desert/messages`, `desert/fields`,
`desert/fields/*`, `desert/journal`, `desert/runtime`, `desert/doors/terminal`, `desert/doors/socket`,
`desert/doors/mcp`, `desert/testing`, `desert/program-gate`, `desert/laws`, `desert/program-types`, `desert/surface`,
`desert/calculation`, `desert/surface/house-router`, `desert/runtime/cloud`, `desert/doors/keys` y
`desert/doors/mcp/handler`. Las rutas públicas de `fields/*` no llevan `.ts` en el especificador.

Para armar una distribución, `desert/surface/house-router` publica `houseRouter`, que arma la terminal local;
`desert/runtime/cloud` publica `startCloudHouse`, que abre la casa de nube con la raíz del anfitrión;
`desert/doors/keys` publica `environmentDoorKeys`, que lee las variables de llaves declaradas por la distribución;
y `desert/doors/mcp/handler` publica `mcpDoor`, que se conecta con `serveMcp` de `desert/doors/mcp`.
Estas entradas son del ensamblador de la distribución: publicarlas no habilita su importación desde programas.
La ley 280 rechaza las entradas de arranque, composición, cálculo, puertas y router desde el código de un programa,
también al reexportar, consultar tipos, usar `require` o importar dinámicamente. Alcanza a todo paquete que
declare `desert.program`, salvo que declare exactamente `desert.kind: "distribution"`. La ausencia de
`testDistribution` es una falla con motivo; no apaga ninguna frontera. La frontera de secretos sigue auditando los nombres
permitidos de las entradas de programa; no habilita lectores de llaves ni funciones de nube.
`desert/testing` queda reservado a las pruebas: ningún archivo productivo del programa puede importarlo ni
reexportarlo, incluido su principal. Las pruebas pueden seguir usándolo.

La ley 286 inspecciona referencias de valor en las declaraciones TypeScript alcanzables desde los exports reales
de las entradas admitidas (incluido cada `fields/*`), sin evaluar módulos. Sigue alias, reexports encadenados,
`export *`, namespaces, paréntesis, `satisfies`, `as`, aserciones de tipo y `!`. Recorre objetos y arreglos anidados,
propagaciones y desestructuraciones (también defaults y rest), y los cuerpos, parámetros con valor inicial,
miembros y herencia de funciones, clases, métodos y getters. Sigue los helpers referenciados y corta los ciclos.
Inspecciona todas las ramas y todo el contenedor: puede rechazar un miembro seguro si comparte origen con otro
reservado; no intenta demostrar que una rama sea inalcanzable.

Rechaza los nombres de arranque conocidos y los valores cuyo origen está en runtime, doors, keychain, storage,
adapters, checks, ensamblado de superficie o router, aunque se renombren o envuelvan. El diagnóstico muestra la
entrada, el export, las envolturas con archivo y línea, y el archivo y símbolo de origen. Un símbolo sin declaración
o una referencia de valor sin resolver se rechaza con motivo; también se rechazan imports dinámicos y referencias
al `eval`, `Function` o `require` ambientales. La misma inspección corre en `loadProgram` antes de importar tanto
el principal como la distribución de prueba del consumidor.

**Alcance preciso de la ley 286:** es un recorrido estático de referencias de valor, no un análisis del heap ni de
los efectos de ejecutar JavaScript. Las posiciones de tipo no transportan valores. Las implementaciones de APIs
ambientales (`.d.ts`, incluidas bibliotecas externas y APIs estándar) y los valores que entrega quien llama a un
parámetro sin inicializador quedan fuera de esta garantía: se inspeccionan los argumentos presentes en las
llamadas alcanzables, pero no se infieren llamadas futuras ni implementaciones que no están en las fuentes.
Tampoco se garantiza el origen introducido por mutaciones fuera de las declaraciones alcanzadas (por ejemplo,
`Object.assign(box, { run: host })` en otra sentencia del módulo después de declarar `box = {}`), por efectos
laterales de otros módulos, por propiedades globales resueltas en ejecución, ni por código generado o reflexión
ocultos dentro de esas APIs ambientales. Las pruebas de la ley hacen explícitas estas hojas y el límite de
mutación. Esto no habilita esas rutas en programas: siguen sujetas a las fronteras de imports y secretos.

El principal de un programa pasa la misma inspección de secretos que sus herramientas; no recibe privilegios
de composición. Puede declarar `programa({ ...metadata, codigo: [import.meta.dirname] }, {...})` y reexportar
`program` con otro nombre, como `export { program as notas }`. La excepción de `import.meta.dirname` sólo vale
dentro de `codigo`, en el primer argumento del constructor real de DESERT y en el principal declarado.
Leer `import.meta` en otros lugares, usar `resolve` o `filename`, o pasar `codigo` a otra función no queda autorizado.
La distribución declarada con `kind: "distribution"` conserva su composición privilegiada.
Esta inspección estática cierra estas rutas conocidas; no constituye aislamiento de JavaScript hostil.

### La compuerta de un programa independiente

El paquete declara dónde exporta su programa y dónde compone la distribución que lo prueba:

```json
{
  "name": "notas",
  "peerDependencies": { "desert": "0.1.0" },
  "desert": {
    "program": "src/program.ts",
    "testDistribution": "tests/distribution.ts",
    "dependencies": [],
    "laws": {
      "code": ["src"], "base": "paquetes/desert", "adapters": [], "adapterUsers": {},
      "mayTalkOutside": {}, "catalog": ["src/texts/"], "exemptWords": {}, "exemptRules": {},
      "data": {}, "maxLines": 300
    }
  }
}
```

`src/program.ts` exporta `program`, el resultado de `programa`. La distribución de prueba exporta `program`,
`shown` y `manifest`, obtenidos de `componer`. El cargador comprueba que su manifiesto contiene el id, la versión
y la huella del código del programa declarado. Un programa sin `testDistribution` falla con un diagnóstico que
pide declarar la composición local de prueba. Para migrar el manifiesto anterior, `desert.program` pasa a señalar
el módulo que exporta `program = programa(...)` y `desert.testDistribution` señala la composición de prueba;
esta exporta también `manifest`. Eso no ata el programa a ninguna distribución: sus dependencias siguen siendo
DESERT y los contratos que pide. Las partes `tests/program/*.checks.ts` de DESERT siguen siendo obligatorias
en el runner:
corren todos los `programChecks`, los diarios conservados, la frontera de secretos y las mismas leyes de código
sobre la raíz del paquete independiente. No hay una selección de leyes reducida para programas instalables.

Un paquete enlazado fuera de la base, que Vitest no puede recorrer a través del enlace, corre la misma compuerta con
`desert/program-gate`: `programGate(raiz)` carga el programa con el cargador de la base (importaciones y frontera de
secretos antes de evaluarlo), comprueba su código y devuelve los grupos de las partes: comprobaciones derivadas,
diarios conservados, frontera de secretos y leyes del repositorio. El paquete registra cada comprobación de cada grupo
como una prueba propia; no elige cuáles.

Un programa importa únicamente `desert/...`, archivos propios dentro de sus raíces de código y módulos pedidos
explícitamente por contrato. Para estos últimos, `metadata.dependencies` y `desert.dependencies` declaran la
misma lista de `{ "kind": "contract", "name": "paquete/modulo-publico" }`: se admite ese módulo exacto,
no los internos del paquete. Esta lista controla importaciones; no sustituye las ofertas, pedidos, casos ni
compatibilidad de contratos. Una dependencia `{ "kind": "distribution", "name": "void" }` impide componer.
Los paquetes de distribución se identifican con `desert.kind: "distribution"`; la ley también rechaza uno de
ellos presentado como módulo de contrato. Controla importaciones estáticas, reexportaciones, consultas de tipos,
`require` e importaciones dinámicas; no admite especificadores dinámicos, alias privados ni escapes por enlaces.
La distribución de prueba vive fuera de las raíces productivas y puede importar el programa; el programa no
puede importarla. El cargador de la compuerta comprueba primero imports y secretos, antes de evaluar el programa
o esa distribución.
Llamar directamente a `programChecks` con módulos ya importados no reemplaza ese control previo ni las leyes.

Un ensamblador declara, por ejemplo, `"desert": { "kind": "distribution", "program": "src/distribution.ts", ... }`.
Esa entrada exporta la composición (`program` y `shown`) y puede importar las entradas públicas reservadas al
anfitrión. La excepción no se deduce del nombre del paquete, de la ubicación de la entrada ni de la ausencia de
`testDistribution`. La base usa esta declaración para la composición de su tienda de prueba; los controles de
secretos del registro y de sus herramientas siguen activos. Los programas instalados conservan su propia compuerta.

## Contratos de dos mitades (18/11)

Cada programa publica su propia oferta y su propio pedido (`ContractPackage`). Las acciones ofrecidas
vinculan una ruta local `herramienta/acción` con esquemas de entrada, salida y rechazo. Las herramientas
instaladas usan el id `programa/herramienta`. `componer` conserva las mitades y proyectores ya validados en
`program.contractSetup`, con una copia de sus declaraciones, y rechaza una ruta sin ejecutor instalado.
`startHouse` arma `createContractRuntime` con el estado y diario reales de esa apertura y entrega su
`context` como `contracts` a `startTools` y a la ejecución de las mentes. No exige cableado adicional del
programa. Cada apertura reconstruye sus cortes desde los hechos confirmados, con el registro y kit actuales.
`src/runtime/distributions/house-contracts.spec.ts` prueba respuesta, efecto, actor y cadena de causas,
lectura contractual y persistencia, permiso revocado antes y durante la espera, rechazo de negocio,
inconcluso y cierre con actos pendientes. También rechaza una declaración certificada sin ejecutor.
El contexto de la acción recibe `contracts["documentos-fiscales"].actions.emitir(entrada)` y `cut`.
La llamada conserva actor, causa y proceso y pasa por el ejecutor común, incluidos permisos vigentes,
interrupción y autoridad de efectos. El puerto prestado deja de servir al terminar la acción.

Una acción contractual devuelve `value` tanto al aceptar como al rechazar por negocio. El puerto valida ese
valor y recorta la respuesta al esquema pedido. Los fallos del core usan `status: "core-failure"`, separados
del rechazo de negocio: `forbidden`, `interrupted`, `invalid-reference`, `defect` e `inconclusive`.
El apagado y los resultados anidados inconclusos conservan su condición; no se convierten en rechazos.

Los proyectores reciben sólo un mapa inmutable del estado propio del proveedor y una clave, sin ejecutor
ni adaptadores. Deben ser puros. `objects.nombre.read(clave, cut)` recorta también objetos anidados, listas
y uniones. `contractHistory(inicial, slices, hechosConfirmados)` reconstruye el corte exacto por el plegado;
no reemplaza un corte ausente por lo último. Durante un pliegue corresponde el corte anterior al evento;
para reaccionar a un aviso corresponde el corte que trae ese aviso. El acceso exige pertenencia actual a
la casa, aunque el corte sea anterior. Las referencias incluyen proveedor y artefacto: `readReference`
rechaza redirigir una referencia histórica a otra instalación. Migrarlas requiere trabajo explícito.

El pedido lleva casos declarativos: preparación, actor, acciones, lecturas y avisos esperados.
`runContractCases` recibe los artefactos, las huellas de core y ejecutor y una fábrica de casas aisladas con
adaptadores falsos. La fábrica interpreta la preparación declarada; nunca debe abrir una casa viva. La
compuerta valida primero el alcance del caso y después lo corre por el motor y el puerto real. Devuelve
evidencia con huellas de artefactos, oferta, pedido, caso y observaciones, junto con su verificador local.
Una fila serializada sirve como evidencia para inspeccionar, pero no prueba por sí sola que se ejecutó:
para acreditarla en otro proceso hay que volver a correr la compuerta. No hay firma remota implementada.

`validateContractPrograms(programas, build, evidencias, verificar)` es la unión que llama `componer`:
devuelve `errors` completos con camino y `rows`. Sin ejecución, la fila dice «casos no comprobados».
Las comprobaciones estructurales se pueden usar antes de ejecutar casos con `structuralContractErrors`;
por sí solas no acreditan compatibilidad.
