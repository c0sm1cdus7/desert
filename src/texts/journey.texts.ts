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
    en: ({ control }) =>
      ({
        open: "Open a journey with a goal and the actions it needs.",
        plan: "Write down the journey's first plan, with an identifier for each step.",
        done: "Mark a pending step as done and write down what got done.",
        wait: "Put the journey on hold until until, or with on: notice until the notice of its announcing job.",
        resume: "Resume one of your open journeys now, with a note of what it has to attend to.",
        end: "End the journey and give back its summary and references.",
        desist: "Desist from the journey and give back the reason and the references.",
        interrupt: "Stop an open journey of any mind, with the reason its consciousness will read.",
      })[control],
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
    en: ({ problem, step, pending }) => {
      if (problem === "repeated") return `The plan repeats the identifier «${step}»: each step takes a different one.`;
      const said = {
        planned: "This journey already has its plan written: the plan is written only once.",
        missing: `The step «${step}» is not in this journey's plan.`,
        done: `The step «${step}» was already done: a step is marked only once.`,
      }[problem];
      return `${said} Pending steps: ${pending || "none"}.`;
    },
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
    en: ({ goal, reason, cuts }) =>
      `A turn of the journey «${goal}» was cut: ${reason} Nothing was retried.` +
      (cuts === undefined ? "" : ` Cut turns of this journey so far, counting this one: ${cuts}.`),
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
    en: ({ cuts }) => `Cut journeys left out of this scene for lack of room: ${cuts}.`,
    es: ({ cuts }) => `Journeys cortados que no entran en esta escena: ${cuts}.`,
  },
});
/** Why a journey woke, in words: the house restarted during its turn, or its consciousness went back to it. */
export const journeyWoke = defineMessage({
  id: "journey.woke",
  kind: "text",
  parameters: object({ cause: Type.Union([Type.Literal("restart"), Type.Literal("resume")]), note: Type.String() }),
  texts: {
    en: ({ cause, note }) =>
      cause === "restart"
        ? "The house restarted during this journey's previous turn and nothing was repeated: look at how it was left."
        : `Your consciousness resumed this journey: ${note}`,
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
    en: ({ goal, reason, pending }) =>
      `The supervisor stopped your journey «${goal}». Reason: ${reason}\nLeft pending: ${pending || "nothing"}.\n` +
      "It neither runs nor wakes until you decide: resume it with resume attending to the reason, or desist with " +
      "desist.",
    es: ({ goal, reason, pending }) =>
      `El supervisor frenó tu journey «${goal}». Motivo: ${reason}\nQuedó pendiente: ${pending || "nada"}.\nNo ` +
      "corre ni despierta hasta que decidas: retomalo con resume atendiendo el motivo, o desistí con desist.",
  },
});
const ended = {
  en: { finished: "finished", failed: "failed", cancelled: "was cancelled", lost: "was lost" },
  es: { finished: "terminó", failed: "falló", cancelled: "se canceló", lost: "se perdió" },
} as const;
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
    en: ({ act, target, device, started, status, reference }) => {
      const work = `job ${act} → ${target} that this journey started (start: ${started || "no result"})`;
      if (status === "retired") return `The device ${device} was retired: the notice of the ${work} will not come.`;
      return `The device ${device} gave notice: the ${work} ${ended.en[status]}. Notice reference: ${reference}.`;
    },
    es: ({ act, target, device, started, status, reference }) => {
      const work = `trabajo ${act} → ${target} que arrancó este journey (arranque: ${started || "sin resultado"})`;
      if (status === "retired") return `Retiraron el dispositivo ${device}: el aviso del ${work} no va a llegar.`;
      return `Avisó el dispositivo ${device}: el ${work} ${ended.es[status]}. Referencia del aviso: ${reference}.`;
    },
  },
});
/** A waking fact said as itself, when no other line says it (22/11, UNSIGNED). */
export const wakeFact = defineMessage({
  id: "journey.wake.fact",
  kind: "text",
  parameters: object({
    kind: Type.Union(["opened", "due", "act", "message", "other"].map(kind => Type.Literal(kind))),
    who: Type.String(),
    what: Type.String(),
    where: Type.String(),
    detail: Type.String(),
  }),
  texts: {
    en: ({ kind, who, what, where, detail }) =>
      ({
        opened: "Your consciousness opened this journey; its goal is in Context.",
        due: `The time you chose when waiting has come: ${detail}`,
        act: `${who} did ${what} on ${where}${detail ? `: ${detail}` : ""}`,
        message: `${who} wrote: ${what} (write to ${who} in ${detail})`,
        other: `${who}: ${what}${where ? ` on ${where}` : ""}${detail ? ` · ${detail}` : ""}`,
      })[kind] ?? what,
    es: ({ kind, who, what, where, detail }) =>
      ({
        opened: "Tu consciencia abrió este journey; su objetivo está en Contexto.",
        due: `Llegó la hora que elegiste al esperar: ${detail}`,
        act: `${who} hizo ${what} en ${where}${detail ? `: ${detail}` : ""}`,
        message: `${who} escribió: ${what} (escribile a ${who} en ${detail})`,
        other: `${who}: ${what}${where ? ` en ${where}` : ""}${detail ? ` · ${detail}` : ""}`,
      })[kind] ?? what,
  },
});
