// ObjectStateRow: one labelled state selector of an object, a fact row whose value is a contextual menu; picking an
// available option raises its journey.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateRowContract } from "./object-state-row.contract.ts";

export const ObjectStateRow = defineComposition({
  id: "object-state-row",
  purpose: { key: "objectStateRow.purpose" },
  messages: ["objectStateRow.purpose"],
  owner: { entry: "ObjectStateRow.svelte" },
  uses: ["choice", "fact-row"], approval: "none", contract: ObjectStateRowContract,
} as const);
