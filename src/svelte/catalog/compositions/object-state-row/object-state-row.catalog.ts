// ObjectStateRow: one labelled state selector of an object; picking an available option raises its journey.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateRowContract } from "./object-state-row.contract.ts";

export const ObjectStateRow = defineComposition({
  id: "object-state-row",
  purpose: "Use a named state selector that dispatches canonical commands without adding toolbar shortcuts.",
  owner: { entry: "ObjectStateRow.svelte" },
  uses: ["selection-field"], approval: "none", contract: ObjectStateRowContract,
} as const);
