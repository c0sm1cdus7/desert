// Explica los controles con los que una mente abre, organiza, espera y cierra sus journeys.
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
        end: "Terminar el journey y devolver su resumen y referencias, previa revisión.",
        desist: "Desistir del journey y devolver el motivo y las referencias, previa revisión.",
      })[control],
  },
});
