# Fugas de Kenon en los archivos copiados

Solo listado, nada arreglado. Formato `archivo:línea`.

## Conceptos y palabras de Kenon
- src/surface/contract/tones.ts:2 — tono `being` («el ser»), y :4 «the being's turquoise».
- src/doors/terminal/cells.ts:20,33,47 — color del tono `being` en las tres paletas.
- src/texts/surface.texts.ts:40 — `communicator: "Comunicador"` (herramienta de Kenon).
- src/texts/surface.texts.ts:41,44 — `journeys: "Viajes"`, `noJourneys: "Sin viajes."`.
- src/texts/surface.texts.ts:39-46 — sección entera `house` («casa»): comunicador, viajes, en curso, terminados, personas.
- src/texts/surface.texts.ts:45 — «En este Void» (nombre de la casa en Kenon).
- src/texts/surface.texts.ts:34 — `thinking: "pensando"` (supone una mente que piensa).
- src/texts/surface.texts.ts:33 — `seen: "visto"` (acuse de lectura del comunicador).
- src/texts/surface.texts.ts:17-38 — `talk`: «Canales», hilo, `toPanel: "browser"` (:28), pensado para el comunicador.
- src/texts/surface.texts.ts:12,35 — códigos de error `E-NAV-1`, `E-COM-1` (convención de Kenon).
- src/texts/surface.texts.ts:7 — secciones `tools` / `system` («Herramientas», «Sistema»): modelo de herramientas de Kenon.
- src/texts/surface.texts.ts:16 — `pasteHere: "secreto"` (llavero/secretos de la casa).

## Supuestos sobre casa, mente y herramientas
- src/surface/contract/contract.ts:135 — «leaves the Entrada only once the house accepted it» (la casa decide).
- src/surface/session/talk.ts:1 — «one thread, one Entrada»; :160 «What the house said about the message».
- src/surface/router/step.ts:115 — «A message the house settled».
- src/surface/session/screen.ts:29 — «it never reaches the journal» (el journal del núcleo).
- src/surface/session/screen.ts:44 — «the session settles it when the house answers».
- src/doors/terminal/boot.ts:47 — «What the house answers later lands on the session».
- src/surface/contract/contract.ts:132-141 — `Conversation`: `said`, `live`, `pending`, `older`, `open(attachment)`; supone un canal de mensajes con adjuntos (contract.ts:122-130 `Said`, `Attachment`).
- src/surface/contract/contract.ts:151-159 — `Tool`: `held()` «a tool nobody gave you is not on your Menu», `calls()` «asked for your attention» (modelo de herramientas con permisos y avisos de Kenon).
- src/surface/contract/contract.ts:158 — «What the Barra says» (vocabulario de UI de Kenon).
- src/surface/contract/contract.ts:156 — `place.section: "tools" | "system" | "hidden"`.
- src/surface/session/screen.ts:124,130 — secciones y `tone: "wait"` para «requiere atención».
- src/surface/session/talk.ts:20 — «A question left for later» (el ser pregunta, Franco responde: pendientes).

## Datos de prueba
- src/surface/session/destinations.spec.ts:82,115 y src/doors/terminal/renderers.spec.ts:35 — herramienta «Comunicador».
- src/surface/session/destinations.spec.ts:138-141 — «leaves the Entrada only once the house accepted it».
- src/doors/terminal/renderers.spec.ts:28 — `tone: "being"` y nombre «Nora».
- tests/support/surface-rules.ts:10,19,59,70 y src/surface/session/terminal.spec.ts:31,38,42,54 — «Nora» (un ser) y reglas «tuyas / de Nora».

## Herramientas (config)
- tests/laws/adapters.spec.ts, imports.spec.ts, biases.spec.ts, prompts.spec.ts, gate.spec.ts — fixtures con rutas y nombres de Kenon (`src/adapters/providers`, `src/runtime/house-runtime.ts`, `src/mind/turn.ts`, `src/tools/...`, `actor-programs.ts`, `approval_policy`): nombres de Kenon dentro de pruebas de las leyes. Ver p. ej. tests/laws/imports.spec.ts:7,73-83, prompts.spec.ts:7,24-25.
- tests/laws/imports.spec.ts — regla de adapters (`adapterUsers`: programs, adapters, tools, surface/bridge) y prohibición de `@nestjs/`.
- tests/laws/size.spec.ts:35 — «no process name repeats anywhere in Kenon».
- tests/laws/prompts.spec.ts / tests/support/trace.ts — palabras normativas en español (voseo de Kenon).
- eslint.config.js, tsconfig.json — `rootDirs: ["tests/support", "../tests/support"]` es un puente de worktrees de Kenon.
