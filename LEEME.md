# DESERT

Base compartida entre Kenon y Capibara, extraída de Kenon (la parte que no sabe nada de Kenon).

Reglas:
- No entra nada hasta que dos productos lo usan.
- Las rutas son las mismas que en Kenon, así traer un cambio es comparar archivo contra archivo.
- Kenon se sube a DESERT cuando se porte a Rust.

## Qué hay hoy (primer paso)
- `src/surface/`: el contrato de superficie (Screen que se dibuja, Intent que vuelve) y su lógica de sesión.
- `src/doors/terminal/`: el renderer de terminal, con sus specs.
- `src/texts/surface.texts.ts`: las palabras de la superficie.
- `tests/laws/`: las leyes que aplican a un árbol chico (tamaño, líneas de 120, sin casteos, textos solo en `texts/`, imports, ciclos, gate).
- `pnpm gate`: formato, lint, tipos, pruebas y leyes.

## Segundo paso
- `src/journal/`: el registro de hechos. La casa escribe los suyos y cada producto suma los propios (`vocabulary`).
- `src/adapters/storage/`: el registro guardado en SQLite, solo para agregar.
- Diseño de las dos costuras del núcleo: `COSTURAS.md`.

## Qué falta
- La casa y el motor de herramientas, con estado por herramienta (segunda costura).
- Las puertas que dependen del núcleo (`src/surface/bridge/`, el resto de `src/doors`).
- Limpiar las fugas de Kenon: ver `FUGAS.md`. Procedencia y diferencias: ver `ORIGEN.md`.
