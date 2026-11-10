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
- En Rust es `enum Evento<P> { Casa(EventoCasa), Programa(P) }`.

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
- En Rust: `trait Programa { type Hecho; type Estado; }`.

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
- En Rust el router es parte de lo que se comparte entre plataformas.

## Abierto
- **La puerta.** Decidido: viaja el estado (la de Kenon), con el router de este lado. Falta portarla: cada
  herramienta dice cómo viaja su parte y de quién son sus hechos, y la casa manda a cada integrante solo lo de
  las herramientas que tiene.
- **Tamaño.** La puerta de Kenon manda al conectar todo lo de las herramientas del integrante, y `entries` crece
  para siempre. Para una cuenta de Capibara hay que paginar: en memoria y en viaje lo reciente, lo viejo por
  páginas. Se resuelve al portar la puerta.
- **Lecturas de cada herramienta.** Hoy el puente lee la vista de texto de la herramienta y la vuelve filas.
  Para Capibara conviene que cada herramienta declare sus filas con tipos. Se define con las herramientas de Capibara.
- **Motivos de rechazo.** Son textos. Para Capibara conviene que sean códigos de un conjunto cerrado y que la
  superficie ponga las palabras.

- **Un propósito largo se corta.** La terminal corta con «…» el propósito de una acción cuando no entra al lado de
  su nombre. O se parte en dos renglones, o se limita su largo al componer el programa.
- **Un campo completo que no avanza no dice por qué.** Un día que no existe («30/02/2026») entra en la máscara y
  enter no hace nada. `valid` hoy contesta sí o no; tiene que poder contestar el motivo.
- **Después de un rechazo no se ve la pregunta.** El motivo ocupa el lugar de la pregunta que se estaba
  contestando.

- **Un tipo de hecho que el programa deja de declarar.** El registro guarda hechos para siempre; si el programa
  quita un tipo de su catálogo, la casa sigue abriendo (arranca desde lo que tenía guardado) y recién falla el día
  que hace falta releer todo el registro. Comprobado el 10/11 con una casa local de Capibara que tenía una venta
  editada con el formato anterior. Falta decidir: que abrir falle a la vista si el registro tiene un tipo que el
  programa no declara, y cómo sigue leyendo un programa los hechos de su pasado.
- **Lo guardado de otra forma del programa.** Al abrir, el estado sale de lo guardado la última vez, sin saber
  si el programa cambió desde entonces (una herramienta nueva, otro modo de calcular). Lo guardado tiene que
  llevar de qué forma del programa salió, y descartarse si ya no es la misma.

## Orden de trabajo
1. Journal: hechos por programa, bus, proyecciones, reloj, guardado en SQLite. HECHO.
2. Casa y motor de herramientas con estado por herramienta. HECHO.
3. Puente de la superficie y casa corriendo en un proceso, con secretos fuera del registro. HECHO.
4. Router compartido por todos los renderers. HECHO.
5. La puerta: viaja el estado, por herramienta entera y paginado.
6. Emparejar dispositivos y herramienta de equipo (permisos y conexiones).
7. Core de muchas casas.
