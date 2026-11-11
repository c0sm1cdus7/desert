# Qué hace cumplir cada ley

Sale de `tests/laws/rules.json`. No se edita a mano: `pnpm rules` lo escribe y el gate falla si quedó viejo.
Una ley que nada hace cumplir figura como DEUDA, con cómo se salda. Sumar o saldar una cambia el número de abajo.

Leyes: 121. Deudas: 23.

| # | Ley | De dónde | Garantía | Dónde, o cómo se salda |
|---|---|---|---|---|
| 1 | Celda 12×24, IBM Plex Mono 20/24 | REGLAS §2 | DEUDA | No aplica a la terminal; tipo de tamaños en un renderer web. |
| 2 | Solo regular y negrita | REGLAS §2 | no compila | `src/doors/terminal/cells.ts` `src/surface/contract.ts` |
| 3 | Todo texto cae en una celda dentro de la grilla | REGLAS §2, §17 | la cumple la superficie | `src/doors/terminal/cells.ts` `src/doors/terminal/destinations.spec.ts` |
| 4 | Mínimo 40×16; por debajo solo «Ventana muy chica» | REGLAS §2, §14 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/texts/surface.texts.ts` |
| 5 | Tres zonas que nunca se mueven (Barra, Contenido, Toolbar) | REGLAS §3 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 6 | Barra y Toolbar de lado a lado con borde; Toolbar un solo riel | REGLAS §3 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 7 | Contenido en columna de 76 centrada | REGLAS §3 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 8 | Entrada dentro de la columna, fila 26 de 30, con fila libre arriba y abajo | REGLAS §3 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/doors/terminal/thread.ts` |
| 9 | Barra: icono y hora, igual en toda pantalla (también la inicial) | REGLAS §4 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/surface/resolve.ts` |
| 10 | Barra: batería siempre | REGLAS §4 | DEUDA | Tipo: batería obligatoria en Bar. |
| 11 | Cuatro estados cerrados con su icono y color | REGLAS §4 | no compila | `src/doors/terminal/paint.ts` `src/surface/contract.ts` |
| 12 | Sin señal prevalece | REGLAS §4 | DEUDA | Tipo/componer: una sola función barState(red, void) que devuelva el estado por prioridad. |
| 13 | Sin palabras, eventos, avisos ni cantidades en la Barra | REGLAS §4 | DEUDA | Tipo: título = nombre de herramienta, de cosa o de acción, de un tipo con marca. |
| 14 | El punto nunca late | REGLAS §4, §11 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 15 | Enviar no es un estado | REGLAS §4 | no compila | `src/surface/contract.ts` |
| 16 | Sin señal: lo pendiente queda guardado con «sin enviar» y sale solo; red sin Void: Conectando y «Esperando conexión» | REGLAS §4 | DEUDA | Tipo: Conversation.send devuelve Sent |
| 17 | La Barra muestra el nombre de la acción | REGLAS §9 | la cumple la superficie | `src/surface/resolve.ts` |
| 18 | Barra: elipsis en el título; icono y hora siempre se ven | REGLAS §14 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 19 | Toolbar izquierda fija ctrl o menú ctrl c salir; sin ctrl o en acciones; en el Menú ni ctrl o ni esc | REGLAS §5 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/surface/resolve.ts` |
| 20 | Toolbar derecha: solo los aids de lo que está en pantalla | REGLAS §5 | la cumple la superficie | `src/surface/contract.ts` `src/surface/resolve.ts` `src/surface/shown-tool.ts` `src/surface/talk.ts` `src/surface/walk.ts` |
| 21 | ↑↓ mueven, enter abre o confirma, esc vuelve; ← → no navegan | REGLAS §5 | la cumple la superficie | `src/doors/terminal/input.ts` `src/doors/terminal/renderers.spec.ts` `src/surface/step.ts` |
| 22 | En una Entrada con texto, ← → solo mueven el cursor | REGLAS §5 | la cumple la superficie | `src/surface/step.ts` `src/surface/talk.ts` |
| 23 | enter dice lo que hace: continuar, el verbo, o lo elegido | REGLAS §5 | la cumple la superficie | `src/surface/bridge/program-acts.ts` `src/surface/walk.ts` |
| 24 | esc desenfoca un mensaje; en una acción vuelve una pregunta | REGLAS §5, §9 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/surface/step.ts` `src/surface/talk.ts` |
| 25 | Todo lo que tiene atajo también se alcanza navegando; la letra no se repite en la Toolbar | REGLAS §5 | la cumple la superficie | `src/surface/resolve.ts` `src/surface/step.ts` |
| 26 | La letra de una fila se ve en [x] | REGLAS §5 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/doors/terminal/thread.ts` |
| 27 | Debajo de 60 columnas la izquierda queda ctrl o  ctrl c y caen los aids del primero al último | REGLAS §5, §14 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 28 | El menú es siempre el punto de entrada | REGLAS §6 | la cumple la superficie | `src/surface/screen.ts` `src/surface/step.ts` |
| 29 | Dos secciones, Herramientas y Sistema; fila [x] nombre | REGLAS §6 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/surface/lists.ts` `src/surface/shown-tool.ts` |
| 30 | Cada herramienta lleva su tecla, sin repetir | REGLAS §6 | el programa no arranca | `src/surface/bridge/house-ports.ts` `src/surface/bridge/house-tools.spec.ts` `src/surface/bridge/house-tools.ts` |
| 31 | El punto solo existe en la Barra; el chevron › solo marca donde se escribe; sin flechas | REGLAS §7 | DEUDA | Derivada sobre src/texts/*.texts.ts y los says/refused de los casos. |
| 32 | Resultado: Listo verde o Error coral, el mensaje como texto, nunca entero pintado | REGLAS §7, §9 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/surface/talk.ts` `src/surface/walk.ts` |
| 33 | No se pintan verbos, solo estados; el color nunca decora | REGLAS §7, §10 | DEUDA | Tipo: color de estado solo vía un State cerrado (Listo, Error, En curso) en vez de Tone libre. |
| 34 | Turquesa solo del ser: un estado nunca lo usa | REGLAS §7, §10 | DEUDA | Tipo: separar BeingTone y que solo lo acepte Said.who. |
| 35 | Tabla cerrada de tipos de evento; uno desconocido no se muestra | REGLAS §7, §17 | DEUDA | Tipo: kind cerrado en ThreadEvent y filtro por preferencia. |
| 36 | El estado no va en el Hilo (nada de «en reposo») | REGLAS §7 | DEUDA | Tipo: live devuelve Live = {quien, palabra, segundos}. |
| 37 | Responder: fila ↳ Nora · comienzo en texto 3, con elipsis | REGLAS §7 | la cumple la superficie | `src/doors/terminal/thread.ts` `src/surface/talk.ts` |
| 38 | Si una fila lleva tecla, todo su stack reserva ese lugar | REGLAS §7 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/doors/terminal/thread.ts` |
| 39 | Evento con cabecera; debajo todo con 1 celda de indent; sin cabecera sin indent; una fila en blanco entre eventos | REGLAS §7 | la cumple la superficie | `src/doors/terminal/thread.ts` |
| 40 | El Hilo arranca en la columna del chevron | REGLAS §7 | la cumple la superficie | `src/doors/terminal/thread.ts` |
| 41 | visto y sin enviar al final de la cabecera en texto 3 | REGLAS §7 | DEUDA | Tipo: Said.state: "visto" |
| 42 | El ser pregunta con opciones y otra respuesta al final; esc después | REGLAS §7 | la cumple la superficie | `src/surface/talk.ts` |
| 43 | Navegar el hilo: ↑↓ enfocan, enter abre o envía; el enfocado con fondo foco y el resto en texto 3; esquinas cortadas solo con aire | REGLAS §7 | la cumple la superficie | `src/doors/terminal/destinations.spec.ts` `src/doors/terminal/thread.ts` `src/surface/talk.ts` |
| 44 | Cuatro composiciones cerradas; una pantalla usa una | REGLAS §9 | no compila | `src/surface/contract.ts` `src/surface/resolve.ts` `src/surface/shown-tool.ts` |
| 45 | Lista: stacks con título; Acciones siempre último | REGLAS §9, §17 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/surface/lists.ts` `src/surface/shown-tool.ts` |
| 46 | Sin columnas: título a la izquierda; propósito y dato a la derecha | REGLAS §9 | la cumple la superficie | `src/doors/terminal/thread.ts` `src/surface/lists.ts` |
| 47 | El dato prioriza algo útil; si no hay, un aid de para qué sirve | REGLAS §9 | la cumple la superficie | `src/surface/bridge/program-acts.ts` `src/surface/lists.ts` `src/surface/shown-tool.ts` |
| 48 | Cosas distintas se separan con punto medio, nunca coma ni «y» | REGLAS §9 | DEUDA | Derivada sobre el catálogo de textos (sin , ni « y » en etiquetas, propósitos, datos). |
| 49 | Lo que no entra dice cuánto queda en listas (↑ 6 más, ↓ 14 más) | REGLAS §9 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/doors/terminal/terminal.spec.ts` `src/surface/window.spec.ts` `src/surface/window.ts` |
| 50 | …en el Hilo | REGLAS §9 | la cumple la superficie | `src/doors/terminal/thread.ts` |
| 51 | …en las opciones de una pregunta | REGLAS §9 | prueba derivada de los casos | `src/surface/window.ts` `src/surface/resolve.ts` `src/doors/terminal/thread.ts` `src/programs/promised-keys.ts` `src/programs/promised-walk.ts` |
| 52 | Lista vacía: el stack se muestra con título apagado y Sin X. en texto 1 | REGLAS §9 | la cumple la superficie | `src/doors/terminal/paint.ts` `src/surface/bridge/house-ports.ts` |
| 53 | Una acción es una serie de inputs y después un comando, siempre como Hilo | REGLAS §9 | la cumple la superficie | `src/surface/resolve.ts` `src/surface/screen.ts` `src/surface/walk.ts` |
| 54 | Pregunta: un sustantivo, sin punto ni signos | REGLAS §9, §12 | el programa no arranca | `src/surface/bridge/asking-parts.ts` `src/surface/bridge/asking-back.ts` |
| 55 | La pregunta pasa de texto 1 a texto 2 al responderse; la respuesta queda agregada, en texto 1, sin autor | REGLAS §9 | la cumple la superficie | `src/surface/walk.ts` |
| 56 | Un secreto queda tapado | REGLAS §9 | DEUDA | Tipo: secret(ask) en fields.ts y que asking lo traduzca a kind: "secret". |
| 57 | Seis tipos de input cerrados | REGLAS §9 | no compila | `src/surface/bridge/asking.ts` `src/surface/contract.ts` |
| 58 | Texto: número o fecha es texto con validación; formatos cerrados | REGLAS §9 | no compila | `src/catalogs/fields.ts` `src/surface/contract.ts` `src/surface/masks.ts` |
| 59 | Opción única: lista con ↑↓ y enter | REGLAS §9 | la cumple la superficie | `src/surface/step.ts` |
| 60 | Opciones múltiples: [x]/[ ], espacio marca, enter continúa, nombres separados por · | REGLAS §9 | la cumple la superficie | `src/surface/step.ts` `src/surface/walk.ts` `src/catalogs/fields.ts` `src/surface/bridge/asking.ts` |
| 61 | Referencia: una lista de objetos con su dato, cada fila con su tecla; espacio busca; solo lo que se puede elegir; la ausencia lleva su nombre | REGLAS §9 | la cumple la superficie | `src/surface/step.ts` `src/surface/walk.ts` `src/surface/bridge/asking-parts.ts` `src/surface/bridge/house-tools.ts` `src/programs/promised-walk.ts` |
| 62 | Confirmación: el verbo y volver | REGLAS §9 | la cumple la superficie | `src/surface/bridge/program-acts.ts` `src/surface/screen.ts` |
| 63 | La tecla del verbo es su inicial | REGLAS §9 | la cumple la superficie | `src/surface/bridge/program-acts.ts` `src/tools/promises.ts` |
| 65 | Nada se ejecuta hasta el último input; durante los inputs solo se lee | REGLAS §9 | la cumple la superficie | `src/surface/step.ts` |
| 66 | Sin inputs solo confirma; si no se puede deshacer volver viene elegido, si se puede el verbo | REGLAS §9 | no compila | `src/tools/promises.ts` `src/surface/bridge/program-acts.ts` |
| 67 | Mientras corre: evento en vivo, late Procesando, igual en todas, sin Entrada | REGLAS §9 | la cumple la superficie | `src/surface/router.spec.ts` `src/surface/walk.ts` `src/texts/surface.texts.ts` |
| 68 | Cuando no hace falta, la Entrada se va (no se deshabilita ni se reserva) | REGLAS §9 | la cumple la superficie | `src/doors/terminal/thread.ts` `src/surface/walk.ts` |
| 69 | El resultado se dice Verbo · Objeto · Detalle | REGLAS §9 | prueba derivada de los casos | `src/programs/promised.ts` |
| 70 | Un paso con datos inválidos no avanza | REGLAS §9 | la cumple la superficie | `src/surface/screen.ts` `src/surface/step.ts` `src/surface/walk.ts` |
| 71 | Si falla, el error queda en el Hilo y vuelve a preguntar con lo escrito | REGLAS §9 | la cumple la superficie | `src/doors/terminal/terminal.spec.ts` `src/surface/step.ts` `src/surface/walk.ts` |
| 72 | esc vuelve, cancela o cierra según la fase | REGLAS §9 | la cumple la superficie | `src/surface/step.ts` `src/surface/walk.ts` |
| 73 | Al cerrar lo que eliminó una cosa se vuelve a la lista que la mostraba | REGLAS §9d | prueba derivada de los casos | `src/doors/terminal/destinations.spec.ts` `src/programs/promised-walk.ts` `src/surface/step.ts` |
| 74 | Un acto sobre una cosa exige destino y declara si la elimina; sobre la herramienta no tiene | REGLAS §9d | no compila | `src/doors/terminal/destinations.spec.ts` `src/programs/promised-laws.ts` `src/surface/shown-tool.ts` |
| 75 | Si otro eliminó la cosa: Error E-NAV-1 · Destino inexistente; destino desconocido falla a la vista | REGLAS §9d | la cumple la superficie | `src/doors/terminal/destinations.spec.ts` `src/surface/lists.ts` `src/surface/resolve.ts` `src/texts/surface.texts.ts` |
| 76 | Ninguna pantalla se escribe a mano; la herramienta no dibuja | REGLAS §9d | no compila | `src/surface/contract.ts` `src/surface/resolve.ts` `src/surface/shown-tool.ts` |
| 77 | La herramienta da su tecla y sección (place) y el dato de su fila (summary) | REGLAS §9d | no compila | `src/surface/lists.ts` `src/surface/shown-tool.ts` |
| 78 | Procesando, Barra y Toolbar los pone el contrato de superficie | REGLAS §9d | la cumple la superficie | `src/surface/resolve.ts` |
| 80 | Una fila que se puede cambiar abre su acción; Acciones para lo que no es de una fila | REGLAS §9d | el programa no arranca | `src/surface/bridge/house-tools.ts` `src/surface/bridge/any-tool.ts` `src/tools/promises.ts` `src/programs/promised-data.spec.ts` |
| 81 | Todo color de la UI sale de la tabla de tokens | REGLAS §10, §17 | no compila | `src/surface/tones.ts` |
| 82 | Valores hex y ANSI de la tabla | REGLAS §10 | la cumple la superficie | `src/doors/terminal/cells.ts` |
| 83 | rgb solo para lo que no es UI (foto, página) | REGLAS §10, §9b | DEUDA | Tipo: rgb solo en Panel.lines, no en Row/ThreadEvent. |
| 84 | Jerarquía por brillo: tres textos y negrita | REGLAS §10 | la cumple la superficie | `src/doors/terminal/thread.ts` `src/surface/walk.ts` |
| 85 | Un pulso a la vez; en reposo no se mueve nada | REGLAS §11 | la cumple la superficie | `src/catalogs/time.ts` `src/surface/router.spec.ts` `src/surface/router.ts` `src/surface/walk.ts` |
| 86 | Los títulos nunca laten | REGLAS §11 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 87 | El cursor donde se escribe pulsa | REGLAS §11 | DEUDA | Pintor: alternar la celda con el tick del router. |
| 88 | El texto entra palabra por palabra | REGLAS §11 | DEUDA | Pintor. |
| 89 | Cambiar de lugar es un corte seco | REGLAS §11 | la cumple la superficie | `src/doors/terminal/boot.ts` |
| 90 | La actividad se muestra con su propio dato (contador) | REGLAS §11 | la cumple la superficie | `src/surface/walk.ts` |
| 91 | Late la palabra: fundido de 1,6 s, por pasos de color en la terminal | REGLAS §11 | la cumple la superficie | `src/surface/walk.ts` |
| 92 | Español | REGLAS §12 | DEUDA | Derivada sobre el catálogo de textos. |
| 93 | La interfaz no habla: ni segunda persona, ni preguntas con signos, ni oraciones en nombres, causas, preguntas y resultados; vale igual para los textos propios de DESERT | REGLAS §12 | el programa no arranca | `src/catalogs/addressing.ts` `src/tools/promises.ts` `src/surface/bridge/asking-parts.ts` `src/programs/promised.ts` `src/programs/own-words.spec.ts` |
| 94 | Cada identidad con su nombre: no hay Vos ni Tuyas | REGLAS §12 | DEUDA | Misma derivada de la fila 93. |
| 95 | No se muestra nada interno que la persona no pueda accionar | REGLAS §12 | DEUDA | Derivada: fallar si un título o dato coincide con un id de herramienta o cosa. |
| 96 | Las acciones destructivas piden confirmación | REGLAS §12 | el programa no arranca | `src/tools/promises.ts` |
| 97 | Al achicarse cae lo secundario y después elipsis | REGLAS §14 | la cumple la superficie | `src/doors/terminal/cells.ts` `src/doors/terminal/paint.ts` |
| 98 | Terminal: contenido hasta 76, en angosto todo el ancho | REGLAS §14 | la cumple la superficie | `src/doors/terminal/paint.ts` |
| 99 | Filas y menú: elipsis en dato o descripción; el nombre manda | REGLAS §14 | la cumple la superficie | `src/doors/terminal/thread.ts` |
| 100 | Cada composición se prueba en 40×16, 80×16 y 70×44 | REGLAS §14, §17 | DEUDA | Derivada: que walkedChecks pinte cada pantalla que recorre a esos tres tamaños. |
| 101 | LEYES 1: toda acción lleva propósito | LEYES 1 | no compila | `src/surface/lists.ts` `src/tools/promises.ts` |
| 102 | LEYES 2: tecla en toda acción, opción de menú y opción de pregunta; sin repetidas | LEYES 2 | el programa no arranca | `src/programs/promised-keys.ts` `src/surface/bridge/asking-back.ts` `src/surface/bridge/asking-parts.ts` `src/surface/bridge/house-tools.ts` `src/surface/contract.ts` `src/surface/lists.ts` `src/tools/promises.ts` |
| 103 | LEYES 3: las acciones viven en un catálogo único | LEYES 3 | el programa no arranca | `src/surface/bridge/house-tools.ts` |
| 104 | LEYES 4: se muestran todas las acciones, apagadas con motivo, también la ajena | LEYES 4 | prueba derivada de los casos | `src/programs/promised-off.ts` `src/programs/promised-walk.ts` `src/tools/promises.ts` |
| 105 | LEYES 5: ocultar apagadas, ajenas o vacías es preferencia de cada usuario | LEYES 5 | prueba derivada de los casos | `src/programs/promised-notices.ts` `src/programs/promised-off.ts` |
| 106 | LEYES 6: navegando se llega a todas las acciones | LEYES 6 | prueba derivada de los casos | `src/programs/promised-keys.ts` `src/programs/promised-walk.ts` |
| 107 | LEYES 7: ninguna spec a mano, se derivan de los casos | LEYES 7 | prueba derivada de los casos | `src/programs/promised-walk.ts` `src/programs/promised.ts` `src/tools/promises.ts` |
| 108 | LEYES 8: dos stacks fijos, Atención y Actividad, en todos los menús | LEYES 8 | prueba derivada de los casos | `src/programs/promised-notices.ts` `src/surface/lists.ts` |
| 109 | LEYES 9: viaja el estado; un router único para todos los renderers | LEYES 9 | una spec a mano | `src/surface/router.spec.ts` `src/surface/router.ts` |
| 110 | LEYES 10: un registro escrito solo para constancia no pide atención | LEYES 10 | prueba derivada de los casos | `src/programs/promised.ts` `src/tools/tools.ts` |
| 111 | LEYES 11: un campo es de texto con máscara o placeholder, nunca «texto» | LEYES 11 | el programa no arranca | `src/surface/bridge/asking-back.ts` `src/surface/bridge/asking-parts.ts` `src/surface/bridge/asking.spec.ts` `src/surface/contract.ts` |
| 112 | LEYES 12: editar es un menú; nunca recorrer «crear» con valores cargados | LEYES 12 | DEUDA | Componer: un acto con today debe estar under un menú. |
| 113 | LEYES 13: buscar es un modo de los menús | LEYES 13 | prueba derivada de los casos | `src/programs/promised-find.ts` `src/surface/finding.ts` `src/surface/step.ts` |
| 114 | Las pruebas derivadas corren en el gate de cada programa sin que el programa las pida | LEYES 7 | prueba derivada de los casos | `src/programs/program-checks.ts` `tests/program/program.checks.ts` `tests/laws/gate.spec.ts` |
| 115 | El rechazo se dice Código · Causa · Objeto | REGLAS §9 | DEUDA | Hoy una causa es un dato corto sin punto (se rechaza al componer si es una frase); faltan los códigos de un conjunto cerrado. |
| 116 | El nombre de una acción es corto y en minúscula: un verbo sobre su cosa, y lo que confirma es un solo verbo | Franco 11/11 | el programa no arranca | `src/tools/promises.ts` |
| 117 | Un dato con forma solo acepta lo que entra en ella: declararlo como texto libre hace que el programa no arranque | LEYES 11 · Franco 11/11 | el programa no arranca | `src/surface/bridge/asking-parts.ts` `src/surface/masks.ts` `src/catalogs/fields.ts` |
| 118 | Lo que se escribió con forma (CUIT, DNI) se lee siempre con esa forma | Franco 11/11 | prueba derivada de los casos | `src/programs/promised-shapes.ts` `src/programs/promised.ts` |
| 119 | Lo que una fila lee se sigue leyendo cuando su acción no se puede hacer: apagada dice el dato y después por qué; oculta por preferencia queda el dato sin tecla | 11/11 · consecuencia de «una fila que se puede cambiar abre su acción» y de LEYES 5 | prueba derivada de los casos | `src/programs/promised-off.ts` `src/programs/promised-walk.ts` `src/surface/lists.ts` `src/programs/promised-data.spec.ts` |
| 120 | Una pregunta que elige una cosa nunca queda sobre una lista vacía: dice que no hay (o por qué no se llega) y solo deja salir | 11/11 · visto al unir un pago sin ventas | la cumple la superficie | `src/surface/walk.ts` `src/surface/step.ts` `src/surface/bridge/house-tools.ts` `src/programs/promised-also.spec.ts` |
| 121 | Vocabulario cerrado: verbos, estados y objetos salen de un conjunto cerrado; tampoco primera persona | REGLAS §12 | DEUDA | Derivada: un catálogo cerrado de verbos y estados contra el que se lean nombres, causas y resultados de cada programa y los textos de DESERT. |
| 122 | Un dato completo que no vale dice por qué donde se escribe, y ninguna acción corre con él, entre por la puerta que entre: se declara una vez, con el dato | 11/11 · CUIT de un cliente con dígito verificador equivocado | prueba derivada de los casos | `src/catalogs/fields.ts` `src/tools/promises.ts` `src/surface/step.ts` `src/programs/promised-walk.ts` `src/programs/promised-fields.spec.ts` |
| 123 | Una fila que ya lleva todo lo que su acción toma, y que la acción va a rechazar, está apagada diciendo por qué: a nadie se le ofrece lo que ya se sabe que no se puede | LEYES 4 · 11/11, sabotaje que sobrevivía en Equipo | prueba derivada de los casos | `src/programs/promised-walk.ts` `src/programs/promised-known.spec.ts` |
