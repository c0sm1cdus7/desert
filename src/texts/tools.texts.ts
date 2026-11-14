export const identityNameTexts = {
  house: "nombre reservado para la casa",
  mind: "prefijo reservado para una mente",
  trim: "nombre no está recortado",
  control: "carácter de control",
  format: "carácter de formato",
  visible: "nombre sin carácter visible",
} as const;

export const toolTexts = {
  sceneRecipient: (name: string) => `La escena nombra a quien no es una identidad de la casa: ${name}`,
  scene: "Describir lo que está pasando y lo que necesita cada identidad.",
  target: "Una herramienta, o una cosa que una herramienta expone.",
  attend: "Tener esta herramienta o cosa a la vista.",
  unattend: "Dejar de tener esta herramienta o cosa a la vista.",
  prefer: "Elegir qué no se ve: lo que no se puede hacer, lo ajeno, o Atención y Actividad sin nada.",
  invalid: "datos inválidos",
  unknown: "destino inexistente",
  unattended: "destino sin abrir",
  unassigned: "sin acceso",
  outsideKit: "fuera del kit",
  defect: (act: string): string => `E-PROG-1 · Falló el programa · ${act}`,
  baseFailure: "E-BASE-1 · Falló la base",
  disconnected: "sin conexión con el servicio",
  unavailable: "acción fallida",
  interrupted: "acción interrumpida",
  withdrawn: "sacada",
  /** What an act answers when it would leave the thing exactly as it is. */
  unchanged: "sin cambios",
  /** A thing an act picks and does not take, given the rest of what it was told: it was never on its list. */
  draft: "cambió mientras se escribía",
  /** A day written in the shape of one that the calendar does not have: the 30th of February. */
  noSuchDay: "día inexistente",
} as const;
