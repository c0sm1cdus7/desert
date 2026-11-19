// Spanish MCP tool descriptions, orientation, results and protocol errors.
export const mcpTexts = {
  instructions: "La casa reúne identidades y programas. Objetos: notas/notas/<id>. Centavos: 4500 son 45,00.",
  read: `Lee la casa o el programa elegido con program. target elige su herramienta (notas/notas) u objeto
(notas/notas/<id>); sin target lee la raíz. Identidades usa program: identities. Todos leen; el kit habilita acciones.`,
  actions: "Lista program, herramienta, action, entradas y motivos. target filtra el destino; el kit limita acciones.",
  act: "Hace una acción del programa sobre el target indicado, según el kit.",
  wait: "Aguarda un cambio posterior a since, durante hasta 60 segundos.",
  parse: "El cuerpo no es JSON válido.",
  request: "El pedido debe ser un mensaje JSON-RPC 2.0, sin listas.",
  method: "Ese método no está disponible.",
  params: "Faltan argumentos requeridos o tienen una forma inválida.",
  failed: "No se pudo completar el pedido.",
  accepted: "Aceptado.",
  tool: "El programa no está disponible para esta identidad.",
  action: "La acción o el objetivo no corresponden a ese programa.",
  programParameter: 'El parámetro "herramienta" ahora se llama "program". Usá "program".',
  noThings: "Todavía no hay cosas sobre las que hacer esta acción.",
  redacted: "[secreto]",
  busy: "Demasiadas esperas abiertas para esta identidad; cerrá alguna antes de abrir otra.",
  health: "ok",
};
