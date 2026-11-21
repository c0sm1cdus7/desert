// Explains a turn's closings, corrections, reviews and results in the house's language.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
const reasons = {
  "call-limit": "El turno llegó al límite de doce llamadas sin decir cómo sigue.",
  "frame-too-large": "El marco necesario no entra en el pedido.",
  "conversation-too-large": "La conversación de este turno ya no entra en el pedido.",
  "no-key": "Falta la llave del proveedor.",
  "no-card": "Falta una carta habilitada para esta mente.",
  cap: "El saldo disponible no alcanza para otra llamada.",
  http: "El proveedor rechazó el pedido. El turno se detuvo.",
  transport: "Falló el envío al proveedor. El turno se detuvo.",
  uncertain: "La llamada quedó incierta. El turno se detuvo sin repetirla.",
  invalid: "La respuesta siguió siendo inválida después de la única corrección.",
  rejected: "La propuesta no pasó la revisión después de la única corrección.",
  "review-failed": "No se pudo completar la revisión de la propuesta.",
  "review-stale": "La aprobación ya no corresponde a las reglas vigentes.",
  "act-uncertain": "El resultado del acto no se conoce. El turno se detuvo sin repetirlo ni cambiar de dispositivo.",
  "act-failed": "Un acto no terminó; los actos siguientes quedaron sin ejecutar.",
  inactive: "El turno se interrumpió porque su alcance dejó de estar activo.",
  permission: "El permiso cambió antes de aplicar la propuesta.",
  interrupted: "El turno se interrumpió al cerrar la casa. No se repitió el trabajo.",
  internal: "No se pudo completar el turno por una falla interna.",
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
    es: ({ reason, rejection }) => {
      if (reason === "http" && rejection)
        return (
          `El proveedor rechazó el pedido (${rejection.status} ${rejection.type}: ${rejection.message}). ` +
          "El turno se detuvo."
        );
      const entry = Object.entries(reasons).find(([key]) => key === reason);
      if (!entry) throw new Error("Motivo de cierre desconocido");
      return entry[1];
    },
  },
});
export const modelFailureLog = defineMessage({
  id: "mind.turn.provider-log",
  kind: "text",
  parameters: object({ mind: Type.String(), turn: Type.String(), number: Type.Integer(), cause: Type.String() }),
  texts: { es: ({ mind, turn, number, cause }) => `${mind} · ${turn} · ${number} · ${cause}` },
});
export const correctionNotice = defineMessage({
  id: "mind.turn.correction",
  kind: "text",
  parameters: object({ reason: Type.String() }),
  texts: { es: ({ reason }) => `La propuesta necesita una corrección · ${reason}` },
});
export const noSupervisor = defineMessage({
  id: "mind.turn.no-supervisor",
  kind: "text",
  parameters: object({}),
  texts: { es: "Sin supervisor" },
});
export const reviewNotice = defineMessage({
  id: "mind.turn.review",
  kind: "text",
  parameters: object({ passed: Type.Boolean() }),
  texts: { es: ({ passed }) => (passed ? "La propuesta pasó la revisión." : "No se pudo revisar la propuesta.") },
});
const invalidReasons = ["json", "schema", "max_tokens", "refusal", "kit", "wait", "continuation"] as const;
export const invalidNotice = defineMessage({
  id: "mind.turn.invalid",
  kind: "text",
  parameters: object({ reason: Type.Union(invalidReasons.map(reason => Type.Literal(reason))) }),
  texts: {
    es: ({ reason }) =>
      ({
        json: "La respuesta no tiene un JSON válido.",
        schema: "La respuesta no cumple el contrato o los permisos vigentes.",
        max_tokens: "El proveedor cortó la respuesta por su límite de salida.",
        refusal: "El proveedor rechazó responder.",
        kit: "El kit del journey sale de tu kit, con sus nombres exactos; si está vacío, pedíselo al admin. Tu kit:",
        wait: "La espera termina después de Ahora: until en milisegundos, mayor que",
        continuation: "Un journey sigue hasta decir cómo sigue: cerrá con wait, end o desist, solo como último acto.",
      })[reason],
  },
});
const resultParts = {
  heading: "Resultados de los actos de tu respuesta anterior:",
  accepted: "aceptado.",
  rejected: "rechazado:",
  skipped: "no se aplicó, porque un acto anterior fue rechazado.",
  returned: "Devolvió:",
  cut: "Recortado; caracteres que faltan:",
  now: "Ahora:",
  added: "Apareció en el menú:",
  removed: "Salió del menú:",
  answer: "Respuesta a tu consulta:",
  goOn: "El turno sigue: respondé con tus próximos actos y cerrá con wait, end o desist cuando sepas cómo sigue.",
};
/** The words of what a journey turn tells the mind between its calls: each act's result, the clock and the menu. */
export const turnResults = defineMessage({
  id: "mind.turn.results",
  kind: "text",
  parameters: object({
    part: Type.KeyOf(Type.Object(Object.fromEntries(Object.keys(resultParts).map(k => [k, Type.String()])))),
  }),
  texts: {
    es: ({ part }) => {
      const entry = Object.entries(resultParts).find(([key]) => key === part);
      if (!entry) throw new Error("Parte de resultados desconocida");
      return entry[1];
    },
  },
});
