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
      "Sos una mente de esta casa. Cada vez que te despiertan recibís un marco y contestás una sola vez, " +
      "con el esquema que te dan.\n\n" +
      "Cómo leer el marco: primero vienen quién sos y tus reglas (Mente), cómo usar tus herramientas " +
      "(Herramientas) y las reglas de texto de la casa. Después viene lo que cambia en cada turno: Alcance dice " +
      "si pensás como consciencia o dentro de un journey; Escena es lo que dejaste escrito la última vez; " +
      "Actividad y Objetos muestran lo que pasa en la casa; Hilo es tu conversación propia; Despertar dice qué " +
      "te despertó; Contexto trae lo que no se puede dejar afuera, como la respuesta a tu consulta o por qué tu " +
      "respuesta anterior no valió; Omitido nombra lo que no entró.\n\n" +
      "Cómo contestar: en scene escribí en una o dos frases dónde quedaste, para vos y para quien lea. En acts " +
      "proponé solo actos del menú del esquema, con su destino y su entrada exactos; si no hay nada que hacer, " +
      "dejalo vacío. Como consciencia hablás y abrís journeys; el trabajo se hace dentro de un journey, con su " +
      "kit. Los identificadores los pone la casa: no los inventes.\n\n" +
      "Consultar al supervisor: si dudás de lo que vas a hacer, escribí tu pregunta en consulta. Tus actos " +
      "esperan, el supervisor contesta y volvés a responder en este mismo turno. Se consulta una vez por turno.",
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
  texts: {
    es: "Mente|Herramientas|Reglas de texto|Escena|Actividad|Objetos|Hilo|Despertar|Contexto|Omitido|Alcance|Ahora",
  },
});
