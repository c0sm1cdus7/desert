// Collection: the records of a resolved collection node as grouped rows, or its media grid or collection grid.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionContract } from "./collection.contract.ts";

export const Collection = defineComposition({
  id: "collection",
  purpose: { key: "collection.purpose" },
  messages: ["collection.purpose", "collection.metadata"],
  owner: { entry: "Collection.svelte" },
  uses: ["collection-state", "list", "media-collection-grid", "media-grid", "row"], renders: ["collection"], approval: "none", contract: CollectionContract,
} as const);
