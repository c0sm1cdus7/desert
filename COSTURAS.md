# Las dos costuras del núcleo

En Kenon el núcleo está cosido a sus herramientas y a su mente en dos lugares. DESERT los abre así.

## 1. Los hechos: la casa escribe los suyos, el producto suma los propios (HECHO)

- `src/journal/events.ts` declara `houseCatalog`: lo que escribe toda casa, viva en ella el producto que viva
  (crear la casa, permisos, canales, actos y sus resultados, entradas, atender, avisos, reloj).
- Cada producto declara su catálogo y lo junta con `vocabulary(catalogo)`. De ahí salen el lector que valida,
  los esquemas para viajar por la puerta y `fact(...)` para escribir sus hechos.
- Cada hecho lleva `layer`: `"house"` o `"product"`. El código de la casa recibe `Event` y, para leer un hecho,
  primero tiene que comprobar `layer === "house"`; si no, no compila (un hecho de producto tiene `data: unknown`).
  El código del producto recibe `Event<SusHechos>` y lee todo con sus tipos.
- Un producto no puede usar un nombre que ya usa la casa: no compila, y si llega sin tipos, falla al arrancar.
- La capa no se guarda en la fila: la dice el nombre del hecho. Así, cuando un hecho pase de un producto a
  DESERT (porque ya lo usan dos), los registros viejos se siguen leyendo.
- En Rust es `enum Evento<P> { Casa(EventoCasa), Producto(P) }`.

Qué quedó fuera de `houseCatalog` respecto de Kenon (es de su mente o de sus herramientas): curl, journeys,
plan, checkpoint, compactar, modelos, crédito, turnos, juez, reglas, notas, marcas, escena, memoria, percepción.
`act` ya no lleva `evidence` (es de la mente).

## 2. El estado: cada herramienta guarda lo suyo (HECHO)

- El estado de la casa (`HouseState`) queda con lo que es de toda casa: permisos, canales, quién tiene qué a la
  vista, actos en curso, entradas, avisos de atención. Ninguna parte de ninguna herramienta.
- Un producto se describe con un solo tipo: `{ fact: SusHechos; tools: { ventas: ...; pagos: ... } }`.
  El estado completo es `State<Producto>`: el de la casa más `tools`, con la parte de cada herramienta bajo su nombre.
- El producto junta las partes en `Slices<Producto>`: de dónde arranca cada una y cómo avanza con cada hecho.
  Si a una herramienta le falta su paso, no compila. Una herramienta puede leer la parte de otra (tal como
  estaba antes del hecho), pero solo escribe la suya.
- Ejecutar un acto (`execute`) no conoce journeys ni mente. El producto puede vetar un acto por el puerto `refuse`
  y ofrecer actos propios fuera de las herramientas por `own`; atender y dejar de atender los ofrece toda casa.
- Las llaves (`KeyStore`) y el borrado de secretos (`secrets`) son puertos del motor.
- En Rust: `trait Producto { type Hecho; type Estado; }`.

Qué cambió respecto de Kenon en este paso:
- `acts` ya no es la lista de todos los actos desde el principio: son los actos abiertos (sin resultado todavía).
  `results` (lista de todos los resultados) no está: era de la mente.
- `visible` decide por canal, no por el nombre de la herramienta `communicator`.
- Un permiso es la herramienta entera; no queda la regla de los nombres con punto (era historia de Kenon).
- Los textos con que la casa rechaza un acto están en español, como los de la superficie.

## Abierto
- **Tamaño.** Como en Kenon, la casa entera vive en memoria y `entries` crece para siempre. Una casa de Capibara
  tiene muchas más entradas que una de Kenon, y el core va a tener muchas casas. Propuesta: en memoria queda lo
  reciente de cada herramienta, y lo viejo se pide al registro por páginas (la puerta ya tiene ese pedido).
  Se resuelve junto con el core de muchas casas.
- **Qué hechos de producto viajan a cada integrante.** Hoy `visible` deja pasar todo hecho de producto. La puerta
  necesita saber de qué herramienta es cada hecho para mandarlo solo a quien la tiene. Se resuelve en el paso 3.
- **Motivos de rechazo.** Son textos. Para Capibara conviene que sean códigos de un conjunto cerrado y que la
  superficie ponga las palabras. Se resuelve con el puente de la superficie.

## Orden de trabajo
1. Journal: hechos por producto, bus, proyecciones, reloj, guardado en SQLite. HECHO.
2. Casa y motor de herramientas con estado por herramienta. HECHO.
3. Protocolo de la puerta (lo que viaja entre la casa y una superficie) y vista por integrante.
4. Puente genérico de la superficie (herramienta cualquiera, filas, empezar).
5. Core de muchas casas.
