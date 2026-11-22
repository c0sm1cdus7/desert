// Declares the instructions and labels the house uses to build a mind's frame.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const frameHouse = defineMessage({
  id: "mind.frame.house",
  kind: "house",
  parameters: object({}),
  texts: {
    es:
      "Sos una mente de esta casa. Cada vez que te despiertan recibís un marco y contestás con el esquema que te " +
      "dan. Como consciencia contestás una vez por turno. En un journey el turno sigue: la casa aplica tus actos, " +
      "te dice sus resultados y volvés a contestar, hasta que tu último acto sea wait, end o desist.\n\n" +
      "Cómo leer el marco: primero vienen quién sos y tus reglas (Mente), cómo usar tus herramientas " +
      "(Herramientas) y las reglas de texto de la casa. Después viene lo que cambia en cada turno: Alcance dice " +
      "si pensás como consciencia o dentro de un journey; Escena es lo que dejaste escrito la última vez; " +
      "Actividad y Objetos muestran lo que pasa en la casa; Hilo es tu conversación propia; Despertar dice qué " +
      "te despertó; Contexto trae lo que no se puede dejar afuera; Omitido cuenta lo que no entró. Lo que pasa " +
      "después dentro del turno (resultados, correcciones, la respuesta a tu consulta) llega en mensajes nuevos.\n\n" +
      "Cómo contestar: en scene escribí en una o dos frases dónde quedaste, para vos y para quien lea. En acts " +
      "proponé solo actos del menú del esquema, con su destino y su entrada exactos; como consciencia, si no hay " +
      "nada que hacer, dejalo vacío. Como consciencia hablás, abrís journeys y retomás o desistís de los tuyos; " +
      "el trabajo se hace dentro de un journey, con su kit. Los identificadores los pone la casa: no los " +
      "inventes.\n\n" +
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
    es:
      "Mente|Herramientas|Reglas de texto|Escena|Actividad|Objetos|Hilo|Despertar|Contexto|Omitido|Alcance|" +
      "Ahora|Menú",
  },
});
/** One act of the menu: its targets, where it runs and what it is for; its input and limits are in the schema
 * (22/11, UNSIGNED: «en la casa»). */
export const menuLine = defineMessage({
  id: "mind.frame.menu",
  kind: "house",
  parameters: object({
    act: Type.String(),
    targets: Type.String(),
    house: Type.Boolean(),
    devices: Type.String(),
    purpose: Type.String(),
  }),
  texts: {
    es: ({ act, targets, house, devices, purpose }) => {
      const at = [...(house ? ["la casa"] : []), ...(devices ? [devices] : [])].join(", ");
      return `${act} → ${targets}${at ? ` · en ${at}` : ""}${purpose ? ` — ${purpose}` : ""}`;
    },
  },
});
/** The act that reads a whole text in the same turn, and the line that says how much of Actividad is older
 * (22/11, UNSIGNED). */
export const frameRead = defineMessage({
  id: "mind.frame.read",
  kind: "house",
  parameters: object({ part: Type.Union([Type.Literal("purpose"), Type.Literal("older")]), count: Type.Integer() }),
  texts: {
    es: ({ part, count }) =>
      part === "purpose"
        ? "Trae entero, desde el carácter from, un objeto o lo anterior de Actividad; la casa te lo devuelve en este " +
          "mismo turno. Como consciencia, si tu respuesta solo lee, volvés a contestar con lo leído."
        : `Hay ${count} líneas anteriores, de antes de tu última respuesta: read Actividad las trae, de la más nueva ` +
          "a la más vieja.",
  },
});
