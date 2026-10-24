// ObjectStateControl: the state selectors of an object, one row per selector, each choosing a journey.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateControlContract } from "./object-state-control.contract.ts";

export const ObjectStateControl = defineComposition({
  id: "object-state-control",
  purpose: "Choose an object state through a contextual command; a retained selection is not a required form input.",
  owner: { entry: "ObjectStateControl.svelte" },
  uses: ["object-state-row"], approval: "none", contract: ObjectStateControlContract,
} as const);
