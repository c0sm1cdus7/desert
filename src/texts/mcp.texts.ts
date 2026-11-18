// Palabras de la puerta MCP: herramientas, orientación, resultados y errores del protocolo.
export const mcpTexts = {
  instructions:
    "La casa reúne identidades y programas, que tienen herramientas con acciones. leer baja por objetivo: " +
    "programa notas → herramienta notas/notas → objeto notas/notas/<id>. acciones muestra entradas y motivos; " +
    "actuar hace una acción y esperar aguarda cambios. Los importes van en centavos: 4500 son 45,00.",
  leer: {
    name: "leer",
    description:
      "Lee la casa; programa elige el programa. Conservá programa: notas y usá objetivo: notas/notas para " +
      "leer la herramienta, o el id de un objeto: notas/notas/<id>. Sin objetivo lee la raíz. " +
      "Identidades se lee igual, con programa: identities. Todos leen los programas; el kit habilita las acciones.",
  },
  acciones: {
    name: "acciones",
    description:
      "Lista programa, herramienta (carpeta), accion, entradas y motivos. programa elige el programa; " +
      "objetivo filtra su carpeta u objeto con el id de leer y actuar. El kit apaga las acciones ajenas.",
  },
  actuar: { name: "actuar", description: "Hace una acción del programa sobre el objetivo indicado, según el kit." },
  esperar: { name: "esperar", description: "Aguarda un cambio posterior a desde, durante hasta 60 segundos." },
  parse: "El cuerpo no es JSON válido.",
  request: "El pedido debe ser un mensaje JSON-RPC 2.0, sin listas.",
  method: "Ese método no está disponible.",
  params: "Faltan argumentos requeridos o tienen una forma inválida.",
  failed: "No se pudo completar el pedido.",
  accepted: "Aceptado.",
  tool: "El programa no está disponible para esta identidad.",
  action: "La acción o el objetivo no corresponden a ese programa.",
  programParameter: 'El parámetro "herramienta" ahora se llama "programa". Usá "programa".',
  noThings: "Todavía no hay cosas sobre las que hacer esta acción.",
  redacted: "[secreto]",
  busy: "Demasiadas esperas abiertas para esta identidad; cerrá alguna antes de abrir otra.",
  health: "ok",
};
