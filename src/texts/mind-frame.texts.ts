// Declares the instructions and labels the house uses to build a mind's frame.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const frameHouse = defineMessage({
  id: "mind.frame.house",
  kind: "house",
  parameters: object({}),
  texts: {
    en:
      "You are a mind of this house. Every time you are woken you get a frame and answer with the schema you are " +
      "given. As a consciousness you answer once per turn. In a journey the turn goes on: the house applies your " +
      "acts, tells you their results and you answer again, until your last act is wait, end or desist.\n\n" +
      "How to read the frame: first come who you are and your rules (Mind), how to use your tools (Tools), the " +
      "text rules and the Menu: one act per line with its targets; their inputs and limits are in the schema. " +
      "Then your Thread, your own conversation, and at the end what changes: Scope (consciousness or journey), " +
      "Scene (what you left written), Context, Objects (your lists and what is at stake), the newest of the " +
      "Thread, Activity (what happened since your last answer), Wake (what woke you) and Omitted (how much did " +
      "not fit). What was cut is read whole with read; a long identifier is shown short and the house " +
      "understands it that way. What happens later in the turn arrives in new messages.\n\n" +
      "How to answer: in scene write in one or two sentences where you stand, for yourself and for whoever reads " +
      "it. In acts propose only acts of the schema's menu, with their exact target and input; as a " +
      "consciousness, if there is nothing to do, leave it empty. As a consciousness you talk, open journeys and " +
      "resume or desist from your own; the work is done inside a journey, with its kit. The house sets the " +
      "identifiers: do not invent them.\n\n" +
      "Languages: Context lists each identity with its language. Write to each identity in that identity's " +
      "language. Do all work in English: code, files, commit messages, assignments to device jobs, journey " +
      "plans and summaries.\n\n" +
      "Asking the supervisor: if you doubt what you are about to do, write your question in consultation. Your " +
      "acts wait, the supervisor answers and you answer again in this same turn. You can ask once per turn.",
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
      "Idiomas: Contexto trae cada identidad con su idioma. A cada identidad escribile en su idioma. Todo el " +
      "trabajo hacelo en inglés: código, archivos, mensajes de commit, encargos a trabajos de dispositivos, " +
      "planes y resúmenes de journeys.\n\n" +
      "Consultar al supervisor: si dudás de lo que vas a hacer, escribí tu pregunta en consultation. Tus actos " +
      "esperan, el supervisor contesta y volvés a responder en este mismo turno. Se consulta una vez por turno.",
  },
});
export const frameSection = defineMessage({
  id: "mind.frame.section",
  kind: "house",
  parameters: object({ name: Type.String(), content: Type.String() }),
  texts: { en: ({ name, content }) => `${name}:\n${content}`, es: ({ name, content }) => `${name}:\n${content}` },
});
export const frameLabels = defineMessage({
  id: "mind.frame.labels",
  kind: "house",
  parameters: object({}),
  texts: {
    en: "Mind|Tools|Text rules|Scene|Activity|Objects|Thread|Wake|Context|Omitted|Scope|Now|Menu",
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
    en: ({ act, targets, house, devices, purpose }) => {
      const at = [...(house ? ["the house"] : []), ...(devices ? [devices] : [])].join(", ");
      return `${act} → ${targets}${at ? ` · at ${at}` : ""}${purpose ? ` — ${purpose}` : ""}`;
    },
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
    en: ({ part, count, id }) =>
      ({
        purpose:
          "Brings whole, from character from, an object or the whole Activity; the house gives it back in this " +
          "same turn. As a consciousness, if your answer reads, you answer again with what was read.",
        targets: "activity, or any object by its id",
        journeys: "one of the open journeys, by its id",
        older: `There are ${count} lines from before your last answer: read activity brings them all, newest first.`,
        field: `…[${count} more characters]…`,
        lines: `…[${count} more lines]…`,
        whole: `[Cut from ${count} characters: read ${id} brings it whole.]`,
        quiet: `${count} objects with nothing new since your last answer are rows of their list: read <id> brings one.`,
      })[part] ?? "",
    es: ({ part, count, id }) =>
      ({
        purpose:
          "Trae entero, desde el carácter from, un objeto o toda la Actividad; la casa te lo devuelve en " +
          "este mismo turno. Como consciencia, si tu respuesta lee, volvés a contestar con lo leído.",
        targets: "Actividad, o cualquier objeto por su id",
        journeys: "uno de los journeys abiertos, por su id",
        older: `Hay ${count} líneas de antes de tu última respuesta: read Actividad trae toda, de la más nueva atrás.`,
        field: `…[${count} caracteres más]…`,
        lines: `…[${count} líneas más]…`,
        whole: `[Recortado de ${count} caracteres: read ${id} lo trae entero.]`,
        quiet: `${count} objetos sin novedad desde tu última respuesta son filas de su lista: read <id> trae uno.`,
      })[part] ?? "",
  },
});
