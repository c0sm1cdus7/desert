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
      "(Herramientas), las reglas de texto y el Menú: un acto por línea con sus destinos; sus entradas y límites " +
      "están en el esquema. Después, tu Hilo, tu conversación propia, y al final lo que cambia: Alcance (consciencia " +
      "o journey), Escena (lo que dejaste escrito), Contexto, Objetos (tus listas y lo que está en juego), lo más " +
      "nuevo del Hilo, Actividad (lo que pasó desde tu última respuesta), Despertar (lo que te despertó) y Omitido " +
      "(cuánto no entró). Lo recortado se lee entero con read; un identificador largo se muestra corto y la casa " +
      "lo entiende así. Lo que pasa después dentro del turno llega en mensajes nuevos.\n\n" +
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
/** The read act and the cuts it undoes: what a capped object left out, how many lines of Actividad are older, how
 * many things stayed rows of their list (22/11, UNSIGNED). */
export const frameReading = defineMessage({
  id: "mind.frame.reading",
  kind: "house",
  parameters: object({
    part: Type.Union(
      ["purpose", "targets", "journeys", "older", "field", "lines", "whole", "quiet"].map(p => Type.Literal(p)),
    ),
    count: Type.Integer(),
    id: Type.String(),
  }),
  texts: {
    es: ({ part, count, id }) =>
      ({
        purpose:
          "Trae entero, desde el carácter from, un objeto o lo anterior de Actividad; la casa te lo devuelve en " +
          "este mismo turno. Como consciencia, si tu respuesta lee, volvés a contestar con lo leído.",
        targets: "Actividad, o cualquier objeto por su id",
        journeys: "uno de los journeys abiertos, por su id",
        older: `Hay ${count} líneas de antes de tu última respuesta: read Actividad las trae, de la más nueva atrás.`,
        field: `…[${count} caracteres más]…`,
        lines: `…[${count} líneas más]…`,
        whole: `[Recortado de ${count} caracteres: read ${id} lo trae entero.]`,
        quiet: `${count} objetos sin novedad desde tu última respuesta son filas de su lista: read <id> trae uno.`,
      })[part] ?? "",
  },
});
