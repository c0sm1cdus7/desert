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

## 2. El estado: cada herramienta guarda lo suyo (SIGUE)

- El estado de la casa (`KernelState`) queda con lo que es de toda casa: permisos, canales, quién atiende qué,
  actos en curso, resultados, entradas, avisos.
- Cada herramienta declara su parte (estado inicial + cómo avanza con cada hecho). El producto junta las partes
  en un registro tipado; el estado completo es `KernelState & { tools: T }`.
- Como cada parte va bajo el nombre de su herramienta, la casa aplica el permiso por herramienta entera a todas
  por igual: a quien no tiene la herramienta, su parte no le llega.
- Ejecutar un acto no conoce journeys ni mente: el producto puede vetar un acto por un puerto.
- Las llaves (credenciales de servicios) son un puerto del núcleo.

## Orden de trabajo
1. Journal: hechos por producto, bus, proyecciones, reloj, guardado en SQLite. HECHO.
2. Casa y motor de herramientas con estado por herramienta.
3. Protocolo de la puerta (lo que viaja entre la casa y una superficie) y vista por integrante.
4. Puente genérico de la superficie (herramienta cualquiera, filas, empezar).
5. Core de muchas casas.
