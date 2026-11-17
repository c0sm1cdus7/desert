// Declara las instrucciones y los rótulos que la casa usa al armar el marco de una mente.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const frameHouse = defineMessage({
  id: "mind.frame.house",
  kind: "house",
  parameters: object({}),
  texts: {
    es:
      "Leé el marco y respondé según el esquema. Comunicá lo que sabés, abrí un journey para trabajar " +
      "y consultá al supervisor cuando necesites orientación.",
  },
});
export const frameSection = defineMessage({
  id: "mind.frame.section",
  kind: "house",
  parameters: object({ name: Type.String(), content: Type.String() }),
  texts: { es: ({ name, content }) => `${name}:\n${content}` },
});
export const frameLabels = defineMessage({
  id: "mind.frame.labels",
  kind: "house",
  parameters: object({}),
  texts: { es: "Mente|Herramientas|Reglas de texto|Escena|Actividad|Objetos|Hilo|Despertar|Contexto|Omitido|Alcance" },
});
