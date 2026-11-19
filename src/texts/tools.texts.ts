// why the house refuses an act, and the purposes of attend and unattend
import { identityTexts } from "./identities.texts.ts";
export { identityNameTexts } from "./identity-name.texts.ts";
export const effectRefusalTexts = {
  absentHolder: "titular fuera de la casa",
  unassignedTool: "herramienta no dada",
  adminKit: "kit de administración",
  repeatedActs: "acciones repetidas",
  unknownAct: "acción inexistente",
  otherAuthor: "autor distinto de quien actúa",
  otherTool: "hecho ajeno a la herramienta",
  houseFact: "hecho de la casa",
  adminRequired: "requiere administración",
} as const;
export const toolTexts = {
  effectRefused: (kind: string, why: string) => `Efecto no permitido · ${kind} · ${why}`,
  sceneRecipient: (name: string) => `La escena nombra a quien no es una identidad de la casa: ${name}`,
  scene: "Describir lo que está pasando y lo que necesita cada identidad.",
  target: "Una herramienta, o una cosa que una herramienta expone.",
  attend: "Tener esta herramienta o cosa a la vista.",
  unattend: "Dejar de tener esta herramienta o cosa a la vista.",
  prefer: "Elegir qué no se ve: lo que no se puede hacer, lo ajeno, o Atención y Actividad sin nada.",
  invalid: "datos inválidos",
  invalidReaction: (tool: string, act: string) => `Reacción inválida · ${tool} · ${act}`,
  reactionPending: (id: string, reason: string) => `Reacción pendiente · ${id} · ${reason}`,
  legacyReactions: "La reacción usa emisiones libres; declarala como aviso y acción propia.",
  unknown: "destino inexistente",
  unattended: "destino sin abrir",
  unassigned: "sin acceso",
  outsideKit: "fuera del kit",
  kitRefusal: (tool: string) => (tool === "identities" || tool === "rules" ? identityTexts.only : "fuera del kit"),
  defect: (act: string): string => `E-PROG-1 · Falló el programa · ${act}`,
  baseFailure: "E-BASE-1 · Falló la base",
  disconnected: "sin conexión con el servicio",
  interrupted: "acción interrumpida",
  withdrawn: "sacada",
  unchanged: "sin cambios", // What an act answers when it would leave the thing exactly as it is.
  draft: "cambió mientras se escribía", // A thing an act picks and does not take: it was never on its list.
  noSuchDay: "día inexistente", // A day in the shape of one that the calendar does not have: the 30th of February.
} as const;
