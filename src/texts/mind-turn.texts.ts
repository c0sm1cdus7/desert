// Explains a turn's closings, corrections, reviews and results in the house's language.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
const reasons = {
  "call-limit": {
    en: "The turn reached the limit of twelve calls without saying how it goes on.",
    es: "El turno llegó al límite de doce llamadas sin decir cómo sigue.",
  },
  "frame-too-large": {
    en: "The frame it needs does not fit in the request.",
    es: "El marco necesario no entra en el pedido.",
  },
  "conversation-too-large": {
    en: "This turn's conversation no longer fits in the request.",
    es: "La conversación de este turno ya no entra en el pedido.",
  },
  "no-key": {
    en: "The provider's key is missing.",
    es: "Falta la llave del proveedor.",
  },
  "no-card": {
    en: "No card is enabled for this mind.",
    es: "Falta una carta habilitada para esta mente.",
  },
  cap: {
    en: "The available balance is not enough for another call.",
    es: "El saldo disponible no alcanza para otra llamada.",
  },
  http: {
    en: "The provider rejected the request. The turn stopped.",
    es: "El proveedor rechazó el pedido. El turno se detuvo.",
  },
  transport: {
    en: "Sending to the provider failed. The turn stopped.",
    es: "Falló el envío al proveedor. El turno se detuvo.",
  },
  uncertain: {
    en: "The call was left uncertain. The turn stopped without repeating it.",
    es: "La llamada quedó incierta. El turno se detuvo sin repetirla.",
  },
  invalid: {
    en: "The answer was still invalid after the one correction.",
    es: "La respuesta siguió siendo inválida después de la única corrección.",
  },
  rejected: {
    en: "The proposal did not pass the review after the one correction.",
    es: "La propuesta no pasó la revisión después de la única corrección.",
  },
  "review-failed": {
    en: "The review of the proposal could not be completed.",
    es: "No se pudo completar la revisión de la propuesta.",
  },
  "review-stale": {
    en: "The approval no longer matches the rules in force.",
    es: "La aprobación ya no corresponde a las reglas vigentes.",
  },
  "act-uncertain": {
    en: "The act's result is unknown. The turn stopped without repeating it or changing device.",
    es: "El resultado del acto no se conoce. El turno se detuvo sin repetirlo ni cambiar de dispositivo.",
  },
  "act-failed": {
    en: "An act did not finish; the following acts were not run.",
    es: "Un acto no terminó; los actos siguientes quedaron sin ejecutar.",
  },
  inactive: {
    en: "The turn was interrupted because its scope stopped being active.",
    es: "El turno se interrumpió porque su alcance dejó de estar activo.",
  },
  permission: {
    en: "The permission changed before the proposal was applied.",
    es: "El permiso cambió antes de aplicar la propuesta.",
  },
  interrupted: {
    en: "The turn was interrupted when the house closed. The work was not repeated.",
    es: "El turno se interrumpió al cerrar la casa. No se repitió el trabajo.",
  },
  internal: {
    en: "The turn could not be completed because of an internal failure.",
    es: "No se pudo completar el turno por una falla interna.",
  },
};
export type TurnStop = keyof typeof reasons;
/** Every reason a turn can stop for, read from the words that explain them, for the fact that closes a turn. */
export const turnStops = Object.keys(reasons).filter((key): key is TurnStop => Object.hasOwn(reasons, key));
export const turnNotice = defineMessage({
  id: "mind.turn.notice",
  kind: "text",
  parameters: object({
    reason: Type.Union(turnStops.map(stop => Type.Literal(stop))),
    rejection: Type.Optional(object({ status: Type.Integer(), type: Type.String(), message: Type.String() })),
  }),
  texts: {
    en: ({ reason, rejection }) => {
      if (reason === "http" && rejection)
        return (
          `The provider rejected the request (${rejection.status} ${rejection.type}: ${rejection.message}). ` +
          "The turn stopped."
        );
      const entry = Object.entries(reasons).find(([key]) => key === reason);
      if (!entry) throw new Error("Unknown closing reason");
      return entry[1].en;
    },
    es: ({ reason, rejection }) => {
      if (reason === "http" && rejection)
        return (
          `El proveedor rechazó el pedido (${rejection.status} ${rejection.type}: ${rejection.message}). ` +
          "El turno se detuvo."
        );
      const entry = Object.entries(reasons).find(([key]) => key === reason);
      if (!entry) throw new Error("Unknown closing reason");
      return entry[1].es;
    },
  },
});
export const modelFailureLog = defineMessage({
  id: "mind.turn.provider-log",
  kind: "text",
  parameters: object({ mind: Type.String(), turn: Type.String(), number: Type.Integer(), cause: Type.String() }),
  texts: {
    en: ({ mind, turn, number, cause }) => `${mind} · ${turn} · ${number} · ${cause}`,
    es: ({ mind, turn, number, cause }) => `${mind} · ${turn} · ${number} · ${cause}`,
  },
});
export const correctionNotice = defineMessage({
  id: "mind.turn.correction",
  kind: "text",
  parameters: object({ reason: Type.String() }),
  texts: {
    en: ({ reason }) => `The proposal needs a correction · ${reason}`,
    es: ({ reason }) => `La propuesta necesita una corrección · ${reason}`,
  },
});
export const noSupervisor = defineMessage({
  id: "mind.turn.no-supervisor",
  kind: "text",
  parameters: object({}),
  texts: { en: "No supervisor", es: "Sin supervisor" },
});
export const reviewNotice = defineMessage({
  id: "mind.turn.review",
  kind: "text",
  parameters: object({ passed: Type.Boolean() }),
  texts: {
    en: ({ passed }) => (passed ? "The proposal passed the review." : "The proposal could not be reviewed."),
    es: ({ passed }) => (passed ? "La propuesta pasó la revisión." : "No se pudo revisar la propuesta."),
  },
});
const invalidReasons = [
  ...["json", "schema", "max_tokens", "refusal", "kit", "wait", "notice", "retired", "continuation", "stopped"],
] as const;
export const invalidNotice = defineMessage({
  id: "mind.turn.invalid",
  kind: "text",
  parameters: object({ reason: Type.Union(invalidReasons.map(reason => Type.Literal(reason))) }),
  texts: {
    en: ({ reason }) =>
      ({
        json: "The answer has no valid JSON.",
        schema: "The answer does not meet the contract or the permissions in force.",
        max_tokens: "The provider cut the answer at its output limit.",
        refusal: "The provider refused to answer.",
        kit: "The journey's kit comes out of your kit, with its exact names; if it is empty, ask the admin. Your kit:",
        wait: "The wait ends after Now: until in milliseconds, greater than",
        notice:
          "This journey has no announcing job with a notice to read: nothing will give notice. Wait with until or " +
          "go on.",
        retired: "This journey's announcing job runs on a retired device: that notice will not come.",
        continuation: "A journey goes on until it says how: close with wait, end or desist, only as the last act.",
        stopped: "That journey is already stopped and its consciousness has not resumed it yet:",
      })[reason],
    es: ({ reason }) =>
      ({
        json: "La respuesta no tiene un JSON válido.",
        schema: "La respuesta no cumple el contrato o los permisos vigentes.",
        max_tokens: "El proveedor cortó la respuesta por su límite de salida.",
        refusal: "El proveedor rechazó responder.",
        kit: "El kit del journey sale de tu kit, con sus nombres exactos; si está vacío, pedíselo al admin. Tu kit:",
        wait: "La espera termina después de Ahora: until en milisegundos, mayor que",
        notice:
          "Este journey no tiene trabajo anunciante con un aviso por leer: nada va a avisar. Esperá con until o seguí.",
        retired: "El trabajo anunciante de este journey corre en un dispositivo retirado: ese aviso no va a llegar.",
        continuation: "Un journey sigue hasta decir cómo sigue: cerrá con wait, end o desist, solo como último acto.",
        stopped: "Ese journey ya está frenado y su consciencia todavía no lo retomó:",
      })[reason],
  },
});
const resultParts = {
  heading: {
    en: "Results of the acts of your previous answer:",
    es: "Resultados de los actos de tu respuesta anterior:",
  },
  accepted: { en: "accepted.", es: "aceptado." },
  rejected: { en: "rejected:", es: "rechazado:" },
  skipped: {
    en: "not applied, because an earlier act was rejected.",
    es: "no se aplicó, porque un acto anterior fue rechazado.",
  },
  returned: { en: "Returned:", es: "Devolvió:" },
  cut: { en: "Cut; characters missing:", es: "Recortado; caracteres que faltan:" },
  now: { en: "Now:", es: "Ahora:" },
  added: { en: "Appeared on the menu:", es: "Apareció en el menú:" },
  removed: { en: "Left the menu:", es: "Salió del menú:" },
  answer: { en: "Answer to your consultation:", es: "Respuesta a tu consulta:" },
  goOn: {
    en: "The turn goes on: answer with your next acts and close with wait, end or desist when you know how it goes on.",
    es: "El turno sigue: respondé con tus próximos actos y cerrá con wait, end o desist cuando sepas cómo sigue.",
  },
};
const resultPart = (part: string | number) => {
  const entry = Object.entries(resultParts).find(([key]) => key === String(part));
  if (!entry) throw new Error("Unknown results part");
  return entry[1];
};
/** The words of what a journey turn tells the mind between its calls: each act's result, the clock and the menu. */
export const turnResults = defineMessage({
  id: "mind.turn.results",
  kind: "text",
  parameters: object({
    part: Type.KeyOf(Type.Object(Object.fromEntries(Object.keys(resultParts).map(k => [k, Type.String()])))),
  }),
  texts: {
    en: ({ part }) => resultPart(part).en,
    es: ({ part }) => resultPart(part).es,
  },
});
