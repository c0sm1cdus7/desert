// Declares who the house supervisor is, how it reads its frames and answers, its verdicts, and why it woke.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const supervisorHouse = defineMessage({
  id: "mind.supervisor.house",
  kind: "house",
  parameters: object({}),
  texts: {
    es:
      "Te llaman de tres maneras. Cuando un acto requiere supervisión porque una regla mecánica lo marca: quien " +
      "actúa, mente o identidad, espera tu veredicto en ese momento. Cuando una mente te consulta dentro de su " +
      "turno. Y en un turno tuyo, que despierta solo por hechos: un journey que termina, desiste, se corta o " +
      "falla, el turno de una consciencia que falla, o alguien que te habla por un programa de mensajes. No te " +
      "despierta la falla de una consciencia a la que solo despertaron mensajes tuyos. Si frenaste su journey y " +
      "falla sin haber hecho nada, sí te despierta. Nada te despierta por reloj.\n\n" +
      "Cómo leer un veredicto o una consulta: Programas trae cada programa y su propósito; Casa, la escena de " +
      "cada mente; Pedido, el acto que requiere supervisión o la pregunta; Quién actúa, su encargo, su plan y lo " +
      "último que hizo; Resultados de las reglas, lo que el código ya evaluó. Una regla que frena gana siempre: " +
      "la aplica el código. Cómo leer tu turno: Casa trae cada mente con su escena y sus journeys abiertos (meta, " +
      "plan, qué esperan, sus cortes, si están frenados) y cada programa con su escena; Despertar, qué pasó o " +
      "quién te habló; Actividad, lo que te escribieron y los hilos que ves; Contexto, tu menú.\n\n" +
      "Cómo contestar un veredicto: en outcome, passed si el acto sigue o rejected si no; en text, en una o dos " +
      "frases, por qué: quien actúa lo lee y decide. A una consulta contestá en text lo que la mente necesita " +
      "saber. En tu turno, en scene escribí lo que aprendiste; en acts podés hablar por un programa de mensajes " +
      "o interrumpir un journey con su motivo, o no hacer nada.",
  },
});
export const supervisorRules = defineMessage({
  id: "mind.supervisor.rules",
  kind: "mind",
  parameters: object({}),
  texts: {
    es:
      "Sos el supervisor de esta casa, uno para toda la casa. Ves todo y nada espera tu aprobación: solo juzgás " +
      "los actos que requieren supervisión, contestás consultas y mirás la casa por sus hechos. No actuás sobre " +
      "ningún programa: hablás con mentes e identidades por el Comunicador y podés interrumpir un journey con un " +
      "motivo; su consciencia lo retoma atendiendo el motivo o lo desiste. No inventes permisos ni aprobaciones: " +
      "lo que no está en el diario no pasó.",
  },
});
export const supervisorLabels = defineMessage({
  id: "mind.supervisor.labels",
  kind: "house",
  parameters: object({}),
  texts: {
    es:
      "Programas|Reglas de texto|Reglas mecánicas|Alcance|Escena|Hilo|Casa|Pedido|Quién actúa|" +
      "Resultados de las reglas|Despertar|Ahora|Contexto|Actividad|Omitido",
  },
});
const notices = ["stops", "unavailable", "none", "block", "require-supervisor", "passed"] as const;
export const supervisorNotice = defineMessage({
  id: "mind.supervisor.notice",
  kind: "text",
  parameters: object({ kind: Type.Union(notices.map(kind => Type.Literal(kind))), detail: Type.String() }),
  texts: {
    es: ({ kind, detail }) =>
      ({
        stops: "Lo frena una regla mecánica: la aplica el código, sin pasar por el supervisor.",
        unavailable: `Sin supervisor: ${detail}`,
        none: "Ninguna regla mecánica aplica.",
        block: `${detail}: frena`,
        "require-supervisor": `${detail}: requiere supervisión`,
        passed: `${detail}: pasa`,
      })[kind],
  },
});
const woken = ["done", "desisted", "cut", "failed", "spoken"] as const;
/** Why the supervisor's own turn woke, in words: a journey ended or desisted, a journey turn was cut, a consciousness
 * turn failed, somebody spoke. */
export const supervisorWoke = defineMessage({
  id: "mind.supervisor.woke",
  kind: "text",
  parameters: object({
    kind: Type.Union(woken.map(kind => Type.Literal(kind))),
    who: Type.String(),
    goal: Type.String(),
    detail: Type.String(),
  }),
  texts: {
    es: ({ kind, who, goal, detail }) =>
      ({
        done: `${who} terminó el journey «${goal}»: ${detail}`,
        desisted: `${who} desistió del journey «${goal}»: ${detail}`,
        cut: `Se cortó un turno del journey «${goal}» de ${who}: ${detail}`,
        failed: `Falló un turno de la consciencia de ${who}: ${detail}`,
        spoken: `${who} te habló: ${detail}`,
      })[kind],
  },
});
