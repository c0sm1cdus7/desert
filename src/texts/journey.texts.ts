// Explains a mind's journey controls, its cut turns and why a journey woke.
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
    ]),
  }),
  texts: {
    es: ({ control }) =>
      ({
        open: "Abrir un journey con un objetivo y las acciones que necesita, previa revisión.",
        plan: "Anotar el plan inicial del journey con un identificador por paso.",
        done: "Marcar un paso pendiente como terminado y anotar qué quedó hecho.",
        wait: "Poner el journey en espera hasta el momento indicado.",
        resume: "Retomar ahora uno de tus journeys abiertos, con una nota de qué tiene que atender.",
        end: "Terminar el journey y devolver su resumen y referencias, previa revisión.",
        desist: "Desistir del journey y devolver el motivo y las referencias, previa revisión.",
      })[control],
  },
});
/** A journey turn cut short, said in the house scene and to the consciousness it wakes. */
export const journeyCut = defineMessage({
  id: "journey.cut",
  kind: "text",
  parameters: object({ goal: Type.String(), reason: Type.String() }),
  texts: { es: ({ goal, reason }) => `Se cortó un turno del journey «${goal}»: ${reason} No se reintentó nada.` },
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
