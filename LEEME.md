# DESERT

Base compartida entre Kenon y Capibara, extraída de Kenon (la parte que no sabe nada de Kenon).

Reglas:
- No entra nada hasta que dos programas lo usan.
- Las rutas son las mismas que en Kenon, así traer un cambio es comparar archivo contra archivo.
- Kenon se sube a DESERT cuando se porte a Rust.

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

## Qué falta
- La puerta para dispositivos que no corren junto a la casa: viaja el estado, paginado (ver `COSTURAS.md`).
- Emparejar dispositivos, la herramienta de equipo y el core de muchas casas.
- Las puertas que dependen del núcleo (`src/surface/bridge/`, el resto de `src/doors`).
- Limpiar las fugas de Kenon: ver `FUGAS.md`. Procedencia y diferencias: ver `ORIGEN.md`.
