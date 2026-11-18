// Explica cierres, correcciones y revisiones del turno en el idioma de la casa.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
const reasons = {
  "call-limit": "El turno llegó al límite de doce intentos.",
  "frame-too-large": "El marco necesario no entra en el pedido.",
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
export const turnNotice = defineMessage({
  id: "mind.turn.notice",
  kind: "text",
  parameters: object({
    reason: Type.KeyOf(Type.Object(Object.fromEntries(Object.keys(reasons).map(k => [k, Type.String()])))),
  }),
  texts: {
    es: ({ reason }) => {
      const entry = Object.entries(reasons).find(([key]) => key === reason);
      if (!entry) throw new Error("Motivo de cierre desconocido");
      return entry[1];
    },
  },
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

export const invalidNotice = defineMessage({
  id: "mind.turn.invalid",
  kind: "text",
  parameters: object({
    reason: Type.Union([
      Type.Literal("json"),
      Type.Literal("schema"),
      Type.Literal("max_tokens"),
      Type.Literal("refusal"),
    ]),
  }),
  texts: {
    es: ({ reason }) =>
      ({
        json: "La respuesta no tiene un JSON válido.",
        schema: "La respuesta no cumple el contrato o los permisos vigentes.",
        max_tokens: "El proveedor cortó la respuesta por su límite de salida.",
        refusal: "El proveedor rechazó responder.",
      })[reason],
  },
});
