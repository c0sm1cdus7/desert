# DESERT

Base compartida entre Kenon y Capibara, extraída de Kenon (la parte que no sabe nada de Kenon).

Reglas:
- No entra nada hasta que dos programas lo usan. Las piezas de la casa (identidades, kit, escenas, puerta y mentes)
  entran por definición del dueño: Kenon y Capibara son esos dos programas; Capibara las adopta al levantarse su pausa.
- Las rutas son las mismas que en Kenon, así traer un cambio es comparar archivo contra archivo.
- Kenon se sube a DESERT cuando se retome, en TypeScript (13/11/2026: el pase a Rust salió del plan; un solo lenguaje para la base y sus programas).

## Qué hay hoy (primer paso)
- `src/surface/`: el contrato de superficie (Screen que se dibuja, Intent que vuelve) y su lógica de sesión.
- `src/doors/terminal/`: el renderer de terminal, con sus specs.
- `src/texts/surface.texts.ts`: las palabras de la superficie.
- `tests/laws/`: las leyes que aplican a un árbol chico (tamaño, líneas de 120, sin casteos, textos solo en `texts/`, imports, ciclos, gate).
- `pnpm gate`: formato, lint, tipos, pruebas y leyes.

## Segundo paso
- `src/journal/`: el registro de hechos. La casa escribe los suyos y cada programa suma los propios (`vocabulary`).
- `src/adapters/storage/`: el registro guardado en SQLite, solo para agregar.
- Diseño de las dos costuras del núcleo: `COSTURAS.md`.

## Tercer paso
- `src/house/`: la casa (quién administra, qué herramientas enteras tiene cada integrante, canales).
- `src/tools/`: el motor de herramientas. Cada herramienta guarda su parte del estado; ejecutar un acto.
- Un programa de prueba (`tests/support/shop.ts`) muestra cómo se arma un programa sobre DESERT.

## Cuarto paso
- `src/surface/bridge/`: cualquier herramienta de la casa en la superficie, con las palabras del programa.
- `src/programs/house-runtime.ts`: la casa de un programa corriendo, y una superficie en el mismo proceso.
- `src/adapters/secrets/`: los secretos fuera del registro.
- Para verlo: `node tests/support/shop-open.ts` abre el programa de prueba en la terminal.

## Quinto paso
- `src/surface/router.ts`: el router. Una sola lógica entre cualquier renderer y la casa: intenciones que entran,
  la pantalla que sale. La terminal ya lo usa; web, iPhone y Android usan el mismo.

## Sexto paso (11/11/2026)
- Un objeto lo presenta su herramienta y lo dibuja la base: grupos declarados, lo nombrado se abre con su número, sea
  de la herramienta que sea (`src/surface/bridge/presented.ts`).
- Una herramienta puede vivir dentro de otra (`inside`).
- Un valor sugerido se reemplaza con la primera tecla; lo que no entra en pantalla se alcanza con las flechas.
- Cómo se arma un programa sobre esta base: `PROGRAMA.md`.

## Séptimo paso (13/11/2026)
- Las teclas se leen como llegan: una flecha o un carácter que vienen partidos en dos trozos siguen siendo esa flecha
  y ese carácter, y un escape solo es la tecla escape recién cuando no llegó nada más (`src/doors/terminal/input.ts`).
- Pegar es escribir un texto entero (`paste`), no apretar teclas: se escribe donde se está escribiendo, con sus saltos
  de línea como espacios, y en cualquier otro lado no hace nada. Nunca confirma ni es un atajo (`src/surface/step.ts`).
  Lo que llega entre las marcas de pegado es texto tarde lo que tarde: un pegado que se frena no termina en teclas.
- Un programa se comprueba por una terminal de verdad, con su propia entrada y las teclas como bytes
  (`realTerminal`, en `#desert/testing.ts`). Necesita `python3`, que abre la pseudo-terminal.

## Qué falta
- La puerta para dispositivos que no corren junto a la casa: viaja el estado, paginado (ver `COSTURAS.md`).
- Emparejar dispositivos, la herramienta de equipo y el core de muchas casas.
- Las puertas que dependen del núcleo (`src/surface/bridge/`, el resto de `src/doors`).
- Limpiar las fugas de Kenon: ver `FUGAS.md`. Procedencia y diferencias: ver `ORIGEN.md`.
