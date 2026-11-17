// Explica los rechazos de contratos, autoridad y transiciones de las mentes.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const mindContractProblem = defineMessage({
  id: "mind.contract.problem",
  kind: "text",
  parameters: object({ field: Type.String() }),
  texts: { es: ({ field }) => `Contrato de mente inválido · ${field}` },
});
