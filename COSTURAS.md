# Las dos costuras del núcleo

En Kenon el núcleo está cosido a sus herramientas y a su mente en dos lugares. DESERT los abre así.

## 1. Los hechos: la casa escribe los suyos, el programa suma los propios (HECHO)

- `src/house/facts.ts` declara `houseCatalog`: lo que escribe toda casa, viva en ella el programa que viva
  (crear la casa, permisos, kits, escenas, actos y sus resultados, entradas, atender, avisos, reloj).
- Cada programa declara su catálogo y lo junta con `vocabulary(catalogo)`. De ahí salen el lector que valida,
  los esquemas para viajar por la puerta y `fact(...)` para escribir sus hechos.
- Cada hecho lleva `layer`: `"house"` o `"program"`. El código de la casa recibe `Event` y, para leer un hecho,
  primero tiene que comprobar `layer === "house"`; si no, no compila (un hecho de programa tiene `data: unknown`).
  El código del programa recibe `Event<SusHechos>` y lee todo con sus tipos.
- Un programa no puede usar un nombre que ya usa la casa: no compila, y si llega sin tipos, falla al arrancar.
- La capa no se guarda en la fila: la dice el nombre del hecho. Así, cuando un hecho pase de un programa a
  DESERT (porque ya lo usan dos), los registros viejos se siguen leyendo.

Qué quedó fuera de `houseCatalog` respecto de Kenon (es de su mente o de sus herramientas): curl, journeys,
plan, checkpoint, compactar, modelos, crédito, turnos, juez, reglas, notas, marcas, memoria, percepción.
`act` ya no lleva `evidence` (es de la mente).

| Origen del efecto de un acto | Hechos permitidos | Autor |
|---|---|---|
| Herramienta del programa, identidad o mente | Solo los de su `Tool.facts`; cada tipo tiene un único dueño. | Quien actúa. |
| Puerto `own` del programa | Los de la herramienta de su objeto; no puede tapar una acción declarada. | Quien actúa. |
| Core reservado `identities` | Casa, administrando; sobre `identities/<actor>`, solo su escena y nombre propios. | Quien actúa. |
| Actos propios de la casa y motor | Hechos que ya ofrecen y hechos internos de ejecución, avisos y reloj. | El actor correspondiente. |

`effect-authority.ts` valida el lote antes de agregar los hechos de ejecución. Rechaza todo el lote indicando el
primer efecto no permitido. `composed-authority.ts` rechaza dueños de hechos repetidos y colisiones de `own` al
componer. El préstamo reconoce sus comandos opacos de credenciales sin ejecutarlos durante la validación.
`kit-set` valida presencia, herramienta dada y acciones existentes sin repetir, considerando el orden del lote.
La escritura directa del bus confiable y la lectura histórica conservan su contrato; esta costura cierra los
resultados de acciones. El bus público de arranque se cierra en el carril de la mente.

## 2. El estado: cada herramienta guarda lo suyo (HECHO)

- El estado de la casa (`HouseState`) queda con lo que es de toda casa: permisos, kits, última escena de cada autor, quién tiene qué a la
  vista, actos en curso, entradas, avisos de atención. Ninguna parte de ninguna herramienta.
- Un programa se describe con un solo tipo: `{ fact: SusHechos; tools: { ventas: ...; pagos: ... } }`.
  El estado completo es `State<Programa>`: el de la casa más `tools`, con la parte de cada herramienta bajo su nombre.
- El programa junta las partes en `Slices<Programa>`: de dónde arranca cada una y cómo avanza con cada hecho.
  Si a una herramienta le falta su paso, no compila. Una herramienta puede leer la parte de otra (tal como
  estaba antes del hecho), pero solo escribe la suya.
- Ejecutar un acto (`execute`) reconoce al actor `mind:<herramienta>`, sin traer el motor de la mente ni journeys.
  Comprueba `allowedAct` también al ejecutar una acción anidada, con el mismo autor. Las condiciones previas van
  en `offered`, `stops`, `among` o `holding`; `refuse` ya no existe. El programa ofrece actos propios por `own`,
  solo para identidades. La casa agrega preferencias, atender y dejar de atender para identidades;
  identidades y mentes escriben su propia `scene`. Una mente no recibe los actos de `own` del programa.
- `Tool.start` puede ser la mente en cero: escucha hechos y llama `ToolStartup.act({ act, target, input })`.
  La casa fija `mind:<id de esa herramienta>` y pasa por `execute`, con su kit, su escena y sus adaptadores.
  La promesa siempre resuelve: difiere a otra tarea, conserva la causa de la escucha original incluso en
  continuaciones, y rechaza si esa escritura o el `together` del pedido se deshicieron. Sus escrituras y las de
  sus oyentes quedan juntas o se deshacen. La cadena propia admite 32 actos; el siguiente recibe rechazo y deja un diagnóstico visible. El proceso con
  reloj propio no cuenta como cadena. Los efectos de los actos quedan sujetos al cierre de autoridad del kit.
  El bus solo escribe credenciales originales y `wake-at` propio, con autor fijado por la casa; rechaza todo
  otro hecho o autor. Un ID nuevo empieza por `encodeURIComponent(herramienta) + ":"`; conserva el primer dueño,
  aun cancelado o anterior a esta versión. El espacio `attention:[…]` queda reservado a la casa.
  El bus del arranque no escribe `woke`. Las fechas pendientes sobreviven al reinicio; al arrancar, el programa revisa
  su estado para recuperar trabajo de un despertar consumido justo al cerrar, sin repetir lo cumplido.
  No se publica el motor, registro de herramientas, custodia ni resolvedor; cerrar invalida el puerto.
- Las acciones y los arranques reciben métodos públicos de adaptadores declarados y operaciones de vínculos.
  La custodia y la limpieza de secretos son capacidades internas del motor; `KeyStore` queda solo para adopción.

Qué cambió respecto de Kenon en este paso:
- `acts` ya no es la lista de todos los actos desde el principio: son los actos abiertos (sin resultado todavía).
  `results` (lista de todos los resultados) no está: era de la mente.
- `identityView` adapta actividad y atención a quien mira; las entradas de actividad son comunes a todas las identidades.
- `granted` sigue dando la herramienta entera. `kit-set` permite a quien administra recortar sus acciones:
  una identidad sin kit conserva todas; una mente sin kit no tiene ninguna y solo actúa en su propia herramienta.
  Quien administra no tiene recorte; con `identities: true` tiene todas las herramientas sin asignarlas y recibe sus recordatorios. Al recibir la administración pierde todos sus kits; no vuelven al devolverla.
  `null` da todas, `[]` ninguna; al perder la herramienta se pierde el kit.
  Cualquier hecho de la casa que retire una acción corta la señal de su acto y de sus hijos en curso,
  desde el oyente vivo, nunca desde el plegado; los actos independientes conservan su señal. Cada uso de sus
  adaptadores vuelve a comprobar esa señal sin cambiar `holds`. El cierre pregunta el kit antes de escribir;
  lo cortado termina `interrupted · sacada`. Un lote ya iniciado o un éxito que salió al mundo se conserva con
  `sacada` al lado. Un anidado ya escrito permanece; un padre cortado no inicia más anidados y recibe
  `interrupted · sacada` como resultado del contrato. Un defecto independiente conserva su diagnóstico;
  el motivo de la señal y el rechazo del adaptador por el corte no son defectos.
- La escena está en la casa: última por autor, general y partes por identidad, todas leídas por todos.
  `Need.to` elige una identidad presente que tenga al menos una acción de la herramienta; si no cumple esa condición,
  la necesidad llega a quienes tienen al menos una acción. Sigue calculada por código.
- Los textos con que la casa rechaza un acto están en español, como los de la superficie.

## 3. La superficie sobre la casa (HECHO)

- `src/surface/bridge/`: el puente. Cualquier herramienta de la casa se vuelve una herramienta de la superficie
  a partir de su vista y de los esquemas de sus actos (`anyToolScreen`). Una herramienta que necesita más que
  filas y actos trae su propia pantalla (`Screens`).
- Las palabras las pone el programa (`SurfaceWords`): nombre y tecla de cada herramienta, cada acto y cada campo.
  Si falta una palabra, es un defecto del programa y se dice cuál falta; nunca se muestra un código en su lugar.
- `src/runtime/house-runtime.ts`: `startHouse` arranca la casa de un programa (registro, secretos aparte,
  herramientas, reloj) y `localPorts` le da la casa a una superficie en el mismo proceso, como un integrante.
- `src/keychain/`: protege posiciones por estructura antes de que una acción reciba su entrada,
  y al escribir hechos directos. No limpia repeticiones de texto. `positions/` mantiene el alcance de referencias;
  `history/` revisa acciones y hechos anteriores. Los valores quedan en custodia y los plegados reciben referencias.
- `src/tools/inputs/`: separa restricciones de material y esquema de referencias; guarda el traspaso privado,
  de un uso, del editor de preguntas. `asking-parts.ts` pregunta como secreto y preserva su material multilínea.
  `src/checks/opacity/` exige casos ejecutados para cada posición secreta y observa qué recibe cada acción.
- `src/keychain/custody/`: una custodia cifrada con una llave externa por secreto y otra de autenticación por casa, ingreso
  provisional, vínculos autenticados con revisión, reservas de uso y recuperación. La identidad aleatoria persiste
  al mover la casa; el proveedor recibe esa identidad y transporta llaves en búferes por entrada estándar. La composición
  exige proveedor si hay posiciones secretas; las fallas de purga llegan con tipo y quedan pendientes.
  La bóveda anterior se adopta conservando IDs,
  después de la revisión histórica y antes del arranque. `secretKeys` se queda en la composición, fuera de los
  puertos de herramientas. `CredentialLedger` comparte el lote del motor mediante entradas silenciosas
  autenticadas; limpiar material espera al cierre del lote.
- `src/adapters/`: compone métodos con entrada, salida y permisos explícitos. Solo la fábrica recibe
  resolución; la acción recibe proxies revocables y efectos de vínculos. Los errores cruzan como códigos cerrados.
  `src/tools/startup-contract.ts` separa el arranque público de `Execution`. Ver «Adaptadores declarados»
  en `PROGRAMA.md`; las leyes transitivas quedan para el paso 4.
- Probado en una terminal real con el programa de prueba: `node tests/support/shop-open.ts`.

## 4. El router: una sola lógica para todas las superficies (HECHO)

Decisión de Franco (10/11): viaja el estado, y hay un router compartido por todos los renderers, para que la
interacción con la casa sea la misma en todas las superficies.

- `src/surface/router/router.ts`: `startRouter`. Tiene la sesión del dispositivo (dónde está parado), recibe
  intenciones, entrega la pantalla, corre los actos y avisa cada vez que la pantalla pudo cambiar: cambió la casa,
  terminó un acto o pasó el tiempo.
- `src/surface/bridge/assembly/house-router.ts`: `houseRouter(ports, palabras)`. Es lo único que un renderer recibe de un
  programa: las herramientas con sus palabras, la barra (conexión y hora) y los cambios de la casa.
- La superficie abre y busca también herramientas fuera del kit; sus acciones quedan apagadas con su motivo.
  Actividad muestra lo escrito por otras personas en toda la casa; Atención solo llega a quien tiene al menos una acción de la herramienta.
- Un renderer hace dos cosas: dibuja `router.screen()` y traduce lo suyo a `router.send(intención)`.
  La terminal (`doors/terminal/boot.ts`) ya es eso. Web, iPhone y Android usan el mismo router.

## 5. Las reglas de la terminal, garantizadas (HECHO, 11/11)

Franco: «una regla sin garantía es un deseo». Cada regla aprobada tiene su garantía o figura como deuda con nombre.

- `tests/laws/rules.json` es la lista única de reglas, cada una con cómo se garantiza (tipo, rechazo al componer,
  prueba derivada, prueba de la superficie) y dónde. `pnpm rules` escribe `GARANTIAS.md`. Una ley del gate no deja
  sumar una regla sin garantía ni cambiar la cantidad de deudas sin querer.
- Las pruebas derivadas de un programa corren solas en su gate, exactamente una vez entre ocho archivos
  (`tests/program/part-*.checks.ts`): el programa dice dónde se compone (`package.json`, `desert.program`) y no
  elige cuáles corren. Se reparten salteadas por posición, también las de registros guardados, conservando grupos,
  nombres e informes de caminos recorridos. El patrón de archivos ya las encuentra al subir de base.
  `tests/program/parts.ts` fija la cantidad; `tests/laws/gate.spec.ts` exige cada archivo y su índice en disco.
  Una parte vacía registra una comprobación explícita; nunca oculta errores de carga ni de ejecución.
- Una acción se declara por partes (`tools/promises.ts`): `name` (lo que dice su fila, en minúscula), `enter` (el
  verbo que confirma), `undoable`, `purpose`, `key`, `on`, y cuando hace falta `title`, `under`, `leaves`,
  `changes`, `datum`, `confirms`, `today`, `also`, `offered`, `refuses`. Lo que se rechaza al componer: un nombre
  que es una oración, lo que confirma que no es un verbo, una causa larga o con punto, la segunda persona, una
  pregunta con signos, un dato con forma sin máscara, una acción que no se deshace y no dice qué confirma, una
  acción nombrada como un dato que su herramienta lee y que no declara cambiarlo.
- Campos (`fields/fields.ts`): `digits` (números con forma), `padded`, `handle`, `thing` (elige una cosa de una
  herramienta, con el nombre de su ausencia), `someOf` (varias de un conjunto, con casillas), `holding` (el dato
  sabe por qué no vale).
- Lo que se cambia, se cambia donde se lee: la fila de un dato que una acción cambia lleva su tecla, lo que vale
  hoy y abre esa acción.
- Los textos propios de DESERT pasan por las mismas guardias (`tools/own-words.spec.ts`).

## Abierto
- **La puerta.** El servidor local y la terminal externa ya llevan `identityView`, con el router del lado de la
  terminal. Todos los integrantes leen la misma casa; el kit limita acciones, no lectura. Quedan la sesión de
  agentes y las llaves reales del paso 3.
- **Tamaño.** El estado inicial viaja completo por tramos; después viajan los cambios y solo el agregado de las
  listas que crecen. El historial completo sigue en memoria: la paginación de lectura no forma parte de este
  servidor. El límite de un marco ya no limita el tamaño total del estado.
- **Lecturas de cada herramienta.** Hoy el puente lee la vista de texto de la herramienta y la vuelve filas.
  Para Capibara conviene que cada herramienta declare sus filas con tipos. Se define con las herramientas de Capibara.
- **Motivos de rechazo.** Son textos. Desde el 11/11 una causa es un dato corto, sin punto y sin segunda persona
  (si no, el programa no arranca). Falta que sean códigos de un conjunto cerrado y que la superficie ponga las
  palabras (`Código · Causa · Objeto`).

- **Un propósito largo se corta.** CERRADA (11/11): el propósito se declara y no se muestra en la fila; a la
  derecha va un dato o nada. El nombre de una acción y la causa de un rechazo tienen largo máximo al componer el
  programa. Queda el porqué de Atención, que todavía se corta con «…» si no entra.
- **Una herramienta que el programa suma después no es de nadie.** Quien crea la casa recibe las herramientas que
  el programa tiene ese día. Si el programa suma una después, no la tiene nadie, tampoco quien administra, y sin
  Equipo no hay cómo dársela. Hay que decidir: o quien administra tiene siempre todas, o la casa se las da al abrir.
- **Un programa escribe hechos de la casa.** CERRADA (14/11, kit 6c): sus actos ya no pueden hacerlo.
  Usuarios, en Capibara, deberá usar los actos del core al adoptar esta versión.
- **Una fila que lleva a la cosa de otra herramienta.** La venta muestra sus pagos, envíos y documentos como
  renglones quietos; deberían abrir esa cosa en su herramienta.
- **Un campo completo que no avanza no dice por qué.** CERRADA EN PARTE (11/11): un campo puede declarar por qué
  un dato completo no vale (`holding`, en `fields/fields.ts`): la pregunta lo dice ahí mismo y ninguna acción
  corre con ese dato. Falta usarlo en las máscaras de la casa: un día que no existe («30/02/2026») todavía entra
  y enter no hace nada.
- **Después de un rechazo no se ve la pregunta.** El motivo ocupa el lugar de la pregunta que se estaba
  contestando (así lo dice la regla aprobada: el error es lo que pregunta de nuevo).
- **Un valor sugerido se edita, no se reemplaza.** Una cantidad que abre en «1» y recibe un «2» queda en «12».
  Falta decidir si la primera tecla reemplaza lo sugerido (y solo se edita lo que la cosa ya tenía).
- **Un stack que no entra entero desaparece.** Con poca altura, al abrir una cosa el cursor queda en Acciones y
  sus datos quedan arriba, fuera de la ventana, contados en «↑ n más». Se podría mostrar la cola del stack anterior.

- **Cómo lee un programa los hechos de su pasado.** El registro guarda hechos para siempre. Hoy, si el programa
  deja de declarar un tipo que su registro tiene, la casa no abre y dice cuál es y dónde está (HECHO, 10/11); y lo
  guardado entre arranques lleva la forma del programa (los hechos que lee y dónde empieza su estado), así que con
  otra forma se vuelve a recorrer el registro entero (HECHO, 10/11). Falta decidir, antes de la primera casa en
  producción, cómo sigue leyendo un programa un tipo de hecho que ya no escribe. El cambio de cálculos ya se detecta con `projectionVersion` y la versión de la base (A04);
  la compuerta compara actualizar desde evidencia de reutilización efectiva en modo manual, o invalidación por cambio de código en modo de huella con reconstruir todo.
- **Las preferencias son de la casa, no del programa.** Hoy son tres y fijas (lo apagado, lo ajeno, las listas
  vacías). Si un programa quiere las suyas, tiene que poder declararlas.

- **Actividad crece con lo que nadie abre.** Cada cosa que otro tocó queda hasta que se la abre; falta marcar
  todo como visto de una vez, y decidir cuánto se guarda. La superficie tampoco deja nunca de «tener a la vista»
  lo que abrió.
- **Buscar recorre todo.** Cada tecla vuelve a mirar todas las cosas de la herramienta; con muchas hará falta un
  índice.

## Orden de trabajo
1. Journal: hechos por programa, bus, proyecciones, reloj, guardado en SQLite. HECHO.
2. Casa y motor de herramientas con estado por herramienta. HECHO.
3. Puente de la superficie y casa corriendo en un proceso, con secretos fuera del registro. HECHO.
4. Router compartido por todos los renderers. HECHO.
5. La puerta local: estado inicial por tramos y cambios por campos, mapas y sufijos de listas. HECHO.
6. Emparejar dispositivos y herramienta de equipo (permisos y conexiones).
7. Core de muchas casas.

## La frontera de secretos, completa

`tests/laws/secret-boundaries.ts` recorre el grafo de módulos; `secret-syntax.ts` reconoce imports, tipos y escapes;
`secret-types.ts` sigue tipos inferidos y alias para impedir que una fábrica devuelva su resolvedor.
`secret-context.spec.ts` comprueba el contrato público real y una variante rota con una capacidad bajo otro nombre.
`program-secret-boundaries.ts` aplica la política al programa declarado en `desert.program`; su prueba es una
comprobación más de las partes de `tests/program/registration.ts` y entra una vez en la compuerta del consumidor. La frontera de imports públicos
es explícita en `secret-public-api.ts`; no se confía en un módulo desconocido ni se omite una dependencia transitiva.

La marca de esquema garantiza referencias antes de callbacks y resolución solo por adaptadores declarados.
La composición, custodia y editor son partes confiables de la base. El adaptador sigue siendo responsable del uso
correcto y de no codificar material en una respuesta pública. Las leyes no constituyen aislamiento de JavaScript,
no certifican lo no revisable en la historia ni borran copias externas. El ancla de la custodia detecta restauraciones
anteriores y exige aceptación explícita; no recrea llaves purgadas.

`src/checks/adapter-test.ts`, exportado por `testing.ts`, prueba métodos con referencias provisionales,
custodia temporal cifrada, proveedor en memoria y controles reales. No llama al llavero ni elige un transporte:
el test inyecta uno falso. Para lotes y reinicios se usa la casa real con `MemoryHouseKeys`.
El recorrido de firma y todos los cambios de migración están en `PROGRAMA.md`, «Una llave de firma» y «Probar el
adaptador y subir desde la base anterior»; declarar una marca no implementa la conexión fiscal.

## Un escritor por almacenamiento (A03)

`SqliteJournal` resuelve el archivo canónico y adquiere una transacción SQLite auxiliar antes de abrir el registro.
`journalKept` usa la misma exclusión, incluso cuando solo consulta los datos del arranque; `journalReader` abre por
la misma identidad sin tomar la exclusión de escritor. `startHouse` hereda este contrato sin cambiar su firma.
La transición desde la versión anterior exige detener todos los procesos. Se retira a propósito el puente
`journal.lock`: no se crea ni se lee, y el dueño lo limpia solo después de adquirir la exclusión, nunca al cerrar.
El auxiliar no se elimina: la exclusión termina al cerrar su conexión o morir el proceso. Una eliminación o
sustitución externa hace que el dueño rechace nuevas escrituras con `WriterLeaseLost` y libere al cerrar sin guardar.
Todos los descriptores de las bases, incluidas las copias de registros conservados, quedan a cargo de SQLite.

Los hechos anteriores no cambian. Los plegados de formato anterior se descartan juntos y se reconstruyen; los de
formato 4 llevan una suma SHA-256 del contenido serializado, además de la identidad persistente de su registro y una secuencia segura dentro de él y cada paso exige el siguiente número. El guardado del grupo
es atómico y una restauración fallida no publica plegados. La decisión de compatibilidad queda concentrada en
`snapshot-format.ts`, que también exige la identidad de cálculos del programa y de la base (A04).
Cada descarte deja un aviso con motivo en stderr; al restaurar la casa, también en su registro de diagnósticos.
La identidad se asigna al abrir registros anteriores. Una instantánea semánticamente distinta del registro se descarta incluso si conserva una suma válida.
La primera `codeProjectionVersion` de una declaración fija la huella de código y Node durante el proceso;
`projectionVersion` lee los bytes actuales para las comprobaciones. Una restauración
fallida impide guardar plegados durante toda la vida de esa instancia, aun si después logra reintentarlo.

La versión de cálculos distingue un string manual de `CodeProjectionVersion`: no se deduce el modo del texto.
Los avisos de reconstrucción son de la instancia (`storageNotices()`), no hechos. La toma del escritor exige una
escritura SQLite real, sin cambiar permisos del auxiliar; una carpeta renombrada hace perder la exclusión al dueño.

Si el proceso lee o copia por su cuenta el auxiliar con funciones de archivos, suelta su exclusión POSIX.
La base nunca lo hace; `copyJournal` es la copia permitida del registro abierto. Un avance ajeno del registro
o una transacción de escritura ajena hacen fallar con `WriterLeaseLost`, sin escritura parcial ni reintento
en esa instancia. `WriterAlreadyOpen` distingue la contención al abrir. SQLite crea auxiliares nuevos en modo 600.
Los plegados se conservan por identidad y versión: al abrir la casa se verifica el prefijo desde cero antes de retomar la cola.
`renewKeptJournals`, disponible desde testing, renueva la evidencia manual de una entrega sin nuevos hechos.
La compuerta resume la lista de comprobaciones en `tests/program/setup.ts` antes de lanzar las partes; cada
parte coteja su lista. Quien usa la base incorpora ese archivo en `globalSetup` de Vitest.

`bus.together` retira de la cola los hechos que agregó una escritura deshecha, antes de continuar la entrega.
`SqliteJournal.batch` abre un punto de guardado por nivel: restaura hechos, secuencia y plegados del nivel
fallido, y confirmar uno interno no impide que la escritura externa deshaga todo. El punto anidado guarda los
plegados por referencia y solo el más externo los copia: un lote largo no copia los plegados por cada hecho. Las casas de prueba
comprueban al cerrar que no hay causas ausentes en todo el registro.
El reloj registra su restauración en cada escritura abierta con `onRollback`: si una falla, recupera sus fechas
y rearma la anterior. El bus de arranque sigue exponiendo solo `on`, `emit` y `together`.

- Identidades del core vive en `src/tools/core/identities/`: usa el contrato declarado para la Lista y los Hilos,
  sin slice ni proceso. `startHouse` la compone solo con `identities: true`; `houseTools` incorpora sus palabras.
  El estado sigue en `House`, y sus acciones producen hechos de casa mediante el lote habitual.
  El límite de escritura reserva `identities` fuera de `granted` y `kit-set`; las derivadas comprueban ese rechazo
  además del permiso de quien administra. La preferencia de lo ajeno no oculta esta pieza del Sistema.

- El kit de Identidades se declara en `kit-actions.ts` y `kit-cases.ts`; el catálogo excluye el core y limita el
  menú a nueve filas de edición, contando la herramienta entera cuando el destinatario es una identidad. `kit-screen.ts` y `kit-views.ts` componen Lista, filas y Hilos existentes desde esas
  declaraciones, incluidos menús que se pueden leer aunque sus acciones estén apagadas. No dibuja celdas ni crea
  otro router. `houseTools` aplica esa composición únicamente a Identidades.
  La edición vuelve a leer el kit al ejecutar; `kit-effects.ts` emite los hechos existentes en un lote: una acción conserva las
  demás; dar todo elimina el recorte de esa herramienta, y sacar todo elimina herramienta y recorte.
  Las mentes son destinatarios distintos de las identidades: `kit-checks.ts` deriva su dominio permitido y comprueba
  tanto la ausencia de opciones ajenas como el rechazo sin cambios de una llamada directa.

- La escena de Identidades se declara en `identity-scene.ts`: reutiliza el límite y la validación de General del
  contrato de casa y escribe `scene` a nombre del actor. `allowedAct` admite esa acción para miembros presentes;
  el `offered` declarado compara una sola vez la fila con el actor, tanto para pintar como para ejecutar.
  Las otras acciones conservan el permiso de administrar. Las derivadas comprueban la excepción sin dar kit al core.
  `identity-reading.ts` lee la última general y selecciona solo `to[by]` para el objeto; `scene-reading.ts` compone
  renglones del tipo existente y `kit-views.ts` los integra también en Mentes. No cambia el contrato compartido de
  escenas ni su plegado. La terminal escribe General; las partes dirigidas permanecen en el acto de casa.
  Al adoptar `identities: true`, un programa reserva el id del core, usa la regla pública del identificador y distingue
  `names`, `removed` y `grants`: el nombre y la fila sobreviven a sacar, mientras la readmisión no restaura herramientas.

## Servidor local de la casa (paso 1)

`src/doors/socket/server/serve.ts` compone una casa ya abierta con el protocolo local. El acceso a `node:net` y al sistema
de archivos está en `src/doors/socket/server/socket-listener.ts`, respetando la separación del sistema operativo de la ley 10.
La puerta usa `tools.state`, `tools.act`, `tools.prepare`, el bus y el diario que `startHouse` ya devuelve. El único agregado a
`house-runtime.ts` es devolver `home`, para verificar que la carpeta del socket pertenece a ese escritor. Ningún cliente importa almacenamiento para conectarse. El índice de pedidos se reconstruye del
registro existente, sin tabla adicional ni nueva versión de cálculo: el identificador viaja como causa del acto.

Los módulos de sesión y entrega admiten streams para probar el protocolo sin abrir sockets. Las pruebas Unix y de
procesos separados siguen siendo necesarias para comprobar permisos, señales y limpieza del enlace real. La sesión
de agentes aún se debe: autenticar esa puerta no habilita el camino de terminal ni elimina su futura escena.

## Terminal externa (paso 2)

La conexión y `socketPorts` están en `src/doors/socket/`; el sistema operativo, el arranque independiente y la
reconexión acompañan a sus archivos en `src/doors/`. El router y todos los archivos del dibujante conservan su código.
La composición del programa es estática: el manifiesto elige un ejecutable, no un import dinámico. El ejecutable
coopera con el handshake de `runProgramServer`; `openProgramTerminal` recibe la composición ya importada.
No se cambia la huella de cálculos ni se exceptúan imports de sus leyes.

Los presupuestos de socket, programs y texts crecen exactamente por los archivos agregados y el cierre de
pedidos incompletos al reconstruir el índice; cada propósito está en `tests/laws/tree.json`. Las garantías
246–250 y la evidencia adicional de la 11 describen esta puerta. La prueba de marcos también acompaña las
reglas de terminal 1–106 que ya tienen garantía; no cancela las deudas existentes.

Las pruebas de muerte de proceso llevan los mismos marcos por IPC para comprobar SQLite y el protocolo aun
cuando la caja impide escuchar un socket Unix. No sustituyen las pruebas Unix: el arranque real, el socket viejo,
los dos clientes en pseudo-terminal y sus colores al reconectar se comprueban además por ese camino.


## Arreglo adversario del servidor (14/11)

El protocolo 3 manda un encabezado `estado` con base, secuencia, longitud y huella, seguido de tramos de 64 KiB.
`state-patch.ts` divide recursivamente por campos y claves de mapas; las listas que crecen envían su sufijo.
`state-hash.ts` calcula una huella semántica del estado completo y reutiliza nodos inmutables. `state-delivery.ts`
prepara una vez por identidad y secuencia; `state-receiver.ts` arma aparte y verifica antes de publicar.
Una discrepancia conserva la última vista válida, se dice en la terminal y pide el estado completo; la casa deja
su aviso. `peer-writer.ts` respeta backpressure sin esperar a otros; limita la cola posterior y el tiempo sin drenaje.
El estado completo supera el tamaño de un marco sin subir ese límite. `socket-cost.spec.ts` mide el acto completo,
con SQLite, contra local, con 100, 2.000 y 20.000 entradas y una o cinco terminales.

`HousePorts.observe?` distingue las dos observaciones automáticas en `notices.ts` y `house-tools.ts` de los actos
pedidos por la persona. El router y el dibujante siguen intactos; sin `observe` se llama al `act` local como antes.
`defecto` deja de aceptar la entrada del cliente: solo herramienta, destino y acción, comprobados contra el kit.
El rechazo de mentes se combina con `present`, la misma pertenencia que consulta la casa. La comprobación redundante
al inicio de cada pedido se retiró: el aviso del bus cierra inmediatamente la conexión y `receivePeer` exige que
siga viva. La condición redundante M06 de las respuestas también se retiró: `peer.send` no escribe en una
conexión terminada. La retirada se prueba antes de atender otro pedido y antes de enviar resultados pendientes.

`house-output.ts` abre el archivo privado de salida del proceso lanzado; `terminal-error.ts` limita los errores
visibles al catálogo. La cancelación de un arranque libera recursos sin anunciar un cierre exitoso. La huella de
contenido acompaña al identificador del pedido en la causa; el libro recupera también los pedidos anteriores sin
huella a partir del contenido registrado. Si falló toda escritura, el resultado final vive solo en ese proceso.

La huella del protocolo 3 compone partes inmutables con escalares canónicos por valor, sin bytes internos de V8.
El detalle de tipos está en `PROGRAMA.md`. El pedido remoto rechaza datos que JSON perdería o cambiaría,
incluidos -0 y no finitos, antes de escribir. La entrada tiene cinco segundos totales; tres estados inválidos
consecutivos en la misma secuencia cierran la terminal con texto del catálogo y salida 1. Cada conexión deja
un solo aviso de resincronización en la salida de la casa.

En la segunda vuelta, `peer-input.ts` pausa la entrada y procesa hasta 16 marcos por vuelta, conservando el
trozo pendiente sin copiarlo. `peer-writer.ts` cuenta un segundo ocioso del bucle para el drenaje; conserva el
tope de 1 MiB posterior. `request-budget.ts` limita a 32 pedidos no actuantes por segundo móvil y ocho esperas
vivas por conexión, con rechazo visible. Una introducción nueva desplaza la más antigua sin presentar, dentro
de los mismos 32 lugares. El reloj de la terminal se toma únicamente de cada bienvenida fresca.
`house-output-process.ts` recoge ambas salidas del hijo hasta su cierre; `bounded-output.ts` las limita a 1 MiB
sobre el descriptor privado validado, reemplazando el tramo anterior al llenarse. No reabre una ruta ni sigue
enlaces. El error de arranque devuelve el rechazo después de recoger su causa segura.
`socket-cost.spec.ts` exige bytes y cantidad de envíos estables con el historial; los tiempos local y remoto se
miden alternados y solo se informan. Los plazos de presión se verifican con relojes controlados.

`client-requests.ts` conserva las consultas inciertas rechazadas por cupo y las reintenta al segundo, con un
solo temporizador cancelable por conjunto pendiente. La recuperación sigue consultando; nunca repite actos.


## El programa lee el estado, no lo cambia

`journal/readonly-state.ts` mantiene vistas de solo lectura por referencia; protege cada parte al accederla,
sin copiar el estado entero por lectura. `State` y los argumentos de `Slices.step` llevan el contrato profundo
para mapas, conjuntos, listas y objetos. Arranques, efectos y el estado público usan `readonlyPorts`;
`identityView` también protege los objetos que arma para actos y superficies. La resolución de declaraciones
de la custodia termina de armar su vista antes de protegerla. Un intento de escritura falla a la vista.

Un programa que sube debe devolver datos nuevos desde sus cálculos y pedir acciones para cambiar la casa.
No puede guardar memoria privada en el estado recibido. Los proxies no sirven como entrada directa a
`structuredClone`: el programa arma sus propios datos cuando necesita una copia. Los resultados que reutilizan
partes leídas sí se convierten internamente antes de guardarse; el programa no recibe el objeto interno.

`houseProjections` exige verificar el estado guardado y el reloj contra el prefijo plegado desde cero, antes
que el arranque o cualquier cola puedan usarlos. `verify-saved` conecta esa comprobación al almacenamiento y
`verify-projections` compara todos los plegados dependientes. Una diferencia descarta el grupo con su aviso;
la compuerta de actualización conserva esa diferencia como falla de evidencia. Verificar al abrir cuesta un
plegado del prefijo, aun con instantáneas válidas. La lectura ordinaria no paga ese costo.
