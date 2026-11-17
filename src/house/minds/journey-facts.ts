// Declara apertura, plan, pasos, espera y cierre de procesos de una mente.
import { Type } from "@sinclair/typebox";
import { wholeNumber } from "../../fields/json-values.ts";
import { object, visibleText } from "../../fields/visible-text.ts";
import { delegatedKit, mindName } from "../assistants/assistant-facts.ts";
export const mindText = Type.String({ minLength: 1, maxLength: 4000, pattern: visibleText });
export const journeyFacts = {
  "journey-opened": object({ goal: mindText, kit: delegatedKit }),
  "journey-plan-written": object({ steps: Type.Array(object({ id: mindName, text: mindText }), { minItems: 1 }) }),
  "journey-step-done": object({ step: mindName, note: mindText }),
  "journey-waiting": object({ what: mindText, until: wholeNumber }),
  "journey-closed": object({
    outcome: Type.Union([Type.Literal("done"), Type.Literal("desisted")]),
    summary: mindText,
    references: Type.Array(mindName, { uniqueItems: true }),
  }),
};
