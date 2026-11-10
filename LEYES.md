# Leyes de los programas sobre DESERT

Decididas por Franco el 10/11/2026. Valen para todo programa (Kenon, Capibara). Cada una dice si ya está o si se debe.

| # | Ley | Estado |
|---|---|---|
| 1 | Toda acción lleva propósito, como la herramienta. | DEUDA: `ToolAct` no tiene `purpose`. |
| 2 | Toda acción y toda opción de menú lleva su tecla rápida. | DEUDA: `key` es opcional en el contrato de superficie. |
| 3 | Las acciones viven en un catálogo único del programa. | DEUDA: hoy cada herramienta trae las suyas; falta el catálogo como una sola declaración. |
| 4 | El programa muestra todas sus acciones: la que el estado no deja ejecutar, apagada con su motivo; la ajena, también apagada. | DEUDA: hoy una acción que no se puede ejecutar no aparece. |
| 5 | Ocultar las apagadas, las ajenas o un stack vacío es una preferencia del programa de cada usuario, no una regla. | DEUDA: no existen las preferencias. |
| 6 | Navegando el programa se llega a todas las acciones; DESERT lo garantiza. | DEUDA: falta el recorrido derivado del catálogo. |
| 7 | Ninguna spec se escribe a mano: se derivan de lo que el programa promete. Las reglas propias se prometen con casos declarados junto a cada acción. | DEUDA: las specs de DESERT y de Capibara están escritas a mano. |
| 8 | Dos stacks fijos en todos los menús: Atención (objetos que necesitan que alguien actúe, con su porqué) y Actividad (lo que hizo el resto desde que miraste). | DEUDA: hoy la atención es por herramienta entera y se apaga al abrirla. |
| 9 | Viaja el estado, y un router único es compartido por todos los renderers. | Router HECHO (`src/surface/router.ts`); la puerta se debe. |
| 10 | Un registro escrito solo para dejar constancia no le pide atención a nadie. | HECHO (`silent`). |

## Orden para saldar la deuda
1. Casos declarados y specs derivadas (ley 7), porque todo lo demás se prueba con eso.
2. Propósito, tecla y catálogo único de acciones (leyes 1 a 3).
3. Acciones apagadas con motivo, ajenas visibles y preferencias (leyes 4 a 6).
4. Atención por objeto y Actividad (ley 8).
