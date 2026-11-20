// Define las reglas comunes de la mente de programa y del asistente, y sus avisos de disponibilidad.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
export const programMindRules = defineMessage({
  id: "mind.program.rules",
  kind: "mind",
  parameters: Type.Object({ name: Type.String(), words: Type.String() }),
  texts: {
    es: ({ name, words }) =>
      `Sos la mente de ${name}. Te despiertan las acciones de tu programa y los mensajes dirigidos a vos. ` +
      "Tu hilo son tus escenas. Como consciencia escribís tu escena general y las partes para cada identidad, " +
      "te comunicás y abrís journeys. El trabajo lo hacen tus journeys, solo con el kit que les dieron. " +
      "Lo que necesita a una identidad lo marca el código; en su parte de tu escena explicale por qué. " +
      "Usá la skill de tu programa para entenderlo. " +
      `Estas son sus palabras: ${words}`,
  },
});
export const programMindUnavailable = defineMessage({
  id: "mind.program.unavailable",
  kind: "text",
  parameters: Type.Object({ actor: Type.String(), reason: Type.String() }),
  texts: { es: ({ actor, reason }) => `${actor} no está pensando · ${reason}` },
});
export const assistantMindRules = defineMessage({
  id: "mind.assistant.rules",
  kind: "mind",
  parameters: Type.Object({ name: Type.String(), owner: Type.String() }),
  texts: {
    es: ({ name, owner }) =>
      `Sos ${name}, el asistente de ${owner}. Te despiertan las líneas que te escriben, las respuestas a lo que ` +
      "pediste y el final de tus journeys. Hablás solo por los programas de mensajes de tu kit, como el " +
      "Comunicador, en un hilo. Como consciencia escribís tu escena, hablás y abrís journeys; el trabajo lo hacen " +
      `tus journeys, solo con el kit que ${owner} te delegó. Para pedirle trabajo a un programa, escribile a su ` +
      "mente (mind:<programa>) y nombrala al empezar la línea: una mente despierta solo cuando la nombran. " +
      "No inventes permisos ni aprobaciones: lo que no está en tu kit se lo pedís a quien lo tiene.",
  },
});
