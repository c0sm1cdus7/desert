# Las dos costuras del núcleo

En Kenon el núcleo está cosido a sus herramientas y a su mente en dos lugares. DESERT los abre así.

## 1. Los hechos: la casa escribe los suyos, el programa suma los propios (HECHO)

- `src/journal/events.ts` declara `houseCatalog`: lo que escribe toda casa, viva en ella el programa que viva
  (crear la casa, permisos, canales, actos y sus resultados, entradas, atender, avisos, reloj).
- Cada programa declara su catálogo y lo junta con `vocabulary(catalogo)`. De ahí salen el lector que valida,
  los esquemas para viajar por la puerta y `fact(...)` para escribir sus hechos.
- Cada hecho lleva `layer`: `"house"` o `"program"`. El código de la casa recibe `Event` y, para leer un hecho,
  primero tiene que comprobar `layer === "house"`; si no, no compila (un hecho de programa tiene `data: unknown`).
  El código del programa recibe `Event<SusHechos>` y lee todo con sus tipos.
- Un programa no puede usar un nombre que ya usa la casa: no compila, y si llega sin tipos, falla al arrancar.
- La capa no se guarda en la fila: la dice el nombre del hecho. Así, cuando un hecho pase de un programa a
  DESERT (porque ya lo usan dos), los registros viejos se siguen leyendo.

Qué quedó fuera de `houseCatalog` respecto de Kenon (es de su mente o de sus herramientas): curl, journeys,
plan, checkpoint, compactar, modelos, crédito, turnos, juez, reglas, notas, marcas, escena, memoria, percepción.
`act` ya no lleva `evidence` (es de la mente).

## 2. El estado: cada herramienta guarda lo suyo (HECHO)

- El estado de la casa (`HouseState`) queda con lo que es de toda casa: permisos, canales, quién tiene qué a la
  vista, actos en curso, entradas, avisos de atención. Ninguna parte de ninguna herramienta.
- Un programa se describe con un solo tipo: `{ fact: SusHechos; tools: { ventas: ...; pagos: ... } }`.
  El estado completo es `State<Programa>`: el de la casa más `tools`, con la parte de cada herramienta bajo su nombre.
- El programa junta las partes en `Slices<Programa>`: de dónde arranca cada una y cómo avanza con cada hecho.
  Si a una herramienta le falta su paso, no compila. Una herramienta puede leer la parte de otra (tal como
  estaba antes del hecho), pero solo escribe la suya.
- Ejecutar un acto (`execute`) no conoce journeys ni mente. El programa puede vetar un acto por el puerto `refuse`
  y ofrecer actos propios fuera de las herramientas por `own`; atender y dejar de atender los ofrece toda casa.
- Las llaves (`KeyStore`) y el borrado de secretos (`secrets`) son puertos del motor.

Qué cambió respecto de Kenon en este paso:
- `acts` ya no es la lista de todos los actos desde el principio: son los actos abiertos (sin resultado todavía).
  `results` (lista de todos los resultados) no está: era de la mente.
- `visible` decide por canal, no por el nombre de la herramienta `communicator`.
- Un permiso es la herramienta entera; no queda la regla de los nombres con punto (era historia de Kenon).
- Los textos con que la casa rechaza un acto están en español, como los de la superficie.

## 3. La superficie sobre la casa (HECHO)

- `src/surface/bridge/`: el puente. Cualquier herramienta de la casa se vuelve una herramienta de la superficie
  a partir de su vista y de los esquemas de sus actos (`anyToolScreen`). Una herramienta que necesita más que
  filas y actos trae su propia pantalla (`Screens`).
- Las palabras las pone el programa (`SurfaceWords`): nombre y tecla de cada herramienta, cada acto y cada campo.
  Si falta una palabra, es un defecto del programa y se dice cuál falta; nunca se muestra un código en su lugar.
- `src/programs/house-runtime.ts`: `startHouse` arranca la casa de un programa (registro, secretos aparte,
  herramientas, reloj) y `localPorts` le da la casa a una superficie en el mismo proceso, como un integrante.
- `src/adapters/secrets/`: un valor que el esquema de un acto marca como secreto no llega al registro; queda
  en un archivo aparte y en el registro va una referencia.
- Probado en una terminal real con el programa de prueba: `node tests/support/shop-open.ts`.

## 4. El router: una sola lógica para todas las superficies (HECHO)

Decisión de Franco (10/11): viaja el estado, y hay un router compartido por todos los renderers, para que la
interacción con la casa sea la misma en todas las superficies.

- `src/surface/router.ts`: `startRouter`. Tiene la sesión del dispositivo (dónde está parado), recibe
  intenciones, entrega la pantalla, corre los actos y avisa cada vez que la pantalla pudo cambiar: cambió la casa,
  terminó un acto o pasó el tiempo.
- `src/surface/bridge/house-router.ts`: `houseRouter(ports, palabras)`. Es lo único que un renderer recibe de un
  programa: las herramientas con sus palabras, la barra (conexión y hora) y los cambios de la casa.
- Un renderer hace dos cosas: dibuja `router.screen()` y traduce lo suyo a `router.send(intención)`.
  La terminal (`doors/terminal/boot.ts`) ya es eso. Web, iPhone y Android usan el mismo router.

## 5. Las reglas de la terminal, garantizadas (HECHO, 11/11)

Franco: «una regla sin garantía es un deseo». Cada regla aprobada tiene su garantía o figura como deuda con nombre.

- `tests/laws/rules.json` es la lista única de reglas, cada una con cómo se garantiza (tipo, rechazo al componer,
  prueba derivada, prueba de la superficie) y dónde. `pnpm rules` escribe `GARANTIAS.md`. Una ley del gate no deja
  sumar una regla sin garantía ni cambiar la cantidad de deudas sin querer.
- Las pruebas derivadas de un programa corren solas en su gate (`tests/program/program.checks.ts`): el programa
  dice dónde se compone (`package.json`, `desert.program`) y no elige cuáles corren.
- Una acción se declara por partes (`tools/promises.ts`): `name` (lo que dice su fila, en minúscula), `enter` (el
  verbo que confirma), `undoable`, `purpose`, `key`, `on`, y cuando hace falta `title`, `under`, `leaves`,
  `changes`, `datum`, `confirms`, `today`, `also`, `offered`, `refuses`. Lo que se rechaza al componer: un nombre
  que es una oración, lo que confirma que no es un verbo, una causa larga o con punto, la segunda persona, una
  pregunta con signos, un dato con forma sin máscara, una acción que no se deshace y no dice qué confirma, una
  acción nombrada como un dato que su herramienta lee y que no declara cambiarlo.
- Campos (`catalogs/fields.ts`): `digits` (números con forma), `padded`, `handle`, `thing` (elige una cosa de una
  herramienta, con el nombre de su ausencia), `someOf` (varias de un conjunto, con casillas), `holding` (el dato
  sabe por qué no vale).
- Lo que se cambia, se cambia donde se lee: la fila de un dato que una acción cambia lleva su tecla, lo que vale
  hoy y abre esa acción.
- Los textos propios de DESERT pasan por las mismas guardias (`programs/own-words.spec.ts`).

## Abierto
- **La puerta.** Decidido: viaja el estado (la de Kenon), con el router de este lado. Falta portarla: cada
  herramienta dice cómo viaja su parte y de quién son sus hechos, y la casa manda a cada integrante solo lo de
  las herramientas que tiene.
- **Tamaño.** La puerta de Kenon manda al conectar todo lo de las herramientas del integrante, y `entries` crece
  para siempre. Para una cuenta de Capibara hay que paginar: en memoria y en viaje lo reciente, lo viejo por
  páginas. Se resuelve al portar la puerta.
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
- **Un programa escribe hechos de la casa.** Equipo, en Capibara, escribe `granted` desde sus acciones. Un caso
  hoy promete hechos del programa y lo que se lee después; no puede prometer un hecho de la casa.
- **Una fila que lleva a la cosa de otra herramienta.** La venta muestra sus pagos, envíos y documentos como
  renglones quietos; deberían abrir esa cosa en su herramienta.
- **Un campo completo que no avanza no dice por qué.** CERRADA EN PARTE (11/11): un campo puede declarar por qué
  un dato completo no vale (`holding`, en `catalogs/fields.ts`): la pregunta lo dice ahí mismo y ninguna acción
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
  la compuerta compara actualizar desde plegados anteriores legibles con reconstruir todo.
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
5. La puerta: viaja el estado, por herramienta entera y paginado.
6. Emparejar dispositivos y herramienta de equipo (permisos y conexiones).
7. Core de muchas casas.

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
formato 3 llevan la identidad persistente de su registro y una secuencia segura dentro de él y cada paso exige el siguiente número. El guardado del grupo
es atómico y una restauración fallida no publica plegados. La decisión de compatibilidad queda concentrada en
`snapshot-format.ts`, que también exige la identidad de cálculos del programa y de la base (A04).
Cada descarte deja un aviso con motivo en stderr; al restaurar la casa, también en su registro de diagnósticos.
La identidad se asigna al abrir registros anteriores. Una alteración manual de archivos queda fuera de la garantía.
La función `projectionVersion` obtiene una huella de árboles de código y Node al componer. Una restauración
fallida impide guardar plegados durante toda la vida de esa instancia, aun si después logra reintentarlo.
