// Palabras de la puerta MCP: herramientas, orientación, resultados y errores del protocolo.
export const mcpTexts = {
  instructions:
    "La casa reúne identidades y herramientas. leer muestra la escena, la parte y los avisos; " +
    "acciones muestra el kit y sus entradas; actuar hace un acto y esperar aguarda cambios. " +
    "Los importes van en centavos, como en una caja registradora: 4500 son 45,00.",
  leer: {
    name: "leer",
    description:
      "Lee la casa; con herramienta, lee el programa. Para bajar a una herramienta, repetí herramienta y " +
      "pasá su id como objetivo (notas/notas); para leer un objeto, usá el id de esa lista como objetivo " +
      "(notas/notas/<id>). Sin objetivo muestra la raíz. Todos leen los programas; el kit habilita las acciones.",
  },
  acciones: {
    name: "acciones",
    description:
      "Lista acciones, entradas y motivos que las impiden. herramienta elige el programa; objetivo filtra " +
      "su carpeta u objeto, con el mismo id que leer y actuar. Las acciones ajenas de programas se muestran " +
      "apagadas por el kit.",
  },
  actuar: { name: "actuar", description: "Hace una acción del kit sobre una herramienta o una de sus cosas." },
  esperar: { name: "esperar", description: "Aguarda un cambio posterior a desde, durante hasta 60 segundos." },
  parse: "El cuerpo no es JSON válido.",
  request: "El pedido debe ser un mensaje JSON-RPC 2.0, sin listas.",
  method: "Ese método no está disponible.",
  params: "Faltan argumentos requeridos o tienen una forma inválida.",
  failed: "No se pudo completar el pedido.",
  accepted: "Aceptado.",
  tool: "La herramienta no está en el kit de esta identidad.",
  action: "La acción o el objetivo no corresponden a esa herramienta.",
  noThings: "Todavía no hay cosas sobre las que hacer esta acción.",
  redacted: "[secreto]",
  busy: "Demasiadas esperas abiertas para esta identidad; cerrá alguna antes de abrir otra.",
  health: "ok",
};
