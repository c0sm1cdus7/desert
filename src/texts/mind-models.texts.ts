// Explica a las personas la asignación de cartas y los límites de gasto.
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const mindModelAdmin = defineMessage({
  id: "mind.model.admin",
  kind: "text",
  parameters: object({}),
  texts: { es: "Solo quien administra puede asignar la carta" },
});
export const mindModelCard = defineMessage({
  id: "mind.model.card",
  kind: "text",
  parameters: object({}),
  texts: { es: "La carta no está aprobada para esta mente" },
});
export const mindModelTarget = defineMessage({
  id: "mind.model.target",
  kind: "text",
  parameters: object({}),
  texts: { es: "No hay un asistente habilitado en este destino" },
});
export const mindModelAssigned = defineMessage({
  id: "mind.model.assigned",
  kind: "text",
  parameters: object({}),
  texts: { es: "Carta asignada" },
});
export const mindModelCap = defineMessage({
  id: "mind.model.cap",
  kind: "text",
  parameters: object({}),
  texts: { es: "No alcanza el tope de gasto configurado" },
});
export const mindModelKey = defineMessage({
  id: "mind.model.key",
  kind: "text",
  parameters: object({}),
  texts: { es: "Falta la llave del proveedor" },
});
export const mindModelNoCard = defineMessage({
  id: "mind.model.no-card",
  kind: "text",
  parameters: object({}),
  texts: { es: "Falta una carta aprobada para esta mente" },
});
export const mindModelPrice = defineMessage({
  id: "mind.model.price",
  kind: "text",
  parameters: object({}),
  texts: { es: "No se puede calcular el precio de la llamada" },
});
export const mindModelUncertain = defineMessage({
  id: "mind.model.uncertain",
  kind: "text",
  parameters: object({}),
  texts: { es: "No se conoce el resultado de la llamada" },
});
