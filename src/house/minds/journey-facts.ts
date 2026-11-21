// Declares the opening, plan, steps, wait, resumption and closing of a mind's processes.
import { selectionKitSchema } from "../kit-selection.ts";
import { Type } from "@sinclair/typebox";
import { wholeNumber } from "../../fields/json-values.ts";
import { object, visibleText } from "../../fields/visible-text.ts";
import { delegatedKit, mindName } from "../assistants/assistant-facts.ts";
export const mindText = Type.String({ minLength: 1, maxLength: 4000, pattern: visibleText });
export const journeyFacts = {
  "journey-opened": Type.Union([
    object({ goal: mindText, kit: delegatedKit }),
    object({ version: Type.Literal(2), goal: mindText, kit: selectionKitSchema }),
  ]),
  "journey-plan-written": object({ steps: Type.Array(object({ id: mindName, text: mindText }), { minItems: 1 }) }),
  "journey-step-done": object({ step: mindName, note: mindText }),
  "journey-waiting": object({ what: mindText, until: wholeNumber }),
  /** The consciousness goes back to one of its open journeys, with what that journey should attend to. */
  "journey-resumed": object({ note: mindText }),
  "journey-closed": object({
    outcome: Type.Union([Type.Literal("done"), Type.Literal("desisted")]),
    summary: mindText,
    references: Type.Array(mindName, { uniqueItems: true }),
  }),
};
