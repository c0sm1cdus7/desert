// why the house refuses an act, and the purposes of attend and unattend
import { said, type Text } from "../fields/phrases.ts";
import { identityTexts } from "./identities.texts.ts";
export { identityNameTexts } from "./identity-name.texts.ts";
export const effectRefusalTexts = {
  absentHolder: { en: "holder outside the house", es: "titular fuera de la casa" },
  unassignedTool: { en: "tool not given", es: "herramienta no dada" },
  adminKit: { en: "administration kit", es: "kit de administración" },
  repeatedActs: { en: "repeated actions", es: "acciones repetidas" },
  unknownAct: { en: "no such action", es: "acción inexistente" },
  otherAuthor: { en: "author other than whoever acts", es: "autor distinto de quien actúa" },
  otherTool: { en: "fact foreign to the tool", es: "hecho ajeno a la herramienta" },
  houseFact: { en: "fact of the house", es: "hecho de la casa" },
  adminRequired: { en: "requires administration", es: "requiere administración" },
} as const;
export const toolTexts = {
  effectRefused: (kind: string, why: Text) => ({
    en: `Effect not allowed · ${kind} · ${said(why, "en")}`,
    es: `Efecto no permitido · ${kind} · ${said(why, "es")}`,
  }),
  sceneRecipient: (name: string) => ({
    en: `The scene names someone who is not an identity of the house: ${name}`,
    es: `La escena nombra a quien no es una identidad de la casa: ${name}`,
  }),
  scene: {
    en: "Describe what is happening and what each identity needs.",
    es: "Describir lo que está pasando y lo que necesita cada identidad.",
  },
  target: { en: "A tool, or a thing a tool exposes.", es: "Una herramienta, o una cosa que una herramienta expone." },
  attend: { en: "Keep this tool or thing in view.", es: "Tener esta herramienta o cosa a la vista." },
  unattend: {
    en: "Stop keeping this tool or thing in view.",
    es: "Dejar de tener esta herramienta o cosa a la vista.",
  },
  speak: { en: "Choose the language the house is seen in.", es: "Elegir el idioma en que se ve la casa." },
  prefer: {
    en: "Choose what is hidden: what cannot be done, what belongs to others, or empty Attention and Activity.",
    es: "Elegir qué no se ve: lo que no se puede hacer, lo ajeno, o Atención y Actividad sin nada.",
  },
  invalid: { en: "invalid data", es: "datos inválidos" },
  invalidReaction: (tool: string, act: string) => ({
    en: `Invalid reaction · ${tool} · ${act}`,
    es: `Reacción inválida · ${tool} · ${act}`,
  }),
  reactionPending: (id: string, reason: Text) => ({
    en: `Pending reaction · ${id} · ${said(reason, "en")}`,
    es: `Reacción pendiente · ${id} · ${said(reason, "es")}`,
  }),
  legacyReactions: {
    en: "The reaction uses free emissions; it belongs declared as a notice and an action of its own.",
    es: "La reacción usa emisiones libres; declarala como aviso y acción propia.",
  },
  unknown: { en: "no such destination", es: "destino inexistente" },
  unattended: { en: "destination not open", es: "destino sin abrir" },
  unassigned: { en: "no access", es: "sin acceso" },
  outsideKit: { en: "outside the kit", es: "fuera del kit" },
  kitRefusal: (tool: string) =>
    tool === "identities" || tool === "rules" ? identityTexts.only : { en: "outside the kit", es: "fuera del kit" },
  defect: (act: string) => ({
    en: `E-PROG-1 · The program failed · ${act}`,
    es: `E-PROG-1 · Falló el programa · ${act}`,
  }),
  baseFailure: { en: "E-BASE-1 · The base failed", es: "E-BASE-1 · Falló la base" },
  disconnected: { en: "no connection with the service", es: "sin conexión con el servicio" },
  interrupted: { en: "action interrupted", es: "acción interrumpida" },
  withdrawn: { en: "removed", es: "sacada" },
  // What an act answers when it would leave the thing exactly as it is.
  unchanged: { en: "no changes", es: "sin cambios" },
  // A thing an act picks and does not take: it was never on its list.
  draft: { en: "changed while being written", es: "cambió mientras se escribía" },
  // A day in the shape of one that the calendar does not have: the 30th of February.
  noSuchDay: { en: "no such day", es: "día inexistente" },
} as const;
