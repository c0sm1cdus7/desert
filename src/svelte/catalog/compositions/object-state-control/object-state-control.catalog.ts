// ObjectStateControl: the state selectors of an object as one list of facts, one row per selector, each choosing a journey.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateControlContract } from "./object-state-control.contract.ts";

export const ObjectStateControl = defineComposition({
  id: "object-state-control",
  purpose: { key: "objectStateControl.purpose" },
  messages: ["objectStateControl.purpose"],
  owner: { entry: "ObjectStateControl.svelte" },
  uses: ["list", "object-state-row"], approval: "none", contract: ObjectStateControlContract,
} as const);
