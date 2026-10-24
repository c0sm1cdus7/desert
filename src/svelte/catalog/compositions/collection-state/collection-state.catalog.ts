// CollectionState: what an empty collection shows while it loads, once it is empty, or while the controller is offline.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionStateContract } from "./collection-state.contract.ts";

export const CollectionState = defineComposition({
  id: "collection-state",
  purpose: "Show a collection's loading, empty or offline state inside a grouped panel.",
  owner: { entry: "CollectionState.svelte" },
  uses: ["grouped-panel"], approval: "none", contract: CollectionStateContract,
} as const);
