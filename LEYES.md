# Leyes de los programas sobre DESERT

Decididas por Franco el 10/11/2026. Valen para todo programa (Kenon, Capibara). Cada una dice si ya está o si se debe.

Qué hace cumplir cada ley, y cada regla de la terminal, está en `GARANTIAS.md`: sale de `tests/laws/rules.json`, y el gate falla si una ley no tiene garantía ni figura como deuda (Franco, 11/11: «si no, no es una regla, es un deseo»).

| # | Ley | Estado |
|---|---|---|
| 1 | Toda acción lleva propósito, como la herramienta. | HECHO: `programAct` lo exige, corto y sin ser una oración. A la derecha de una acción nunca hay nada: va su dato; si no tiene, que no se deshace; si no, su propósito (Franco, 11/11: «no puede estar vacío»; reemplaza «un dato o nada» de esa mañana). Lo comprueba el recorrido derivado. |
| 2 | Toda acción, toda opción de menú y toda opción de una pregunta (también el verbo que confirma) lleva su tecla rápida. | HECHO: `programAct` y cada menú exigen su tecla; las opciones de una pregunta llevan la suya; toda fila que lleva a algo y no trae tecla toma un número (1 a 9, en el orden en que se listan); al componer el programa fallan dos teclas iguales y una acción con la tecla que vuelve, y el recorrido derivado falla si dos filas de una lista usan la misma. SE DEBE: pasadas las nueve, una fila sin tecla se alcanza moviéndose o buscando. |
| 3 | Todo lo que se puede hacer en la casa es una acción del catálogo de un programa o del core. Sólo arrancar la casa queda afuera. Cada acción declara sus datos, palabras, permisos y casos; su pantalla sale de esa declaración. | Guardias 295–299: `coreRegistry` arma la casa y la compuerta; `actionCatalogCoverage` rechaza definiciones sueltas; `factCoverage` exige una acción emisora o una excepción autónoma explícita y motivada; `unusedCatalogTexts` y `testOnlyExports` rechazan textos sin uso y exportados usados sólo por pruebas, salvo `desert/testing` y las entradas publicadas en `package.exports`, que cuentan como consumo externo. Nunca se retira una entrada pública para satisfacer la compuerta. |
| 4 | El programa muestra todas sus acciones: la que el estado no deja ejecutar, apagada con su motivo; la ajena, también apagada. | HECHO: una acción que la herramienta dice que ahora no se puede hacer queda en la lista, en su lugar y con su tecla, apagada y diciendo ese motivo; su tecla no hace nada. Cada herramienta se abre y se lee; sus acciones fuera del kit quedan apagadas con el motivo correspondiente. De cada rechazo declarado, cada herramienta y cada acción fuera del kit sale la prueba. Una acción de una herramienta se ofrece también sobre la cosa de otra (registrar un pago desde su venta: `also`) y ahí se apaga con el motivo de esa cosa; una acción sobre la herramienta misma también se apaga cuando la herramienta dice por qué (Equipo, para quien no administra). SE DEBE: que la preferencia de ocultar lo apagado valga también para esas filas ofrecidas desde otra herramienta. |
| 5 | Ocultar las apagadas, las ajenas o un stack vacío es una preferencia del programa de cada usuario, no una regla. | HECHO: cada integrante elige en Preferencias, en el Menú, si oculta lo apagado, lo ajeno y Atención y Actividad mientras no tienen nada; la casa lo guarda como un hecho suyo y vale en toda superficie. |
| 6 | Navegando el programa se llega a todas las acciones; DESERT lo garantiza. | Guardia 295: `programChecks` usa el mismo `coreRegistry` que `startHouse`, incluyendo Casa, Reglas e Identidades cuando la composición las pide. `walkedChecks` sale del Menú y usa el router compartido por los dibujantes. Una acción aceptada que no se alcanza pone la compuerta roja; una acción que no se puede hacer explica su causa. La muestra de DESERT recorre destino casa, dispositivo y ambos, entrada secreta, objeto propio y ajeno. |
| 7 | Ninguna spec se escribe a mano: se derivan de lo que el programa promete. Las reglas propias se prometen con casos declarados junto a cada acción. | Guardias 295 y 300: los casos de programas y core generan la prueba sobre la casa, su reapertura y el recorrido por pantalla; las pruebas adversarias verifican el derivador y sus leyes. `contractChecks` hace correr a quien ofrece los casos de quienes piden, mediante `runContractCases`. Se conservan las guardias de rechazo, kit, opacidad, plegados, registros guardados y actualización. Las pruebas de infraestructura y de las guardias no reemplazan casos declarados de acciones. |
| 8 | Dos stacks fijos en todos los menús: Atención (objetos que necesitan que alguien actúe, con su porqué) y Actividad (lo que hizo el resto desde que miraste). | HECHO: las dos listas abren el Menú y el menú de cada herramienta, también vacías. Atención la declara cada herramienta desde lo que guarda (`needs`) y se va cuando deja de ser cierto; la herramienta queda marcada en el Menú. Actividad es lo último que otros escribieron sobre cada cosa desde que la tuviste a la vista, y abrirla la saca. De cada caso sale la prueba. Puede pedir atención la herramienta misma, no solo una de sus cosas, y lo que pide puede depender del día (`needs(state, now)`: lo que hoy vence mañana está vencido). Una lista con algo se queda aunque la persona prefiera no ver las vacías. SE DEBE: marcar todo como visto de una vez. |
| 9 | Viaja el estado, y un router único es compartido por todos los renderers. | Router HECHO (`src/surface/router/router.ts`); la puerta se debe. |
| 10 | Un registro escrito solo para dejar constancia no le pide atención a nadie. | HECHO (`silent`). |
| 11 | Un campo es siempre de texto y lleva máscara o placeholder, nunca el genérico «texto». Un campo con formato solo acepta lo que entra en él y muestra su forma («$ 0,00», «dd/mm/aaaa»). La máscara sale de la declaración del dato, la misma con la que valida la casa. | HECHO: un campo de texto sin máscara ni placeholder no compila (`surface/contract/contract.ts`); los formatos son un catálogo cerrado (`surface/formats/masks.ts`: monto como caja registradora, cantidad, día) y salen de la declaración del dato (`fields/fields.ts`); las preguntas de una acción salen de lo que toma (`surface/bridge/questions/asking.ts`), y al componer el programa se rechaza cualquier dato que no se pueda preguntar. HECHO (12/11): un campo completo que no vale dice por qué en texto 3, sin «Error» ni `enter`; lo incompleto muestra en gris la forma que falta. Desde el 11/11: un dato con forma (CUIT, DNI, punto de venta) lleva siempre máscara, la misma al escribirlo y al leerlo; declararlo como texto libre hace que el programa no arranque; y un dato completo que no vale dice por qué donde se escribe. |
| 12 | Editar es un menú: muestra como opciones lo que se puede editar, cada una con su valor de hoy, y cada opción es su propia acción. Nunca se edita recorriendo la acción de crear con los valores cargados. Un menú puede llevar a otro menú. | HECHO: una acción de una cosa puede vivir bajo un menú de sus acciones (`under`), una fila empieza una acción con lo que la cosa tiene hoy y puede preguntar una sola parte, y un menú abre otro. En Capibara, Editar una venta muestra a nombre de quién y cada artículo; cada artículo abre su menú (descripción, cantidad, precio, quitar). |
| 13 | Buscar es un modo de los menús: en un menú, espacio entra; se escribe y se ven solo los objetos que coinciden (los de la herramienta, o los de todo el programa desde el Menú principal), sin el stack de acciones. Esc cierra; enter sobre un objeto lleva a él. Solo sobre menús. | HECHO: en el Menú y en el menú de cada herramienta. Cada herramienta dice cómo se encuentran sus cosas; de cada caso sale la prueba de que lo que deja se encuentra por su nombre. Desde el 11/11 vale también dentro de una pregunta que elige una cosa: la lista se ve de entrada, las primeras nueve filas llevan número y espacio busca. |
| 14 | Un objeto es presentación y menú: se lee siempre en los mismos grupos, en el mismo lugar; lo que nombra se abre; arriba nunca hay acciones. | HECHO (11/11): la herramienta declara los grupos de sus objetos (`presents`) y da la lectura; la base dibuja el objeto, numera lo que nombra (1 a 9) y lo abre sea de la herramienta que sea; un grupo vacío lo dice; las acciones van al final. Ninguna pantalla de un programa dibuja un objeto. |
| 15 | Un valor sugerido se reemplaza con la primera tecla. | HECHO (11/11): una pregunta que abre con algo escrito lo muestra entero y encendido; escribir lo reemplaza, una flecha o borrar lo editan. |

El número 16 no se usa: Franco, 22/11/2026: programa alberga herramientas.

Cómo se tipea un monto (Franco, 10/11): como caja registradora. Solo dígitos, que entran desde la derecha con dos
decimales fijos: para $ 1.500 se tipea 150000 y se ve «$ 1.500,00». Los formatos son un catálogo cerrado de DESERT
(monto, cantidad, número, día, dígitos con forma, número con ceros, texto de ciertos caracteres), para que cada renderer
sepa qué teclado ofrecer; cómo se escribe la plata y la fecha en cada
país lo declara el programa una vez.

## Lo que queda por saldar
- Que ocultar lo apagado valga también para una acción ofrecida desde la cosa de otra herramienta (ley 4).
- El storyboard y los recorridos específicos de cada puerta siguen fuera de la prueba del router compartido; las acciones del core ya declaran sus casos.
- La puerta para otros dispositivos (ley 9).
- Lo que pidió la obra de Capibara del 11/11 y la base todavía no hace está listado al final de `PROGRAMA.md`.

## Una acción recibe referencias, nunca material secreto (A01)

La marca `secret: true` hace que la base valide el ingreso y entregue referencias antes de todo callback del
programa. Solo un adaptador declarado por la composición obtiene la capacidad de resolverlas. Acciones y arranques
reciben puertos públicos y operaciones de vínculos. Las reglas 208 a 212 registran custodia, ciclo de vida, contratos,
ingreso y ley de dependencias; sus pruebas incluyen programas rotos a propósito y un centinela sin sustitución.

La ley 212, incluida en la compuerta de cada programa, sigue imports transitivos, alias, reexportaciones, imports
dinámicos y tipos. Prohíbe custodias y fábricas en herramientas, además de I/O, entorno y evaluación que esquiven
el puerto. Imports desconocidos se rechazan; los nombres públicos permitidos están en `secret-public-api.ts`.
Composición y adaptadores no pueden mezclar declaraciones de herramientas. `PROGRAMA.md` explica la separación,
la migración completa y el recorrido de una llave de firma, desde su ingreso hasta revocación y limpieza pendiente.

La garantía no prueba que un adaptador sea correcto ni que sus datos públicos no codifiquen material privado.
Tampoco aísla JavaScript hostil ni borra copias fuera de la casa. La revisión histórica solo acredita las posiciones
que pudo revisar con los esquemas actuales. Ni esa marca ni el cifrado acreditan autorización del fisco.

## Contrato de la casa (14/11)

Las garantías 219, 220 y 221 agregan el kit en dos niveles, la mente que actúa con su propio nombre sin ser una
identidad, y la última escena de cada autor leída por todos. Dar una herramienta conserva su sentido: sin recorte,
una identidad tiene todas sus acciones; una mente necesita un kit explícito de su propia herramienta. Quien
administra no tiene recorte y al recibir la administración pierde todos sus kits. El programa ofrece por `own`
actos solo para identidades; a la mente la casa le ofrece su escena. Las partes de una escena nombran identidades
presentes y tanto textos como nombres tienen tope. La garantía 223 permite dirigir una necesidad calculada por
código a una identidad que tenga la herramienta; si no puede verla, llega a quienes la tienen. La comprobación
derivada mira también desde cada destinatario prometido y falla si no puede verla. La escena explica, no calcula.
Queda la deuda 224: una acción fuera del kit debe verse apagada con su motivo (leyes 4 y 6), a saldar por lectura y kit.
El número 222 no se usa: el mensaje corresponde al motor de la mente.


## La mente actúa desde su herramienta (14/11, ley 256)

La mente de una herramienta actúa desde su proceso por ToolStartup.act, por la ejecución de todos y con el nombre mind:<herramienta> fijado por la casa. Pide acciones de su herramienta según el kit dado por quien administra, y su propia escena sin kit. Su bus conserva on y together; emit solo admite comandos originales de sus credenciales y pedidos o cancelaciones de despertares propios, a nombre de esa mente. Rechaza a la vista cualquier otro hecho o autor, sin escribirlo. La causa es el hecho que se estaba oyendo cuando nació el pedido, también en una continuación asincrónica; fuera de una escucha no inventa causa. Si se deshace esa escritura o el together donde se pidió, el acto se rechaza sin escribir a nombre de la mente. Cada acto diferido cede una tarea a la casa; una cadena de la misma mente causada por sus actos admite 32 actos y rechaza el siguiente. act siempre resuelve: datos ilegibles o no serializables dan datos inválidos; una falla interna da el texto de falla de la base y se intenta guardar su diagnóstico. Las escrituras del acto y de sus oyentes se confirman juntas o se deshacen. Solo el reloj escribe woke; otra herramienta no cancela ni reemplaza un despertar propio. El reloj conserva fechas pendientes y no repite despertares entregados al reabrir. El programa revisa su estado al arrancar para recuperar trabajo pendiente si el despertar llegó justo al cerrar. El arranque no recibe ejecución, registro de herramientas, custodia ni resolvedor, ni anidados. Cerrar invalida la puerta y reabrir cierra como interrumpido un acto en curso. Cada escritura conjunta anidada tiene su punto de guardado: si falla, restaura sus hechos, secuencia y plegados sin borrar lo anterior de la externa; si falla la externa, deshace también las internas confirmadas. Lo que una escritura deshecha dejó en la cola se retira antes de seguir entregando, para todos los oyentes y el reloj. Una escritura fallida no invalida una causa confirmada de otra escritura. Al cerrar cada casa de prueba se comprueba sobre todo el registro que cada causa existe. El recibo del registro no presenta la sesión de custodia como una causa: esa referencia permanece en el dato autenticado de custodia. El reloj restaura sus fechas y temporizadores al deshacer un pedido, reemplazo o cancelación ya oídos dentro de una escritura.

El estado que recibe el código del programa es de solo lectura hasta el fondo, también en cálculos, arranques, vistas, actos, efectos, necesidades, resúmenes y superficies. Las mutaciones fallan a la vista sin cambiar la casa; las lecturas reutilizan vistas por referencia sin copiar toda la casa.
