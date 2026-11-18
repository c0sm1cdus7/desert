// Explain model assignment and spending limits with the shared parameterless text declaration.
import { defineMessage as message } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
const plain = { kind: "text", parameters: object({}) } as const;
export const mindModelAdmin = message({
  id: "mind.model.admin",
  ...plain,
  texts: { es: "Solo quien administra puede asignar la carta" },
});
export const mindModelCard = message({
  id: "mind.model.card",
  ...plain,
  texts: { es: "La carta no está aprobada para esta mente" },
});
export const mindModelTarget = message({
  id: "mind.model.target",
  ...plain,
  texts: { es: "No hay un asistente habilitado en este destino" },
});
export const mindModelAssigned = message({ id: "mind.model.assigned", ...plain, texts: { es: "Carta asignada" } });
export const mindModelCap = message({
  id: "mind.model.cap",
  ...plain,
  texts: { es: "No alcanza el tope de gasto configurado" },
});
export const mindModelKey = message({ id: "mind.model.key", ...plain, texts: { es: "Falta la llave del proveedor" } });
export const mindModelNoCard = message({
  id: "mind.model.no-card",
  ...plain,
  texts: { es: "Falta una carta aprobada para esta mente" },
});
export const mindModelPrice = message({
  id: "mind.model.price",
  ...plain,
  texts: { es: "No se puede calcular el precio de la llamada" },
});
export const mindModelUncertain = message({
  id: "mind.model.uncertain",
  ...plain,
  texts: { es: "No se conoce el resultado de la llamada" },
});
