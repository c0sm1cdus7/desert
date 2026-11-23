// Explains the rejections of minds' contracts, authority and transitions.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const mindContractProblem = defineMessage({
  id: "mind.contract.problem",
  kind: "text",
  parameters: object({ field: Type.String() }),
  texts: {
    en: ({ field }) => `Invalid mind contract · ${field}`,
    es: ({ field }) => `Contrato de mente inválido · ${field}`,
  },
});
