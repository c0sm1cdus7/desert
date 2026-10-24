// CollectionState: what an empty collection shows while it loads, once it is empty, or while the controller is offline.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionStateContract } from "./collection-state.contract.ts";

export const CollectionState = defineComposition({
  id: "collection-state",
  purpose: { key: "collectionState.purpose" },
  messages: ["collectionState.purpose", "collectionState.label", "collectionState.loading", "collectionState.emptyTitle", "collectionState.emptyDescription", "collectionState.offlineTitle", "collectionState.offlineDescription"],
  owner: { entry: "CollectionState.svelte" },
  uses: ["list", "loading", "status"], approval: "none", contract: CollectionStateContract,
} as const);
