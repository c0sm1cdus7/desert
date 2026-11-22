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
        wait: "Poner el journey en espera hasta until, o con on: notice hasta el aviso de su trabajo anunciante.",
        resume: "Retomar ahora uno de tus journeys abiertos, con una nota de qué tiene que atender.",
        end: "Terminar el journey y devolver su resumen y referencias.",
        desist: "Desistir del journey y devolver el motivo y las referencias.",
        interrupt: "Frenar un journey abierto de cualquier mente, con el motivo que va a leer su consciencia.",
      })[control],
  },
});
const planProblems = ["planned", "repeated", "missing", "done"] as const;
/** What a journey hears when it gets its own plan wrong: which mistake it made and, with a plan, what is pending. */
export const journeyPlanRefusal = defineMessage({
  id: "journey.plan-refusal",
  kind: "text",
  parameters: object({
    problem: Type.Union(planProblems.map(each => Type.Literal(each))),
    step: Type.String(),
    pending: Type.String(),
  }),
  texts: {
    es: ({ problem, step, pending }) => {
      if (problem === "repeated") return `El plan repite el identificador «${step}»: cada paso lleva uno distinto.`;
      const said = {
        planned: "Este journey ya tiene su plan escrito: el plan se anota una sola vez.",
        missing: `El paso «${step}» no existe en el plan de este journey.`,
        done: `El paso «${step}» ya estaba hecho: un paso se marca una sola vez.`,
      }[problem];
      return `${said} Pasos pendientes: ${pending || "ninguno"}.`;
    },
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
/** The cut journeys whose lines do not fit next to the mind's own scene, counted in one line of their own. */
export const journeyCutsMore = defineMessage({
  id: "journey.cuts-more",
  kind: "text",
  parameters: object({ cuts: Type.Integer({ minimum: 1 }) }),
  texts: {
    es: ({ cuts }) => `Journeys cortados que no entran en esta escena: ${cuts}.`,
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
      `El supervisor frenó tu journey «${goal}». Motivo: ${reason}\nQuedó pendiente: ${pending || "nada"}.\nNo ` +
      "corre ni despierta hasta que decidas: retomalo con resume atendiendo el motivo, o desistí con desist.",
  },
});
const ended = { finished: "terminó", failed: "falló", cancelled: "se canceló", lost: "se perdió" } as const;
const statuses = ["finished", "failed", "cancelled", "lost", "retired"] as const;
/** Why a journey woke for its device work: how it ended, or that its device was retired and will not say (21/11). */
export const journeyNotice = defineMessage({
  id: "journey.notice",
  kind: "text",
  parameters: object({
    ...{ act: Type.String(), target: Type.String(), device: Type.String(), started: Type.String() },
    ...{ status: Type.Union(statuses.map(each => Type.Literal(each))), reference: Type.String() },
  }),
  texts: {
    es: ({ act, target, device, started, status, reference }) => {
      const work = `trabajo ${act} → ${target} que arrancó este journey (arranque: ${started || "sin resultado"})`;
      if (status === "retired") return `Retiraron el dispositivo ${device}: el aviso del ${work} no va a llegar.`;
      return `Avisó el dispositivo ${device}: el ${work} ${ended[status]}. Referencia del aviso: ${reference}.`;
    },
  },
});
/** A waking fact said as itself, when no other line says it (22/11, UNSIGNED). */
export const wakeFact = defineMessage({
  id: "journey.wake.fact",
  kind: "text",
  parameters: object({
    kind: Type.Union(["opened", "due", "act", "other"].map(kind => Type.Literal(kind))),
    who: Type.String(),
    what: Type.String(),
    where: Type.String(),
    detail: Type.String(),
  }),
  texts: {
    es: ({ kind, who, what, where, detail }) =>
      ({
        opened: "Tu consciencia abrió este journey; su objetivo está en Contexto.",
        due: `Llegó la hora que elegiste al esperar: ${detail}`,
        act: `${who} hizo ${what} en ${where}${detail ? `: ${detail}` : ""}`,
        other: `${who}: ${what}${where ? ` en ${where}` : ""}${detail ? ` · ${detail}` : ""}`,
      })[kind] ?? what,
  },
});
