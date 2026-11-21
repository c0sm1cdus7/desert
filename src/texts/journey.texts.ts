// Explains a mind's journey controls, its cut and stopped turns and why a journey woke.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const journeyControlPurpose = defineMessage({
  id: "journey.control.purpose",
  kind: "text",
  parameters: object({
    control: Type.Union([
      Type.Literal("open"),
      Type.Literal("plan"),
      Type.Literal("done"),
      Type.Literal("wait"),
      Type.Literal("resume"),
      Type.Literal("end"),
      Type.Literal("desist"),
      Type.Literal("interrupt"),
    ]),
  }),
  texts: {
    es: ({ control }) =>
      ({
        open: "Abrir un journey con un objetivo y las acciones que necesita.",
        plan: "Anotar el plan inicial del journey con un identificador por paso.",
        done: "Marcar un paso pendiente como terminado y anotar qué quedó hecho.",
        wait: "Poner el journey en espera hasta el momento indicado.",
        resume: "Retomar ahora uno de tus journeys abiertos, con una nota de qué tiene que atender.",
        end: "Terminar el journey y devolver su resumen y referencias.",
        desist: "Desistir del journey y devolver el motivo y las referencias.",
        interrupt: "Frenar un journey abierto de cualquier mente, con el motivo que va a leer su consciencia.",
      })[control],
  },
});
/** A journey turn cut short, said in the house scene and, with how many cuts it has, to the consciousness it wakes. */
export const journeyCut = defineMessage({
  id: "journey.cut",
  kind: "text",
  parameters: object({ goal: Type.String(), reason: Type.String(), cuts: Type.Optional(Type.Integer()) }),
  texts: {
    es: ({ goal, reason, cuts }) =>
      `Se cortó un turno del journey «${goal}»: ${reason} No se reintentó nada.` +
      (cuts === undefined ? "" : ` Turnos cortados de este journey hasta ahora, contando este: ${cuts}.`),
  },
});
/** Why a journey woke, in words: the house restarted during its turn, or its consciousness went back to it. */
export const journeyWoke = defineMessage({
  id: "journey.woke",
  kind: "text",
  parameters: object({ cause: Type.Union([Type.Literal("restart"), Type.Literal("resume")]), note: Type.String() }),
  texts: {
    es: ({ cause, note }) =>
      cause === "restart"
        ? "La casa se reinició durante el turno anterior de este journey y no se repitió nada: mirá cómo quedó."
        : `Tu consciencia retomó este journey: ${note}`,
  },
});
/** What wakes a consciousness when the supervisor stops one of its journeys: the goal, the reason and what is left. */
export const journeyInterrupted = defineMessage({
  id: "journey.interrupted",
  kind: "text",
  parameters: object({ goal: Type.String(), reason: Type.String(), pending: Type.String() }),
  texts: {
    es: ({ goal, reason, pending }) =>
      `El supervisor frenó tu journey «${goal}»: ${reason} Quedó pendiente: ${pending || "nada"}. No corre ni ` +
      "despierta hasta que decidas: retomalo con resume atendiendo el motivo, o desistí con desist.",
  },
});
