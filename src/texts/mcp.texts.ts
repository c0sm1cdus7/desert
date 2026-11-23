// Spanish MCP tool descriptions, orientation, results and protocol errors.
export const mcpTexts = {
  instructions: {
    en: "The house gathers identities and programs. Objects: notes/notes/<id>. Cents: 4500 is 45.00.",
    es: "La casa reúne identidades y programas. Objetos: notes/notes/<id>. Centavos: 4500 son 45,00.",
  },
  read: {
    en: `Reads identity, since, scenes, programs and notices; with program, its root. target picks a tool or object
(notes/notes/<id>). Identities uses program: identities. Everyone reads; the kit enables actions.`,
    es: `Lee identity, since, scenes, programs y notices; con program, su raíz. target elige herramienta u objeto
(notes/notes/<id>). Identidades usa program: identities. Todos leen; el kit habilita acciones.`,
  },
  actions: {
    en: `Lists tool, action, name, subject, purpose, input, choices and reason.
program and target pick which actions to list.
reason marks the actions the kit does not allow.`,
    es: `Lista tool, action, name, subject, purpose, input, choices y reason.
program y target eligen qué acciones listar.
reason marca las acciones que el kit no permite.`,
  },
  act: {
    en: "Does an action of the program on the given target, as the kit allows.",
    es: "Hace una acción del programa sobre el target indicado, según el kit.",
  },
  wait: {
    en: "Waits for a change after since, up to 60 seconds; returns seq and changed.",
    es: "Aguarda un cambio posterior a since, hasta 60 segundos; devuelve seq y changed.",
  },
  parse: { en: "The body is not valid JSON.", es: "El cuerpo no es JSON válido." },
  request: {
    en: "The request needs to be a single JSON-RPC 2.0 message, without lists.",
    es: "El pedido debe ser un mensaje JSON-RPC 2.0, sin listas.",
  },
  method: { en: "That method is not available.", es: "Ese método no está disponible." },
  params: {
    en: "Required arguments are missing or have an invalid shape.",
    es: "Faltan argumentos requeridos o tienen una forma inválida.",
  },
  failed: { en: "The request could not be completed.", es: "No se pudo completar el pedido." },
  accepted: { en: "Accepted.", es: "Aceptado." },
  tool: {
    en: "The program is not available for this identity.",
    es: "El programa no está disponible para esta identidad.",
  },
  action: {
    en: "The action or the target does not belong to that program.",
    es: "La acción o el objetivo no corresponden a ese programa.",
  },
  noThings: {
    en: "There are no things yet to do this action on.",
    es: "Todavía no hay cosas sobre las que hacer esta acción.",
  },
  redacted: { en: "[secret]", es: "[secreto]" },
  busy: {
    en: "Too many open waits for this identity; one has to close before another opens.",
    es: "Demasiadas esperas abiertas para esta identidad; cerrá alguna antes de abrir otra.",
  },
  health: "ok",
};
